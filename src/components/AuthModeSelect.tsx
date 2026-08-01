import React from 'react';
import { Anchor, Code2, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthModeSelectProps {
  onSelectDev: () => void;
  onSelectReal: () => void;
}

/**
 * Màn hình tạm thời cho giai đoạn kiểm thử song song 2 luồng đăng nhập.
 * Sau khi chuyển hẳn sang đăng nhập Google, xoá component này và trong
 * App.tsx set `loginView` cố định về 'real' (hoặc set VITE_AUTH_MODE=real
 * để khoá hẳn, không cần đổi code).
 */
export default function AuthModeSelect({ onSelectDev, onSelectReal }: AuthModeSelectProps) {
  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <header className="pt-12 px-4 text-center z-10">
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

      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="grid sm:grid-cols-2 gap-5 w-full max-w-2xl">
          <button
            onClick={onSelectDev}
            className="text-left bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group transition-all duration-300 cursor-pointer"
          >
            <div>
              <span className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/10 group-hover:bg-amber-500/20 mb-4">
                <Code2 className="w-6 h-6" />
              </span>
              <h2 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">Chế Độ Nhà Phát Triển</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Đăng nhập nhanh bằng danh sách tài khoản có sẵn, dùng để kiểm thử nội bộ.
              </p>
            </div>
            <span className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:gap-2.5 transition-all">
              Vào chế độ dev <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={onSelectReal}
            className="text-left bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group transition-all duration-300 cursor-pointer"
          >
            <div>
              <span className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10 group-hover:bg-emerald-500/20 mb-4">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <h2 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">Chế Độ Thật</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Đăng nhập bằng tài khoản Google đã được quản trị viên cấp quyền.
              </p>
            </div>
            <span className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:gap-2.5 transition-all">
              Đăng nhập Google <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </main>

      <footer className="py-8 text-center border-t border-slate-900/60 bg-slate-950/90 text-slate-500 text-[10px] z-10">
        <p>Dữ liệu được lưu trữ trên Supabase</p>
      </footer>
    </div>
  );
}
