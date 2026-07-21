import { JobEntry, Driver } from '../types';

export const SHIFT_DRIVERS: Driver[] = [
  { id: '1', name: 'Vũ Xuân Tuyên', phone: '0987654321', licenseNumber: 'FC-123456' },
  { id: '2', name: 'Nguyễn Văn Mạnh', phone: '0912345678', licenseNumber: 'FC-234567' },
  { id: '3', name: 'Trần Quốc Bảo', phone: '0903456789', licenseNumber: 'FC-345678' },
  { id: '4', name: 'Phạm Minh Hải', phone: '0976543210', licenseNumber: 'FC-456789' },
];

export const SHIPPING_LINES = [
  'MAE/MSK',
  'MSC',
  'SITC',
  'IAL',
  'SGN/TNB/SNP',
  'ONE',
  'COSCO',
  'EMC',
  'HMM',
  'OOCL'
];

export const INITIAL_JOBS: JobEntry[] = [
  {
    id: 'job-1',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T19:38:01',
    containerNo: 'TRHU432065',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-2',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T21:06:23',
    containerNo: 'TLLU5374910',
    line: 'MAE/MSK',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Nâng khách trả lại'
  },
  {
    id: 'job-3',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T21:33:59',
    containerNo: 'CAAU5944445',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-4',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T21:34:55',
    containerNo: 'CAAU6992643',
    line: 'MSC',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-5',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:28:28',
    containerNo: 'CIPU5120114',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-6',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:28:53',
    containerNo: 'SITC2033976',
    line: 'SITC',
    size: '20',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-7',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:29:14',
    containerNo: 'BMOU1246562',
    line: 'SGN/TNB/SNP',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-8',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:30:08',
    containerNo: 'MRKU6275740',
    line: 'MAE/MSK',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-9',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:30:32',
    containerNo: 'TGBU6017813',
    line: 'MAE/MSK',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-10',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:30:58',
    containerNo: 'MRKU3305666',
    line: 'MAE/MSK',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-11',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:38:29',
    containerNo: 'MRSU5916327',
    line: 'MAE/MSK',
    size: '40',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-12',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T22:49:08',
    containerNo: 'IAAU2704174',
    line: 'IAL',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-13',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-19T23:14:39',
    containerNo: 'DFSU6834811',
    line: 'MSC',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-14',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T01:28:04',
    containerNo: 'MRSU6054994',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-15',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T01:48:20',
    containerNo: 'SITU2635570',
    line: 'SITC',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-16',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T01:48:37',
    containerNo: 'HPCU2892679',
    line: 'SITC',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-17',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T02:04:48',
    containerNo: 'TCKU7309203',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-18',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T02:06:07',
    containerNo: 'IAAU2688411',
    line: 'IAL',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-19',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T02:35:28',
    containerNo: 'TCKU6579884',
    line: 'MSC',
    size: '40',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-20',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T03:06:57',
    containerNo: 'TCKU6868784',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-21',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T03:27:24',
    containerNo: 'GAOU2250777',
    line: 'SITC',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-22',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T03:29:25',
    containerNo: 'MRSU3968764',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-23',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T03:30:17',
    containerNo: 'TRHU4485383',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-24',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T03:39:04',
    containerNo: 'MRKU5042770',
    line: 'MAE/MSK',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-25',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T04:00:02',
    containerNo: 'MRSU4287003',
    line: 'MAE/MSK',
    size: '40',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-26',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T04:53:07',
    containerNo: 'TRHU7947340',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-27',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T04:58:23',
    containerNo: 'IAAU2719364',
    line: 'IAL',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-28',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T04:59:13',
    containerNo: 'MRKU5042770',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-29',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T05:19:16',
    containerNo: 'IAAU2029991',
    line: 'IAL',
    size: '20',
    operation: 'ha_khach_hang',
    notes: ''
  },
  {
    id: 'job-30',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T05:53:24',
    containerNo: 'SUDU6898175',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-31',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T06:28:11',
    containerNo: 'TRHU7950072',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-32',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T06:28:37',
    containerNo: 'MRKU3516376',
    line: 'MAE/MSK',
    size: '40',
    operation: 'dao_chuyen',
    notes: 'Đảo chuyển khách hàng'
  },
  {
    id: 'job-33',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T06:36:22',
    containerNo: 'MRSU3364255',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  },
  {
    id: 'job-34',
    driverId: '1',
    driverName: 'Vũ Xuân Tuyên',
    timestamp: '2026-07-20T06:37:04',
    containerNo: 'MRKU2501577',
    line: 'MAE/MSK',
    size: '40',
    operation: 'nang_khach_hang',
    notes: ''
  }
];
