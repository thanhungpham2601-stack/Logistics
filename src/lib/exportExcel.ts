import ExcelJS from 'exceljs';
import { JobEntry } from '../types';
import { ContainerSizeRow, OperationTypeRow } from './supabaseTypes';
import { formatDateTime } from '../utils';
import { SummaryMatrix } from './reportMatrix';
import { DriverProductionRow, ShiftSummaryRow } from './driverReportMatrix';

const COLOR_HEADER = 'FFFFD966';
const COLOR_GROUP = 'FFFFE599';
const COLOR_SUBHEADER = 'FFFFF2CC';
const COLOR_MATCH = 'FFFEF3C7';
const COLOR_TOTAL = 'FFF2F2F2';

// Luôn in vừa 1 trang khổ A4 ngang theo chiều rộng (fitToWidth: 1) - chiều cao không giới hạn
// (fitToHeight: 0) vì số dòng dữ liệu có thể nhiều hơn 1 trang, chỉ cần không bị cắt CỘT.
const PRINT_PAGE_SETUP: Partial<ExcelJS.PageSetup> = {
  paperSize: 9, // A4
  orientation: 'landscape',
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  horizontalCentered: true,
  margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
};

// 'medium' chứ không phải 'thin' - báo cáo có thể lên tới hàng chục cột (nhiều loại tác nghiệp x
// size), khi co ép vừa 1 trang A4 ngang (PRINT_PAGE_SETUP.fitToWidth) đường kẻ 'thin' (hairline)
// bị co nhỏ tới mức khi in không còn hiện ra, nhìn như mất hẳn cột phân cách.
const THIN_BORDER = {
  top: { style: 'medium' as const, color: { argb: 'FF000000' } },
  left: { style: 'medium' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'medium' as const, color: { argb: 'FF000000' } },
  right: { style: 'medium' as const, color: { argb: 'FF000000' } },
};

interface ExportShiftReportParams {
  jobs: JobEntry[];
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
  subtitle: string;
  driverLabel: string;
  filenamePrefix: string;
}

