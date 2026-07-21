import ExcelJS from 'exceljs';
import { JobEntry } from '../types';
import { ContainerSizeRow, OperationTypeRow } from './supabaseTypes';
import { formatDateTime } from '../utils';

const COLOR_HEADER = 'FFFFD966';
const COLOR_GROUP = 'FFFFE599';
const COLOR_SUBHEADER = 'FFFFF2CC';
const COLOR_MATCH = 'FFFEF3C7';
const COLOR_TOTAL = 'FFF2F2F2';

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF000000' } },
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
