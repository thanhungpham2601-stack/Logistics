import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Truck, ArrowRight, Anchor, Search, Loader2, ArrowLeft, Delete } from 'lucide-react';
import { Account, verifyDriverPin } from '../lib/api';
import { stripDiacritics } from '../utils';
import GoogleLoginScreen from './GoogleLoginScreen';

interface LoginScreenProps {
  // 'driver' (mặc định /login): chỉ hiện màn chọn tài xế + PIN - dùng trên iPad dùng chung.
  // 'staff' (/manage/login): chỉ hiện màn đăng nhập Google - dành cho Kế toán/Admin, đặt ở URL
  // riêng để không hiện sẵn trên iPad dùng chung của tài xế.
  mode: 'driver' | 'staff';
  accounts?: Account[];
  onDriverLogin?: (account: Account) => void;
  resolving?: boolean;
  authError?: string | null;
  onBeforeGoogleSignIn?: () => void;
}

const PIN_LENGTH = 4;

const PRIMARY_TINT = 'color-mix(in srgb, var(--theme-primary) 12%, white)';

function DriverPinPad({ driver, onCancel, onSuccess }: { driver: Account; onCancel: () => void; onSuccess: (account: Account) => void }) {
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const submitPin = async (value: string) => {
    setChecking(true);
    setError('');
    try {
      const ok = await verifyDriverPin(driver.id, value);
      if (ok) {
        onSuccess(driver);
      } else {
        setError('Sai mã PIN, thử lại.');
        setPin('');
      }
    } catch (err) {
      setError((err as Error).message ?? 'Không kiểm tra được mã PIN.');
      setPin('');
    } finally {
      setChecking(false);
    }
  };

  const pressDigit = (digit: string) => {
    if (checking || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) submitPin(next);
  };

  const pressBackspace = () => {
    if (checking) return;
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  return (
    <div className="mt-6 space-y-4">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Chọn tài xế khác</span>
      </button>

      <div className="text-center">
        <div
          className="w-12 h-12 mx-auto rounded-full flex items-center justify-center font-black text-lg"
          style={{ backgroundColor: PRIMARY_TINT, color: 'var(--theme-primary)' }}
        >
          {driver.fullName.charAt(0)}
        </div>
        <p className="text-sm font-bold text-slate-900 mt-2">{driver.fullName}</p>
        <p className="text-[11px] text-slate-500 font-mono">@{driver.username}</p>
      </div>

      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${i < pin.length ? '' : 'border-slate-300'}`}
            style={i < pin.length ? { backgroundColor: 'var(--theme-primary)', borderColor: 'var(--theme-primary)' } : undefined}
          />
        ))}
      </div>

      {checking ? (
        <div className="flex justify-center py-1">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--theme-primary)' }} />
        </div>
      ) : (
        <p className="text-center text-[11px] text-red-600 font-semibold h-4">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={checking}
            onClick={() => pressDigit(d)}
            className="aspect-square rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-900 font-bold text-lg cursor-pointer transition-colors"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          disabled={checking}
          onClick={() => pressDigit('0')}
          className="aspect-square rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-900 font-bold text-lg cursor-pointer transition-colors"
        >
          0
        </button>
        <button
          type="button"
          disabled={checking}
          onClick={pressBackspace}
          className="aspect-square rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
        >
          <Delete className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}

export default function LoginScreen({ mode, accounts = [], onDriverLogin, resolving = false, authError = null, onBeforeGoogleSignIn }: LoginScreenProps) {
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Account | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const drivers = useMemo(() => accounts.filter((a) => a.role === 'driver' && a.isActive), [accounts]);

  const filteredDrivers = useMemo(() => {
    const q = stripDiacritics(driverSearch.trim());
    if (!q) return drivers;
    return drivers.filter(
      (d) => stripDiacritics(d.fullName).includes(q) || stripDiacritics(d.username).includes(q)
    );
  }, [drivers, driverSearch]);

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-800 flex flex-col justify-between font-sans">
      <header className="pt-12 px-4 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-md"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          <Anchor className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase" style={{ color: 'var(--theme-primary)' }}>
          Cổng Chấm Công &amp; Quản Lý Ca
        </h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center justify-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>ICD AN GIA</span>
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 max-w-4xl mx-auto w-full">
        <div className={mode === 'driver' ? 'w-full max-w-md mx-auto' : 'w-full max-w-sm mx-auto'}>
          {mode === 'driver' ? (
            /* Driver Portal - chọn tài xế + PIN, dùng cho iPad dùng chung nhiều tài xế */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: PRIMARY_TINT, color: 'var(--theme-primary)' }}
                  >
                    <Truck className="w-6 h-6" />
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-md border border-slate-200">
                    CHUYỂN CA NHANH
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">DÀNH CHO LÁI XE</h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Chọn đúng tên của bạn, nhập mã PIN 4 số để bắt đầu chấm công ca của mình.
                </p>

                {selectedDriver ? (
                  <DriverPinPad
                    driver={selectedDriver}
                    onCancel={() => setSelectedDriver(null)}
                    onSuccess={(account) => onDriverLogin?.(account)}
                  />
                ) : (
                  <>
                    <div className="mt-4 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        placeholder="Tìm tài xế theo tên hoặc tài khoản..."
                        className="w-full bg-white border border-slate-300 focus:border-[var(--theme-primary)] rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {filteredDrivers.length === 0 && (
                        <p className="text-xs text-slate-500 italic text-center py-4">Không tìm thấy tài xế phù hợp.</p>
                      )}
                      {filteredDrivers.map((driver) => (
                        <button
                          key={driver.id}
                          onClick={() => setSelectedDriver(driver)}
                          className="w-full text-left bg-slate-50 hover:bg-[color-mix(in_srgb,var(--theme-primary)_8%,white)] border border-slate-200 hover:border-[var(--theme-primary)] rounded-xl p-3 flex items-center justify-between group/btn transition-all cursor-pointer duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 group-hover/btn:bg-[color-mix(in_srgb,var(--theme-primary)_15%,white)] text-slate-600 group-hover/btn:text-[var(--theme-primary)] flex items-center justify-center font-bold text-sm transition-colors">
                              {driver.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-800 block">
                                {driver.fullName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">@{driver.username}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover/btn:text-[var(--theme-primary)] group-hover/btn:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-500">
                * Đăng xuất sẽ xoá sạch phiên làm việc trên thiết bị - tài xế tiếp theo phải chọn tên và nhập PIN lại.
              </div>
            </motion.div>
          ) : (
            /* Staff Portal - đăng nhập Google, chỉ ở /manage/login (không hiện trên màn mặc định
               của iPad dùng chung để tránh tài xế bấm nhầm) */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GoogleLoginScreen resolving={resolving} authError={authError} onBeforeSignIn={onBeforeGoogleSignIn} />
            </motion.div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500 text-[10px]">
        <p className="flex items-center justify-center space-x-1 font-medium">
          <span>Phát triển cho ICD AN GIA</span>
        </p>
        <p className="text-slate-400 mt-1">Dữ liệu được lưu trữ trên Supabase</p>
      </footer>
    </div>
  );
}
