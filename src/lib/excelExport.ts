import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

export const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const monthNum = parseInt(parts.find(p => p.type === 'month')?.value || '1');
    const year = parts.find(p => p.type === 'year')?.value || '';
    return `${day} / ${hijriMonths[monthNum - 1]} / ${year}`;
  } catch { return ''; }
};

export const getDayNameAr = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(d);
  } catch { return ''; }
};

export interface SchoolExportProfile {
  ministry?: string;
  governorate?: string;
  districtOffice?: string;
  district?: string;
  schoolName?: string;
  branch?: string;
  branchManager?: string;
  writerName?: string;
  logo?: string;
  logoImg?: string;
}

export interface ExcelExportOptions {
  title: string;
  subTitle?: string;
  periodText?: string;
  filename: string;
  headers: string[];
  data: any[][];
  headerColors?: string[];
  columnWidths?: number[];
  profile: SchoolExportProfile;
  date?: string;
  onRow?: (row: ExcelJS.Row, rowData: any[], rowIndex: number) => void;
  swapFooterSides?: boolean;
  managerLabel?: string;
  summaryRow?: any[];
}

/**
 * Adds standard top header and bottom footer to a worksheet
 */
export const applyStyledHeaderAndFooter = (
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  options: {
    title: string;
    subTitle?: string;
    periodText?: string;
    colCount: number;
    profile: SchoolExportProfile;
    date?: string;
    managerLabel?: string;
  }
) => {
  const { title, subTitle, periodText, colCount, profile, date = '' } = options;
  const todayDate = date || new Date().toISOString().split('T')[0];
  const hijri = toHijri(todayDate);
  const dayName = getDayNameAr(todayDate);

  // Set rows 1 to 6 heights
  for (let i = 1; i <= 6; i++) {
    worksheet.getRow(i).height = 18;
  }

  // 1. Right Side (Column 1 in RTL): 6 Lines of Official Hierarchy
  const rightCol = 1;
  worksheet.getCell(1, rightCol).value = 'الجمهـورية اليمنية';
  worksheet.getCell(2, rightCol).value = profile.ministry || 'وزارة التربية والتعـليم والبحث العلمي';
  worksheet.getCell(3, rightCol).value = profile.governorate || profile.districtOffice || 'مكتب التربية والتعليم بالأمانة';
  worksheet.getCell(4, rightCol).value = profile.district ? (profile.district.startsWith('مكتب') ? profile.district : `مكتب التربية والتعليم بمنطقة ${profile.district}`) : 'مكتب التربية والتعليم بمنطقة ...';
  worksheet.getCell(5, rightCol).value = `اسم المدرسة: ${profile.schoolName || '...'}`;
  worksheet.getCell(6, rightCol).value = `فرع المدرسة: ${profile.branch || '...'}`;

  [1, 2, 3, 4, 5, 6].forEach(r => {
    const cell = worksheet.getCell(r, rightCol);
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // 2. Center: School Logo + Title
  const centerCol = Math.max(3, Math.ceil(colCount / 2));
  const logoData = profile.logoImg || profile.logo;

  if (logoData && typeof logoData === 'string' && logoData.startsWith('data:image/')) {
    try {
      const match = logoData.match(/^data:image\/([a-zA-Z0-9\+\.]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpeg' : 'png';
        const imageId = workbook.addImage({
          base64: match[2],
          extension: ext as any,
        });
        worksheet.addImage(imageId, {
          tl: { col: centerCol - 0.7, row: 0.2 },
          ext: { width: 50, height: 50 }
        });
      }
    } catch (e) {
      console.error('Error adding logo to Excel:', e);
    }
  }

  // Merged Title Banner
  const titleStartCol = Math.max(2, centerCol - 2);
  const titleEndCol = Math.min(colCount - 1, centerCol + 2);
  worksheet.mergeCells(3, titleStartCol, 5, titleEndCol);
  const titleCell = worksheet.getCell(3, titleStartCol);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0F7FF' }
  };
  titleCell.border = {
    top: { style: 'medium', color: { argb: 'FF3B82F6' } },
    bottom: { style: 'medium', color: { argb: 'FF3B82F6' } },
    left: { style: 'medium', color: { argb: 'FF3B82F6' } },
    right: { style: 'medium', color: { argb: 'FF3B82F6' } }
  };

  // 3. Left Side: Day & Dates
  const leftCol = colCount;
  worksheet.getCell(1, leftCol).value = `اليوم: ${dayName}`;
  worksheet.getCell(2, leftCol).value = `التاريخ الهجري: ${hijri}`;
  worksheet.getCell(3, leftCol).value = `التاريخ الميلادي: ${todayDate}`;

  [1, 2, 3].forEach(r => {
    const cell = worksheet.getCell(r, leftCol);
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Optional: Banner above table for period or sub-title
  if (subTitle || periodText) {
    worksheet.getRow(7).height = 24;
    worksheet.mergeCells(7, 1, 7, colCount);
    const subCell = worksheet.getCell(7, 1);
    subCell.value = subTitle ? (periodText ? `${subTitle} - ${periodText}` : subTitle) : periodText;
    subCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1E40AF' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' }
    };
    subCell.border = {
      top: { style: 'thin', color: { argb: 'FFBAE6FD' } },
      bottom: { style: 'thin', color: { argb: 'FFBAE6FD' } },
      left: { style: 'thin', color: { argb: 'FFBAE6FD' } },
      right: { style: 'thin', color: { argb: 'FFBAE6FD' } }
    };
  }
};

/**
 * Standard Footer application
 */
export const applyStyledFooter = (
  worksheet: ExcelJS.Worksheet,
  options: {
    colCount: number;
    profile: SchoolExportProfile;
    managerLabel?: string;
  }
) => {
  const { colCount, profile, managerLabel = 'مدير الفرع' } = options;
  const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 10;
  const footerStart = lastRow + 2;
  worksheet.getRow(footerStart).height = 36;

  // In RTL:
  // Right side = Column 1 (مدير الفرع)
  // Center = Math.ceil(colCount / 2) (ختم المدرسة)
  // Left side = Column colCount (اسم كاتب التقرير)
  const centerCol = Math.max(3, Math.ceil(colCount / 2));

  const managerCell = worksheet.getCell(footerStart, 1);
  managerCell.value = `${managerLabel}: ${profile.branchManager || '...'}`;
  managerCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF0F172A' } };
  managerCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const stampCell = worksheet.getCell(footerStart, centerCol);
  stampCell.value = 'ختم المدرسة';
  stampCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF64748B' } };
  stampCell.alignment = { horizontal: 'center', vertical: 'middle' };
  stampCell.border = {
    top: { style: 'dashDot', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'dashDot', color: { argb: 'FF94A3B8' } },
    left: { style: 'dashDot', color: { argb: 'FF94A3B8' } },
    right: { style: 'dashDot', color: { argb: 'FF94A3B8' } }
  };

  const writerCell = worksheet.getCell(footerStart, colCount);
  writerCell.value = `إعداد التقرير: ${profile.writerName || '...'}`;
  writerCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF0F172A' } };
  writerCell.alignment = { horizontal: 'left', vertical: 'middle' };
};

export const exportToStyledExcel = async (options: ExcelExportOptions) => {
  const { title, subTitle, periodText, filename, headers, data, profile, date = '', onRow, summaryRow } = options;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.substring(0, 31), {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });

  const colCount = Math.max(headers.length, 9);
  
  // Set Column Widths
  if (options.columnWidths) {
    options.columnWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });
  } else {
    for (let i = 1; i <= colCount; i++) {
      worksheet.getColumn(i).width = i === 2 ? 26 : 16;
    }
  }

  // Apply Header
  applyStyledHeaderAndFooter(worksheet, workbook, {
    title,
    subTitle,
    periodText,
    colCount,
    profile,
    date,
    managerLabel: options.managerLabel
  });

  // Table Start
  const startRowIndex = (subTitle || periodText) ? 8 : 7;
  const headerRow = worksheet.getRow(startRowIndex);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  // Data Rows
  data.forEach((rowData, idx) => {
    const excelRow = worksheet.addRow(rowData.map(v => (v && typeof v === 'object' && v.formula) ? v : v));
    excelRow.height = 24;
    const isEven = idx % 2 === 0;
    
    excelRow.eachCell((cell, colNumber) => {
      const rawVal = rowData[colNumber - 1];
      if (rawVal && typeof rawVal === 'object' && rawVal.formula) {
        cell.value = {
          formula: rawVal.formula,
          result: rawVal.result
        };
      }
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    if (onRow) {
      onRow(excelRow, rowData, idx);
    }
  });

  // Optional Summary Row
  if (summaryRow && summaryRow.length > 0) {
    const sumExcelRow = worksheet.addRow(summaryRow.map(v => (v && typeof v === 'object' && v.formula) ? v : v));
    sumExcelRow.height = 28;
    sumExcelRow.eachCell((cell, colNumber) => {
      const rawVal = summaryRow[colNumber - 1];
      if (rawVal && typeof rawVal === 'object' && rawVal.formula) {
        cell.value = {
          formula: rawVal.formula,
          result: rawVal.result
        };
      }
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFD97706' } },
        left: { style: 'thin', color: { argb: 'FFD97706' } },
        bottom: { style: 'double', color: { argb: 'FFD97706' } },
        right: { style: 'thin', color: { argb: 'FFD97706' } }
      };
    });
  }

  // Apply Footer
  applyStyledFooter(worksheet, {
    colCount,
    profile,
    managerLabel: options.managerLabel
  });

  // Save
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${filename}.xlsx`);
};
