import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DateRangePickerProps {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
  onChange: (from: string, to: string) => void;
}

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatVN(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Ngày "hôm nay" tính theo giờ Việt Nam, bất kể múi giờ trình duyệt. */
function getVnToday(): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  return ymdToDate(ymd);
}

function startOfWeek(date: Date): Date {
  // Tuần bắt đầu từ Thứ Hai
  const day = date.getDay(); // 0 = CN ... 6 = Th7
  const diff = day === 0 ? 6 : day - 1;
  return addDays(date, -diff);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

interface PresetOption {
  label: string;
  range: DateRange;
}

function buildPresets(): PresetOption[] {
  const today = getVnToday();
  const yesterday = addDays(today, -1);

  const thisWeekStart = startOfWeek(today);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekEnd, -7);

  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const lastMonthRef = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthStart = startOfMonth(lastMonthRef);
  const lastMonthEnd = endOfMonth(lastMonthRef);

  const thisYearStart = startOfYear(today);
  const thisYearEnd = endOfYear(today);
  const lastYearRef = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearStart = startOfYear(lastYearRef);
  const lastYearEnd = endOfYear(lastYearRef);

  return [
    { label: 'Hôm nay', range: { from: today, to: today } },
    { label: 'Hôm qua', range: { from: yesterday, to: yesterday } },
    { label: 'Tuần này', range: { from: thisWeekStart, to: thisWeekEnd } },
    { label: 'Tuần trước', range: { from: lastWeekStart, to: lastWeekEnd } },
    { label: 'Tháng này', range: { from: thisMonthStart, to: thisMonthEnd } },
    { label: 'Tháng trước', range: { from: lastMonthStart, to: lastMonthEnd } },
    { label: 'Năm này', range: { from: thisYearStart, to: thisYearEnd } },
    { label: 'Năm trước', range: { from: lastYearStart, to: lastYearEnd } },
  ];
}

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const presets = useMemo(() => buildPresets(), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedRange: DateRange = { from: ymdToDate(from), to: ymdToDate(to) };

  const applyPreset = (preset: PresetOption) => {
    if (!preset.range.from) return;
    onChange(dateToYmd(preset.range.from), dateToYmd(preset.range.to ?? preset.range.from));
    setIsOpen(false);
  };

  const isActivePreset = (preset: PresetOption) =>
    preset.range.from && preset.range.to && dateToYmd(preset.range.from) === from && dateToYmd(preset.range.to) === to;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center space-x-2 bg-slate-100 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
      >
        <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
          {formatVN(from)} <span className="text-slate-400 font-semibold">-</span> {formatVN(to)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-30 top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl flex overflow-hidden">
          {/* Preset shortcuts */}
          <div className="w-36 shrink-0 border-r border-slate-100 py-2 bg-slate-50/60">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`w-full text-left px-4 py-2 text-xs font-bold cursor-pointer transition-colors ${
                  isActivePreset(preset) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              defaultMonth={ymdToDate(from)}
              selected={selectedRange}
              onSelect={(range) => {
                if (!range || !range.from) return;
                const newFrom = dateToYmd(range.from);
                const newTo = range.to ? dateToYmd(range.to) : newFrom;
                onChange(newFrom, newTo);
                if (range.from && range.to) setIsOpen(false);
              }}
              style={
                {
                  '--rdp-accent-color': '#2563eb',
                  '--rdp-accent-background-color': '#eff6ff',
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
