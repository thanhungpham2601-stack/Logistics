import { Driver, JobEntry } from '../types';
import { OperationTypeRow } from './supabaseTypes';
import { formatDateOnly } from '../utils';

export interface DriverProductionRow {
  driverId: string;
  driverName: string;
  shiftsWorked: number;
  countsByOp: number[]; // theo thứ tự `operations`
  total: number;
}

export function buildDriverRows(jobs: JobEntry[], drivers: Driver[], operations: OperationTypeRow[]): DriverProductionRow[] {
  return drivers.map((driver) => {
    const driverJobs = jobs.filter((j) => j.driverId === driver.id);
    const shiftKeys = new Set(driverJobs.map((j) => `${formatDateOnly(j.timestamp)}|${j.shift}`));
    const countsByOp = operations.map((op) => driverJobs.filter((j) => j.operation === op.code).length);
    const total = countsByOp.reduce((a, b) => a + b, 0);
    return { driverId: driver.id, driverName: driver.name, shiftsWorked: shiftKeys.size, countsByOp, total };
  });
}

/** Giờ VN (0-23) và ngày "DD/MM/YYYY" VN của 1 timestamp ISO. */
function vnDateAndHour(iso: string): { date: string; hour: number } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('day')}/${get('month')}/${get('year')}`, hour: Number(get('hour')) };
}

function addDaysToDMY(dmy: string, days: number): string {
  const [d, m, y] = dmy.split('/').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${String(next.getUTCDate()).padStart(2, '0')}/${String(next.getUTCMonth() + 1).padStart(2, '0')}/${next.getUTCFullYear()}`;
}

/**
 * Xác định "ca" (mốc ngày neo của ca làm việc) mà 1 lượt chấm công thuộc về.
 * Ca ngày: neo theo đúng ngày của timestamp.
 * Ca đêm: neo theo ngày bắt đầu ca (19h hôm trước) - nếu timestamp rơi vào rạng sáng
 * (giờ < 7h) thì neo lùi lại 1 ngày so với ngày của timestamp.
 */
function shiftBucket(iso: string, shift: 'day' | 'night'): { anchorDate: string; label: string; caLabel: string } {
  const { date, hour } = vnDateAndHour(iso);
  if (shift === 'day') {
    return { anchorDate: date, label: date, caLabel: 'Ngày' };
  }
  const anchorDate = hour < 7 ? addDaysToDMY(date, -1) : date;
  const nextDate = addDaysToDMY(anchorDate, 1);
  return { anchorDate, label: `${anchorDate}-${nextDate}`, caLabel: 'Đêm' };
}

function dmyToSortableMs(dmy: string): number {
  const [d, m, y] = dmy.split('/').map(Number);
  return Date.UTC(y, m - 1, d);
}

export interface ShiftSummaryRow {
  stt: number;
  caLabel: string;
  ngayCa: string;
  driverName: string;
  soThaoTac: number;
}

/** Tổng hợp số thao tác theo từng ca (ngày/đêm) của từng tài xế trong kỳ báo cáo. */
export function buildShiftSummaryRows(jobs: JobEntry[]): ShiftSummaryRow[] {
  const byBucket = new Map<string, { anchorDate: string; label: string; caLabel: string; driverName: string; count: number }>();

  for (const job of jobs) {
    const bucket = shiftBucket(job.timestamp, job.shift);
    const key = `${job.driverId}|${job.shift}|${bucket.anchorDate}`;
    const existing = byBucket.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byBucket.set(key, { ...bucket, driverName: job.driverName, count: 1 });
    }
  }

  const sorted = Array.from(byBucket.values()).sort((a, b) => {
    const dateDiff = dmyToSortableMs(a.anchorDate) - dmyToSortableMs(b.anchorDate);
    if (dateDiff !== 0) return dateDiff;
    if (a.caLabel !== b.caLabel) return a.caLabel === 'Ngày' ? -1 : 1;
    return a.driverName.localeCompare(b.driverName);
  });

  return sorted.map((b, idx) => ({
    stt: idx + 1,
    caLabel: b.caLabel,
    ngayCa: b.label,
    driverName: b.driverName,
    soThaoTac: b.count,
  }));
}
