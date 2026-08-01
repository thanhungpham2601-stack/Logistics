import { supabase } from './supabase';
import { CargoStatus, ContainerSize, Driver, JobEntry, OperationType, Shift, UserRole } from '../types';
import {
  ContainerSizeRow,
  DaoChuyenSubtypeRow,
  JobEntryRow,
  NotePresetRow,
  OperationRateRow,
  OperationTypeRow,
  ProfileRow,
  ReconciliationReportType,
  ReportReconciliationRow,
  ShippingLineRow,
} from './supabaseTypes';

export interface Account {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  licenseNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface ConfigLists {
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  lines: ShippingLineRow[];
  daoChuyenSubtypes: DaoChuyenSubtypeRow[];
  notePresets: NotePresetRow[];
}

function profileToAccount(row: ProfileRow): Account {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone ?? undefined,
    licenseNumber: row.license_number ?? undefined,
    email: row.email ?? undefined,
    isActive: row.is_active,
  };
}

function accountToDriver(account: Account): Driver {
  return {
    id: account.id,
    name: account.fullName,
    phone: account.phone,
    licenseNumber: account.licenseNumber,
  };
}

function jobRowToEntry(row: JobEntryRow, driverName: string): JobEntry {
  return {
    id: row.id,
    driverId: row.driver_id,
    driverName,
    timestamp: row.performed_at,
    shift: row.shift,
    containerNo: row.container_no,
    line: row.line_code,
    size: row.size_code,
    operation: row.operation_code,
    cargoStatus: row.cargo_status,
    subType: row.sub_type ?? undefined,
    notes: row.notes ?? '',
  };
}

// ===================== ACCOUNTS (profiles) =====================

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data as ProfileRow[]).map(profileToAccount);
}

export async function fetchDrivers(): Promise<Driver[]> {
  const accounts = await fetchAccounts();
  return accounts.filter((a) => a.role === 'driver' && a.isActive).map(accountToDriver);
}

export async function createAccount(input: {
  username: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  licenseNumber?: string;
  email?: string;
}): Promise<Account> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      username: input.username,
      full_name: input.fullName,
      role: input.role,
      phone: input.phone ?? null,
      license_number: input.licenseNumber ?? null,
      email: input.email ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return profileToAccount(data as ProfileRow);
}

export async function updateAccount(
  id: string,
  patch: Partial<{ fullName: string; role: UserRole; phone: string; licenseNumber: string; email: string; isActive: boolean }>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.licenseNumber !== undefined ? { license_number: patch.licenseNumber } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

// ===================== ĐĂNG NHẬP GOOGLE (chế độ "real") =====================

/** Tìm tài khoản đã từng đăng nhập Google trước đó (đã gắn auth_user_id). */
export async function fetchAccountByAuthUserId(authUserId: string): Promise<Account | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (error) throw error;
  return data ? profileToAccount(data as ProfileRow) : null;
}

/** Tìm tài khoản theo email (admin phải gán email trước thì mới đăng nhập Google được). */
export async function fetchAccountByEmail(email: string): Promise<Account | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return data ? profileToAccount(data as ProfileRow) : null;
}

/** Gắn auth_user_id (Supabase Auth) vào profile - thực hiện 1 lần ở lần đăng nhập Google đầu tiên. */
export async function linkAuthUserId(accountId: string, authUserId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ auth_user_id: authUserId }).eq('id', accountId);
  if (error) throw error;
}

// ===================== CONFIG (sizes / operations / lines) =====================

export async function fetchConfigLists(): Promise<ConfigLists> {
  const [sizesRes, opsRes, linesRes, subtypesRes, notePresetsRes] = await Promise.all([
    supabase.from('container_sizes').select('*').order('sort_order'),
    supabase.from('operation_types').select('*').order('sort_order'),
    supabase.from('shipping_lines').select('*').order('sort_order'),
    supabase.from('dao_chuyen_subtypes').select('*').order('sort_order'),
    supabase.from('note_presets').select('*').order('sort_order'),
  ]);

  if (sizesRes.error) throw sizesRes.error;
  if (opsRes.error) throw opsRes.error;
  if (linesRes.error) throw linesRes.error;
  if (subtypesRes.error) throw subtypesRes.error;
  if (notePresetsRes.error) throw notePresetsRes.error;

  return {
    sizes: sizesRes.data as ContainerSizeRow[],
    operations: opsRes.data as OperationTypeRow[],
    lines: linesRes.data as ShippingLineRow[],
    daoChuyenSubtypes: subtypesRes.data as DaoChuyenSubtypeRow[],
    notePresets: notePresetsRes.data as NotePresetRow[],
  };
}

