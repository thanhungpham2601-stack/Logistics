import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, Printer, Download, Plus, 
  Trash2, Edit, Calendar, Clock, Filter, 
  TrendingUp, Layers, Check, Search, X, 
  ChevronDown, RefreshCw, UserCheck, Anchor, Users
} from 'lucide-react';
import { JobEntry, Driver, ContainerSize, OperationType } from '../types';
import { SHIPPING_LINES, SHIFT_DRIVERS } from '../data/mockData';
import { formatDateTime, formatDateOnly, isJobInShift } from '../utils';

interface AccountantViewProps {
  jobs: JobEntry[];
  drivers: Driver[];
  onAddJob: (job: JobEntry) => void;
  onUpdateJob: (job: JobEntry) => void;
  onDeleteJob: (jobId: string) => void;
}

const OP_LIST: { key: OperationType; label: string; color: string }[] = [
  { key: 'nang_khach_hang', label: 'Nâng khách hàng', color: 'bg-emerald-500/10 text-emerald-600' },
  { key: 'ha_khach_hang', label: 'Hạ khách hàng', color: 'bg-blue-500/10 text-blue-600' },
  { key: 'nhap_tau', label: 'Nhập tàu', color: 'bg-indigo-500/10 text-indigo-600' },
  { key: 'xuat_tau', label: 'Xuất tàu', color: 'bg-purple-500/10 text-purple-600' },
  { key: 'chuyen_bai', label: 'Chuyển bãi', color: 'bg-teal-500/10 text-teal-600' },
  { key: 'dao_chuyen', label: 'Đảo chuyển', color: 'bg-orange-500/10 text-orange-600' },
];

const SIZE_LIST: ContainerSize[] = ['20', '20RF', '40', '40RF', '45', '45RF'];

