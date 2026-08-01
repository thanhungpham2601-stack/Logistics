import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Truck, Clock, ClipboardList, CheckCircle2,
  Trash2, LogOut, ChevronRight, AlertTriangle,
  Plus, Check, RotateCw, Settings, Loader2, Info,
  Edit, X, Sun, Moon, Package, PackageOpen
} from 'lucide-react';
import { ContainerSize, OperationType, JobEntry, Driver, Shift, CargoStatus } from '../types';
import { ContainerSizeRow, DaoChuyenSubtypeRow, NotePresetRow, OperationTypeRow } from '../lib/supabaseTypes';
import { formatDateTime, isJobInLastNDays, validateContainerNumber } from '../utils';

interface DriverViewProps {
  currentDriver: Driver;
  onLogout: () => void;
  jobs: JobEntry[];
  shippingLines: string[];
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  daoChuyenSubtypes: DaoChuyenSubtypeRow[];
  notePresets: NotePresetRow[];
  onAddJob: (job: Omit<JobEntry, 'id' | 'driverId' | 'driverName'>) => Promise<void>;
  onUpdateJob: (job: JobEntry) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
}

/** Ca tự nhận diện theo giờ Việt Nam hiện tại: 07:00-18:59 = ca ngày, còn lại = ca đêm. */
function getAutoShift(date: Date): Shift {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }).format(date)
  );
  return hour >= 7 && hour < 19 ? 'day' : 'night';
}

// Icon và bảng màu cho từng loại tác nghiệp - áp dụng vòng lặp theo thứ tự cấu hình
// trong Thiết Lập Hệ Thống, để tác nghiệp mới thêm sau vẫn có giao diện nhất quán.
const OP_EMOJI: Record<string, string> = {
  nang_khach_hang: '🚚',
  ha_khach_hang: '🏗️',
  nhap_tau: '🚢',
  xuat_tau: '🚢',
  chuyen_bai: '🔄',
  dao_chuyen: '🔀',
};

const OP_COLOR_CYCLE = [
  { border: 'border-emerald-500', text: 'text-emerald-400', shadow: 'shadow-emerald-500/5', chipBg: 'bg-emerald-500/10', chipBorder: 'border-emerald-500/30' },
  { border: 'border-blue-500', text: 'text-blue-400', shadow: 'shadow-blue-500/5', chipBg: 'bg-blue-500/10', chipBorder: 'border-blue-500/30' },
  { border: 'border-indigo-500', text: 'text-indigo-400', shadow: 'shadow-indigo-500/5', chipBg: 'bg-indigo-500/10', chipBorder: 'border-indigo-500/30' },
  { border: 'border-purple-500', text: 'text-purple-400', shadow: 'shadow-purple-500/5', chipBg: 'bg-purple-500/10', chipBorder: 'border-purple-500/30' },
  { border: 'border-teal-500', text: 'text-teal-400', shadow: 'shadow-teal-500/5', chipBg: 'bg-teal-500/10', chipBorder: 'border-teal-500/30' },
  { border: 'border-orange-500', text: 'text-orange-400', shadow: 'shadow-orange-500/5', chipBg: 'bg-orange-500/10', chipBorder: 'border-orange-500/30' },
];