/** Xuất báo cáo ca ra file .xlsx với định dạng (màu, viền, merge) giống hệt bảng hiển thị trên web. */
export async function exportShiftReportToExcel(params: ExportShiftReportParams): Promise<void> {
  const { jobs, sizes, operations, subtitle, driverLabel, filenamePrefix } = params;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bao cao ca');
  sheet.pageSetup = { ...PRINT_PAGE_SETUP };

  const leadingCols = 6; // TT, Ngay, Container, Lines, Hang, Size
  const subColsCount = sizes.length * operations.length;
  const notesCol = leadingCols + subColsCount + 1;
  const totalCols = notesCol;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'BÁO CÁO THEO CA CUỐI NGÀY';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(3, 1, 3, totalCols);
  const driverCell = sheet.getCell(3, 1);
  driverCell.value = `Người thực hiện: ${driverLabel}`;
  driverCell.font = { italic: true, size: 10 };
  driverCell.alignment = { horizontal: 'center' };

  const headerRow1Idx = 5;
  const headerRow2Idx = 6;
  const dataStartIdx = 7;

  const leadingHeaders = ['TT', 'Ngày', 'Số hiệu container', 'Lines', 'Hãng', 'Size'];
  leadingHeaders.forEach((label, i) => {
    const col = i + 1;
    sheet.mergeCells(headerRow1Idx, col, headerRow2Idx, col);
    const cell = sheet.getCell(headerRow1Idx, col);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    cell.border = THIN_BORDER;
    sheet.getCell(headerRow2Idx, col).border = THIN_BORDER;
  });

  let col = leadingCols + 1;
  operations.forEach((op) => {
    const startCol = col;
    const endCol = col + sizes.length - 1;
    sheet.mergeCells(headerRow1Idx, startCol, headerRow1Idx, endCol);
    const groupCell = sheet.getCell(headerRow1Idx, startCol);
    groupCell.value = op.label;
    groupCell.font = { bold: true, size: 10 };
    groupCell.alignment = { horizontal: 'center', vertical: 'middle' };
    groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GROUP } };
    for (let c = startCol; c <= endCol; c++) {
      sheet.getCell(headerRow1Idx, c).border = THIN_BORDER;
    }

    sizes.forEach((size, sIdx) => {
      const c = startCol + sIdx;
      const cell = sheet.getCell(headerRow2Idx, c);
      cell.value = size.label;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
      cell.border = THIN_BORDER;
    });

    col = endCol + 1;
  });

  sheet.mergeCells(headerRow1Idx, notesCol, headerRow2Idx, notesCol);
  const notesHeaderCell = sheet.getCell(headerRow1Idx, notesCol);
  notesHeaderCell.value = 'Ghi chú';
  notesHeaderCell.font = { bold: true, size: 10 };
  notesHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  notesHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
  notesHeaderCell.border = THIN_BORDER;
  sheet.getCell(headerRow2Idx, notesCol).border = THIN_BORDER;

  jobs.forEach((job, idx) => {
    const r = dataStartIdx + idx;
    const [timePart, datePart] = formatDateTime(job.timestamp).split(' ');

    sheet.getCell(r, 1).value = idx + 1;
    sheet.getCell(r, 2).value = `${timePart} ${datePart}`;
    sheet.getCell(r, 3).value = job.containerNo;
    sheet.getCell(r, 4).value = job.line;
    sheet.getCell(r, 5).value = '';
    sheet.getCell(r, 6).value = job.size;

    for (let c = 1; c <= leadingCols; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { size: 9 };
    }

    let cc = leadingCols + 1;
    operations.forEach((op) => {
      sizes.forEach((size) => {
        const cell = sheet.getCell(r, cc);
        const isMatched = job.operation === op.code && job.size === size.code;
        cell.value = isMatched ? 'X' : '';
        cell.border = THIN_BORDER;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: isMatched, size: 9 };
        if (isMatched) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_MATCH } };
        }
        cc++;
      });
    });

    const notesCell = sheet.getCell(r, notesCol);
    notesCell.value = job.notes || '';
    notesCell.border = THIN_BORDER;
    notesCell.alignment = { horizontal: 'left', vertical: 'middle' };
    notesCell.font = { size: 9 };
  });

  const totalRowIdx = dataStartIdx + jobs.length;
  sheet.mergeCells(totalRowIdx, 1, totalRowIdx, leadingCols);
  const totalLabelCell = sheet.getCell(totalRowIdx, 1);
  totalLabelCell.value = 'Tổng cộng';
  totalLabelCell.font = { bold: true, size: 10 };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  for (let c = 1; c <= leadingCols; c++) sheet.getCell(totalRowIdx, c).border = THIN_BORDER;

  let tc = leadingCols + 1;
  operations.forEach((op) => {
    sizes.forEach((size) => {
      const count = jobs.filter((j) => j.operation === op.code && j.size === size.code).length;
      const cell = sheet.getCell(totalRowIdx, tc);
      cell.value = count > 0 ? count : '';
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
      cell.border = THIN_BORDER;
      tc++;
    });
  });
  const totalNotesCell = sheet.getCell(totalRowIdx, notesCol);
  totalNotesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  totalNotesCell.border = THIN_BORDER;

  // Khối ký tên - đúng mẫu công ty: 2 cột song song "LÁI XE" (trái) và "ICD TÂN CẢNG HẢI PHÒNG"
  // (phải), mỗi bên đều có "(Ký và ghi rõ họ tên)" bên dưới.
  const signatureMidCol = Math.ceil(totalCols / 2);
  const signatureLabelRowIdx = totalRowIdx + 2;
  const signatureSubRowIdx = signatureLabelRowIdx + 1;

  sheet.mergeCells(signatureLabelRowIdx, 1, signatureLabelRowIdx, signatureMidCol);
  const driverLabelCell = sheet.getCell(signatureLabelRowIdx, 1);
  driverLabelCell.value = 'LÁI XE';
  driverLabelCell.font = { bold: true, size: 11 };
  driverLabelCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(signatureSubRowIdx, 1, signatureSubRowIdx, signatureMidCol);
  const driverSubCell = sheet.getCell(signatureSubRowIdx, 1);
  driverSubCell.value = '(Ký và ghi rõ họ tên)';
  driverSubCell.font = { size: 10 };
  driverSubCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(signatureLabelRowIdx, signatureMidCol + 1, signatureLabelRowIdx, totalCols);
  const companyLabelCell = sheet.getCell(signatureLabelRowIdx, signatureMidCol + 1);
  companyLabelCell.value = 'ICD TÂN CẢNG HẢI PHÒNG';
  companyLabelCell.font = { bold: true, size: 11 };
  companyLabelCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(signatureSubRowIdx, signatureMidCol + 1, signatureSubRowIdx, totalCols);
  const companySubCell = sheet.getCell(signatureSubRowIdx, signatureMidCol + 1);
  companySubCell.value = '(Ký và ghi rõ họ tên)';
  companySubCell.font = { size: 10 };
  companySubCell.alignment = { horizontal: 'center' };

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 8;
  sheet.getColumn(6).width = 8;
  for (let c = leadingCols + 1; c <= leadingCols + subColsCount; c++) {
    sheet.getColumn(c).width = 7;
  }
  sheet.getColumn(notesCol).width = 28;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filenamePrefix: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ExportOperationSummaryParams {
  matrix: SummaryMatrix;
  title: string;
  subtitle: string;
  filenamePrefix: string;
}