export async function upsertOperationType(row: { code: string; label: string; sort_order?: number }): Promise<void> {
  const { error } = await supabase.from('operation_types').upsert(row, { onConflict: 'code' });
  if (error) throw error;
}

export async function upsertDaoChuyenSubtype(row: { code: string; label: string; sort_order?: number }): Promise<void> {
  const { error } = await supabase.from('dao_chuyen_subtypes').upsert(row, { onConflict: 'code' });
  if (error) throw error;
}

export async function setDaoChuyenSubtypeActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('dao_chuyen_subtypes').update({ is_active: isActive }).eq('code', code);
  if (error) throw error;
}

export async function createNotePreset(label: string, sortOrder?: number): Promise<void> {
  const { error } = await supabase.from('note_presets').insert({ label, sort_order: sortOrder ?? 0 });
  if (error) throw error;
}

export async function setNotePresetActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('note_presets').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteNotePreset(id: string): Promise<void> {
  const { error } = await supabase.from('note_presets').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertShippingLine(row: { code: string; name: string; sort_order?: number }): Promise<void> {
  const { error } = await supabase.from('shipping_lines').upsert(row, { onConflict: 'code' });
  if (error) throw error;
}

export async function setShippingLineActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('shipping_lines').update({ is_active: isActive }).eq('code', code);
  if (error) throw error;
}

export async function upsertContainerSize(row: { code: ContainerSize; label: string; sort_order?: number }): Promise<void> {
  const { error } = await supabase.from('container_sizes').upsert(row, { onConflict: 'code' });
  if (error) throw error;
}

export async function setContainerSizeActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('container_sizes').update({ is_active: isActive }).eq('code', code);
  if (error) throw error;
}

export async function setOperationTypeActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('operation_types').update({ is_active: isActive }).eq('code', code);
  if (error) throw error;
}

export async function fetchOperationRates(): Promise<OperationRateRow[]> {
  const { data, error } = await supabase.from('operation_rates').select('*');
  if (error) throw error;
  return data as OperationRateRow[];
}

// ===================== JOB ENTRIES =====================

export async function fetchJobs(range?: { from: string; to: string }): Promise<JobEntry[]> {
  let query = supabase.from('job_entries').select('*, profiles!job_entries_driver_id_fkey(full_name)');

  if (range) {
    query = query.gte('performed_at', range.from).lt('performed_at', range.to);
  }

  const { data, error } = await query.order('performed_at', { ascending: true });
  if (error) throw error;

  return (data as (JobEntryRow & { profiles: { full_name: string } | null })[]).map((row) =>
    jobRowToEntry(row, row.profiles?.full_name ?? '')
  );
}

export interface JobsPageParams {
  from?: string; // ISO UTC, inclusive
  to?: string; // ISO UTC, exclusive
  driverId?: string; // bỏ qua hoặc 'all' = không lọc theo tài xế
  page: number; // 0-based
  pageSize: number;
}

export interface JobsPageResult {
  jobs: JobEntry[];
  total: number;
}

/** Tải 1 trang dữ liệu chấm công trực tiếp từ Supabase (dùng cho bảng có phân trang ở Danh Sách Sản Lượng). */
export async function fetchJobsPage(params: JobsPageParams): Promise<JobsPageResult> {
  let query = supabase
    .from('job_entries')
    .select('*, profiles!job_entries_driver_id_fkey(full_name)', { count: 'exact' });

  if (params.from) query = query.gte('performed_at', params.from);
  if (params.to) query = query.lt('performed_at', params.to);
  if (params.driverId && params.driverId !== 'all') query = query.eq('driver_id', params.driverId);

  const rangeFrom = params.page * params.pageSize;
  const rangeTo = rangeFrom + params.pageSize - 1;

  const { data, error, count } = await query
    .order('performed_at', { ascending: true })
    .range(rangeFrom, rangeTo);

  if (error) throw error;

  return {
    jobs: (data as (JobEntryRow & { profiles: { full_name: string } | null })[]).map((row) =>
      jobRowToEntry(row, row.profiles?.full_name ?? '')
    ),
    total: count ?? 0,
  };
}

