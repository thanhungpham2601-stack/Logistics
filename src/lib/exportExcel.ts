import ExcelJS from 'exceljs';
import { JobEntry } from '../types';
import { ContainerSizeRow, OperationTypeRow } from './supabaseTypes';
import { formatDateTime, formatJobNotesDisplay } from '../utils';
import { SummaryMatrix, SummaryColumnBlock, SummaryRowGroup } from './reportMatrix';
import { DriverProductionRow, ShiftSummaryRow } from './driverReportMatrix';

const COLOR_HEADER = 'FFFFD966';
const COLOR_GROUP = 'FFFFE599';
const COLOR_SUBHEADER = 'FFFFF2CC';
const COLOR_MATCH = 'FFFEF3C7';
const COLOR_TOTAL = 'FFF2F2F2';

// Màu riêng cho 2 sheet "Bảng tổng hợp"/"Danh sách chi tiết" (Nâng-Hạ, Đảo chuyển) - lấy đúng mã
// màu từ 2 file mẫu đối soát công ty đang dùng (đọc trực tiếp từ file .xlsx mẫu bằng openpyxl):
// header là xám phẳng E6E6E6, dải màu xen kẽ theo hãng tàu là màu theme "Accent 6" nhạt 80% của
// theme Office 2007-2010 (quy đổi ra mã cố định FDEADA để không phụ thuộc theme của workbook).
const OPSUM_COLOR_HEADER = 'FFE6E6E6';
const OPSUM_COLOR_BAND = 'FFFDEADA';

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

// Viền 'thin' - độ đậm mặc định/bình thường của bảng trong Excel. Trước đây dùng 'medium' để
// đường kẻ không bị mờ khi co ép vừa 1 trang A4 ngang lúc IN (PRINT_PAGE_SETUP.fitToWidth), nhưng
// khi xem file trên máy thì quá đậm/nặng nề nên đã chuyển về 'thin'. Nếu bản in ra giấy bị mờ nét
// kẻ (báo cáo nhiều cột: số loại tác nghiệp x số size), cân nhắc giảm số cột hoặc chỉnh lại
// fitToWidth thay vì làm đậm toàn bộ đường kẻ.
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
        // Dùng số 1 thay vì chữ "X" - số thì cộng/SUMIF được thẳng trong Excel, chữ thì không.
        cell.value = isMatched ? 1 : null;
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
    notesCell.value = formatJobNotesDisplay(job);
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

