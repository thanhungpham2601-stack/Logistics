// Toàn bộ ca làm việc (7h/19h) và ngày làm việc được tính theo giờ Việt Nam
// (UTC+7) một cách cố định, bất kể múi giờ hệ điều hành/trình duyệt đang xem
// báo cáo - vì cảng ICD AN GIA chỉ vận hành theo giờ VN.
const VN_UTC_OFFSET_HOURS = 7;

function parseDateParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

/** Epoch ms tương ứng với thời điểm "hour:00" giờ VN của ngày dateStr (+dayOffset ngày). */
function vnWallClockToUtcMs(dateStr: string, hour: number, dayOffset = 0): number {
  const { y, m, d } = parseDateParts(dateStr);
  return Date.UTC(y, m - 1, d + dayOffset, hour - VN_UTC_OFFSET_HOURS, 0, 0);
}

/**
 * Format timestamp to string like "HH:mm:ss DD/MM/YYYY", luôn theo giờ Việt Nam.
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('hour')}:${get('minute')}:${get('second')} ${get('day')}/${get('month')}/${get('year')}`;
  } catch (e) {
    return isoString;
  }
}

/** Format thành "DD/MM/YYYY", luôn theo giờ Việt Nam. */
export function formatDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).formatToParts(d);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('day')}/${get('month')}/${get('year')}`;
  } catch (e) {
    return isoString;
  }
}

/** Bỏ dấu tiếng Việt để so sánh tìm kiếm không phân biệt dấu (vd: gõ "manh" khớp "Mạnh"). */
export function stripDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Validates standard ISO container format (4 letters, 7 numbers)
 * e.g., TRHU4320650 (or TRHU432065)
 */
export function validateContainerNumber(num: string): boolean {
  const clean = num.trim().toUpperCase();
  // Usually 4 letters followed by 7 digits
  return /^[A-Z]{4}\d{7}$/.test(clean);
}

/**
 * Check if a date-time falls within a specific shift (giờ Việt Nam cố định).
 * filterDateStr là ngày ghi trên báo cáo:
 *  - 'day'   (ca ngày):  07:00 - 19:00 cùng ngày filterDateStr
 *  - 'night' (ca đêm):   19:00 ngày filterDateStr - 07:00 ngày kế tiếp
 *    (quy ước: báo cáo "ca đêm ngày X" là ca bắt đầu từ tối ngày X)
 * filterDateStr format: "YYYY-MM-DD"
 */
export function isJobInShift(jobDateStr: string, filterDateStr: string, shift: 'day' | 'night' | 'all'): boolean {
  if (shift === 'all') return true;

  const jobMs = new Date(jobDateStr).getTime();
  if (isNaN(jobMs)) return true;

  if (shift === 'day') {
    return jobMs >= vnWallClockToUtcMs(filterDateStr, 7) && jobMs < vnWallClockToUtcMs(filterDateStr, 19);
  } else {
    return jobMs >= vnWallClockToUtcMs(filterDateStr, 19) && jobMs < vnWallClockToUtcMs(filterDateStr, 7, 1);
  }
}

/**
 * Check if a date-time falls within a from-to date range (giờ Việt Nam cố định,
 * bao gồm trọn cả 2 ngày đầu-cuối).
 * fromDateStr / toDateStr format: "YYYY-MM-DD"
 */
export function isJobInDateRange(jobDateStr: string, fromDateStr: string, toDateStr: string): boolean {
  const jobMs = new Date(jobDateStr).getTime();
  if (isNaN(jobMs)) return true;

  const rangeStart = vnWallClockToUtcMs(fromDateStr, 0);
  const rangeEnd = vnWallClockToUtcMs(toDateStr, 0, 1);

  return jobMs >= rangeStart && jobMs < rangeEnd;
}

/** Ngày hiện tại theo giờ Việt Nam, dạng "YYYY-MM-DD". */
export function todayVN(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** True nếu jobDateStr rơi vào N ngày gần nhất (tính cả hôm nay) theo lịch giờ Việt Nam. */
export function isJobInLastNDays(jobDateStr: string, n: number): boolean {
  const today = todayVN();
  const { y, m, d } = parseDateParts(today);
  const fromDateObj = new Date(Date.UTC(y, m - 1, d - (n - 1)));
  const fromDateStr = `${fromDateObj.getUTCFullYear()}-${String(fromDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(fromDateObj.getUTCDate()).padStart(2, '0')}`;
  return isJobInDateRange(jobDateStr, fromDateStr, today);
}

/**
 * Khoảng UTC (ISO) tương ứng với 1 ca làm việc (giờ VN cố định) - dùng để lọc trực tiếp
 * ở query Supabase (.gte/.lt trên performed_at) thay vì tải hết rồi lọc ở client.
 */
export function getShiftUtcRange(filterDateStr: string, shift: 'day' | 'night'): { from: string; to: string } {
  if (shift === 'day') {
    return {
      from: new Date(vnWallClockToUtcMs(filterDateStr, 7)).toISOString(),
      to: new Date(vnWallClockToUtcMs(filterDateStr, 19)).toISOString(),
    };
  }
  return {
    from: new Date(vnWallClockToUtcMs(filterDateStr, 19)).toISOString(),
    to: new Date(vnWallClockToUtcMs(filterDateStr, 7, 1)).toISOString(),
  };
}

/** Khoảng UTC (ISO) tương ứng với 1 khoảng ngày (giờ VN cố định), bao gồm trọn ngày đầu-cuối. */
export function getDateRangeUtc(fromDateStr: string, toDateStr: string): { from: string; to: string } {
  return {
    from: new Date(vnWallClockToUtcMs(fromDateStr, 0)).toISOString(),
    to: new Date(vnWallClockToUtcMs(toDateStr, 0, 1)).toISOString(),
  };
}
