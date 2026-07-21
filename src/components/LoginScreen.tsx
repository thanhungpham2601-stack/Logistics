import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Truck, ShieldCheck, Key, ArrowRight, Anchor, Heart, Search, Loader2,
} from 'lucide-react';
import { Account } from '../lib/api';
import { stripDiacritics } from '../utils';

interface LoginScreenProps {
  accounts: Account[];
  loading: boolean;
  loadError: string | null;
  onLogin: (account: Account) => void;
}

export default function LoginScreen({ accounts, loading, loadError, onLogin }: LoginScreenProps) {
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  const drivers = useMemo(() => accounts.filter((a) => a.role === 'driver'), [accounts]);
  const staffAccounts = useMemo(
    () => accounts.filter((a) => a.role === 'admin' || a.role === 'accountant'),
    [accounts]
  );

  const filteredDrivers = useMemo(() => {
    const q = stripDiacritics(driverSearch.trim());
    if (!q) return drivers;
    return drivers.filter(
      (d) => stripDiacritics(d.fullName).includes(q) || stripDiacritics(d.username).includes(q)
    );
  }, [drivers, driverSearch]);

  const handleStaffLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = staffAccounts.find((a) => a.id === selectedStaffId);
    if (!account) {
      setLoginError('Vui lòng chọn tài khoản đăng nhập.');
      return;
    }
    // Mock password check only - giai đoạn mockup, chưa dùng Supabase Auth thật.
    if (staffPassword === '123456' || staffPassword === account.username || !staffPassword) {
      onLogin(account);
      setLoginError('');
    } else {
      setLoginError('Mật khẩu chưa đúng! (Thử: để trống, hoặc trùng username)');
    }
  };

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">

      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <header className="pt-12 px-4 text-center z-10">
        <div className="inline-flex items-center justify-center p-4 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 shadow-2xl transition-all hover:scale-105 duration-300">
          <Anchor className="w-10 h-10 text-blue-500 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
          Cổng Chấm Công & Quản Lý Ca
        </h1>
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1.5 flex items-center justify-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ICD Cát Lái</span>
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 z-10 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-bold">Đang tải danh sách tài khoản từ Supabase...</p>
          </div>
        ) : loadError ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md text-center space-y-2">
            <p className="text-red-300 font-bold">Không kết nối được Supabase</p>
            <p className="text-xs text-red-400/80">{loadError}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 w-full">

            {/* Card 1: Driver Portal */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/10 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                    <Truck className="w-6 h-6" />
                  </span>
                  <span className="text-[10px] bg-slate-850 text-slate-400 font-bold px-2 py-1 rounded-md border border-slate-800">
                    TIỆN LỢI - NHANH CHÓNG
                  </span>
                </div>

                <h2 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">DÀNH CHO LÁI XE</h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Lái xe chọn đúng tài khoản của mình để thực hiện chấm công từng lượt container trong ca làm việc.
                </p>

                {/* Search box */}
                <div className="mt-4 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    placeholder="Tìm tài xế theo tên hoặc tài khoản..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {filteredDrivers.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4">Không tìm thấy tài xế phù hợp.</p>
                  )}
                  {filteredDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      onClick={() => onLogin(driver)}
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
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[10px] text-slate-500">
                * Lái xe chỉ có quyền cập nhật lượt chấm công của mình. Không xem được báo cáo tổng ca.
              </div>
            </motion.div>

            {/* Card 2: Accountant / Admin Portal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors">
                    <ShieldCheck className="w-6 h-6" />
                  </span>
                  <span className="text-[10px] bg-slate-850 text-slate-400 font-bold px-2 py-1 rounded-md border border-slate-800">
                    QUẢN TRỊ VIÊN & KẾ TOÁN
                  </span>
                </div>

                <h2 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">DÀNH CHO KẾ TOÁN & ADMIN</h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Xem toàn bộ báo cáo sản lượng ca, xuất file Excel, quản lý tài khoản và danh mục hệ thống.
                </p>

                {showStaffLogin ? (
                  <form onSubmit={handleStaffLoginSubmit} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">Chọn tài khoản:</label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-3 text-sm font-bold text-white focus:outline-none"
                      >
                        <option value="">-- Chọn tài khoản --</option>
                        {staffAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullName} ({a.role === 'admin' ? 'Admin' : 'Kế toán'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">Mật khẩu:</label>
                      <div className="relative">
                        <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder="Mật khẩu (Thử: để trống)"
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
                        />
                      </div>
                      {loginError && <p className="text-[11px] text-red-400 font-semibold">{loginError}</p>}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>VÀO HỆ THỐNG</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStaffLogin(false)}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                      >
                        Quay lại
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-8 space-y-4">
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-850 space-y-2">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tiện ích kế toán & admin:</p>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                        <li>Bảng chấm công đa cột, lọc theo khoảng ngày</li>
                        <li>In ấn báo cáo ca, xuất báo cáo kế toán</li>
                        <li>Quản lý tài khoản tài xế / kế toán (chỉ Admin)</li>
                        <li>Cấu hình Size, Loại tác nghiệp, Hãng tàu (chỉ Admin)</li>
                      </ul>
                    </div>

                    <button
                      onClick={() => setShowStaffLogin(true)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>TIẾP TỤC ĐĂNG NHẬP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[10px] text-slate-500">
                * Bảo mật dữ liệu sản lượng cảng. Đảm bảo chính xác tuyệt đối.
              </div>
            </motion.div>

          </div>
        )}
      </main>

      <footer className="py-8 text-center border-t border-slate-900/60 bg-slate-950/90 text-slate-500 text-[10px] z-10">
        <p className="flex items-center justify-center space-x-1 font-medium">
          <span>Phát triển cho ICD Cát Lái với</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
        </p>
        <p className="text-slate-600 mt-1">Dữ liệu được lưu trữ trên Supabase</p>
      </footer>
    </div>
  );
}
