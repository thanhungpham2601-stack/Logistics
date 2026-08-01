import React, { useMemo, useState } from 'react';
import { Download, Loader2, Users, CalendarClock } from 'lucide-react';
import { Driver, JobEntry } from '../types';
import { OperationTypeRow } from '../lib/supabaseTypes';
import { exportDriverReportToExcel } from '../lib/exportExcel';
import { buildDriverRows, buildShiftSummaryRows } from '../lib/driverReportMatrix';

interface DriverProductionReportProps {
  jobs: JobEntry[];
  drivers: Driver[];
  operations: OperationTypeRow[];
  title: string;
  subtitle: string;
  periodFrom: string;
  periodTo: string;
}

export default function DriverProductionReport({
  jobs,
  drivers,
  operations,
  title,
  subtitle,
  periodFrom,
  periodTo,
}: DriverProductionReportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [subTab, setSubTab] = useState<'driver' | 'shift'>('driver');

  const rows = useMemo(() => buildDriverRows(jobs, drivers, operations), [jobs, drivers, operations]);
  const grandShifts = rows.reduce((s, r) => s + r.shiftsWorked, 0);
  const grandCounts = operations.map((_, i) => rows.reduce((s, r) => s + r.countsByOp[i], 0));
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  const shiftRows = useMemo(() => buildShiftSummaryRows(jobs), [jobs]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDriverReportToExcel({
        rows,
        operations,
        grandShifts,
        grandCounts,
        grandTotal,
        shiftRows,
        title,
        subtitle,
        filenamePrefix: `${title.replace(/\s+/g, '_')}_${periodFrom}_${periodTo}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>{title}</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-all cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Đang tạo file...' : 'Tải Excel'}</span>
          </button>
        </div>

        {/* Tabs con */}
        <div className="flex gap-1 px-6 border-b border-slate-200">
          <button
            onClick={() => setSubTab('driver')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-lg cursor-pointer transition-all border-b-2 -mb-px ${
              subTab === 'driver'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Theo Tài Xế</span>
          </button>
          <button
            onClick={() => setSubTab('shift')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-lg cursor-pointer transition-all border-b-2 -mb-px ${
              subTab === 'shift'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Theo Ca</span>
          </button>
        </div>

        <div className="p-6">
          {subTab === 'driver' ? (
            <>
              <div className="overflow-x-auto border border-slate-300">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FFD966] text-black font-extrabold border-b border-slate-400">
                      <th className="border-r border-slate-400 p-2 min-w-[150px]">Tài xế</th>
                      <th className="border-r border-slate-400 p-2 min-w-[80px]">Số ca làm việc</th>
                      {operations.map((op) => (
                        <th key={op.code} className="border-r border-slate-400 p-2 min-w-[90px]">{op.label}</th>
                      ))}
                      <th className="p-2 min-w-[90px]">Tổng cộng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 bg-white font-mono">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={3 + operations.length} className="py-10 text-slate-400 italic font-sans">
                          Chưa có tài xế nào được cấu hình.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.driverId} className="hover:bg-slate-50 h-9">
                          <td className="border-r border-slate-300 text-left pl-3 font-sans font-bold text-slate-800">{row.driverName}</td>
                          <td className="border-r border-slate-300 font-bold">{row.shiftsWorked > 0 ? row.shiftsWorked : ''}</td>
                          {row.countsByOp.map((c, i) => (
                            <td key={operations[i].code} className="border-r border-slate-300">{c > 0 ? c : ''}</td>
                          ))}
                          <td className="font-black">{row.total > 0 ? row.total : ''}</td>
                        </tr>
                      ))
                    )}

                    <tr className="bg-[#F2F2F2] font-extrabold border-t-2 border-slate-500 h-9">
                      <td className="border-r border-slate-400 text-right pr-4 font-sans">Tổng cộng</td>
                      <td className="border-r border-slate-400">{grandShifts > 0 ? grandShifts : ''}</td>
                      {grandCounts.map((c, i) => (
                        <td key={operations[i].code} className="border-r border-slate-400">{c > 0 ? c : ''}</td>
                      ))}
                      <td>{grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-400 italic mt-3 font-sans">
                "Số ca làm việc" tính theo số ca (ngày + ca ngày/đêm) khác nhau mà tài xế có ít nhất 1 lượt chấm công trong kỳ báo cáo.
              </p>
            </>
          ) : (
            <div className="overflow-x-auto border border-slate-300">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FFD966] text-black font-extrabold border-b border-slate-400">
                    <th className="border-r border-slate-400 p-2 w-[50px]">STT</th>
                    <th className="border-r border-slate-400 p-2 w-[70px]">Ca</th>
                    <th className="border-r border-slate-400 p-2 min-w-[130px]">Ngày ca</th>
                    <th className="border-r border-slate-400 p-2 min-w-[150px]">Tài xế</th>
                    <th className="border-r border-slate-400 p-2 min-w-[100px]">Số thao tác trong ca</th>
                    <th className="p-2 min-w-[180px]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white font-mono">
                  {shiftRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-slate-400 italic font-sans">
                        Không có ca làm việc nào trong kỳ báo cáo.
                      </td>
                    </tr>
                  ) : (
                    shiftRows.map((row) => (
                      <tr key={`${row.stt}`} className="hover:bg-slate-50 h-9">
                        <td className="border-r border-slate-300">{row.stt}</td>
                        <td className="border-r border-slate-300 font-sans font-bold">{row.caLabel}</td>
                        <td className="border-r border-slate-300">{row.ngayCa}</td>
                        <td className="border-r border-slate-300 text-left pl-3 font-sans font-semibold text-slate-800">{row.driverName}</td>
                        <td className="border-r border-slate-300 font-black">{row.soThaoTac}</td>
                        <td></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
