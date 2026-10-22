import React, { useState, useMemo, useEffect } from 'react';
import { useGlobal } from '../context/GlobalState';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, FileText, ChevronDown, CheckCircle2,
  Settings, HelpCircle, FileSpreadsheet,
  MessageSquare, FileDown, TrendingUp, Presentation,
  Search, Check, AlertCircle, Sparkles, BookOpen, Clock, AlertTriangle
} from 'lucide-react';
import { TeacherEvaluation } from '../types';
import { shortCriteriaBlocks, extCriteriaBlocks } from './evaluationUtils';
import { subjectSkills } from './subjectSkills';
import { toHijri } from '../src/lib/excelExport';

interface EducationalPerformanceIndicatorsPageProps {
  onBack: () => void;
  selectedSchool: string;
}

// 1. Accordion Component
interface AccordionProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, badge, badgeColor = 'bg-blue-100 text-blue-800', children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors font-bold text-right text-slate-800 select-none cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm md:text-base leading-relaxed">{title}</span>
          {badge && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`transform transition-transform text-slate-500 duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-slate-100 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 2. Color-coded Progress Bar Component
interface ProgressBarProps {
  label: string;
  percentage: number;
  subLabel?: string;
}

function ProgressBar({ label, percentage, subLabel }: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, Math.round(percentage)));

  // Decide color-coding based on defined thresholds:
  // < 26% ➡️ Red.
  // < 51% ➡️ Yellow.
  // < 76% ➡️ Orange.
  // < 90% ➡️ Blue.
  // 90% and above ➡️ Green.
  let colorClass = 'bg-red-500';
  let textClass = 'text-red-600';
  let bgTrack = 'bg-red-50';

  if (clampedPercentage < 26) {
    colorClass = 'bg-red-500';
    textClass = 'text-red-600 bg-red-50';
    bgTrack = 'bg-red-50';
  } else if (clampedPercentage < 51) {
    colorClass = 'bg-yellow-500';
    textClass = 'text-yellow-700 bg-yellow-50';
    bgTrack = 'bg-yellow-50';
  } else if (clampedPercentage < 76) {
    colorClass = 'bg-orange-500';
    textClass = 'text-orange-600 bg-orange-50';
    bgTrack = 'bg-orange-50';
  } else if (clampedPercentage < 90) {
    colorClass = 'bg-blue-500';
    textClass = 'text-blue-600 bg-blue-50';
    bgTrack = 'bg-blue-50';
  } else {
    colorClass = 'bg-green-600';
    textClass = 'text-green-700 bg-green-50';
    bgTrack = 'bg-green-50';
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {subLabel && <span className="text-xs text-slate-400 font-medium">{subLabel}</span>}
          <span className={`text-xs px-2 py-0.5 rounded-md font-extrabold ${textClass}`}>
            {clampedPercentage}%
          </span>
        </div>
      </div>
      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full ${colorClass} rounded-full`}
        />
      </div>
    </div>
  );
}

// 3. Export Buttons sub-component
interface ExportMetadata {
  title: string;
  data: Array<{
    name: string;
    details: string;
    teachers: Array<{ name: string; value: string }>;
  }>;
}

interface ExportButtonsProps {
  sectionTitle: string;
  meta: ExportMetadata;
  schoolName: string;
  branchName: string;
}

