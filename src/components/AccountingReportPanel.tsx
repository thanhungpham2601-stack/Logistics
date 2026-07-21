import React, { useMemo } from 'react';
import { Calculator, Ship, Users } from 'lucide-react';
import { JobEntry, OperationType, ContainerSize } from '../types';
import { OperationRateRow } from '../lib/supabaseTypes';

interface AccountingReportPanelProps {
  jobs: JobEntry[];
  rates: OperationRateRow[];
  subtitle: string;
}

const OP_LABELS: Record<OperationType, string> = {
  nang_khach_hang: 'Nâng khách hàng',
  ha_khach_hang: 'Hạ khách hàng',
  nhap_tau: 'Nhập tàu',
  xuat_tau: 'Xuất tàu',
  chuyen_bai: 'Chuyển bãi',
  dao_chuyen: 'Đảo chuyển',
};

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

interface GroupRow {
  key: string;
  operation: OperationType;
  size: ContainerSize;
  count: number;
  rate: number;
  total: number;
}

interface DriverGroup {
  driverId: string;
  driverName: string;
  rows: GroupRow[];
  totalCount: number;
  totalAmount: number;
}

interface LineGroup {
  line: string;
  rows: GroupRow[];
  totalCount: number;
}

function findRate(rates: OperationRateRow[], operation: OperationType, size: ContainerSize): number {
  const match = rates.find((r) => r.operation_code === operation && r.size_code === size);
  return match ? Number(match.rate) : 0;
}

export default function AccountingReportPanel({ jobs, rates, subtitle }: AccountingReportPanelProps) {
  const driverGroups = useMemo<DriverGroup[]>(() => {
    const byDriver = new Map<string, DriverGroup>();

    for (const job of jobs) {
      let group = byDriver.get(job.driverId);
      if (!group) {
        group = { driverId: job.driverId, driverName: job.driverName, rows: [], totalCount: 0, totalAmount: 0 };
        byDriver.set(job.driverId, group);
      }

      const key = `${job.operation}|${job.size}`;
      let row = group.rows.find((r) => r.key === key);
      if (!row) {
        const rate = findRate(rates, job.operation, job.size);
        row = { key, operation: job.operation, size: job.size, count: 0, rate, total: 0 };
        group.rows.push(row);
      }
      row.count += 1;
      row.total = row.count * row.rate;
    }

    for (const group of byDriver.values()) {
      group.totalCount = group.rows.reduce((sum, r) => sum + r.count, 0);
      group.totalAmount = group.rows.reduce((sum, r) => sum + r.total, 0);
    }

    return Array.from(byDriver.values()).sort((a, b) => a.driverName.localeCompare(b.driverName));
  }, [jobs, rates]);

  const lineGroups = useMemo<LineGroup[]>(() => {
    const byLine = new Map<string, LineGroup>();

    for (const job of jobs) {
      let group = byLine.get(job.line);
      if (!group) {
        group = { line: job.line, rows: [], totalCount: 0 };
        byLine.set(job.line, group);
      }

      const key = `${job.operation}|${job.size}`;
      let row = group.rows.find((r) => r.key === key);
      if (!row) {
        row = { key, operation: job.operation, size: job.size, count: 0, rate: 0, total: 0 };
        group.rows.push(row);
      }
      row.count += 1;
    }

    for (const group of byLine.values()) {
      group.totalCount = group.rows.reduce((sum, r) => sum + r.count, 0);
    }

    return Array.from(byLine.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [jobs]);

  const grandTotal = driverGroups.reduce((sum, g) => sum + g.totalAmount, 0);

  return (
    <div className="flex-1 p-6 overflow-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <span>Báo Cáo Kế Toán - Sản Lượng &amp; Thanh Toán</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">{subtitle}</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Tổng cộng ({jobs.length} công)</span>
            <span className="text-xl font-black text-emerald-700 font-mono">{formatVND(grandTotal)}</span>
          </div>
        </div>

        {/* Payroll by driver */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Bảng lương theo tài xế</span>
          </h3>

          {driverGroups.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">Không có dữ liệu trong khoảng đã chọn.</p>
          ) : (
            driverGroups.map((group) => (
              <div key={group.driverId} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800">{group.driverName}</span>
                  <span className="text-xs font-bold text-emerald-700 font-mono">{formatVND(group.totalAmount)}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-1.5 px-4">Tác nghiệp</th>
                      <th className="py-1.5 px-2">Size</th>
                      <th className="py-1.5 px-2 text-right">Số lượt</th>
                      <th className="py-1.5 px-2 text-right">Đơn giá</th>
                      <th className="py-1.5 px-4 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.rows.map((row) => (
                      <tr key={row.key}>
                        <td className="py-1.5 px-4 font-semibold text-slate-700">{OP_LABELS[row.operation]}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">{row.size}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{row.count}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                          {row.rate > 0 ? formatVND(row.rate) : <span className="italic text-amber-500">chưa có giá</span>}
                        </td>
                        <td className="py-1.5 px-4 text-right font-mono font-bold text-slate-800">{formatVND(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Line report - for shipping-line invoice reconciliation */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-xs font-black uppercase text-slate-500 flex items-center space-x-1.5 mb-4">
          <Ship className="w-4 h-4 text-indigo-500" />
          <span>Đối soát theo hãng tàu</span>
        </h3>

        {lineGroups.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-6 text-center">Không có dữ liệu trong khoảng đã chọn.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {lineGroups.map((group) => (
              <div key={group.line} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800">{group.line}</span>
                  <span className="text-xs font-bold text-slate-600 font-mono">{group.totalCount} công</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-50">
                    {group.rows.map((row) => (
                      <tr key={row.key}>
                        <td className="py-1.5 px-4 font-semibold text-slate-700">{OP_LABELS[row.operation]}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">{row.size}</td>
                        <td className="py-1.5 px-4 text-right font-mono font-bold">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
