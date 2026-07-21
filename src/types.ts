// Danh sách gợi ý mặc định; admin có thể thêm size mới qua bảng container_sizes
// nên kiểu dữ liệu là string (không giới hạn union) để tránh phải ép kiểu khi mở rộng.
export type ContainerSize = string;

export type OperationType = 
  | 'nang_khach_hang' // Nâng khách hàng
  | 'ha_khach_hang'  // Hạ khách hàng
  | 'nhap_tau'       // Nhập tàu
  | 'xuat_tau'       // Xuất tàu
  | 'chuyen_bai'     // Chuyển bãi
  | 'dao_chuyen';    // Đảo chuyển

export type UserRole = 'driver' | 'accountant' | 'admin';

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
}

export interface JobEntry {
  id: string;
  driverId: string;
  driverName: string;
  timestamp: string; // ISO or formatted date string "HH:mm:ss DD/MM/YYYY"
  containerNo: string; // e.g., TRHU432065
  line: string; // e.g., MAE/MSK, MSC, SITC, IAL
  size: ContainerSize;
  operation: OperationType;
  notes?: string;
}

export interface ShiftInfo {
  name: string; // e.g. "Ca đêm" or "Ca ngày"
  startTime: string; // e.g. "19:00 19/07/2026"
  endTime: string; // e.g. "07:00 20/07/2026"
  reporterName: string; // "Vũ Xuân Tuyên"
}
