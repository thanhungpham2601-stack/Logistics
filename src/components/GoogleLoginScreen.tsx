import React, { useState } from 'react';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GoogleLoginScreenProps {
  resolving: boolean;
  authError: string | null;
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

/** Card đăng nhập Google - dành cho Kế toán/Admin (mỗi người dùng thiết bị riêng, không cần chuyển ca nhanh). */
export default function GoogleLoginScreen({ resolving, authError, onBeforeSignIn }: GoogleLoginScreenProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleSignIn = async () => {
    onBeforeSignIn?.();
    setIsRedirecting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/manage/login` },
    });
    if (error) setIsRedirecting(false);
  };

  const busy = resolving || isRedirecting;

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
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
          Dùng tài khoản Gmail đã được quản trị viên cấp quyền để đăng nhập.
        </p>

        {authError && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-left">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">{authError}</p>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={busy}
          className="w-full mt-6 flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-slate-800 font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          <span>{resolving ? 'Đang xác thực...' : isRedirecting ? 'Đang chuyển đến Google...' : 'Đăng nhập bằng Google'}</span>
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/60 text-[10px] text-slate-500">
        Chưa có tài khoản hoặc bị từ chối truy cập? Liên hệ quản trị viên để được cấp quyền.
      </div>
    </div>
  );
}
