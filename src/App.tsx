import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Driver, JobEntry, UserRole } from './types';
import LoginScreen from './components/LoginScreen';
import GoogleLoginScreen from './components/GoogleLoginScreen';
import AuthModeSelect from './components/AuthModeSelect';
import DriverView from './components/DriverView';
import AccountantView from './components/AccountantView';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  Account,
  ConfigLists,
  createAccount,
  createJob,
  createNotePreset,
  deleteAccount,
  deleteJob,
  deleteNotePreset,
  fetchAccountByAuthUserId,
  fetchAccountByEmail,
  fetchAccounts,
  fetchConfigLists,
  fetchJobs,
  fetchOperationRates,
  linkAuthUserId,
  setContainerSizeActive,
  setDaoChuyenSubtypeActive,
  setNotePresetActive,
  setOperationTypeActive,
  setShippingLineActive,
  updateAccount,
  updateJob,
  upsertContainerSize,
  upsertDaoChuyenSubtype,
  upsertOperationType,
  upsertShippingLine,
} from './lib/api';
import { OperationRateRow } from './lib/supabaseTypes';

const CURRENT_ACCOUNT_KEY = 'icd_current_account_id';

// Chế độ đăng nhập:
//  - 'dev'  (mặc định): hiện màn hình cho CHỌN 1 trong 2 - "Nhà phát triển" (tài khoản mock,
//    không mật khẩu thật) hoặc "Thật" (đăng nhập Google) - dùng trong giai đoạn kiểm thử song song.
//  - 'real': khoá hẳn, bỏ qua màn hình chọn, luôn bắt đăng nhập Google. Đặt VITE_AUTH_MODE=real
//    trên môi trường thật (VD: Vercel) khi đã sẵn sàng bỏ hẳn chế độ dev.
const AUTH_MODE: 'dev' | 'real' = import.meta.env.VITE_AUTH_MODE === 'real' ? 'real' : 'dev';

