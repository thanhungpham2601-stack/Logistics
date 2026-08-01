import React, { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { JobEntry } from '../types';
import { ContainerSizeRow, ReconciliationReportType, ReportReconciliationRow } from '../lib/supabaseTypes';
import { buildSummaryMatrix, SummaryColumnBlock, SummaryRowGroup } from '../lib/reportMatrix';
import { exportOperationSummaryToExcel } from '../lib/exportExcel';

interface OperationSummaryReportProps {
  jobs: JobEntry[];
  lines: string[];
  sizes: ContainerSizeRow[];
  blocks: SummaryColumnBlock[];
  rowGroups: SummaryRowGroup[];
  title: string;
  subtitle: string;
  reportType: ReconciliationReportType;
  periodFrom: string;
  periodTo: string;
  reconciliations: ReportReconciliationRow[];
  onSaveReconciliation: (lineCode: string, confirmedQty: number | null) => Promise<void>;
}

function ReconciliationInput({
  lineCode,
  value,
  onSave,
}: {
  lineCode: string;
  value: number | null;
  onSave: (lineCode: string, confirmedQty: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const parsed = draft.trim() === '' ? null : Number(draft);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      setDraft(value === null ? '' : String(value));
      return;
    }
    if (parsed === value) return;
    setSaving(true);
    try {
      await onSave(lineCode, parsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="-"
        className="w-16 text-center border border-slate-300 rounded px-1 py-1 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {saving && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
    </div>
  );
}

export default function OperationSummaryReport({
  jobs,
  lines,
  sizes,
  blocks,
  rowGroups,
  title,
  subtitle,
  reportType,
  periodFrom,
  periodTo,
  reconciliations,
  onSaveReconciliation,
}: OperationSummaryReportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const matrix = useMemo(
    () => buildSummaryMatrix({ jobs, lines, sizes, blocks, rowGroups, reconciliations }),
    [jobs, lines, sizes, blocks, rowGroups, reconciliations]
  );

  const showBlockHeader = blocks.length > 1;
  const totalDataCols = blocks.length * sizes.length;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportOperationSummaryToExcel({
        matrix,
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
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
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

        <div className="overflow-x-auto border border-slate-300">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-[#FFD966] text-black font-extrabold border-b border-slate-400">
                <th rowSpan={showBlockHeader ? 3 : 2} className="border-r border-slate-400 p-2 min-w-[110px]">Hãng tàu</th>
                <th rowSpan={showBlockHeader ? 3 : 2} className="border-r border-slate-400 p-2 min-w-[140px]">Tác nghiệp</th>
                {showBlockHeader ? (
                  blocks.map((blk) => (
                    <th key={blk.key} colSpan={sizes.length} className="border-r border-slate-400 p-1.5 bg-[#FFE599]">
                      {blk.label}
                    </th>
                  ))
                ) : (
                  <th colSpan={sizes.length} className="border-r border-slate-400 p-1.5 bg-[#FFE599]">Kích thước</th>
                )}
                <th rowSpan={showBlockHeader ? 3 : 2} className="border-r border-slate-400 p-2 min-w-[60px]">Tổng</th>
                <th rowSpan={showBlockHeader ? 3 : 2} className="border-r border-slate-400 p-2 min-w-[90px]">SL hãng xác nhận</th>
                <th rowSpan={showBlockHeader ? 3 : 2} className="p-2 min-w-[70px]">Chênh lệch</th>
              </tr>
              <tr className="bg-[#FFF2CC] text-black font-bold border-b border-slate-400">
                {blocks.map((blk) =>
                  sizes.map((sz) => (
                    <th key={`${blk.key}-${sz.code}`} className="border-r border-slate-400 text-[10px] py-1 px-0.5">
                      {sz.label}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white font-mono">
              {matrix.lineGroups.length === 0 ? (
                <tr>
                  <td colSpan={2 + totalDataCols + 3} className="py-10 text-slate-400 italic font-sans">
                    Chưa có hãng tàu nào được cấu hình.
                  </td>
                </tr>
              ) : (
                matrix.lineGroups.map((lg) => (
                  <React.Fragment key={lg.lineCode}>
                    {lg.rows.map((row, rowIdx) => (
                      <tr key={`${lg.lineCode}-${row.groupKey}`} className="hover:bg-slate-50 h-8">
                        {rowIdx === 0 && (
                          <td rowSpan={lg.rows.length} className="border-r border-slate-300 font-bold font-sans align-middle bg-slate-50/60">
                            {lg.lineCode}
                          </td>
                        )}
                        <td className="border-r border-slate-300 text-left pl-2 font-sans font-semibold text-slate-700">
                          {row.groupLabel}
                        </td>
                        {row.blockCounts.map((counts, bi) =>
                          counts.map((c, si) => (
                            <td key={`${bi}-${si}`} className="border-r border-slate-300 font-bold">
                              {c > 0 ? c : ''}
                            </td>
                          ))
                        )}
                        <td className="border-r border-slate-300 font-black">{row.rowTotal > 0 ? row.rowTotal : ''}</td>
                        {rowIdx === 0 && (
                          <>
                            <td rowSpan={lg.rows.length} className="border-r border-slate-300 align-middle bg-slate-50/40 font-sans">
                              <ReconciliationInput lineCode={lg.lineCode} value={lg.confirmedQty} onSave={onSaveReconciliation} />
                            </td>
                            <td rowSpan={lg.rows.length} className={`align-middle font-black font-sans ${lg.difference && lg.difference !== 0 ? 'text-red-600 bg-red-50/60' : 'text-slate-700'}`}>
                              {lg.difference !== null ? lg.difference : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}

              <tr className="bg-[#F2F2F2] font-extrabold border-t-2 border-slate-500 h-8">
                <td colSpan={2} className="border-r border-slate-400 text-right pr-4 font-sans">Tổng cộng</td>
                {matrix.grandBlockSizeTotals.map((sizeTotals, bi) =>
                  sizeTotals.map((t, si) => (
                    <td key={`${bi}-${si}`} className="border-r border-slate-400">{t > 0 ? t : ''}</td>
                  ))
                )}
                <td className="border-r border-slate-400">{matrix.grandTotal}</td>
                <td className="border-r border-slate-400 font-sans">{matrix.grandConfirmed ?? '-'}</td>
                <td className="font-sans">{matrix.grandDifference ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 italic mt-3 font-sans">
          "SL hãng xác nhận" do kế toán nhập tay theo số liệu đối soát với hãng tàu; "Chênh lệch" tự động tính = Tổng - SL hãng xác nhận.
        </p>
      </div>
    </div>
  );
}
