import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { THEMES, ThemeName, applyTheme } from '../lib/theme';

interface ThemePickerProps {
  currentTheme: ThemeName;
  onChange: (theme: ThemeName) => void;
  collapsed?: boolean;
}

export default function ThemePicker({ currentTheme, onChange, collapsed }: ThemePickerProps) {
  const [open, setOpen] = useState(false);

  const handlePick = (theme: ThemeName) => {
    applyTheme(theme);
    onChange(theme);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Đổi giao diện"
        className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer text-slate-450 hover:text-white hover:bg-slate-900/60 ${
          collapsed ? 'lg:justify-center' : ''
        } space-x-3 text-left`}
      >
        <Palette className="w-4.5 h-4.5 shrink-0" style={{ color: 'var(--theme-accent-text)' }} />
        <span className={collapsed ? 'lg:hidden' : ''}>Giao Diện</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 bottom-full mb-2 left-0 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl w-56">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Chọn màu giao diện</p>
            <div className="flex flex-wrap gap-2.5">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handlePick(t.name)}
                  title={t.label}
                  className="relative w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{
                    backgroundColor: t.swatch,
                    boxShadow: currentTheme === t.name ? `0 0 0 2px #0f172a, 0 0 0 4px ${t.swatch}` : undefined,
                  }}
                >
                  {currentTheme === t.name && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2.5">{THEMES.find((t) => t.name === currentTheme)?.label}</p>
          </div>
        </>
      )}
    </div>
  );
}