function homePathFor(account: Account): string {
  return account.role === 'driver' ? '/driver' : '/accountant';
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [configLists, setConfigLists] = useState<ConfigLists>({ sizes: [], operations: [], lines: [], daoChuyenSubtypes: [], notePresets: [] });
  const [rates, setRates] = useState<OperationRateRow[]>([]);

  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resolvingAuth, setResolvingAuth] = useState(false);
  // Supabase có thể bắn lại sự kiện SIGNED_IN (không phải đăng nhập mới) khi tab lấy lại focus
  // hoặc khi tự làm mới token. Cờ này chặn việc tự đăng nhập lại ngay sau khi người dùng chủ
  // động bấm Đăng xuất, tránh vòng lặp "đăng xuất xong lại tự vào lại".
  const isLoggingOutRef = useRef(false);
  // 'select' = màn hình 2 nút chọn chế độ; chỉ dùng khi AUTH_MODE === 'dev'.
  // Khi AUTH_MODE === 'real', khoá cứng về 'real' ngay từ đầu, bỏ qua màn hình chọn.
  const [loginView, setLoginView] = useState<'select' | 'dev' | 'real'>(AUTH_MODE === 'real' ? 'real' : 'select');
  const navigate = useNavigate();

  const loadAll = async () => {
    const [accountsData, jobsData, configData, ratesData] = await Promise.all([
      fetchAccounts(),
      fetchJobs(),
      fetchConfigLists(),
      fetchOperationRates(),
    ]);
    setAccounts(accountsData);
    setDrivers(accountsData.filter((a) => a.role === 'driver' && a.isActive).map((a) => ({ id: a.id, name: a.fullName, phone: a.phone, licenseNumber: a.licenseNumber })));
    setJobs(jobsData);
    setConfigLists(configData);
    setRates(ratesData);

    // Chế độ dev: khôi phục session từ localStorage (chỉ để tiện phát triển, không phải bảo mật
    // thật). Chế độ real: KHÔNG tin localStorage - phiên đăng nhập chỉ hợp lệ khi Supabase Auth
    // xác nhận có session Google thật (xử lý ở effect riêng bên dưới).
    if (AUTH_MODE === 'dev') {
      const savedId = localStorage.getItem(CURRENT_ACCOUNT_KEY);
      if (savedId) {
        const restored = accountsData.find((a) => a.id === savedId && a.isActive);
        if (restored) setCurrentAccount(restored);
      }
    }
  };

  useEffect(() => {
    loadAll()
      .catch((err) => setLoadError(err.message ?? String(err)))
      .finally(() => setLoading(false));
  }, []);

  // ===================== Xác thực qua Google (Supabase Auth) =====================
  // Luôn lắng nghe (không chỉ khi AUTH_MODE === 'real') vì ở chế độ 'dev' người dùng vẫn có thể
  // chọn "Chế Độ Thật" từ màn hình chọn để đăng nhập Google.
  useEffect(() => {
    // getSession() (chạy khi mount) và sự kiện SIGNED_IN của onAuthStateChange thường bắn gần như
    // cùng lúc cho CÙNG 1 session vừa đăng nhập - chặn resolve trùng để tránh lần gọi sau ghi đè
    // mất thông báo lỗi của lần gọi trước.
    let resolvedForUserId: string | null = null;

    const resolveGoogleAccount = async (authUserId: string, email: string | undefined) => {
      if (isLoggingOutRef.current) return; // đang chủ động đăng xuất - không tự đăng nhập lại
      if (resolvedForUserId === authUserId) return;
      resolvedForUserId = authUserId;

      setResolvingAuth(true);
      setAuthError(null);
      try {
        let account = await fetchAccountByAuthUserId(authUserId);
        if (!account && email) {
          account = await fetchAccountByEmail(email);
          if (account) await linkAuthUserId(account.id, authUserId);
        }
        if (!account || !account.isActive) {
          setAuthError('Email này chưa được cấp quyền truy cập hệ thống. Vui lòng liên hệ quản trị viên.');
          await supabase.auth.signOut();
          setCurrentAccount(null);
          localStorage.removeItem(CURRENT_ACCOUNT_KEY);
          return;
        }
        setCurrentAccount(account);
        localStorage.setItem(CURRENT_ACCOUNT_KEY, account.id);
        // Chỉ tự điều hướng khi đang đứng ở trang đăng nhập - tránh việc Supabase bắn lại
        // SIGNED_IN lúc tab lấy focus/refresh token làm bật người dùng ra khỏi trang họ đang xem
        // (VD: đang xem "Báo Cáo Theo Tài Xế" thì bị đá về Danh Sách Sản Lượng).
        if (window.location.pathname === '/login') {
          navigate(homePathFor(account), { replace: true });
        }
      } catch (err) {
        // Không để lỗi (mạng, Supabase...) rơi mất im lặng - phải luôn có thông báo cho người dùng.
        console.error('Lỗi xác thực Google:', err);
        setAuthError('Có lỗi khi xác thực tài khoản, vui lòng thử lại.');
        resolvedForUserId = null; // cho phép thử lại nếu bấm đăng nhập lại
      } finally {
        setResolvingAuth(false);
      }
    };

    // Kiểm tra session đã có sẵn (VD: tải lại trang sau khi đã đăng nhập Google trước đó)
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) resolveGoogleAccount(user.id, user.email);
    });

    // Bắt sự kiện đăng nhập Google vừa hoàn tất (redirect quay lại từ Google) hoặc đăng xuất
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        resolveGoogleAccount(session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        resolvedForUserId = null;
        setCurrentAccount(null);
        localStorage.removeItem(CURRENT_ACCOUNT_KEY);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  const refreshJobs = async () => {
    setJobs(await fetchJobs());
  };

  const refreshAccounts = async () => {
    const accountsData = await fetchAccounts();
    setAccounts(accountsData);
    setDrivers(accountsData.filter((a) => a.role === 'driver' && a.isActive).map((a) => ({ id: a.id, name: a.fullName, phone: a.phone, licenseNumber: a.licenseNumber })));
  };

  const refreshConfig = async () => {
    setConfigLists(await fetchConfigLists());
  };

  const handleLogin = (account: Account) => {
    setCurrentAccount(account);
    localStorage.setItem(CURRENT_ACCOUNT_KEY, account.id);
    navigate(homePathFor(account), { replace: true });
  };

  const handleLogout = async () => {
    isLoggingOutRef.current = true;
    setCurrentAccount(null);
    localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    if (AUTH_MODE === 'real') {
      await supabase.auth.signOut();
    }
    navigate('/login', { replace: true });
  };

  // ===================== Driver job entry =====================
  const handleAddJob = async (payload: Omit<JobEntry, 'id' | 'driverId' | 'driverName'>) => {
    if (!currentAccount) return;
    await createJob({
      driverId: currentAccount.id,
      createdBy: currentAccount.id,
      performedAt: payload.timestamp,
      shift: payload.shift,
      containerNo: payload.containerNo,
      line: payload.line,
      size: payload.size,
      operation: payload.operation,
      cargoStatus: payload.cargoStatus,
      subType: payload.subType,
      notes: payload.notes,
    });
    await refreshJobs();
  };

  // Accountant/Admin adding a job on behalf of any driver
  const handleAddJobAdmin = async (job: JobEntry) => {
    if (!currentAccount) return;
    await createJob({
      driverId: job.driverId,
      createdBy: currentAccount.id,
      performedAt: job.timestamp,
      shift: job.shift,
      containerNo: job.containerNo,
      line: job.line,
      size: job.size,
      operation: job.operation,
      cargoStatus: job.cargoStatus,
      subType: job.subType,
      notes: job.notes,
    });
    await refreshJobs();
  };

  const handleUpdateJob = async (job: JobEntry) => {
    await updateJob(job.id, {
      driverId: job.driverId,
      performedAt: job.timestamp,
      shift: job.shift,
      containerNo: job.containerNo,
      line: job.line,
      size: job.size,
      operation: job.operation,
      cargoStatus: job.cargoStatus,
      subType: job.subType ?? null,
      notes: job.notes,
    });
    await refreshJobs();
  };

  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId);
    await refreshJobs();
  };

  // ===================== Admin: accounts =====================
  const handleCreateAccount = async (input: { username: string; fullName: string; role: UserRole; phone?: string; licenseNumber?: string; email?: string }) => {
    await createAccount(input);
    await refreshAccounts();
  };

  const handleToggleAccountActive = async (id: string, isActive: boolean) => {
    await updateAccount(id, { isActive });
    await refreshAccounts();
  };

  const handleUpdateAccountEmail = async (id: string, email: string) => {
    await updateAccount(id, { email });
    await refreshAccounts();
  };

  const handleDeleteAccount = async (id: string) => {
    await deleteAccount(id);
    await refreshAccounts();
  };

  // ===================== Admin: config lists =====================
  const handleAddShippingLine = async (code: string, name: string) => {
    await upsertShippingLine({ code, name });
    await refreshConfig();
  };

  const handleToggleShippingLine = async (code: string, isActive: boolean) => {
    await setShippingLineActive(code, isActive);
    await refreshConfig();
  };

  const handleAddContainerSize = async (code: string, label: string) => {
    await upsertContainerSize({ code, label });
    await refreshConfig();
  };

  const handleToggleContainerSize = async (code: string, isActive: boolean) => {
    await setContainerSizeActive(code, isActive);
    await refreshConfig();
  };

  const handleToggleOperationType = async (code: string, isActive: boolean) => {
    await setOperationTypeActive(code, isActive);
    await refreshConfig();
  };

  const handleAddOperationType = async (code: string, label: string) => {
    await upsertOperationType({ code, label });
    await refreshConfig();
  };

  const handleAddDaoChuyenSubtype = async (code: string, label: string) => {
    await upsertDaoChuyenSubtype({ code, label });
    await refreshConfig();
  };

  const handleToggleDaoChuyenSubtype = async (code: string, isActive: boolean) => {
    await setDaoChuyenSubtypeActive(code, isActive);
    await refreshConfig();
  };

  const handleAddNotePreset = async (label: string) => {
    await createNotePreset(label);
    await refreshConfig();
  };

  const handleToggleNotePreset = async (id: string, isActive: boolean) => {
    await setNotePresetActive(id, isActive);
    await refreshConfig();
  };

  const handleDeleteNotePreset = async (id: string) => {
    await deleteNotePreset(id);
    await refreshConfig();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-bold">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentAccount ? (
            <Navigate to={homePathFor(currentAccount)} replace />
          ) : loginView === 'select' ? (
            <AuthModeSelect onSelectDev={() => setLoginView('dev')} onSelectReal={() => setLoginView('real')} />
          ) : loginView === 'real' ? (
            <GoogleLoginScreen
              resolving={resolvingAuth}
              authError={authError}
              onBack={AUTH_MODE === 'dev' ? () => setLoginView('select') : undefined}
              onBeforeSignIn={() => { isLoggingOutRef.current = false; }}
            />
          ) : (
            <LoginScreen
              accounts={accounts}
              loading={false}
              loadError={loadError}
              onLogin={handleLogin}
              onBack={() => setLoginView('select')}
            />
          )
        }
      />

      <Route
        path="/driver"
        element={
          currentAccount && currentAccount.role === 'driver' ? (
            <DriverView
              currentDriver={{ id: currentAccount.id, name: currentAccount.fullName, phone: currentAccount.phone, licenseNumber: currentAccount.licenseNumber }}
              onLogout={handleLogout}
              jobs={jobs}
              shippingLines={configLists.lines.filter((l) => l.is_active).map((l) => l.code)}
              sizes={configLists.sizes.filter((s) => s.is_active)}
              operations={configLists.operations.filter((o) => o.is_active)}
              daoChuyenSubtypes={configLists.daoChuyenSubtypes.filter((s) => s.is_active)}
              notePresets={configLists.notePresets.filter((n) => n.is_active)}
              onAddJob={handleAddJob}
              onUpdateJob={handleUpdateJob}
              onDeleteJob={handleDeleteJob}
            />
          ) : (
            <Navigate to={currentAccount ? homePathFor(currentAccount) : '/login'} replace />
          )
        }
      />

      <Route
        path="/accountant/*"
        element={
          currentAccount && currentAccount.role !== 'driver' ? (
            <AccountantView
              jobs={jobs}
              drivers={drivers}
              rates={rates}
              shippingLines={configLists.lines.filter((l) => l.is_active).map((l) => l.code)}
              sizes={configLists.sizes.filter((s) => s.is_active)}
              operations={configLists.operations.filter((o) => o.is_active)}
              isAdmin={currentAccount.role === 'admin'}
              onAddJob={handleAddJobAdmin}
              onUpdateJob={handleUpdateJob}
              onDeleteJob={handleDeleteJob}
              onLogout={handleLogout}
              accounts={accounts}
              configLists={configLists}
              onCreateAccount={handleCreateAccount}
              onToggleAccountActive={handleToggleAccountActive}
              onDeleteAccount={handleDeleteAccount}
              onUpdateAccountEmail={handleUpdateAccountEmail}
              onAddShippingLine={handleAddShippingLine}
              onToggleShippingLine={handleToggleShippingLine}
              onAddContainerSize={handleAddContainerSize}
              onToggleContainerSize={handleToggleContainerSize}
              onToggleOperationType={handleToggleOperationType}
              onAddOperationType={handleAddOperationType}
              onAddDaoChuyenSubtype={handleAddDaoChuyenSubtype}
              onToggleDaoChuyenSubtype={handleToggleDaoChuyenSubtype}
              onAddNotePreset={handleAddNotePreset}
              onToggleNotePreset={handleToggleNotePreset}
              onDeleteNotePreset={handleDeleteNotePreset}
            />
          ) : (
            <Navigate to={currentAccount ? homePathFor(currentAccount) : '/login'} replace />
          )
        }
      />

      <Route path="*" element={<Navigate to={currentAccount ? homePathFor(currentAccount) : '/login'} replace />} />
    </Routes>
  );
}