/** A1, B1, ... Z1, AA1... - đổi số thứ tự cột (1-based) sang chữ cột Excel, dùng để viết công thức. */
function colLetter(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const DETAIL_SHEET_NAME = 'Danh sách chi tiết';
// Luôn đặt tên sheet trong dấu nháy đơn khi tham chiếu công thức chéo sheet - bắt buộc vì tên có
// khoảng trắng (Excel yêu cầu), và đúng cú pháp dù tên không có khoảng trắng.
const DETAIL_SHEET_REF = `'${DETAIL_SHEET_NAME}'`;

interface OperationDetailLayout {
  // Cột "Lines" (hãng tàu) trong sheet chi tiết - tiêu chí SUMIF để kéo số liệu về sheet tổng hợp.
  lineCol: number;
  dataStartRow: number;
  dataEndRow: number; // >= dataStartRow kể cả khi không có lượt nào (1 dòng trống để SUMIF không lỗi)
  // Cột tương ứng với 1 ô (rowGroup × block × size) trong ma trận thưa của sheet chi tiết.
  cellCol: (rowGroupIdx: number, blockIdx: number, sizeIdx: number) => number;
}

/**
 * Sheet "Danh sách chi tiết": mỗi dòng đúng 1 lượt chấm công (Ngày giờ, Số hiệu container, Hãng
 * tàu, Size...), cộng 1 ma trận thưa Tác nghiệp × (Khối rỗng/hàng nếu có) × Size - mỗi lượt chỉ có
 * đúng 1 ô đánh dấu "1" ở đúng cột tác nghiệp+size (+khối) của nó. Sheet "Bảng tổng hợp" dùng SUMIF
 * kéo thẳng từ các cột này, không phải nhập số tay - đúng theo mẫu đối soát công ty đang dùng.
 */
function addOperationDetailSheet(
  workbook: ExcelJS.Workbook,
  params: { jobs: JobEntry[]; sizes: ContainerSizeRow[]; blocks: SummaryColumnBlock[]; rowGroups: SummaryRowGroup[]; lines: string[]; subtitle: string }
): OperationDetailLayout {
  const { jobs, sizes, blocks, rowGroups, lines, subtitle } = params;
  const sheet = workbook.addWorksheet(DETAIL_SHEET_NAME);
  sheet.pageSetup = { ...PRINT_PAGE_SETUP };

  const leadingCols = 6; // TT, Ngày, Số hiệu container, Lines, Hàng, Size
  const dataColsPerGroup = blocks.length * sizes.length;
  const dataCols = rowGroups.length * dataColsPerGroup;
  const driverCol = leadingCols + dataCols + 1;
  const notesCol = driverCol + 1;
  const totalCols = notesCol;
  const showBlockHeader = blocks.length > 1;

  const cellCol = (rgIdx: number, blkIdx: number, szIdx: number) =>
    leadingCols + rgIdx * dataColsPerGroup + blkIdx * sizes.length + szIdx + 1;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'Danh Sách Chi Tiết Sản Lượng Container';
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

  const leadLabels = ['TT', 'Ngày', 'Số hiệu container', 'Lines', 'Hàng', 'Size'];
  leadLabels.forEach((label, i) => {
    const col = i + 1;
    sheet.mergeCells(headerRow1Idx, col, headerRow3Idx, col);
    const cell = sheet.getCell(headerRow1Idx, col);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  [
    { col: driverCol, label: 'Tài xế' },
    { col: notesCol, label: 'Ghi chú' },
  ].forEach(({ col, label }) => {
    sheet.mergeCells(headerRow1Idx, col, headerRow3Idx, col);
    const cell = sheet.getCell(headerRow1Idx, col);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  rowGroups.forEach((rg, rgIdx) => {
    const groupStartCol = cellCol(rgIdx, 0, 0);
    const groupEndCol = groupStartCol + dataColsPerGroup - 1;
    sheet.mergeCells(headerRow1Idx, groupStartCol, headerRow1Idx, groupEndCol);
    const groupCell = sheet.getCell(headerRow1Idx, groupStartCol);
    groupCell.value = rg.label;
    groupCell.font = { bold: true, size: 10 };
    groupCell.alignment = { horizontal: 'center', vertical: 'middle' };
    groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
    for (let c = groupStartCol; c <= groupEndCol; c++) sheet.getCell(headerRow1Idx, c).border = THIN_BORDER;

    blocks.forEach((blk, blkIdx) => {
      const blockStartCol = cellCol(rgIdx, blkIdx, 0);
      const blockEndCol = blockStartCol + sizes.length - 1;
      if (showBlockHeader) {
        sheet.mergeCells(headerRow2Idx, blockStartCol, headerRow2Idx, blockEndCol);
        const blockCell = sheet.getCell(headerRow2Idx, blockStartCol);
        blockCell.value = blk.label;
        blockCell.font = { bold: true, size: 9 };
        blockCell.alignment = { horizontal: 'center', vertical: 'middle' };
        blockCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
        for (let c = blockStartCol; c <= blockEndCol; c++) sheet.getCell(headerRow2Idx, c).border = THIN_BORDER;
      }
      sizes.forEach((size, szIdx) => {
        const c = cellCol(rgIdx, blkIdx, szIdx);
        const cell = sheet.getCell(headerRow3Idx, c);
        cell.value = size.label;
        cell.font = { bold: true, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
        cell.border = THIN_BORDER;
      });
    });
  });

  // Chỉ liệt kê đúng những lượt thuộc phạm vi báo cáo này: hãng tàu nằm trong danh sách đang xét
  // VÀ khớp ít nhất 1 nhóm tác nghiệp (rowGroups) - khớp đúng cách "matrix" lọc dữ liệu, để tổng
  // SUMIF ở sheet tổng hợp luôn bằng đúng số dòng thực sự liệt kê ở đây.
  const relevantJobs = jobs
    .filter((j) => lines.includes(j.line) && rowGroups.some((rg) => rg.matches(j)))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  relevantJobs.forEach((job, idx) => {
    const r = dataStartIdx + idx;
    sheet.getCell(r, 1).value = idx + 1;
    sheet.getCell(r, 2).value = formatDateTime(job.timestamp);
    sheet.getCell(r, 3).value = job.containerNo;
    sheet.getCell(r, 4).value = job.line;
    sheet.getCell(r, 5).value = job.cargoStatus === 'hang' ? 'Có hàng' : 'Rỗng';
    sheet.getCell(r, 6).value = sizes.find((s) => s.code === job.size)?.label ?? job.size;
    sheet.getCell(r, driverCol).value = job.driverName;
    sheet.getCell(r, notesCol).value = formatJobNotesDisplay(job) || null;

    const rgIdx = rowGroups.findIndex((rg) => rg.matches(job));
    const szIdx = sizes.findIndex((s) => s.code === job.size);
    const blkIdx = blocks.length === 1 ? 0 : blocks.findIndex((b) => b.cargoStatus === job.cargoStatus);
    if (rgIdx >= 0 && szIdx >= 0 && blkIdx >= 0) {
      sheet.getCell(r, cellCol(rgIdx, blkIdx, szIdx)).value = 1;
    }

    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = THIN_BORDER;
      cell.font = { size: 9 };
      cell.alignment = { horizontal: c === 3 || c === 7 || c === notesCol ? 'left' : 'center', vertical: 'middle' };
    }
  });

  const dataEndIdx = Math.max(dataStartIdx, dataStartIdx + relevantJobs.length - 1);

  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 10;
  sheet.getColumn(5).width = 8;
  sheet.getColumn(6).width = 7;
  for (let c = leadingCols + 1; c <= leadingCols + dataCols; c++) sheet.getColumn(c).width = 7;
  sheet.getColumn(driverCol).width = 18;
  sheet.getColumn(notesCol).width = 24;

  return { lineCol: 4, dataStartRow: dataStartIdx, dataEndRow: dataEndIdx, cellCol };
}

interface ExportOperationSummaryParams {
  matrix: SummaryMatrix;
  jobs: JobEntry[];
  title: string;
  subtitle: string;
  filenamePrefix: string;
}

/**
 * Xuất báo cáo tổng hợp (Nâng/Hạ, Đảo chuyển) ra .xlsx - 2 sheet: "Bảng tổng hợp" (công thức SUMIF
 * kéo từ sheet chi tiết, không nhập số tay - theo đúng mẫu đối soát công ty đang dùng) và "Danh
 * sách chi tiết" (từng lượt chấm công nằm trong phạm vi báo cáo).
 */
export async function exportOperationSummaryToExcel(params: ExportOperationSummaryParams): Promise<void> {
  const { matrix, jobs, title, subtitle, filenamePrefix } = params;
  const { sizes, blocks, rowGroups, lineGroups } = matrix;
  const lines = lineGroups.map((lg) => lg.lineCode);

  const workbook = new ExcelJS.Workbook();
  // Ép Excel tính lại toàn bộ công thức ngay khi mở file - phòng trường hợp Excel/trình xem khác
  // không tự động tính (hiện 0/trống) vì file không có sẵn kết quả cache cho MỌI công thức. Mỗi ô
  // công thức bên dưới vẫn luôn kèm theo "result" (giá trị JS đã tính sẵn) nên dù không tính lại,
  // số liệu hiển thị ngay lúc mở file vẫn đúng.
  workbook.calcProperties.fullCalcOnLoad = true;

  // Tạo sheet "Bảng tổng hợp" trước để nó đứng tab đầu tiên khi mở file (dễ nhìn thấy ngay) - dữ
  // liệu của sheet này được điền vào SAU, vì công thức SUMIF cần biết trước bố cục cột/dòng của
  // sheet "Danh sách chi tiết" (addOperationDetailSheet tạo và điền luôn sheet đó, đứng tab sau).
  const sheet = workbook.addWorksheet('Bảng tổng hợp');
  sheet.pageSetup = { ...PRINT_PAGE_SETUP };

  const detail = addOperationDetailSheet(workbook, { jobs, sizes, blocks, rowGroups, lines, subtitle });

  const leadingCols = 2; // Hãng tàu, Tác nghiệp
  const dataCols = blocks.length * sizes.length;
  const totalCol = leadingCols + dataCols + 1;
  const summaryCol = totalCol + 1; // "SL Tổng hợp" - gộp Tổng của mọi dòng tác nghiệp cùng 1 hãng tàu
  const confirmedCol = summaryCol + 1;
  const diffCol = confirmedCol + 1;
  const totalCols = diffCol;
  const showBlockHeader = blocks.length > 1;

  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  // Tiêu đề kỳ báo cáo là công thức tham chiếu sang sheet chi tiết - chỉ 1 nơi để sửa (vd đổi khoảng
  // ngày-giờ), nơi còn lại tự theo, giống cách mẫu đối soát công ty đang dùng.
  sheet.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = { formula: `${DETAIL_SHEET_REF}!A2`, result: subtitle };
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
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
    cell.border = THIN_BORDER;
  });

  [
    { col: totalCol, label: 'Tổng' },
    { col: summaryCol, label: 'SL Tổng hợp' },
    { col: confirmedCol, label: 'SL hãng xác nhận' },
    { col: diffCol, label: 'Chênh lệch' },
  ].forEach(({ col, label }) => {
    sheet.mergeCells(headerRow1Idx, col, headerRow3Idx, col);
    const cell = sheet.getCell(headerRow1Idx, col);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
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
      groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
      for (let c = startCol; c <= endCol; c++) sheet.getCell(headerRow1Idx, c).border = THIN_BORDER;
    }

    sizes.forEach((size, sIdx) => {
      const c = startCol + sIdx;
      const cell = sheet.getCell(headerRow2Idx, c);
      cell.value = size.label;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_HEADER } };
      cell.border = THIN_BORDER;
      // Luôn merge xuống hết chiều cao của khối tiêu đề (dù có tách khối rỗng/hàng hay không) -
      // nếu không, lúc không tách khối (headerRow2Idx === headerRow1Idx) cột dữ liệu chỉ cao 1
      // dòng trong khi "Hãng tàu"/"Tổng"... cao 2 dòng, để lại 1 dòng trống lệch tầm nhìn phía dưới.
      sheet.mergeCells(headerRow2Idx, c, headerRow3Idx, c);
    });

    col = endCol + 1;
  });

  const detailLineRange = `${DETAIL_SHEET_REF}!$${colLetter(detail.lineCol)}$${detail.dataStartRow}:$${colLetter(detail.lineCol)}$${detail.dataEndRow}`;

  let r = dataStartIdx;
  lineGroups.forEach((lg, lgIdx) => {
    const groupStartRow = r;
    lg.rows.forEach((row, rgIdx) => {
      sheet.getCell(r, 2).value = row.groupLabel;
      sheet.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle' };
      sheet.getCell(r, 2).font = { size: 9, bold: true };
      sheet.getCell(r, 2).border = THIN_BORDER;

      let c = leadingCols + 1;
      blocks.forEach((_blk, blkIdx) => {
        sizes.forEach((_size, szIdx) => {
          const detailCol = colLetter(detail.cellCol(rgIdx, blkIdx, szIdx));
          const detailValueRange = `${DETAIL_SHEET_REF}!$${detailCol}$${detail.dataStartRow}:$${detailCol}$${detail.dataEndRow}`;
          const cell = sheet.getCell(r, c);
          // Luôn kèm "result" = giá trị JS đã tính sẵn (matrix đã tính đúng số này rồi) - để số liệu
          // hiện đúng ngay khi mở file, không phụ thuộc việc Excel/trình xem có tự tính lại công
          // thức hay không.
          cell.value = { formula: `SUMIF(${detailLineRange},$A${groupStartRow},${detailValueRange})`, result: row.blockCounts[blkIdx][szIdx] };
          cell.font = { size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = THIN_BORDER;
          c++;
        });
      });

      const totalCell = sheet.getCell(r, totalCol);
      const rowStartCell = `${colLetter(leadingCols + 1)}${r}`;
      const rowEndCell = `${colLetter(leadingCols + dataCols)}${r}`;
      totalCell.value = { formula: `SUM(${rowStartCell}:${rowEndCell})`, result: row.rowTotal };
      totalCell.font = { bold: true, size: 9 };
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalCell.border = THIN_BORDER;

      r++;
    });

    const groupEndRow = r - 1;

    // Bôi màu xen kẽ theo từng hãng tàu (không phải xen kẽ từng dòng) - hãng tàu thứ chẵn (lgIdx
    // chẵn, đếm từ 0) tô cả khối dòng của nó, hãng tàu kế tiếp để trắng, đúng theo mẫu đối soát công
    // ty đang dùng. Chỉ tô tới hết cột dữ liệu (Hãng tàu/Tác nghiệp/các cột size) - KHÔNG lan sang
    // Tổng/SL Tổng hợp/SL hãng xác nhận/Chênh lệch, đúng như mẫu (các cột đó luôn để trắng).
    if (lgIdx % 2 === 0) {
      for (let rr = groupStartRow; rr <= groupEndRow; rr++) {
        for (let c = 1; c <= leadingCols + dataCols; c++) {
          sheet.getCell(rr, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OPSUM_COLOR_BAND } };
        }
      }
    }

    sheet.mergeCells(groupStartRow, 1, groupEndRow, 1);
    const lineCell = sheet.getCell(groupStartRow, 1);
    lineCell.value = lg.lineCode;
    lineCell.font = { bold: true, size: 9 };
    lineCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, 1).border = THIN_BORDER;

    sheet.mergeCells(groupStartRow, summaryCol, groupEndRow, summaryCol);
    const summaryCell = sheet.getCell(groupStartRow, summaryCol);
    summaryCell.value = { formula: `SUM(${colLetter(totalCol)}${groupStartRow}:${colLetter(totalCol)}${groupEndRow})`, result: lg.lineTotal };
    summaryCell.font = { bold: true, size: 9 };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, summaryCol).border = THIN_BORDER;

    // "SL hãng xác nhận" vẫn là ô nhập tay (kế toán tự gõ theo số liệu đối soát với hãng tàu) -
    // không phải công thức, đồng bộ 1 chiều từ dữ liệu đã lưu lúc xuất file, giống hệt mẫu đối soát.
    sheet.mergeCells(groupStartRow, confirmedCol, groupEndRow, confirmedCol);
    const confirmedCell = sheet.getCell(groupStartRow, confirmedCol);
    confirmedCell.value = lg.confirmedQty ?? null;
    confirmedCell.font = { size: 9 };
    confirmedCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, confirmedCol).border = THIN_BORDER;

    sheet.mergeCells(groupStartRow, diffCol, groupEndRow, diffCol);
    const diffCell = sheet.getCell(groupStartRow, diffCol);
    diffCell.value = { formula: `${colLetter(summaryCol)}${groupStartRow}-N(${colLetter(confirmedCol)}${groupStartRow})`, result: lg.lineTotal - (lg.confirmedQty ?? 0) };
    diffCell.font = { bold: true, size: 9 };
    diffCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let rr = groupStartRow; rr <= groupEndRow; rr++) sheet.getCell(rr, diffCol).border = THIN_BORDER;
  });

  const lastDataRow = r - 1;

  // Tong cong - mẫu đối soát để dòng này trắng (không tô xám), chỉ đậm chữ.
  sheet.mergeCells(r, 1, r, leadingCols);
  const totalLabelCell = sheet.getCell(r, 1);
  totalLabelCell.value = 'Tổng cộng';
  totalLabelCell.font = { bold: true, size: 10 };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  for (let c = 1; c <= leadingCols; c++) sheet.getCell(r, c).border = THIN_BORDER;

  for (let c = leadingCols + 1; c <= leadingCols + dataCols; c++) {
    const blkIdx = Math.floor((c - leadingCols - 1) / sizes.length);
    const szIdx = (c - leadingCols - 1) % sizes.length;
    const cell = sheet.getCell(r, c);
    cell.value = { formula: `SUM(${colLetter(c)}${dataStartIdx}:${colLetter(c)}${lastDataRow})`, result: matrix.grandBlockSizeTotals[blkIdx][szIdx] };
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN_BORDER;
  }

  const grandTotalCell = sheet.getCell(r, totalCol);
  grandTotalCell.value = { formula: `SUM(${colLetter(totalCol)}${dataStartIdx}:${colLetter(totalCol)}${lastDataRow})`, result: matrix.grandTotal };
  grandTotalCell.font = { bold: true, size: 10 };
  grandTotalCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandTotalCell.border = THIN_BORDER;

  // "SUM" qua các ô đã merge (summaryCol/confirmedCol) chỉ cộng đúng 1 lần mỗi khối merge - Excel
  // tự bỏ qua các ô trống do merge tạo ra, nên không bị đếm trùng theo số dòng tác nghiệp.
  const grandSummaryCell = sheet.getCell(r, summaryCol);
  grandSummaryCell.value = { formula: `SUM(${colLetter(summaryCol)}${dataStartIdx}:${colLetter(summaryCol)}${lastDataRow})`, result: matrix.grandTotal };
  grandSummaryCell.font = { bold: true, size: 10 };
  grandSummaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandSummaryCell.border = THIN_BORDER;

  const grandConfirmedCell = sheet.getCell(r, confirmedCol);
  grandConfirmedCell.value = { formula: `SUM(${colLetter(confirmedCol)}${dataStartIdx}:${colLetter(confirmedCol)}${lastDataRow})`, result: matrix.grandConfirmed ?? 0 };
  grandConfirmedCell.font = { bold: true, size: 10 };
  grandConfirmedCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandConfirmedCell.border = THIN_BORDER;

  const grandDiffCell = sheet.getCell(r, diffCol);
  grandDiffCell.value = { formula: `${colLetter(summaryCol)}${r}-N(${colLetter(confirmedCol)}${r})`, result: matrix.grandTotal - (matrix.grandConfirmed ?? 0) };
  grandDiffCell.font = { bold: true, size: 10 };
  grandDiffCell.alignment = { horizontal: 'center', vertical: 'middle' };
  grandDiffCell.border = THIN_BORDER;

  sheet.getColumn(1).width = 14;
  sheet.getColumn(2).width = 22;
  for (let c = leadingCols + 1; c <= leadingCols + dataCols; c++) sheet.getColumn(c).width = 8;
  sheet.getColumn(totalCol).width = 9;
  sheet.getColumn(summaryCol).width = 11;
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

