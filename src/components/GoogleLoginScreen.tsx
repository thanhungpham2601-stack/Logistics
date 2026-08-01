import React, { useState } from 'react';
import { Anchor, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GoogleLoginScreenProps {
  resolving: boolean;
  authError: string | null;
  onBack?: () => void;
  onBeforeSignIn?: () => void;
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.2-5.5l-6.5-5.5c-2.1 1.5-4.8 2.5-7.7 2.5-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.5C41.4 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function GoogleLoginScreen({ resolving, authError, onBack, onBeforeSignIn }: GoogleLoginScreenProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleSignIn = async () => {
    onBeforeSignIn?.();
    setIsRedirecting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) setIsRedirecting(false);
  };

  const busy = resolving || isRedirecting;

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <header className="pt-12 px-4 text-center z-10 relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-4 top-12 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
        )}
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center space-y-6">
          <div>
            <h2 className="text-lg font-black text-white">Đăng nhập hệ thống</h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Dùng tài khoản Gmail đã được quản trị viên cấp quyền để đăng nhập.
            </p>
          </div>

          {authError && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-left">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">{authError}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
            <span>{resolving ? 'Đang xác thực...' : isRedirecting ? 'Đang chuyển đến Google...' : 'Đăng nhập bằng Google'}</span>
          </button>

          <p className="text-[10px] text-slate-500">
            Chưa có tài khoản hoặc bị từ chối truy cập? Liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </main>

      <footer className="py-8 text-center border-t border-slate-900/60 bg-slate-950/90 text-slate-500 text-[10px] z-10">
        <p>Dữ liệu được lưu trữ trên Supabase</p>
      </footer>
    </div>
  );
}