export async function createJob(input: {
  driverId: string;
  createdBy: string;
  performedAt: string;
  shift: Shift;
  containerNo: string;
  line: string;
  size: ContainerSize;
  operation: OperationType;
  cargoStatus: CargoStatus;
  subType?: string;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from('job_entries').insert({
    driver_id: input.driverId,
    created_by: input.createdBy,
    performed_at: input.performedAt,
    shift: input.shift,
    container_no: input.containerNo,
    line_code: input.line,
    size_code: input.size,
    operation_code: input.operation,
    cargo_status: input.cargoStatus,
    sub_type: input.subType ?? null,
    notes: input.notes ?? '',
  });

  if (error) throw error;
}

export async function updateJob(
  id: string,
  patch: Partial<{
    driverId: string;
    performedAt: string;
    shift: Shift;
    containerNo: string;
    line: string;
    size: ContainerSize;
    operation: OperationType;
    cargoStatus: CargoStatus;
    subType: string | null;
    notes: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('job_entries')
    .update({
      ...(patch.driverId !== undefined ? { driver_id: patch.driverId } : {}),
      ...(patch.performedAt !== undefined ? { performed_at: patch.performedAt } : {}),
      ...(patch.shift !== undefined ? { shift: patch.shift } : {}),
      ...(patch.containerNo !== undefined ? { container_no: patch.containerNo } : {}),
      ...(patch.line !== undefined ? { line_code: patch.line } : {}),
      ...(patch.size !== undefined ? { size_code: patch.size } : {}),
      ...(patch.operation !== undefined ? { operation_code: patch.operation } : {}),
      ...(patch.cargoStatus !== undefined ? { cargo_status: patch.cargoStatus } : {}),
      ...(patch.subType !== undefined ? { sub_type: patch.subType } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('job_entries').delete().eq('id', id);
  if (error) throw error;
}

// ===================== REPORTS =====================

export interface PayrollReportRow {
  driver_id: string;
  driver_name: string;
  operation_code: string;
  operation_label: string;
  size_code: string;
  size_label: string;
  so_luot: number;
  rate: number | null;
  thanh_tien: number;
  ngay: string;
}

export async function fetchPayrollReport(range: { from: string; to: string }): Promise<PayrollReportRow[]> {
  const { data, error } = await supabase
    .from('v_payroll_report')
    .select('*')
    .gte('ngay', range.from)
    .lt('ngay', range.to);

  if (error) throw error;
  return data as PayrollReportRow[];
}

export interface LineReportRow {
  line_code: string;
  line_name: string;
  operation_code: string;
  operation_label: string;
  size_code: string;
  size_label: string;
  so_luot: number;
  ngay: string;
}

export async function fetchLineReport(range: { from: string; to: string }): Promise<LineReportRow[]> {
  const { data, error } = await supabase
    .from('v_line_report')
    .select('*')
    .gte('ngay', range.from)
    .lt('ngay', range.to);

  if (error) throw error;
  return data as LineReportRow[];
}

// ===================== DOI SOAT BAO CAO (SL hang tau xac nhan) =====================

export async function fetchReconciliations(
  reportType: ReconciliationReportType,
  periodFrom: string,
  periodTo: string
): Promise<ReportReconciliationRow[]> {
  const { data, error } = await supabase
    .from('report_reconciliations')
    .select('*')
    .eq('report_type', reportType)
    .eq('period_from', periodFrom)
    .eq('period_to', periodTo);

  if (error) throw error;
  return data as ReportReconciliationRow[];
}

export async function upsertReconciliation(input: {
  reportType: ReconciliationReportType;
  lineCode: string;
  periodFrom: string;
  periodTo: string;
  confirmedQty: number | null;
}): Promise<void> {
  const { error } = await supabase.from('report_reconciliations').upsert(
    {
      report_type: input.reportType,
      line_code: input.lineCode,
      period_from: input.periodFrom,
      period_to: input.periodTo,
      confirmed_qty: input.confirmedQty,
    },
    { onConflict: 'report_type,line_code,period_from,period_to' }
  );
  if (error) throw error;
}