function ExportButtons({ sectionTitle, meta, schoolName, branchName }: ExportButtonsProps) {
  const { data, currentUser } = useGlobal();
  const [isSharing, setIsSharing] = useState(false);
  const [sharingStep, setSharingStep] = useState(0);

  // Active School and Branch context
  const schoolContext = schoolName === 'الكل' ? (currentUser?.schools?.[0] || 'المدرسة') : schoolName;
  const branchContext = branchName === 'الكل' ? 'الكل' : branchName;

  const profileInfo = data.profiles?.[schoolContext] || data.profile || {};
  const resolvedProfile = branchContext && branchContext !== 'الكل' && profileInfo[branchContext] ? profileInfo[branchContext] : profileInfo;

  const logoImg = resolvedProfile.logoImg || '';
  const managerName = resolvedProfile.branchManager || '......................';

  // B. Export to Excel (Custom styled header matching specifications)
  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('مؤشرات الأداء', {
        views: [{ showGridLines: true, rightToLeft: true }]
      });

      // Set explicit Column widths to ensure legibility
      sheet.getColumn(1).width = 10;                         // Index #
      sheet.getColumn(2).width = 32;                         // Indicator Name
      sheet.getColumn(3).width = 30;                         // Frequency / general details
      sheet.getColumn(4).width = 45;                         // Teacher values list

      // 1. Right Side Header (Merged A1:A6)
      sheet.mergeCells('A1:A6');
      const rightCell = sheet.getCell('A1');
      rightCell.value = `الجمهورية اليمنية\n` +
        `${resolvedProfile.ministry || 'وزارة التربية والتعليم والبحث العلمي'}\n` +
        `مكتب التربية والتعليم بالأمانة\n` +
        `مكتب التربية والتعليم بمنطقة ${resolvedProfile.district || 'شعوب'}\n` +
        `مدرسة: ${schoolContext}\n` +
        `الفرع: ${branchContext && branchContext !== 'الكل' ? branchContext : 'الرئيسي'}`;
      rightCell.alignment = { wrapText: true, horizontal: 'right', vertical: 'top' };
      rightCell.font = { bold: true, name: 'Arial', size: 9 };

      // 2. Center Logo Header (Merged B1:C3)
      sheet.mergeCells('B1:C3');
      if (logoImg && logoImg.startsWith('data:image')) {
        try {
          const imageId = workbook.addImage({
            base64: logoImg.split(',')[1],
            extension: 'png',
          });
          sheet.addImage(imageId, 'B1:C3');
        } catch (e) {
          console.error("Error setting logo sheet image", e);
        }
      }

      // 3. Center File Name Header (Merged B4:C6)
      sheet.mergeCells('B4:C6');
      const fileTitleCell = sheet.getCell('B4');
      fileTitleCell.value = `تقرير مؤشرات الأداء والتحليل الإحصائي\n${sectionTitle}`;
      fileTitleCell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      fileTitleCell.font = { bold: true, name: 'Arial', size: 12, color: { argb: 'FF1E40AF' } };
      fileTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F7FF' }
      };

      // 4. Left Side Dates Header (Merged D1:D6)
      sheet.mergeCells('D1:D6');
      const dCell = sheet.getCell('D1');
      const todayDate = new Date().toISOString().split('T')[0];
      const hijriDate = toHijri(todayDate);
      const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
      dCell.value = `اليوم: ${dayName}\nالهجري: ${hijriDate}\nالميلادي: ${todayDate}`;
      dCell.alignment = { wrapText: true, horizontal: 'left', vertical: 'top' };
      dCell.font = { bold: true, name: 'Arial', size: 9 };

      sheet.addRow([]); // Spacer row

      // Headers Column values row
      const headers = ['#', 'البند / المؤشر', 'التفصيل / النسبة العامة', 'المعلم المطبق وقيمته'];
      const headerRow = sheet.addRow(headers);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E40AF' } // Theme Deep Blue
        };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // Data Rows population
      let counter = 1;
      meta.data.forEach((group) => {
        // Find percentage for custom row colors matching the progress indicators
        const pctMatch = group.details.match(/(\d+)%/);
        const percent = pctMatch ? parseInt(pctMatch[1]) : 0;

        let rowBg = 'FFFFFFFF';
        let rowFg = 'FF1E293B';

        if (percent > 0) {
          if (percent >= 90) { rowBg = 'FFDCFCE7'; rowFg = 'FF15803D'; }
          else if (percent >= 75) { rowBg = 'FFDBEAFE'; rowFg = 'FF1D4ED8'; }
          else if (percent >= 50) { rowBg = 'FFFEF3C7'; rowFg = 'FFB45309'; }
          else { rowBg = 'FFFEE2E2'; rowFg = 'FFB91C1C'; }
        }

        if (group.teachers.length > 0) {
          group.teachers.forEach((teacher) => {
            const row = sheet.addRow([
              counter++,
              group.name,
              group.details,
              `${teacher.name} (${teacher.value})`
            ]);
            row.height = 24;
            row.eachCell((cell, idx) => {
              cell.font = { name: 'Arial', size: 10 };
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: idx === 3 ? rowBg : 'FFFFFFFF' }
              };
              if (idx === 3 && percent > 0) {
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: rowFg } };
              }
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
              };
            });
          });
        } else {
          const row = sheet.addRow([
            counter++,
            group.name,
            group.details,
            '(لا توجد معطيات)'
          ]);
          row.height = 24;
          row.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 10, italic: true };
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        }
      });

      // Footer signatures
      const lastRowIndex = sheet.lastRow ? sheet.lastRow.number : 10;
      const footerRowIndex = lastRowIndex + 2;
      sheet.getRow(footerRowIndex).height = 32;

      // Right signature: Branch Manager (taken from School context Profile)
      const footerManagerCell = sheet.getCell(footerRowIndex, 1);
      footerManagerCell.value = `مدير الفرع: ${managerName}`;
      footerManagerCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1F2937' } };
      footerManagerCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Left signature: Writer / Current User
      const footerWriterCell = sheet.getCell(footerRowIndex, 4);
      footerWriterCell.value = `معد التقرير: ${currentUser?.name || '...'}`;
      footerWriterCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1F2937' } };
      footerWriterCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Save workbook
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `مؤشر_رفيق_${sectionTitle.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تحميل ملف Excel.');
    }
  };

  // D. WhatsApp Send (Direct Deep Connection, Complete Dataset, Custom Footing, and Instant opening)
  const handleExportWhatsApp = () => {
    setIsSharing(true);
    setSharingStep(1);

    let text = `*تقرير مؤشرات الأداء والتشخيص التربوي*\n`;
    text += `📈 *تقرير مؤشرات الأداء والتشخيص التربوي:* _${sectionTitle}_\n`;
    text += `📊 المستخرج بتاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n`;

    // Process Complete Data (No slice/truncations)
    meta.data.forEach((group, idx) => {
      text += `📍 *${idx + 1}. ${group.name}* (${group.details})\n`;
      if (group.teachers.length > 0) {
        group.teachers.forEach(t => {
          text += `  • ${t.name}: _${t.value}_\n`;
        });
      } else {
        text += `  (لا توجد سجلات)\n`;
      }
      text += `\n`;
    });

    // Append authorized school and branch signature
    text += `\n🏫 *المدرسة:* ${schoolContext}\n🌿 *الفرع:* ${branchContext && branchContext !== 'الكل' ? branchContext : 'الرئيسي'}\n`;

    const encoded = encodeURIComponent(text);
    const waUrl = `whatsapp://send?text=${encoded}`;

    // Staggered Visual step updates to excite the user while queuing deep link
    setTimeout(() => {
      setSharingStep(2);
      setTimeout(() => {
        setSharingStep(3);
        setTimeout(() => {
          setIsSharing(false);
          // Directly trigger native app without any prompt or alert confirmation
          window.location.href = waUrl;
        }, 800);
      }, 700);
    }, 650);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
      {/* 5. Stunning Visual Sharing Modal / Overlay Loader */}
      <AnimatePresence>
        {isSharing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-teal-100 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 animate-bounce">
                <MessageSquare size={32} />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-800">جاري إطلاق تقرير رفيق 🚀</h4>
                <p className="text-xs font-bold text-slate-400">تجهيز صياغة المجموعات والدرجات تلقائياً...</p>
              </div>

              {/* Progress Stepper indicators */}
              <div className="space-y-2.5 pt-2 text-right">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className={`w-2.5 h-2.5 rounded-full ${sharingStep >= 1 ? 'bg-teal-500 animate-pulse' : 'bg-slate-200'}`} />
                  <span>تجميع إحصاءات المعائيير والقرارات...</span>
                  {sharingStep > 1 && <span className="text-teal-600 mr-auto text-[10px]">✓ جاهز</span>}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className={`w-2.5 h-2.5 rounded-full ${sharingStep >= 2 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-200'}`} />
                  <span>توسير العبارات والرموز الملونة...</span>
                  {sharingStep > 2 && <span className="text-indigo-600 mr-auto text-[10px]">✓ مجهز</span>}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span className={`w-2.5 h-2.5 rounded-full ${sharingStep >= 3 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                  <span>تحويل البيانات لتطبيق WhatsApp الهاتفي...</span>
                  {sharingStep >= 3 && <span className="text-emerald-600 mr-auto text-[10px] animate-pulse">جاري الفتح...</span>}
                </div>
              </div>

              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: sharingStep === 1 ? '35%' : sharingStep === 2 ? '70%' : '100%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="text-xs text-slate-400 font-bold ml-2">تصدير القسم:</span>

      <button
        onClick={handleExportExcel}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100/70 border border-green-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
        title="تنزيل جدول البيانات المجدولة إكسل"
      >
        <FileSpreadsheet size={14} />
        تصدير Excel (RTL)
      </button>

      <button
        onClick={handleExportWhatsApp}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
        title="ارسال كرسالة واتساب نصية منسقة"
      >
        <MessageSquare size={14} />
        تصدير للواتساب
      </button>
    </div>
  );
}

// MAIN PAGE COMPONENT
export default function EducationalPerformanceIndicatorsPage({ onBack, selectedSchool }: EducationalPerformanceIndicatorsPageProps) {
  const { data, currentUser } = useGlobal();

  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const availableSchools = isSuperAdmin
    ? data.availableSchools || []
    : (currentUser?.schools || []);

  const [activeSchool, setActiveSchool] = useState<string>(selectedSchool || availableSchools[0] || '');
  const [activeBranch, setActiveBranch] = useState<string>('الكل');
  const [activeTab, setActiveTab] = useState<'metrics' | 'elements'>('metrics');

  // School Branches available
  const activeSchoolBranches = useMemo(() => {
    if (activeSchool === 'الكل') {
      const allSecBranches = new Set<string>();
      availableSchools.forEach((sch: string) => {
        const branches = data.schoolBranches?.[sch] || [];
        branches.forEach((b: string) => allSecBranches.add(b));
      });
      return Array.from(allSecBranches);
    }
    return data.schoolBranches?.[activeSchool] || [];
  }, [data.schoolBranches, activeSchool, availableSchools]);

  const filteredTeachers = useMemo(() => {
    return (data.secretariatStaff || []).filter((s: any) => {
      if (activeSchool !== 'الكل' && s.school !== activeSchool) return false;
      const jobTitles = s.jobTitles || [];
      if (!jobTitles.includes('معلم مادة') && !jobTitles.includes('مربية')) return false;
      if (activeBranch && activeBranch !== 'الكل' && s.branch && s.branch !== activeBranch) return false;
      return true;
    });
  }, [data.secretariatStaff, activeSchool, activeBranch]);

  const filteredReports = useMemo(() => {
    const rawReports = data.teacherEvaluations || [];
    let results = rawReports;
    if (activeSchool !== 'الكل') {
      results = results.filter((r: any) => r.school === activeSchool);
    }
    if (activeBranch && activeBranch !== 'الكل') {
      results = results.filter((r: any) => r.branch === activeBranch);
    }
    return results;
  }, [data.teacherEvaluations, activeSchool, activeBranch]);

  // Allowed branches for school with respect to user permissions constraint
  const allowedBranches = useMemo(() => {
    if (activeSchool === 'الكل') {
      const allSecBranches = new Set<string>();
      availableSchools.forEach((sch: string) => {
        const branches = data.schoolBranches?.[sch] || [];
        branches.forEach((b: string) => allSecBranches.add(b));
      });
      return ['الكل', ...Array.from(allSecBranches)];
    }

    const schoolBranches = data.schoolBranches?.[activeSchool] || [];

    if (isSuperAdmin) {
      return ['الكل', ...schoolBranches];
    } else {
      const userSchoolBranches = currentUser?.permissions?.schoolsAndBranches?.[activeSchool] || [];
      if (userSchoolBranches.length === 0) {
        return ['الكل', ...schoolBranches];
      }
      const filtered = userSchoolBranches.filter((b: string) => schoolBranches.includes(b));
      return ['الكل', ...filtered];
    }
  }, [data.schoolBranches, activeSchool, availableSchools, isSuperAdmin, currentUser]);

  // --- TAB 1: KEY METRICS VIEW STATES & PROCESS LOGIC ---
  const [targetStrategies, setTargetStrategies] = useState<number>(5);
  const [targetMeans, setTargetMeans] = useState<number>(5);
  const [targetResources, setTargetResources] = useState<number>(3);
  const [targetPrograms, setTargetPrograms] = useState<number>(2);

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Cached evaluation totals of key indicators
  const [evaluationResults, setEvaluationResults] = useState<{
    strategiesPct: number;
    meansPct: number;
    resourcesPct: number;
    programsPct: number;
    // Drilldown aggregates
    strategyDetails: Array<{ name: string; details: string; teachers: Array<{ name: string; value: string }> }>;
    meanDetails: Array<{ name: string; details: string; teachers: Array<{ name: string; value: string }> }>;
    resourceDetails: Array<{ name: string; details: string; teachers: Array<{ name: string; value: string }> }>;
    programDetails: Array<{ name: string; details: string; teachers: Array<{ name: string; value: string }> }>;
  }>({
    strategiesPct: 0,
    meansPct: 0,
    resourcesPct: 0,
    programsPct: 0,
    strategyDetails: [],
    meanDetails: [],
    resourceDetails: [],
    programDetails: []
  });

  // Extract elements helper with comma splitters (Latin or Arabic commas)
  const extractItems = (r: TeacherEvaluation, key: 'strategies' | 'tools' | 'sources' | 'programs') => {
    let list: string[] = [];
    if (r.customOptions && Array.isArray(r.customOptions[key])) {
      list = r.customOptions[key];
    } else {
      const rawVal = (r as any)[key] || '';
      if (typeof rawVal === 'string') {
        list = rawVal.split(/[،,]/).map(s => s.trim()).filter(Boolean);
      }
    }

    const elements: string[] = [];
    list.forEach(item => {
      if (item) {
        const parts = item.split(/[،,]/).map(p => p.trim()).filter(Boolean);
        elements.push(...parts);
      }
    });
    return elements;
  };

  const handleCalculateMetrics = () => {
    // 1. Filter reports within date range
    const reportsInScope = filteredReports.filter((r: any) => {
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      return true;
    });

    if (reportsInScope.length === 0) {
      alert('لا توجد تقارير في هذا النطاق الزمني المحدد.');
      setIsCalculated(false);
      return;
    }

    // List of unique teachers in scope
    const teachersInScopeList = Array.from(new Set(reportsInScope.map(r => r.teacherId).filter(Boolean)));
    const totalTeachersInScope = teachersInScopeList.length || 1;

    // A. Calculation Helper for global percent and lists
    const processIndicator = (key: 'strategies' | 'tools' | 'sources' | 'programs', targetNum: number) => {
      let cumulativePercentage = 0;

      // itemMap tracks: itemMap[itemName][teacherName] = frequency
      const itemMap: Record<string, Record<string, number>> = {};

      teachersInScopeList.forEach(tId => {
        const teacherReports = reportsInScope.filter(r => r.teacherId === tId);

        // Find all unique items across user reports
        const teacherUniqueItems = new Set<string>();
        teacherReports.forEach(r => {
          const items = extractItems(r, key);
          items.forEach(it => {
            const normalized = it.trim();
            if (normalized) {
              teacherUniqueItems.add(normalized);
              const teacherName = r.teacherName || 'معلم غير معرف';
              if (!itemMap[normalized]) {
                itemMap[normalized] = {};
              }
              itemMap[normalized][teacherName] = (itemMap[normalized][teacherName] || 0) + 1;
            }
          });
        });

        // Compare unique items against targetGoal
        const teacherPct = Math.min(100, (teacherUniqueItems.size / targetNum) * 100);
        cumulativePercentage += teacherPct;
      });

      const finalPercentage = Math.round(cumulativePercentage / totalTeachersInScope);

      // Structure drill-down details sorted descending by total usage frequency
      const detailsList = Object.entries(itemMap).map(([itName, usersRecord]) => {
        const tList = Object.entries(usersRecord).map(([tName, freq]) => ({
          name: tName,
          value: `استخدمه ${freq} مرة`
        }));
        const totalFreq = Object.values(usersRecord).reduce((a, b) => a + b, 0);
        return {
          name: `🔸 ${itName}`,
          details: `التكرار الإجمالي: ${totalFreq} مرة في المدرسة`,
          teachers: tList
        };
      }).sort((a, b) => {
        const countA = parseInt(a.details.match(/\d+/)?.[0] || '0');
        const countB = parseInt(b.details.match(/\d+/)?.[0] || '0');
        return countB - countA;
      });

      return {
        pct: finalPercentage,
        details: detailsList
      };
    };

    const strategiesCalc = processIndicator('strategies', targetStrategies);
    const toolsCalc = processIndicator('tools', targetMeans);
    const sourcesCalc = processIndicator('sources', targetResources);
    const programsCalc = processIndicator('programs', targetPrograms);

    setEvaluationResults({
      strategiesPct: strategiesCalc.pct,
      meansPct: toolsCalc.pct,
      resourcesPct: sourcesCalc.pct,
      programsPct: programsCalc.pct,
      strategyDetails: strategiesCalc.details,
      meanDetails: toolsCalc.details,
      resourceDetails: sourcesCalc.details,
      programDetails: programsCalc.details
    });

    setIsCalculated(true);
  };


  // --- TAB 2: EVALUATION SEGMENTS STATES & LOGIC ---
  const [selectedAnalysisTemplate, setSelectedAnalysisTemplate] = useState<'short' | 'ext' | 'subject' | null>(null);

  // Dynamic evaluation analysis logic based on selection template
  const criteriaAnalysisResult = useMemo(() => {
    if (!selectedAnalysisTemplate) return null;

    // 1. Get all reports matching selected evaluation type
    const templateReports = filteredReports.filter(r => r.evaluationType === selectedAnalysisTemplate);
    const reportCount = templateReports.length;

    if (reportCount === 0) {
      return {
        excellent: [], good: [], average: [], NeedsDevelopment: [],
        rawMeta: { title: '', data: [] }
      };
    }

    // 2. Identify the criteria list for this type
    const criteriaSet = new Set<string>();
    if (selectedAnalysisTemplate === 'short') {
      shortCriteriaBlocks.forEach(b => b.items.forEach(item => criteriaSet.add(item)));
    } else if (selectedAnalysisTemplate === 'ext') {
      extCriteriaBlocks.forEach(b => b.items.forEach(item => criteriaSet.add(item)));
    } else {
      extCriteriaBlocks.forEach(b => b.items.forEach(item => criteriaSet.add(item)));
      Object.values(subjectSkills).forEach(subMap => {
        Object.values(subMap).forEach((skills: string[]) => {
          skills.forEach(skill => criteriaSet.add(skill));
        });
      });
    }

    // Scan the actual scores also to make sure we don't skip customized properties
    templateReports.forEach(r => {
      if (r.scores) {
        Object.keys(r.scores).forEach(k => criteriaSet.add(k));
      }
    });

    const criteriaList = Array.from(criteriaSet);

    // Calculate details for each criterion:
    // school avg, and list of teachers with their individual percentages
    const resultList: Array<{
      criterion: string;
      avgPct: number;
      teachers: Array<{ name: string; value: string; numVal: number }>;
    }> = [];

    criteriaList.forEach(crit => {
      let totalPoints = 0;
      let ratedReportsCount = 0;

      // Group scores by teacher
      const teacherScoresMap: Record<string, { total: number; count: number }> = {};

      templateReports.forEach(r => {
        const scoreVal = r.scores && r.scores[crit] !== undefined ? r.scores[crit] : 0;
        totalPoints += scoreVal;
        ratedReportsCount++;

        const tName = r.teacherName || 'معلم غير معرف';
        if (!teacherScoresMap[tName]) {
          teacherScoresMap[tName] = { total: 0, count: 0 };
        }
        teacherScoresMap[tName].total += scoreVal;
        teacherScoresMap[tName].count++;
      });

      if (ratedReportsCount > 0) {
        const schoolAverage = Math.round((totalPoints / (ratedReportsCount * 4)) * 100);

        const teacherPercentages = Object.entries(teacherScoresMap).map(([tName, data]) => {
          const tAvg = Math.round((data.total / (data.count * 4)) * 100);
          return {
            name: tName,
            value: `متوسط علامته المهارية: ${tAvg}% (${data.total} من ${data.count * 4} نقاط)`,
            numVal: tAvg
          };
        }).sort((a, b) => b.numVal - a.numVal);

        resultList.push({
          criterion: crit,
          avgPct: schoolAverage,
          teachers: teacherPercentages
        });
      }
    });

    // Distribute results into categorization buckets
    const excellentBucket: typeof resultList = [];
    const goodBucket: typeof resultList = [];
    const averageBucket: typeof resultList = [];
    const developmentBucket: typeof resultList = [];

    resultList.forEach(item => {
      if (item.avgPct >= 90) {
        excellentBucket.push(item);
      } else if (item.avgPct >= 75) {
        goodBucket.push(item);
      } else if (item.avgPct >= 50) {
        averageBucket.push(item);
      } else {
        developmentBucket.push(item);
      }
    });

    // Sort each bucket by average percentage descending
    const sortByAvg = (arr: typeof resultList) => arr.sort((a, b) => b.avgPct - a.avgPct);

    // Flat data format for the Export helper
    const sortedAll = [...resultList].sort((a, b) => b.avgPct - a.avgPct);
    const flatExportData = sortedAll.map(x => ({
      name: x.criterion,
      details: `المتوسط العام للمدرسة: ${x.avgPct}%`,
      teachers: x.teachers.map(t => ({ name: t.name, value: t.value }))
    }));

    const typeLabel = selectedAnalysisTemplate === 'short'
      ? 'تحليل التقييم المختصر'
      : selectedAnalysisTemplate === 'ext'
        ? 'تحليل التقييم الموسع'
        : 'تحليل التقييم حسب المادة والفرع المهارية';

    return {
      excellent: sortByAvg(excellentBucket),
      good: sortByAvg(goodBucket),
      average: sortByAvg(averageBucket),
      NeedsDevelopment: sortByAvg(developmentBucket),
      rawMeta: {
        title: typeLabel,
        data: flatExportData
      }
    };
  }, [selectedAnalysisTemplate, filteredReports]);


  return (
    <div className="bg-slate-50/50 rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-md max-w-7xl mx-auto space-y-6 dir-rtl text-right" dir="rtl">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={28} />
            مؤشرات الأداء التربوية والإحصائية
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">📊 لوحة ذكية لتحليل استخدام الوسائل والاستراتيجيات وتقييمات معايير أداء المعلمين</p>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
        >
          <ArrowRight size={18} /> العودة للرئيسية
        </button>
      </div>

      {/* School and Branch Selection Controls */}
      {availableSchools.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
          {/* School Selection Row */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 w-full md:w-80 shrink-0">
              <Sparkles className="text-blue-500 shrink-0 animate-pulse" size={18} />
              <span className="text-sm font-bold text-slate-700">تحديد المدرسة المستهدفة بالتحليل الإحصائي:</span>
            </div>
            <div className="flex-1 w-full">
              <select
                value={activeSchool}
                onChange={(e) => {
                  setActiveSchool(e.target.value);
                  setActiveBranch('الكل');
                  setIsCalculated(false);
                  setSelectedAnalysisTemplate(null);
                }}
                className="w-full md:w-72 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-800"
              >
                {isSuperAdmin && <option value="الكل">جميع المدارس (عرض تجميعي)</option>}
                {availableSchools.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Branch Selection Row (always available underneath the school select) */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 w-full md:w-80 shrink-0">
              <Settings className="text-indigo-500 shrink-0" size={18} />
              <span className="text-sm font-bold text-slate-700">تحديد الفرع:</span>
            </div>
            <div className="flex-1 w-full">
              <select
                value={activeBranch}
                onChange={(e) => {
                  setActiveBranch(e.target.value);
                  setIsCalculated(false);
                  setSelectedAnalysisTemplate(null);
                }}
                className="w-full md:w-72 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-bold text-slate-800"
              >
                {allowedBranches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch === 'الكل' ? 'جميع الفروع والاقسام المتاحة بالصلاحية' : branch}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Primary Tab Selector buttons */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-sm border">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-3 text-center text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'metrics'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Presentation size={18} /> أهم المؤشرات (الوسائل والاستراتيجيات)
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-3 text-center text-sm font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'elements'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <BookOpen size={18} /> تحليل عناصر التقييم ومعايير الأداء
        </button>
      </div>

      {/* Content Area Rendering dynamically */}
      <div className="space-y-6">
        {activeTab === 'metrics' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Left Controls Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 h-fit lg:col-span-1">
              <h3 className="text-md font-extrabold text-blue-900 flex items-center gap-2 border-b pb-3 border-slate-100">
                <Settings size={18} /> ضبط المستهدف الزمني والكمي
              </h3>

              {/* Target Goals Inputs Grid */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">عدد الاستراتيجيات المطلوبة لكل معلم:</label>
                  <input
                    type="number"
                    min="1"
                    value={targetStrategies}
                    onChange={(e) => setTargetStrategies(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">عدد الوسائل المطلوبة لكل معلم:</label>
                  <input
                    type="number"
                    min="1"
                    value={targetMeans}
                    onChange={(e) => setTargetMeans(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">عدد مصادر التعلم المطلوبة لكل معلم:</label>
                  <input
                    type="number"
                    min="1"
                    value={targetResources}
                    onChange={(e) => setTargetResources(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">عدد البرامج التطبيقية المطلوبة لكل معلم:</label>
                  <input
                    type="number"
                    min="1"
                    value={targetPrograms}
                    onChange={(e) => setTargetPrograms(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Historical Date Boundaries */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-black text-slate-600 flex items-center gap-1.5">
                  <Clock size={14} /> النطاق التاريخي للتقارير المستهدفة
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">من تاريخ:</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">إلى تاريخ:</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Calculation Kickoff Button */}
              <button
                onClick={handleCalculateMetrics}
                className="w-full py-3 bg-blue-600 text-white font-extrabold rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 cursor-pointer"
              >
                <TrendingUp size={16} /> تشغيل وحساب الإحصائيات
              </button>
            </div>

            {/* Right Display Metrics Dashboard Panel */}
            <div className="lg:col-span-2 space-y-6">
              {isCalculated ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                  {/* Progress Bars Indicators Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Sparkles className="text-indigo-500 animate-pulse" size={18} />
                      نسب الإنجاز الإجمالية ومؤشرات الاستخدام العام
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <ProgressBar
                        label="استيعاب الاستراتيجيات التعليمية"
                        percentage={evaluationResults.strategiesPct}
                        subLabel={`المستهدف: ${targetStrategies} استراتيجية`}
                      />
                      <ProgressBar
                        label="توظيف الوسائل والأدوات المعززة"
                        percentage={evaluationResults.meansPct}
                        subLabel={`المستهدف: ${targetMeans} وسائل`}
                      />
                      <ProgressBar
                        label="استشعار مصادر التعلم المتنوعة"
                        percentage={evaluationResults.resourcesPct}
                        subLabel={`المستهدف: ${targetResources} مصادر`}
                      />
                      <ProgressBar
                        label="تنفيذ وتطبيق البرامج التطويرية"
                        percentage={evaluationResults.programsPct}
                        subLabel={`المستهدف: ${targetPrograms} برامج`}
                      />
                    </div>
                  </div>

                  {/* Bullet Drilldown Detailed Accordions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-700 px-1">📁 التفاصيل والتقرير الهيكلي لكل مؤشر ومعدل استخدامه من قبل المعلمين</h4>

                    {/* Accordion 1 */}
                    <Accordion
                      title="الاستراتيجيات المطبقة ومعدل تكرارها"
                      badge={`${evaluationResults.strategyDetails.length} أساليب مستخدمة`}
                      badgeColor="bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      <div className="space-y-4">
                        {evaluationResults.strategyDetails.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {evaluationResults.strategyDetails.map((gr, idx) => (
                              <div key={idx} className="py-3 flex flex-col gap-2">
                                <span className="font-bold text-slate-800 text-sm">{gr.name}</span>
                                <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md inline-block w-fit">{gr.details}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 bg-slate-50/30 p-2 rounded-lg pr-4 border-r-2 border-slate-300">
                                  {gr.teachers.map((t, tIdx) => (
                                    <span key={tIdx} className="text-xs text-slate-600 font-semibold">• {t.name}: <span className="font-extrabold text-blue-700">{t.value}</span></span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 text-center font-bold text-slate-400 text-sm">لم تسجل أي استراتيجيات في التقارير المحللة حالياً.</div>
                        )}
                        <ExportButtons
                          sectionTitle="الاستراتيجيات التعليمية الأكثر استخداماً"
                          meta={{ title: 'الاستراتيجيات', data: evaluationResults.strategyDetails }}
                          schoolName={activeSchool}
                          branchName={activeBranch}
                        />
                      </div>
                    </Accordion>

                    {/* Accordion 2 */}
                    <Accordion
                      title="الوسائل التعليمية المستخدمة ومعدل تكرارها"
                      badge={`${evaluationResults.meanDetails.length} أدوات مستخدمة`}
                      badgeColor="bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      <div className="space-y-4">
                        {evaluationResults.meanDetails.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {evaluationResults.meanDetails.map((gr, idx) => (
                              <div key={idx} className="py-3 flex flex-col gap-2">
                                <span className="font-bold text-slate-800 text-sm">{gr.name}</span>
                                <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md inline-block w-fit">{gr.details}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 bg-slate-50/30 p-2 rounded-lg pr-4 border-r-2 border-indigo-300">
                                  {gr.teachers.map((t, tIdx) => (
                                    <span key={tIdx} className="text-xs text-slate-600 font-semibold">• {t.name}: <span className="font-extrabold text-indigo-700">{t.value}</span></span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 text-center font-bold text-slate-400 text-sm">لم تسجل أي وسائل تعليمية في التقارير المحللة حالياً.</div>
                        )}
                        <ExportButtons
                          sectionTitle="الوسائل والمواد التعليمية الأكثر توظيفاً"
                          meta={{ title: 'الوسائل', data: evaluationResults.meanDetails }}
                          schoolName={activeSchool}
                          branchName={activeBranch}
                        />
                      </div>
                    </Accordion>

                    {/* Accordion 3 */}
                    <Accordion
                      title="مصادر التعلم المفعلة ومعدلات استخدامها"
                      badge={`${evaluationResults.resourceDetails.length} مصادر تعليمية`}
                      badgeColor="bg-green-50 text-green-700 border border-green-100"
                    >
                      <div className="space-y-4">
                        {evaluationResults.resourceDetails.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {evaluationResults.resourceDetails.map((gr, idx) => (
                              <div key={idx} className="py-3 flex flex-col gap-2">
                                <span className="font-bold text-slate-800 text-sm">{gr.name}</span>
                                <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md inline-block w-fit">{gr.details}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 bg-slate-50/30 p-2 rounded-lg pr-4 border-r-2 border-green-300">
                                  {gr.teachers.map((t, tIdx) => (
                                    <span key={tIdx} className="text-xs text-slate-600 font-semibold">• {t.name}: <span className="font-extrabold text-green-700">{t.value}</span></span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 text-center font-bold text-slate-400 text-sm">لم تسجل أي مصادر تعلم في التقارير المحللة حالياً.</div>
                        )}
                        <ExportButtons
                          sectionTitle="مصادر التعلم الأكثر تفعيلاً"
                          meta={{ title: 'مصادر التعلم', data: evaluationResults.resourceDetails }}
                          schoolName={activeSchool}
                          branchName={activeBranch}
                        />
                      </div>
                    </Accordion>

                    {/* Accordion 4 */}
                    <Accordion
                      title="البرامج المنفذة ومستويات التفاعل"
                      badge={`${evaluationResults.programDetails.length} برامج مطبقة`}
                      badgeColor="bg-purple-50 text-purple-700 border border-purple-100"
                    >
                      <div className="space-y-4">
                        {evaluationResults.programDetails.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {evaluationResults.programDetails.map((gr, idx) => (
                              <div key={idx} className="py-3 flex flex-col gap-2">
                                <span className="font-bold text-slate-800 text-sm">{gr.name}</span>
                                <span className="text-xs text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md inline-block w-fit">{gr.details}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 bg-slate-50/30 p-2 rounded-lg pr-4 border-r-2 border-purple-300">
                                  {gr.teachers.map((t, tIdx) => (
                                    <span key={tIdx} className="text-xs text-slate-600 font-semibold">• {t.name}: <span className="font-extrabold text-purple-700">{t.value}</span></span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-10 text-center font-bold text-slate-400 text-sm">لم تسجل أي برامج منفذة في التقارير المحللة حالياً.</div>
                        )}
                        <ExportButtons
                          sectionTitle="البرامج المنفذة ومستويات تكرار حضور المعلمين"
                          meta={{ title: 'البرامج منفذة', data: evaluationResults.programDetails }}
                          schoolName={activeSchool}
                          branchName={activeBranch}
                        />
                      </div>
                    </Accordion>

                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center h-full flex flex-col justify-center items-center gap-4 text-slate-400 font-bold border-dashed">
                  <Clock size={48} className="text-slate-300 animate-pulse" />
                  <p className="text-base">بانتظار ضبط النطاق المطلوب ونوع المدخلات والضغط على زر "تشغيل وحساب الإحصائيات" أولاً لتوليد التقارير والمؤشرات.</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm animate-in fade-in duration-300 space-y-6">

            {/* Template Selection Cards */}
            {!selectedAnalysisTemplate ? (
              <div className="space-y-4">
                <div className="text-center md:text-right max-w-xl">
                  <h3 className="text-lg font-black text-slate-800">اختر من نموذج أدوات التقييم المستهدف لدراسة المعايير الفرعية:</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">يتم دراسة تباين المتوسطات وتقسيم أداء المعايير تفصيلياً حسب المستويات الإنشائية</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                  {[
                    { type: 'short' as const, title: 'تحليل عناصر التقييم المختصر', desc: 'يقوم بدراسة معايير التقييم الـ 27 القياسية ومعاييرها.', color: 'hover:border-blue-500 hover:bg-blue-50/30 text-blue-800 border-blue-100 bg-blue-50/10' },
                    { type: 'ext' as const, title: 'تحليل عناصر التقييم الموسع', desc: 'يشمل محاور الصفات الشخصية والخطة الدرسية والسبورة وإدارة التدريس بالصف.', color: 'hover:border-indigo-500 hover:bg-indigo-50/30 text-indigo-800 border-indigo-100 bg-indigo-50/10' },
                    { type: 'subject' as const, title: 'تحليل عناصر التقييم حسب المادة', desc: 'يجمع بين مقاييس التدريس القياسية ومهارات المواد والمنهج التفصيلي والتخصصي.', color: 'hover:border-purple-500 hover:bg-purple-50/30 text-purple-800 border-purple-100 bg-purple-50/10' }
                  ].map((temp, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAnalysisTemplate(temp.type)}
                      className={`p-6 rounded-2xl border text-right transition-all transform hover:-translate-y-1 hover:shadow-md cursor-pointer ${temp.color}`}
                    >
                      <h4 className="text-base font-black flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} />
                        {temp.title}
                      </h4>
                      <p className="text-xs font-semibold leading-relaxed text-slate-600">{temp.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Secondary View: Report Drilldown Metrics
              <div className="space-y-6">

                {/* Switch & Back layout inside Tab */}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAnalysisTemplate(null)}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                      title="العودة لاختيار نموذج آخر"
                    >
                      <ArrowRight size={20} />
                    </button>
                    <span className="font-extrabold text-sm md:text-base text-slate-800">{criteriaAnalysisResult?.rawMeta.title}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
                    مجموع المعايير المحللة: {(criteriaAnalysisResult?.excellent.length || 0) + (criteriaAnalysisResult?.good.length || 0) + (criteriaAnalysisResult?.average.length || 0) + (criteriaAnalysisResult?.NeedsDevelopment.length || 0)}
                  </span>
                </div>

                {/* Main Categorization Buckets Accordions */}
                <div className="space-y-4">

                  {/* bucket 1: Excellent (90-100%) */}
                  <Accordion
                    title="المعايير والمهارات بمستوى ممتاز (90% إلى 100%)"
                    badge={`${criteriaAnalysisResult?.excellent.length || 0} معيار متميز`}
                    badgeColor="bg-emerald-100 text-emerald-800"
                    defaultOpen={true}
                  >
                    {criteriaAnalysisResult && criteriaAnalysisResult.excellent.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {criteriaAnalysisResult.excellent.map((item, idx) => (
                          <div key={idx} className="py-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-xs md:text-sm text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                {item.criterion}
                              </span>
                              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">المتوسط: {item.avgPct}%</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 px-4 text-xs font-semibold text-slate-600 bg-slate-50/30 p-2 rounded-lg">
                              {item.teachers.map((t, tIdx) => (
                                <span key={tIdx}>• {t.name}: <span className="font-extrabold text-emerald-600">{t.value.split(':')[1]}</span></span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic font-bold">لا تتوفر معايير في النطاق الممتاز حاليا.</div>
                    )}
                  </Accordion>

                  {/* bucket 2: Good (75-89%) */}
                  <Accordion
                    title="المعايير والمهارات بمستوى جيد (75% إلى 89%)"
                    badge={`${criteriaAnalysisResult?.good.length || 0} معيار مستقل`}
                    badgeColor="bg-blue-100 text-blue-800"
                  >
                    {criteriaAnalysisResult && criteriaAnalysisResult.good.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {criteriaAnalysisResult.good.map((item, idx) => (
                          <div key={idx} className="py-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-xs md:text-sm text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                {item.criterion}
                              </span>
                              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">المتوسط: {item.avgPct}%</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 px-4 text-xs font-semibold text-slate-600 bg-slate-50/30 p-2 rounded-lg">
                              {item.teachers.map((t, tIdx) => (
                                <span key={tIdx}>• {t.name}: <span className="font-extrabold text-blue-600">{t.value.split(':')[1]}</span></span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic font-bold">لا تتوفر معايير في الجزء الجيد حاليا.</div>
                    )}
                  </Accordion>

                  {/* bucket 3: Average (50-74%) */}
                  <Accordion
                    title="المعايير والمهارات بمستوى متوسط (50% إلى 74%)"
                    badge={`${criteriaAnalysisResult?.average.length || 0} معايير`}
                    badgeColor="bg-amber-100 text-amber-800"
                  >
                    {criteriaAnalysisResult && criteriaAnalysisResult.average.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {criteriaAnalysisResult.average.map((item, idx) => (
                          <div key={idx} className="py-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-xs md:text-sm text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                {item.criterion}
                              </span>
                              <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">المتوسط: {item.avgPct}%</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 px-4 text-xs font-semibold text-slate-600 bg-slate-50/30 p-2 rounded-lg">
                              {item.teachers.map((t, tIdx) => (
                                <span key={tIdx}>• {t.name}: <span className="font-extrabold text-amber-600">{t.value.split(':')[1]}</span></span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic font-bold">لا تتوفر معايير في الفئة المتوسطة حاليا.</div>
                    )}
                  </Accordion>

                  {/* bucket 4: Needs Development (<50%) */}
                  <Accordion
                    title="المعايير التي بحاجة للتطوير (أقل من 50%)"
                    badge={`${criteriaAnalysisResult?.NeedsDevelopment.length || 0} معيار فرعي`}
                    badgeColor="bg-red-100 text-red-800 animate-pulse"
                  >
                    {criteriaAnalysisResult && criteriaAnalysisResult.NeedsDevelopment.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {criteriaAnalysisResult.NeedsDevelopment.map((item, idx) => (
                          <div key={idx} className="py-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-xs md:text-sm text-slate-700 flex items-center gap-1.5 text-red-600">
                                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                {item.criterion}
                              </span>
                              <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">المتوسط: {item.avgPct}%</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 px-4 text-xs font-semibold text-slate-600 bg-slate-50/30 p-2 rounded-lg">
                              {item.teachers.map((t, tIdx) => (
                                <span key={tIdx}>• {t.name}: <span className="font-extrabold text-red-600">{t.value.split(':')[1]}</span></span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic font-bold">بفضل الله لا توجد معايير بحاجة للتطوير حالياً.</div>
                    )}
                  </Accordion>

                </div>

                {/* General Export Buttons for overall template Analysis */}
                {criteriaAnalysisResult && criteriaAnalysisResult.rawMeta.data.length > 0 && (
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/85">
                    <ExportButtons
                      sectionTitle={criteriaAnalysisResult.rawMeta.title}
                      meta={criteriaAnalysisResult.rawMeta}
                      schoolName={activeSchool}
                      branchName={activeBranch}
                    />
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}