/** Xuất báo cáo tổng hợp (Nâng/Hạ, Đảo chuyển) ra .xlsx - cùng ma trận dữ liệu với bảng hiển thị trên web. */
export async function exportOperationSummaryToExcel(params: ExportOperationSummaryParams): Promise<void> {
  const { matrix, title, subtitle, filenamePrefix } = params;
  const { sizes, blocks, lineGroups } = matrix;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bao cao tong hop');
  sheet.pageSetup = { ...PRINT_PAGE_SETUP };

  const leadingCols = 2; // Hãng tàu, Tác nghiệp
  const dataCols = blocks.length * sizes.length;
  const totalCol = leadingCols + dataCols + 1;
  const confirmedCol = totalCol + 1;
  const diffCol = confirmedCol + 1;
  const totalCols = diffCol;
  const showBlockHeader = blocks.length > 1;
  const headerRows = showBlockHeader ? 3 : 2;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: 'center' };

  const headerRow1Idx = 4;
  const headerRow2Idx = showBlockHeader ? 5 : headerRow1Idx;
  const headerRow3Idx = showBlockHeader ? 6 : headerRow1Idx + 1;
  const dataStartIdx = headerRow3Idx + 1;

  const leadTop = ['Hãng tàu', 'Tác nghiệp'];
  leadTop.forEach((label, i) => {
    const col = i + 1;
    sheet.mergeCells(headerRow1Idx, col, headerRow3Idx, col);
    const cell = sheet.getCell(headerRow1Idx, col);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  [
    { col: totalCol, label: 'Tổng' },
    { col: confirmedCol, label: 'SL hãng xác nhận' },
    { col: diffCol, label: 'Chênh lệch' },
  ].forEach(({ col, label }) => {
    sheet.mergeCells(headerRow1Idx, col, headerRow3Idx, col);
    const cell = sheet.getCell(headerRow1Idx, col);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  let col = leadingCols + 1;
  blocks.forEach((blk) => {
    const startCol = col;
    const endCol = col + sizes.length - 1;

    if (showBlockHeader) {
      sheet.mergeCells(headerRow1Idx, startCol, headerRow1Idx, endCol);
      const groupCell = sheet.getCell(headerRow1Idx, startCol);
      groupCell.value = blk.label;
      groupCell.font = { bold: true, size: 10 };
      groupCell.alignment = { horizontal: 'center', vertical: 'middle' };
      groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GROUP } };
      for (let c = startCol; c <= endCol; c++) sheet.getCell(headerRow1Idx, c).border = THIN_BORDER;
    }

    sizes.forEach((size, sIdx) => {
      const c = startCol + sIdx;
      const cell = sheet.getCell(headerRow2Idx, c);
      cell.value = size.label;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
      cell.border = THIN_BORDER;
      if (showBlockHeader) sheet.mergeCells(headerRow2Idx, c, headerRow3Idx, c);
    });

    col = endCol + 1;
  });

  let r = dataStartIdx;
  lineGroups.forEach((lg) => {
    const groupStartRow = r;
    lg.rows.forEach((row) => {
      sheet.getCell(r, 2).value = row.groupLabel;
      sheet.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle' };
      sheet.getCell(r, 2).font = { size: 9, bold: true };
      sheet.getCell(r, 2).border = THIN_BORDER;

      let c = leadingCols + 1;
      row.blockCounts.forEach((counts) => {
        counts.forEach((count) => {
          const cell = sheet.getCell(r, c);
          cell.value = count > 0 ? count : null;
          cell.font = { size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = THIN_BORDER;
          c++;
        });
      });

      const totalCell = sheet.getCell(r, totalCol);
      totalCell.value = row.rowTotal > 0 ? row.rowTotal : null;
      totalCell.font = { bold: true, size: 9 };
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalCell.border = THIN_BORDER;

      r++;
    });

    const groupEndRow = r - 1;

    sheet.mergeCells(groupStartRow, 1, groupEndRow, 1);
    const lineCell = sheet.getCell(groupStartRow, 1);
    lineCell.value = lg.lineCode;
    lineCell.font = { bold: true, size: 9 };
    lineCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, 1).border = THIN_BORDER;

    sheet.mergeCells(groupStartRow, confirmedCol, groupEndRow, confirmedCol);
    const confirmedCell = sheet.getCell(groupStartRow, confirmedCol);
    confirmedCell.value = lg.confirmedQty ?? null;
    confirmedCell.font = { size: 9 };
    confirmedCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, confirmedCol).border = THIN_BORDER;

    sheet.mergeCells(groupStartRow, diffCol, groupEndRow, diffCol);
    const diffCell = sheet.getCell(groupStartRow, diffCol);
    diffCell.value = lg.difference ?? null;
    diffCell.font = { bold: true, size: 9 };
    diffCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, diffCol).border = THIN_BORDER;
  });

  // Tong cong
  sheet.mergeCells(r, 1, r, leadingCols);
  const totalLabelCell = sheet.getCell(r, 1);
  totalLabelCell.value = 'Tổng cộng';
  totalLabelCell.font = { bold: true, size: 10 };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  for (let c = 1; c <= leadingCols; c++) sheet.getCell(r, c).border = THIN_BORDER;

  let tc = leadingCols + 1;
  matrix.grandBlockSizeTotals.forEach((sizeTotals) => {
    sizeTotals.forEach((t) => {
      const cell = sheet.getCell(r, tc);
      cell.value = t > 0 ? t : null;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
      cell.border = THIN_BORDER;
      tc++;
    });
  });

  const grandTotalCell = sheet.getCell(r, totalCol);
  grandTotalCell.value = matrix.grandTotal;
  grandTotalCell.font = { bold: true, size: 10 };
  grandTotalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  grandTotalCell.border = THIN_BORDER;

  const grandConfirmedCell = sheet.getCell(r, confirmedCol);
  grandConfirmedCell.value = matrix.grandConfirmed ?? null;
  grandConfirmedCell.font = { bold: true, size: 10 };
  grandConfirmedCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandConfirmedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  grandConfirmedCell.border = THIN_BORDER;

  const grandDiffCell = sheet.getCell(r, diffCol);
  grandDiffCell.value = matrix.grandDifference ?? null;
  grandDiffCell.font = { bold: true, size: 10 };
  grandDiffCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandDiffCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  grandDiffCell.border = THIN_BORDER;

  sheet.getColumn(1).width = 14;
  sheet.getColumn(2).width = 22;
  for (let c = leadingCols + 1; c <= leadingCols + dataCols; c++) sheet.getColumn(c).width = 8;
  sheet.getColumn(totalCol).width = 9;
  sheet.getColumn(confirmedCol).width = 14;
  sheet.getColumn(diffCol).width = 10;

  await downloadWorkbook(workbook, filenamePrefix);
}

