import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  FileSpreadsheet, Printer, Download, Plus,
  Trash2, Edit,
  TrendingUp, Search, X,
  Anchor,
  Settings, LogOut, Calculator,
  ChevronsLeft, ChevronsRight, Menu, Loader2,
  ArrowUpDown, Repeat, Users, ChevronLeft, ChevronRight, ChevronDown,
  LayoutDashboard, Database, AlertTriangle
} from 'lucide-react';
import { JobEntry, Driver, ContainerSize, OperationType, UserRole } from '../types';
import { formatDateTime, formatDateOnly, isJobInShift, isJobInDateRange, stripDiacritics, getShiftUtcRange, getDateRangeUtc, todayVN, getAutoShift, cleanContainerNo, cleanPastedContainerNo, formatJobNotesDisplay, findDuplicateJob } from '../utils';
import { ContainerSizeRow, OperationRateRow, OperationTypeRow, ReconciliationReportType, ReportReconciliationRow } from '../lib/supabaseTypes';
import { Account, ConfigLists, fetchJobsPage, fetchReconciliations, upsertReconciliation } from '../lib/api';
import { exportShiftReportToExcel } from '../lib/exportExcel';
import { SummaryColumnBlock, SummaryRowGroup } from '../lib/reportMatrix';
import AccountingReportPanel from './AccountingReportPanel';
import AdminSettingsView from './AdminSettingsView';
import OperationSummaryReport from './OperationSummaryReport';
import DriverProductionReport from './DriverProductionReport';
import SearchableSelect from './SearchableSelect';
import DateRangePicker from './DateRangePicker';
import ThemePicker from './ThemePicker';
import DashboardOverview from './DashboardOverview';
import { ThemeName, getStoredTheme } from '../lib/theme';

interface AccountantViewProps {
  jobs: JobEntry[];
  onRefreshJobs: () => Promise<void>;
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
  onCreateAccount: (input: { username: string; fullName: string; role: UserRole; phone?: string; licenseNumber?: string; email?: string }) => Promise<Account>;
  onToggleAccountActive: (id: string, isActive: boolean) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onUpdateAccountEmail: (id: string, email: string) => Promise<void>;
  onSetDriverPin: (accountId: string, pin: string) => Promise<void>;
  onAddShippingLine: (code: string, name: string) => Promise<void>;
  onToggleShippingLine: (code: string, isActive: boolean) => Promise<void>;
  onAddContainerSize: (code: string, label: string) => Promise<void>;
  onToggleContainerSize: (code: string, isActive: boolean) => Promise<void>;
  onToggleOperationType: (code: string, isActive: boolean) => Promise<void>;
  onAddOperationType: (code: string, label: string) => Promise<void>;
  onAddDaoChuyenSubtype: (code: string, label: string) => Promise<void>;
  onToggleDaoChuyenSubtype: (code: string, isActive: boolean) => Promise<void>;
  onAddDaoChuyenNote: (code: string, label: string, subtypeCode: string) => Promise<void>;
  onToggleDaoChuyenNote: (code: string, isActive: boolean) => Promise<void>;
  onAddEquipmentType: (code: string, label: string) => Promise<void>;
  onToggleEquipmentType: (code: string, isActive: boolean) => Promise<void>;
  onAddContainerType: (code: string, label: string) => Promise<void>;
  onToggleContainerType: (code: string, isActive: boolean) => Promise<void>;
  onAddNotePreset: (label: string) => Promise<void>;
  onToggleNotePreset: (id: string, isActive: boolean) => Promise<void>;
  onDeleteNotePreset: (id: string) => Promise<void>;
}

