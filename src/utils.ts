import type { ClipboardEvent } from 'react';

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
 * Xoá mọi khoảng trắng - đầu, cuối, VÀ ở giữa - rồi viết hoa. Dùng khi chốt lại số hiệu container
 * (blur/submit), vì copy-paste từ nguồn khác (Excel, ảnh chụp OCR...) hay dính dấu cách thừa ở
 * giữa (vd "TRHU 4320650"), chỉ trim() đầu đuôi thì không xử lý được trường hợp này.
 */
export function cleanContainerNo(num: string): string {
  return num.replace(/\s+/g, '').toUpperCase();
}

/**
 * Validates standard ISO container format (4 letters, 7 numbers)
 * e.g., TRHU4320650 (or TRHU432065)
 */
export function validateContainerNumber(num: string): boolean {
  // Usually 4 letters followed by 7 digits
  return /^[A-Z]{4}\d{7}$/.test(cleanContainerNo(num));
}

/**
 * Xử lý sự kiện dán (paste) vào ô số container: chèn nội dung dán vào đúng vị trí đang chọn
 * trong ô, rồi dọn sạch khoảng trắng ngay lập tức - không cần đợi bấm ra ngoài (blur) mới format
 * như lúc gõ tay (gõ tay vẫn cố tình không ép định dạng, tránh vỡ IME tiếng Việt).
 * Dùng: <input onPaste={(e) => { e.preventDefault(); setContainerNo(cleanPastedContainerNo(e)); }} />
 */
export function cleanPastedContainerNo(e: ClipboardEvent<HTMLInputElement>): string {
  const pasted = e.clipboardData.getData('text');
  const target = e.currentTarget;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  return cleanContainerNo(target.value.slice(0, start) + pasted + target.value.slice(end));
}

/**
 * Cột Ghi chú luôn hiển thị đúng ghi chú đã lưu (web, in, Excel). Với tác nghiệp "Đảo chuyển",
 * ghi chú chính là 1 trong các "Ghi chú đảo chuyển" tài xế chọn (vd "Hạ độ cao dọn bãi") - phân
 * loại đảo chuyển (subType) được suy ra tự động từ ghi chú đó, chỉ dùng riêng cho báo cáo admin.
 */
export function formatJobNotesDisplay(job: { notes?: string | null }): string {
  return job.notes || '';
}

/** Ca tự nhận diện theo giờ Việt Nam hiện tại: 07:00-18:59 = ca ngày, còn lại = ca đêm. */
export function getAutoShift(date: Date): 'day' | 'night' {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }).format(date)
  );
  return hour >= 7 && hour < 19 ? 'day' : 'night';
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

/** Ngày (giờ VN) của 1 timestamp bất kỳ, dạng "YYYY-MM-DD" - dùng để gom nhóm theo ngày lịch. */
export function toVNDateStr(isoString: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).formatToParts(new Date(isoString));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Cộng/trừ n ngày (lịch) vào 1 chuỗi "YYYY-MM-DD", trả về cùng định dạng. */
export function addDaysToDateStr(dateStr: string, n: number): string {
  const { y, m, d } = parseDateParts(dateStr);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Số ngày (bao gồm cả 2 đầu) giữa 2 chuỗi "YYYY-MM-DD". */
export function daysBetweenDateStr(fromDateStr: string, toDateStr: string): number {
  const { y: y1, m: m1, d: d1 } = parseDateParts(fromDateStr);
  const { y: y2, m: m2, d: d2 } = parseDateParts(toDateStr);
  const ms = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(ms / 86400000) + 1;
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

/**
 * "Ngày ca" của 1 timestamp - dùng để gộp 2 lượt vào chung 1 ca khi so trùng. Ca ngày thì trùng
 * ngày lịch luôn; ca đêm thì quy ước theo ngày BẮT ĐẦU ca (19:00 ngày X - 07:00 ngày X+1 đều tính
 * là "ca đêm ngày X"), nên timestamp rơi vào khoảng 00:00-06:59 phải lùi về ngày hôm trước.
 */
export function getShiftDateStr(isoString: string): string {
  const dateStr = toVNDateStr(isoString);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }).format(
      new Date(isoString)
    )
  );
  return hour < 7 ? addDaysToDateStr(dateStr, -1) : dateStr;
}

interface DuplicateCheckJob {
  id: string;
  driverId: string;
  containerNo: string;
  operation: string;
  timestamp: string;
  shift: 'day' | 'night';
}

/**
 * Tìm lượt chấm công trùng: cùng tài xế + cùng ca (cùng ngày ca VÀ cùng loại ca ngày/đêm) + cùng
 * số container + cùng loại tác nghiệp. Khác ca thì KHÔNG tính trùng dù cùng container/tác nghiệp -
 * vd nâng rồi hạ cùng 1 container ở 2 ca khác nhau vẫn là 2 lượt hợp lệ, chỉ trùng khi lặp lại
 * đúng trong cùng 1 ca. Truyền excludeId khi đang sửa 1 lượt có sẵn để không tự so trùng với chính nó.
 */
export function findDuplicateJob<T extends DuplicateCheckJob>(
  jobs: T[],
  candidate: { driverId: string; containerNo: string; operation: string; timestamp: string; shift: 'day' | 'night' },
  excludeId?: string
): T | undefined {
  const candidateShiftDate = getShiftDateStr(candidate.timestamp);
  const candidateContainer = cleanContainerNo(candidate.containerNo);
  return jobs.find((j) => {
    if (excludeId && j.id === excludeId) return false;
    if (j.driverId !== candidate.driverId) return false;
    if (j.shift !== candidate.shift) return false;
    if (getShiftDateStr(j.timestamp) !== candidateShiftDate) return false;
    if (cleanContainerNo(j.containerNo) !== candidateContainer) return false;
    if (j.operation !== candidate.operation) return false;
    return true;
  });
}
