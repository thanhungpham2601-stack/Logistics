import { CargoStatus, JobEntry } from '../types';
import { ContainerSizeRow, ReportReconciliationRow } from './supabaseTypes';

export interface SummaryColumnBlock {
  key: string;
  label: string;
  cargoStatus?: CargoStatus; // undefined = không tách rỗng/hàng, gộp tất cả vào 1 khối
}

export interface SummaryRowGroup {
  key: string;
  label: string;
  matches: (job: JobEntry) => boolean;
}

export interface SummaryRow {
  groupKey: string;
  groupLabel: string;
  blockCounts: number[][]; // blockCounts[blockIdx][sizeIdx]
  rowTotal: number;
}

export interface SummaryLineGroup {
  lineCode: string;
  rows: SummaryRow[];
  lineTotal: number;
  confirmedQty: number | null;
  difference: number | null;
}

export interface SummaryMatrix {
  sizes: ContainerSizeRow[];
  blocks: SummaryColumnBlock[];
  rowGroups: SummaryRowGroup[];
  lineGroups: SummaryLineGroup[];
  grandBlockSizeTotals: number[][]; // grandBlockSizeTotals[blockIdx][sizeIdx]
  grandTotal: number;
  grandConfirmed: number | null;
  grandDifference: number | null;
}

/**
 * Dựng ma trận Hãng tàu × Tác nghiệp × (Khối container) × Size dùng chung cho cả
 * bảng hiển thị trên web và file Excel xuất ra, đảm bảo 2 nơi luôn khớp số liệu.
 */
export function buildSummaryMatrix(params: {
  jobs: JobEntry[];
  lines: string[];
  sizes: ContainerSizeRow[];
  blocks: SummaryColumnBlock[];
  rowGroups: SummaryRowGroup[];
  reconciliations: ReportReconciliationRow[];
}): SummaryMatrix {
  const { jobs, lines, sizes, blocks, rowGroups, reconciliations } = params;

  const lineGroups: SummaryLineGroup[] = lines.map((lineCode) => {
    const lineJobs = jobs.filter((j) => j.line === lineCode);

    const rows: SummaryRow[] = rowGroups.map((rg) => {
      const groupJobs = lineJobs.filter(rg.matches);
      const blockCounts = blocks.map((blk) => {
        const blockJobs = blk.cargoStatus ? groupJobs.filter((j) => j.cargoStatus === blk.cargoStatus) : groupJobs;
        return sizes.map((sz) => blockJobs.filter((j) => j.size === sz.code).length);
      });
      const rowTotal = blockCounts.reduce((sum, arr) => sum + arr.reduce((a, b) => a + b, 0), 0);
      return { groupKey: rg.key, groupLabel: rg.label, blockCounts, rowTotal };
    });

    const lineTotal = rows.reduce((sum, r) => sum + r.rowTotal, 0);
    const recon = reconciliations.find((r) => r.line_code === lineCode);
    const confirmedQty = recon?.confirmed_qty ?? null;
    const difference = confirmedQty !== null ? lineTotal - confirmedQty : null;

    return { lineCode, rows, lineTotal, confirmedQty, difference };
  });

  const grandBlockSizeTotals = blocks.map((_, bi) =>
    sizes.map((_, si) =>
      lineGroups.reduce((sum, lg) => sum + lg.rows.reduce((rowSum, r) => rowSum + r.blockCounts[bi][si], 0), 0)
    )
  );
  const grandTotal = lineGroups.reduce((sum, lg) => sum + lg.lineTotal, 0);
  const confirmedValues = lineGroups.map((lg) => lg.confirmedQty).filter((v): v is number => v !== null);
  const grandConfirmed = confirmedValues.length > 0 ? confirmedValues.reduce((a, b) => a + b, 0) : null;
  const grandDifference = grandConfirmed !== null ? grandTotal - grandConfirmed : null;

  return { sizes, blocks, rowGroups, lineGroups, grandBlockSizeTotals, grandTotal, grandConfirmed, grandDifference };
}
