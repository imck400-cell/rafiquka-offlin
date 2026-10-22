import React, { useState, useMemo, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, FileText, BookOpen, Star, ArrowRight,
  Download, Share2, Eye, X, Award, AlertCircle, Sparkles
} from 'lucide-react';
import { TeacherEvaluation } from '../types';
import { toHijri } from '../src/lib/excelExport';
import { shortCriteriaBlocks, extCriteriaBlocks, formatEvaluationToWhatsApp, normalizeSubject, matchSubjects, getEvaluationItemScore, isSameSchool } from './evaluationUtils';
import { subjectSkills } from './subjectSkills';

interface VisitsSummaryPageProps {
  onBack: () => void;
  selectedSchool: string;
  selectedBranch: string;
  onOpenVisit: (ev: TeacherEvaluation) => void;
}

export default function VisitsSummaryPage({
  onBack,
  selectedSchool,
  selectedBranch,
  onOpenVisit
}: VisitsSummaryPageProps) {
  const { data, currentUser, updateData, shareViaWhatsApp } = useGlobal();

  const [selectedType, setSelectedType] = useState<'all' | 'short' | 'ext' | 'subject' | null>('all');
  const [isSharing, setIsSharing] = useState(false);
  const [sharingStep, setSharingStep] = useState(0);

  // Filtering and Sorting States
  const [filterSemester, setFilterSemester] = useState<string>('الكل');
  const [filterSchool, setFilterSchool] = useState<string>('الكل');
  const [filterBranchState, setFilterBranchState] = useState<string>('الكل');
  const [filterEvaluator, setFilterEvaluator] = useState<string>('الكل');
  const [sortBy, setSortBy] = useState<string>('التاريخ'); // 'التاريخ', 'اسم المعلم', 'المادة', 'الصف', 'نسبة الأداء', 'المفصلة'
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<TeacherEvaluation | null>(null);

  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const availableSchools = isSuperAdmin ? data.availableSchools || [] : (currentUser?.schools || []);

  const normalizeSemester = (sem?: string): string => {
    if (!sem) return '';
    const s = sem.trim();
    if (s.includes('الأول') || s.includes('1')) return 'الفصل الأول';
    if (s.includes('الثاني') || s.includes('2')) return 'الفصل الثاني';
    if (s.includes('الثالث') || s.includes('3')) return 'الفصل الثالث';
    return s;
  };

  // Filter evaluations list based on user context and selection
  const allFilteredEvaluations = useMemo(() => {
    return (data.teacherEvaluations || []).filter(e => {
      if (!e) return false;
      const eSchool = (e.school || '').trim();
      const cleanAvailableSchools = (availableSchools || []).map((s: string) => (s || '').trim());

      // Basic accessibility check based on user list of allowed schools
      if (!isSuperAdmin && cleanAvailableSchools.length > 0 && !cleanAvailableSchools.includes('all')) {
        const matched = cleanAvailableSchools.some((s) => isSameSchool(s, eSchool));
        if (!matched) return false;
      }

      // Handle branch allowance for non-admins
      if (!isSuperAdmin) {
        const rawBranches = currentUser?.permissions?.schoolsAndBranches?.[e.school] || currentUser?.permissions?.schoolsAndBranches?.[eSchool] || [];
        const authorizedBranches = (rawBranches || []).map((b: string) => (b || '').trim());
        if (authorizedBranches.length > 0 && e.branch) {
          const eBranch = e.branch.trim();
          if (!authorizedBranches.includes(eBranch) && !authorizedBranches.includes('all')) {
            return false;
          }
        }

        const supervisorGrades = (currentUser?.grades || []).map((g: string) => (g || '').trim());
        if (supervisorGrades.length > 0 && e.className) {
          const hasGradeOverlap = supervisorGrades.some((g: string) => e.className.includes(g));
          if (!hasGradeOverlap) return false;
        }

        const supervisorSubjects = (currentUser?.subjects || []).map((s: string) => (s || '').trim());
        if (supervisorSubjects.length > 0 && e.subject) {
          const eSub = e.subject.trim();
          if (!supervisorSubjects.some((s: string) => matchSubjects(s, eSub))) {
            return false;
          }
        }
      }
      return true;
    });
  }, [data.teacherEvaluations, availableSchools, isSuperAdmin, currentUser]);

  // Totals for each type
  const shortCount = useMemo(() => allFilteredEvaluations.filter(e => e.evaluationType === 'short').length, [allFilteredEvaluations]);
  const extCount = useMemo(() => allFilteredEvaluations.filter(e => e.evaluationType === 'ext').length, [allFilteredEvaluations]);
  const subjectCount = useMemo(() => allFilteredEvaluations.filter(e => e.evaluationType === 'subject').length, [allFilteredEvaluations]);

  // Current evaluations inside the active grid table view based on selectedType
  const activeTypeEvaluations = useMemo(() => {
    if (!selectedType || selectedType === 'all') return allFilteredEvaluations;
    return allFilteredEvaluations.filter(e => e.evaluationType === selectedType);
  }, [allFilteredEvaluations, selectedType]);

  // Dynamic branch list according to selected permissions
  const activeBranchList = useMemo(() => {
    const schoolKey = filterSchool !== 'الكل' ? filterSchool : selectedSchool;
    let branches: string[] = [];
    if (schoolKey !== 'الكل' && schoolKey) {
      branches = data.schoolBranches?.[schoolKey] || [];
    } else {
      const allBranches = new Set<string>();
      availableSchools.forEach((s: string) => {
        const schoolBranches = data.schoolBranches?.[s] || [];
        schoolBranches.forEach((b: string) => allBranches.add(b));
      });
      branches = Array.from(allBranches);
    }

    // Limit based on user's authorized branches if not a super admin
    if (!isSuperAdmin && schoolKey && schoolKey !== 'الكل') {
      const authorizedBranches = currentUser?.permissions?.schoolsAndBranches?.[schoolKey] || [];
      if (authorizedBranches.length > 0) {
        return branches.filter(b => authorizedBranches.includes(b));
      }
    }
    return branches;
  }, [data.schoolBranches, filterSchool, selectedSchool, availableSchools, isSuperAdmin, currentUser]);

  const uniqueEvaluators = useMemo(() => {
    return Array.from(
      new Set(
        activeTypeEvaluations
          .filter((e) => {
            if (filterSemester !== 'الكل' && e.semester !== filterSemester && normalizeSemester(e.semester) !== normalizeSemester(filterSemester)) return false;
            if (filterSchool !== 'الكل' && !isSameSchool(e.school, filterSchool)) return false;
            if (filterBranchState !== 'الكل' && e.branch !== filterBranchState) return false;
            return e.evaluatorName;
          })
          .map((e) => e.evaluatorName)
      )
    ).filter(Boolean);
  }, [activeTypeEvaluations, filterSemester, filterSchool, filterBranchState]);

  // Apply visual filters inside details view
  const finalFilteredEvaluations = useMemo(() => {
    let result = [...activeTypeEvaluations];

    if (filterSemester !== 'الكل') {
      const normTarget = normalizeSemester(filterSemester);
      result = result.filter(e => e.semester === filterSemester || normalizeSemester(e.semester) === normTarget);
    }

    if (filterSchool !== 'الكل') {
      const targetSchool = filterSchool.trim();
      result = result.filter(e => isSameSchool(e.school, targetSchool));
    }

    if (filterBranchState !== 'الكل') {
      const targetBranch = filterBranchState.trim();
      result = result.filter(e => (e.branch || '').trim() === targetBranch || (e.branch || '').includes(targetBranch));
    }

    if (filterEvaluator !== 'الكل') {
      result = result.filter(e => (e.evaluatorName || '').trim() === filterEvaluator.trim());
    }

    return result;
  }, [activeTypeEvaluations, filterSemester, filterSchool, filterBranchState, filterEvaluator]);

  // Bookmarking/Favorite System using local storage for per-user synchronization and database resiliency
  const [favoriteList, setFavoriteList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`bookmark_evals_${currentUser?.id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`bookmark_evals_${currentUser?.id || 'guest'}`);
      setFavoriteList(stored ? JSON.parse(stored) : []);
    } catch {
      setFavoriteList([]);
    }
  }, [currentUser]);

  const isStarred = (id: string) => favoriteList.includes(id);

  const toggleStar = (id: string) => {
    setFavoriteList(prev => {
      const newList = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem(`bookmark_evals_${currentUser?.id || 'guest'}`, JSON.stringify(newList));
      } catch (e) {
        console.error(e);
      }
      return newList;
    });
  };

  const getCriteriaBlocksForReport = (ev: TeacherEvaluation) => {
    const baseBlocks = ev.evaluationType === 'short' ? shortCriteriaBlocks : extCriteriaBlocks;

    // Fetch configuration of custom criteria for this school-branch
    const computedConfig = data.customSupervisionCriteria?.find(
      (c: any) => c.school === ev.school && c.branch === ev.branch
    );

    let resolvedBlocks = baseBlocks;
    if (computedConfig) {
      if (ev.evaluationType === 'short' && computedConfig.shortCriteriaBlocks) {
        resolvedBlocks = computedConfig.shortCriteriaBlocks;
      } else if ((ev.evaluationType === 'ext' || ev.evaluationType === 'subject') && computedConfig.extCriteriaBlocks) {
        resolvedBlocks = computedConfig.extCriteriaBlocks;
      }
    }

    const blocksCopy = JSON.parse(JSON.stringify(resolvedBlocks));

    if (ev.evaluationType === 'subject' && ev.subject && ev.subSubject) {
      const computedSubjectSkills = computedConfig?.subjectSkills || subjectSkills;
      if (computedSubjectSkills[ev.subject] && computedSubjectSkills[ev.subject][ev.subSubject]) {
        const skills = computedSubjectSkills[ev.subject][ev.subSubject];
        const newBlock = {
          title: 'مهارات المادة والفرع',
          items: skills
        };
        const insertIndex = blocksCopy.findIndex((b: any) => b.title.includes('الاستراتيجات و'));
        if (insertIndex !== -1) {
          blocksCopy.splice(insertIndex, 0, newBlock);
        } else {
          blocksCopy.push(newBlock);
        }
      }
    }

    return blocksCopy;
  };

  // Percentage Calculation logic
  const calculateReportPercentage = (ev: TeacherEvaluation): number => {
    if (ev.percentage !== undefined && ev.percentage !== null && !isNaN(Number(ev.percentage)) && Number(ev.percentage) > 0) {
      return Math.round(Number(ev.percentage));
    }
    const blocks = getCriteriaBlocksForReport(ev);
    let totalItems = 0;
    let earnedPoints = 0;

    blocks.forEach((block: any, bIdx: number) => {
      block.items.forEach((item: string, iIdx: number) => {
        totalItems++;
        const score = getEvaluationItemScore(ev, item, bIdx, iIdx, blocks);
        if (score !== undefined) {
          earnedPoints += score;
        }
      });
    });

    if (totalItems === 0) {
      return 0;
    }
    return Math.round((earnedPoints / (totalItems * 4)) * 100);
  };

  // Soritng Logic supporting Arabic collation localeCompare
  const sortedEvaluations = useMemo(() => {
    const list = [...finalFilteredEvaluations];

    if (sortBy === 'التاريخ') {
      // Default: Newest dates first
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    if (sortBy === 'اسم المعلم') {
      return list.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
    }
    if (sortBy === 'المادة') {
      return list.sort((a, b) => a.subject.localeCompare(b.subject, 'ar'));
    }
    if (sortBy === 'الصف') {
      return list.sort((a, b) => a.className.localeCompare(b.className, 'ar'));
    }
    if (sortBy === 'نسبة الأداء') {
      return list.sort((a, b) => calculateReportPercentage(b) - calculateReportPercentage(a));
    }
    if (sortBy === 'المفضلة') {
      return list.sort((a, b) => {
        const starA = isStarred(a.id) ? 1 : 0;
        const starB = isStarred(b.id) ? 1 : 0;
        return starB - starA;
      });
    }

    return list;
  }, [finalFilteredEvaluations, sortBy, favoriteList]);

  // Export excel matching the design and layout instructions
  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const typeLabel =
        selectedType === "all"
          ? "خلاصة جميع الزيارات الإشرافية"
          : selectedType === "short"
            ? "التقييم المختصر لزيارة صفية"
            : selectedType === "ext"
              ? "التقييم الموسع لزيارة صفية"
              : "التقييم بحسب المادة لزيارة صفية";

      const sheetName =
        selectedType === "all"
          ? "جميع الزيارات"
          : selectedType === "short"
            ? "الخلاصة المختصرة"
            : selectedType === "ext"
              ? "الخلاصة الموسعة"
              : "الخلاصة بحسب المادة";

      const sheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
      });

      // Fetch School context Profile detail
      const schoolContext = filterSchool !== 'الكل' ? filterSchool : selectedSchool;
      const branchContext = filterBranchState !== 'الكل' ? filterBranchState : selectedBranch;

      const profileInfo = data.profiles?.[schoolContext] || data.profile || {};
      const resolvedProfile = branchContext && profileInfo[branchContext] ? profileInfo[branchContext] : profileInfo;

      const ministry = resolvedProfile.ministry || 'الجمهـورية اليمنية\nوزارة التربية والتعـليم والبحث العلمي';
      const district = resolvedProfile.district || 'مكتب التربية والتعليم بالأمانة';
      const managerName = resolvedProfile.branchManager || '......................';
      const logoImg = resolvedProfile.logoImg || '';

      const headers = [
        "مفضلة",
        "اسم المعلم",
        "اسم المدرسة",
        "الفرع",
        "التاريخ",
        "الفصل الدراسي",
        "المادة",
        "الصف",
        "نسبة الأداء"
      ];

      // Set column widths
      for (let i = 1; i <= headers.length; i++) {
        sheet.getColumn(i).width = 17;
      }

      // Explicitly set heights on header rows to isolate Logo and Title blocks cleanly and avoid overlap
      sheet.getRow(1).height = 20;
      sheet.getRow(2).height = 20;
      sheet.getRow(3).height = 20;
      sheet.getRow(4).height = 22;
      sheet.getRow(5).height = 22;
      sheet.getRow(6).height = 22;

      // 1. Header Left & Right Layout (Merged Rows 1-6)
      sheet.mergeCells(1, 1, 6, 2);
      sheet.getCell(1, 1).value = `الجمهـورية اليمنية\n${resolvedProfile.ministry || 'وزارة التربية والتعـليم والبحث العلمي'}\nتوجيه الإشراف والتقييم بالأمانة\nمنطقة: ${resolvedProfile.district || 'شعوب'}\nمدرسة: ${schoolContext}\nالفرع: ${branchContext || 'الرئيسي'}`;
      sheet.getCell(1, 1).alignment = { wrapText: true, horizontal: "right", vertical: "top" };
      sheet.getCell(1, 1).font = { bold: true, name: 'Arial', size: 9 };

      // Center title and logo inside Excel (Logo top-center, title beneath it)
      sheet.mergeCells(1, 4, 3, 6);
      sheet.mergeCells(4, 3, 6, 7);

      const titleCell = sheet.getCell(4, 3);
      titleCell.value = `نظام رفيق الإشرافي\n${typeLabel}`;
      titleCell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      titleCell.font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FF1E40AF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F7FF' }
      };

      // Handle custom user logo
      if (logoImg && logoImg.startsWith('data:image')) {
        try {
          const imageId = workbook.addImage({
            base64: logoImg.split(',')[1],
            extension: 'png',
          });
          sheet.addImage(imageId, 'D1:F3');
        } catch (e) {
          console.error("Error setting logo sheet image", e);
        }
      }

      // Left site: dates
      sheet.mergeCells(1, 8, 6, 9);
      const todayDate = new Date().toISOString().split('T')[0];
      const hijriDate = toHijri(todayDate);
      const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
      sheet.getCell(1, 8).value = `اليوم: ${dayName}\nالهجري: ${hijriDate}\nالميلادي: ${todayDate}`;
      sheet.getCell(1, 8).alignment = { wrapText: true, horizontal: "left", vertical: "top" };
      sheet.getCell(1, 8).font = { bold: true, name: 'Arial', size: 9 };

      // Empty spacing rows
      sheet.addRow([]);

      // 2. Add Header values row
      const headerRow = sheet.addRow(headers);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E40AF' } // Deep Blue
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // 3. Populate rows with values
      sortedEvaluations.forEach((ev, idx) => {
        const isFav = isStarred(ev.id) ? "★ نعم" : "☆";
        const performanceVal = calculateReportPercentage(ev) / 100;

        const rowValues = [
          isFav,
          ev.teacherName,
          ev.school,
          ev.branch || "الرئيسي",
          ev.date,
          ev.semester,
          ev.subject,
          ev.className,
          performanceVal
        ];

        const row = sheet.addRow(rowValues);
        row.height = 25;
        const isEven = idx % 2 === 0;

        row.eachCell((cell, colIdx) => {
          let align: any = { horizontal: 'center', vertical: 'middle' };
          if (colIdx === 2) align = { horizontal: 'right', vertical: 'middle' }; // Name RTL right align

          cell.alignment = align;
          cell.font = { name: 'Arial', size: 10 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Performance cell text highlight coloring
          if (colIdx === headers.length) {
            const val = calculateReportPercentage(ev);
            let color = 'FF1E293B'; // Default dark gray
            if (val >= 90) color = 'FF16A34A'; // Green
            else if (val >= 75) color = 'FF2563EB'; // Blue
            else if (val >= 50) color = 'FFD97706'; // Amber
            else color = 'FFDC2626'; // Red
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: color } };
            cell.numFmt = '0%';
          }
        });
      });

      if (sortedEvaluations.length > 0) {
        const totalPerc = sortedEvaluations.reduce((acc, ev) => acc + calculateReportPercentage(ev), 0);
        const avgRow = sheet.addRow([
          '', '', '', '', '', '', '',
          'متوسط نسبة الأداء',
          { formula: `IFERROR(AVERAGE(I9:I${sheet.lastRow.number}), 0)`, result: totalPerc / sortedEvaluations.length / 100 }
        ]);

        avgRow.height = 28;
        avgRow.eachCell((cell, colIdx) => {
          if (colIdx === headers.length - 1) {
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } };
          }
          if (colIdx === headers.length) {
            cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E40AF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin', color: { argb: 'FF1E40AF' } }, bottom: { style: 'thin', color: { argb: 'FF1E40AF' } }, left: { style: 'thin', color: { argb: 'FF1E40AF' } }, right: { style: 'thin', color: { argb: 'FF1E40AF' } } };
            cell.numFmt = '0%';
          }
        });
      }

      // 4. Footer signature text
      const lastRowIndex = sheet.lastRow ? sheet.lastRow.number : 10;
      const footerRowIndex = lastRowIndex + 2;
      sheet.getRow(footerRowIndex).height = 35;

      // Rightmost signature field (Column 1)
      const footerManagerCell = sheet.getCell(footerRowIndex, 1);
      footerManagerCell.value = `مدير الفرع: ${managerName}`;
      footerManagerCell.font = { bold: true, name: 'Arial', size: 11 };
      footerManagerCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Leftmost signature field (Column 9)
      const footerWriterCell = sheet.getCell(footerRowIndex, headers.length);
      footerWriterCell.value = `معد التقرير: ${currentUser?.name || '...'}`;
      footerWriterCell.font = { bold: true, name: 'Arial', size: 11 };
      footerWriterCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${sheetName}_${schoolContext}.xlsx`);
    } catch (err) {
      console.error("Error exporting to Excel", err);
      alert("حدث خطأ أثناء محاولة تصدير ملف الإكسل.");
    }
  };

  // WhatsApp formatted string generator with customized informative emojis
  const handleExportWhatsApp = (ev: TeacherEvaluation) => {
    const msg = formatEvaluationToWhatsApp(ev, data.customSupervisionCriteria || []);
    shareViaWhatsApp(msg);
  };

  const handleExportSingleVisitExcel = async (ev: TeacherEvaluation) => {
    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const sheetName = ev.evaluationType === 'short' ? 'التقييم المختصر'
        : ev.evaluationType === 'ext' ? 'التقييم الموسع'
          : 'التقييم حسب المادة';
      const sheet = workbook.addWorksheet(sheetName, {
        views: [{ rightToLeft: true }]
      });

      const profile = data.profiles?.[ev.school] || data.profile || {};
      const resolvedProfile = ev.branch && profile[ev.branch] ? profile[ev.branch] : profile;

      // Header block (Rows 1-6)
      sheet.mergeCells(1, 1, 6, 3);
      sheet.getCell(1, 1).value = `الجمهـورية اليمنية\n${resolvedProfile.ministry || 'وزارة التربية والتعـليم والبحث العلمي'}\nتوجيه الإشراف والتقييم بالأمانة\nمنطقة: ${resolvedProfile.district || 'شعوب'}\nمدرسة: ${ev.school}\nالفرع: ${ev.branch || 'الرئيسي'}`;
      sheet.getCell(1, 1).alignment = { wrapText: true, horizontal: "right", vertical: "top" };
      sheet.getCell(1, 1).font = { bold: true, name: 'Arial', size: 9 };

      // Left site: dates
      sheet.mergeCells(1, 6, 6, 7);
      const todayDate = new Date().toISOString().split('T')[0];
      const hijriDate = toHijri(todayDate);
      const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
      sheet.getCell(1, 6).value = `اليوم: ${dayName}\nالهجري: ${hijriDate}\nالميلادي: ${todayDate}`;
      sheet.getCell(1, 6).alignment = { wrapText: true, horizontal: "left", vertical: "top" };
      sheet.getCell(1, 6).font = { bold: true, name: 'Arial', size: 9 };

      // Center title/logo
      sheet.mergeCells(1, 4, 3, 5);
      sheet.mergeCells(4, 4, 6, 5);
      const titleCell = sheet.getCell(4, 4);
      titleCell.value = `نظام رفيق الإشرافي\n${sheetName}`;
      titleCell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
      titleCell.font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FF1E40AF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F7FF' }
      };

      if (resolvedProfile.logoImg && resolvedProfile.logoImg.startsWith('data:image')) {
        try {
          const imageId = workbook.addImage({
            base64: resolvedProfile.logoImg.split(',')[1],
            extension: 'png',
          });
          sheet.addImage(imageId, 'D1:E3');
        } catch (e) {
          console.error("Error setting logo sheet image", e);
        }
      }

      sheet.addRow([]); // Row 7 empty space

      // Info Grid
      const p1 = sheet.addRow(['اسم المعلم', ev.teacherName, 'المشرف التربوي', ev.evaluatorName || '']);
      const p2 = sheet.addRow(['المادة', ev.subSubject ? `${ev.subject} - ${ev.subSubject}` : ev.subject, 'نوع الزيارة', ev.visitType || 'صفية']);
      const p3 = sheet.addRow(['الصف', ev.className, 'الشعبة', ev.section || '1', 'الحصة', ev.period || '']);
      const p4 = sheet.addRow(['اسم الدرس', ev.lessonName || '', 'التاريخ', ev.date]);
      const p5 = sheet.addRow(['الفصل الدراسي', ev.semester, 'العام الدراسي', ev.academicYear || '']);

      [p1, p2, p3, p4, p5].forEach(row => {
        row.font = { bold: true, size: 10 };
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      sheet.addRow([]); // empty spacing

      const headerRow = sheet.addRow(['م', 'مجال التقييم', 'العنصر', 'الدرجة (0-4)']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // Blue-700
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      let sr = 1;
      const activeBlocks = getCriteriaBlocksForReport(ev);
      activeBlocks.forEach((block: any, bIdx: number) => {
        block.items.forEach((item: string, idx: number) => {
          const scoreVal = getEvaluationItemScore(ev, item, bIdx, idx, activeBlocks);
          const score = scoreVal !== undefined ? scoreVal : '';
          const row = sheet.addRow([sr++, idx === 0 ? block.title : '', item, score]);

          let color = 'FFFFFFFF';
          if (score === 0) color = 'FF991B1B'; // red-800
          else if (score === 1) color = 'FFF87171'; // red-400
          else if (score === 2) color = 'FFFACC15'; // yellow-400
          else if (score === 3) color = 'FF3B82F6'; // blue-500
          else if (score === 4) color = 'FF22C55E'; // green-500

          const scoreCell = row.getCell(4);
          if (score !== '') {
            scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            scoreCell.font = { bold: true, color: { argb: score === 2 ? 'FF000000' : 'FFFFFFFF' } };
          }
          row.eachCell((cell, cIdx) => {
            cell.alignment = { horizontal: cIdx === 3 ? 'right' : 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        });
      });

      const scoreStartRow = headerRow.number + 1;
      const scoreEndRow = sheet.lastRow ? sheet.lastRow.number : scoreStartRow;

      sheet.addRow([]);
      const totalRow = sheet.addRow(['', 'النسبة المئوية النهائية', '', { formula: `IFERROR(ROUND(SUM(D${scoreStartRow}:D${scoreEndRow})/(COUNT(D${scoreStartRow}:D${scoreEndRow})*4)*100,0)&"%", "0%")`, result: `${calculateReportPercentage(ev)}%` }]);
      totalRow.font = { bold: true, size: 12 };
      sheet.mergeCells(`B${totalRow.number}:C${totalRow.number}`);

      sheet.addRow([]);
      if (ev.strategies) sheet.addRow(['أهم الاستراتيجيات', ev.strategies]);
      if (ev.tools) sheet.addRow(['أهم الوسائل', ev.tools]);
      if (ev.sources) sheet.addRow(['أهم المصادر', ev.sources]);
      if (ev.programs) sheet.addRow(['البرامج المنفذة', ev.programs]);

      sheet.addRow([]);
      sheet.addRow(['الإيجابيات / القوة', ev.strengths || '']);
      sheet.addRow(['الملاحظات للتحسين', ev.improvements || '']);
      sheet.addRow(['التوصيات الإجرائية', ev.recommendations || '']);
      if (ev.employeeComment) sheet.addRow(['تعليق الموظف', ev.employeeComment]);
      if (ev.notes) sheet.addRow(['ملاحظات إضافية', ev.notes]);

      sheet.addRow([]);
      const footerRow = sheet.addRow([]);
      footerRow.getCell(1).value = "مدون التقرير (المشرف):";
      footerRow.getCell(2).value = ev.evaluatorName || currentUser?.name || "";
      footerRow.getCell(5).value = "مدير الفرع:";
      footerRow.getCell(6).value = resolvedProfile.branchManager || "";

      sheet.columns.forEach((column, i) => {
        const colIdx = i + 1;
        if (colIdx === 3) {
          column.width = 40;
        } else if (colIdx === 2) {
          column.width = 25;
        } else {
          column.width = 15;
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `زيارة_${ev.teacherName}_${ev.date}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير ملف الإكسل للزيارة');
    }
  };

  const handleExportAllDetailedExcel = async () => {
    if (sortedEvaluations.length === 0) {
      alert("لا توجد زيارات لتصديرها.");
      return;
    }

    try {
      const ExcelJS = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();

      for (let idx = 0; idx < sortedEvaluations.length; idx++) {
        const ev = sortedEvaluations[idx];

        let rawName = `${idx + 1}-${ev.teacherName.substring(0, 15)}_${ev.date}`;
        let sheetName = rawName.replace(/[\\\/*?:\[\]]/g, '').substring(0, 31);

        const sheet = workbook.addWorksheet(sheetName, {
          views: [{ rightToLeft: true }]
        });

        const profile = data.profiles?.[ev.school] || data.profile || {};
        const resolvedProfile = ev.branch && profile[ev.branch] ? profile[ev.branch] : profile;

        // Header block (Rows 1-6)
        sheet.mergeCells(1, 1, 6, 3);
        sheet.getCell(1, 1).value = `الجمهـورية اليمنية\n${resolvedProfile.ministry || 'وزارة التربية والتعـليم والبحث العلمي'}\nتوجيه الإشراف والتقييم بالأمانة\nمنطقة: ${resolvedProfile.district || 'شعوب'}\nمدرسة: ${ev.school}\nالفرع: ${ev.branch || 'الرئيسي'}`;
        sheet.getCell(1, 1).alignment = { wrapText: true, horizontal: "right", vertical: "top" };
        sheet.getCell(1, 1).font = { bold: true, name: 'Arial', size: 9 };

        // Left site: dates
        sheet.mergeCells(1, 6, 6, 7);
        const todayDate = new Date().toISOString().split('T')[0];
        const hijriDate = toHijri(todayDate);
        const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
        sheet.getCell(1, 6).value = `اليوم: ${dayName}\nالهجري: ${hijriDate}\nالميلادي: ${todayDate}`;
        sheet.getCell(1, 6).alignment = { wrapText: true, horizontal: "left", vertical: "top" };
        sheet.getCell(1, 6).font = { bold: true, name: 'Arial', size: 9 };

        // Center title/logo
        sheet.mergeCells(1, 4, 3, 5);
        sheet.mergeCells(4, 4, 6, 5);
        const titleCell = sheet.getCell(4, 4);
        const typeTitle = ev.evaluationType === 'short' ? 'التقييم المختصر'
          : ev.evaluationType === 'ext' ? 'التقييم الموسع'
            : 'التقييم حسب المادة';
        titleCell.value = `تقرير مؤشرات الأداء والتشخيص التربوي\n${typeTitle}`;
        titleCell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        titleCell.font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FF1E40AF' } };
        titleCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F7FF' }
        };

        if (resolvedProfile.logoImg && resolvedProfile.logoImg.startsWith('data:image')) {
          try {
            const imageId = workbook.addImage({
              base64: resolvedProfile.logoImg.split(',')[1],
              extension: 'png',
            });
            sheet.addImage(imageId, {
              tl: { col: 3, row: 0 },
              br: { col: 5, row: 3 },
              editAs: 'oneCell'
            } as any);
          } catch (e) {
            console.error("Error setting logo sheet image", e);
          }
        }

        sheet.addRow([]);

        // Info Grid
        const p1 = sheet.addRow(['اسم المعلم', ev.teacherName, 'المشرف التربوي', ev.evaluatorName || '']);
        const p2 = sheet.addRow(['المادة', ev.subSubject ? `${ev.subject} - ${ev.subSubject}` : ev.subject, 'نوع الزيارة', ev.visitType || 'صفية']);
        const p3 = sheet.addRow(['الصف', ev.className, 'الشعبة', ev.section || '1', 'الحصة', ev.period || '']);
        const p4 = sheet.addRow(['اسم الدرس', ev.lessonName || '', 'التاريخ', ev.date]);
        const p5 = sheet.addRow(['الفصل الدراسي', ev.semester, 'العام الدراسي', ev.academicYear || '']);

        [p1, p2, p3, p4, p5].forEach(row => {
          row.font = { bold: true, size: 10 };
          row.eachCell(cell => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        });

        sheet.addRow([]);

        const headerRow = sheet.addRow(['م', 'مجال التقييم', 'العنصر', 'الدرجة (0-4)']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; // Blue-700
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        let sr = 1;
        const activeBlocks = getCriteriaBlocksForReport(ev);
        activeBlocks.forEach((block: any, bIdx: number) => {
          block.items.forEach((item: string, idx: number) => {
            const scoreVal = getEvaluationItemScore(ev, item, bIdx, idx, activeBlocks);
            const score = scoreVal !== undefined ? scoreVal : '';
            const row = sheet.addRow([sr++, idx === 0 ? block.title : '', item, score]);

            let color = 'FFFFFFFF';
            if (score === 0) color = 'FF991B1B'; // red-800
            else if (score === 1) color = 'FFF87171'; // red-400
            else if (score === 2) color = 'FFFACC15'; // yellow-400
            else if (score === 3) color = 'FF3B82F6'; // blue-500
            else if (score === 4) color = 'FF22C55E'; // green-500

            const scoreCell = row.getCell(4);
            if (score !== '') {
              scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
              scoreCell.font = { bold: true, color: { argb: score === 2 ? 'FF000000' : 'FFFFFFFF' } };
            }
            row.eachCell((cell, cIdx) => {
              cell.alignment = { horizontal: cIdx === 3 ? 'right' : 'center', vertical: 'middle' };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
              };
            });
          });
        });

        const scoreStartRow = headerRow.number + 1;
        const scoreEndRow = sheet.lastRow ? sheet.lastRow.number : scoreStartRow;

        sheet.addRow([]);
        const totalRow = sheet.addRow(['', 'النسبة المئوية النهائية', '', { formula: `IFERROR(ROUND(SUM(D${scoreStartRow}:D${scoreEndRow})/(COUNT(D${scoreStartRow}:D${scoreEndRow})*4)*100,0)&"%", "0%")`, result: `${calculateReportPercentage(ev)}%` }]);
        totalRow.font = { bold: true, size: 12 };
        sheet.mergeCells(`B${totalRow.number}:C${totalRow.number}`);

        sheet.addRow([]);
        if (ev.strategies) sheet.addRow(['أهم الاستراتيجيات', ev.strategies]);
        if (ev.tools) sheet.addRow(['أهم الوسائل', ev.tools]);
        if (ev.sources) sheet.addRow(['أهم المصادر', ev.sources]);
        if (ev.programs) sheet.addRow(['البرامج المنفذة', ev.programs]);

        sheet.addRow([]);
        sheet.addRow(['الإيجابيات / القوة', ev.strengths || '']);
        sheet.addRow(['الملاحظات للتحسين', ev.improvements || '']);
        sheet.addRow(['التوصيات الإجرائية', ev.recommendations || '']);
        if (ev.employeeComment) sheet.addRow(['تعليق الموظف', ev.employeeComment]);
        if (ev.notes) sheet.addRow(['ملاحظات إضافية', ev.notes]);

        sheet.addRow([]);
        const footerRow = sheet.addRow([]);
        footerRow.getCell(1).value = "مدون التقرير (المشرف):";
        footerRow.getCell(2).value = ev.evaluatorName || currentUser?.name || "";
        footerRow.getCell(5).value = "مدير الفرع:";
        footerRow.getCell(6).value = resolvedProfile.branchManager || "";

        sheet.columns.forEach((column, i) => {
          const colIdx = i + 1;
          if (colIdx === 3) {
            column.width = 40;
          } else if (colIdx === 2) {
            column.width = 25;
          } else {
            column.width = 15;
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const schoolContext = filterSchool !== 'الكل' ? filterSchool : selectedSchool;
      saveAs(new Blob([buffer]), `تصدير_عام_للتفاصيل_${schoolContext}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة التصدير العام للزيارات.');
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الزيارة نهائياً؟ سيتم إزالتها من الأرشيف بالكامل ولا يمكن استرجاعها.")) {
      return;
    }
    try {
      const prevEvals = data.teacherEvaluations || [];
      const updatedEvals = prevEvals.filter(e => e.id !== visitId);
      await updateData({ teacherEvaluations: updatedEvals });
      alert("تم حذف الزيارة بنجاح.");
      if (selectedReportForPreview?.id === visitId) {
        setSelectedReportForPreview(null);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء محاولة حذف الزيارة.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg font-arabic text-right max-w-7xl mx-auto" dir="rtl">

      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={32} />
            خلاصة الزيارات الإشرافية
          </h1>
          <p className="text-slate-500 font-semibold mt-1">تتبع وإحصاءات الزيارات وملخص دقيق لنسب الأداء والتقييمات</p>
        </div>

        {selectedType ? (
          <button
            onClick={() => setSelectedType(null)}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-xl font-bold transition-all text-sm hover:underline"
          >
            ← عودة لشاشة البطاقات
          </button>
        ) : (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-all text-sm"
          >
            ← رجوع للإشراف التربوي
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedType ? (

          /* VIEW 1: Summary Bento Cards View */
          <motion.div
            key="bento"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Card 1: التقييم المختصر لزيارة صفية */}
              <div
                onClick={() => setSelectedType('short')}
                className="group p-8 rounded-2xl border border-blue-100/40 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 text-slate-800 hover:text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[180px]"
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-blue-100/80 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                    <ClipboardList size={32} className="text-blue-600 group-hover:text-blue-100" />
                  </div>
                  <span className="text-xs font-black bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full group-hover:bg-blue-500 group-hover:text-white">نموذج فوري</span>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-black mb-2">التقييم المختصر لزيارة صفية</h3>
                  <p className="text-slate-600 group-hover:text-blue-100 text-sm font-semibold mb-4">تقييم سريع وبسيط للجوانب السلوكية والنشاطية.</p>
                  <div className="text-lg font-bold border-t border-slate-200/50 group-hover:border-blue-500 pt-3">
                    إجمالي الزيارات: <span className="text-blue-700 group-hover:text-amber-300 font-extrabold text-2xl">{shortCount}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: التقييم الموسع لزيارة صفية */}
              <div
                onClick={() => setSelectedType('ext')}
                className="group p-8 rounded-2xl border border-blue-100/40 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 text-slate-800 hover:text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[180px]"
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-blue-100/80 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                    <FileText size={32} className="text-blue-600 group-hover:text-blue-100" />
                  </div>
                  <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full group-hover:bg-blue-500 group-hover:text-white">نموذج مفصل</span>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-black mb-2">التقييم الموسع لزيارة صفية</h3>
                  <p className="text-slate-600 group-hover:text-blue-100 text-sm font-semibold mb-4">تفاصيل إضافية حول التخطيط المدرسي وطرق التعليم الذكية.</p>
                  <div className="text-lg font-bold border-t border-slate-200/50 group-hover:border-blue-500 pt-3">
                    إجمالي الزيارات: <span className="text-blue-700 group-hover:text-amber-300 font-extrabold text-2xl">{extCount}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: التقييم بحسب المادة لزيارة صفية */}
              <div
                onClick={() => setSelectedType('subject')}
                className="group p-8 rounded-2xl border border-blue-100/40 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 text-slate-800 hover:text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[180px]"
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-blue-100/80 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                    <BookOpen size={32} className="text-blue-600 group-hover:text-blue-100" />
                  </div>
                  <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full group-hover:bg-blue-500 group-hover:text-white">نموذج مهاري</span>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-black mb-2">التقييم بحسب المادة لزيارة صفية</h3>
                  <p className="text-slate-600 group-hover:text-blue-100 text-sm font-semibold mb-4">تصنيف دقيق يغطي كفايات المواد والتخصصات العلمية والأدبية.</p>
                  <div className="text-lg font-bold border-t border-slate-200/50 group-hover:border-blue-500 pt-3">
                    إجمالي الزيارات: <span className="text-blue-700 group-hover:text-amber-300 font-extrabold text-2xl">{subjectCount}</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : (

          /* VIEW 2: Detailed Table List View */
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="space-y-6"
          >

            {/* 2A. Toolbar layout block */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl flex flex-wrap gap-4 items-center justify-between">

              <div className="flex flex-wrap gap-4 items-center">
                {/* Semester filter */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-500">الفصل الدراسي</span>
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="الكل">كل الفصول</option>
                    <option value="الفصل الأول">الفصل الأول</option>
                    <option value="الفصل الثاني">الفصل الثاني</option>
                  </select>
                </div>

                {/* School filter */}
                {availableSchools.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">المدرسة</span>
                    <select
                      value={filterSchool}
                      onChange={(e) => setFilterSchool(e.target.value)}
                      className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="الكل">جميع المدارس</option>
                      {availableSchools.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Branch selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-500">الفرع</span>
                  <select
                    value={filterBranchState}
                    onChange={(e) => setFilterBranchState(e.target.value)}
                    className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="الكل">جميع الفروع</option>
                    {activeBranchList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Evaluator filter */}
                {uniqueEvaluators.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">المشرف التربوي</span>
                    <select
                      value={filterEvaluator}
                      onChange={(e) => setFilterEvaluator(e.target.value)}
                      className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="الكل">جميع المشرفين</option>
                      {uniqueEvaluators.map((ev) => (
                        <option key={ev as string} value={ev as string}>{ev as string}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort dropdown selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-500">الترتيب حسب</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 animate-pulse-once"
                  >
                    <option value="التاريخ">التاريخ الأحدث</option>
                    <option value="اسم المعلم">اسم المعلم (أ-ي)</option>
                    <option value="المادة">المادة (أ-ي)</option>
                    <option value="الصف">الصف الدراسي</option>
                    <option value="نسبة الأداء">نسبة الأداء الأعلى</option>
                    <option value="المفضلة">المفضلة بالأعلى</option>
                  </select>
                </div>
              </div>

              {/* Action output Excel buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all text-sm shadow-sm"
                  title="تصدير خلاصة الزيارات الحالية في جدول واحد"
                >
                  <Download size={16} />
                  تصدير الخلاصة (إكسل)
                </button>
                <button
                  onClick={handleExportAllDetailedExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all text-sm shadow-sm"
                  title="تصدير كافة الزيارات الحالية بتفاصيلها الكاملة، بحيث تكون كل زيارة في صفحة مستقلة"
                >
                  <Download size={16} />
                  التصدير العام للزيارات (تفصيلي)
                </button>
              </div>

            </div>

            {/* 2B. Scrollable detailed table representation */}
            {sortedEvaluations.length > 0 ? (
              <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 text-sm font-bold border-b border-slate-100">
                      <th className="p-4 w-12 text-center">مفضلة</th>
                      <th className="p-4">اسم المعلم</th>
                      <th className="p-4">المدرسة والفرع</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">الفصل</th>
                      <th className="p-4">المادة</th>
                      <th className="p-4">الصف</th>
                      <th className="p-4 text-center">نسبة الأداء</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEvaluations.map((ev, index) => {
                      const perc = calculateReportPercentage(ev);
                      const starred = isStarred(ev.id);

                      let badgeColor = "bg-red-50 text-red-600 border border-red-100";
                      if (perc >= 90) badgeColor = "bg-green-50 text-green-700 border border-green-100";
                      else if (perc >= 75) badgeColor = "bg-blue-50 text-blue-700 border border-blue-100";
                      else if (perc >= 50) badgeColor = "bg-amber-50 text-amber-700 border border-amber-100";

                      return (
                        <tr
                          key={ev.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Star toggle */}
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleStar(ev.id)}
                              className="focus:outline-none transform hover:scale-115 transition-transform"
                            >
                              <Star
                                size={18}
                                className={`transition-all ${starred ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'text-slate-300 hover:text-yellow-400'}`}
                              />
                            </button>
                          </td>
                          <td className="p-4 font-bold text-slate-800">{ev.teacherName}</td>
                          <td className="p-4 text-sm font-semibold text-slate-600">
                            🏢 {ev.school} <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{ev.branch || 'الرئيسي'}</span>
                          </td>
                          <td className="p-4 text-slate-500 font-semibold text-sm">{ev.date}</td>
                          <td className="p-4 text-slate-600 font-semibold text-sm">{ev.semester}</td>
                          <td className="p-4 text-slate-700 font-black text-sm">{ev.subject}</td>
                          <td className="p-4 text-slate-600 font-semibold text-sm">{ev.className}</td>
                          {/* performance percent */}
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${badgeColor}`}>
                              {perc}%
                            </span>
                          </td>
                          {/* Action links */}
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => setSelectedReportForPreview(ev)}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 focus:outline-none"
                              >
                                <Eye size={14} />
                                عرض التقرير
                              </button>

                              <button
                                onClick={() => onOpenVisit(ev)}
                                className="text-amber-600 hover:text-amber-800 font-bold text-xs flex items-center gap-1.5 focus:outline-none"
                              >
                                📂
                                فتح الزيارة
                              </button>

                              <button
                                onClick={() => handleExportWhatsApp(ev)}
                                className="text-emerald-500 hover:text-emerald-700 font-bold text-xs flex items-center gap-1.5 focus:outline-none"
                                title="مشاركة عبر الواتساب"
                              >
                                <Share2 size={14} />
                                تصدير واتس
                              </button>

                              <button
                                onClick={() => handleExportSingleVisitExcel(ev)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1.5 focus:outline-none"
                                title="تصدير إلى إكسل"
                              >
                                <Download size={14} />
                                تصدير إكسل
                              </button>

                              <button
                                onClick={() => handleDeleteVisit(ev.id)}
                                className="text-red-600 hover:text-red-800 font-bold text-xs flex items-center gap-1.5 focus:outline-none"
                                title="حذف الزيارة"
                              >
                                🗑️
                                حذف الزيارة
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-slate-400 text-lg font-bold">لم تظهر أي نتائج مضافة تطابق الفلاتر المحددة.</p>
                <p className="text-slate-400 text-sm mt-1">تأكد من إدخال التقارير لنموذج التقييم أولاً لتظهر هنا.</p>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Detailed ReadOnly Report Preview Modal */}
      <AnimatePresence>
        {selectedReportForPreview && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto font-arabic">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-right"
              dir="rtl"
            >
              {/* Modal Topbar Header */}
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Award className="text-yellow-500" size={24} />
                  <h3 className="text-lg font-black text-slate-800">تفاصيل وبطاقة التقييم الشاملة</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleStar(selectedReportForPreview.id)}
                    className="p-2 text-slate-400 hover:text-yellow-500 rounded-lg hover:bg-slate-100 transition-colors"
                    title="إضافة إلى المفضلة"
                  >
                    <Star
                      size={20}
                      className={isStarred(selectedReportForPreview.id) ? "fill-yellow-400 text-yellow-400" : "text-slate-400"}
                    />
                  </button>
                  <button
                    onClick={() => setSelectedReportForPreview(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Printable Body Content */}
              <div id="section-to-print" className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">

                {/* Visual Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-blue-50/50 border border-blue-100 p-6 rounded-xl gap-4">
                  <div>
                    <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-black">
                      {selectedReportForPreview.evaluationType === 'short' ? 'زيارة صفية مختصرة'
                        : selectedReportForPreview.evaluationType === 'ext' ? 'زيارة صفية موسعة'
                          : 'تقييم كفايات المادة'}
                    </span>
                    <h2 className="text-2xl font-black text-slate-800 mt-2">{selectedReportForPreview.teacherName}</h2>
                    <p className="text-sm text-slate-600 font-semibold mt-1">🏫 {selectedReportForPreview.school} ـ فرع {selectedReportForPreview.branch || 'الرئيسي'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-bold">نسبة الأداء</p>
                      <p className="text-4xl font-black text-blue-600">{calculateReportPercentage(selectedReportForPreview)}%</p>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-sm font-semibold text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-xs">التاريخ واليوم</span>
                    <span>📅 {selectedReportForPreview.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">الفصل الدراسي</span>
                    <span>☀️ {selectedReportForPreview.semester}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">المادة العلمية</span>
                    <span>📚 {selectedReportForPreview.subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">الصف الدراسي</span>
                    <span>🏢 {selectedReportForPreview.className}</span>
                  </div>
                  {selectedReportForPreview.lessonName && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-xs">موضوع وصياغة الدرس</span>
                      <span>📖 {selectedReportForPreview.lessonName}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-xs">المشرف التربوي التقييمي</span>
                    <span>✍️ {selectedReportForPreview.evaluatorName}</span>
                  </div>
                </div>

                {/* Scores breakdown detail summary */}
                <div>
                  <h4 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                    <Sparkles className="text-blue-500" size={18} />
                    مؤشرات التقييم المهارية والمسلكية
                  </h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-sm">
                    {(() => {
                      const reportBlocks = getCriteriaBlocksForReport(selectedReportForPreview);
                      return reportBlocks.map((block: any, bIdx: number) => {
                        return (
                          <div key={block.title} className="p-4 bg-white space-y-2">
                            <h5 className="font-bold text-blue-800 bg-blue-50/50 px-2.5 py-1 rounded-md inline-block text-xs">{block.title}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pr-2">
                              {block.items.map((item: string, iIdx: number) => {
                                const score = getEvaluationItemScore(selectedReportForPreview, item, bIdx, iIdx, reportBlocks);
                                const scoreDisplay = score !== undefined ? `${score} / 4` : '0 / 4';
                                return (
                                  <div key={item} className="flex justify-between items-center text-slate-700 bg-slate-50/40 p-2 rounded-lg border border-slate-100/30">
                                    <span className="font-semibold text-xs leading-relaxed">{item}</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${score === 4 ? 'bg-green-100 text-green-800' :
                                      score === 3 ? 'bg-blue-100 text-blue-800' :
                                        score === 2 ? 'bg-amber-100 text-amber-800' :
                                          score === 1 ? 'bg-red-100 text-red-800' :
                                            'bg-slate-100 text-slate-400'
                                      }`}>
                                      {scoreDisplay}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Qualitative metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  <div className="bg-green-50/40 border border-green-100 rounded-xl p-5 space-y-2">
                    <h5 className="text-green-800 font-black text-sm flex items-center gap-1.5">
                      <Award size={16} />
                      علامات ونقاط القوة والتميز
                    </h5>
                    <p className="text-slate-700 font-semibold text-xs leading-relaxed whitespace-pre-line">{selectedReportForPreview.strengths || "لم يتم تدوين أي تفاصيل."}</p>
                  </div>

                  <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-5 space-y-2">
                    <h5 className="text-amber-800 font-black text-sm flex items-center gap-1.5">
                      <AlertCircle size={16} />
                      نقاط بحاجة إلى تحوير وتحسين
                    </h5>
                    <p className="text-slate-700 font-semibold text-xs leading-relaxed whitespace-pre-line">{selectedReportForPreview.improvements || "لم يتم تدوين أي تفاصيل."}</p>
                  </div>

                  <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 space-y-2">
                    <h5 className="text-blue-800 font-black text-sm flex items-center gap-1.5">
                      💡
                      التوصيات الإجرائية المحددة
                    </h5>
                    <p className="text-slate-700 font-semibold text-xs leading-relaxed whitespace-pre-line">{selectedReportForPreview.recommendations || "لم يتم تدوين أي توصيات."}</p>
                  </div>

                </div>

                {/* Extra Comments or notes */}
                {selectedReportForPreview.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-bold text-slate-400 block">ملاحظات إضافية مرصودة</span>
                    <p className="text-slate-700 font-semibold text-xs leading-relaxed whitespace-pre-line">{selectedReportForPreview.notes}</p>
                  </div>
                )}

              </div>

              {/* Bottom footer button bar */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportWhatsApp(selectedReportForPreview)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-sm"
                  >
                    <Share2 size={16} />
                    إرسال للواتساب
                  </button>
                  <button
                    onClick={() => handleExportSingleVisitExcel(selectedReportForPreview)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm"
                  >
                    <Download size={16} />
                    تصدير إكسل
                  </button>
                </div>
                <button
                  onClick={() => setSelectedReportForPreview(null)}
                  className="px-5 py-2.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-xl font-bold transition-all text-sm"
                >
                  إغلاق التقرير
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
