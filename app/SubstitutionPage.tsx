import React, { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import ConfirmDialog from "../components/ConfirmDialog";
import { useGlobal } from "../context/GlobalState";
import {
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  FileSpreadsheet,
  Share2,
  Table as TableIcon,
  Users,
  Calendar,
  Filter,
  X,
  Download,
  Upload,
  Search,
  UserCheck,
  LayoutDashboard,
  History,
  CalendarDays,
  Archive,
  FilePlus,
} from "lucide-react";
import { TimetableEntry, SubstitutionEntry } from "../types";
import { exportToStyledExcel } from "../src/lib/excelExport";
import * as XLSX from "xlsx";

const SubstitutionPage: React.FC = () => {
  const { lang, data, updateData, currentUser, userFilter, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser.permissions.secretariat.includes("allowEdits");
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isModuleDisabled =
    Array.isArray(currentUser?.permissions?.substitutions) &&
    currentUser.permissions.substitutions.includes("disable");
  const isReadOnly =
    !isGeneralSupervisor &&
    ((isReadOnlyFlag && !isAllowEdits) || isModuleDisabled);
  const [activeTab, setActiveTab] = useState<"coverage" | "timetable">(
    "coverage",
  );

  // START OF CHANGE - Coverage State Management
  const [selectedCoverageDate, setSelectedCoverageDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showCoverageArchive, setShowCoverageArchive] = useState(false);
  const [highlightedCoverageId, setHighlightedCoverageId] = useState<
    string | null
  >(null);
  // END OF CHANGE

  // --- Common Data ---
  const daysAr = [
    "السبت",
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
  ];
  const periodsAr = [
    "الصفرية",
    "الأولى",
    "الثانية",
    "الثالثة",
    "الرابعة",
    "الخامسة",
    "السادسة",
    "السابعة",
  ];
  const periodsKeys = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"];

  const teacherList = useMemo(() => {
    const names = new Set<string>();
    data.dailyReports.forEach((report) => {
      report.teachersData.forEach((t) => {
        if (t.teacherName) names.add(t.teacherName);
      });
    });
    (data.timetable || []).forEach((t) => {
      if (t.teacherName) names.add(t.teacherName);
    });
    (data.secretariatStaff || []).forEach((t: any) => {
      if (t.name) names.add(t.name);
    });
    return Array.from(names);
  }, [data.dailyReports, data.timetable, data.secretariatStaff]);

  const coverageTeacherList = useMemo(() => {
    const staffList = data.secretariatStaff || [];
    
    // Resolve active school and branch context
    const activeSchool = data.profile?.schoolName || "";
    const activeBranch = data.profile?.branch || "";

    // Resolve user filters
    const userSchools = currentUser?.selectedSchool
      ? currentUser.selectedSchool.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const hasSchoolFilter = userSchools.length > 0 && !userSchools.includes("all");

    const userBranch = currentUser?.selectedBranch || "";
    const hasBranchFilter = userBranch && userBranch !== "all" && userBranch !== "الجميع";

    const isGeneralSupervisor =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;

    const userGrades = currentUser?.grades || [];
    const hasGradeFilter = userGrades.length > 0 && !userGrades.includes("all");

    const userSections = currentUser?.sections || [];
    const hasSectionFilter = userSections.length > 0 && !userSections.includes("all");

    const allowedTitles = [
      "معلم مادة",
      "مربية",
      "معلم فنية",
      "معلم الرياضة",
      "معلم رياضة",
      "مسؤول المكتبة",
      "مسؤول الوسائل"
    ];

    const filteredStaff = staffList.filter((s: any) => {
      // 1. School matching
      if (activeSchool && activeSchool !== "all") {
        if (s.school && s.school !== activeSchool) return false;
      } else if (hasSchoolFilter) {
        if (s.school && !userSchools.includes(s.school)) return false;
      }

      // 2. Branch matching
      if (activeBranch && activeBranch !== "all" && activeBranch !== "الجميع") {
        if (s.branch && s.branch !== activeBranch) return false;
      } else if (hasBranchFilter) {
        if (s.branch && s.branch !== userBranch) return false;
      }

      // 3. Job titles matching
      const hasAllowedTitle = (s.jobTitles || []).some((title: string) => 
        allowedTitles.some(allowed => title.includes(allowed))
      );
      if (!hasAllowedTitle) return false;

      // Check if s is teaching staff
      const isTeachingStaff = (s.jobTitles || []).some((title: string) => 
        ["معلم مادة", "مربية", "معلم فنية", "معلم الرياضة", "معلم رياضة"].some(allowed => title.includes(allowed))
      );

      // Only apply grade/section filter to teaching staff
      if (isTeachingStaff) {
        // 4. Grade matching
        if (hasGradeFilter) {
          const hasMatchingGrade = (s.grades || []).some((g: string) => userGrades.includes(g));
          if (!hasMatchingGrade) return false;
        }

        // 5. Section matching
        if (hasSectionFilter) {
          const timetableEntry = (data.timetable || []).find((t) => t.teacherName === s.name);
          if (timetableEntry) {
            let hasMatchingSection = false;
            for (const day in timetableEntry.days) {
              for (const period in timetableEntry.days[day]) {
                const val = timetableEntry.days[day][period];
                if (val) {
                  if (userSections.some((sec) => val.includes(sec))) {
                    hasMatchingSection = true;
                    break;
                  }
                }
              }
              if (hasMatchingSection) break;
            }
            if (!hasMatchingSection) return false;
          }
        }
      }

      return true;
    });

    const finalNames = filteredStaff.map((s: any) => s.name).filter(Boolean);
    if (finalNames.length === 0) {
      // Fallback: if filtered results are empty, return all names in secretariatStaff or original teacherList
      const fallbackNames = staffList.map((s: any) => s.name).filter(Boolean);
      return fallbackNames.length > 0 ? fallbackNames : teacherList;
    }
    return finalNames;
  }, [data.secretariatStaff, data.timetable, currentUser, data.profile, teacherList]);

  // START OF CHANGE - Filtering Logic
  const filteredSubstitutions = useMemo(() => {
    return (data.substitutions || []).filter(
      (s) => s.date === selectedCoverageDate,
    );
  }, [data.substitutions, selectedCoverageDate]);

  const uniqueCoverageDates = useMemo(() => {
    const list = data.substitutions || [];
    const dates = list.map((s) => s.date);
    return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  }, [data.substitutions]);
  // END OF CHANGE

  // --- Timetable Logic ---
  const [highlightRow, setHighlightRow] = useState<string | null>(null);
  const [highlightDayPeriod, setHighlightDayPeriod] = useState<string | null>(
    null,
  ); // e.g. "الأحد-p2"
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [selectedTeacherRow, setSelectedTeacherRow] = useState<string | null>(
    null,
  );
  const [individualFilter, setIndividualFilter] = useState({
    teacher: "",
    day: "",
    gradeSection: "",
    period: "",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleAddTimetableRow = () => {
    if (isReadOnly) return;
    const newEntry: TimetableEntry = {
      id: generateId(),
      userId: currentUser?.id,
      teacherName: "",
      subject: "",
      days: daysAr.reduce(
        (acc, day) => ({
          ...acc,
          [day]: periodsKeys.reduce((pAcc, p) => ({ ...pAcc, [p]: "" }), {}),
        }),
        {},
      ),
      notes: "",
    };
    updateData({ timetable: [...(data.timetable || []), newEntry] });
  };

  const updateTimetableField = (id: string, path: string[], value: string) => {
    if (isReadOnly) return;
    const newList = (data.timetable || []).map((t) => {
      if (t.id === id) {
        const updated = { ...t };
        let current: Record<string, any> = updated;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        return updated;
      }
      return t;
    });
    updateData({ timetable: newList });
  };

  const handleTimetableImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      isOpen: true,
      title: lang === "ar" ? "طريقة الاستيراد" : "Import Method",
      message:
        lang === "ar"
          ? "هل تريد إضافة البيانات للموجود حالياً أم استبدالها؟"
          : "Do you want to merge with existing data or replace it?",
      onConfirm: () => processTimetableImport(file, true),
      type: "info",
    });
  };

  const processTimetableImport = (file: File, isMerge: boolean) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const importedData = XLSX.utils.sheet_to_json(ws);

        const newEntries: TimetableEntry[] = (importedData as any[]).map(
          (row) => {
            const teacherName = row["اسم المعلم"] || "";
            const subject = row["المادة"] || "";
            const notes = row["ملاحظات"] || "";

            const daysMap: Record<string, Record<string, string>> = {};
            daysAr.forEach((day) => {
              daysMap[day] = {};
              periodsAr.forEach((pName, pIdx) => {
                const key = `p${pIdx}`;
                daysMap[day][key] = row[`${day} - ${pName}`] || "";
              });
            });

            return {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              teacherName,
              subject,
              notes,
              days: daysMap,
            };
          },
        );

        updateData({
          timetable: isMerge
            ? [...(data.timetable || []), ...newEntries]
            : newEntries,
        });
        toast.success(
          lang === "ar" ? "تم الاستيراد بنجاح" : "Imported successfully",
        );
      } catch (err) {
        toast.error(
          lang === "ar" ? "فشل استيراد ملف Excel" : "Failed to import Excel",
        );
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      isOpen: true,
      title: lang === "ar" ? "طريقة الاستيراد" : "Import Method",
      message:
        lang === "ar"
          ? "هل تريد إضافة البيانات للموجود حالياً أم استبدالها؟"
          : "Do you want to merge with existing data or replace it?",
      onConfirm: () => processImportXML(file, true),
      type: "info",
    });
  };

  const processImportXML = (file: File, isMerge: boolean) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const xmlText = evt.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const teacherNodes = xmlDoc.getElementsByTagName("teacher");
        const newEntries: TimetableEntry[] = [];

        for (let i = 0; i < teacherNodes.length; i++) {
          const teacher = teacherNodes[i];
          const teacherName = teacher.getAttribute("name") || "";
          const subject = teacher.getAttribute("subject") || "";
          const notes = teacher.getAttribute("notes") || "";

          const daysMap: Record<string, Record<string, string>> = {};
          daysAr.forEach((day) => {
            daysMap[day] = {};
            periodsKeys.forEach((pKey) => {
              const cellValue = teacher.getAttribute(`${day}-${pKey}`) || "";
              daysMap[day][pKey] = cellValue;
            });
          });

          newEntries.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            teacherName,
            subject,
            notes,
            days: daysMap,
          });
        }

        updateData({
          timetable: isMerge
            ? [...(data.timetable || []), ...newEntries]
            : newEntries,
        });
        toast.success(
          lang === "ar" ? "تم استيراد XML بنجاح" : "XML Imported successfully",
        );
      } catch (error) {
        toast.error(
          lang === "ar" ? "فشل استيراد ملف XML" : "Failed to import XML",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImportTXT = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      isOpen: true,
      title: lang === "ar" ? "طريقة الاستيراد" : "Import Method",
      message:
        lang === "ar"
          ? "هل تريد إضافة البيانات للموجود حالياً أم استبدالها؟"
          : "Do you want to merge with existing data or replace it?",
      onConfirm: () => processImportTXT(file, true),
      type: "info",
    });
  };

  const processImportTXT = (file: File, isMerge: boolean) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        const newEntries: TimetableEntry[] = [];

        let currentTeacher: any = null;

        lines.forEach((line) => {
          if (line.includes("المعلم:") || line.includes("معلم:")) {
            if (currentTeacher) newEntries.push(currentTeacher);
            const teacherName = line.split(":")[1]?.trim() || "";
            currentTeacher = {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              teacherName,
              subject: "",
              notes: "",
              days: daysAr.reduce(
                (acc, day) => ({
                  ...acc,
                  [day]: periodsKeys.reduce(
                    (pAcc, p) => ({ ...pAcc, [p]: "" }),
                    {},
                  ),
                }),
                {},
              ),
            };
          } else if (line.includes("المادة:") && currentTeacher) {
            currentTeacher.subject = line.split(":")[1]?.trim() || "";
          } else if (currentTeacher) {
            daysAr.forEach((day, dayIdx) => {
              if (line.includes(day)) {
                const parts = line.split(":")[1]?.split(",") || [];
                parts.forEach((part, idx) => {
                  if (idx < periodsKeys.length) {
                    currentTeacher.days[day][periodsKeys[idx]] = part.trim();
                  }
                });
              }
            });
          }
        });

        if (currentTeacher) newEntries.push(currentTeacher);
        updateData({
          timetable: isMerge
            ? [...(data.timetable || []), ...newEntries]
            : newEntries,
        });
        toast.success(
          lang === "ar" ? "تم استيراد TXT بنجاح" : "TXT Imported successfully",
        );
      } catch (error) {
        toast.error(
          lang === "ar" ? "فشل استيراد ملف TXT" : "Failed to import TXT",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImportPDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    toast.info(
      lang === "ar"
        ? "استيراد PDF يتطلب معالجة متقدمة. يُفضل تحويل PDF إلى Excel أو TXT أولاً."
        : "PDF import requires advanced processing. Please convert PDF to Excel or TXT first.",
    );
    // ملاحظة: استيراد PDF يتطلب مكتبة خاصة مثل pdf.js
    // يمكن إضافة هذه الوظيفة لاحقاً
  };

  const timetableFiltered = useMemo(() => {
    let list = data.timetable || [];
    if (userFilter && userFilter !== "all") {
      const filterIds = userFilter.split(",");
      list = list.filter((t) => filterIds.includes(t.userId || ""));
    }
    return list;
  }, [data.timetable, userFilter]);

  const individualTimetableResult = useMemo(() => {
    if (!showIndividualModal) return [];
    return (data.timetable || [])
      .filter((t) => {
        if (
          individualFilter.teacher &&
          !t.teacherName.includes(individualFilter.teacher)
        )
          return false;
        return true;
      })
      .map((t) => ({ ...t }));
  }, [data.timetable, individualFilter, showIndividualModal]);

  const generateTimetableReport = (list: TimetableEntry[]) => {
    let text = `*📋 جدول الحصص المدرسي*\n`;
    text += `*المدرسة:* ${data.profile.schoolName || "---"}\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    text += `----------------------------------\n\n`;

    list.forEach((t, i) => {
      text += `*👤 (${i + 1}) المعلم:* ${t.teacherName}\n`;
      text += `📚 *المادة:* ${t.subject}\n`;
      daysAr.forEach((day) => {
        const dayPeriods = t.days[day];
        const active = Object.entries(dayPeriods).filter(
          ([_, val]) => val !== "",
        );
        if (active.length > 0) {
          text += `📅 *${day}:*\n`;
          active.forEach(([pKey, val]) => {
            const pName = periodsAr[parseInt(pKey.replace("p", ""))];
            text += `   🔹 ${pName}: ${val}\n`;
          });
        }
      });
      if (t.notes) text += `📝 *ملاحظات:* ${t.notes}\n`;
      text += `----------------------------------\n`;
    });

    return text;
  };

  const sendTeacherWhatsApp = (teacher: TimetableEntry) => {
    let text = `*📋 جدول حصص المعلم*\\n`;
    text += `*👤 المعلم:* ${teacher.teacherName}\\n`;
    text += `*📚 المادة:* ${teacher.subject}\\n`;
    text += `----------------------------------\\n\\n`;

    daysAr.forEach((day) => {
      const dayPeriods = teacher.days[day];
      const active = Object.entries(dayPeriods).filter(
        ([_, val]) => val !== "",
      );
      if (active.length > 0) {
        text += `*📅 ${day}:*\\n`;
        active.forEach(([pKey, val]) => {
          const pName = periodsAr[parseInt(pKey.replace("p", ""))];
          text += `   🔹 الحصة ${pName}: ${val}\\n`;
        });
        text += `\\n`;
      }
    });

    if (teacher.notes) text += `*📝 ملاحظات:* ${teacher.notes}\\n`;
    text += `----------------------------------\\n`;

    sendWhatsApp(text);
  };

  const sendAllTeachersWhatsApp = () => {
    const text = generateTimetableReport(timetableFiltered);
    sendWhatsApp(text);
  };

  // --- Coverage Logic ---
  // START OF CHANGE - Using selectedCoverageDate
  const handleAddRow = () => {
    if (isReadOnly) return;
    const newEntry: SubstitutionEntry = {
      id: generateId(),
      userId: currentUser?.id,
      absentTeacher: "",
      replacementTeacher: "",
      period: "",
      class: "",
      date: selectedCoverageDate,
      paymentStatus: "pending",
      signature: "",
    };
    updateData({ substitutions: [...data.substitutions, newEntry] });
  };
  // END OF CHANGE

  const updateEntry = (id: string, field: string, value: string) => {
    if (isReadOnly) return;
    const newList = data.substitutions.map((s) =>
      s.id === id ? { ...s, [field]: value } : s,
    );
    updateData({ substitutions: newList });
  };

  const getFreeTeachers = (dateStr: string, periodKey: string) => {
    const dayName = getDayName(dateStr);
    if (!dayName) return coverageTeacherList;

    const timetable = data.timetable || [];
    return coverageTeacherList.filter((name) => {
      const entry = timetable.find((t) => t.teacherName === name);
      if (!entry) return true; // Teacher not in timetable = free

      // Check if teacher has a class in this day and period
      const hasClass = entry.days[dayName]?.[periodKey];
      return !hasClass || hasClass.trim() === ""; // Free if no class or empty
    });
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    setConfirmDialog({
      isOpen: true,
      title: lang === "ar" ? "تأكيد الحذف" : "Confirm Delete",
      message: lang === "ar" ? "هل أنت متأكد من الحذف؟" : "Are you sure?",
      type: "danger",
      onConfirm: () => {
        updateData({
          substitutions: data.substitutions.filter((s) => s.id !== id),
        });
        toast.success(
          lang === "ar" ? "تم الحذف بنجاح" : "Deleted successfully",
        );
      },
    });
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(
        new Date(dateStr),
      );
    } catch {
      return "";
    }
  };

  const sendWhatsApp = (text: string) => {
    let msg = text;
    // START OF CHANGE - Requirement: Footer with School Name and Branch
    msg += `\n${getReportMessageFooter()}`;
    // END OF CHANGE
    shareViaWhatsApp(msg);
  };

  return (
    <div className="space-y-6 font-arabic text-right pb-20">
      {/* Tab Switcher */}
      <div className="flex gap-4 p-2 bg-white rounded-2xl border shadow-sm w-fit mx-auto">
        <button
          onClick={() => setActiveTab("coverage")}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === "coverage" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"}`}
        >
          <UserCheck size={20} /> تغطية الحصص
        </button>
        <button
          onClick={() => setActiveTab("timetable")}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === "timetable" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"}`}
        >
          <TableIcon size={20} /> جدول الحصص
        </button>
      </div>

      {activeTab === "coverage" ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* START OF CHANGE - Enhanced Coverage Header Controls */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex flex-wrap justify-between items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-800">
                  تغطية الحصص (الاحتياط)
                </h2>
                <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black border border-blue-100 flex items-center gap-2">
                  <Calendar size={14} />
                  {selectedCoverageDate} | {getDayName(selectedCoverageDate)}
                </div>
              </div>
              <p className="text-slate-400 font-bold text-xs mt-1">
                إدارة غياب المعلمين وتكليف البدلاء اليومي
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Report Controls */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border">
                <button
                  onClick={() =>
                    setSelectedCoverageDate(
                      new Date().toISOString().split("T")[0],
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-50 transition-all shadow-sm"
                >
                  <FilePlus size={16} /> إضافة جدول اليوم
                </button>

                <div className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input
                    type="date"
                    value={selectedCoverageDate}
                    onChange={(e) => setSelectedCoverageDate(e.target.value)}
                    className="text-xs font-black outline-none bg-transparent cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setShowCoverageArchive(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-md"
                >
                  <Archive size={16} /> تقارير التغطية السابقة
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border">
                <button
                  onClick={() => {
                    const text = filteredSubstitutions.reduce(
                      (acc, row: any, i) => {
                        let r = `الغائب: ${row.absentTeacher || "---"}\n`;
                        [1, 2, 3, 4, 5, 6, 7].forEach(
                          (n) => {
                            const sub = row[`p${n}`] || "---";
                            const content = row[`content${n}`] ? ` [${row[`content${n}`]}]` : "";
                            r += `ح${n}: ${sub}${content}\n`;
                          }
                        );
                        return acc + `🔹 البند ${i + 1}:\n${r}\n`;
                      },
                      `*📋 تقرير التغطية - ${selectedCoverageDate}*\n`,
                    );
                    const blob = new Blob([text], {
                      type: "text/plain;charset=utf-8",
                    });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `Coverage_${selectedCoverageDate}.txt`;
                    link.click();
                  }}
                  className="p-2.5 hover:bg-white text-slate-600 rounded-lg transition-all"
                  title="TXT Export"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={async () => {
                    const headers = [
                      "م",
                      "المعلم الغائب",
                      "البند/الحصة",
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                    ];
                    const excelData: any[][] = [];

                    filteredSubstitutions.forEach((row: any, idx) => {
                      // Row 1: Teacher + Substitutes
                      const row1 = [
                        idx + 1,
                        row.absentTeacher || "",
                        "البديل المكلف",
                        row.p1 || "-",
                        row.p2 || "-",
                        row.p3 || "-",
                        row.p4 || "-",
                        row.p5 || "-",
                        row.p6 || "-",
                        row.p7 || "-",
                      ];
                      excelData.push(row1);

                      // Row 2: Content
                      const row2 = [
                        "",
                        "",
                        "محتوى التغطية",
                        row.content1 || "",
                        row.content2 || "",
                        row.content3 || "",
                        row.content4 || "",
                        row.content5 || "",
                        row.content6 || "",
                        row.content7 || "",
                      ];
                      excelData.push(row2);

                      // Row 3: Signatures
                      const row3 = [
                        "",
                        "",
                        "التوقيع",
                        row.sig1 || "",
                        row.sig2 || "",
                        row.sig3 || "",
                        row.sig4 || "",
                        row.sig5 || "",
                        row.sig6 || "",
                        row.sig7 || "",
                      ];
                      excelData.push(row3);
                    });

                    await exportToStyledExcel({
                      title: `تقرير تغطية حصص الاحتياط - ${selectedCoverageDate}`,
                      filename: `Coverage_Report_${selectedCoverageDate}`,
                      headers,
                      data: excelData,
                      date: selectedCoverageDate,
                      columnWidths: [6, 25, 15, 10, 10, 10, 10, 10, 10, 10],
                      profile: {
                        ministry: data.profile.ministry,
                        district: data.profile.district,
                        schoolName: data.profile.schoolName,
                        branch: data.profile.branch,
                        branchManager: data.profile.branchManager,
                        writerName: currentUser?.name,
                      },
                      onRow: (row, rowData, idx) => {
                        const isContentRow = idx % 3 === 1;
                        const isSignatureRow = idx % 3 === 2;
                        row.eachCell((cell, colIdx) => {
                          // Absent teacher column (Yellowish)
                          if (colIdx === 2 && rowData[1]) {
                            cell.fill = {
                              type: "pattern",
                              pattern: "solid",
                              fgColor: { argb: "FFFFF2CC" },
                            };
                          }
                          // Periods (Greenish)
                          if (colIdx >= 4) {
                            cell.fill = {
                              type: "pattern",
                              pattern: "solid",
                              fgColor: { argb: "FFE2EFDA" },
                            };
                          }
                          // Content Row adjustments
                          if (isContentRow) {
                            cell.font = { italic: true, size: 9, bold: false };
                            if (colIdx === 3)
                              cell.font = { bold: true, size: 9 };
                          }
                          // Signature row adjustments
                          if (isSignatureRow) {
                            cell.font = { italic: true, size: 9, bold: false };
                            if (colIdx === 3)
                              cell.font = { bold: true, size: 9 };
                          }
                        });
                      },
                    });
                  }}
                  className="p-2.5 hover:bg-white text-green-600 rounded-lg transition-all"
                  title="Excel Export"
                >
                  <FileSpreadsheet size={18} />
                </button>
                <button
                  onClick={() => {
                    let text = `*📋 جدول تغطية الحصص*\n*التاريخ:* ${selectedCoverageDate} (${getDayName(selectedCoverageDate)})\n------------------\n`;
                    filteredSubstitutions.forEach((row: any, i) => {
                      text += `*⚠️ الغائب (${i + 1}): ${row.absentTeacher || "---"}*\n`;
                      for (let n = 1; n <= 7; n++) {
                        if (row[`p${n}`]) {
                          const content = row[`content${n}`] ? ` [${row[`content${n}`]}]` : "";
                          text += `🔹 ح${n}: ${row[`p${n}`]}${content} ✅\n`;
                        }
                      }
                      text += `------------------\n`;
                    });
                    text += `\n*رفيق المشرف الإداري - إبراهيم دخان*`;
                    sendWhatsApp(text);
                  }}
                  className="p-2.5 hover:bg-white text-green-500 rounded-lg transition-all"
                  title="WhatsApp Share"
                >
                  <Share2 size={18} />
                </button>
              </div>

              <button
                onClick={handleAddRow}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all"
              >
                <Plus size={20} /> إضافة بند غياب
              </button>
            </div>
          </div>
          {/* END OF CHANGE */}

          <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center min-w-[1000px]">
                <thead className="sticky top-0 z-40 bg-white shadow-sm">
                  <tr className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300 h-14">
                    <th
                      rowSpan={2}
                      className="border-e border-slate-300 p-2 w-12 bg-slate-100"
                    >
                      م
                    </th>
                    <th
                      rowSpan={2}
                      className="border-e border-slate-300 p-2 w-48 bg-slate-100"
                    >
                      المعلم الغائب
                    </th>
                    <th className="border-e border-slate-300 p-2 w-32">
                      الحصة
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <th key={n} className="border-e border-slate-300 p-2">
                        {n}
                      </th>
                    ))}
                    <th rowSpan={2} className="p-2 w-12"></th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b-2 border-slate-300 text-[10px]">
                    <th className="border-e border-slate-300 p-1">
                      البديل / التوقيع
                    </th>
                    <th colSpan={7} className="border-e border-slate-300 p-1">
                      تغطية الحصص الدراسية (الاحتياط)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubstitutions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-20 text-slate-300 italic text-lg font-bold"
                      >
                        لا توجد سجلات تغطية لهذا التاريخ ({selectedCoverageDate}
                        ).
                      </td>
                    </tr>
                  ) : (
                    filteredSubstitutions.map((row: any, idx) => (
                      <React.Fragment key={`${row.id}-${idx}`}>
                        <tr
                          className={`border-b border-slate-200 h-14 transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-50" : "hover:bg-slate-50/50"}`}
                          onClick={() => setHighlightedCoverageId(row.id)}
                        >
                          <td
                            rowSpan={3}
                            className={`border-e border-slate-300 font-black transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-100/50" : "bg-slate-50"}`}
                          >
                            {idx + 1}
                          </td>
                          <td
                            rowSpan={3}
                            className={`border-e border-slate-300 p-0 transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-100/50" : "bg-[#FFF2CC]/50"}`}
                          >
                            <input
                              list={`teachers-abs-${row.id}`}
                              className="w-full p-3 bg-transparent text-center font-black outline-none border-none focus:bg-white"
                              placeholder="اسم الغائب..."
                              value={row.absentTeacher || ""}
                              onChange={(e) =>
                                updateEntry(
                                  row.id,
                                  "absentTeacher",
                                  e.target.value,
                                )
                              }
                            />
                            <datalist id={`teachers-abs-${row.id}`}>
                              {coverageTeacherList.map((name, tIdx) => (
                                <option key={`${name}-${tIdx}`} value={name} />
                              ))}
                            </datalist>
                          </td>
                          <td className="border-e border-slate-300 p-2 bg-slate-50 font-black text-[10px]">
                            البديل المكلف
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                            const freeTeachers = getFreeTeachers(
                              row.date,
                              `p${num}`,
                            );
                            return (
                              <td
                                key={num}
                                className="border-e border-slate-300 p-0 bg-[#E2EFDA]/20"
                              >
                                <input
                                  list={`free-teachers-p${num}-${row.id}`}
                                  className="w-full p-2 text-center text-xs font-bold outline-none bg-transparent focus:bg-white"
                                  value={row[`p${num}`] || ""}
                                  onChange={(e) =>
                                    updateEntry(
                                      row.id,
                                      `p${num}`,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="---"
                                />
                                <datalist
                                  id={`free-teachers-p${num}-${row.id}`}
                                >
                                  {freeTeachers.map((name, tIdx) => (
                                    <option
                                      key={`${name}-${tIdx}`}
                                      value={name}
                                    />
                                  ))}
                                </datalist>
                              </td>
                            );
                          })}
                          <td rowSpan={3} className="p-2">
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="text-red-300 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                        <tr
                          className={`border-b border-slate-200 h-10 transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-50" : ""}`}
                          onClick={() => setHighlightedCoverageId(row.id)}
                        >
                          <td
                            className={`border-e border-slate-300 p-2 font-black text-[10px] transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-100/50" : "bg-slate-50"}`}
                          >
                            التوقيع البصمة
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <td
                              key={`sig-${num}`}
                              className="border-e border-slate-300 p-1 bg-white"
                            >
                              {row[`sig${num}`] === "تمت الموافقة" ? (
                                <div className="text-green-600 font-black text-[9px] flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> تم
                                  الاعتماد
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    updateEntry(
                                      row.id,
                                      `sig${num}`,
                                      "تمت الموافقة",
                                    )
                                  }
                                  className="text-[9px] bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-black text-slate-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  توقيع
                                </button>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr
                          className={`border-b-2 border-slate-300 h-10 transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-50" : ""}`}
                          onClick={() => setHighlightedCoverageId(row.id)}
                        >
                          <td
                            className={`border-e border-slate-300 p-2 font-black text-[10px] transition-colors ${highlightedCoverageId === row.id ? "bg-yellow-100/50" : "bg-slate-50"}`}
                          >
                            محتوى التغطية
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <td
                              key={`content-${num}`}
                              className="border-e border-slate-300 p-1 bg-white"
                            >
                              <select
                                className="w-full text-center text-xs font-bold bg-transparent outline-none cursor-pointer focus:bg-slate-50 p-1"
                                value={row[`content${num}`] || ""}
                                onChange={(e) =>
                                  updateEntry(
                                    row.id,
                                    `content${num}`,
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">---</option>
                                {[
                                  "شرح درس",
                                  "مراقبة اختبار",
                                  "حل أسئلة",
                                  "مراجعة درس",
                                  "نشاط علمي",
                                  "تصحيح",
                                  "إشراف عام",
                                ].map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in zoom-in duration-500">
          {/* Timetable Header */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex flex-wrap justify-between items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <TableIcon className="text-emerald-600" /> جدول الحصص العام
              </h2>
              <p className="text-slate-400 font-bold text-xs mt-1">
                تخطيط النصاب الأسبوعي لكادر المدرسة
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowIndividualModal(true)}
                className="bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:bg-black active:scale-95 transition-all"
              >
                <Users size={18} /> جدول فردي
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="bg-purple-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:bg-purple-700 active:scale-95 transition-all"
              >
                <Upload size={18} /> استيراد حصص المعلمين
              </button>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border">
                <button
                  onClick={() => {
                    const text = generateTimetableReport(timetableFiltered);
                    const blob = new Blob([text.replace(/\*/g, "")], {
                      type: "text/plain;charset=utf-8",
                    });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `Timetable_${Date.now()}.txt`;
                    link.click();
                  }}
                  className="p-2.5 hover:bg-white text-slate-600 rounded-lg transition-all"
                  title="تصدير TXT"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => {
                    const rows: Record<string, any>[] = [];
                    timetableFiltered.forEach((t) => {
                      const row: Record<string, any> = {
                        "اسم المعلم": t.teacherName,
                        المادة: t.subject,
                        ملاحظات: t.notes,
                      };
                      daysAr.forEach((day) =>
                        periodsAr.forEach(
                          (pName, i) =>
                            (row[`${day} - ${pName}`] = t.days[day][`p${i}`]),
                        ),
                      );
                      rows.push(row);
                    });
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, ws, "Timetable");
                    XLSX.writeFile(workbook, `Timetable_${Date.now()}.xlsx`);
                  }}
                  className="p-2.5 hover:bg-white text-green-700 rounded-lg transition-all"
                  title="تصدير Excel"
                >
                  <FileSpreadsheet size={18} />
                </button>
                <button
                  onClick={() =>
                    sendWhatsApp(generateTimetableReport(timetableFiltered))
                  }
                  className="p-2.5 hover:bg-white text-green-500 rounded-lg transition-all"
                  title="إرسال للواتساب"
                >
                  <Share2 size={18} />
                </button>
              </div>

              <button
                onClick={handleAddTimetableRow}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Plus size={20} /> إضافة معلم
              </button>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden relative">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scroll-smooth">
              <table className="w-full border-collapse text-center table-auto">
                <thead className="sticky top-0 z-40 bg-white">
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 h-14">
                    <th
                      rowSpan={2}
                      className="px-4 border-e border-slate-300 bg-slate-100 whitespace-nowrap w-12"
                    >
                      م
                    </th>
                    <th
                      rowSpan={2}
                      className="px-6 border-e border-slate-300 bg-slate-100 whitespace-nowrap min-w-[180px]"
                    >
                      اسم المعلم
                    </th>
                    <th
                      rowSpan={2}
                      className="px-6 border-e border-slate-300 bg-slate-100 whitespace-nowrap min-w-[120px]"
                    >
                      المادة
                    </th>
                    {daysAr.map((day) => (
                      <th
                        key={day}
                        colSpan={8}
                        className="border-e border-slate-300 bg-slate-100 py-2"
                      >
                        <div className="flex items-center justify-center gap-2 text-sm whitespace-nowrap px-4">
                          <Calendar size={14} className="text-emerald-600" />{" "}
                          {day}
                        </div>
                      </th>
                    ))}
                    <th rowSpan={2} className="px-6 min-w-[250px]">
                      ملاحظات
                    </th>
                    <th rowSpan={2} className="w-16">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendAllTeachersWhatsApp();
                        }}
                        className="text-green-600 hover:text-green-700 transition-colors p-1"
                        title="إرسال الجميع لواتساب"
                      >
                        <Share2 size={18} />
                      </button>
                    </th>
                    <th rowSpan={2} className="w-16"></th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-500 font-black border-b-2 border-slate-300 text-[10px] h-10">
                    {daysAr.map((day) => (
                      <React.Fragment key={day}>
                        {periodsAr.map((p, i) => (
                          <th
                            key={`${day}-p${i}`}
                            className={`border-e border-slate-200 px-3 whitespace-nowrap cursor-pointer hover:bg-orange-100 transition-colors ${highlightDayPeriod === `${day}-p${i}` ? "bg-orange-200 text-orange-800" : ""}`}
                            onClick={() =>
                              setHighlightDayPeriod((prev) =>
                                prev === `${day}-p${i}` ? null : `${day}-p${i}`,
                              )
                            }
                          >
                            {p}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.timetable.length === 0 ? (
                    <tr>
                      <td
                        colSpan={100}
                        className="p-32 text-slate-300 italic font-black text-xl"
                      >
                        يرجى إضافة بيانات لجدول الحصص...
                      </td>
                    </tr>
                  ) : (
                    data.timetable.map((row, idx) => {
                      const isRowHighlighted = selectedTeacherRow === row.id;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-100 h-14 group transition-all cursor-pointer ${isRowHighlighted ? "bg-yellow-50" : "hover:bg-slate-50/50"}`}
                          onClick={() =>
                            setSelectedTeacherRow((prev) =>
                              prev === row.id ? null : row.id,
                            )
                          }
                        >
                          <td
                            className={`font-black text-blue-600 border-e border-slate-100 transition-colors ${isRowHighlighted ? "bg-yellow-100/50" : ""}`}
                          >
                            {idx + 1}
                          </td>
                          <td
                            className={`p-1 border-e border-slate-200 transition-colors ${isRowHighlighted ? "bg-yellow-100/50" : ""}`}
                          >
                            <input
                              list={`teacher-list-${row.id}`}
                              className={`w-full p-2 text-right font-black outline-none border-none text-xs ${isRowHighlighted ? "bg-orange-50" : "bg-transparent"}`}
                              value={row.teacherName || ""}
                              onChange={(e) =>
                                updateTimetableField(
                                  row.id,
                                  ["teacherName"],
                                  e.target.value,
                                )
                              }
                              onFocus={() => setSelectedTeacherRow(row.id)}
                              placeholder="..."
                            />
                            <datalist id={`teacher-list-${row.id}`}>
                              {teacherList.map((n, tIdx) => (
                                <option key={`${n}-${tIdx}`} value={n} />
                              ))}
                            </datalist>
                          </td>
                          <td
                            className={`p-1 border-e border-slate-200 transition-colors ${isRowHighlighted ? "bg-yellow-100/50" : ""}`}
                          >
                            <input
                              className={`w-full p-2 text-right font-bold outline-none border-none text-xs text-emerald-700 ${isRowHighlighted ? "bg-yellow-50" : "bg-transparent"}`}
                              value={row.subject || ""}
                              onChange={(e) =>
                                updateTimetableField(
                                  row.id,
                                  ["subject"],
                                  e.target.value,
                                )
                              }
                              onFocus={() => setSelectedTeacherRow(row.id)}
                              placeholder="..."
                            />
                          </td>
                          {daysAr.map((day) => (
                            <React.Fragment key={day}>
                              {periodsKeys.map((pKey) => {
                                const isColHighlighted =
                                  highlightDayPeriod === `${day}-${pKey}`;
                                return (
                                  <td
                                    key={pKey}
                                    className={`p-0 border-e border-slate-100 transition-colors ${isRowHighlighted ? "bg-yellow-50" : ""} ${isColHighlighted ? "bg-yellow-100/50" : ""}`}
                                  >
                                    <div className="flex flex-col items-center justify-center h-full w-full">
                                      <input
                                        className="w-full text-center text-[11px] font-black outline-none bg-transparent focus:bg-white p-1"
                                        value={row.days[day][pKey] || ""}
                                        onChange={(e) =>
                                          updateTimetableField(
                                            row.id,
                                            ["days", day, pKey],
                                            e.target.value,
                                          )
                                        }
                                        onFocus={() =>
                                          setSelectedTeacherRow(row.id)
                                        }
                                        placeholder="-"
                                      />
                                      {row.days[day][pKey] &&
                                        row.teacherName && (
                                          <div className="text-[7px] font-bold text-slate-400 leading-none pb-1 truncate max-w-full px-1">
                                            {
                                              row.teacherName
                                                .trim()
                                                .split(/\s+/)[0]
                                            }
                                          </div>
                                        )}
                                    </div>
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <td
                            className={`p-1 ${isRowHighlighted ? "bg-yellow-50" : ""}`}
                          >
                            <input
                              className={`w-full p-2 text-right text-[10px] outline-none ${isRowHighlighted ? "bg-yellow-50" : "bg-transparent"}`}
                              value={row.notes}
                              onChange={(e) =>
                                updateTimetableField(
                                  row.id,
                                  ["notes"],
                                  e.target.value,
                                )
                              }
                              onFocus={() => setSelectedTeacherRow(row.id)}
                              placeholder="..."
                            />
                          </td>
                          <td
                            className={`p-1 ${isRowHighlighted ? "bg-yellow-50" : ""}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sendTeacherWhatsApp(row);
                              }}
                              className="text-green-500 hover:text-green-700 transition-colors p-2 rounded-xl"
                              title="إرسال لواتساب"
                            >
                              <Share2 size={16} />
                            </button>
                          </td>
                          <td
                            className={`p-1 ${isRowHighlighted ? "bg-yellow-50" : ""}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateData({
                                  timetable: data.timetable.filter(
                                    (x) => x.id !== row.id,
                                  ),
                                });
                              }}
                              className="text-red-200 hover:text-red-600 transition-colors p-2 rounded-xl"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* START OF CHANGE - Coverage Archive Modal */}
      {showCoverageArchive && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-slate-100">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
              <h3 className="text-xl font-black flex items-center gap-3">
                <Archive size={24} /> تقارير التغطية السابقة
              </h3>
              <button
                onClick={() => setShowCoverageArchive(false)}
                className="hover:bg-slate-800 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {uniqueCoverageDates.length === 0 ? (
                <p className="text-center text-slate-400 font-bold py-10">
                  لا توجد تقارير سابقة حالياً
                </p>
              ) : (
                uniqueCoverageDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedCoverageDate(date);
                      setShowCoverageArchive(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${selectedCoverageDate === date ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-blue-200 bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${selectedCoverageDate === date ? "bg-blue-600 text-white" : "bg-white text-slate-400 group-hover:text-blue-500"}`}
                      >
                        <Calendar size={18} />
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800 text-sm">
                          {date}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {getDayName(date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
                      {data.substitutions.filter((s) => s.date === date).length}{" "}
                      بنود
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-center">
              <button
                onClick={() => setShowCoverageArchive(false)}
                className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END OF CHANGE */}

      {/* Individual Timetable Filter Modal */}
      {showIndividualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-slate-100">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Users size={28} /> الفلترة والجدول الفردي
              </h3>
              <button
                onClick={() => setShowIndividualModal(false)}
                className="hover:bg-slate-800 p-2 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto">
              {/* Filters Window */}
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">
                    اسم المعلم
                  </label>
                  <div className="relative">
                    <input
                      className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm pr-10"
                      placeholder="اكتب اسم المعلم..."
                      value={individualFilter.teacher}
                      onChange={(e) =>
                        setIndividualFilter({
                          ...individualFilter,
                          teacher: e.target.value,
                        })
                      }
                    />
                    <Search
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                      size={20}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">
                    اليوم
                  </label>
                  <select
                    className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm bg-white"
                    value={individualFilter.day}
                    onChange={(e) =>
                      setIndividualFilter({
                        ...individualFilter,
                        day: e.target.value,
                      })
                    }
                  >
                    <option value="">كل الأيام</option>
                    {daysAr.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">
                    الصف والشعبة
                  </label>
                  <input
                    className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm"
                    placeholder="مثال: 9-أ"
                    value={individualFilter.gradeSection}
                    onChange={(e) =>
                      setIndividualFilter({
                        ...individualFilter,
                        gradeSection: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-2">
                    الحصة
                  </label>
                  <select
                    className="w-full p-4 rounded-2xl border-2 outline-none focus:border-blue-500 font-black text-sm bg-white"
                    value={individualFilter.period}
                    onChange={(e) =>
                      setIndividualFilter({
                        ...individualFilter,
                        period: e.target.value,
                      })
                    }
                  >
                    <option value="">كل الحصص</option>
                    {periodsAr.map((p, i) => (
                      <option key={`period-opt-${i}`} value={`p${i}`}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xl text-slate-800">
                    نتائج الفلترة المخصصة
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        sendWhatsApp(
                          generateTimetableReport(individualTimetableResult),
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-xs hover:bg-green-100 transition-all shadow-sm"
                    >
                      <Share2 size={16} /> إرسال المفلتر
                    </button>
                    <button
                      onClick={() => {}}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-100 transition-all shadow-sm"
                    >
                      <FileSpreadsheet size={16} /> تصدير إكسل
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border-2 border-slate-100 shadow-xl bg-white">
                  <table className="w-full border-collapse text-center text-sm">
                    <thead className="bg-[#FFD966] text-slate-800 font-black border-b-2 border-slate-200">
                      <tr>
                        <th className="p-4 border-e border-slate-200">
                          المعلم / المادة
                        </th>
                        <th className="p-4 border-e border-slate-200">اليوم</th>
                        {periodsAr.map((p, i) => {
                          if (
                            individualFilter.period &&
                            individualFilter.period !== `p${i}`
                          )
                            return null;
                          return (
                            <th
                              key={`period-header-${i}`}
                              className="p-4 border-e border-slate-200"
                            >
                              {p}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-black">
                      {individualTimetableResult.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="p-10 text-slate-300 italic"
                          >
                            لا توجد نتائج مطابقة للفلتر...
                          </td>
                        </tr>
                      ) : (
                        individualTimetableResult.map((t) => {
                          return daysAr.map((day) => {
                            if (
                              individualFilter.day &&
                              individualFilter.day !== day
                            )
                              return null;

                            const dayData = t.days[day];
                            if (individualFilter.gradeSection) {
                              const hasGrade = Object.values(dayData).some(
                                (v) =>
                                  String(v).includes(
                                    individualFilter.gradeSection,
                                  ),
                              );
                              if (!hasGrade) return null;
                            }

                            return (
                              <tr
                                key={`${t.id}-${day}`}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="p-4 border-e border-slate-100 bg-slate-50/50">
                                  <div className="text-slate-800">
                                    {t.teacherName}
                                  </div>
                                  <div className="text-[10px] text-emerald-600 font-bold">
                                    {t.subject}
                                  </div>
                                </td>
                                <td className="p-4 border-e border-slate-100 text-blue-600">
                                  {day}
                                </td>
                                {periodsKeys.map((pKey, i) => {
                                  if (
                                    individualFilter.period &&
                                    individualFilter.period !== pKey
                                  )
                                    return null;

                                  const val = dayData[pKey];
                                  const isTargetGrade =
                                    individualFilter.gradeSection &&
                                    String(val).includes(
                                      individualFilter.gradeSection,
                                    );

                                  return (
                                    <td
                                      key={pKey}
                                      className={`p-2 border-e border-slate-100 ${isTargetGrade ? "bg-orange-100 text-orange-800" : ""}`}
                                    >
                                      <input
                                        className={`w-full p-2 text-center text-xs font-black outline-none border rounded ${isTargetGrade ? "bg-orange-50 border-orange-300" : "bg-white border-slate-200"} focus:border-blue-500`}
                                        value={val || ""}
                                        onChange={(e) =>
                                          updateTimetableField(
                                            t.id,
                                            ["days", day, pKey],
                                            e.target.value,
                                          )
                                        }
                                        placeholder="-"
                                      />
                                      {individualFilter.gradeSection &&
                                        !individualFilter.teacher &&
                                        val && (
                                          <div className="text-[9px] text-slate-400 mt-1">
                                            {t.teacherName} | {t.subject}
                                          </div>
                                        )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-center">
              <button
                onClick={() => setShowIndividualModal(false)}
                className="px-12 py-3 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95"
              >
                تم وموافق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border-4 border-purple-100">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex justify-between items-center shadow-lg">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Upload size={28} /> استيراد حصص المعلمين
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="hover:bg-purple-800 p-2 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <p className="text-slate-600 font-bold text-center mb-8">
                اختر نوع الملف الذي تريد استيراده:
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Excel Import */}
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      handleTimetableImport(e);
                      setShowImportModal(false);
                    }}
                  />
                  <div className="border-2 border-green-200 rounded-2xl p-6 hover:border-green-500 hover:bg-green-50 transition-all group-hover:scale-105 group-hover:shadow-xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-green-100 p-4 rounded-xl group-hover:bg-green-200 transition-all">
                        <FileSpreadsheet size={40} className="text-green-600" />
                      </div>
                      <h4 className="font-black text-lg text-slate-800">
                        ملف Excel
                      </h4>
                      <p className="text-xs text-slate-500 text-center">
                        (.xlsx, .xls)
                      </p>
                    </div>
                  </div>
                </label>

                {/* XML Import */}
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".xml"
                    onChange={(e) => {
                      handleImportXML(e);
                      setShowImportModal(false);
                    }}
                  />
                  <div className="border-2 border-orange-200 rounded-2xl p-6 hover:border-orange-500 hover:bg-orange-50 transition-all group-hover:scale-105 group-hover:shadow-xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-orange-100 p-4 rounded-xl group-hover:bg-orange-200 transition-all">
                        <FileText size={40} className="text-orange-600" />
                      </div>
                      <h4 className="font-black text-lg text-slate-800">
                        ملف XML
                      </h4>
                      <p className="text-xs text-slate-500 text-center">
                        (.xml)
                      </p>
                    </div>
                  </div>
                </label>

                {/* TXT Import */}
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt"
                    onChange={(e) => {
                      handleImportTXT(e);
                      setShowImportModal(false);
                    }}
                  />
                  <div className="border-2 border-blue-200 rounded-2xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all group-hover:scale-105 group-hover:shadow-xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-blue-100 p-4 rounded-xl group-hover:bg-blue-200 transition-all">
                        <FileText size={40} className="text-blue-600" />
                      </div>
                      <h4 className="font-black text-lg text-slate-800">
                        ملف نصي
                      </h4>
                      <p className="text-xs text-slate-500 text-center">
                        (.txt)
                      </p>
                    </div>
                  </div>
                </label>

                {/* PDF Import */}
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => {
                      handleImportPDF(e);
                      setShowImportModal(false);
                    }}
                  />
                  <div className="border-2 border-red-200 rounded-2xl p-6 hover:border-red-500 hover:bg-red-50 transition-all group-hover:scale-105 group-hover:shadow-xl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-red-100 p-4 rounded-xl group-hover:bg-red-200 transition-all">
                        <FileText size={40} className="text-red-600" />
                      </div>
                      <h4 className="font-black text-lg text-slate-800">
                        ملف PDF
                      </h4>
                      <p className="text-xs text-slate-500 text-center">
                        (.pdf)
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-6 p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
                <p className="text-xs text-slate-600 text-center font-bold">
                  💡 <span className="font-black">نصيحة:</span> للحصول على أفضل
                  النتائج، تأكد من تنسيق ملفاتك بشكل صحيح قبل الاستيراد.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-center">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
        type={confirmDialog.type}
      />
    </div>
  );
};

export default SubstitutionPage;