interface ExportDriverReportParams {
  rows: DriverProductionRow[];
  operations: OperationTypeRow[];
  grandShifts: number;
  grandCounts: number[];
  grandTotal: number;
  shiftRows: ShiftSummaryRow[];
  title: string;
  subtitle: string;
  filenamePrefix: string;
}

/**
 * Xuất báo cáo sản lượng theo tài xế ra .xlsx với 2 sheet, cùng số liệu với 2 bảng
 * hiển thị trên web: "Tổng hợp theo tài xế" và "Tổng hợp theo ca".
 */
export async function exportDriverReportToExcel(params: ExportDriverReportParams): Promise<void> {
  const { rows, operations, grandShifts, grandCounts, grandTotal, shiftRows, title, subtitle, filenamePrefix } = params;

  const workbook = new ExcelJS.Workbook();

  addDriverSummarySheet(workbook, { rows, operations, grandShifts, grandCounts, grandTotal, title, subtitle });
  addShiftSummarySheet(workbook, { rows: shiftRows, subtitle });

  await downloadWorkbook(workbook, filenamePrefix);
}

function addDriverSummarySheet(
  workbook: ExcelJS.Workbook,
  params: {
    rows: DriverProductionRow[];
    operations: OperationTypeRow[];
    grandShifts: number;
    grandCounts: number[];
    grandTotal: number;
    title: string;
    subtitle: string;
  }
): void {
  const { rows, operations, grandShifts, grandCounts, grandTotal, title, subtitle } = params;
  const sheet = workbook.addWorksheet('Tổng hợp theo tài xế');
  sheet.pageSetup = { ...PRINT_PAGE_SETUP };

  const totalCols = 2 + operations.length + 1;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: 'center' };

  const headerRowIdx = 4;
  const dataStartIdx = 5;

  const headers = ['Tài xế', 'Số ca làm việc', ...operations.map((op) => op.label), 'Tổng cộng'];
  headers.forEach((label, i) => {
    const cell = sheet.getCell(headerRowIdx, i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  rows.forEach((row, idx) => {
    const r = dataStartIdx + idx;
    sheet.getCell(r, 1).value = row.driverName;
    sheet.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getCell(r, 2).value = row.shiftsWorked > 0 ? row.shiftsWorked : null;
    row.countsByOp.forEach((c, i) => {
      sheet.getCell(r, 3 + i).value = c > 0 ? c : null;
    });
    sheet.getCell(r, totalCols).value = row.total > 0 ? row.total : null;

    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.font = { size: 9, bold: c === totalCols };
    }
  });

  const totalRowIdx = dataStartIdx + rows.length;
  sheet.mergeCells(totalRowIdx, 1, totalRowIdx, 2);
  const totalLabelCell = sheet.getCell(totalRowIdx, 1);
  totalLabelCell.value = 'Tổng cộng';
  totalLabelCell.font = { bold: true, size: 10 };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  for (let c = 1; c <= 2; c++) sheet.getCell(totalRowIdx, c).border = THIN_BORDER;

  sheet.getCell(totalRowIdx, 2).value = grandShifts > 0 ? grandShifts : null;
  grandCounts.forEach((c, i) => {
    const cell = sheet.getCell(totalRowIdx, 3 + i);
    cell.value = c > 0 ? c : null;
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
    cell.border = THIN_BORDER;
  });
  const grandTotalCell = sheet.getCell(totalRowIdx, totalCols);
  grandTotalCell.value = grandTotal;
  grandTotalCell.font = { bold: true, size: 10 };
  grandTotalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL } };
  grandTotalCell.border = THIN_BORDER;

  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 14;
  for (let c = 3; c < totalCols; c++) sheet.getColumn(c).width = 14;
  sheet.getColumn(totalCols).width = 12;
}

function addShiftSummarySheet(workbook: ExcelJS.Workbook, params: { rows: ShiftSummaryRow[]; subtitle: string }): void {
  const { rows, subtitle } = params;
  const sheet = workbook.addWorksheet('Tổng hợp theo ca');
  sheet.pageSetup = { ...PRINT_PAGE_SETUP };

  const totalCols = 6;
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'Tổng Hợp Sản Lượng Theo Ca Làm Việc';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: 'center' };

  const headerRowIdx = 4;
  const dataStartIdx = 5;
  const headers = ['STT', 'Ca', 'Ngày ca', 'Tài xế', 'Số thao tác trong ca', 'Ghi chú'];
  headers.forEach((label, i) => {
    const cell = sheet.getCell(headerRowIdx, i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  rows.forEach((row, idx) => {
    const r = dataStartIdx + idx;
    const values = [row.stt, row.caLabel, row.ngayCa, row.driverName, row.soThaoTac, ''];
    values.forEach((v, c) => {
      const cell = sheet.getCell(r, c + 1);
      cell.value = v;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: c === 3 || c === 5 ? 'left' : 'center', vertical: 'middle' };
      cell.font = { size: 9 };
    });
  });

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 30;
}