export default function AccountantView({
  jobs,
  onRefreshJobs,
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
  onUpdateAccountEmail,
  onSetDriverPin,
  onAddShippingLine,
  onToggleShippingLine,
  onAddContainerSize,
  onToggleContainerSize,
  onToggleOperationType,
  onAddOperationType,
  onAddDaoChuyenSubtype,
  onToggleDaoChuyenSubtype,
  onAddDaoChuyenNote,
  onToggleDaoChuyenNote,
  onAddEquipmentType,
  onToggleEquipmentType,
  onAddContainerType,
  onToggleContainerType,
  onAddNotePreset,
  onToggleNotePreset,
  onDeleteNotePreset
}: AccountantViewProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(getStoredTheme());

  // Mỗi tab có URL riêng: /accountant/tong-quan (mặc định), /accountant/danh-sach-san-luong, /accountant/report,
  // /accountant/theo-tai-xe, /accountant/nang-ha, /accountant/dao-chuyen, /accountant/settings/nguoi-dung,
  // /accountant/settings/master-data. "Thiết Lập Hệ Thống" tách thành 2 sub-menu (Người Dùng / Master Data) -
  // mỗi cái có link riêng để có thể vào thẳng/bookmark, thay vì gộp chung 1 route rồi chuyển tab trong trang.
  type AccountantTab = 'overview' | 'dashboard' | 'report' | 'driver' | 'nang_ha' | 'dao_chuyen' | 'settings_users' | 'settings_master';
  const location = useLocation();
  const navigate = useNavigate();
  const urlTab: AccountantTab = location.pathname.endsWith('/settings/master-data')
    ? 'settings_master'
    : location.pathname.endsWith('/settings') || location.pathname.endsWith('/settings/nguoi-dung')
    ? 'settings_users'
    : location.pathname.endsWith('/danh-sach-san-luong')
    ? 'dashboard'
    : location.pathname.endsWith('/report')
    ? 'report'
    : location.pathname.endsWith('/theo-tai-xe')
    ? 'driver'
    : location.pathname.endsWith('/nang-ha')
    ? 'nang_ha'
    : location.pathname.endsWith('/dao-chuyen')
    ? 'dao_chuyen'
    : 'overview';
  const isSettingsTab = urlTab === 'settings_users' || urlTab === 'settings_master';
  const activeTab = isSettingsTab && !isAdmin ? 'overview' : urlTab;

  // "Thiết Lập Hệ Thống" là menu xổ (accordion) - 2 sub-menu chỉ hiện khi bấm mở, và tự mở sẵn
  // nếu đang đứng ở 1 trong 2 trang con đó (vd: vào thẳng bằng link/bookmark).
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(isSettingsTab);
  useEffect(() => {
    if (isSettingsTab) setSettingsMenuOpen(true);
  }, [isSettingsTab]);

  // Mỗi tab giữ ô tìm kiếm riêng - gõ tìm kiếm ở báo cáo này không được ảnh hưởng đến báo cáo khác.
  const [searchQueries, setSearchQueries] = useState<Record<AccountantTab, string>>({
    overview: '',
    dashboard: '',
    report: '',
    driver: '',
    nang_ha: '',
    dao_chuyen: '',
    settings_users: '',
    settings_master: '',
  });
  const searchQuery = searchQueries[activeTab];
  const setSearchQuery = (value: string) => setSearchQueries((prev) => ({ ...prev, [activeTab]: value }));

  // Mỗi tab giữ bộ lọc ngày/ca/tài xế riêng - đổi bộ lọc ở báo cáo này không được ảnh hưởng đến
  // báo cáo khác (trước đây dùng chung 1 bộ lọc nên đổi tài xế/ngày/ca ở 1 báo cáo là 3 báo cáo
  // tổng hợp còn lại cũng đổi theo, gây nhầm lẫn).
  interface TabFilterState {
    date: string;
    toDate: string;
    shift: 'day' | 'night';
    driver: string;
  }
  const makeDefaultFilters = (): TabFilterState => ({ date: todayVN(), toDate: todayVN(), shift: 'night', driver: 'all' });
  const [tabFilters, setTabFilters] = useState<Record<AccountantTab, TabFilterState>>({
    overview: makeDefaultFilters(),
    dashboard: makeDefaultFilters(),
    report: makeDefaultFilters(),
    driver: makeDefaultFilters(),
    nang_ha: makeDefaultFilters(),
    dao_chuyen: makeDefaultFilters(),
    settings_users: makeDefaultFilters(),
    settings_master: makeDefaultFilters(),
  });
  const currentFilters = tabFilters[activeTab];
  const filterDate = currentFilters.date;
  const filterToDate = currentFilters.toDate;
  const filterShift = currentFilters.shift;
  const filterDriver = currentFilters.driver;
  const setFilterDate = (value: string) =>
    setTabFilters((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], date: value } }));
  const setFilterToDate = (value: string) =>
    setTabFilters((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], toDate: value } }));
  const setFilterShift = (value: 'day' | 'night') =>
    setTabFilters((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], shift: value } }));
  const setFilterDriver = (value: string) =>
    setTabFilters((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], driver: value } }));

  const setActiveTab = (tab: AccountantTab) => {
    const path: Record<AccountantTab, string> = {
      overview: '/accountant/tong-quan',
      dashboard: '/accountant/danh-sach-san-luong',
      report: '/accountant/report',
      driver: '/accountant/theo-tai-xe',
      nang_ha: '/accountant/nang-ha',
      dao_chuyen: '/accountant/dao-chuyen',
      settings_users: '/accountant/settings/nguoi-dung',
      settings_master: '/accountant/settings/master-data',
    };
    navigate(path[tab]);
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
  const [formCargoStatus, setFormCargoStatus] = useState<'rong' | 'hang'>('rong');
  const [formDaoChuyenNoteCode, setFormDaoChuyenNoteCode] = useState<string>('');
  const [formEquipment, setFormEquipment] = useState<string>('');
  const [formContainerType, setFormContainerType] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formErrorWarning, setFormErrorWarning] = useState<string | null>(null);

  // Cảnh báo tự tắt sau vài giây, không giữ mãi trên màn hình.
  useEffect(() => {
    if (!formErrorWarning) return;
    const timer = setTimeout(() => setFormErrorWarning(null), 5000);
    return () => clearTimeout(timer);
  }, [formErrorWarning]);

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

  // ===================== Phân trang Danh Sách Sản Lượng (20 dòng/trang) =====================
  // Khi KHÔNG có từ khoá tìm kiếm: gọi API tải đúng 1 trang (.range) mỗi khi đổi trang/bộ lọc.
  // Khi CÓ từ khoá tìm kiếm: filteredJobs (đã lọc theo search không phân biệt dấu ở client)
  // đóng vai trò tập kết quả, phân trang ngay trên tập đó - tránh phải đẩy logic tìm kiếm
  // không phân biệt dấu xuống SQL.
  const DASHBOARD_PAGE_SIZE = 20;
  const [dashboardPage, setDashboardPage] = useState(0);
  const [pagedJobs, setPagedJobs] = useState<JobEntry[]>([]);
  const [pagedTotal, setPagedTotal] = useState(0);
  const [pagedLoading, setPagedLoading] = useState(false);

  useEffect(() => {
    setDashboardPage(0);
  }, [filterDate, filterToDate, filterShift, filterDriver, searchQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || searchQuery) return;
    let cancelled = false;
    setPagedLoading(true);
    const range = isRangeMode ? getDateRangeUtc(filterDate, filterToDate) : getShiftUtcRange(filterDate, filterShift);
    fetchJobsPage({ from: range.from, to: range.to, driverId: filterDriver, page: dashboardPage, pageSize: DASHBOARD_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setPagedJobs(res.jobs);
        setPagedTotal(res.total);
        const maxPage = Math.max(0, Math.ceil(res.total / DASHBOARD_PAGE_SIZE) - 1);
        if (dashboardPage > maxPage) setDashboardPage(maxPage);
      })
      .finally(() => {
        if (!cancelled) setPagedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, searchQuery, isRangeMode, filterDate, filterToDate, filterShift, filterDriver, dashboardPage, jobs]);

  // Bảng danh sách sản lượng ở trên lấy dữ liệu trực tiếp từ Supabase mỗi khi đổi trang/bộ lọc
  // (luôn mới nhất). Nhưng dòng "Tổng cộng" và các báo cáo tổng hợp khác (Theo tài xế, Nâng/Hạ,
  // Đảo chuyển...) đều tính từ "jobs" - danh sách dùng chung của cả app, chỉ được làm mới khi
  // CHÍNH tab này thêm/sửa/xoá 1 lượt (xem refreshJobs() ở App.tsx). Nếu dữ liệu mới được thêm
  // từ nơi khác (tài xế trên iPad, hoặc 1 tab kế toán khác), "jobs" ở đây bị lệch cho tới khi F5 -
  // nên mỗi khi đổi trang/bộ lọc ở màn này, chủ động làm mới luôn "jobs" để Tổng cộng/báo cáo tổng
  // hợp không bị lệch so với bảng chi tiết. Cố tình KHÔNG đưa "jobs" vào dependency (chỉ đổi
  // trang/bộ lọc mới gọi) để tránh vòng lặp: refresh -> jobs đổi -> effect này chạy lại -> refresh...
  useEffect(() => {
    if (activeTab !== 'dashboard' || searchQuery) return;
    onRefreshJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery, isRangeMode, filterDate, filterToDate, filterShift, filterDriver, dashboardPage]);

  const dashboardRows = searchQuery
    ? filteredJobs.slice(dashboardPage * DASHBOARD_PAGE_SIZE, dashboardPage * DASHBOARD_PAGE_SIZE + DASHBOARD_PAGE_SIZE)
    : pagedJobs;
  const dashboardTotal = searchQuery ? filteredJobs.length : pagedTotal;
  const dashboardTotalPages = Math.max(1, Math.ceil(dashboardTotal / DASHBOARD_PAGE_SIZE));

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
    setFormCargoStatus('rong');
    setFormDaoChuyenNoteCode(configLists.daoChuyenNotes[0]?.code ?? '');
    setFormEquipment(configLists.equipmentTypes[0]?.code ?? '');
    setFormContainerType(configLists.containerTypes[0]?.code ?? '');
    setFormNotes('');
    setFormErrorWarning(null);

    // Set default current date/time in local timezone for datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setFormTime(now.toISOString().slice(0, 16));

    setShowModal(true);
  };

  const handleOpenEditModal = (job: JobEntry) => {
    setIsEditing(true);
    setFormErrorWarning(null);
    setEditingJobId(job.id);
    setFormContainerNo(job.containerNo);
    setFormDriverId(job.driverId);
    setFormLine(job.line);
    setFormSize(job.size);
    setFormOperation(job.operation);
    setFormCargoStatus(job.cargoStatus);
    setFormDaoChuyenNoteCode(
      configLists.daoChuyenNotes.find((n) => n.label === job.notes)?.code
        ?? configLists.daoChuyenNotes.find((n) => n.subtype_code === job.subType)?.code
        ?? configLists.daoChuyenNotes[0]?.code
        ?? ''
    );
    setFormEquipment(job.equipment ?? configLists.equipmentTypes[0]?.code ?? '');
    setFormContainerType(job.containerType ?? configLists.containerTypes[0]?.code ?? '');
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
    const selectedDaoChuyenNote = configLists.daoChuyenNotes.find((n) => n.code === formDaoChuyenNoteCode);

    const jobData: JobEntry = {
      id: isEditing && editingJobId ? editingJobId : 'job-' + Date.now(),
      driverId: formDriverId,
      driverName: selectedDriverObj.name,
      timestamp: new Date(formTime).toISOString(),
      // Ca làm việc tự suy ra từ thời gian thực hiện - không cho chọn tay riêng để tránh lệch
      // (vd: chọn "ca ngày" nhưng thời gian ghi lại là ban đêm).
      shift: getAutoShift(new Date(formTime)),
      containerNo: cleanContainerNo(formContainerNo),
      line: formLine,
      size: formSize,
      operation: formOperation,
      cargoStatus: formCargoStatus,
      subType: formOperation === 'dao_chuyen' ? selectedDaoChuyenNote?.subtype_code : undefined,
      equipment: formEquipment || undefined,
      containerType: formContainerType || undefined,
      notes: formOperation === 'dao_chuyen' ? (selectedDaoChuyenNote?.label ?? '') : formNotes.trim()
    };

    // Chặn trùng lượt: cùng tài xế + cùng ca + cùng container + cùng tác nghiệp. Khác ca thì
    // không tính trùng.
    const duplicate = findDuplicateJob(
      jobs,
      { driverId: jobData.driverId, containerNo: jobData.containerNo, operation: jobData.operation, timestamp: jobData.timestamp, shift: jobData.shift },
      isEditing ? editingJobId ?? undefined : undefined
    );
    if (duplicate) {
      const opLabel = operations.find((o) => o.code === jobData.operation)?.label ?? jobData.operation;
      setFormErrorWarning(
        `Đã có 1 lượt "${opLabel}" cho container ${jobData.containerNo} của ${jobData.driverName} trong ca này (lúc ${formatDateTime(duplicate.timestamp)}) - không thể lưu trùng.`
      );
      return;
    }
    setFormErrorWarning(null);

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

    // Ca đêm bắt đầu tối filterDate, kết thúc sáng ngày kế tiếp.
    // Neo vào 12:00 UTC (= 19:00 giờ VN) để cộng ngày an toàn, tránh lệch múi giờ.
    const nextDateObj = new Date(`${filterDate}T12:00:00Z`);
    nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);
    const formattedNextDate = formatDateOnly(nextDateObj.toISOString());

    if (filterShift === 'night') {
      return `Ca đêm 19:00 ${formattedDate} - 07:00 ${formattedNextDate}`;
    }
    return `Ca ngày 07:00 ${formattedDate} - 19:00 ${formattedDate}`;
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

  // ===================== Báo cáo tổng hợp Nâng/Hạ & Đảo chuyển =====================
  const periodFrom = filterDate;
  const periodTo = isRangeMode ? filterToDate : filterDate;

  const [reconciliations, setReconciliations] = useState<ReportReconciliationRow[]>([]);
  useEffect(() => {
    if (activeTab !== 'nang_ha' && activeTab !== 'dao_chuyen') return;
    // Xoá ngay dữ liệu đối soát cũ trước khi fetch - tránh thoáng hiện nhầm số của report
    // khác (hoặc kỳ báo cáo khác) trong lúc chờ query mới trả về.
    setReconciliations([]);
    let cancelled = false;
    fetchReconciliations(activeTab, periodFrom, periodTo).then((data) => {
      if (!cancelled) setReconciliations(data);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, periodFrom, periodTo]);

  const handleSaveReconciliation = async (lineCode: string, confirmedQty: number | null) => {
    const reportType = activeTab as ReconciliationReportType;
    await upsertReconciliation({ reportType, lineCode, periodFrom, periodTo, confirmedQty });
    setReconciliations(await fetchReconciliations(reportType, periodFrom, periodTo));
  };

  const nangHaRowGroups: SummaryRowGroup[] = [
    { key: 'ha', label: 'HẠ', matches: (j) => j.operation === 'ha_khach_hang' },
    { key: 'nang', label: 'NÂNG', matches: (j) => j.operation === 'nang_khach_hang' },
    { key: 'xuat_nhap', label: 'XUẤT TÀU/NHẬP TÀU', matches: (j) => j.operation === 'xuat_tau' || j.operation === 'nhap_tau' },
  ];
  const nangHaBlocks: SummaryColumnBlock[] = [{ key: 'all', label: '' }];

  const daoChuyenSubtypesActive = configLists.daoChuyenSubtypes.filter((s) => s.is_active);
  const hasUnclassifiedDaoChuyen = filteredJobs.some((j) => j.operation === 'dao_chuyen' && !j.subType);
  const daoChuyenRowGroups: SummaryRowGroup[] = [
    ...daoChuyenSubtypesActive.map((st) => ({
      key: st.code,
      label: st.label,
      matches: (j: JobEntry) => j.operation === 'dao_chuyen' && j.subType === st.code,
    })),
    ...(hasUnclassifiedDaoChuyen
      ? [{ key: 'unclassified', label: 'Chưa phân loại', matches: (j: JobEntry) => j.operation === 'dao_chuyen' && !j.subType }]
      : []),
  ];
  const daoChuyenBlocks: SummaryColumnBlock[] = [
    { key: 'rong', label: 'Container rỗng', cargoStatus: 'rong' },
    { key: 'hang', label: 'Container hàng', cargoStatus: 'hang' },
  ];

  // Ô "Tìm kiếm nhanh" cũng lọc luôn danh sách hãng tàu/tài xế hiển thị trên các báo cáo
  // tổng hợp - nếu chỉ lọc jobs thì các dòng hãng tàu/tài xế không khớp vẫn hiện ra (rỗng số liệu),
  // gây cảm giác "tìm kiếm không có tác dụng".
  // Một dòng (hãng tàu/tài xế) được giữ lại nếu: tự nó khớp từ khoá, HOẶC nó có ít nhất 1 lượt
  // chấm công nằm trong filteredJobs (vì searchQuery đã tìm rộng theo container/hãng tàu/ghi
  // chú/tên tài xế ở filteredJobs - ví dụ gõ "MSK" phải vẫn hiện tài xế có lượt chở hãng MSK).
  const searchTerm = stripDiacritics(searchQuery);
  const lineCodesInFilteredJobs = new Set(filteredJobs.map((j) => j.line));
  const driverIdsInFilteredJobs = new Set(filteredJobs.map((j) => j.driverId));
  const reportLines = searchTerm
    ? shippingLines.filter((l) => lineCodesInFilteredJobs.has(l) || stripDiacritics(l).includes(searchTerm))
    : shippingLines;
  const reportDrivers = drivers.filter(
    (d) =>
      (filterDriver === 'all' || d.id === filterDriver) &&
      (!searchTerm || driverIdsInFilteredJobs.has(d.id) || stripDiacritics(d.name).includes(searchTerm))
  );

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
              <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }}>
                <Anchor className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-sm font-black tracking-wider uppercase text-white">VẬN TẢI PRO</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ICD AN GIA</p>
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
              onClick={() => { setActiveTab('overview'); setMobileNavOpen(false); }}
              title="Tổng Quan"
              style={activeTab === 'overview' ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 30%, #1e293b)' } : undefined}
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'overview' ? 'text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5 shrink-0" style={{ color: activeTab === 'overview' ? 'var(--theme-accent-text)' : undefined }} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Tổng Quan</span>
            </button>
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileNavOpen(false); }}
              title="Danh Sách Sản Lượng"
              style={activeTab === 'dashboard' ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 30%, #1e293b)' } : undefined}
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'dashboard' ? 'text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5 shrink-0" style={{ color: activeTab === 'dashboard' ? 'var(--theme-accent-text)' : undefined }} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Danh Sách Sản Lượng</span>
            </button>
            {/* Tạm ẩn menu "Báo Cáo Kế Toán" theo yêu cầu - route /accountant/report vẫn hoạt động
                bình thường nếu truy cập trực tiếp, chỉ ẩn mục điều hướng này. */}
            {false && (
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
            )}
            <button
              onClick={() => { setActiveTab('driver'); setMobileNavOpen(false); }}
              title="Báo Cáo Theo Tài Xế"
              style={activeTab === 'driver' ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 30%, #1e293b)' } : undefined}
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'driver' ? 'text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Users className="w-4.5 h-4.5 shrink-0" style={{ color: activeTab === 'driver' ? 'var(--theme-accent-text)' : undefined }} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Báo Cáo Theo Tài Xế</span>
            </button>
            <button
              onClick={() => { setActiveTab('nang_ha'); setMobileNavOpen(false); }}
              title="Báo Cáo Nâng/Hạ"
              style={activeTab === 'nang_ha' ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 30%, #1e293b)' } : undefined}
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'nang_ha' ? 'text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <ArrowUpDown className="w-4.5 h-4.5 shrink-0" style={{ color: activeTab === 'nang_ha' ? 'var(--theme-accent-text)' : undefined }} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Báo Cáo Nâng/Hạ</span>
            </button>
            <button
              onClick={() => { setActiveTab('dao_chuyen'); setMobileNavOpen(false); }}
              title="Báo Cáo Đảo Chuyển"
              style={activeTab === 'dao_chuyen' ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 30%, #1e293b)' } : undefined}
              className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                sidebarCollapsed ? 'lg:justify-center' : ''
              } space-x-3 text-left ${
                activeTab === 'dao_chuyen' ? 'text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Repeat className="w-4.5 h-4.5 shrink-0" style={{ color: activeTab === 'dao_chuyen' ? 'var(--theme-accent-text)' : undefined }} />
              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Báo Cáo Đảo Chuyển</span>
            </button>
            {isAdmin && (
              <div>
                <button
                  onClick={() => {
                    if (!settingsMenuOpen) {
                      setSettingsMenuOpen(true);
                      if (!isSettingsTab) setActiveTab('settings_users');
                    } else {
                      setSettingsMenuOpen(false);
                    }
                  }}
                  title="Thiết Lập Hệ Thống"
                  style={isSettingsTab ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary) 30%, #1e293b)' } : undefined}
                  className={`w-full flex items-center font-bold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    sidebarCollapsed ? 'lg:justify-center' : ''
                  } space-x-3 text-left ${
                    isSettingsTab ? 'text-white' : 'text-slate-450 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Settings className="w-4.5 h-4.5 shrink-0" style={{ color: isSettingsTab ? 'var(--theme-accent-text)' : undefined }} />
                  <span className={`flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Thiết Lập Hệ Thống</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${settingsMenuOpen ? 'rotate-180' : ''} ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                  />
                </button>
                {/* 2 sub-menu, mỗi cái có link riêng (/settings/nguoi-dung, /settings/master-data) - chỉ
                    hiện khi bấm mở menu cha (xổ xuống), ẩn khi sidebar thu gọn trên desktop. */}
                {settingsMenuOpen && (
                  <div className={`ml-4 pl-3 border-l border-slate-800 space-y-0.5 mt-0.5 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                    <button
                      onClick={() => { setActiveTab('settings_users'); setMobileNavOpen(false); }}
                      className={`w-full flex items-center font-bold text-[11px] px-3 py-2 rounded-lg transition-all cursor-pointer space-x-2 text-left ${
                        activeTab === 'settings_users' ? 'text-white bg-slate-900/70' : 'text-slate-500 hover:text-white hover:bg-slate-900/50'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>Người Dùng</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('settings_master'); setMobileNavOpen(false); }}
                      className={`w-full flex items-center font-bold text-[11px] px-3 py-2 rounded-lg transition-all cursor-pointer space-x-2 text-left ${
                        activeTab === 'settings_master' ? 'text-white bg-slate-900/70' : 'text-slate-500 hover:text-white hover:bg-slate-900/50'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 shrink-0" />
                      <span>Master Data</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            <ThemePicker currentTheme={theme} onChange={setTheme} collapsed={sidebarCollapsed} />
          </nav>
        </div>

        {/* Profile Admin Badge at bottom of Sidebar */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40">
          <div className={`flex items-center justify-between ${sidebarCollapsed ? 'lg:flex-col lg:space-y-2' : ''}`}>
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'lg:space-x-0' : ''}`}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-sm text-sm shrink-0 border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 18%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--theme-primary) 35%, transparent)',
                  color: 'var(--theme-accent-text)',
                }}
              >
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
              <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1.5 flex items-center space-x-2">
                {activeTab === 'settings_users' ? (
                  <Users className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} />
                ) : activeTab === 'settings_master' ? (
                  <Database className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} />
                ) : activeTab === 'overview' ? (
                  <LayoutDashboard className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} />
                ) : (
                  <FileSpreadsheet className="w-7 h-7" style={{ color: 'var(--theme-primary)' }} />
                )}
                <span>
                  {activeTab === 'settings_users'
                    ? 'Thiết Lập Hệ Thống - Người Dùng'
                    : activeTab === 'settings_master'
                    ? 'Thiết Lập Hệ Thống - Master Data'
                    : activeTab === 'overview'
                    ? 'Tổng Quan'
                    : activeTab === 'report'
                    ? 'Báo Cáo Kế Toán'
                    : activeTab === 'driver'
                    ? 'Báo Cáo Theo Tài Xế'
                    : activeTab === 'nang_ha'
                    ? 'Báo Cáo Nâng/Hạ'
                    : activeTab === 'dao_chuyen'
                    ? 'Báo Cáo Đảo Chuyển'
                    : 'Danh Sách Sản Lượng'}
                </span>
              </h1>
            </div>

          {/* Ẩn ở 3 báo cáo tổng hợp (Theo tài xế / Nâng-Hạ / Đảo chuyển) - mỗi báo cáo đó đã có
              nút "Tải Excel" riêng, còn "Thêm lượt mới"/"In Báo Cáo" không áp dụng cho các màn hình này. */}
          {(activeTab === 'dashboard' || activeTab === 'report') && (
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

        {/* Dynamic Interactive Stats widgets - chỉ hiện ở Danh Sách Sản Lượng và Báo Cáo Kế Toán,
            không phù hợp với 3 báo cáo tổng hợp (Theo tài xế / Nâng-Hạ / Đảo chuyển) vì các báo
            cáo đó có bảng tổng số liệu riêng theo hãng tàu/tài xế. */}
        {(activeTab === 'dashboard' || activeTab === 'report') && (
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

      {/* 2. Filters bar - trang Tổng Quan tự quản lý khoảng ngày riêng (xem xu hướng nhiều ngày,
          không phải lọc theo 1 ca), nên không dùng chung bộ lọc ca/ngày/tài xế ở đây. */}
      {activeTab !== 'settings_users' && activeTab !== 'settings_master' && activeTab !== 'overview' && (
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4 no-print shadow-xs">
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

      {activeTab === 'settings_users' || activeTab === 'settings_master' ? (
        <AdminSettingsView
          tab={activeTab === 'settings_master' ? 'config' : 'users'}
          accounts={accounts}
          configLists={configLists}
          onCreateAccount={onCreateAccount}
          onToggleAccountActive={onToggleAccountActive}
          onDeleteAccount={onDeleteAccount}
          onUpdateAccountEmail={onUpdateAccountEmail}
          onSetDriverPin={onSetDriverPin}
          onAddShippingLine={onAddShippingLine}
          onToggleShippingLine={onToggleShippingLine}
          onAddContainerSize={onAddContainerSize}
          onToggleContainerSize={onToggleContainerSize}
          onToggleOperationType={onToggleOperationType}
          onAddOperationType={onAddOperationType}
          onAddDaoChuyenSubtype={onAddDaoChuyenSubtype}
          onToggleDaoChuyenSubtype={onToggleDaoChuyenSubtype}
          onAddDaoChuyenNote={onAddDaoChuyenNote}
          onToggleDaoChuyenNote={onToggleDaoChuyenNote}
          onAddEquipmentType={onAddEquipmentType}
          onToggleEquipmentType={onToggleEquipmentType}
          onAddContainerType={onAddContainerType}
          onToggleContainerType={onToggleContainerType}
          onAddNotePreset={onAddNotePreset}
          onToggleNotePreset={onToggleNotePreset}
          onDeleteNotePreset={onDeleteNotePreset}
        />
      ) : activeTab === 'overview' ? (
        <DashboardOverview jobs={jobs} drivers={drivers} sizes={sizes} operations={operations} />
      ) : activeTab === 'report' ? (
        <AccountingReportPanel jobs={filteredJobs} rates={rates} subtitle={getShiftSubtitle()} />
      ) : activeTab === 'driver' ? (
        <DriverProductionReport
          jobs={filteredJobs}
          drivers={reportDrivers}
          operations={operations}
          title="Bảng Tổng Hợp Sản Lượng Theo Tài Xế"
          subtitle={getShiftSubtitle()}
          periodFrom={periodFrom}
          periodTo={periodTo}
        />
      ) : activeTab === 'nang_ha' ? (
        <OperationSummaryReport
          jobs={filteredJobs}
          lines={reportLines}
          sizes={sizes}
          blocks={nangHaBlocks}
          rowGroups={nangHaRowGroups}
          title="Bảng Tổng Hợp Sản Lượng Nâng, Hạ"
          subtitle={getShiftSubtitle()}
          reportType="nang_ha"
          periodFrom={periodFrom}
          periodTo={periodTo}
          reconciliations={reconciliations}
          onSaveReconciliation={handleSaveReconciliation}
        />
      ) : activeTab === 'dao_chuyen' ? (
        <OperationSummaryReport
          jobs={filteredJobs}
          lines={reportLines}
          sizes={sizes}
          blocks={daoChuyenBlocks}
          rowGroups={daoChuyenRowGroups}
          title="Bảng Tổng Hợp Sản Lượng Đảo Chuyển"
          subtitle={getShiftSubtitle()}
          reportType="dao_chuyen"
          periodFrom={periodFrom}
          periodTo={periodTo}
          reconciliations={reconciliations}
          onSaveReconciliation={handleSaveReconciliation}
        />
      ) : (
      <>
      {/* 3. The Report View (Matching the requested template) */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs print:border-none print:shadow-none print:p-0 print:w-full">
          
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
            <table className="w-full text-center text-xs border-collapse table-fixed select-text">
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
                {dashboardRows.length === 0 ? (
                  <tr>
                    <td colSpan={6 + sizes.length * operations.length + 2} className="py-12 text-center text-slate-400 font-sans italic">
                      {pagedLoading ? 'Đang tải...' : 'Không tìm thấy dữ liệu chấm công cho bộ lọc hiện tại.'}
                    </td>
                  </tr>
                ) : (
                  dashboardRows.map((job, localIdx) => {
                    const idx = dashboardPage * DASHBOARD_PAGE_SIZE + localIdx;
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
                        <td
                          className="text-left px-2 font-sans text-[11px] text-slate-800 whitespace-nowrap truncate max-w-[180px]"
                          title={formatJobNotesDisplay(job)}
                        >
                          {formatJobNotesDisplay(job)}
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

          {/* Phân trang - 20 dòng/trang, đổi trang là gọi API tải trang mới (trừ khi đang tìm kiếm) */}
          <div className="flex items-center justify-between mt-4 no-print">
            <span className="text-xs font-semibold text-slate-500">
              {dashboardTotal === 0
                ? 'Không có dữ liệu'
                : `Trang ${dashboardPage + 1}/${dashboardTotalPages} - tổng ${dashboardTotal} dòng`}
              {pagedLoading && <Loader2 className="inline w-3.5 h-3.5 ml-1.5 animate-spin align-text-bottom" />}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDashboardPage((p) => Math.max(0, p - 1))}
                disabled={dashboardPage === 0 || pagedLoading}
                className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDashboardPage((p) => Math.min(dashboardTotalPages - 1, p + 1))}
                disabled={dashboardPage >= dashboardTotalPages - 1 || pagedLoading}
                className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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

            {formErrorWarning && (
              <div className="mb-4 bg-amber-50 border-2 border-amber-400 p-3 rounded-xl text-amber-900 text-xs flex items-start space-x-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800">{formErrorWarning}</p>
              </div>
            )}

            <form onSubmit={handleSaveJob} className="space-y-4">
              {/* Container number - không ép định dạng khi đang gõ để tránh vỡ IME tiếng Việt */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Số hiệu Container *</label>
                <input
                  type="text"
                  value={formContainerNo}
                  onChange={(e) => setFormContainerNo(e.target.value)}
                  onBlur={() => setFormContainerNo((v) => cleanContainerNo(v))}
                  onPaste={(e) => { e.preventDefault(); setFormContainerNo(cleanPastedContainerNo(e)); }}
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

              {(configLists.equipmentTypes.length > 0 || configLists.containerTypes.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {configLists.containerTypes.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Loại container *</label>
                      <select
                        value={formContainerType}
                        onChange={(e) => setFormContainerType(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                      >
                        {configLists.containerTypes.map((ct) => (
                          <option key={ct.code} value={ct.code}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {configLists.equipmentTypes.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">Thiết bị sử dụng *</label>
                      <select
                        value={formEquipment}
                        onChange={(e) => setFormEquipment(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                      >
                        {configLists.equipmentTypes.map((eq) => (
                          <option key={eq.code} value={eq.code}>{eq.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {formOperation === 'dao_chuyen' && configLists.daoChuyenNotes.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Ghi chú đảo chuyển *</label>
                  <select
                    value={formDaoChuyenNoteCode}
                    onChange={(e) => setFormDaoChuyenNoteCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                  >
                    {configLists.daoChuyenNotes.map((note) => (
                      <option key={note.code} value={note.code}>{note.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Container status & thời gian thực hiện - ca làm việc tự suy ra từ thời gian này
                  (hiển thị dạng nhãn), không cho chọn tay riêng để tránh lệch với dữ liệu thật. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Container *</label>
                  <select
                    value={formCargoStatus}
                    onChange={(e) => setFormCargoStatus(e.target.value as 'rong' | 'hang')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none"
                  >
                    <option value="hang">Có hàng</option>
                    <option value="rong">Rỗng</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Thời gian *</label>
                    {formTime && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          getAutoShift(new Date(formTime)) === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {getAutoShift(new Date(formTime)) === 'day' ? 'Ca ngày' : 'Ca đêm'}
                      </span>
                    )}
                  </div>
                  <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    value={formTime ? dayjs(formTime) : null}
                    onChange={(date) => setFormTime(date ? date.format('YYYY-MM-DDTHH:mm') : '')}
                    allowClear={false}
                    className="w-full !h-[38px] !rounded-lg !border !border-slate-300"
                  />
                </div>
              </div>

              {/* Notes - ẩn khi Đảo chuyển vì đã có Ghi chú đảo chuyển ở trên đóng vai trò ghi chú của lượt này */}
              {formOperation !== 'dao_chuyen' && (
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
              )}

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
