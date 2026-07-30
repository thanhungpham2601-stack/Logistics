import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FileSpreadsheet, Printer, Download, Plus,
  Trash2, Edit, Filter,
  TrendingUp, Search, X,
  Anchor,
  Settings, LogOut, Calculator,
  ChevronsLeft, ChevronsRight, Menu, Loader2
} from 'lucide-react';
import { JobEntry, Driver, ContainerSize, OperationType, UserRole } from '../types';
import { formatDateTime, formatDateOnly, isJobInShift, isJobInDateRange, stripDiacritics } from '../utils';
import { ContainerSizeRow, OperationRateRow, OperationTypeRow } from '../lib/supabaseTypes';
import { Account, ConfigLists } from '../lib/api';
import { exportShiftReportToExcel } from '../lib/exportExcel';
import AccountingReportPanel from './AccountingReportPanel';
import AdminSettingsView from './AdminSettingsView';
import SearchableSelect from './SearchableSelect';
import DateRangePicker from './DateRangePicker';

interface AccountantViewProps {
  jobs: JobEntry[];
  drivers: Driver[];
  rates: OperationRateRow[];
  shippingLines: string[];
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  isAdmin: boolean;
  onAddJob: (job: JobEntry) => Promise<void>;
  onUpdateJob: (job: JobEntry) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onLogout: () => void;
  // Admin settings (only rendered when isAdmin)
  accounts: Account[];
  configLists: ConfigLists;
  onCreateAccount: (input: { username: string; fullName: string; role: UserRole; phone?: string; licenseNumber?: string }) => Promise<void>;
  onToggleAccountActive: (id: string, isActive: boolean) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onAddShippingLine: (code: string, name: string) => Promise<void>;
  onToggleShippingLine: (code: string, isActive: boolean) => Promise<void>;
  onAddContainerSize: (code: string, label: string) => Promise<void>;
  onToggleContainerSize: (code: string, isActive: boolean) => Promise<void>;
  onToggleOperationType: (code: string, isActive: boolean) => Promise<void>;
}