export default function DriverView({
  currentDriver,
  onLogout,
  jobs,
  shippingLines,
  sizes,
  operations,
  daoChuyenSubtypes,
  notePresets,
  onAddJob,
  onUpdateJob,
  onDeleteJob
}: DriverViewProps) {
  const [containerNo, setContainerNo] = useState('');
  const [selectedLine, setSelectedLine] = useState(shippingLines[0] ?? '');
  const [customLine, setCustomLine] = useState('');
  const [isCustomLineMode, setIsCustomLineMode] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ContainerSize>(sizes[0]?.code ?? '');
  const [selectedOperation, setSelectedOperation] = useState<OperationType>(operations[0]?.code ?? 'nang_khach_hang');
  const [selectedShift, setSelectedShift] = useState<Shift>(() => getAutoShift(new Date()));
  const [selectedCargoStatus, setSelectedCargoStatus] = useState<CargoStatus>('hang');
  const [selectedSubType, setSelectedSubType] = useState<string>(daoChuyenSubtypes[0]?.code ?? '');
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorWarning, setErrorWarning] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<JobEntry | null>(null);
  const isBusy = isSubmitting || deletingJobId !== null;

  const isContainerValid = validateContainerNumber(containerNo);

  // Real-time clock for the driver
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter jobs submitted by THIS driver, chỉ hiển thị 3 ngày gần nhất (theo lịch giờ VN)
  const myJobs = jobs
    .filter(job => job.driverId === currentDriver.id && isJobInLastNDays(job.timestamp, 3))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Count stats for this driver today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const myTodayJobs = myJobs.filter(j => new Date(j.timestamp) >= todayStart);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    const finalContainerNo = containerNo.trim().toUpperCase();

    // Nút đã bị khoá cho tới khi đúng định dạng, đây chỉ là chốt chặn phòng vệ.
    if (!validateContainerNumber(finalContainerNo)) {
      setErrorWarning('Số hiệu container chuẩn phải có 4 chữ cái và 7 chữ số (Ví dụ: TRHU4320650).');
      return;
    }

    const finalLine = isCustomLineMode ? customLine.trim().toUpperCase() : selectedLine;
    if (!finalLine) {
      setErrorWarning('Vui lòng chọn hoặc nhập hãng tàu!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddJob({
        timestamp: new Date().toISOString(),
        shift: selectedShift,
        containerNo: finalContainerNo,
        line: finalLine,
        size: selectedSize,
        operation: selectedOperation,
        cargoStatus: selectedCargoStatus,
        subType: selectedOperation === 'dao_chuyen' ? selectedSubType || undefined : undefined,
        notes: notes.trim()
      });

      // Reset Form
      setContainerNo('');
      setNotes('');
      setErrorWarning(null);
      setSuccessMessage(`Đã chấm công thành công công ${finalContainerNo}!`);

      // Clear success message after 3s
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err) {
      setErrorWarning('Có lỗi khi lưu chấm công, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Không ép định dạng/uppercase khi đang gõ - để gõ tự do (kể cả gõ tiếng Việt qua
  // Unikey/Telex vốn giả lập phím bằng backspace+ký tự, rất dễ vỡ nếu bị ghi đè giữa chừng).
  // Việc hợp lệ hay không chỉ quyết định nút "Xác nhận chấm công" có bấm được hay không.
  const handleContainerInput = (val: string) => {
    setContainerNo(val);
  };

  const handleContainerBlur = () => {
    setContainerNo((prev) => prev.trim().toUpperCase());
  };

  const selectQuickNote = (note: string) => {
    if (notes.includes(note)) {
      setNotes(prev => prev.replace(note, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/\s*,\s*$/, ''));
    } else {
      setNotes(prev => prev ? `${prev}, ${note}` : note);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background Graphic Accent */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#131924]/90 backdrop-blur border-b border-slate-800/80 px-4 py-3.5 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-900/30">
            <Truck className="w-5.5 h-5.5 text-white font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-black text-blue-400 tracking-wider">TÀI XẾ CHẤM CÔNG</h1>
            <p className="text-xs text-slate-200 font-bold">{currentDriver.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden xs:flex flex-col items-end text-right font-mono">
            <span className="text-xs font-bold text-slate-300">
              {currentTime.toLocaleTimeString('vi-VN')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {currentTime.toLocaleDateString('vi-VN')}
            </span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 border border-slate-700/60 hover:border-red-500/30 transition-all text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg sm:max-w-2xl lg:max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-24 z-10">
        {/* Driver Dashboard Stats card */}
        <div className="bg-[#131924] rounded-2xl p-4 border border-slate-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ClipboardList className="w-32 h-32 text-white" />
          </div>
          
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Thống kê ca làm hôm nay</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0b0f19]/80 p-3 rounded-xl border border-slate-850 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Đã nâng</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {myTodayJobs.filter(j => j.operation === 'nang_khach_hang').length}
              </span>
            </div>
            <div className="bg-[#0b0f19]/80 p-3 rounded-xl border border-slate-850 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Đã hạ</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {myTodayJobs.filter(j => j.operation === 'ha_khach_hang').length}
              </span>
            </div>
            <div className="bg-[#0b0f19]/80 p-3 rounded-xl border border-slate-850 text-center">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Khác</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {myTodayJobs.filter(j => !['nang_khach_hang', 'ha_khach_hang'].includes(j.operation)).length}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 text-center bg-slate-900/40 py-1.5 rounded-lg">
            Tổng cộng đã hoàn thành: <span className="font-bold text-white font-mono">{myTodayJobs.length}</span> container
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/20 border border-emerald-500/40 p-3.5 rounded-xl text-emerald-300 text-sm flex items-start space-x-3 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{successMessage}</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">Số liệu đã được chuyển tự động về trang báo cáo quản lý.</p>
            </div>
          </motion.div>
        )}

        {errorWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-200 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Lưu ý nhập liệu</p>
              <p className="text-amber-300/80 mt-0.5">{errorWarning}</p>
            </div>
          </div>
        )}

        {/* Attendance Submission Form */}
        <form onSubmit={handleSubmit} className="bg-[#131924] rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-5">
          <div className="border-b border-slate-800/60 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-blue-400" />
              <span>Ghi Nhận Tác Nghiệp Mới</span>
            </h3>
            <p className="text-xs text-slate-400">Chọn chính xác thông tin container để chấm công chuẩn</p>
          </div>

          {/* 0. Shift */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Ca Làm Việc
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedShift('day')}
                className={`py-2.5 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl border-2 transition-all cursor-pointer ${
                  selectedShift === 'day'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Ca ngày (7h-19h)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedShift('night')}
                className={`py-2.5 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl border-2 transition-all cursor-pointer ${
                  selectedShift === 'night'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Ca đêm (19h-7h)</span>
              </button>
            </div>
          </div>

          {/* 1. Container Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Số Hiệu Container <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={containerNo}
                onChange={(e) => handleContainerInput(e.target.value)}
                onBlur={handleContainerBlur}
                placeholder="Ví dụ: TRHU4320650"
                maxLength={20}
                className="w-full bg-[#0b0f19] border-2 border-slate-800 rounded-xl px-4 py-3.5 text-lg font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                required
              />
              {containerNo && validateContainerNumber(containerNo) && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <span className="bg-emerald-500/20 text-emerald-400 p-1 rounded-full block">
                    <Check className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
            <p className={`text-[11px] flex items-center gap-1 ${
              containerNo && !isContainerValid ? 'text-amber-400' : 'text-slate-500'
            }`}>
              <Info className="w-3 h-3 shrink-0" />
              <span>Đúng chuẩn: 4 chữ cái + 7 chữ số, ví dụ <span className="font-mono font-bold">TRHU4320650</span></span>
            </p>
          </div>

          {/* 2. Container Size */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Kích Thước (Size)
              </label>
              <div className="flex items-center bg-[#0b0f19] border border-slate-800/80 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCargoStatus('hang')}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    selectedCargoStatus === 'hang' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  <Package className="w-3 h-3" /> Có hàng
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCargoStatus('rong')}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    selectedCargoStatus === 'rong' ? 'bg-slate-600/40 text-slate-200' : 'text-slate-500'
                  }`}
                >
                  <PackageOpen className="w-3 h-3" /> Rỗng
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {sizes.map((size) => (
                <button
                  key={size.code}
                  type="button"
                  onClick={() => setSelectedSize(size.code)}
                  className={`py-3.5 text-center font-bold font-mono text-sm rounded-xl border-2 transition-all cursor-pointer ${
                    selectedSize === size.code
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                      : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Shipping Lines */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                3. Hãng Tàu (Lines)
              </label>
              <button
                type="button"
                onClick={() => setIsCustomLineMode(!isCustomLineMode)}
                className="text-xs text-blue-400 hover:underline flex items-center space-x-1 font-bold cursor-pointer"
              >
                {isCustomLineMode ? 'Chọn hãng phổ biến' : 'Nhập hãng khác'}
              </button>
            </div>

            {isCustomLineMode ? (
              <input
                type="text"
                value={customLine}
                onChange={(e) => setCustomLine(e.target.value)}
                placeholder="Nhập tên hãng tàu (Ví dụ: ONE, HMM...)"
                className="w-full bg-[#0b0f19] border-2 border-slate-850 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                required={isCustomLineMode}
              />
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-0.5">
                {shippingLines.map((line) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => setSelectedLine(line)}
                    className={`py-2.5 px-1 text-center font-bold text-xs rounded-xl border transition-all cursor-pointer truncate ${
                      selectedLine === line
                        ? 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                        : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {line}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Operation Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              4. Loại Tác Nghiệp
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {operations.map((op, idx) => {
                const palette = OP_COLOR_CYCLE[idx % OP_COLOR_CYCLE.length];
                const isSelected = selectedOperation === op.code;
                return (
                  <button
                    key={op.code}
                    type="button"
                    onClick={() => setSelectedOperation(op.code)}
                    className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? `bg-[#0b0f19] ${palette.border} ${palette.text} ${palette.shadow}`
                        : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base mb-1">{OP_EMOJI[op.code] ?? '📦'} {op.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4b. Phân loại đảo chuyển - chỉ hiện khi chọn tác nghiệp Đảo chuyển */}
          {selectedOperation === 'dao_chuyen' && daoChuyenSubtypes.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Phân Loại Đảo Chuyển
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {daoChuyenSubtypes.map((st) => (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => setSelectedSubType(st.code)}
                    className={`py-2.5 px-2 text-center font-bold text-[11px] rounded-xl border-2 transition-all cursor-pointer ${
                      selectedSubType === st.code
                        ? 'bg-orange-500/15 border-orange-500 text-orange-400'
                        : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Ghi Chú */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              5. Ghi Chú (Nếu có)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full bg-[#0b0f19] border-2 border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
            />

            {/* Quick Notes Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {notePresets.filter((p) => p.is_active).map((preset) => {
                const isActive = notes.includes(preset.label);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectQuickNote(preset.label)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-[#0b0f19]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {isActive ? '✓ ' : '+ '}{preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button - khoá tới khi số hiệu container đúng chuẩn 4 chữ + 7 số, hoặc khi đang lưu/xoá */}
          <button
            type="submit"
            disabled={!isContainerValid || isBusy}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-extrabold text-base py-4 rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-5.5 h-5.5 animate-spin" /> : <CheckCircle2 className="w-5.5 h-5.5" />}
            <span>{isSubmitting ? 'ĐANG LƯU...' : 'XÁC NHẬN CHẤM CÔNG'}</span>
          </button>
        </form>

        {/* Driver's History in this Shift */}
        <div className="bg-[#131924] rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ClipboardList className="w-4.5 h-4.5 text-blue-400" />
              <span>Sản lượng của tôi - 3 ngày gần nhất ({myJobs.length})</span>
            </h3>
            {myJobs.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono italic">Mới nhất lên đầu</span>
            )}
          </div>

          {myJobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Truck className="w-10 h-10 mx-auto opacity-25 mb-2" />
              <p className="text-xs">Bạn chưa thực hiện lượt chấm công nào trong ca này.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 divide-y divide-slate-800/40">
              {myJobs.map((job, idx) => {
                const opIdx = operations.findIndex((op) => op.code === job.operation);
                const palette = OP_COLOR_CYCLE[opIdx >= 0 ? opIdx % OP_COLOR_CYCLE.length : 0];
                const opStyle = `${palette.text} ${palette.chipBg} ${palette.chipBorder}`;
                const opLabel = operations.find((op) => op.code === job.operation)?.label ?? 'Khác';

                return (
                  <div key={job.id} className="pt-2 pb-2.5 flex items-center justify-between group">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono font-bold text-white tracking-wider">
                          {job.containerNo}
                        </span>
                        <span className="text-[10px] bg-[#0b0f19] border border-slate-850 px-1.5 py-0.5 rounded font-mono text-slate-300 font-bold">
                          {job.size}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold bg-[#131924] px-1.5 py-0.5 rounded">
                          {job.line}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${opStyle}`}>
                          {opLabel}
                        </span>
                        <span className="text-slate-500 text-[10px] font-mono flex items-center font-semibold">
                          <Clock className="w-3 h-3 mr-1 text-slate-600" />
                          {formatDateTime(job.timestamp).split(' ')[0]}
                        </span>
                      </div>
                      {job.notes && (
                        <p className="text-[11px] text-amber-300/80 italic font-medium">
                          Ghi chú: {job.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        onClick={() => !isBusy && setEditingJob(job)}
                        disabled={isBusy}
                        className="p-2 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Sửa lượt này"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (isBusy) return;
                          if (confirm(`Bạn có chắc muốn xoá chấm công công ${job.containerNo}?`)) {
                            setDeletingJobId(job.id);
                            try {
                              await onDeleteJob(job.id);
                            } finally {
                              setDeletingJobId(null);
                            }
                          }
                        }}
                        disabled={isBusy}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Xoá lượt này"
                      >
                        {deletingJobId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Quick visual footer with brand and status (Subtle & Clean) */}
      <footer className="mt-auto py-5 text-center border-t border-slate-900/60 bg-slate-950/60 text-slate-500 text-[10px] z-10">
        <p>© 2026 Hệ thống chấm công ICD AN GIA</p>
        <p className="text-[9px] mt-0.5 text-slate-600">Được tối ưu hoá cho thiết bị di động</p>
      </footer>

      {editingJob && (
        <EditJobModal
          job={editingJob}
          sizes={sizes}
          operations={operations}
          shippingLines={shippingLines}
          daoChuyenSubtypes={daoChuyenSubtypes}
          onClose={() => setEditingJob(null)}
          onSave={async (patch) => {
            await onUpdateJob({ ...editingJob, ...patch });
            setEditingJob(null);
          }}
        />
      )}
    </div>
  );
}

interface EditJobModalProps {
  job: JobEntry;
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  shippingLines: string[];
  daoChuyenSubtypes: DaoChuyenSubtypeRow[];
  onClose: () => void;
  onSave: (patch: Partial<JobEntry>) => Promise<void>;
}

function EditJobModal({ job, sizes, operations, shippingLines, daoChuyenSubtypes, onClose, onSave }: EditJobModalProps) {
  const [containerNo, setContainerNo] = useState(job.containerNo);
  const [line, setLine] = useState(job.line);
  const [size, setSize] = useState<ContainerSize>(job.size);
  const [operation, setOperation] = useState<OperationType>(job.operation);
  const [cargoStatus, setCargoStatus] = useState<CargoStatus>(job.cargoStatus);
  const [subType, setSubType] = useState<string>(job.subType ?? daoChuyenSubtypes[0]?.code ?? '');
  const [notes, setNotes] = useState(job.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const isValid = validateContainerNumber(containerNo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        containerNo: containerNo.trim().toUpperCase(),
        line,
        size,
        operation,
        cargoStatus,
        subType: operation === 'dao_chuyen' ? subType || undefined : undefined,
        notes: notes.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#131924] rounded-2xl max-w-md w-full border border-slate-800 shadow-2xl p-5 relative text-slate-100">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 mb-4">Sửa Lượt Chấm Công</h3>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-400">Số hiệu Container</label>
            <input
              type="text"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value)}
              onBlur={() => setContainerNo((v) => v.trim().toUpperCase())}
              className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-400">Hãng tàu</label>
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
              >
                {(shippingLines.includes(line) ? shippingLines : [line, ...shippingLines]).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-400">Kích thước</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
              >
                {sizes.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-400">Loại tác nghiệp</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as OperationType)}
              className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
            >
              {operations.map((op) => (
                <option key={op.code} value={op.code}>{op.label}</option>
              ))}
            </select>
          </div>

          {operation === 'dao_chuyen' && daoChuyenSubtypes.length > 0 && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-400">Phân loại đảo chuyển</label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none"
              >
                {daoChuyenSubtypes.map((st) => (
                  <option key={st.code} value={st.code}>{st.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-400">Container rỗng / có hàng</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCargoStatus('hang')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${cargoStatus === 'hang' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'bg-[#0b0f19] border-slate-800 text-slate-400'}`}
              >
                Có hàng
              </button>
              <button
                type="button"
                onClick={() => setCargoStatus('rong')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${cargoStatus === 'rong' ? 'bg-slate-600/40 border-slate-500 text-slate-200' : 'bg-[#0b0f19] border-slate-800 text-slate-400'}`}
              >
                Rỗng
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-400">Ghi chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 text-sm font-bold hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!isValid || isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold rounded-lg cursor-pointer"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