export default function AccountantView({ 
  jobs, 
  drivers, 
  onAddJob, 
  onUpdateJob, 
  onDeleteJob 
}: AccountantViewProps) {
  // Filter states - Defaulting to matching the screenshot date and shift
  const [filterDate, setFilterDate] = useState('2026-07-20');
  const [filterShift, setFilterShift] = useState<'day' | 'night' | 'all'>('night');
  const [filterDriver, setFilterDriver] = useState<string>('1'); // Default to Vũ Xuân Tuyên
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create / Edit entry modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Form states
  const [formContainerNo, setFormContainerNo] = useState('');
  const [formDriverId, setFormDriverId] = useState('1');
  const [formLine, setFormLine] = useState('MAE/MSK');
  const [formSize, setFormSize] = useState<ContainerSize>('40');
  const [formOperation, setFormOperation] = useState<OperationType>('nang_khach_hang');
  const [formNotes, setFormNotes] = useState('');
  const [formTime, setFormTime] = useState('');

  // Apply filters
  const filteredJobs = jobs
    .filter(job => {
      // 1. Filter by Driver
      if (filterDriver !== 'all' && job.driverId !== filterDriver) return false;
      
      // 2. Filter by Shift / Date
      if (!isJobInShift(job.timestamp, filterDate, filterShift)) return false;
      
      // 3. Filter by Search Query (container no, line, notes)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesContainer = job.containerNo.toLowerCase().includes(query);
        const matchesLine = job.line.toLowerCase().includes(query);
        const matchesNotes = job.notes?.toLowerCase().includes(query);
        const matchesDriver = job.driverName.toLowerCase().includes(query);
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
    setFormDriverId(filterDriver !== 'all' ? filterDriver : '1');
    setFormLine('MAE/MSK');
    setFormSize('40');
    setFormOperation('nang_khach_hang');
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

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContainerNo.trim()) return;

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

    if (isEditing) {
      onUpdateJob(jobData);
    } else {
      onAddJob(jobData);
    }
    
    setShowModal(false);
  };

  // Helper to count specific operation & size
  const getSubColumnTotal = (op: OperationType, size: ContainerSize) => {
    return filteredJobs.filter(j => j.operation === op && j.size === size).length;
  };

  // Calculate Shift Subtitle
  const getShiftSubtitle = () => {
    const formattedDate = formatDateOnly(filterDate);
    
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

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'TT', 'Ngay', 'So hieu container', 'Lines', 'Size', 
      'Nang KH 20', 'Nang KH 20RF', 'Nang KH 40', 'Nang KH 40RF', 'Nang KH 45', 'Nang KH 45RF',
      'Ha KH 20', 'Ha KH 20RF', 'Ha KH 40', 'Ha KH 40RF', 'Ha KH 45', 'Ha KH 45RF',
      'Nhap tau 20', 'Nhap tau 20RF', 'Nhap tau 40', 'Nhap tau 40RF', 'Nhap tau 45', 'Nhap tau 45RF',
      'Xuat tau 20', 'Xuat tau 20RF', 'Xuat tau 40', 'Xuat tau 40RF', 'Xuat tau 45', 'Xuat tau 45RF',
      'Chuyen bai 20', 'Chuyen bai 20RF', 'Chuyen bai 40', 'Chuyen bai 40RF', 'Chuyen bai 45', 'Chuyen bai 45RF',
      'Dao chuyen 20', 'Dao chuyen 20RF', 'Dao chuyen 40', 'Dao chuyen 40RF', 'Dao chuyen 45', 'Dao chuyen 45RF',
      'Ghi chu'
    ];

    const rows = filteredJobs.map((job, idx) => {
      const formattedTime = formatDateTime(job.timestamp);
      const rowData = [
        idx + 1,
        formattedTime,
        job.containerNo,
        job.line,
        job.size,
      ];

      // Add operation checkmarks
      OP_LIST.forEach(op => {
        SIZE_LIST.forEach(size => {
          if (job.operation === op.key && job.size === size) {
            rowData.push('X');
          } else {
            rowData.push('');
          }
        });
      });

      rowData.push(job.notes || '');
      return rowData.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_Cao_Ca_Cuoi_Ngay_${filterDate}_${filterShift}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#f8fafc] text-slate-800">
      
      {/* Sidebar Navigation - Hidden in print / mobile */}
      <aside className="w-64 bg-[#0f172a] text-slate-100 flex flex-col justify-between hidden lg:flex shrink-0 no-print border-r border-slate-850">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">VẬN TẢI PRO</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ICD Hải Phòng</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center space-x-3 bg-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all text-left cursor-pointer">
              <FileSpreadsheet className="w-4.5 h-4.5 text-blue-400" />
              <span>Bảng Điều Khiển</span>
            </button>
            <button className="w-full flex items-center space-x-3 text-slate-450 hover:text-white font-bold text-xs px-4 py-3 rounded-xl hover:bg-slate-900/60 transition-all text-left cursor-pointer">
              <Clock className="w-4.5 h-4.5 text-slate-500" />
              <span>Lịch Sử Chấm Công</span>
            </button>
            <button className="w-full flex items-center space-x-3 text-slate-450 hover:text-white font-bold text-xs px-4 py-3 rounded-xl hover:bg-slate-900/60 transition-all text-left cursor-pointer">
              <Users className="w-4.5 h-4.5 text-slate-500" />
              <span>Danh Sách Tài Xế</span>
            </button>
            <button className="w-full flex items-center space-x-3 text-slate-450 hover:text-white font-bold text-xs px-4 py-3 rounded-xl hover:bg-slate-900/60 transition-all text-left cursor-pointer">
              <TrendingUp className="w-4.5 h-4.5 text-slate-500" />
              <span>Báo Cáo Kế Toán</span>
            </button>
          </nav>
        </div>

        {/* Profile Admin Badge at bottom of Sidebar */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/15 text-blue-400 flex items-center justify-center font-bold border border-blue-500/20 shadow-sm text-sm">
              KT
            </div>
            <div>
              <p className="text-xs font-black text-white leading-tight">Kế toán trưởng</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ban điều hành</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* 1. Header with Stats Dashboard */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Kế toán & Quản trị viên
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 flex items-center space-x-2">
                <FileSpreadsheet className="w-7 h-7 text-blue-600" />
                <span>Hệ Thống Quản Lý Báo Cáo Ca</span>
              </h1>
            </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm lượt mới</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải File Excel/CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Stats widgets */}
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
      </div>

      {/* 2. Filters bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4 no-print shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-black uppercase text-slate-500 tracking-wider">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Bộ Lọc Xem Báo Cáo:</span>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none"
          />
        </div>

        {/* Shift Filter */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-1 py-1 rounded-lg">
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

        {/* Driver Filter */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
          <UserCheck className="w-4 h-4 text-slate-500" />
          <select
            value={filterDriver}
            onChange={(e) => setFilterDriver(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả lái xe</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

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
              <thead>
                {/* 1st Header Row */}
                <tr className="bg-[#FFD966] text-black font-extrabold border-b border-black">
                  <th rowSpan={2} className="border-r border-black p-1 w-[40px] text-[11px]">TT</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[130px] text-[11px]">Ngày</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[120px] text-[11px]">Số hiệu container</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[100px] text-[11px]">Lines</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[40px] text-[11px]">Hãng</th>
                  <th rowSpan={2} className="border-r border-black p-1 w-[40px] text-[11px]">Size</th>
                  
                  {/* Operations Groups */}
                  <th colSpan={6} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">Nâng khách hàng</th>
                  <th colSpan={6} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">Hạ khách hàng</th>
                  <th colSpan={6} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">Nhập tàu</th>
                  <th colSpan={6} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">Xuất tàu</th>
                  <th colSpan={6} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">Chuyển bãi</th>
                  <th colSpan={6} className="border-r border-black p-1 text-[11px] bg-[#FFE599]">Đảo chuyển</th>
                  
                  <th rowSpan={2} className="p-1 w-[180px] text-[11px]">Ghi chú</th>
                  <th rowSpan={2} className="p-1 w-[80px] text-[11px] border-l border-black no-print">Thao tác</th>
                </tr>

                {/* 2nd Header Row (Sub-columns) */}
                <tr className="bg-[#FFF2CC] text-black font-bold border-b border-black">
                  {/* Loop 6 operations */}
                  {Array.from({ length: 6 }).map((_, opIdx) => (
                    <React.Fragment key={opIdx}>
                      {SIZE_LIST.map((size) => (
                        <th 
                          key={size} 
                          className="border-r border-black text-[9px] font-extrabold w-[34px] py-1 px-0 bg-[#FFF2CC]"
                        >
                          {size}
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-black text-black bg-white font-medium font-mono">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={44} className="py-12 text-center text-slate-400 font-sans italic">
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
                        {OP_LIST.map((opItem) => {
                          return SIZE_LIST.map((sizeItem) => {
                            const isMatched = job.operation === opItem.key && job.size === sizeItem;
                            return (
                              <td 
                                key={`${opItem.key}-${sizeItem}`} 
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
                            className="p-1 hover:bg-amber-100 text-amber-700 rounded transition-colors inline-block cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xoá công ${job.containerNo}?`)) {
                                onDeleteJob(job.id);
                              }
                            }}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors inline-block cursor-pointer"
                            title="Xoá dòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                  
                  {/* Sum counters for all 36 operation sub-columns */}
                  {OP_LIST.map((opItem) => {
                    return SIZE_LIST.map((sizeItem) => {
                      const colSum = getSubColumnTotal(opItem.key, sizeItem);
                      return (
                        <td key={`total-${opItem.key}-${sizeItem}`} className="border-r border-black font-black text-black">
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
                <p className="uppercase tracking-wider">ICD TÂN CẢNG HẢI PHÒNG</p>
                <p className="text-[10px] text-slate-500 font-normal italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <p className="text-sm font-extrabold italic text-slate-400">
                Chưa ký đóng dấu
              </p>
            </div>
          </div>

        </div>
      </div>

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
              {/* Container number */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Số hiệu Container *</label>
                <input
                  type="text"
                  value={formContainerNo}
                  onChange={(e) => setFormContainerNo(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: TRHU4320650"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
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
                    {SHIPPING_LINES.map(line => (
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
                    <option value="20">20</option>
                    <option value="20RF">20RF</option>
                    <option value="40">40</option>
                    <option value="40RF">40RF</option>
                    <option value="45">45</option>
                    <option value="45RF">45RF</option>
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
                  <option value="nang_khach_hang">Nâng khách hàng</option>
                  <option value="ha_khach_hang">Hạ khách hàng</option>
                  <option value="nhap_tau">Nhập tàu</option>
                  <option value="xuat_tau">Xuất tàu</option>
                  <option value="chuyen_bai">Chuyển bãi</option>
                  <option value="dao_chuyen">Đảo chuyển</option>
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
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
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
