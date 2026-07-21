import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Driver, JobEntry, UserRole } from './types';
import LoginScreen from './components/LoginScreen';
import DriverView from './components/DriverView';
import AccountantView from './components/AccountantView';
import { Loader2 } from 'lucide-react';
import {
  Account,
  ConfigLists,
  createAccount,
  createJob,
  deleteAccount,
  deleteJob,
  fetchAccounts,
  fetchConfigLists,
  fetchJobs,
  fetchOperationRates,
  setContainerSizeActive,
  setOperationTypeActive,
  setShippingLineActive,
  updateAccount,
  updateJob,
  upsertContainerSize,
  upsertShippingLine,
} from './lib/api';
import { OperationRateRow } from './lib/supabaseTypes';

const CURRENT_ACCOUNT_KEY = 'icd_current_account_id';

function homePathFor(account: Account): string {
  return account.role === 'driver' ? '/driver' : '/accountant';
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [configLists, setConfigLists] = useState<ConfigLists>({ sizes: [], operations: [], lines: [] });
  const [rates, setRates] = useState<OperationRateRow[]>([]);

  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
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

    // Restore session (nếu có) trước khi màn hình đầu tiên render, tránh nháy về trang login
    const savedId = localStorage.getItem(CURRENT_ACCOUNT_KEY);
    if (savedId) {
      const restored = accountsData.find((a) => a.id === savedId && a.isActive);
      if (restored) setCurrentAccount(restored);
    }
  };

  useEffect(() => {
    loadAll()
      .catch((err) => setLoadError(err.message ?? String(err)))
      .finally(() => setLoading(false));
  }, []);

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

  const handleLogout = () => {
    setCurrentAccount(null);
    localStorage.removeItem(CURRENT_ACCOUNT_KEY);
    navigate('/login', { replace: true });
  };

  // ===================== Driver job entry =====================
  const handleAddJob = async (payload: Omit<JobEntry, 'id' | 'driverId' | 'driverName'>) => {
    if (!currentAccount) return;
    await createJob({
      driverId: currentAccount.id,
      createdBy: currentAccount.id,
      performedAt: payload.timestamp,
      containerNo: payload.containerNo,
      line: payload.line,
      size: payload.size,
      operation: payload.operation,
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
      containerNo: job.containerNo,
      line: job.line,
      size: job.size,
      operation: job.operation,
      notes: job.notes,
    });
    await refreshJobs();
  };

  const handleUpdateJob = async (job: JobEntry) => {
    await updateJob(job.id, {
      driverId: job.driverId,
      performedAt: job.timestamp,
      containerNo: job.containerNo,
      line: job.line,
      size: job.size,
      operation: job.operation,
      notes: job.notes,
    });
    await refreshJobs();
  };

  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId);
    await refreshJobs();
  };

  // ===================== Admin: accounts =====================
  const handleCreateAccount = async (input: { username: string; fullName: string; role: UserRole; phone?: string; licenseNumber?: string }) => {
    await createAccount(input);
    await refreshAccounts();
  };

  const handleToggleAccountActive = async (id: string, isActive: boolean) => {
    await updateAccount(id, { isActive });
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
          ) : (
            <LoginScreen accounts={accounts} loading={false} loadError={loadError} onLogin={handleLogin} />
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
              onAddJob={handleAddJob}
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
              onAddShippingLine={handleAddShippingLine}
              onToggleShippingLine={handleToggleShippingLine}
              onAddContainerSize={handleAddContainerSize}
              onToggleContainerSize={handleToggleContainerSize}
              onToggleOperationType={handleToggleOperationType}
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
