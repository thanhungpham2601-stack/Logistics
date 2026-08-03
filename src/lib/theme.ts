export type ThemeName = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber';

export interface ThemeDef {
  name: ThemeName;
  label: string;
  swatch: string; // màu chấm tròn hiển thị trong bộ chọn theme
}

export const THEMES: ThemeDef[] = [
  { name: 'blue', label: 'Xanh Dương', swatch: '#2563eb' },
  { name: 'emerald', label: 'Xanh Lá', swatch: '#059669' },
  { name: 'violet', label: 'Tím', swatch: '#7c3aed' },
  { name: 'rose', label: 'Hồng Đỏ', swatch: '#e11d48' },
  { name: 'amber', label: 'Cam Vàng', swatch: '#d97706' },
];

const STORAGE_KEY = 'icd_theme';
const DEFAULT_THEME: ThemeName = 'blue';

/** Theme đã lưu trước đó của trình duyệt này, hoặc mặc định nếu chưa từng chọn. */
export function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY);
  return THEMES.find((t) => t.name === stored)?.name ?? DEFAULT_THEME;
}

/** Áp theme vào <html data-theme="..."> và lưu lại lựa chọn. */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
