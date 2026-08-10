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
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Chọn tài xế khác</span>
      </button>

      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg">
          {driver.fullName.charAt(0)}
        </div>
        <p className="text-sm font-bold text-white mt-2">{driver.fullName}</p>
        <p className="text-[11px] text-slate-500 font-mono">@{driver.username}</p>
      </div>

      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
              i < pin.length ? 'bg-blue-500 border-blue-500' : 'border-slate-700'
            }`}
          />
        ))}
      </div>

      {checking ? (
        <div className="flex justify-center py-1">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        </div>
      ) : (
        <p className="text-center text-[11px] text-red-400 font-semibold h-4">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={checking}
            onClick={() => pressDigit(d)}
            className="aspect-square rounded-xl bg-slate-850/60 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-lg cursor-pointer transition-colors"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          disabled={checking}
          onClick={() => pressDigit('0')}
          className="aspect-square rounded-xl bg-slate-850/60 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-lg cursor-pointer transition-colors"
        >
          0
        </button>
        <button
          type="button"
          disabled={checking}
          onClick={pressBackspace}
          className="aspect-square rounded-xl bg-slate-850/60 hover:bg-slate-800 disabled:opacity-50 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
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
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      <header className="pt-12 px-4 text-center z-10 relative">
        <div className="inline-flex items-center justify-center p-4 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 shadow-2xl transition-all hover:scale-105 duration-300">
          <Anchor className="w-10 h-10 text-blue-500 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-blue-300 drop-shadow-sm">
          Cổng Chấm Công &amp; Quản Lý Ca
        </h1>
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1.5 flex items-center justify-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ICD AN GIA</span>
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 z-10 max-w-4xl mx-auto w-full">
        <div className={mode === 'driver' ? 'w-full max-w-md mx-auto' : 'w-full max-w-sm mx-auto'}>
          {mode === 'driver' ? (
            /* Driver Portal - chọn tài xế + PIN, dùng cho iPad dùng chung nhiều tài xế */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/10 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                    <Truck className="w-6 h-6" />
                  </span>
                  <span className="text-[10px] bg-slate-850 text-slate-400 font-bold px-2 py-1 rounded-md border border-slate-800">
                    CHUYỂN CA NHANH
                  </span>
                </div>

                <h2 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">DÀNH CHO LÁI XE</h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
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
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        placeholder="Tìm tài xế theo tên hoặc tài khoản..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>

                    <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                      {filteredDrivers.length === 0 && (
                        <p className="text-xs text-slate-500 italic text-center py-4">Không tìm thấy tài xế phù hợp.</p>
                      )}
                      {filteredDrivers.map((driver) => (
                        <button
                          key={driver.id}
                          onClick={() => setSelectedDriver(driver)}
                          className="w-full text-left bg-slate-850/40 hover:bg-blue-500/10 border border-slate-850 hover:border-blue-500/30 rounded-xl p-3 flex items-center justify-between group/btn transition-all cursor-pointer duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover/btn:bg-blue-500/20 text-slate-300 group-hover/btn:text-blue-400 flex items-center justify-center font-bold text-sm transition-colors">
                              {driver.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-300 group-hover/btn:text-white transition-colors block">
                                {driver.fullName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">@{driver.username}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover/btn:text-blue-400 group-hover/btn:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[10px] text-slate-500">
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

      <footer className="py-8 text-center border-t border-slate-900/60 bg-slate-950/90 text-slate-500 text-[10px] z-10">
        <p className="flex items-center justify-center space-x-1 font-medium">
          <span>Phát triển cho ICD AN GIA</span>
        </p>
        <p className="text-slate-600 mt-1">Dữ liệu được lưu trữ trên Supabase</p>
      </footer>
    </div>
  );
}
