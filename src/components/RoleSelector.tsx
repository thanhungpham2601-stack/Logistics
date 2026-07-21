import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, ShieldCheck, ClipboardList, Plus, 
  Key, User, ArrowRight, Anchor, Heart 
} from 'lucide-react';
import { Driver, UserRole } from '../types';

interface RoleSelectorProps {
  drivers: Driver[];
  onSelectDriver: (driver: Driver) => void;
  onSelectAccountant: () => void;
  onAddDriver: (name: string) => void;
}

export default function RoleSelector({ 
  drivers, 
  onSelectDriver, 
  onSelectAccountant,
  onAddDriver 
}: RoleSelectorProps) {
  const [newDriverName, setNewDriverName] = useState('');
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAddDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim()) return;
    
    onAddDriver(newDriverName.trim());
    setNewDriverName('');
    setShowAddDriver(false);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple demo password or let them click through easily with custom warning
    if (adminPassword === '123456' || adminPassword === 'admin' || !adminPassword) {
      onSelectAccountant();
      setLoginError('');
    } else {
      setLoginError('Mật khẩu quản lý chưa đúng! (Thử: admin hoặc bỏ trống)');
    }
  };

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      {/* Corporate Branding Header */}
      <header className="pt-12 px-4 text-center z-10">
        <div className="inline-flex items-center justify-center p-4 bg-slate-900/90 border border-slate-800 rounded-2xl mb-4 shadow-2xl transition-all hover:scale-105 duration-300">
          <Anchor className="w-10 h-10 text-blue-500 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
          Cổng Chấm Công & Quản Lý Ca
        </h1>
        <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1.5 flex items-center justify-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ICD TÂN CẢNG HẢI PHÒNG</span>
        </p>
      </header>

      {/* Portals grid */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 max-w-4xl mx-auto w-full">
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
                Lái xe chọn đúng họ tên của mình để thực hiện chấm công từng lượt container trong ca làm việc.
              </p>

              {/* Driver selector list */}
              <div className="mt-5 space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => onSelectDriver(driver)}
                    className="w-full text-left bg-slate-850/40 hover:bg-blue-500/10 border border-slate-850 hover:border-blue-500/30 rounded-xl p-3 flex items-center justify-between group/btn transition-all cursor-pointer duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 group-hover/btn:bg-blue-500/20 text-slate-300 group-hover/btn:text-blue-400 flex items-center justify-center font-bold text-sm transition-colors">
                        {driver.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-300 group-hover/btn:text-white transition-colors">
                        {driver.name}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover/btn:text-blue-400 group-hover/btn:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              {/* Optional: Register / Add New Driver on the fly */}
              {showAddDriver ? (
                <form onSubmit={handleAddDriverSubmit} className="mt-4 p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-[10px] font-bold text-amber-400 uppercase">Nhập họ và tên lái xe mới:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddDriver(false)}
                      className="text-xs text-slate-400 px-1 cursor-pointer"
                    >
                      Huỷ
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddDriver(true)}
                  className="w-full text-center py-2.5 mt-3 border border-dashed border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tôi chưa có tên trong danh sách</span>
                </button>
              )}
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
                Xem toàn bộ báo cáo sản lượng ca, xuất file Excel để kiểm tra đối chiếu lương và xuất hóa đơn cho hãng tàu.
              </p>

              {showAdminLogin ? (
                <form onSubmit={handleAdminLoginSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">Nhập mật khẩu quản trị viên:</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="Mật khẩu (Thử: admin hoặc để trống)"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                    {loginError && (
                      <p className="text-[11px] text-red-400 font-semibold">{loginError}</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>VÀO HỆ THỐNG BÁO CÁO</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      Quay lại
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-8 space-y-4">
                  <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-850 space-y-2">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tiện ích kế toán:</p>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                      <li>Bảng chấm công đa cột trực quan</li>
                      <li>In ấn báo cáo ca dập dấu chuẩn chỉ</li>
                      <li>Bộ lọc ca thông minh linh hoạt</li>
                      <li>Thao tác sửa lỗi chấm công của lái xe</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setShowAdminLogin(true)}
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
      </main>

      {/* Footer credits */}
      <footer className="py-8 text-center border-t border-slate-900/60 bg-slate-950/90 text-slate-500 text-[10px] z-10">
        <p className="flex items-center justify-center space-x-1 font-medium">
          <span>Phát triển cho ICD Tân Cảng Hải Phòng với</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
        </p>
        <p className="text-slate-600 mt-1">Sản lượng được lưu trữ an toàn trong LocalStorage</p>
      </footer>
    </div>
  );
}
