import { CargoStatus, ContainerSize, OperationType, Shift, UserRole } from '../types';

// Row shapes matching supabase/migrations/0001_init.sql

export interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  username: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  license_number: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ContainerSizeRow {
  code: ContainerSize;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface OperationTypeRow {
  code: OperationType;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ShippingLineRow {
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface JobEntryRow {
  id: string;
  driver_id: string;
  performed_at: string;
  shift: Shift;
  container_no: string;
  line_code: string;
  size_code: ContainerSize;
  operation_code: OperationType;
  cargo_status: CargoStatus;
  sub_type: string | null;
  equipment_code: string | null;
  container_type_code: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OperationRateRow {
  id: string;
  operation_code: OperationType;
  size_code: ContainerSize;
  rate: number;
  effective_from: string;
  effective_to: string | null;
}

export interface DaoChuyenSubtypeRow {
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface EquipmentTypeRow {
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface ContainerTypeRow {
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface NotePresetRow {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export type ReconciliationReportType = 'nang_ha' | 'dao_chuyen';

export interface ReportReconciliationRow {
  id: string;
  report_type: ReconciliationReportType;
  line_code: string;
  period_from: string;
  period_to: string;
  confirmed_qty: number | null;
  updated_at: string;
}
