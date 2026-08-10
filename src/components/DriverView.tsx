import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  Truck, Clock, ClipboardList, CheckCircle2,
  Trash2, LogOut, ChevronRight, ChevronLeft, AlertTriangle,
  Plus, Check, RotateCw, Settings, Loader2, Info, Search,
  Edit, X, Sun, Moon, Package, PackageOpen, Forklift, Menu, Download
} from 'lucide-react';
import { ContainerSize, OperationType, JobEntry, Driver, Shift, CargoStatus } from '../types';
import { ContainerSizeRow, ContainerTypeRow, DaoChuyenSubtypeRow, EquipmentTypeRow, NotePresetRow, OperationTypeRow } from '../lib/supabaseTypes';
import { formatDateTime, formatDateOnly, isJobInLastNDays, isJobInDateRange, isJobInShift, validateContainerNumber, stripDiacritics, getAutoShift, todayVN, addDaysToDateStr } from '../utils';
import DateRangePicker from './DateRangePicker';
import { exportShiftReportToExcel } from '../lib/exportExcel';

interface DriverViewProps {
  currentDriver: Driver;
  onLogout: () => void;
  jobs: JobEntry[];
  shippingLines: string[];
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  daoChuyenSubtypes: DaoChuyenSubtypeRow[];
  notePresets: NotePresetRow[];
  equipmentTypes: EquipmentTypeRow[];
  containerTypes: ContainerTypeRow[];
  onAddJob: (job: Omit<JobEntry, 'id' | 'driverId' | 'driverName'>) => Promise<void>;
  onUpdateJob: (job: JobEntry) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
}

/** Định dạng Date thành chuỗi "YYYY-MM-DDTHH:mm" theo giờ địa phương - dùng cho input datetime-local. */
function toDatetimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Icon và bảng màu cho từng loại tác nghiệp - áp dụng vòng lặp theo thứ tự cấu hình
// trong Thiết Lập Hệ Thống, để tác nghiệp mới thêm sau vẫn có giao diện nhất quán.
// Nền sáng tương phản cao: trạng thái ĐANG CHỌN dùng màu đặc + chữ trắng (không dùng độ
// trong suốt) để tài xế vẫn phân biệt rõ dưới nắng gắt/ánh sáng chói ngoài trời.
const OP_EMOJI: Record<string, string> = {
  nang_khach_hang: '🚚',
  ha_khach_hang: '🏗️',
  nhap_tau: '🚢',
  xuat_tau: '🚢',
  chuyen_bai: '🔄',
  dao_chuyen: '🔀',
};

