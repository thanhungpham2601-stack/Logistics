/**
 * Format timestamp to string like "HH:mm:ss DD/MM/YYYY" or "DD/MM/YYYY"
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    return `${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}`;
  } catch (e) {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    return `${dd}/${mo}/${yyyy}`;
  } catch (e) {
    return isoString;
  }
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
 * Check if a date-time falls within a specific shift
 * shiftName: 'day' (07:00 - 19:00) or 'night' (19:00 - 07:00 next day)
 */
export function isJobInShift(jobDateStr: string, filterDateStr: string, shift: 'day' | 'night' | 'all'): boolean {
  if (shift === 'all') return true;
  
  const jobDate = new Date(jobDateStr);
  const filterDate = new Date(filterDateStr); // Format "YYYY-MM-DD"
  
  if (isNaN(jobDate.getTime()) || isNaN(filterDate.getTime())) return true;
  
  // Clear times to compare dates
  const fYear = filterDate.getFullYear();
  const fMonth = filterDate.getMonth();
  const fDate = filterDate.getDate();
  
  // Shift day: filterDate 07:00:00 to filterDate 19:00:00
  const dayShiftStart = new Date(fYear, fMonth, fDate, 7, 0, 0);
  const dayShiftEnd = new Date(fYear, fMonth, fDate, 19, 0, 0);
  
  // Shift night: filterDate 19:00:00 to nextDay 07:00:00
  const nightShiftStart = new Date(fYear, fMonth, fDate, 19, 0, 0);
  const nightShiftEnd = new Date(fYear, fMonth, fDate + 1, 7, 0, 0);
  
  if (shift === 'day') {
    return jobDate >= dayShiftStart && jobDate < dayShiftEnd;
  } else {
    return jobDate >= nightShiftStart && jobDate < nightShiftEnd;
  }
}

/**
 * Check if a date-time falls within a from-to date range (inclusive of both full days).
 * fromDateStr / toDateStr format: "YYYY-MM-DD"
 */
export function isJobInDateRange(jobDateStr: string, fromDateStr: string, toDateStr: string): boolean {
  const jobDate = new Date(jobDateStr);
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);

  if (isNaN(jobDate.getTime()) || isNaN(from.getTime()) || isNaN(to.getTime())) return true;

  const rangeStart = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
  const rangeEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1, 0, 0, 0);

  return jobDate >= rangeStart && jobDate < rangeEnd;
}
