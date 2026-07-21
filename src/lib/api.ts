import { supabase } from './supabase';
import { ContainerSize, Driver, JobEntry, OperationType, UserRole } from '../types';
import {
  ContainerSizeRow,
  JobEntryRow,
  OperationRateRow,
  OperationTypeRow,
  ProfileRow,
  ShippingLineRow,
} from './supabaseTypes';

export interface Account {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  licenseNumber?: string;
  isActive: boolean;
}

export interface ConfigLists {
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  lines: ShippingLineRow[];
}

function profileToAccount(row: ProfileRow): Account {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone ?? undefined,
    licenseNumber: row.license_number ?? undefined,
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
    containerNo: row.container_no,
    line: row.line_code,
    size: row.size_code,
    operation: row.operation_code,
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
}): Promise<Account> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      username: input.username,
      full_name: input.fullName,
      role: input.role,
      phone: input.phone ?? null,
      license_number: input.licenseNumber ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return profileToAccount(data as ProfileRow);
}

export async function updateAccount(
  id: string,
  patch: Partial<{ fullName: string; role: UserRole; phone: string; licenseNumber: string; isActive: boolean }>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.licenseNumber !== undefined ? { license_number: patch.licenseNumber } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

// ===================== CONFIG (sizes / operations / lines) =====================

export async function fetchConfigLists(): Promise<ConfigLists> {
  const [sizesRes, opsRes, linesRes] = await Promise.all([
    supabase.from('container_sizes').select('*').order('sort_order'),
    supabase.from('operation_types').select('*').order('sort_order'),
    supabase.from('shipping_lines').select('*').order('sort_order'),
  ]);

  if (sizesRes.error) throw sizesRes.error;
  if (opsRes.error) throw opsRes.error;
  if (linesRes.error) throw linesRes.error;

  return {
    sizes: sizesRes.data as ContainerSizeRow[],
    operations: opsRes.data as OperationTypeRow[],
    lines: linesRes.data as ShippingLineRow[],
  };
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

export async function createJob(input: {
  driverId: string;
  createdBy: string;
  performedAt: string;
  containerNo: string;
  line: string;
  size: ContainerSize;
  operation: OperationType;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from('job_entries').insert({
    driver_id: input.driverId,
    created_by: input.createdBy,
    performed_at: input.performedAt,
    container_no: input.containerNo,
    line_code: input.line,
    size_code: input.size,
    operation_code: input.operation,
    notes: input.notes ?? '',
  });

  if (error) throw error;
}

export async function updateJob(
  id: string,
  patch: Partial<{
    driverId: string;
    performedAt: string;
    containerNo: string;
    line: string;
    size: ContainerSize;
    operation: OperationType;
    notes: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('job_entries')
    .update({
      ...(patch.driverId !== undefined ? { driver_id: patch.driverId } : {}),
      ...(patch.performedAt !== undefined ? { performed_at: patch.performedAt } : {}),
      ...(patch.containerNo !== undefined ? { container_no: patch.containerNo } : {}),
      ...(patch.line !== undefined ? { line_code: patch.line } : {}),
      ...(patch.size !== undefined ? { size_code: patch.size } : {}),
      ...(patch.operation !== undefined ? { operation_code: patch.operation } : {}),
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