const OP_COLOR_CYCLE = [
  { solid: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/30', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { solid: 'bg-blue-600 border-blue-600 text-white shadow-blue-500/30', badge: 'bg-blue-50 border-blue-200 text-blue-700' },
  { solid: 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/30', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { solid: 'bg-purple-600 border-purple-600 text-white shadow-purple-500/30', badge: 'bg-purple-50 border-purple-200 text-purple-700' },
  { solid: 'bg-teal-600 border-teal-600 text-white shadow-teal-500/30', badge: 'bg-teal-50 border-teal-200 text-teal-700' },
  { solid: 'bg-orange-600 border-orange-600 text-white shadow-orange-500/30', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
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
  equipmentTypes,
  containerTypes,
  onAddJob,
  onUpdateJob,
  onDeleteJob
}: DriverViewProps) {
  const [driverTab, setDriverTab] = useState<'add' | 'list'>('add');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [containerNo, setContainerNo] = useState('');
  const [selectedLine, setSelectedLine] = useState(shippingLines[0] ?? '');
  const [customLine, setCustomLine] = useState('');
  const [isCustomLineMode, setIsCustomLineMode] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ContainerSize>(sizes[0]?.code ?? '');
  const [selectedContainerType, setSelectedContainerType] = useState<string>(containerTypes[0]?.code ?? '');
  const [selectedEquipment, setSelectedEquipment] = useState<string>(equipmentTypes[0]?.code ?? '');
  const [selectedOperation, setSelectedOperation] = useState<OperationType>(operations[0]?.code ?? 'nang_khach_hang');
  // Tích "Dùng giờ hiện tại" (mặc định bật) = luôn dùng currentTime đang chạy; bỏ tích mới hiện
  // khung ngày giờ cho tự nhập (ghi nhận muộn) - ca làm việc luôn tự suy ra từ thời điểm này,
  // không cho chọn tay riêng để tránh lệch (vd: chọn "ca ngày" nhưng giờ tạo thực tế là ca đêm).
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [manualTimestamp, setManualTimestamp] = useState('');
  const [selectedCargoStatus, setSelectedCargoStatus] = useState<CargoStatus>('hang');
  const [selectedSubType, setSelectedSubType] = useState<string>(daoChuyenSubtypes[0]?.code ?? '');
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorWarning, setErrorWarning] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<JobEntry | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyFromDate, setHistoryFromDate] = useState(() => addDaysToDateStr(todayVN(), -2));
  const [historyToDate, setHistoryToDate] = useState(() => todayVN());
  const [exportDate, setExportDate] = useState(() => todayVN());
  const [exportShift, setExportShift] = useState<'day' | 'night'>('day');
  const [isExporting, setIsExporting] = useState(false);
  const isBusy = isSubmitting || deletingJobId !== null;

  const isContainerValid = validateContainerNumber(containerNo);

  // Real-time clock for the driver
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Thời điểm ghi nhận: mặc định giờ hiện tại (tự chạy theo currentTime), hoặc thời điểm tài xế
  // tự chọn lại (ghi nhận muộn) - giới hạn không quá 3 ngày trước, không được chọn tương lai.
  const effectiveTimestamp = useCurrentTime || !manualTimestamp ? currentTime : new Date(manualTimestamp);
  const effectiveShift: Shift = getAutoShift(effectiveTimestamp);
  const minAllowedTimestamp = new Date();
  minAllowedTimestamp.setDate(minAllowedTimestamp.getDate() - 3);

  // Filter jobs submitted by THIS driver, theo khoảng ngày đang chọn (mặc định 3 ngày gần nhất)
  const myJobs = jobs
    .filter(job => job.driverId === currentDriver.id && isJobInDateRange(job.timestamp, historyFromDate, historyToDate))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Count stats for this driver today - luôn phản ánh đúng "hôm nay", không phụ thuộc khoảng ngày đang lọc ở danh sách bên dưới
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const myTodayJobs = jobs.filter(j => j.driverId === currentDriver.id && new Date(j.timestamp) >= todayStart);

  // Tìm kiếm + phân trang lịch sử của tôi - không phân biệt dấu, giống ô tìm kiếm bên báo cáo.
  const HISTORY_PAGE_SIZE = 5;
  const filteredMyJobs = historySearch
    ? myJobs.filter((job) => {
        const q = stripDiacritics(historySearch);
        return (
          stripDiacritics(job.containerNo).includes(q) ||
          stripDiacritics(job.line).includes(q) ||
          (job.notes ? stripDiacritics(job.notes).includes(q) : false)
        );
      })
    : myJobs;
  const historyTotalPages = Math.max(1, Math.ceil(filteredMyJobs.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyTotalPages - 1);
  const pagedMyJobs = filteredMyJobs.slice(
    safeHistoryPage * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE
  );

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

    // Chốt chặn phòng vệ - input datetime-local đã có min/max nhưng không phải trình duyệt
    // nào cũng ép cứng được, nên kiểm tra lại trước khi lưu.
    if (isNaN(effectiveTimestamp.getTime()) || effectiveTimestamp > currentTime || effectiveTimestamp < minAllowedTimestamp) {
      setErrorWarning('Thời điểm thực hiện không hợp lệ - không được chọn tương lai hoặc quá 3 ngày trước.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddJob({
        timestamp: effectiveTimestamp.toISOString(),
        shift: effectiveShift,
        containerNo: finalContainerNo,
        line: finalLine,
        size: selectedSize,
        operation: selectedOperation,
        cargoStatus: selectedCargoStatus,
        subType: selectedOperation === 'dao_chuyen' ? selectedSubType || undefined : undefined,
        equipment: selectedEquipment || undefined,
        containerType: selectedContainerType || undefined,
        notes: notes.trim()
      });

      // Reset Form - đưa toàn bộ lựa chọn về lại mặc định ban đầu, không giữ lại lựa chọn của lượt vừa nhập
      setContainerNo('');
      setNotes('');
      setUseCurrentTime(true);
      setManualTimestamp('');
      setSelectedLine(shippingLines[0] ?? '');
      setCustomLine('');
      setIsCustomLineMode(false);
      setSelectedSize(sizes[0]?.code ?? '');
      setSelectedContainerType(containerTypes[0]?.code ?? '');
      setSelectedEquipment(equipmentTypes[0]?.code ?? '');
      setSelectedOperation(operations[0]?.code ?? 'nang_khach_hang');
      setSelectedCargoStatus('hang');
      setSelectedSubType(daoChuyenSubtypes[0]?.code ?? '');
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

  // Xuất báo cáo ca ra Excel - đúng mẫu công ty (giống hệt bản admin/kế toán export), nhưng chỉ
  // gồm lượt của chính tài xế này, lọc theo 1 ngày + 1 ca cụ thể (không có chế độ khoảng ngày).
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const jobsForExport = jobs.filter(
        (job) => job.driverId === currentDriver.id && isJobInShift(job.timestamp, exportDate, exportShift)
      );
      const formattedDate = formatDateOnly(exportDate);
      const dotDate = formattedDate.replace(/\//g, '.'); // "DD/MM/YYYY" -> "DD.MM.YYYY" (dùng cho tên file, "/" không hợp lệ trong tên file)
      let subtitle: string;
      let filenamePrefix: string;
      if (exportShift === 'night') {
        const nextDateObj = new Date(`${exportDate}T12:00:00Z`);
        nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);
        const formattedNextDate = formatDateOnly(nextDateObj.toISOString());
        subtitle = `Ca đêm 19:00 ${formattedDate} - 07:00 ${formattedNextDate}`;
        filenamePrefix = `Sản lượng Ca đêm ${dotDate}_${formattedNextDate.replace(/\//g, '.')} ICD Tân Cảng - ${exportDate}`;
      } else {
        subtitle = `Ca ngày 07:00 ${formattedDate} - 19:00 ${formattedDate}`;
        filenamePrefix = `Sản lượng Ca ngày ${dotDate} ICD Tân Cảng - ${exportDate}`;
      }
      await exportShiftReportToExcel({
        jobs: jobsForExport,
        sizes,
        operations,
        subtitle,
        driverLabel: currentDriver.name,
        filenamePrefix,
      });
    } finally {
      setIsExporting(false);
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans relative">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            title="Mở menu"
            className="p-2 -ml-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }}>
            <Truck className="w-5.5 h-5.5 text-white font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider" style={{ color: 'var(--theme-primary)' }}>TÀI XẾ CHẤM CÔNG</h1>
            <p className="text-xs text-slate-700 font-bold">{currentDriver.name}</p>
          </div>
        </div>

        <div className="hidden xs:flex flex-col items-end text-right font-mono">
          <span className="text-xs font-bold text-slate-700">
            {currentTime.toLocaleTimeString('vi-VN')}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {currentTime.toLocaleDateString('vi-VN')}
          </span>
        </div>
      </header>

      {/* Backdrop cho menu di động */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Menu (giống cấu trúc sidebar bên màn hình kế toán/admin) - mặc định "Thêm Sản Lượng",
          chuyển qua "Danh Sách Sản Lượng" để xem/sửa lại các lượt đã chấm công (chỉ trong 3 ngày
          gần nhất). */}
      <aside
        className={`${mobileNavOpen ? 'flex' : 'hidden'} flex-col fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-2xl`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }}>
              <Truck className="w-5.5 h-5.5 text-white font-bold" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wider" style={{ color: 'var(--theme-primary)' }}>TÀI XẾ CHẤM CÔNG</p>
              <p className="text-xs text-slate-700 font-bold">{currentDriver.name}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            title="Đóng menu"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => { setDriverTab('add'); setMobileNavOpen(false); }}
            className={`w-full flex items-center space-x-3 font-bold text-sm px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
              driverTab === 'add' ? 'text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={driverTab === 'add' ? { backgroundColor: 'var(--theme-primary)' } : undefined}
          >
            <Plus className="w-4.5 h-4.5 shrink-0" />
            <span>Thêm Sản Lượng</span>
          </button>
          <button
            onClick={() => { setDriverTab('list'); setMobileNavOpen(false); }}
            className={`w-full flex items-center space-x-3 font-bold text-sm px-4 py-3 rounded-xl transition-all cursor-pointer text-left ${
              driverTab === 'list' ? 'text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={driverTab === 'list' ? { backgroundColor: 'var(--theme-primary)' } : undefined}
          >
            <ClipboardList className="w-4.5 h-4.5 shrink-0" />
            <span>Danh Sách Sản Lượng</span>
          </button>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 font-bold text-sm px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full lg:max-w-3xl lg:mx-auto p-4 sm:p-6 space-y-6 pb-24 z-10">
        {/* Tiêu đề trang - phản ánh mục đang chọn ở menu, giống header trang bên kế toán/admin */}
        <div className="flex items-center space-x-2">
          {driverTab === 'add' ? (
            <Plus className="w-6 h-6 shrink-0" style={{ color: 'var(--theme-primary)' }} />
          ) : (
            <ClipboardList className="w-6 h-6 shrink-0" style={{ color: 'var(--theme-primary)' }} />
          )}
          <h1 className="text-lg font-black text-slate-900">
            {driverTab === 'add' ? 'Thêm Sản Lượng' : 'Danh Sách Sản Lượng'}
          </h1>
        </div>

        {/* Driver Dashboard Stats card - chỉ hiện ở màn Danh Sách Sản Lượng, không hiện ở màn Thêm Sản Lượng */}
        {driverTab === 'list' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center space-x-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span>Thống kê ca làm hôm nay</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
              <span className="block text-[10px] text-emerald-700 uppercase font-bold">Đã nâng</span>
              <span className="text-xl font-black text-emerald-700 font-mono">
                {myTodayJobs.filter(j => j.operation === 'nang_khach_hang').length}
              </span>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
              <span className="block text-[10px] text-blue-700 uppercase font-bold">Đã hạ</span>
              <span className="text-xl font-black text-blue-700 font-mono">
                {myTodayJobs.filter(j => j.operation === 'ha_khach_hang').length}
              </span>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
              <span className="block text-[10px] text-amber-700 uppercase font-bold">Khác</span>
              <span className="text-xl font-black text-amber-700 font-mono">
                {myTodayJobs.filter(j => !['nang_khach_hang', 'ha_khach_hang'].includes(j.operation)).length}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-600 text-center bg-slate-50 border border-slate-200 py-1.5 rounded-lg">
            Tổng cộng đã hoàn thành: <span className="font-bold text-slate-900 font-mono">{myTodayJobs.length}</span> container
          </div>
        </div>
        )}

        {/* Toast thông báo - hiển thị cố định trên đầu màn hình, không phụ thuộc vị trí cuộn của form dài */}
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md pointer-events-none">
          <AnimatePresence>
            {successMessage && (
              <motion.div
                key="success-toast"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                className="bg-emerald-600 p-3.5 rounded-xl text-white text-sm flex items-start space-x-3 shadow-xl pointer-events-auto"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{successMessage}</p>
                  <p className="text-xs text-emerald-50 mt-0.5">Số liệu đã được chuyển tự động về trang báo cáo quản lý.</p>
                </div>
              </motion.div>
            )}

            {errorWarning && (
              <motion.div
                key="error-toast"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                className="bg-amber-50 border-2 border-amber-400 p-3.5 rounded-xl text-amber-900 text-xs flex items-start space-x-3 shadow-xl pointer-events-auto mt-2"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Lưu ý nhập liệu</p>
                  <p className="text-amber-800 mt-0.5">{errorWarning}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {driverTab === 'add' && (
        <>
        {/* Attendance Submission Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Plus className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
              <span>Ghi Nhận Tác Nghiệp Mới</span>
            </h3>
            <p className="text-xs text-slate-500">Chọn chính xác thông tin container để chấm công chuẩn</p>
          </div>

          {/* 1. Thời điểm thực hiện - ca làm việc tự suy ra từ thời điểm này, không cho chọn tay
              riêng để tránh lệch (vd: chọn "ca ngày" nhưng giờ tạo thực tế lại là ca đêm). */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Thời Điểm Thực Hiện <span className="text-red-600">*</span>
              </label>
              <span
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full ${
                  effectiveShift === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {effectiveShift === 'day' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{effectiveShift === 'day' ? 'Ca ngày' : 'Ca đêm'}</span>
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={useCurrentTime}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseCurrentTime(checked);
                  if (!checked && !manualTimestamp) setManualTimestamp(toDatetimeLocalValue(currentTime));
                }}
                className="w-4.5 h-4.5 rounded accent-current cursor-pointer"
                style={{ accentColor: 'var(--theme-primary)' }}
              />
              <span className="text-xs font-bold text-slate-700">Dùng giờ hiện tại</span>
            </label>
            {!useCurrentTime && (
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                value={manualTimestamp ? dayjs(manualTimestamp) : null}
                onChange={(date) => setManualTimestamp(date ? date.format('YYYY-MM-DDTHH:mm') : '')}
                disabledDate={(current) =>
                  !!current && (current.isBefore(dayjs(minAllowedTimestamp), 'day') || current.isAfter(dayjs(currentTime), 'day'))
                }
                allowClear={false}
                className="w-full !h-[42px] !rounded-xl !border-2 !border-slate-300"
              />
            )}
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>Bỏ tích để ghi nhận muộn - chỉ chọn được trong 3 ngày gần nhất, không quá giờ hiện tại.</span>
            </p>
          </div>

          {/* 2. Thiết Bị Sử Dụng - loại xe tài xế đang điều khiển */}
          {equipmentTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Thiết Bị Sử Dụng <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
              >
                {equipmentTypes.map((eq) => (
                  <option key={eq.code} value={eq.code}>{eq.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Container Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Số Hiệu Container <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={containerNo}
                onChange={(e) => handleContainerInput(e.target.value)}
                onBlur={handleContainerBlur}
                placeholder="Ví dụ: TRHU4320650"
                maxLength={20}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3.5 text-lg font-mono font-bold tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors uppercase"
                required
              />
              {containerNo && validateContainerNumber(containerNo) && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <span className="bg-emerald-500 text-white p-1 rounded-full block">
                    <Check className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
            <p className={`text-[11px] flex items-center gap-1 ${
              containerNo && !isContainerValid ? 'text-amber-700 font-bold' : 'text-slate-500'
            }`}>
              <Info className="w-3 h-3 shrink-0" />
              <span>Đúng chuẩn: 4 chữ cái + 7 chữ số, ví dụ <span className="font-mono font-bold">TRHU4320650</span></span>
            </p>
          </div>

          {/* 4. Loại Container */}
          {containerTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Loại Container <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {containerTypes.map((ct) => (
                  <button
                    key={ct.code}
                    type="button"
                    onClick={() => setSelectedContainerType(ct.code)}
                    className={`py-3.5 text-center font-bold text-sm rounded-xl border-2 transition-all cursor-pointer ${
                      selectedContainerType === ct.code
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Container Size */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                5. Kích Thước (Size) <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center bg-slate-100 border border-slate-300 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSelectedCargoStatus('hang')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    selectedCargoStatus === 'hang' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  <Package className="w-4 h-4" /> Có hàng
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCargoStatus('rong')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    selectedCargoStatus === 'rong' ? 'bg-slate-600 text-white' : 'text-slate-600'
                  }`}
                >
                  <PackageOpen className="w-4 h-4" /> Rỗng
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
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Shipping Lines */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                6. Hãng Tàu (Lines) <span className="text-red-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomLineMode(!isCustomLineMode)}
                className="text-xs hover:underline flex items-center space-x-1 font-bold cursor-pointer"
                style={{ color: 'var(--theme-primary)' }}
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
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-900 focus:outline-none focus:border-blue-600 transition-colors placeholder:text-slate-400"
                required={isCustomLineMode}
              />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-0.5">
                {shippingLines.map((line) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => setSelectedLine(line)}
                    className={`py-2.5 px-1 text-center font-bold text-xs rounded-xl border-2 transition-all cursor-pointer truncate ${
                      selectedLine === line
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {line}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 7. Operation Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              7. Loại Tác Nghiệp <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
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
                        ? `${palette.solid} shadow-md`
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-base mb-1">{OP_EMOJI[op.code] ?? '📦'} {op.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7b. Phân loại đảo chuyển - chỉ hiện khi chọn tác nghiệp Đảo chuyển */}
          {selectedOperation === 'dao_chuyen' && daoChuyenSubtypes.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Phân Loại Đảo Chuyển <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {daoChuyenSubtypes.map((st) => (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => setSelectedSubType(st.code)}
                    className={`py-2.5 px-2 text-center font-bold text-[11px] rounded-xl border-2 transition-all cursor-pointer ${
                      selectedSubType === st.code
                        ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-500/30'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. Ghi Chú */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              8. Ghi Chú (Nếu có)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors placeholder:text-slate-400"
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
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:opacity-100 text-white disabled:text-slate-500 font-extrabold text-base py-4 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 mt-2 cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-5.5 h-5.5 animate-spin" /> : <Plus className="w-5.5 h-5.5" />}
            <span>{isSubmitting ? 'ĐANG THÊM...' : 'THÊM SẢN LƯỢNG'}</span>
          </button>
        </form>
        </>
        )}

        {driverTab === 'list' && (
        <>
        {/* Xuất báo cáo ca - chọn 1 ngày + 1 ca, xuất đúng mẫu Excel công ty (chỉ dữ liệu của tôi) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Download className="w-4.5 h-4.5" style={{ color: 'var(--theme-primary)' }} />
            <span>Xuất Báo Cáo Ca (Excel)</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              format="DD/MM/YYYY"
              value={dayjs(exportDate)}
              onChange={(date) => date && setExportDate(date.format('YYYY-MM-DD'))}
              allowClear={false}
              className="!h-[38px] !rounded-lg !border-2 !border-slate-300"
            />
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setExportShift('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  exportShift === 'day' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ca ngày (7h-19h)
              </button>
              <button
                type="button"
                onClick={() => setExportShift('night')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  exportShift === 'night' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ca đêm (19h-7h)
              </button>
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? 'Đang xuất...' : 'Tải Excel'}</span>
            </button>
          </div>
        </div>

        {/* Driver's History in this Shift */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ClipboardList className="w-4.5 h-4.5" style={{ color: 'var(--theme-primary)' }} />
              <span>Sản lượng của tôi ({myJobs.length})</span>
            </h3>
            {myJobs.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono italic">Mới nhất lên đầu</span>
            )}
          </div>

          {/* Bộ lọc khoảng ngày - mặc định 3 ngày gần nhất, có thể mở rộng để xem lại lịch sử cũ hơn.
              Chỉ những lượt trong 3 ngày gần nhất mới được phép sửa/xoá (xem canEdit bên dưới). */}
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker
              from={historyFromDate}
              to={historyToDate}
              onChange={(newFrom, newTo) => {
                setHistoryFromDate(newFrom);
                setHistoryToDate(newTo);
                setHistoryPage(0);
              }}
            />
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>Chỉ sửa/xoá được lượt trong 3 ngày gần nhất</span>
            </span>
          </div>

          {myJobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Truck className="w-10 h-10 mx-auto opacity-25 mb-2" />
              <p className="text-xs">Không có lượt chấm công nào trong khoảng ngày đã chọn.</p>
            </div>
          ) : (
            <>
              {/* Ô tìm kiếm lịch sử */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                  placeholder="Tìm theo số cont, hãng tàu, ghi chú..."
                  className="w-full bg-white border-2 border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => { setHistorySearch(''); setHistoryPage(0); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {filteredMyJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs">Không tìm thấy lượt chấm công phù hợp.</p>
                </div>
              ) : (
            <div className="space-y-2 pr-1 divide-y divide-slate-100">
              {pagedMyJobs.map((job, idx) => {
                const opIdx = operations.findIndex((op) => op.code === job.operation);
                const palette = OP_COLOR_CYCLE[opIdx >= 0 ? opIdx % OP_COLOR_CYCLE.length : 0];
                const opLabel = operations.find((op) => op.code === job.operation)?.label ?? 'Khác';
                const canEdit = isJobInLastNDays(job.timestamp, 3);

                return (
                  <div key={job.id} className="pt-2 pb-2.5 flex items-center justify-between group">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                          {job.containerNo}
                        </span>
                        <span className="text-[10px] bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded font-mono text-slate-700 font-bold">
                          {job.size}
                        </span>
                        <span className="text-[10px] text-slate-600 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                          {job.line}
                        </span>
                        {job.equipment && (
                          <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                            {job.equipment}
                          </span>
                        )}
                        {job.containerType && (
                          <span className="text-[10px] text-sky-700 font-bold bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                            {containerTypes.find((ct) => ct.code === job.containerType)?.label ?? job.containerType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${palette.badge}`}>
                          {opLabel}
                        </span>
                        <span className="text-slate-500 text-[10px] font-mono flex items-center font-semibold">
                          <Clock className="w-3 h-3 mr-1 text-slate-400" />
                          {(() => {
                            const [time, date] = formatDateTime(job.timestamp).split(' ');
                            return `${date} ${time}`;
                          })()}
                        </span>
                      </div>
                      {job.notes && (
                        <p className="text-[11px] text-amber-700 italic font-medium">
                          Ghi chú: {job.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center shrink-0">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => !isBusy && setEditingJob(job)}
                            disabled={isBusy}
                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                            title="Xoá lượt này"
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {deletingJobId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
              )}

              {filteredMyJobs.length > HISTORY_PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                    disabled={safeHistoryPage === 0}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Trước
                  </button>
                  <span className="text-[11px] text-slate-500 font-bold font-mono">
                    Trang {safeHistoryPage + 1}/{historyTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages - 1, p + 1))}
                    disabled={safeHistoryPage >= historyTotalPages - 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Sau <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        </>
        )}
      </main>

      {/* Quick visual footer with brand and status (Subtle & Clean) */}
      <footer className="mt-auto py-5 text-center border-t border-slate-200 bg-white text-slate-500 text-[10px] z-10">
        <p>© 2026 Hệ thống chấm công ICD AN GIA</p>
        <p className="text-[9px] mt-0.5 text-slate-400">Được tối ưu hoá cho thiết bị di động</p>
      </footer>

      {editingJob && (
        <EditJobModal
          job={editingJob}
          sizes={sizes}
          operations={operations}
          shippingLines={shippingLines}
          daoChuyenSubtypes={daoChuyenSubtypes}
          equipmentTypes={equipmentTypes}
          containerTypes={containerTypes}
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
  equipmentTypes: EquipmentTypeRow[];
  containerTypes: ContainerTypeRow[];
  onClose: () => void;
  onSave: (patch: Partial<JobEntry>) => Promise<void>;
}

function EditJobModal({ job, sizes, operations, shippingLines, daoChuyenSubtypes, equipmentTypes, containerTypes, onClose, onSave }: EditJobModalProps) {
  const [containerNo, setContainerNo] = useState(job.containerNo);
  const [line, setLine] = useState(job.line);
  const [size, setSize] = useState<ContainerSize>(job.size);
  const [operation, setOperation] = useState<OperationType>(job.operation);
  const [cargoStatus, setCargoStatus] = useState<CargoStatus>(job.cargoStatus);
  const [subType, setSubType] = useState<string>(job.subType ?? daoChuyenSubtypes[0]?.code ?? '');
  const [equipment, setEquipment] = useState<string>(job.equipment ?? equipmentTypes[0]?.code ?? '');
  const [containerType, setContainerType] = useState<string>(job.containerType ?? containerTypes[0]?.code ?? '');
  const [timestamp, setTimestamp] = useState(toDatetimeLocalValue(new Date(job.timestamp)));
  const [notes, setNotes] = useState(job.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorWarning, setErrorWarning] = useState<string | null>(null);

  const isValid = validateContainerNumber(containerNo);
  const now = new Date();
  const minAllowedTimestamp = new Date();
  minAllowedTimestamp.setDate(minAllowedTimestamp.getDate() - 3);
  const parsedTimestamp = new Date(timestamp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSaving) return;
    if (isNaN(parsedTimestamp.getTime()) || parsedTimestamp > now || parsedTimestamp < minAllowedTimestamp) {
      setErrorWarning('Thời điểm thực hiện không hợp lệ - không được chọn tương lai hoặc quá 3 ngày trước.');
      return;
    }
    setErrorWarning(null);
    setIsSaving(true);
    try {
      await onSave({
        containerNo: containerNo.trim().toUpperCase(),
        line,
        size,
        operation,
        cargoStatus,
        subType: operation === 'dao_chuyen' ? subType || undefined : undefined,
        equipment: equipment || undefined,
        containerType: containerType || undefined,
        timestamp: parsedTimestamp.toISOString(),
        shift: getAutoShift(parsedTimestamp),
        notes: notes.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 relative text-slate-900">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3 mb-4">Sửa Lượt Chấm Công</h3>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-600">Số hiệu Container <span className="text-red-600">*</span></label>
            <input
              type="text"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value)}
              onBlur={() => setContainerNo((v) => v.trim().toUpperCase())}
              className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase text-slate-600">Thời điểm thực hiện <span className="text-red-600">*</span></label>
              {!isNaN(parsedTimestamp.getTime()) && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    getAutoShift(parsedTimestamp) === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {getAutoShift(parsedTimestamp) === 'day' ? 'Ca ngày' : 'Ca đêm'}
                </span>
              )}
            </div>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              value={timestamp ? dayjs(timestamp) : null}
              onChange={(date) => setTimestamp(date ? date.format('YYYY-MM-DDTHH:mm') : '')}
              disabledDate={(current) =>
                !!current && (current.isBefore(dayjs(minAllowedTimestamp), 'day') || current.isAfter(dayjs(now), 'day'))
              }
              allowClear={false}
              className="w-full !h-[38px] !rounded-lg !border-2 !border-slate-300"
            />
            <p className="text-[10px] text-slate-500">Chỉ chọn được trong 3 ngày gần nhất, không quá giờ hiện tại.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-600">Hãng tàu <span className="text-red-600">*</span></label>
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
              >
                {(shippingLines.includes(line) ? shippingLines : [line, ...shippingLines]).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-600">Kích thước <span className="text-red-600">*</span></label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
              >
                {sizes.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {containerTypes.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-600">Loại container <span className="text-red-600">*</span></label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
                >
                  {containerTypes.map((ct) => (
                    <option key={ct.code} value={ct.code}>{ct.label}</option>
                  ))}
                </select>
              </div>
            )}
            {equipmentTypes.length > 0 && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-600">Thiết bị sử dụng <span className="text-red-600">*</span></label>
                <select
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
                >
                  {equipmentTypes.map((eq) => (
                    <option key={eq.code} value={eq.code}>{eq.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-600">Loại tác nghiệp <span className="text-red-600">*</span></label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as OperationType)}
              className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
            >
              {operations.map((op) => (
                <option key={op.code} value={op.code}>{op.label}</option>
              ))}
            </select>
          </div>

          {operation === 'dao_chuyen' && daoChuyenSubtypes.length > 0 && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase text-slate-600">Phân loại đảo chuyển <span className="text-red-600">*</span></label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
              >
                {daoChuyenSubtypes.map((st) => (
                  <option key={st.code} value={st.code}>{st.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-600">Container rỗng / có hàng <span className="text-red-600">*</span></label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCargoStatus('hang')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 cursor-pointer ${cargoStatus === 'hang' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}
              >
                Có hàng
              </button>
              <button
                type="button"
                onClick={() => setCargoStatus('rong')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 cursor-pointer ${cargoStatus === 'rong' ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}
              >
                Rỗng
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase text-slate-600">Ghi chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-50"
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