export default function AccountantView({
  jobs,
  drivers,
  rates,
  shippingLines,
  sizes,
  operations,
  isAdmin,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onLogout,
  accounts,
  configLists,
  onCreateAccount,
  onToggleAccountActive,
  onDeleteAccount,
  onAddShippingLine,
  onToggleShippingLine,
  onAddContainerSize,
  onToggleContainerSize,
  onToggleOperationType
}: AccountantViewProps) {
  // Filter states - Defaulting to matching the screenshot date and shift
  const [filterDate, setFilterDate] = useState('2026-07-20');
  const [filterToDate, setFilterToDate] = useState('2026-07-20'); // Khi khác filterDate -> chế độ xem khoảng ngày
  const [filterShift, setFilterShift] = useState<'day' | 'night' | 'all'>('night');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Mỗi tab có URL riêng: /accountant, /accountant/report, /accountant/settings
  const location = useLocation();
  const navigate = useNavigate();
  const urlTab: 'dashboard' | 'report' | 'settings' = location.pathname.endsWith('/settings')
    ? 'settings'
    : location.pathname.endsWith('/report')
    ? 'report'
    : 'dashboard';
  const activeTab = urlTab === 'settings' && !isAdmin ? 'dashboard' : urlTab;
  const setActiveTab = (tab: 'dashboard' | 'report' | 'settings') => {
    navigate(tab === 'dashboard' ? '/accountant' : `/accountant/${tab}`);
  };

  const isRangeMode = filterToDate !== filterDate;
  const driverOptions = [{ value: 'all', label: 'Tất cả lái xe' }, ...drivers.map((d) => ({ value: d.id, label: d.name }))];

  // Create / Edit entry modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Loading states cho thao tác thêm/sửa/xoá - chặn thao tác khác khi chưa xong
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const isMutating = isSavingJob || deletingJobId !== null;

  // Form states
  const [formContainerNo, setFormContainerNo] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formLine, setFormLine] = useState('');
  const [formSize, setFormSize] = useState<ContainerSize>('');
  const [formOperation, setFormOperation] = useState<OperationType>('nang_khach_hang');
  const [formNotes, setFormNotes] = useState('');
  const [formTime, setFormTime] = useState('');

  // Apply filters
  const filteredJobs = jobs
    .filter(job => {
      // 1. Filter by Driver
      if (filterDriver !== 'all' && job.driverId !== filterDriver) return false;
      
      // 2. Filter by Date: either a from-to range, or single-day shift
      if (isRangeMode) {
        if (!isJobInDateRange(job.timestamp, filterDate, filterToDate)) return false;
      } else {
        if (!isJobInShift(job.timestamp, filterDate, filterShift)) return false;
      }
      
      // 3. Filter by Search Query (container no, line, notes) - không phân biệt dấu
      if (searchQuery) {
        const query = stripDiacritics(searchQuery);
        const matchesContainer = stripDiacritics(job.containerNo).includes(query);
        const matchesLine = stripDiacritics(job.line).includes(query);
        const matchesNotes = job.notes ? stripDiacritics(job.notes).includes(query) : false;
        const matchesDriver = stripDiacritics(job.driverName).includes(query);
        if (!matchesContainer && !matchesLine && !matchesNotes && !matchesDriver) return false;
      }
      
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Ascending order like the sheet

  // Total container count
  const totalCount = filteredJobs.length;
  const count20s = filteredJobs.filter(j => j.size.startsWith('20')).length;
  const count40s = filteredJobs.filter(j => j.size.startsWith('40')).length;
  const count45s = filteredJobs.filter(j => j.size.startsWith('45')).length;

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormContainerNo('');
    setFormDriverId(filterDriver !== 'all' ? filterDriver : (drivers[0]?.id ?? ''));
    setFormLine(shippingLines[0] ?? '');
    setFormSize(sizes[0]?.code ?? '');
    setFormOperation(operations[0]?.code ?? 'nang_khach_hang');
    setFormNotes('');
    
    // Set default current date/time in local timezone for datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setFormTime(now.toISOString().slice(0, 16));
    
    setShowModal(true);
  };

  const handleOpenEditModal = (job: JobEntry) => {
    setIsEditing(true);
    setEditingJobId(job.id);
    setFormContainerNo(job.containerNo);
    setFormDriverId(job.driverId);
    setFormLine(job.line);
    setFormSize(job.size);
    setFormOperation(job.operation);
    setFormNotes(job.notes || '');
    
    // Format timestamp for datetime-local
    const jobDate = new Date(job.timestamp);
    jobDate.setMinutes(jobDate.getMinutes() - jobDate.getTimezoneOffset());
    setFormTime(jobDate.toISOString().slice(0, 16));
    
    setShowModal(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContainerNo.trim() || isMutating) return;

    const selectedDriverObj = drivers.find(d => d.id === formDriverId) || drivers[0];

    const jobData: JobEntry = {
      id: isEditing && editingJobId ? editingJobId : 'job-' + Date.now(),
      driverId: formDriverId,
      driverName: selectedDriverObj.name,
      timestamp: new Date(formTime).toISOString(),
      containerNo: formContainerNo.trim().toUpperCase(),
      line: formLine,
      size: formSize,
      operation: formOperation,
      notes: formNotes.trim()
    };

    setIsSavingJob(true);
    try {
      if (isEditing) {
        await onUpdateJob(jobData);
      } else {
        await onAddJob(jobData);
      }
      setShowModal(false);
    } finally {
      setIsSavingJob(false);
    }
  };

  // Helper to count specific operation & size
  const getSubColumnTotal = (op: OperationType, size: ContainerSize) => {
    return filteredJobs.filter(j => j.operation === op && j.size === size).length;
  };

  // Calculate Shift Subtitle
  const getShiftSubtitle = () => {
    const formattedDate = formatDateOnly(filterDate);

    if (isRangeMode) {
      return `Báo cáo từ ${formattedDate} đến ${formatDateOnly(filterToDate)}`;
    }

    // Split date to calculate previous day if night shift
    const fDateObj = new Date(filterDate);
    const prevDateObj = new Date(fDateObj);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const formattedPrevDate = formatDateOnly(prevDateObj.toISOString());

    if (filterShift === 'night') {
      return `Ca đêm 19:00 ${formattedPrevDate} - 07:00 ${formattedDate}`;
    } else if (filterShift === 'day') {
      return `Ca ngày 07:00 ${formattedDate} - 19:00 ${formattedDate}`;
    } else {
      return `Báo cáo cả ngày ${formattedDate}`;
    }
  };

  const getSelectedDriverName = () => {
    if (filterDriver === 'all') return 'Tất cả tài xế';
    return drivers.find(d => d.id === filterDriver)?.name || '';
  };

  // Export Excel (.xlsx) - \u0111\u1ECBnh d\u1EA1ng gi\u1ED1ng h\u1EC7t b\u1EA3ng hi\u1EC3n th\u1ECB tr\u00EAn web
  const [isExporting, setIsExporting] = useState(false);
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportShiftReportToExcel({
        jobs: filteredJobs,
        sizes,
        operations,
        subtitle: getShiftSubtitle(),
        driverLabel: getSelectedDriverName(),
        filenamePrefix: `Bao_Cao_Ca_${filterDate}_${isRangeMode ? filterToDate : filterShift}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#f8fafc] text-slate-800">
      
      {/* Backdrop cho menu di động (chỉ hiện dưới breakpoint lg) */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden no-print"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar Navigation - drawer trên di động/tablet, cố định trên desktop */}
      <aside
        className={`${mobileNavOpen ? 'flex' : 'hidden'} lg:flex flex-col justify-between fixed lg:static inset-y-0 left-0 z-50 w-64 ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } bg-[#0f172a] text-slate-100 shrink-0 no-print border-r border-slate-850 transition-all duration-200`}
      >
        <div className="p-4">
          <div className={`flex items-center mb-8 ${sidebarCollapsed ? 'flex-col space-y-2' : 'justify-between'}`}>
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'flex-col space-x-0 space-y-2' : ''}`}>
              <div className="p-2 bg-blue-600 rounded-xl shrink-0">
                <Anchor className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-sm font-black tracking-wider uppercase text-white">VẬN TẢI PRO</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ICD Cát Lái</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-900/60 rounded-lg cursor-pointer transition-colors shrink-0"
            >
              {sidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileNavOpen(false)}
              title="Đóng menu"
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-900/60 rounded-lg cursor-pointer transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileNavOpen(false); }}
              title="Bảng Điều Khiển"
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Bảng Điều Khiển</span>
            </button>
            <button
              onClick={() => { setActiveTab('report'); setMobileNavOpen(false); }}
              title="Báo Cáo Kế Toán"
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'report' ? 'bg-slate-800 text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Calculator className="w-4.5 h-4.5 text-slate-500 shrink-0" />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Báo Cáo Kế Toán</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('settings'); setMobileNavOpen(false); }}
                title="Thiết Lập Hệ Thống"
                className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                  sidebarCollapsed ? 'lg:justify-center' : ''
                } space-x-3 text-left ${
                  activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Settings className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Thiết Lập Hệ Thống</span>
              </button>
            )}
          </nav>
        </div>

        {/* Profile Admin Badge at bottom of Sidebar */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40">
          <div className={`flex items-center justify-between ${sidebarCollapsed ? 'lg:flex-col lg:space-y-2' : ''}`}>
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'lg:space-x-0' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-blue-600/15 text-blue-400 flex items-center justify-center font-bold border border-blue-500/20 shadow-sm text-sm shrink-0">
                {isAdmin ? 'AD' : 'KT'}
              </div>
              <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
                <p className="text-xs font-black text-white leading-tight">{isAdmin ? 'Quản trị viên' : 'Kế toán trưởng'}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ban điều hành</p>
              </div>
            </div>
            <button
              onClick={() => { onLogout(); setMobileNavOpen(false); }}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900/60 rounded-lg cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* 1. Header with Stats Dashboard */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <button
                onClick={() => setMobileNavOpen(true)}
                title="Mở menu"
                className="lg:hidden mb-2 -ml-1.5 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Kế toán & Quản trị viên
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 flex items-center space-x-2">
                {activeTab === 'settings' ? <Settings className="w-7 h-7 text-blue-600" /> : <FileSpreadsheet className="w-7 h-7 text-blue-600" />}
                <span>
                  {activeTab === 'settings' ? 'Thiết Lập Hệ Thống' : activeTab === 'report' ? 'Báo Cáo Kế Toán' : 'Hệ Thống Quản Lý Báo Cáo Ca'}
                </span>
              </h1>
            </div>

          {activeTab !== 'settings' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              disabled={isMutating}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm lượt mới</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo file...' : 'Tải Excel'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo Cáo</span>
            </button>
          </div>
          )}
        </div>

        {/* Dynamic Interactive Stats widgets */}
        {activeTab !== 'settings' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white to-[#f8fafc] p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tổng sản lượng ca</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{totalCount} công</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-[#f5fbf8] p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="block text-[10px] font-extrabold text-emerald-650 uppercase tracking-wider">Sản lượng size 20</span>
              <span className="text-2xl font-black text-emerald-900 font-mono mt-0.5 block">{count20s} công</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 font-black font-mono text-xs flex items-center justify-center border border-emerald-100/60 shadow-2xs">
              20'
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-[#f4f8fe] p-4 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="block text-[10px] font-extrabold text-blue-650 uppercase tracking-wider">Sản lượng size 40</span>
              <span className="text-2xl font-black text-blue-900 font-mono mt-0.5 block">{count40s} công</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black font-mono text-xs flex items-center justify-center border border-blue-100/60 shadow-2xs">
              40'
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-[#fefaf4] p-4 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="block text-[10px] font-extrabold text-amber-650 uppercase tracking-wider">Sản lượng size 45</span>
              <span className="text-2xl font-black text-amber-900 font-mono mt-0.5 block">{count45s} công</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 font-black font-mono text-xs flex items-center justify-center border border-amber-100/60 shadow-2xs">
              45'
            </div>
          </div>
        </div>
        )}
      </div>

      {/* 2. Filters bar */}
      {activeTab !== 'settings' && (
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4 no-print shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-black uppercase text-slate-500 tracking-wider">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Bộ Lọc Xem Báo Cáo:</span>
        </div>

        {/* Date Range Filter */}
        <DateRangePicker
          from={filterDate}
          to={filterToDate}
          onChange={(newFrom, newTo) => {
            setFilterDate(newFrom);
            setFilterToDate(newTo);
          }}
        />

        {/* Shift Filter - chỉ áp dụng khi xem đúng 1 ngày */}
        <div className={`flex items-center space-x-2 bg-slate-100 border border-slate-200 px-1 py-1 rounded-lg ${isRangeMode ? 'opacity-40 pointer-events-none' : ''}`}>
          <button
            onClick={() => setFilterShift('night')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              filterShift === 'night'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ca đêm (19h - 7h)
          </button>
          <button
            onClick={() => setFilterShift('day')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              filterShift === 'day'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ca ngày (7h - 19h)
          </button>
          <button
            onClick={() => setFilterShift('all')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
              filterShift === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cả ngày (24h)
          </button>
        </div>

        {/* Driver Filter with search */}
        <SearchableSelect
          options={driverOptions}
          value={filterDriver}
          onChange={setFilterDriver}
          placeholder="Tìm tài xế..."
          className="w-56"
        />

        {/* Text Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm nhanh (Số công, Hãng tàu, Ghi chú...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 focus:border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-bold focus:outline-none placeholder-slate-400 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      )}

      {activeTab === 'settings' ? (
        <AdminSettingsView
          accounts={accounts}
          configLists={configLists}
          onCreateAccount={onCreateAccount}
          onToggleAccountActive={onToggleAccountActive}
          onDeleteAccount={onDeleteAccount}
          onAddShippingLine={onAddShippingLine}
          onToggleShippingLine={onToggleShippingLine}
          onAddContainerSize={onAddContainerSize}
          onToggleContainerSize={onToggleContainerSize}
          onToggleOperationType={onToggleOperationType}
        />
      ) : activeTab === 'report' ? (
        <AccountingReportPanel jobs={filteredJobs} rates={rates} subtitle={getShiftSubtitle()} />
      ) : (
      <>
      {/* 3. The Report View (Matching the requested template) */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs min-w-[1200px] print:border-none print:shadow-none print:p-0">
          
          {/* Paper Title Header */}
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-black tracking-wide border-b-2 border-black inline-block pb-1 uppercase">
              Báo Cáo Theo Ca Cuối Ngày
            </h2>
            <p className="text-sm font-bold text-slate-800">
              {getShiftSubtitle()}
            </p>
            <p className="text-xs text-slate-600 font-semibold">
              Người thực hiện: <span className="underline font-bold text-slate-900">{getSelectedDriverName()}</span>
            </p>
          </div>

          {/* Grid Container Table */}
          <div className="overflow-x-auto border border-black max-w-full">
            <table className="w-full text-center text-xs border-collapse table-fixed select-all">
              <colgroup>
                <col className="w-[40px]" />
                <col className="w-[130px]" />
                <col className="w-[120px]" />
                <col className="w-[100px]" />
                <col className="w-[40px]" />
                <col className="w-[40px]" />
                {Array.from({ length: sizes.length * operations.length }).map((_, i) => (
                  <col key={i} className="w-[44px]" />
                ))}
                <col className="w-[180px]" />
                <col className="w-[80px]" />
              </colgroup>
              <thead>
                {/* 1st Header Row */}
                <tr className="bg-[#FFD966] text-black font-extrabold border-b border-black">
                  <th rowSpan={2} className="border-r border-black p-1 w-[40px] text-[11px]">TT</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[130px] text-[11px]">Ngày</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[120px] text-[11px]">Số hiệu container</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[100px] text-[11px]">Lines</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[40px] text-[11px]">Hãng</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[40px] text-[11px]">Size</th>

                  {/* Operations Groups - lấy từ Thiết Lập Hệ Thống */}
                  {operations.map((op) => (
                    <th key={op.code} colSpan={sizes.length} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">
                      {op.label}
                    </th>
                  ))}

                  <th rowSpan={2} className="p-1 w-[180px] text-[11px]">Ghi chú</th>
                  <th rowSpan={2} className="p-1 w-[80px] text-[11px] border-l border-black no-print">Thao tác</th>
                </tr>

                {/* 2nd Header Row (Sub-columns) */}
                <tr className="bg-[#FFF2CC] text-black font-bold border-b border-black">
                  {operations.map((op) => (
                    <React.Fragment key={op.code}>
                      {sizes.map((size) => (
                        <th
                          key={`${op.code}-${size.code}`}
                          className="border-r border-black text-[9px] font-extrabold py-1 px-0 bg-[#FFF2CC] overflow-hidden whitespace-nowrap"
                        >
                          {size.label}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-black text-black bg-white font-medium font-mono">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6 + sizes.length * operations.length + 2} className="py-12 text-center text-slate-400 font-sans italic">
                      Không tìm thấy dữ liệu chấm công cho bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, idx) => {
                    return (
                      <tr key={job.id} className="hover:bg-slate-50 border-b border-black h-8">
                        {/* Static Columns */}
                        <td className="border-r border-black font-sans font-bold">{idx + 1}</td>
                        <td className="border-r border-black text-[10px] text-slate-800 tracking-tighter">
                          {formatDateTime(job.timestamp).split(' ')[0]} <span className="text-[9px] text-slate-500">{formatDateTime(job.timestamp).split(' ')[1]}</span>
                        </td>
                        <td className="border-r border-black font-bold tracking-wider text-[11px]">{job.containerNo}</td>
                        <td className="border-r border-black text-[10px] text-slate-700">{job.line}</td>
                        <td className="border-r border-black"></td> {/* Empty 'Hãng' column matching image */}
                        <td className="border-r border-black font-bold text-[11px]">{job.size.replace('RF', '')}</td>

                        {/* Dynamic Sub-columns checkmarks */}
                        {operations.map((op) => {
                          return sizes.map((size) => {
                            const isMatched = job.operation === op.code && job.size === size.code;
                            return (
                              <td
                                key={`${op.code}-${size.code}`}
                                className={`border-r border-black text-[11px] font-black font-sans ${isMatched ? 'bg-amber-100/50' : ''}`}
                              >
                                {isMatched ? 'X' : ''}
                              </td>
                            );
                          });
                        })}

                        {/* Notes Column */}
                        <td className="text-left px-2 font-sans text-[11px] text-slate-800 whitespace-nowrap truncate max-w-[180px]" title={job.notes}>
                          {job.notes}
                        </td>

                        {/* Interactive Edit/Delete Actions (Hidden in Print) */}
                        <td className="border-l border-black p-1 text-center space-x-1 no-print font-sans">
                          <button
                            onClick={() => handleOpenEditModal(job)}
                            disabled={isMutating}
                            className="p-1 hover:bg-amber-100 text-amber-700 rounded transition-colors inline-block cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Sửa thông tin"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (isMutating) return;
                              if (confirm(`Bạn có chắc muốn xoá công ${job.containerNo}?`)) {
                                setDeletingJobId(job.id);
                                try {
                                  await onDeleteJob(job.id);
                                } finally {
                                  setDeletingJobId(null);
                                }
                              }
                            }}
                            disabled={isMutating}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors inline-block cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Xoá dòng"
                          >
                            {deletingJobId === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* TỔNG CỘNG ROW (Exact match of totals at bottom) */}
                <tr className="bg-[#F2F2F2] font-extrabold border-t-2 border-b-2 border-black h-8 text-[11px] font-sans">
                  <td colSpan={6} className="border-r border-black text-right pr-4 font-black">
                    Tổng cộng
                  </td>

                  {/* Sum counters for tất cả cột con operation x size */}
                  {operations.map((op) => {
                    return sizes.map((size) => {
                      const colSum = getSubColumnTotal(op.code, size.code);
                      return (
                        <td key={`total-${op.code}-${size.code}`} className="border-r border-black font-black text-black">
                          {colSum > 0 ? colSum : ''}
                        </td>
                      );
                    });
                  })}

                  <td className="border-black"></td> {/* Notes placeholder */}
                  <td className="border-l border-black no-print"></td> {/* Actions placeholder */}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Signatures Block */}
          <div className="grid grid-cols-2 mt-12 text-center text-xs font-bold font-sans">
            <div className="space-y-16">
              <div>
                <p className="uppercase tracking-wider">Lái xe</p>
                <p className="text-[10px] text-slate-500 font-normal italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <p className="text-sm font-extrabold underline text-slate-950">
                {filterDriver !== 'all' ? getSelectedDriverName() : '...................................................'}
              </p>
            </div>

            <div className="space-y-16">
              <div>
                <p className="uppercase tracking-wider">ICD CÁT LÁI</p>
                <p className="text-[10px] text-slate-500 font-normal italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <p className="text-sm font-extrabold italic text-slate-400">
                Chưa ký đóng dấu
              </p>
            </div>
          </div>

        </div>
      </div>
      </>
      )}

      {/* 4. Accountant/Admin Add & Edit Dialog (Modal) */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">
              {isEditing ? 'Sửa Lượt Chấm Công' : 'Thêm Lượt Chấm Công Mới (Admin/Kế toán)'}
            </h3>

            <form onSubmit={handleSaveJob} className="space-y-4">
              {/* Container number - không ép định dạng khi đang gõ để tránh vỡ IME tiếng Việt */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Số hiệu Container *</label>
                <input
                  type="text"
                  value={formContainerNo}
                  onChange={(e) => setFormContainerNo(e.target.value)}
                  onBlur={() => setFormContainerNo((v) => v.trim().toUpperCase())}
                  placeholder="Ví dụ: TRHU4320650"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500">Đúng chuẩn: 4 chữ cái + 7 chữ số, ví dụ <span className="font-mono font-bold">TRHU4320650</span></p>
              </div>

              {/* Driver */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Lái xe thực hiện *</label>
                <select
                  value={formDriverId}
                  onChange={(e) => setFormDriverId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Line and Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Hãng Tàu *</label>
                  <select
                    value={formLine}
                    onChange={(e) => setFormLine(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                  >
                    {shippingLines.map(line => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Kích Thước *</label>
                  <select
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value as ContainerSize)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                  >
                    {sizes.map((s) => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Operation type */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Loại tác nghiệp *</label>
                <select
                  value={formOperation}
                  onChange={(e) => setFormOperation(e.target.value as OperationType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                >
                  {operations.map((op) => (
                    <option key={op.code} value={op.code}>{op.label}</option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Thời gian thực hiện *</label>
                <input
                  type="datetime-local"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Ghi chú</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú chi tiết (ví dụ: Đảo chuyển hầm tàu...)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSavingJob}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingJob}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {isSavingJob && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSavingJob ? (isEditing ? 'Đang cập nhật...' : 'Đang thêm...') : (isEditing ? 'Cập nhật' : 'Thêm mới')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div> {/* Close Main Content Workspace Area */}
    </div>
  );
}
