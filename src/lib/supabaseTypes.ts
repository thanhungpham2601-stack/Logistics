import { ContainerSize, OperationType, UserRole } from '../types';

// Row shapes matching supabase/migrations/0001_init.sql

export interface ProfileRow {
  id: string;
  auth_user_id: string | null;
  username: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  license_number: string | null;
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
  container_no: string;
  line_code: string;
  size_code: ContainerSize;
  operation_code: OperationType;
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
