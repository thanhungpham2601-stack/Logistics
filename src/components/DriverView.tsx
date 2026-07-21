import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, Clock, ClipboardList, CheckCircle2, 
  Trash2, LogOut, ChevronRight, AlertTriangle, 
  Plus, Check, RotateCw, Settings 
} from 'lucide-react';
import { ContainerSize, OperationType, JobEntry, Driver } from '../types';
import { SHIPPING_LINES } from '../data/mockData';
import { formatDateTime, validateContainerNumber } from '../utils';

interface DriverViewProps {
  currentDriver: Driver;
  onLogout: () => void;
  jobs: JobEntry[];
  onAddJob: (job: Omit<JobEntry, 'id' | 'driverId' | 'driverName'>) => void;
  onDeleteJob: (jobId: string) => void;
}

const PRESET_NOTES = [
  'Đảo chuyển khách hàng',
  'Nâng khách trả lại',
  'Đảo chuyển hầm tàu',
  'Chờ lệnh phụ',
  'Công rỗng',
  'Công có nước',
];

export default function DriverView({ 
  currentDriver, 
  onLogout, 
  jobs, 
  onAddJob, 
  onDeleteJob 
}: DriverViewProps) {
  const [containerNo, setContainerNo] = useState('');
  const [selectedLine, setSelectedLine] = useState('MAE/MSK');
  const [customLine, setCustomLine] = useState('');
  const [isCustomLineMode, setIsCustomLineMode] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ContainerSize>('40');
  const [selectedOperation, setSelectedOperation] = useState<OperationType>('nang_khach_hang');
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorWarning, setErrorWarning] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock for the driver
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter jobs submitted by THIS driver
  const myJobs = jobs
    .filter(job => job.driverId === currentDriver.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Count stats for this driver today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const myTodayJobs = myJobs.filter(j => new Date(j.timestamp) >= todayStart);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!containerNo.trim()) {
      setErrorWarning('Vui lòng nhập số hiệu container!');
      return;
    }

    const finalContainerNo = containerNo.trim().toUpperCase();
    
    // Validate container syntax
    if (!validateContainerNumber(finalContainerNo)) {
      if (!confirm('Số container có vẻ chưa đúng định dạng chuẩn (ví dụ: TRHU4320650 - 4 chữ, 7 số). Bạn vẫn muốn tiếp tục lưu?')) {
        return;
      }
    }

    const finalLine = isCustomLineMode ? customLine.trim().toUpperCase() : selectedLine;
    if (!finalLine) {
      setErrorWarning('Vui lòng chọn hoặc nhập hãng tàu!');
      return;
    }

    onAddJob({
      timestamp: new Date().toISOString(),
      containerNo: finalContainerNo,
      line: finalLine,
      size: selectedSize,
      operation: selectedOperation,
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
  };

  const handleContainerInput = (val: string) => {
    // Keep uppercase and clean characters
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setContainerNo(clean);
    
    if (clean.length > 0 && !validateContainerNumber(clean)) {
      setErrorWarning('Số hiệu container chuẩn thường có 4 chữ cái và 7 chữ số (Ví dụ: TRHU4320650).');
    } else {
      setErrorWarning(null);
    }
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
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-6 pb-24 z-10">
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
                placeholder="Ví dụ: TRHU4320650"
                maxLength={12}
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
          </div>

          {/* 2. Container Size */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Kích Thước (Size)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['20', '20RF', '40', '40RF', '45', '45RF'] as ContainerSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`py-3.5 text-center font-bold font-mono text-sm rounded-xl border-2 transition-all cursor-pointer ${
                    selectedSize === size
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                      : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {size}
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
              <div className="grid grid-cols-3 gap-2">
                {SHIPPING_LINES.slice(0, 6).map((line) => (
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
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedOperation('nang_khach_hang')}
                className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedOperation === 'nang_khach_hang'
                    ? 'bg-[#0b0f19] border-emerald-500 text-emerald-400 shadow-emerald-500/5'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base mb-1">🚚 Nâng KH</span>
                <span className="text-[10px] text-slate-500 font-medium">Nâng khách hàng</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOperation('ha_khach_hang')}
                className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedOperation === 'ha_khach_hang'
                    ? 'bg-[#0b0f19] border-blue-500 text-blue-400 shadow-blue-500/5'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base mb-1">🏗️ Hạ KH</span>
                <span className="text-[10px] text-slate-500 font-medium">Hạ khách hàng</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOperation('nhap_tau')}
                className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedOperation === 'nhap_tau'
                    ? 'bg-[#0b0f19] border-indigo-500 text-indigo-400 shadow-indigo-500/5'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base mb-1">🚢 Nhập tàu</span>
                <span className="text-[10px] text-slate-500 font-medium">Dỡ công từ tàu xuống bãi</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOperation('xuat_tau')}
                className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedOperation === 'xuat_tau'
                    ? 'bg-[#0b0f19] border-purple-500 text-purple-400 shadow-purple-500/5'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base mb-1">🚢 Xuất tàu</span>
                <span className="text-[10px] text-slate-500 font-medium">Cấp công lên tàu đi</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOperation('chuyen_bai')}
                className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedOperation === 'chuyen_bai'
                    ? 'bg-[#0b0f19] border-teal-500 text-teal-400 shadow-teal-500/5'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base mb-1">🔄 Chuyển bãi</span>
                <span className="text-[10px] text-slate-500 font-medium">Chuyển giữa các ô bãi</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOperation('dao_chuyen')}
                className={`py-3.5 px-3 text-left font-bold text-xs rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  selectedOperation === 'dao_chuyen'
                    ? 'bg-[#0b0f19] border-orange-500 text-orange-400 shadow-orange-500/5'
                    : 'bg-[#0b0f19] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-base mb-1">🔀 Đảo chuyển</span>
                <span className="text-[10px] text-slate-500 font-medium">Đảo chuyển nội bộ / KH</span>
              </button>
            </div>
          </div>

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
              {PRESET_NOTES.map((preset) => {
                const isActive = notes.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => selectQuickNote(preset)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300' 
                        : 'bg-[#0b0f19]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {isActive ? '✓ ' : '+ '}{preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-base py-4 rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
          >
            <CheckCircle2 className="w-5.5 h-5.5" />
            <span>XÁC NHẬN CHẤM CÔNG</span>
          </button>
        </form>

        {/* Driver's History in this Shift */}
        <div className="bg-[#131924] rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ClipboardList className="w-4.5 h-4.5 text-blue-400" />
              <span>Lịch sử chấm công gần đây ({myJobs.length})</span>
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
                let opStyle = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                let opLabel = 'Khác';
                if (job.operation === 'nang_khach_hang') {
                  opStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                  opLabel = 'Nâng KH';
                } else if (job.operation === 'ha_khach_hang') {
                  opStyle = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                  opLabel = 'Hạ KH';
                } else if (job.operation === 'nhap_tau') {
                  opStyle = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
                  opLabel = 'Nhập Tàu';
                } else if (job.operation === 'xuat_tau') {
                  opStyle = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
                  opLabel = 'Xuất Tàu';
                } else if (job.operation === 'chuyen_bai') {
                  opStyle = 'text-teal-400 bg-teal-500/10 border-teal-500/30';
                  opLabel = 'Chuyển Bãi';
                } else if (job.operation === 'dao_chuyen') {
                  opStyle = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
                  opLabel = 'Đảo Chuyển';
                }

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

                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xoá chấm công công ${job.containerNo}?`)) {
                          onDeleteJob(job.id);
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Xoá lượt này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Quick visual footer with brand and status (Subtle & Clean) */}
      <footer className="mt-auto py-5 text-center border-t border-slate-900/60 bg-slate-950/60 text-slate-500 text-[10px] z-10">
        <p>© 2026 Hệ thống chấm công ICD Tân Cảng Hải Phòng</p>
        <p className="text-[9px] mt-0.5 text-slate-600">Được tối ưu hoá cho thiết bị di động</p>
      </footer>
    </div>
  );
}
