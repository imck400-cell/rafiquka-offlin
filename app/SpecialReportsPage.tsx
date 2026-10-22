import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import ConfirmDialog from "../components/ConfirmDialog";
import { useGlobal } from "../context/GlobalState";
import {
  Briefcase,
  Users,
  FileText,
  GraduationCap,
  ChevronRight,
  Calendar,
  Plus,
  Save,
  Share2,
  Trash2,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  UserCircle,
  Star,
  Filter,
  Clock,
  ShieldAlert,
  X,
  FileSearch,
  Archive,
  CheckSquare,
  PencilLine,
  Zap,
  Sparkles,
  Database,
  FileUp,
  FileDown,
  MessageCircle,
  Activity,
  Fingerprint,
  History,
  RefreshCw,
  Upload,
  LayoutList,
  Hammer,
  UserPlus,
  Edit,
  ArrowUpDown,
  PhoneCall,
  Mail,
} from "lucide-react";
import {
  AbsenceLog,
  LatenessLog,
  StudentViolationLog,
  StudentReport,
  ExitLog,
  DamageLog,
  ParentVisitLog,
  ExamLog,
  TaskItem,
  TaskReport,
  TaskRecord,
  ExecutionStatus,
} from "../types";
import { defaultTaskTemplates } from "../context/GlobalState";
import { exportToStyledExcel } from "../src/lib/excelExport";
import * as XLSX from "xlsx";
import { AddedTasksView } from "../components/AddedTasksView";
import { PostponedTasksView } from "../components/PostponedTasksView";
import { NotebookCorrectionFollowUpView } from "../components/NotebookCorrectionFollowUpView";
import { IssuesAndRecommendationsView } from "../components/IssuesAndRecommendationsView";
import { CreativityAndExcellenceView } from "../components/CreativityAndExcellenceView";
import { DeliveryReceiptView } from "../components/DeliveryReceiptView";
import { StudentReinforcementsView } from "../components/StudentReinforcementsView";

type MainTab = "supervisor" | "staff" | "students" | "tests";
type SubTab = string;

// Helper functions for exporting filtered data used across modules
const exportExcelFiltered = async (
  title: string,
  list: any[],
  columns: { label: string; key: string }[],
  profile: any,
  currentUser: any,
) => {
  const headers = columns.map((col) => col.label);
  const excelData = list.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      return Array.isArray(val) ? val.join("، ") : val;
    }),
  );

  await exportToStyledExcel({
    title: title,
    filename: `${title}_${new Date().getTime()}`,
    headers,
    data: excelData,
    profile: {
      ministry: profile.ministry,
      district: profile.district,
      schoolName: profile.schoolName,
      branch: profile.branch,
      branchManager: profile.branchManager,
      writerName: currentUser?.name,
    },
  });
};

const exportTxtFiltered = (
  title: string,
  list: any[],
  columns: { label: string; key: string }[],
  profile: any,
) => {
  let text = `*📋 تقرير: ${title}*\n`;
  text += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
  text += `----------------------------------\n\n`;

  list.forEach((row, idx) => {
    text += `*🔹 البند (${idx + 1}):*\n`;
    columns.forEach((col) => {
      const val = Array.isArray(row[col.key])
        ? row[col.key].join("، ")
        : row[col.key];
      text += `▪️ *${col.label}:* ${val || "---"}\n`;
    });
    text += `\n`;
  });

  if (profile?.schoolName || profile?.branch) {
    text += `\n----------------------------------\n`;
    text += `🏫 *${profile.schoolName || ""}${profile.branch ? `، فرع ${profile.branch}` : ""}*\n`;
  }

  const blob = new Blob([text.replace(/\*/g, "")], {
    type: "text/plain;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title}_${new Date().getTime()}.txt`;
  link.click();
};

// START OF CHANGE
interface CategoryMember {
  id: string;
  name: string;
  grade: string;
  section: string;
  isAuto: boolean;
}
// END OF CHANGE

// Moved outside to prevent Hook mismatch error 310
const FrequentNamesPicker = ({
  logs,
  onSelectQuery,
  isOpen,
  onClose,
}: {
  logs: any[];
  onSelectQuery: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const frequentList = useMemo(() => {
    const uniqueMap = new Map();
    [...logs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((log) => {
        if (!uniqueMap.has(log.studentName)) {
          uniqueMap.set(log.studentName, log);
        }
      });
    return Array.from(uniqueMap.values());
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-arabic">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">
            الأسماء المتكررة (الأحدث أولاً)
          </h3>
          <button onClick={onClose}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {frequentList.length === 0 ? (
            <p className="text-center p-8 text-slate-400 italic">
              لا توجد بيانات سابقة
            </p>
          ) : (
            frequentList.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectQuery(item.studentName);
                  onClose();
                }}
                className="w-full text-right p-3 hover:bg-blue-50 rounded-xl font-bold flex justify-between items-center transition-colors border-b border-slate-50 last:border-none"
              >
                <span className="text-xs text-slate-400">{item.date}</span>
                <span className="text-slate-700">{item.studentName}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* Moved FilterSection outside to prevent re-renders losing focus */
const FilterSection = ({
  values,
  setValues,
  tempNames,
  setTempNames,
  appliedNames,
  setAppliedNames,
  nameInput,
  setNameInput,
  onExportExcel,
  onExportTxt,
  onExportWA,
  suggestions,
}: any) => (
  <div className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border-2 border-slate-100 space-y-4 md:space-y-6 shadow-sm mb-6 animate-in slide-in-from-top-4 duration-300 font-arabic">
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-full md:min-w-[300px] space-y-2">
        <label className="text-xs font-black text-slate-500 mr-2">
          فلترة بالأسماء (متعدد)
        </label>
        <div className="flex flex-wrap md:flex-nowrap gap-2">
          <div className="relative flex-1 min-w-full md:min-w-0">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 focus-within:border-blue-400 transition-all shadow-sm">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                className="text-xs font-black outline-none bg-transparent w-full"
                placeholder="اكتب الاسم..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-xl shadow-2xl mt-2 max-h-48 overflow-y-auto">
                {suggestions.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setTempNames([...tempNames, s.name]);
                      setNameInput("");
                    }}
                    className="w-full text-right p-3 text-xs font-bold hover:bg-blue-50 border-b last:border-none flex justify-between items-center transition-colors"
                  >
                    <span>{s.name}</span>{" "}
                    <span className="text-[10px] text-slate-300">
                      {s.grade}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setAppliedNames(tempNames)}
              className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              موافق
            </button>
            <button
              onClick={() => {
                setTempNames([]);
                setAppliedNames([]);
              }}
              className="flex-1 md:flex-none bg-white border-2 text-slate-400 px-4 py-2 rounded-xl font-black text-xs hover:bg-slate-50 transition-all"
            >
              تصفير
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tempNames.map((name: string, idx: number) => (
            <span
              key={`${name}-${idx}`}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-200"
            >
              {name}{" "}
              <X
                size={10}
                className="cursor-pointer hover:text-red-500"
                onClick={() =>
                  setTempNames(
                    tempNames.filter((n: string, i: number) => i !== idx),
                  )
                }
              />
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2 w-full md:w-auto">
        <label className="text-xs font-black text-slate-500 mr-2">
          نطاق التاريخ
        </label>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border-2 shadow-sm w-full">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            className="text-[10px] font-black outline-none bg-transparent flex-1"
            value={values.start}
            onChange={(e) => setValues({ ...values, start: e.target.value })}
          />
          <span className="text-slate-200">|</span>
          <input
            type="date"
            className="text-[10px] font-black outline-none bg-transparent flex-1"
            value={values.end}
            onChange={(e) => setValues({ ...values, end: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <button
          title="استيراد"
          className="flex-1 md:flex-none p-3 bg-white border-2 text-blue-600 rounded-xl shadow-sm hover:bg-blue-50 transition-all flex justify-center"
        >
          <Upload size={18} />
        </button>
        <button
          title="تصدير TXT"
          onClick={onExportTxt}
          className="flex-1 md:flex-none p-3 bg-white border-2 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all flex justify-center"
        >
          <FileText size={18} />
        </button>
        <button
          title="تصدير Excel"
          onClick={onExportExcel}
          className="flex-1 md:flex-none p-3 bg-white border-2 text-green-700 rounded-xl shadow-sm hover:bg-green-50 transition-all flex justify-center"
        >
          <FileSpreadsheet size={18} />
        </button>
        <button
          title="واتساب"
          onClick={onExportWA}
          className="flex-1 md:flex-none p-3 bg-green-600 text-white rounded-xl shadow-xl hover:bg-green-700 transition-all active:scale-95 flex justify-center"
        >
          <MessageCircle size={18} />
        </button>
      </div>
    </div>
  </div>
);

// START OF CHANGE - Requirement: Navigate Function from App
interface SpecialReportsPageProps {
  initialSubTab?: string;
  onSubTabOpen?: (subId: string) => void;
  onNavigate?: (viewId: string) => void;
}

const SpecialReportsPage: React.FC<SpecialReportsPageProps> = ({
  initialSubTab,
  onSubTabOpen,
  onNavigate,
}) => {
  // END OF CHANGE
  const { lang, data, updateData, currentUser, userFilter, getReportMessageFooter, shareViaWhatsApp, globalDataFilters } = useGlobal();
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser.permissions.secretariat.includes("allowEdits");
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isModuleDisabled =
    Array.isArray(currentUser?.permissions?.specialReports) &&
    currentUser.permissions.specialReports.includes("disable");
  const isReadOnly =
    !isGeneralSupervisor &&
    ((isReadOnlyFlag && !isAllowEdits) || isModuleDisabled);
  const filterIds = useMemo(
    () => (userFilter && userFilter !== "all" ? userFilter.split(",") : []),
    [userFilter],
  );
  const matchesFilter = (userId?: string) =>
    !userFilter ||
    userFilter === "all" ||
    (userId && filterIds.includes(userId));
  const [activeTab, setActiveTab] = useState<MainTab>("supervisor");
  const [activeSubTab, setActiveSubTab] = useState<SubTab | null>(null);

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

  const structure = {
    supervisor: {
      title: "المشرف الإداري",
      icon: <Briefcase />,
      items: [
        "المهام",
        "المهام المضافة",
        "المهام المرحلة",
        "المشكلات والتوصيات والمقترحات",
        "سجل متابعة الدفاتر والتصحيح",
      ],
    },
    staff: {
      title: "الكادر التعليمي",
      icon: <Users />,
      items: [
        "سجل الإبداع والتميز",
        "كشف الاستلام والتسليم",
      ],
    },
    students: {
      title: "الطلاب/ الطالبات",
      icon: <GraduationCap />,
      items: [
        "الغياب اليومي",
        "التأخر",
        "خروج طالب أثناء الدراسة",
        "المخالفات الطلابية",
        "التعزيزات والمكافآت",
        "سجل الإتلاف المدرسي",
        "سجل زيارة أولياء الأمور والتواصل بهم",
      ],
    },
    tests: {
      title: "تقارير الاختبار",
      icon: <FileSearch />,
      items: ["الاختبار الشهري", "الاختبار الفصلي"],
    },
  };

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
      for (const [key, cat] of Object.entries(structure)) {
        if (cat.items.includes(initialSubTab)) {
          setActiveTab(key as MainTab);
          break;
        }
      }
    }
  }, [initialSubTab]);

  const [showTable, setShowTable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFrequentNames, setShowFrequentNames] = useState(false);

  // Presence Tracker State
  const [showPresenceTracker, setShowPresenceTracker] = useState(false);
  const [presenceBranch, setPresenceBranch] = useState<string[]>([]);
  const [presenceGrade, setPresenceGrade] = useState("");
  const [presenceSection, setPresenceSection] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, "present" | "absent" | "absent_excused" | "absent_unexcused">
  >({});
  const [presenceDate, setPresenceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedForWA, setSelectedForWA] = useState<string[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const cleanUserGrades = useMemo(() => (currentUser?.grades || []).map(g => String(g).trim()).filter(Boolean), [currentUser]);
  const cleanUserSections = useMemo(() => (currentUser?.sections || []).map(s => String(s).trim()).filter(Boolean), [currentUser]);

  const hasUserGradeFilter = cleanUserGrades.length > 0 && !cleanUserGrades.includes("all");
  const hasUserSectionFilter = cleanUserSections.length > 0 && !cleanUserSections.includes("all");

  const gradeOptions = useMemo(() => {
    const raw = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    if (hasUserGradeFilter) {
      return raw.filter(g => cleanUserGrades.includes(g));
    }
    return raw;
  }, [cleanUserGrades, hasUserGradeFilter]);

  const sectionOptions = useMemo(() => {
    const raw = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];
    if (hasUserSectionFilter) {
      return raw.filter(s => cleanUserSections.includes(s));
    }
    return raw;
  }, [cleanUserSections, hasUserSectionFilter]);

  const [filterValues, setFilterValues] = useState({
    semester: "",
    start: today,
    end: today,
    grade: "",
    section: "",
  });
  const [tempNames, setTempNames] = useState<string[]>([]);
  const [appliedNames, setAppliedNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null); // New state for row highlighting
  const [highlightedPresenceStudentId, setHighlightedPresenceStudentId] = useState<string | null>(null);
  // New States for Archive and Auto-Save feature
  const [absenceArchiveOpen, setAbsenceArchiveOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<"الأول" | "الثاني">(
    "الأول",
  );
  const [contactMethodMap, setContactMethodMap] = useState<
    Record<string, "هاتف" | "رسالة" | "واتساب" | "أخرى">
  >({});

  // START OF CHANGE - New states for "Open Previous Record" functionality
  const [showPreviousAbsence, setShowPreviousAbsence] = useState(false);
  const [showPreviousLateness, setShowPreviousLateness] = useState(false);
  const [showPreviousViolation, setShowPreviousViolation] = useState(false);
  const [previousRecordSearch, setPreviousRecordSearch] = useState("");
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any[]>(
    [],
  );
  const [selectedStudentForHistory, setSelectedStudentForHistory] =
    useState<StudentReport | null>(null);
  // END OF CHANGE

  const students = useMemo(() => {
    const reports = data.studentReports || [];
    const sec = data.secretariatStudents || [];
    
    // بناء خرائط للبحث السريع عن السجل المطابق في شؤون الطلاب
    const reportsById = new Map<string, StudentReport>();
    const reportsByCompound = new Map<string, StudentReport>();
    reports.forEach((r) => {
      if (r.id) reportsById.set(r.id, r);
      const rName = r.name ? String(r.name).trim() : "";
      const rGrade = r.grade ? String(r.grade).trim() : "";
      const rSection = r.section ? String(r.section).trim() : "";
      if (rName && rGrade && rSection) {
        reportsByCompound.set(`${rName}-${rGrade}-${rSection}`, r);
      }
    });

    // Strictly map from secretariat so deleted students are automatically removed.
    const merged = sec.map((s: any) => {
      const sId = s.id ? String(s.id).trim() : "";
      const sName = s.name ? String(s.name).trim() : "";
      const sGrade = s.grade ? String(s.grade).trim() : "";
      const sSection = s.section ? String(s.section).trim() : "";
      
      const existing = (sId && reportsById.get(sId)) || 
                       (sName && sGrade && sSection && reportsByCompound.get(`${sName}-${sGrade}-${sSection}`));

      if (existing) {
        return {
          ...existing,
          // Sync immutable fields back from secretariat
          name: s.name || existing.name,
          gender: s.gender || existing.gender,
          grade: s.grade || existing.grade,
          section: s.section || existing.section,
          address: s.residenceWork || existing.address,
          healthStatus: s.healthStatus || existing.healthStatus,
          guardianName: s.guardianInfo || existing.guardianName,
          guardianPhones: s.guardianPhone ? [s.guardianPhone] : (existing.guardianPhones || []),
          school: s.school,
          branch: s.branch,
        } as StudentReport;
      }
      return {
        id: s.id,
        name: s.name || "",
        gender: s.gender || "",
        grade: s.grade || "",
        section: s.section || "",
        address: s.residenceWork || "",
        workOutside: "",
        healthStatus: s.healthStatus || "ممتاز",
        healthDetails: "",
        guardianName: s.guardianInfo || "",
        guardianPhones: s.guardianPhone ? [s.guardianPhone] : [],
        academicReading: "متوسط",
        academicWriting: "متوسط",
        academicParticipation: "متوسط",
        behaviorLevel: "متوسط",
        mainNotes: [],
        otherNotesText: "",
        guardianEducation: "متعلم",
        guardianFollowUp: "متوسط",
        guardianCooperation: "متوسط",
        notes: "",
        createdAt: new Date().toISOString(),
        school: s.school,
        branch: s.branch,
      } as StudentReport;
    });

    // Also include any students in reports that might have been created by users with NO secretariat (if any fallback is needed, but the user explicitly requested strict typing).
    // The user requested: "بحيث تتم الإضافة فقط للطلاب المسجلين في لوحة السكرتير"
    // So we do NOT append reports that are missing from sec.

    return merged;
  }, [data.studentReports, data.secretariatStudents]);

  // FIXED TypeError: ensures field conversion to string before .trim()
  const autoSaveAttendance = (student, nextStatus) => {
    const logs = data.absenceLogs || [];
    const existingIdx = logs.findIndex(
      (l) => l.studentId === student.id && l.date === presenceDate
    );

    if (nextStatus === "absent_excused" || nextStatus === "absent_unexcused") {
      const prevCount = logs.filter((l) => l.studentId === student.id).length;
      const statusValue = nextStatus === "absent_excused" ? "expected" : "recurring";
      const reasonValue = nextStatus === "absent_excused" ? "غياب بعذر" : "غياب بدون عذر";
      
      let updatedLogs = [...logs];
      if (existingIdx > -1) {
        updatedLogs[existingIdx] = {
          ...updatedLogs[existingIdx],
          status: statusValue as any,
          reason: reasonValue,
        };
      } else {
        const contactMethod = contactMethodMap[student.id];
        const newLog = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId: currentUser?.id,
          studentId: student.id,
          studentName: student.name,
          grade: student.grade,
          section: student.section,
          day: getDayName(presenceDate),
          date: presenceDate,
          semester: selectedSemester,
          prevAbsenceCount: prevCount,
          status: statusValue as any,
          reason: reasonValue,
          commType:
            contactMethod === "رسالة"
              ? "رسالة sms"
              : contactMethod === "هاتف"
                ? "هاتف"
                : contactMethod === "واتساب"
                  ? "رسالة واتس"
                  : "أخرى",
          commStatus: contactMethod ? "تم التواصل" : "لم يتم التواصل",
          replier: "غيرهم",
          notes: "",
          result: "لم يتم الرد",
        } as any;
        updatedLogs = [newLog, ...updatedLogs];
      }
      updateData({ absenceLogs: updatedLogs });
    } else {
      if (existingIdx > -1) {
        const updatedLogs = logs.filter((_, idx) => idx !== existingIdx);
        updateData({ absenceLogs: updatedLogs });
      }
    }
  };

  const updateContactMethodAndSave = (studentId, method) => {
    setContactMethodMap((prev) => ({ ...prev, [studentId]: method }));
    const logs = data.absenceLogs || [];
    const existingIdx = logs.findIndex(
      (l) => l.studentId === studentId && l.date === presenceDate
    );
    if (existingIdx > -1) {
      const updatedLogs = [...logs];
      updatedLogs[existingIdx] = {
        ...updatedLogs[existingIdx],
        commType:
          method === "رسالة"
            ? "رسالة sms"
            : method === "هاتف"
              ? "هاتف"
              : method === "واتساب"
                ? "رسالة واتس"
                : "أخرى",
        commStatus: "تم التواصل",
      } as any;
      updateData({ absenceLogs: updatedLogs });
    }
  };

  const filteredPresence = useMemo(() => {
    const cleanUserGrades = (currentUser?.grades || []).map(g => String(g).trim()).filter(Boolean);
    const cleanUserSections = (currentUser?.sections || []).map(sec => String(sec).trim()).filter(Boolean);

    const cleanGlobalGrades = (globalDataFilters?.grades || []).map(g => String(g).trim()).filter(Boolean);
    const cleanGlobalSections = (globalDataFilters?.sections || []).map(sec => String(sec).trim()).filter(Boolean);

    const selectedSchools = (currentUser?.selectedSchool || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const selectedBranches = (currentUser?.selectedBranch || "")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    return students.filter((s) => {
      // 1. School check from currentUser selection
      if (selectedSchools.length > 0 && !selectedSchools.includes("all")) {
        const studentSchool = s.school ? String(s.school).trim() : "";
        if (!studentSchool || !selectedSchools.includes(studentSchool)) {
          return false;
        }
      }

      // 2. Branch check from currentUser selection
      if (selectedBranches.length > 0 && !selectedBranches.includes("all")) {
        const studentBranch = s.branch ? String(s.branch).trim() : "";
        if (!studentBranch || !selectedBranches.includes(studentBranch)) {
          return false;
        }
      }

      // 3. Permitted schools and branches mapping check (strict supervisor alignment)
      if (currentUser?.permissions?.schoolsAndBranches) {
        const studentSchool = s.school ? String(s.school).trim() : "";
        const studentBranch = s.branch ? String(s.branch).trim() : "";
        const branchesForSchool = currentUser.permissions.schoolsAndBranches[studentSchool] || [];
        if (
          branchesForSchool.length > 0 &&
          studentBranch &&
          !branchesForSchool.includes(studentBranch)
        ) {
          return false;
        }
      }

      // 4. Gender/Branch UI filter
      const studentGender = String(s.gender || "").trim();
      const branchMatch =
        !presenceBranch.length ||
        (presenceBranch.includes("طلاب") &&
          (studentGender === "ذكر" || studentGender === "Male")) ||
        (presenceBranch.includes("طالبات") &&
          (studentGender === "أنثى" || studentGender === "Female"));

      if (!branchMatch) return false;

      // 5. Grade Match
      if (presenceGrade) {
        if (String(s.grade || "").trim() !== presenceGrade.trim()) return false;
      } else {
        if (cleanUserGrades.length > 0 && !cleanUserGrades.includes("all")) {
          if (!cleanUserGrades.includes(String(s.grade || "").trim())) return false;
        }
        if (cleanGlobalGrades.length > 0 && !cleanGlobalGrades.includes("all")) {
          if (!cleanGlobalGrades.includes(String(s.grade || "").trim())) return false;
        }
      }

      // 6. Section Match
      if (presenceSection) {
        if (String(s.section || "").trim() !== presenceSection.trim()) return false;
      } else {
        if (cleanUserSections.length > 0 && !cleanUserSections.includes("all")) {
          if (!cleanUserSections.includes(String(s.section || "").trim())) return false;
        }
        if (cleanGlobalSections.length > 0 && !cleanGlobalSections.includes("all")) {
          if (!cleanGlobalSections.includes(String(s.section || "").trim())) return false;
        }
      }

      return true;
    });
  }, [students, presenceBranch, presenceGrade, presenceSection, currentUser, globalDataFilters]);

  // Exam Record Specific States
  const [examStage, setExamStage] = useState<"basic" | "secondary">("basic");
  const [examModalDate, setExamModalDate] = useState(today);
  const [examModalSemester, setExamModalSemester] = useState<
    "الأول" | "الثاني"
  >("الأول");
  const [currentExamMonthTerm, setCurrentExamMonthTerm] = useState("الأول");
  const [examFilters, setExamFilters] = useState({
    semester: "",
    month: "",
    dateStart: "",
    dateEnd: "",
    studentName: "",
    grade: "",
    section: "",
    subject: "",
    score: "",
    status: "",
  });

  const [isAddAbsentModalOpen, setIsAddAbsentModalOpen] = useState(false);
  const [absentEntries, setAbsentEntries] = useState<
    { id: string; name: string; subject: string; studentData?: StudentReport }[]
  >([{ id: Date.now().toString(), name: "", subject: "" }]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  const absenceFormInitial = {
    date: today,
    semester: "الأول",
    status: "expected",
    reason: "",
    commStatus: "لم يتم التواصل",
    commType: "هاتف",
    replier: "الأب",
    result: "لم يتم الرد",
    notes: "",
    prevAbsenceCount: 0,
  };
  const [absenceForm, setAbsenceForm] = useState<Partial<AbsenceLog>>(
    absenceFormInitial as any,
  );

  const [latenessForm, setLatenessForm] = useState<Partial<LatenessLog>>({
    date: today,
    semester: "الأول",
    status: "recurring",
    reason: "",
    action: "تنبيه 1",
    pledge: "",
    notes: "",
    prevLatenessCount: 0,
  });

  const [violationForm, setViolationForm] = useState<
    Partial<StudentViolationLog>
  >({
    date: today,
    semester: "الأول",
    behaviorViolations: [],
    dutiesViolations: [],
    achievementViolations: [],
    examsViolations: [],
    location: "",
    directSupervisor: "",
    directSupervisorJob: "",
    participants: [],
    status: "rare",
    action: "تنبيه 1",
    pledge: "",
    notes: "",
  });

  const [exitForm, setExitForm] = useState<Partial<ExitLog>>({
    date: today,
    semester: "الفصلين",
    status: "نادر الخروج",
    customStatusItems: [],
    action: "تنبيه 1",
    pledge: "",
    notes: "",
    prevExitCount: 0,
  });

  const [damageForm, setDamageForm] = useState<Partial<DamageLog>>({
    date: today,
    semester: "الفصلين",
    description: "",
    participants: "",
    followUpStatus: "قيد المتابعة",
    statusTags: [],
    action: "تنبيه",
    pledge: "",
    notes: "",
    prevDamageCount: 0,
  });

  const [visitForm, setVisitForm] = useState<Partial<ParentVisitLog>>({
    date: today,
    semester: "الفصلين",
    type: "visit",
    status: "نادر الزيارة",
    customStatusItems: [],
    visitorName: "",
    reason: "",
    recommendations: "",
    actions: "",
    followUpStatus: [],
    notes: "",
    prevVisitCount: 0,
  });

  // Task Module States
  const [selectedTaskCategories, setSelectedTaskCategories] = useState<
    ("daily" | "weekly" | "monthly")[]
  >(["daily"]);
  const [taskTableDate, setTaskTableDate] = useState(today);
  const [activeTaskReport, setActiveTaskReport] = useState<TaskReport | null>(
    null,
  );
  const [showPreviousTaskReports, setShowPreviousTaskReports] = useState(false);
  const [customTaskInput, setCustomTaskInput] = useState("");
  const [activeCategoryForAdd, setActiveCategoryForAdd] = useState<
    "daily" | "weekly" | "monthly" | null
  >(null);

  const [bulkNoteValue, setBulkNoteValue] = useState("");
  const [showBulkNotePopup, setShowBulkNotePopup] = useState(false);

  const availableStaff = useMemo(() => {
    let staff = data.secretariatStaff || [];
    
    let activeSchool = currentUser?.selectedSchool || "";
    if (!activeSchool && data.profile?.schoolName) {
      activeSchool = data.profile.schoolName;
    }
    
    let activeBranch = currentUser?.selectedBranch || "";
    if (!activeBranch && data.profile?.branch) {
      activeBranch = data.profile.branch;
    }

    if (!activeSchool && currentUser?.permissions?.schoolsAndBranches) {
      const schools = Object.keys(currentUser.permissions.schoolsAndBranches);
      if (schools.length > 0) {
        activeSchool = schools[0];
        if (!activeBranch) {
          const branches = currentUser.permissions.schoolsAndBranches[activeSchool];
          if (Array.isArray(branches) && branches.length > 0) {
            activeBranch = branches[0];
          }
        }
      }
    }

    if (activeSchool) {
      const userSchools = activeSchool
        .split(",")
        .map((s) => s.trim().toLowerCase());
      staff = staff.filter((s: any) =>
        userSchools.includes(String(s.school || "").trim().toLowerCase())
      );
    }
    if (activeBranch) {
      staff = staff.filter(
        (s: any) =>
          String(s.branch || "").trim().toLowerCase() ===
          String(activeBranch).trim().toLowerCase()
      );
    }
    return staff;
  }, [data.secretariatStaff, currentUser, data.profile]);

  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [showSupervisorSuggestions, setShowSupervisorSuggestions] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantSuggestions, setShowParticipantSuggestions] = useState(false);

  useEffect(() => {
    setSupervisorSearch(violationForm.directSupervisor || "");
  }, [violationForm.directSupervisor]);

  const normalizeArabic = (str: string) => {
    return str
      .replace(/[أإآا]/g, "ا")
      .replace(/[ة]/g, "ه")
      .replace(/[ىي]/g, "ي")
      .trim()
      .toLowerCase();
  };

  const supervisorSuggestions = useMemo(() => {
    const q = supervisorSearch.trim();
    if (!q || q === violationForm.directSupervisor) return [];
    const normalizedQ = normalizeArabic(q);
    return availableStaff.filter((s: any) => {
      if (!s.name) return false;
      return normalizeArabic(s.name).includes(normalizedQ);
    });
  }, [supervisorSearch, availableStaff, violationForm.directSupervisor]);

  const participantSuggestions = useMemo(() => {
    const q = participantSearch.trim();
    if (!q) return [];
    const currentParticipants = violationForm.participants || [];
    return students.filter((s) => s.name && s.name.includes(q) && !currentParticipants.includes(s.name));
  }, [participantSearch, students, violationForm.participants]);

  const handleSelectSupervisor = (s: any) => {
    setViolationForm({
      ...violationForm,
      directSupervisor: s.name,
      directSupervisorJob: Array.isArray(s.jobTitles) ? s.jobTitles.join(" / ") : (s.jobTitles || ""),
    });
    setSupervisorSearch(s.name);
    setShowSupervisorSuggestions(false);
  };

  const handleAddParticipant = (s: any) => {
    const current = violationForm.participants || [];
    setViolationForm({
      ...violationForm,
      participants: [...current, s.name],
    });
    setParticipantSearch("");
    setShowParticipantSuggestions(false);
  };

  const handleRemoveParticipant = (name: string) => {
    const current = violationForm.participants || [];
    setViolationForm({
      ...violationForm,
      participants: current.filter((x) => x !== name),
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

  const shareWhatsAppRich = (
    title: string,
    tableData: any[],
    columns: { label: string; key: string }[],
  ) => {
    let msg = `*📋 تقرير: ${title}*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;
    tableData.forEach((row, idx) => {
      msg += `*🔹 البند (${idx + 1}):*\n`;
      columns.forEach((col) => {
        let val = Array.isArray(row[col.key])
          ? row[col.key].join("، ")
          : row[col.key];
        let symbol = "▪️";
        if (col.key === "studentName" || col.key === "name") symbol = "👤";
        if (col.key === "grade") symbol = "📍";
        if (col.key === "date") symbol = "📅";
        if (col.key === "status") symbol = "🏷️";
        if (col.key === "action") symbol = "🛡️";
        msg += `${symbol} *${col.label}:* ${val || "---"}\n`;
      });
      msg += `\n`;
    });
    msg += `----------------------------------\n`;
    msg += `${getReportMessageFooter()}\n`;

    shareViaWhatsApp(msg);
  };

  const renderExamModule = () => {
    const basicSubjects = [
      "القرآن الكريم",
      "التربية الإسلامية",
      "اللغة العربية",
      "الإنجليزية",
      "الرياضيات",
      "العلوم",
      "الاجتماعيات",
      "الحاسوب",
    ];
    const secondarySubjects = [
      "القرآن الكريم",
      "التربية الإسلامية",
      "اللغة العربية",
      "الإنجليزية",
      "الرياضيات",
      "الفيزياء",
      "الكيمياء",
      "الأحياء",
    ];
    const currentSubjects =
      examStage === "basic" ? basicSubjects : secondarySubjects;

    const filteredLogs = (data.examLogs || []).filter((log) => {
      if (!matchesFilter(log.userId)) return false;
      if (
        log.type !== (activeSubTab === "الاختبار الشهري" ? "monthly" : "final")
      )
        return false;
      if (examFilters.semester && log.semester !== examFilters.semester)
        return false;
      if (examFilters.dateStart && log.date < examFilters.dateStart)
        return false;
      if (examFilters.dateEnd && log.date > examFilters.dateEnd) return false;
      if (examFilters.month && log.month !== examFilters.month) return false;
      if (
        examFilters.studentName &&
        !log.studentName.includes(examFilters.studentName)
      )
        return false;

      if (
        examFilters.subject ||
        examFilters.status ||
        examFilters.grade ||
        examFilters.section
      ) {
        return Object.entries(log.subjectsData).some(
          ([subj, details]: [string, any]) => {
            const subjMatch = examFilters.subject
              ? subj === examFilters.subject
              : true;
            const statusMatch = examFilters.status
              ? details.status === examFilters.status
              : true;
            const gradeMatch = examFilters.grade
              ? details.class.includes(examFilters.grade)
              : true;
            const sectionMatch = examFilters.section
              ? details.class.includes(examFilters.section)
              : true;
            return subjMatch && statusMatch && gradeMatch && sectionMatch;
          },
        );
      }
      return true;
    });

    const handleAddExamRow = () => {
      setAbsentEntries([{ id: Date.now().toString(), name: "", subject: "" }]);
      setExamModalDate(today);
      setExamModalSemester((examFilters.semester as any) || "الأول");
      setIsAddAbsentModalOpen(true);
    };

    const submitAddAbsentees = () => {
      const newLogs: ExamLog[] = absentEntries
        .filter((entry) => entry.name.trim() !== "")
        .map((entry) => {
          const s = entry.studentData;
          const subjectsData: Record<
            string,
            { class: string; grade: string; status: "tested" | "not_tested" }
          > = {};
          currentSubjects.forEach((subj) => {
            subjectsData[subj] = {
              class:
                entry.subject === subj
                  ? s
                    ? `${s.grade} - ${s.section}`
                    : ""
                  : "",
              grade: "",
              status: entry.subject === subj ? "not_tested" : "tested",
            };
          });

          return {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId: currentUser?.id,
            studentId: s?.id || "",
            studentName: entry.name,
            date: examModalDate,
            semester: examModalSemester,
            month: currentExamMonthTerm,
            stage: examStage,
            type: activeSubTab === "الاختبار الشهري" ? "monthly" : "final",
            subjectsData,
          };
        });

      if (isReadOnly) return;
      updateData({ examLogs: [...newLogs, ...(data.examLogs || [])] });
      setIsAddAbsentModalOpen(false);
    };

    const updateAbsentEntry = (
      idx: number,
      field: string,
      value: string | StudentReport,
    ) => {
      const updated = [...absentEntries];
      (updated[idx] as Record<string, any>)[field] = value;
      if (field === "name" && typeof value === "string" && value.length > 2) {
        setActiveSearchIdx(idx);
      } else {
        setActiveSearchIdx(null);
      }
      setAbsentEntries(updated);
    };

    const selectStudentForEntry = (idx: number, s: StudentReport) => {
      const updated = [...absentEntries];
      updated[idx].name = s.name;
      updated[idx].studentData = s;
      setAbsentEntries(updated);
      setActiveSearchIdx(null);
    };

    const updateExamLog = (id: string, field: string, value: string) => {
      const updated = (data.examLogs || []).map((log) =>
        log.id === id ? { ...log, [field]: value } : log,
      );
      updateData({ examLogs: updated });
    };

    const updateSubjectData = (
      id: string,
      subject: string,
      field: string,
      value: string,
    ) => {
      if (isReadOnly) return;
      const updated = (data.examLogs || []).map((log) => {
        if (log.id === id) {
          const currentSubjectData = log.subjectsData[subject] || {
            class: "",
            grade: "",
            status: "not_tested",
          };
          return {
            ...log,
            subjectsData: {
              ...log.subjectsData,
              [subject]: { ...currentSubjectData, [field]: value },
            },
          };
        }
        return log;
      });
      updateData({ examLogs: updated });
    };

    const handleExportWA = () => {
      let msg = `*📋 كشف غياب ${activeSubTab}*\n`;
      msg += `*المرحلة:* ${examStage === "basic" ? "أساسي" : "ثانوي"}\n`;
      msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
      msg += `----------------------------------\n\n`;

      filteredLogs.forEach((log, idx) => {
        msg += `*👤 (${idx + 1}) الطالب:* ${log.studentName || "---"}\n`;
        msg += `📅 *التاريخ:* ${log.date}\n`;
        Object.entries(log.subjectsData).forEach(([subj, data]) => {
          if (data.status === "not_tested") {
            msg += `📚 *${subj}:* (❌ غائب) ${data.class ? `[${data.class}]` : ""}\n`;
          } else if (data.grade || data.class) {
            msg += `📚 *${subj}:* (✅ تم) | 💯 الدرجة: ${data.grade || "---"} | 📍 الصف: ${data.class || "---"}\n`;
          }
        });
        msg += `\n`;
      });

      msg += `----------------------------------\n`;
      msg += `${getReportMessageFooter()}\n`;

      shareViaWhatsApp(msg);
    };

    const handleExportExcel = () => {
      const flatData = filteredLogs.map((log) => {
        const row: Record<string, string> = {
          "اسم الطالب": log.studentName,
          التاريخ: log.date,
          الفصل: log.semester,
        };
        Object.entries(log.subjectsData).forEach(([subj, d]) => {
          row[`${subj} - الصف`] = d.class;
          row[`${subj} - الدرجة`] = d.grade;
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(flatData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exam_Absentee_Record");
      XLSX.writeFile(wb, `${activeSubTab}_Report.xlsx`);
    };

    return (
      <div className="bg-[#FDF6E3] p-4 md:p-8 rounded-[3rem] border-4 border-[#7030A0] shadow-2xl animate-in fade-in duration-500 font-arabic text-right relative">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b-2 border-[#7030A0]/20 pb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setExamStage("basic")}
              className={`px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${examStage === "basic" ? "bg-[#7030A0] text-white" : "bg-white text-[#7030A0] border border-[#7030A0]"}`}
            >
              أساسي
            </button>
            <button
              onClick={() => setExamStage("secondary")}
              className={`px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md ${examStage === "secondary" ? "bg-[#7030A0] text-white" : "bg-white text-[#7030A0] border border-[#7030A0]"}`}
            >
              ثانوي
            </button>
            <div className="flex items-center bg-white border border-[#7030A0] rounded-2xl overflow-hidden shadow-md">
              <span className="px-4 text-[10px] font-black text-[#7030A0] border-e">
                {activeSubTab === "الاختبار الشهري" ? "الشهر" : "الفصل"}
              </span>
              <select
                className="p-3 outline-none font-black text-xs bg-transparent text-blue-600"
                value={currentExamMonthTerm}
                onChange={(e) => setCurrentExamMonthTerm(e.target.value)}
              >
                {activeSubTab === "الاختبار الشهري"
                  ? [
                      "الأول",
                      "الثاني",
                      "الثالث",
                      "الرابع",
                      "الخامس",
                      "السادس",
                    ].map((m, idx) => (
                      <option key={`${m}-${idx}`} value={m}>
                        {m}
                      </option>
                    ))
                  : ["الأول", "الثاني"].map((t, idx) => (
                      <option key={`${t}-${idx}`} value={t}>
                        {t}
                      </option>
                    ))}
              </select>
            </div>
            <button
              onClick={handleAddExamRow}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus size={18} /> إضافة غائب
            </button>
            <button
              onClick={() => setActiveSubTab(null)}
              className="flex items-center gap-2 bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-md"
            >
              <FileSearch size={18} /> التقارير الخاصة
            </button>
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <h2 className="text-3xl font-black text-[#7030A0] flex items-center gap-3">
              كشف غياب {activeSubTab} <FileText size={32} />
            </h2>
            <div className="mt-2 text-slate-500 font-bold">
              سجل متابعة غياب الطلاب في قاعة الاختبار
            </div>
          </div>
        </div>

        {isAddAbsentModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-arabic">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-blue-600 flex flex-col max-h-[85vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Plus size={28} /> إضافة أسماء الغائبين
                </h3>
                <button
                  onClick={() => setIsAddAbsentModalOpen(false)}
                  className="hover:bg-blue-700 p-2 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="bg-blue-50 p-6 border-b-2 border-blue-100 grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-600 mr-2 block">
                    تاريخ الغياب الجماعي
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-black text-sm"
                    value={examModalDate}
                    onChange={(e) => setExamModalDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-600 mr-2 block">
                    الفصل الدراسي
                  </label>
                  <select
                    className="w-full p-3 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-black text-sm bg-white"
                    value={examModalSemester}
                    onChange={(e) =>
                      setExamModalSemester(e.target.value as any)
                    }
                  >
                    <option value="الأول">الفصل الدراسي الأول</option>
                    <option value="الثاني">الفصل الدراسي الثاني</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {absentEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group"
                  >
                    <div className="flex-1 relative">
                      <label className="text-[10px] font-black text-slate-400 mr-2 block mb-1">
                        اسم الطالب
                      </label>
                      <input
                        className="w-full p-3 rounded-xl border-2 outline-none focus:border-blue-500 font-black text-xs"
                        placeholder="اكتب الاسم للبحث..."
                        value={entry.name || ""}
                        onChange={(e) =>
                          updateAbsentEntry(idx, "name", e.target.value)
                        }
                      />
                      {activeSearchIdx === idx && (entry.name || "").length > 2 && (
                        <div className="absolute top-full left-0 right-0 z-[600] bg-white border-2 rounded-xl shadow-2xl mt-1 max-h-40 overflow-y-auto">
                          {students
                            .filter((s) => s.name && s.name.includes(entry.name || ""))
                            .map((s) => (
                              <button
                                key={s.id}
                                onClick={() => selectStudentForEntry(idx, s)}
                                className="w-full text-right p-3 hover:bg-blue-50 border-b last:border-none flex justify-between items-center transition-colors"
                              >
                                <span className="font-bold text-xs">
                                  {s.name}
                                </span>
                                <span className="text-[9px] bg-slate-100 px-2 py-1 rounded-lg">
                                  {s.grade} - {s.section}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 mr-2 block mb-1">
                        مادة الاختبار
                      </label>
                      <select
                        className="w-full p-3 rounded-xl border-2 outline-none focus:border-blue-500 font-black text-xs bg-white"
                        value={entry.subject}
                        onChange={(e) =>
                          updateAbsentEntry(idx, "subject", e.target.value)
                        }
                      >
                        <option value="">اختر المادة...</option>
                        {currentSubjects.map((s, sIdx) => (
                          <option key={`${s}-${sIdx}`} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() =>
                        setAbsentEntries(
                          absentEntries.filter((_, i) => i !== idx),
                        )
                      }
                      className="md:mt-6 p-3 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setAbsentEntries([
                      ...absentEntries,
                      {
                        id: Date.now().toString() + Math.random(),
                        name: "",
                        subject: "",
                      },
                    ])
                  }
                  className="w-full p-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                >
                  <Plus size={20} /> إضافة حقل لاسم جديد
                </button>
              </div>
              <div className="p-6 bg-slate-50 border-t flex gap-4">
                <button
                  onClick={submitAddAbsentees}
                  className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <CheckCircle size={24} /> تأكيد وإضافة للجدول
                </button>
                <button
                  onClick={() => setIsAddAbsentModalOpen(false)}
                  className="px-8 bg-white border-2 text-slate-400 rounded-2xl font-black hover:bg-slate-100 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#7030A0]/10 mb-8 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">
                الفصل الدراسي
              </label>
              <select
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black"
                value={examFilters.semester}
                onChange={(e) =>
                  setExamFilters({ ...examFilters, semester: e.target.value })
                }
              >
                <option value="">الكل</option>
                <option value="الأول">الأول</option>
                <option value="الثاني">الثاني</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">
                {activeSubTab === "الاختبار الشهري" ? "الشهر" : "الفصل"}
              </label>
              <select
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black"
                value={examFilters.month}
                onChange={(e) =>
                  setExamFilters({ ...examFilters, month: e.target.value })
                }
              >
                <option value="">الكل</option>
                {activeSubTab === "الاختبار الشهري"
                  ? [
                      "الأول",
                      "الثاني",
                      "الثالث",
                      "الرابع",
                      "الخامس",
                      "السادس",
                    ].map((m, idx) => (
                      <option key={`${m}-${idx}`} value={m}>
                        {m}
                      </option>
                    ))
                  : ["الأول", "الثاني"].map((t, idx) => (
                      <option key={`${t}-${idx}`} value={t}>
                        {t}
                      </option>
                    ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 mr-2">
                نطاق التاريخ
              </label>
              <div className="flex gap-2 items-center bg-slate-50 p-1 rounded-xl border">
                <input
                  type="date"
                  className="bg-transparent text-[10px] w-full font-bold outline-none"
                  value={examFilters.dateStart}
                  onChange={(e) =>
                    setExamFilters({
                      ...examFilters,
                      dateStart: e.target.value,
                    })
                  }
                />
                <span className="text-slate-300">|</span>
                <input
                  type="date"
                  className="bg-transparent text-[10px] w-full font-bold outline-none"
                  value={examFilters.dateEnd}
                  onChange={(e) =>
                    setExamFilters({ ...examFilters, dateEnd: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">
                اسم الطالب
              </label>
              <input
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                placeholder="بحث..."
                value={examFilters.studentName}
                onChange={(e) =>
                  setExamFilters({
                    ...examFilters,
                    studentName: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">
                المادة
              </label>
              <select
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black"
                value={examFilters.subject}
                onChange={(e) =>
                  setExamFilters({ ...examFilters, subject: e.target.value })
                }
              >
                <option value="">الكل</option>
                {currentSubjects.map((s, sIdx) => (
                  <option key={`${s}-${sIdx}`} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 mr-2">
                الحالة
              </label>
              <select
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-black"
                value={examFilters.status}
                onChange={(e) =>
                  setExamFilters({ ...examFilters, status: e.target.value })
                }
              >
                <option value="">الكل</option>
                <option value="tested">تم الاختبار</option>
                <option value="not_tested">لم يختبر</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                title="واتساب"
                onClick={handleExportWA}
                className="p-3 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all flex-1 flex justify-center"
              >
                <Share2 size={20} />
              </button>
              <button
                title="إكسل"
                onClick={handleExportExcel}
                className="p-3 bg-green-700 text-white rounded-xl shadow-md hover:bg-green-800 active:scale-95 transition-all flex-1 flex justify-center"
              >
                <FileSpreadsheet size={20} />
              </button>
              <button
                title="مسح الفلاتر"
                onClick={() =>
                  setExamFilters({
                    semester: "",
                    month: "",
                    dateStart: "",
                    dateEnd: "",
                    studentName: "",
                    grade: "",
                    section: "",
                    subject: "",
                    score: "",
                    status: "",
                  })
                }
                className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[2.5rem] border-[3px] border-[#7030A0] shadow-xl bg-white">
          <table className="w-full border-collapse text-center min-w-[1400px]">
            <thead>
              <tr className="bg-[#FFD966] text-[#7030A0] font-black text-sm border-b-[2px] border-[#7030A0]">
                <th
                  rowSpan={2}
                  className="p-4 border-e-2 border-[#7030A0] w-12"
                >
                  م
                </th>
                <th
                  rowSpan={2}
                  className="p-4 border-e-2 border-[#7030A0] w-64 text-right"
                >
                  اسم الطالب الغائب
                </th>
                <th
                  rowSpan={2}
                  className="p-4 border-e-2 border-[#7030A0] w-32"
                >
                  التاريخ
                </th>
                {currentSubjects.map((subj, sIdx) => (
                  <th
                    key={`${subj}-${sIdx}`}
                    colSpan={2}
                    className="p-2 border-e-2 border-[#7030A0] font-black"
                  >
                    {subj}
                  </th>
                ))}
                <th rowSpan={2} className="p-4 w-12"></th>
              </tr>
              <tr className="bg-slate-50 text-[10px] font-black text-[#7030A0]">
                {currentSubjects.map((subj, i) => (
                  <React.Fragment key={`subject-header-${subj}-${i}`}>
                    <th className="p-2 border-e border-[#7030A0] bg-[#FFD966]/40">
                      الصف/الشعبة
                    </th>
                    <th className="p-2 border-e-2 border-[#7030A0] bg-[#F4CCCC]">
                      الدرجة
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={currentSubjects.length * 2 + 4}
                    className="p-20 text-slate-300 italic text-xl font-bold"
                  >
                    لا توجد بيانات مسجلة مطابقة للبحث حالياً.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className="border-b-[2px] border-[#7030A0]/10 hover:bg-[#FDF6E3] transition-colors h-14 group"
                  >
                    <td className="border-e-2 border-[#7030A0] bg-slate-50 font-black">
                      {idx + 1}
                    </td>
                    <td className="border-e-2 border-[#7030A0] p-1">
                      <div className="relative group/name">
                        <input
                          className="w-full p-2 text-right font-black outline-none bg-transparent focus:bg-white rounded-lg"
                          value={log.studentName || ""}
                          onChange={(e) =>
                            updateExamLog(log.id, "studentName", e.target.value)
                          }
                          placeholder="اكتب اسم الطالب..."
                        />
                      </div>
                    </td>
                    <td className="border-e-2 border-[#7030A0] p-1">
                      <input
                        type="date"
                        className="w-full p-2 text-center text-[10px] font-bold outline-none bg-transparent"
                        value={log.date || ""}
                        onChange={(e) =>
                          updateExamLog(log.id, "date", e.target.value)
                        }
                      />
                    </td>
                    {currentSubjects.map((subj, sIdx) => (
                      <React.Fragment key={`${subj}-${sIdx}`}>
                        <td
                          className={`border-e border-[#7030A0]/20 p-1 transition-colors ${log.subjectsData[subj]?.status === "not_tested" ? "bg-amber-50" : ""}`}
                        >
                          <input
                            className="w-full p-1 text-center text-[11px] font-bold outline-none bg-transparent focus:bg-white rounded"
                            value={log.subjectsData[subj]?.class || ""}
                            onChange={(e) =>
                              updateSubjectData(
                                log.id,
                                subj,
                                "class",
                                e.target.value,
                              )
                            }
                            placeholder="مثال: 9-أ"
                          />
                        </td>
                        <td className="border-e-2 border-[#7030A0] p-1 relative">
                          <div className="flex items-center gap-1">
                            <input
                              className="w-full p-1 text-center text-[11px] font-black text-red-600 outline-none bg-transparent focus:bg-white rounded"
                              value={log.subjectsData[subj]?.grade || ""}
                              onChange={(e) =>
                                updateSubjectData(
                                  log.id,
                                  subj,
                                  "grade",
                                  e.target.value,
                                )
                              }
                              placeholder="0"
                            />
                            <button
                              onClick={() =>
                                updateSubjectData(
                                  log.id,
                                  subj,
                                  "status",
                                  log.subjectsData[subj]?.status === "tested"
                                    ? "not_tested"
                                    : "tested",
                                )
                              }
                              className={`p-1 rounded-md transition-all ${log.subjectsData[subj]?.status === "tested" ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-300"}`}
                            >
                              <CheckCircle size={10} />
                            </button>
                          </div>
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="p-2">
                      {!isReadOnly && (
                        <button
                          onClick={() =>
                            updateData({
                              examLogs: data.examLogs?.filter(
                                (l) => l.id !== log.id,
                              ),
                            })
                          }
                          className="text-red-300 hover:text-red-600 p-2 rounded-xl transition-all hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
            <div className="w-3 h-3 rounded-full bg-[#FFD966]"></div>
            <span className="text-[10px] font-black">أصفر: بيانات الصف</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
            <div className="w-3 h-3 rounded-full bg-[#F4CCCC]"></div>
            <span className="text-[10px] font-black">وردي: درجة الطالب</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm">
            <div className="w-3 h-3 rounded-full bg-[#7030A0]"></div>
            <span className="text-[10px] font-black">
              أرجواني: إطار الجدول الرسمي
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderAbsenceModule = () => {
    const suggestions =
      searchQuery.trim() && searchQuery !== absenceForm.studentName
        ? students.filter((s) => s.name && s.name.includes(searchQuery))
        : [];
    const nameSugg = nameInput.trim()
      ? students.filter(
          (s) => s.name && s.name.includes(nameInput) && !tempNames.includes(s.name),
        )
      : [];

    const handleWhatsAppAttendance = (
      mode: "all" | "present" | "absent" | "selected",
    ) => {
      let list = filteredPresence;
      if (mode === "present") {
        list = list.filter(
          (s) => (attendanceMap[s.id] || "present") === "present",
        );
      } else if (mode === "absent") {
        list = list.filter((s) => {
          const status = attendanceMap[s.id] || "present";
          return status === "absent_excused" || status === "absent_unexcused";
        });
      } else if (mode === "selected") {
        list = list.filter((s) => selectedForWA.includes(s.id));
      }

      let msg = `*📋 حضور وغياب يوم: ${getDayName(presenceDate)}*\n`;
      msg += `*بتاريخ:* ${presenceDate}\n`;
      msg += `*للصف:* ${presenceGrade || "الكل"} *والشعبة:* ${presenceSection || "الكل"}\n`;
      msg += `----------------------------------\n\n`;

      list.forEach((s, idx) => {
        const status = attendanceMap[s.id] || "present";
        const statusIcon =
          status === "present"
            ? "✅"
            : status === "absent_excused"
              ? "🟠"
              : "❌";
        const statusText =
          status === "present"
            ? "حاضر"
            : status === "absent_excused"
              ? "غائب بعذر"
              : "غائب بدون عذر";
        msg += `*${idx + 1}* 👤 *الاسم:* ${s.name}\n`;
        msg += `📍 *الصف:* ${s.grade} / ${s.section}\n`;
        msg += `🏷️ *الحالة:* ${statusIcon} ${statusText}\n`;
        msg += `📞 *ولي الأمر:* ${s.guardianPhones[0] || "---"}\n\n`;
      });

      if (list.length === 0) {
        toast.error("لا يوجد طلاب لإرسالهم في هذه الفئة.");
        return;
      }

      msg += `----------------------------------\n`;
      msg += `${getReportMessageFooter()}\n`;

      shareViaWhatsApp(msg);
    };

    const filtered = (data.absenceLogs || []).filter((l) => {
      if (!matchesFilter(l.userId)) return false;
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName))
        return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester)
        return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section)
        return false;
      return true;
    });

    const statusOptions = [
      { id: "expected", label: "غياب متوقع", color: "bg-red-600" },
      { id: "recurring", label: "غياب متكرر", color: "bg-slate-100" },
      { id: "week1", label: "أكثر من أسبوع", color: "bg-slate-100" },
      { id: "week2", label: "أكثر من أسبوعين", color: "bg-slate-100" },
      { id: "most", label: "الأكثر غياباً", color: "bg-slate-100" },
      { id: "disconnected", label: "المنقطع", color: "bg-slate-100" },
    ];

    const reasons = ["مرض", "انشغال", "تأخر", "لم يمر له الباص", "سفر"];

    const handleSelectStudent = (s: StudentReport) => {
      setAbsenceForm({
        ...absenceForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevAbsenceCount: (data.absenceLogs || []).filter(
          (l) => l.studentId === s.id,
        ).length,
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (isReadOnly) return;
      if (!absenceForm.studentId) {
        toast.error("يرجى اختيار طالب أولاً");
        return;
      }
      const newLog: AbsenceLog = {
        ...(absenceForm as AbsenceLog),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        day: getDayName(absenceForm.date || today),
      };
      updateData({ absenceLogs: [newLog, ...(data.absenceLogs || [])] });
      setAbsenceForm({ ...absenceFormInitial } as any);
      setSearchQuery("");
      toast.success("تم حفظ البيانات بنجاح");
    };

    const cols = [
      { label: "اسم الطالب", key: "studentName" },
      { label: "الصف / الشعبة", key: "grade" },
      { label: "عدد الغياب", key: "prevAbsenceCount" },
      { label: "التاريخ", key: "date" },
      { label: "السبب", key: "reason" },
      { label: "حالة التواصل", key: "commStatus" },
      { label: "المجيب", key: "replier" },
      { label: "ملاحظات", key: "notes" },
    ];

    // START OF CHANGE - Requirement Logic for Smart Lists
    const isNextDay = (d1: string, d2: string) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1;
    };

    const getAbsenceStreak = (studentId: string) => {
      const logs = [...(data.absenceLogs || [])]
        .filter((l) => l.studentId === studentId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
      let streak = 0;
      for (let i = 0; i < logs.length - 1; i++) {
        if (isNextDay(logs[i].date, logs[i + 1].date)) streak++;
        else break;
      }
      return streak + (logs.length > 0 ? 1 : 0);
    };

    const getSmartList = (statusId: string): CategoryMember[] => {
      const logs = data.absenceLogs || [];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      const manual = data.absenceManualAdditions?.[statusId] || [];
      const exclusions = data.absenceExclusions?.[statusId] || [];

      let autoIds: string[] = [];
      if (statusId === "expected") {
        autoIds = Array.from(
          new Set(
            logs.filter((l) => l.date === yesterday).map((l) => l.studentId),
          ),
        );
      } else if (statusId === "recurring") {
        autoIds = Array.from(
          new Set(
            logs
              .filter((l) => {
                return logs.some(
                  (l2) =>
                    l2.studentId === l.studentId && isNextDay(l2.date, l.date),
                );
              })
              .map((l) => l.studentId),
          ),
        );
      } else if (statusId === "most") {
        const counts: Record<string, number> = {};
        logs.forEach(
          (l) => (counts[l.studentId] = (counts[l.studentId] || 0) + 1),
        );
        autoIds = Object.keys(counts).filter((id) => counts[id] >= 15);
      } else if (statusId === "disconnected") {
        autoIds = Array.from(
          new Set(
            students
              .map((s) => s.id)
              .filter((id) => getAbsenceStreak(id) >= 20),
          ),
        );
      } else if (statusId === "week1") {
        autoIds = Array.from(
          new Set(
            students.map((s) => s.id).filter((id) => getAbsenceStreak(id) >= 5),
          ),
        );
      } else if (statusId === "week2") {
        autoIds = Array.from(
          new Set(
            students
              .map((s) => s.id)
              .filter((id) => getAbsenceStreak(id) >= 10),
          ),
        );
      }

      const allIds = Array.from(new Set([...autoIds, ...manual])).filter(
        (id) => !exclusions.includes(id),
      );

      return allIds.map((id) => {
        const s = students.find((x) => x.id === id);
        return {
          id,
          name: s?.name || "طالب غير معروف",
          grade: s?.grade || "---",
          section: s?.section || "---",
          isAuto: autoIds.includes(id),
        };
      });
    };

    const toggleExclusion = (statusId: string, studentId: string) => {
      const exclusions = data.absenceExclusions || {};
      const current = exclusions[statusId] || [];
      const updated = current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId];

      // Update student notes sync
      const statusLabel =
        statusOptions.find((o) => o.id === statusId)?.label || "";
      const isRemoving = !current.includes(studentId); // removing from auto list via exclusion

      const updatedStudents = [...(data.studentReports || [])];
      const index = updatedStudents.findIndex(s => s.id === studentId);
      if (index >= 0) {
        updatedStudents[index] = { ...updatedStudents[index], otherNotesText: isRemoving ? "" : statusLabel };
      } else {
        const sourceStudent = students.find(s => s.id === studentId);
        if (sourceStudent) {
          updatedStudents.push({ ...sourceStudent, otherNotesText: isRemoving ? "" : statusLabel });
        }
      }

      updateData({
        absenceExclusions: { ...exclusions, [statusId]: updated },
        studentReports: updatedStudents,
      });
    };

    const addManual = (statusId: string, studentId: string) => {
      const manual = data.absenceManualAdditions || {};
      const current = manual[statusId] || [];
      if (!current.includes(studentId)) {
        const statusLabel =
          statusOptions.find((o) => o.id === statusId)?.label || "";
          
        const updatedStudents = [...(data.studentReports || [])];
        const index = updatedStudents.findIndex(s => s.id === studentId);
        if (index >= 0) {
          updatedStudents[index] = { ...updatedStudents[index], otherNotesText: statusLabel };
        } else {
          const sourceStudent = students.find(s => s.id === studentId);
          if (sourceStudent) {
            updatedStudents.push({ ...sourceStudent, otherNotesText: statusLabel });
          }
        }

        updateData({
          absenceManualAdditions: {
            ...manual,
            [statusId]: [...current, studentId],
          },
          studentReports: updatedStudents,
        });
      }
    };
    // END OF CHANGE

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.absenceLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button
              onClick={() => {
                setShowTable(!showTable);
                setShowPresenceTracker(false);
              }}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${!showTable && !showPresenceTracker ? "bg-blue-600 text-white shadow-md" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            >
              <Plus size={18} /> رصد غياب جديد
            </button>
            <button
              onClick={() => {
                setShowTable(true);
                setShowPresenceTracker(false);
              }}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${showTable && !showPresenceTracker ? "bg-blue-600 text-white shadow-md" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            >
              <LayoutList size={18} /> جدول السجلات
            </button>
            <button
              onClick={() => {
                setShowPresenceTracker(true);
                setShowTable(false);
              }}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${showPresenceTracker ? "bg-green-600 text-white shadow-md" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
            >
              <Filter size={18} /> تحضير الطلاب (فلتر)
            </button>
            {!showTable && !showPresenceTracker && (
              <button
                onClick={() => setShowFrequentNames(true)}
                className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
              تقرير الغياب اليومي <Clock className="text-blue-600" size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                className="text-[10px] md:text-xs font-black bg-transparent outline-none"
                value={absenceForm.date}
                onChange={(e) =>
                  setAbsenceForm({ ...absenceForm, date: e.target.value })
                }
              />
              <span className="text-[10px] font-bold text-slate-400">
                {getDayName(absenceForm.date || today)}
              </span>
            </div>
          </div>
        </div>

        {showPresenceTracker ? (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6 shadow-sm">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">
                      الفرع
                    </label>
                    <div className="flex gap-1 bg-white p-1 rounded-xl border-2">
                      {["طلاب", "طالبات"].map((b) => (
                        <button
                          key={b}
                          onClick={() =>
                            setPresenceBranch((prev) =>
                              prev.includes(b)
                                ? prev.filter((x) => x !== b)
                                : [...prev, b],
                            )
                          }
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${presenceBranch.includes(b) ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">
                      الصف
                    </label>
                    <select
                      className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none min-w-[100px]"
                      value={presenceGrade}
                      onChange={(e) => setPresenceGrade(e.target.value)}
                    >
                      <option value="">اختر الصف...</option>
                      {gradeOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">
                      الشعبة
                    </label>
                    <select
                      className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none min-w-[80px]"
                      value={presenceSection}
                      onChange={(e) => setPresenceSection(e.target.value)}
                    >
                      <option value="">الكل</option>
                      {sectionOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 mr-2">
                    تاريخ التحضير
                  </label>
                  <input
                    type="date"
                    className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none"
                    value={presenceDate}
                    onChange={(e) => setPresenceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* START OF CHANGE - New Controls for Auto-Save and Archive */}
              <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">
                      الفصل الدراسي
                    </label>
                    <select
                      className="p-2.5 bg-white border-2 rounded-xl text-xs font-black outline-none w-32"
                      value={selectedSemester}
                      onChange={(e) =>
                        setSelectedSemester(e.target.value as any)
                      }
                    >
                      <option value="الأول">الأول</option>
                      <option value="الثاني">الثاني</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      // Bulk Save Logic
                      const absentees = filteredPresence.filter((s) => {
                        const status = attendanceMap[s.id];
                        return (
                          status === "absent_excused" ||
                          status === "absent_unexcused"
                        );
                      });

                      if (absentees.length === 0) {
                        toast.error(
                          "لا يوجد طلاب غائبين للحفظ (بعذر أو بدون عذر).",
                        );
                        return;
                      }

                      const newLogs = absentees.map((s) => {
                        const status = attendanceMap[s.id];
                        const contactMethod = contactMethodMap[s.id];
                        const prevCount = (data.absenceLogs || []).filter(
                          (l) => l.studentId === s.id,
                        ).length;

                        return {
                          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                          userId: currentUser?.id,
                          studentId: s.id,
                          studentName: s.name,
                          grade: s.grade,
                          section: s.section,
                          day: getDayName(presenceDate),
                          date: presenceDate,
                          semester: selectedSemester,
                          prevAbsenceCount: prevCount,
                          status:
                            status === "absent_excused"
                              ? "expected"
                              : "recurring",
                          reason:
                            status === "absent_excused"
                              ? "غائب بعذر"
                              : "غائب بدون عذر",
                          commType:
                            contactMethod === "رسالة"
                              ? "رسالة sms"
                              : contactMethod === "هاتف"
                                ? "هاتف"
                                : "أخرى",
                          commStatus: contactMethod
                            ? "تم التواصل"
                            : "قيد المتابعة",
                          replier: "غيرهم",
                          notes: "",
                          result: "لم يتم الرد",
                        } as AbsenceLog;
                      });

                      updateData({
                        absenceLogs: [...newLogs, ...(data.absenceLogs || [])],
                      });
                      toast.success(
                        `تم حفظ ${newLogs.length} سجل غياب بنجاح وتمت الأرشفة.`,
                      );

                      // Reset
                      setAttendanceMap({});
                      setContactMethodMap({});
                      setSelectedForWA([]);
                      setPresenceGrade("");
                      setPresenceSection("");
                    }}
                    className="flex items-center gap-2 bg-[#7030A0] text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#5a2480] shadow-md transition-all active:scale-95"
                  >
                    <Save size={18} /> حفظ الغياب المفتوح
                  </button>
                </div>
                <button
                  onClick={() => setAbsenceArchiveOpen(true)}
                  className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-black shadow-md transition-all active:scale-95"
                >
                  <Archive size={18} /> أرشيف الغياب
                </button>
              </div>
              {/* END OF CHANGE */}
            </div>

            {/* New Archive Modal */}
            {absenceArchiveOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-arabic">
                <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-slate-800 flex flex-col max-h-[90vh]">
                  <div className="p-6 bg-slate-800 text-white flex justify-between items-center shadow-lg">
                    <h3 className="text-2xl font-black flex items-center gap-3">
                      <Archive size={28} /> أرشيف الغياب المرصود
                    </h3>
                    <button
                      onClick={() => setAbsenceArchiveOpen(false)}
                      className="hover:bg-slate-700 p-2 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6 bg-slate-50 border-b flex gap-4 overflow-x-auto">
                    {/* Simple Filters for Archive */}
                    <input
                      type="date"
                      className="p-3 rounded-xl border font-bold text-xs"
                      onChange={(e) =>
                        setFilterValues({
                          ...filterValues,
                          start: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="بحث بالاسم..."
                      className="p-3 rounded-xl border font-bold text-xs w-64"
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        // Export WA Logic for Archive
                        const filteredArchive = (data.absenceLogs || []).filter(
                          (l) =>
                            !searchQuery || l.studentName.includes(searchQuery),
                        );
                        shareWhatsAppRich(
                          "أرشيف الغياب",
                          filteredArchive,
                          cols,
                        );
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-green-700"
                    >
                      <MessageCircle size={18} /> إرسال واتساب
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <table className="w-full text-center border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 z-10">
                        <tr>
                          <th className="p-4 border-b">م</th>
                          <th className="p-4 border-b text-right">الاسم</th>
                          <th className="p-4 border-b">الصف</th>
                          <th className="p-4 border-b">التاريخ</th>
                          <th className="p-4 border-b">السبب</th>
                          <th className="p-4 border-b">الحالة</th>
                          <th className="p-4 border-b">التواصل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.absenceLogs || [])
                          .filter(
                            (l) =>
                              !searchQuery ||
                              l.studentName.includes(searchQuery),
                          )
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime(),
                          )
                          .map((log, idx) => (
                            <tr
                              key={log.id}
                              className="hover:bg-slate-50 transition-colors cursor-pointer border-b last:border-none focus:bg-sky-100 active:bg-sky-100"
                              tabIndex={0} // Make focusable for simple highlight
                              onClick={(e) => e.currentTarget.focus()} // Quick self-focus highlight
                            >
                              <td className="p-4 font-black text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="p-4 text-right font-black">
                                {log.studentName}
                              </td>
                              <td className="p-4 text-xs font-bold text-slate-500">
                                {log.grade} / {log.section}
                              </td>
                              <td className="p-4 text-xs font-bold text-blue-600">
                                {log.date}
                              </td>
                              <td className="p-4 font-bold text-red-500">
                                {log.reason}
                              </td>
                              <td className="p-4 text-xs">{log.status}</td>
                              <td className="p-4 text-xs">
                                {log.commType} - {log.commStatus}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center py-4 space-y-2">
              <h3 className="text-2xl font-black text-slate-800">
                حضور وغياب يوم:{" "}
                <span className="text-blue-600">
                  {getDayName(presenceDate)}
                </span>{" "}
                بتاريخ <span className="text-blue-600">{presenceDate}</span>
              </h3>
              <p className="text-slate-500 font-bold">
                تفاصيل الجدول حسب الفلتر للصف:{" "}
                <span className="text-slate-800">{presenceGrade || "---"}</span>{" "}
                والشعبة{" "}
                <span className="text-slate-800">
                  {presenceSection || "---"}
                </span>
              </p>
            </div>

            <div className="overflow-x-auto rounded-[2.5rem] border-[3px] border-blue-100 shadow-xl bg-white">
              <table className="w-full text-center border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black border-b-2 border-blue-100">
                  <tr>
                    <th className="p-4 border-e border-blue-50 w-12">م</th>
                    <th className="p-4 border-e border-blue-50 w-12">
                      <input
                        type="checkbox"
                        checked={
                          filteredPresence.length > 0 &&
                          filteredPresence.every((s) => selectedForWA.includes(s.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForWA(filteredPresence.map((s) => s.id));
                          } else {
                            setSelectedForWA([]);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer mx-auto"
                      />
                    </th>
                    <th className="p-4 border-e border-blue-50 text-right">
                      اسم الطالب
                    </th>
                    <th className="p-4 border-e border-blue-50 w-24">الصف</th>
                    <th className="p-4 border-e border-blue-50 w-24">الشعبة</th>
                    <th className="p-4 border-e border-blue-50 w-32">
                      حالة الغياب والتحضير
                    </th>
                    <th className="p-4 border-e border-blue-50 w-48">
                      رقم ولي الأمر
                    </th>
                    <th className="p-4 w-32">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPresence.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-20 text-slate-300 italic text-lg font-bold"
                      >
                        لا توجد بيانات طلاب مطابقة للفلتر المختار.
                      </td>
                    </tr>
                  ) : (
                    filteredPresence.map((s, idx) => {
                      const status = attendanceMap[s.id] || "present";
                      return (
                        <tr
                          key={s.id}
                          className={`${
                            highlightedPresenceStudentId === s.id
                              ? "bg-orange-100/50 hover:bg-orange-100/70 transition-colors font-bold"
                              : "hover:bg-slate-50 transition-colors font-bold"
                          }`}
                        >
                          <td className="p-4 border-e border-slate-100 bg-slate-50/50">
                            {idx + 1}
                          </td>
                          <td className="p-4 border-e border-slate-100">
                            <input
                              type="checkbox"
                              checked={selectedForWA.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForWA((prev) => [...prev, s.id]);
                                } else {
                                  setSelectedForWA((prev) => prev.filter((id) => id !== s.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer mx-auto"
                            />
                          </td>
                          <td
                            className="p-4 text-right border-e border-slate-100 cursor-pointer select-none font-black"
                            onClick={() => setHighlightedPresenceStudentId(highlightedPresenceStudentId === s.id ? null : s.id)}
                          >
                            {s.name}
                          </td>
                          <td className="p-4 border-e border-slate-100">
                            {s.grade}
                          </td>
                          <td className="p-4 border-e border-slate-100">
                            {s.section}
                          </td>
                          <td className="p-2 border-e border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // prevent row click
                                const current = attendanceMap[s.id] || "present";
                                const next =
                                  current === "present"
                                    ? "absent_excused"
                                    : current === "absent_excused"
                                      ? "absent_unexcused"
                                      : "present";
                                setAttendanceMap((prev) => ({ ...prev, [s.id]: next as any }));
                                autoSaveAttendance(s, next);
                              }}
                              className={"px-6 py-2 rounded-full text-xs font-black transition-all shadow-sm border " + (
                                status === "present"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : status === "absent_excused"
                                    ? "bg-orange-100 text-orange-700 border-orange-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                              )}
                            >
                              {status === "present"
                                ? "حاضر"
                                : status === "absent_excused"
                                  ? "غياب بعذر"
                                  : "غياب بدون عذر"}
                            </button>
                          </td>
                          <td className="p-2 border-e border-slate-50 font-bold text-slate-600">
                            {s.guardianPhones[0] || "---"}
                          </td>
                          <td className="p-2">
                            <div className="flex justify-center gap-2">
                              <a
                                href={"sms:" + s.guardianPhones[0] + "?body=" + encodeURIComponent("نحيطكم علماً بغياب الطالب " + s.name + " هذا اليوم. " + getReportMessageFooter(presenceDate))}
                                onClick={() => updateContactMethodAndSave(s.id, "رسالة")}
                                className={"p-2 rounded-xl transition-all " + (contactMethodMap[s.id] === "رسالة" ? "bg-blue-600 text-white shadow-md" : "bg-blue-50 text-blue-600 hover:bg-blue-100")}
                              >
                                <MessageSquare size={18} />
                              </a>
                              <a
                                href={"tel:" + s.guardianPhones[0]}
                                onClick={() => updateContactMethodAndSave(s.id, "هاتف")}
                                className={"p-2 rounded-xl transition-all " + (contactMethodMap[s.id] === "هاتف" ? "bg-green-600 text-white shadow-md" : "bg-green-50 text-green-600 hover:bg-green-100")}
                              >
                                <PhoneCall size={18} />
                              </a>
                              <button
                                onClick={() => {
                                  const statusEmoji =
                                    status === "present"
                                      ? "🟢"
                                      : status === "absent_excused"
                                        ? "🟡"
                                        : "🔴";
                                  const statusText =
                                    status === "present"
                                      ? "حاضر"
                                      : status === "absent_excused"
                                        ? "غياب بعذر"
                                        : "غياب بدون عذر";
                                  let msg = "*تقرير حضور وغياب الطالب/الطالبة*\n\n";
                                  msg += "👤 *الاسم:* " + s.name + "\n";
                                  msg += "📍 *الصف:* " + s.grade + " / " + s.section + "\n";
                                  msg += "📝 *الحالة اليوم:* " + statusEmoji + " " + statusText + "\n";
                                  msg += "📅 *التاريخ:* " + presenceDate + " (" + getDayName(presenceDate) + ")\n";

                                  const phoneLabelRegex = /(?:رقم الهاتف|هاتف|رقم|جوال)\s*[:]?\s*(?:\+?[\d\s-]{9,15})\b/g;
                                  msg = msg.replace(phoneLabelRegex, '');
                                  msg = msg.trimEnd();
                                  msg += "\n----------------------------------\n";
                                  msg += getReportMessageFooter(presenceDate);

                                  shareViaWhatsApp(msg, s.guardianPhones[0]);
                                  updateContactMethodAndSave(s.id, "واتساب");
                                }}
                                className={"p-2 rounded-xl transition-all " + (contactMethodMap[s.id] === "واتساب" ? "bg-emerald-600 text-white shadow-md" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}
                              >
                                <MessageCircle size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex flex-wrap gap-3 items-center justify-center">
              <span className="font-black text-slate-400 ml-4">
                تصدير التحضير للواتساب:
              </span>
              <button
                onClick={() => handleWhatsAppAttendance("all")}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-blue-700 shadow-md"
              >
                جميع الطلاب
              </button>
              <button
                onClick={() => handleWhatsAppAttendance("present")}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-green-700 shadow-md"
              >
                الحاضرين فقط
              </button>
              <button
                onClick={() => handleWhatsAppAttendance("absent")}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-red-700 shadow-md"
              >
                الغائبين فقط
              </button>
              <button
                onClick={() => handleWhatsAppAttendance("selected")}
                className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-black shadow-md"
              >
                الأسماء المحددة
              </button>
              <div className="flex gap-2 mr-6 border-r pr-6">
                <button
                  onClick={() => {}}
                  title="استيراد"
                  className="p-3 bg-white border-2 text-blue-600 rounded-xl shadow-sm hover:bg-blue-50 transition-all"
                >
                  <Upload size={18} />
                </button>
                <button
                  onClick={() =>
                    exportTxtFiltered(
                      "التحضير_اليومي",
                      filteredPresence.map((s) => ({
                        ...s,
                        status:
                          attendanceMap[s.id] === "absent" ? "غائب" : "حاضر",
                      })),
                      [
                        { label: "الاسم", key: "name" },
                        { label: "الحالة", key: "status" },
                      ],
                      data.profile,
                    )
                  }
                  title="تصدير TXT"
                  className="p-3 bg-white border-2 text-slate-600 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() =>
                    exportExcelFiltered(
                      "التحضير_اليومي",
                      filteredPresence.map((s) => ({
                        ...s,
                        status:
                          attendanceMap[s.id] === "absent" ? "غائب" : "حاضر",
                      })),
                      [
                        { label: "الاسم", key: "name" },
                        { label: "الحالة", key: "status" },
                      ],
                      data.profile,
                      currentUser,
                    )
                  }
                  title="تصدير إكسل"
                  className="p-3 bg-white border-2 text-green-700 rounded-xl shadow-sm hover:bg-green-50 transition-all"
                >
                  <FileSpreadsheet size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : !showTable ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-6">
              {/* START OF CHANGE - Enhanced Status Buttons with Popover List */}
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end">
                {statusOptions.map((opt) => (
                  <div key={opt.id} className="relative group">
                    <button
                      onClick={() => {
                        setAbsenceForm({
                          ...absenceForm,
                          status: opt.id as any,
                        });
                        // Toggle name selection mode or just set it
                      }}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all border ${absenceForm.status === opt.id ? "bg-red-600 text-white border-red-600 shadow-lg scale-105" : "bg-slate-50 text-slate-500 border-slate-100"}`}
                    >
                      {opt.label} ({getSmartList(opt.id).length})
                    </button>

                    {/* Popover List for each status */}
                    <div className="hidden group-hover:block fixed inset-x-8 top-[20%] z-[500] w-auto max-h-[60vh] overflow-y-auto bg-white border-4 border-slate-800 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] p-4 animate-in zoom-in-95 duration-200 md:absolute md:inset-auto md:top-full md:left-0 md:z-[110] md:mt-2 md:w-72 md:border-2 md:shadow-2xl md:rounded-2xl">
                      <div className="flex justify-between items-center mb-2 border-b pb-1">
                        <h4 className="text-[10px] font-black text-blue-600">
                          قائمة: {opt.label}
                        </h4>
                        <button
                          onClick={() => {
                            const list = getSmartList(opt.id);
                            if (list.length === 0) return;
                            let msg = `*📋 قائمة ${opt.label}*\n\n`;
                            list.forEach((m, i) => {
                              msg += `${i + 1}. 👤 *${m.name}* (${m.grade}-${m.section})\n`;
                            });
                            msg += `\n📅 التاريخ: ${today}\n`;
                            msg += `----------------------------------\n`;
                            msg += `${getReportMessageFooter(today)}\n`;
                            shareViaWhatsApp(msg);
                          }}
                          className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="إرسال القائمة بالكامل للواتساب"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getSmartList(opt.id).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group/item border-b border-slate-50 last:border-none"
                          >
                            <button
                              onClick={() => {
                                // Navigation and Highlighting
                                
                                onNavigate?.("studentReports");
                              }}
                              className="text-[10px] font-bold text-slate-700 hover:text-blue-600 truncate flex-1 text-right"
                              title="انتقل إلى شؤون الطلاب"
                            >
                              {m.name}
                            </button>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] text-slate-400 bg-slate-100 px-1 rounded">
                                {m.grade}-{m.section}
                              </span>
                              <button
                                onClick={() => {
                                  let msg = `*📋 تنبيه: ${opt.label}*\n\n`;
                                  msg += `👤 *الطالب:* ${m.name}\n`;
                                  msg += `📍 *الصف:* ${m.grade}-${m.section}\n`;
                                  msg += `📅 التاريخ: ${today}\n`;
                                  msg += `----------------------------------\n`;
                                  msg += `${getReportMessageFooter(today)}\n`;
                                  shareViaWhatsApp(msg);
                                }}
                                className="p-1 text-emerald-500 hover:text-emerald-700 rounded transition-colors"
                                title="إرسال للواتساب"
                              >
                                <MessageCircle size={12} />
                              </button>
                              <button
                                onClick={() => toggleExclusion(opt.id, m.id)}
                                className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                                title="حذف من القائمة"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t flex flex-col gap-2">
                        <label className="text-[8px] font-black text-slate-400">
                          إضافة طالب يدوياً:
                        </label>
                        <div className="flex gap-1">
                          <select
                            className="flex-1 text-[9px] p-1 border rounded"
                            onChange={(e) => addManual(opt.id, e.target.value)}
                            value=""
                          >
                            <option value="">اختر...</option>
                            {students.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* END OF CHANGE */}
              <div className="relative">
                <label className="text-xs font-black text-slate-400 mb-2 block mr-2">
                  اسم الطالب
                </label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                  <Search className="text-slate-400" size={20} />
                  <input
                    type="text"
                    className="bg-transparent w-full outline-none font-black text-base md:text-lg"
                    placeholder="ابحث عن الاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-48 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-right p-3 md:p-4 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center transition-colors"
                      >
                        <span className="text-xs md:text-sm">{s.name}</span>
                        <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">
                          {s.grade} - {s.section}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-[#FFF2CC]/30 p-4 md:p-5 rounded-3xl border-2 border-[#FFF2CC] text-center shadow-sm">
                  <label className="text-[9px] md:text-[10px] font-black text-orange-600 mb-1 block">
                    غياب سابق
                  </label>
                  <span className="text-2xl md:text-3xl font-black text-slate-800">
                    {absenceForm.prevAbsenceCount || 0}
                  </span>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-3xl border-2 border-blue-100 relative shadow-sm text-center">
                  <label className="text-[9px] md:text-[10px] font-black text-blue-600 mb-1 block">
                    الفصل
                  </label>
                  <select
                    className="bg-white border text-[10px] md:text-xs font-black p-1 md:p-2 rounded-lg outline-none cursor-pointer w-full text-center"
                    value={absenceForm.semester}
                    onChange={(e) =>
                      setAbsenceForm({
                        ...absenceForm,
                        semester: e.target.value as any,
                      })
                    }
                  >
                    <option value="الأول">الأول</option>
                    <option value="الثاني">الثاني</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 mr-2 block">
                  سبب الغياب
                </label>
                <div className="flex flex-wrap gap-2 justify-end">
                  {reasons.map((r) => (
                    <button
                      key={r}
                      onClick={() =>
                        setAbsenceForm({ ...absenceForm, reason: r })
                      }
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${absenceForm.reason === r ? "bg-slate-800 text-white border-slate-800 shadow-md" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"}`}
                    >
                      {r}
                    </button>
                  ))}
                  <input
                    className="px-4 py-2 rounded-xl text-[10px] font-black border outline-none bg-slate-50 w-full focus:ring-2 ring-blue-100"
                    placeholder="سبب آخر..."
                    value={absenceForm.reason}
                    onChange={(e) =>
                      setAbsenceForm({ ...absenceForm, reason: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    نوع التواصل
                  </label>
                  <select
                    className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                    value={absenceForm.commType}
                    onChange={(e) =>
                      setAbsenceForm({
                        ...absenceForm,
                        commType: e.target.value as any,
                      })
                    }
                  >
                    {["هاتف", "واتساب", "رسالة", "أخرى"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    حالة التواصل
                  </label>
                  <select
                    className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                    value={absenceForm.commStatus}
                    onChange={(e) =>
                      setAbsenceForm({
                        ...absenceForm,
                        commStatus: e.target.value as any,
                      })
                    }
                  >
                    {["تم التواصل", "لم يتم التواصل", "قيد المتابعة"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    نتيجة التواصل
                  </label>
                  <select
                    className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                    value={absenceForm.result}
                    onChange={(e) =>
                      setAbsenceForm({
                        ...absenceForm,
                        result: e.target.value as any,
                      })
                    }
                  >
                    {["تم الرد", "لم يتم الرد", "الرقم مغلق", "سيحضر غداً"].map(
                      (r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    صفة المجيب
                  </label>
                  <select
                    className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-xs md:text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                    value={absenceForm.replier}
                    onChange={(e) =>
                      setAbsenceForm({
                        ...absenceForm,
                        replier: e.target.value as any,
                      })
                    }
                  >
                    {[
                      "الأب",
                      "الأم",
                      "الأخ",
                      "الأخت",
                      "العم",
                      "الخال",
                      "غيرهم",
                    ].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                  ملاحظات أخرى...
                </label>
                <textarea
                  className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 min-h-[100px] md:min-h-[120px] focus:border-blue-400 shadow-inner"
                  placeholder="ملاحظات إضافية..."
                  value={absenceForm.notes}
                  onChange={(e) =>
                    setAbsenceForm({ ...absenceForm, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={saveLog}
                  className="flex-1 bg-blue-600 text-white p-5 md:p-6 rounded-[2rem] font-black text-lg md:text-xl hover:bg-blue-700 shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all mt-4"
                >
                  <Save size={24} /> حفظ بيانات الغياب
                </button>
                <button
                  onClick={() => setShowPreviousAbsence(true)}
                  className="bg-slate-800 text-white px-8 md:px-10 rounded-[2rem] font-black text-lg hover:bg-black shadow-2xl transition-all mt-4"
                >
                  فتح غياب سابق
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection
              suggestions={nameSugg}
              values={filterValues}
              setValues={setFilterValues}
              tempNames={tempNames}
              setTempNames={setTempNames}
              appliedNames={appliedNames}
              setAppliedNames={setAppliedNames}
              nameInput={nameInput}
              setNameInput={setNameInput}
              onExportExcel={() =>
                exportExcelFiltered(
                  "غياب_الطلاب",
                  filtered,
                  cols,
                  data.profile,
                  currentUser,
                )
              }
              onExportTxt={() =>
                exportTxtFiltered("غياب_الطلاب", filtered, cols, data.profile)
              }
              onExportWA={() =>
                shareWhatsAppRich("سجل غياب الطلاب المفلتر", filtered, cols)
              }
            />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black">
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="p-3 md:p-5 border-e border-slate-200"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-20 text-slate-300 italic text-base md:text-lg font-bold"
                      >
                        لا توجد بيانات غياب مسجلة.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        className={`${
                          highlightedRowId === l.id
                            ? "bg-orange-100/50 hover:bg-orange-100/70 transition-colors"
                            : "hover:bg-blue-50/20 transition-colors"
                        } h-10 md:h-12`}
                      >
                        <td
                          className="p-2 md:p-4 border-e border-slate-100 font-black cursor-pointer select-none"
                          onClick={() => setHighlightedRowId(highlightedRowId === l.id ? null : l.id)}
                        >
                          {l.studentName}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100">
                          {l.grade} / {l.section}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100 text-red-600 font-black text-base">
                          {l.prevAbsenceCount + 1}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100 text-[10px] text-slate-400">
                          {l.date}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100">
                          {l.reason}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100">
                          {l.commStatus}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100">
                          {l.replier}
                        </td>
                        <td className="p-2 md:p-4 text-[10px] text-slate-400">
                          {l.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLatenessModule = () => {
    const suggestions =
      searchQuery.trim() && searchQuery !== latenessForm.studentName
        ? students.filter((s) => s.name && s.name.includes(searchQuery))
        : [];
    const nameSugg = nameInput.trim()
      ? students.filter(
          (s) => s.name && s.name.includes(nameInput) && !tempNames.includes(s.name),
        )
      : [];
    const filtered = (data.studentLatenessLogs || []).filter((l) => {
      if (!matchesFilter(l.userId)) return false;
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName))
        return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester)
        return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section)
        return false;
      return true;
    });

    const reasons = ["مرض", "انشغال", "نوم", "لم يمر له الباص", "بلا عذر"];
    const statusOptions = [
      { id: "recurring", label: "تأخر متكرر", color: "bg-orange-500" },
      { id: "frequent", label: "كثير التأخر", color: "bg-slate-100" },
      { id: "permanent", label: "دائم التأخر", color: "bg-slate-100" },
    ];

    const handleSelectStudent = (s: StudentReport) => {
      setLatenessForm({
        ...latenessForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevLatenessCount: (data.studentLatenessLogs || []).filter(
          (l) => l.studentId === s.id,
        ).length,
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (isReadOnly) return;
      if (!latenessForm.studentId) {
        toast.error("يرجى اختيار طالب أولاً");
        return;
      }
      const newLog: LatenessLog = {
        ...(latenessForm as LatenessLog),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        day: getDayName(latenessForm.date || today),
      };
      updateData({
        studentLatenessLogs: [newLog, ...(data.studentLatenessLogs || [])],
      });
      setLatenessForm({
        ...latenessForm,
        studentName: "",
        studentId: "",
        reason: "",
        pledge: "",
        notes: "",
      });
      setSearchQuery("");
      toast.success("تم حفظ البيانات بنجاح");
    };

    const cols = [
      { label: "اسم الطالب", key: "studentName" },
      { label: "التاريخ", key: "date" },
      { label: "السبب", key: "reason" },
      { label: "الإجراء", key: "action" },
      { label: "البصمة", key: "pledge" },
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.studentLatenessLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button
              onClick={() => setShowTable(!showTable)}
              className="bg-blue-50 text-blue-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-blue-100 transition-all flex items-center gap-2 shadow-sm"
            >
              {showTable ? <Plus size={18} /> : <History size={18} />}
              {showTable ? "رصد جديد" : "جدول السجلات"}
            </button>
            {!showTable && (
              <button
                onClick={() => setShowFrequentNames(true)}
                className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
              تقرير التأخر اليومي{" "}
              <Clock className="text-orange-500" size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                className="text-[10px] md:text-xs font-black bg-transparent outline-none"
                value={latenessForm.date}
                onChange={(e) =>
                  setLatenessForm({ ...latenessForm, date: e.target.value })
                }
              />
              <span className="text-[10px] font-bold text-slate-400">
                {getDayName(latenessForm.date || today)}
              </span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-end">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setLatenessForm({
                        ...latenessForm,
                        status: opt.id as any,
                      })
                    }
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all border ${latenessForm.status === opt.id ? "bg-orange-500 text-white border-orange-500 shadow-lg scale-105" : "bg-slate-50 text-slate-500 border-slate-100"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <label className="text-xs font-black text-slate-400 mb-2 block mr-2">
                  اسم الطالب
                </label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-orange-500 shadow-sm transition-all">
                  <UserCircle className="text-slate-400" size={20} />
                  <input
                    type="text"
                    className="bg-transparent w-full outline-none font-black text-base md:text-lg"
                    placeholder="ابحث عن الاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-48 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-right p-3 md:p-4 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center transition-colors"
                      >
                        <span className="text-xs md:text-sm">{s.name}</span>
                        <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">
                          {s.grade} - {s.section}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-[#FFF2CC]/30 p-4 md:p-5 rounded-3xl border-2 border-[#FFF2CC] text-center shadow-sm">
                  <label className="text-[9px] md:text-[10px] font-black text-orange-600 mb-1 block">
                    تأخر سابق
                  </label>
                  <span className="text-2xl md:text-3xl font-black text-slate-800">
                    {latenessForm.prevLatenessCount || 0}
                  </span>
                </div>
                <div className="bg-blue-50 p-4 md:p-5 rounded-3xl border-2 border-blue-100 relative shadow-sm text-center">
                  <label className="text-[9px] md:text-[10px] font-black text-blue-600 mb-1 block">
                    الفصل
                  </label>
                  <select
                    className="bg-white border text-[10px] md:text-xs font-black p-1 md:p-2 rounded-lg outline-none cursor-pointer w-full text-center"
                    value={latenessForm.semester}
                    onChange={(e) =>
                      setLatenessForm({
                        ...latenessForm,
                        semester: e.target.value as any,
                      })
                    }
                  >
                    <option value="الأول">الأول</option>
                    <option value="الثاني">الثاني</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 mr-2 block">
                  سبب التأخر
                </label>
                <div className="flex flex-wrap gap-2 justify-end">
                  {reasons.map((r) => (
                    <button
                      key={r}
                      onClick={() =>
                        setLatenessForm({ ...latenessForm, reason: r })
                      }
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${latenessForm.reason === r ? "bg-slate-800 text-white border-slate-800 shadow-md" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"}`}
                    >
                      {r}
                    </button>
                  ))}
                  <input
                    className="px-4 py-2 rounded-xl text-[10px] font-black border outline-none bg-slate-50 w-full focus:ring-2 ring-blue-100"
                    placeholder="سبب آخر..."
                    value={latenessForm.reason}
                    onChange={(e) =>
                      setLatenessForm({
                        ...latenessForm,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                  الإجراء المتخذ
                </label>
                <select
                  className="w-full p-4 md:p-5 bg-white border-2 rounded-2xl md:rounded-3xl font-black text-base md:text-lg outline-none focus:border-orange-500 shadow-sm appearance-none"
                  value={latenessForm.action}
                  onChange={(e) =>
                    setLatenessForm({ ...latenessForm, action: e.target.value })
                  }
                >
                  {[
                    "تنبيه 1",
                    "تنبيه 2",
                    "تعهد خطي",
                    "اتصال بولي الأمر",
                    "استدعاء ولي الأمر",
                  ].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-6 md:p-8 bg-[#0f172a] text-white rounded-[2.5rem] shadow-2xl space-y-4 border-4 border-slate-800 relative group overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full group-hover:scale-150 transition-all duration-700"></div>
                <h4 className="flex items-center gap-2 font-black text-base md:text-lg">
                  <Fingerprint className="text-orange-500" /> بصمة الطالب (تعهد)
                </h4>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 leading-relaxed">
                  أتعهد بعدم تكرار التأخر وفي حالة التكرار فللإدارة الحق في
                  اتخاذ اللازم.
                </p>
                <button
                  onClick={() =>
                    setLatenessForm({ ...latenessForm, pledge: "تم التوقيع" })
                  }
                  className={`w-full p-3 md:p-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg text-xs md:text-base ${latenessForm.pledge ? "bg-green-600 border-none" : "bg-white text-slate-800 hover:scale-[1.02] active:scale-95"}`}
                >
                  {latenessForm.pledge ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Zap size={18} className="text-orange-500" />
                  )}
                  {latenessForm.pledge || "توقيع البصمة"}
                </button>
              </div>
              <button
                onClick={saveLog}
                className="flex-1 bg-[#1e293b] text-white p-5 md:p-6 rounded-[2rem] font-black text-lg md:text-xl hover:bg-black shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all mt-4"
              >
                حفظ البيانات
              </button>
              <button
                onClick={() => setShowPreviousLateness(true)}
                className="bg-orange-600 text-white px-8 md:px-10 rounded-[2rem] font-black text-lg hover:bg-orange-700 shadow-2xl transition-all mt-4"
              >
                فتح تأخر سابق
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection
              suggestions={nameSugg}
              values={filterValues}
              setValues={setFilterValues}
              tempNames={tempNames}
              setTempNames={setTempNames}
              appliedNames={appliedNames}
              setAppliedNames={setAppliedNames}
              nameInput={nameInput}
              setNameInput={setNameInput}
              onExportExcel={() =>
                exportExcelFiltered(
                  "تأخر_الطلاب",
                  filtered,
                  cols,
                  data.profile,
                  currentUser,
                )
              }
              onExportTxt={() =>
                exportTxtFiltered("تأخر_الطلاب", filtered, cols, data.profile)
              }
              onExportWA={() =>
                shareWhatsAppRich("سجل تأخر الطلاب المفلتر", filtered, cols)
              }
            />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black">
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="p-3 md:p-5 border-e border-slate-200"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-20 text-slate-300 italic text-base md:text-lg font-bold"
                      >
                        لا توجد سجلات تأخر.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-orange-50/20 transition-colors h-10 md:h-12"
                      >
                        <td className="p-2 md:p-4 border-e border-slate-100 font-black">
                          {l.studentName}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100 text-[10px] text-slate-400">
                          {l.date}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100">
                          {l.reason}
                        </td>
                        <td className="p-2 md:p-4 border-e border-slate-100 text-red-600">
                          {l.action}
                        </td>
                        <td className="p-2 md:p-4 text-[10px] text-green-600 border-slate-100">
                          {l.pledge || "---"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderViolationModule = () => {
    const suggestions =
      searchQuery.trim() && searchQuery !== violationForm.studentName
        ? students.filter((s) => s.name && s.name.includes(searchQuery))
        : [];
    const nameSugg = nameInput.trim()
      ? students.filter(
          (s) => s.name && s.name.includes(nameInput) && !tempNames.includes(s.name),
        )
      : [];
    const filtered = (data.studentViolationLogs || []).filter((l) => {
      if (!matchesFilter(l.userId)) return false;
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName))
        return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester)
        return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section)
        return false;
      return true;
    });

    const categories = [
      {
        id: "behavior",
        label: "قسم السلوك",
        color: "border-red-500",
        iconColor: "text-red-500",
        items: [
          "التأخر عن الطابور الصباحي أو الحضور بعد بدء الحصة الأولى.",
          "الهروب من الحصص والتواجد في الممرات أو الساحة أثناء وقت الدرس.",
          "الهروب من المدرسة بالكامل خلال اليوم الدراسي.",
          "التغيب بدون عذر مقصود أو تزوير أعذار الغياب.",
          "إثارة الفوضى داخل الفصل مثل الحديث الجانبي المستمر والضحك بصوت عالٍ.",
          "عدم الالتزام بالزي المدرسي الرسمي أو المظهر العام اللائق.",
          "إحضار الهاتف المحمول أو الأجهزة الإلكترونية واستخدامها دون إذن.",
          "تناول الطعام أو مضغ اللبان أثناء شرح المعلم.",
          "التلفظ بألفاظ غير لائقة أو نابية تجاه الزملاء.",
          "الشجار والاشتباك بالأيدي والعنف الجسدي مع الطلاب.",
          "السخرية أو التنمر اللفظي والإلكتروني على أحد الزملاء.",
          "عدم احترام الهيئة التعليمية أو الإدارية بالقول أو الإشارة.",
          "الكتابة على الجدران أو الطاولات المدرسية وتشويهها.",
          "إتلاف الممتلكات العامة مثل كسر النوافذ وتخريب المقاعد وأدوات المعمل.",
          "إحضار مواد ممنوعة أو خطيرة كالأدوات الحادة والألعاب النارية.",
          "العبث بوسائل الأمن والسلامة كطفايات الحريق وأجهزة الإنذار.",
          "رمي المخلفات في غير أماكنها وعدم المحافظة على نظافة الفصل والساحة.",
          "التحريض على الفوضى أو تشجيع الطلاب على التمرد ضد القرارات المدرسية.",
          "تصوير الطلاب أو المعلمين دون إذن مسبق ونشر اللقطات.",
          "عدم استجابة التوجيهات والإصرار على تكرار المخالفات البسيطة.",
        ],
      },
      {
        id: "duties",
        label: "الواجبات والدفاتر",
        color: "border-blue-500",
        iconColor: "text-blue-500",
        items: [
          "عدم حل الواجب المنزلي بصفة مستمرة.",
          "حل الواجب بشكل ناقص أو غير مكتمل بتجاوز بعض الأسئلة.",
          "نقل الواجب والنسخ الأعمى من دفتر زميل آخر قبل بدء الحصة.",
          "عدم إحضار الدفتر أو الكشكول الخاص بالمادة الدراسية.",
          "إهمال ترتيب وتنظيم الدفتر والكتابة بخط غير مقروء مع تمزيق الصفحات.",
          "عدم تدوين التلخيصات والملحوظات التي يطلبها المعلم على السبورة.",
          "الكتابة العشوائية والرسم والشخبطة في الدفاتر خارج سياق المادة.",
          "استخدام دفتر واحد لجميع المواد الدراسية دون فصل أو تنظيم.",
          "فقدان الدفتر بشكل متكرر واختلاق حجج واهية لتبرير ذلك.",
          "عدم تقديم الدفتر للتصحيح في المواعيد المحددة من قبل المعلم.",
          "تأخر حل التكاليف الإلكترونية عبر المنصات التعليمية المعتمدة.",
          "ادعاء حل الواجب في المنزل ونسيان الدفتر بشكل متكرر.",
          "عدم تصحيح الأخطاء في الدفتر بعد قيام المعلم بمراجعتها وتوجيهه.",
          "تمزيق أوراق من الدفتر لاستخدامها كمسودات أو للعب بها.",
          "جعل شخص آخر كأحد الوالدين أو الإخوة يحل الواجب بدلاً منه.",
          "مخالفة تعليمات المعلم في التنظيم مثل الكتابة بقلم رصاص بدل الحبر.",
          "عدم كتابة التاريخ والعنوان ورقم الصفحة في رأس كل درس جديد.",
          "تلف غلاف الدفتر وإهمال مظهر الكشكول الخارجي.",
          "استخدام الدفتر المدرسي كدفتر للرسم أو لتمرير الرسائل الجانبية.",
          "رفض إعادة كتابة الواجب في حال طلب المعلم ذلك لتحسين الخط أو تصويب الأخطاء.",
        ],
      },
      {
        id: "achievement",
        label: "التحصيل العلمي",
        color: "border-green-500",
        iconColor: "text-green-500",
        items: [
          "المقاطعة غير المبررة للمعلم بطرح أسئلة خارج المنهج لإضاعة وقت الحصة.",
          "اللامبالاة أثناء الشرح كالنوم في الفصل أو السرحان المستمر.",
          "عدم إحضار الكتب الدراسية المقررة للحصة.",
          "عدم المشاركة في الأنشطة الصفية أو التفاعل مع أسئلة المعلم.",
          "رفض القراءة أو الإجابة عند طلب المعلم منه ذلك عمداً.",
          "إتلاف الكتب الدراسية بالتمزيق أو الكتابة العشوائية عليها.",
          "نسيان أدوات الهندسة والحاسبة والمواد الأساسية للاختبارات العملية.",
          "التأخر في تسليم المشاريع والبحوث العلمية عن موعدها المحدد.",
          "تخريب تجارب المعمل أو إفساد المواد الكيميائية والأدوات عمداً.",
          "ضعف التركيز المتعمد لإفشال المجموعات الدراسية في العمل الجماعي.",
        ],
      },
      {
        id: "exams",
        label: "مخالفات أثناء الاختبارات",
        color: "border-purple-500",
        iconColor: "text-purple-500",
        items: [
          "الغش في الاختبارات الدورية أو النهائية.",
          "محاولة الغش عبر تجهيز قصاصات ورقية أو النظر في ورقة الزميل.",
          "مساعدة الغير على الغش وتداول الإجابات داخل قاعة الاختبار.",
          "سرقة المجهود العلمي مثل تزوير البحوث أو نسب مشاريع جاهزة لنفسه.",
          "انتحال الشخصية في الاختبارات أو التكاليف المدرسية.",
          "تزوير درجات الاختبارات أو تزوير توقيع ولي الأمر على الشهادات.",
          "إخفاء درجات الاختبارات عن ولي الأمر ورفض تسليم الإشعارات.",
          "الدخول للاختبار دون الاستعداد له والاعتماد الكلي على التخمين.",
          "رفض دخول الاختبارات التحصيلية أو التجريبية دون عذر طبي.",
          "تكرار الرسوب في المادة نتيجة الإهمال المتراكم وعدم المذاكرة.",
        ],
      },
    ];

    const toggleViolation = (cat: string, item: string) => {
      const field =
        cat === "behavior"
          ? "behaviorViolations"
          : cat === "duties"
            ? "dutiesViolations"
            : cat === "achievement"
              ? "achievementViolations"
              : "examsViolations";
      const current = (violationForm as any)[field] || [];
      const updated = current.includes(item)
        ? current.filter((i: string) => i !== item)
        : [...current, item];
      setViolationForm({ ...violationForm, [field]: updated });
    };

    const handleSelectStudent = (s: StudentReport) => {
      setViolationForm({
        ...violationForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (isReadOnly) return;
      if (!violationForm.studentId) {
        toast.error("يرجى اختيار طالب أولاً");
        return;
      }
      const total =
        (violationForm.behaviorViolations?.length || 0) +
        (violationForm.dutiesViolations?.length || 0) +
        (violationForm.achievementViolations?.length || 0) +
        (violationForm.examsViolations?.length || 0);
      const newLog: StudentViolationLog = {
        ...(violationForm as StudentViolationLog),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        totalViolations: total,
      };
      updateData({
        studentViolationLogs: [newLog, ...(data.studentViolationLogs || [])],
      });
      setViolationForm({
        ...violationForm,
        studentName: "",
        studentId: "",
        behaviorViolations: [],
        dutiesViolations: [],
        achievementViolations: [],
        examsViolations: [],
        location: "",
        directSupervisor: "",
        directSupervisorJob: "",
        participants: [],
        notes: "",
        pledge: "",
      });
      setSearchQuery("");
      setSupervisorSearch("");
      setParticipantSearch("");
      toast.success("تم تسجيل المخالفة بنجاح");
    };

    const cols = [
      { label: "اسم الطالب", key: "studentName" },
      { label: "الصف / الشعبة", key: "grade" },
      { label: "إجمالي المخالفات", key: "totalViolations" },
      { label: "مكان الرصد", key: "location" },
      { label: "المسؤول المباشر", key: "directSupervisor" },
      { label: "الأطراف المشاركة", key: "participants" },
      { label: "تاريخ الرصد", key: "date" },
      { label: "الحالة", key: "status" },
      { label: "الإجراء", key: "action" },
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.studentViolationLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button
              onClick={() => setShowTable(!showTable)}
              className="bg-blue-50 text-blue-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-blue-100 transition-all flex items-center gap-2"
            >
              {showTable ? <Plus size={18} /> : <ShieldAlert size={18} />}
              {showTable ? "رصد جديد" : "جدول المخالفات"}
            </button>
            {!showTable && (
              <button
                onClick={() => setShowFrequentNames(true)}
                className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-red-600 flex items-center gap-3">
              سجل المخالفات الطلابية <AlertCircle size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                className="text-[10px] md:text-xs font-black bg-transparent outline-none"
                value={violationForm.date}
                onChange={(e) =>
                  setViolationForm({ ...violationForm, date: e.target.value })
                }
              />
              <span className="text-[10px] font-bold text-slate-400">
                {getDayName(violationForm.date || today)}
              </span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 bg-slate-50/50 p-4 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="relative md:col-span-1">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 mb-1 block mr-2">
                  اسم الطالب
                </label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                  <input
                    type="text"
                    className="bg-transparent w-full outline-none font-black text-sm md:text-base"
                    placeholder="ابحث عن الاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-40 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-right p-3 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center text-[10px] md:text-[11px] transition-colors"
                      >
                        <span>{s.name}</span>
                        <span className="text-[8px] md:text-[9px] bg-slate-100 px-2 py-1 rounded-lg">
                          {s.grade}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:col-span-1">
                <div className="space-y-1">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    الفصل
                  </label>
                  <select
                    className="w-full p-3 md:p-4 bg-white border-2 rounded-2xl font-black text-[10px] md:text-xs outline-none focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
                    value={violationForm.semester}
                    onChange={(e) =>
                      setViolationForm({
                        ...violationForm,
                        semester: e.target.value as any,
                      })
                    }
                  >
                    <option value="الأول">الأول</option>
                    <option value="الثاني">الثاني</option>
                  </select>
                </div>
                <div className="flex items-end justify-center bg-white border-2 rounded-2xl p-2 h-[52px] md:h-[60px] shadow-sm">
                  <div className="text-center w-full">
                    <label className="text-[8px] block text-red-400">
                      إجمالي السوابق
                    </label>
                    <span className="font-black text-red-600 text-xs md:text-sm">
                      {
                        (data.studentViolationLogs || []).filter(
                          (l) => l.studentId === violationForm.studentId,
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:col-span-1">
                <div className="bg-white p-2 rounded-2xl border text-center shadow-sm flex flex-col justify-center">
                  <label className="text-[8px] block text-slate-400">
                    الصف
                  </label>
                  <span className="font-black text-[10px] md:text-xs">
                    {violationForm.grade || "---"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-2xl border text-center shadow-sm flex flex-col justify-center">
                  <label className="text-[8px] block text-slate-400">
                    الشعبة
                  </label>
                  <span className="font-black text-[10px] md:text-xs">
                    {violationForm.section || "---"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
              {[
                { id: "blacklist", label: "القائمة السوداء" },
                { id: "high", label: "كثير المخالفة" },
                { id: "medium", label: "متوسط" },
                { id: "rare", label: "نادر" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    setViolationForm({
                      ...violationForm,
                      status: opt.id as any,
                    })
                  }
                  className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-xs border-2 transition-all ${violationForm.status === opt.id ? "bg-red-600 border-red-600 text-white shadow-xl scale-105" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white p-4 md:p-6 rounded-[2rem] border-2 shadow-sm space-y-3 md:space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div
                    className="flex items-center justify-between border-r-4 pr-3 py-1 mb-2"
                    style={{ borderColor: cat.color.split("-")[1] }}
                  >
                    <h3 className="font-black text-xs md:text-sm text-slate-800">
                      {cat.label}
                    </h3>
                    <button
                      onClick={() =>
                        setCustomViolation({ cat: cat.id, item: "" })
                      }
                      className={`p-1 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all ${cat.iconColor}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 md:space-y-2">
                    {[
                      ...cat.items,
                      ...(data.customViolationElements?.[
                        cat.id as keyof typeof data.customViolationElements
                      ] || []),
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={() => toggleViolation(cat.id, item)}
                        className={`text-right p-2 md:p-3 rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${((violationForm as any)[cat.id === "behavior" ? "behaviorViolations" : cat.id === "duties" ? "dutiesViolations" : cat.id === "exams" ? "examsViolations" : "achievementViolations"] || []).includes(item) ? "bg-slate-800 text-white border-slate-800 shadow-md" : "bg-slate-50 text-slate-500 border-slate-50 hover:bg-slate-100"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 border-t pt-8 md:pt-10">
              <div className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    مكان رصد المخالفة
                  </label>
                  <select
                    className="w-full p-4 md:p-5 bg-white border-2 rounded-2xl md:rounded-3xl font-black text-base md:text-lg outline-none focus:border-red-500 shadow-sm appearance-none cursor-pointer"
                    value={violationForm.location || ""}
                    onChange={(e) =>
                      setViolationForm({
                        ...violationForm,
                        location: e.target.value,
                      })
                    }
                  >
                    <option value="">اختر المكان...</option>
                    {["داخل الصف", "خارج الصف", "خارج المدرسة"].map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                      المسؤول المباشر
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-white border-2 rounded-2xl font-black text-sm outline-none focus:border-red-500 shadow-sm"
                      placeholder="ابحث عن الموظف..."
                      value={supervisorSearch}
                      onChange={(e) => {
                        setSupervisorSearch(e.target.value);
                        setShowSupervisorSuggestions(true);
                        if (violationForm.directSupervisor && e.target.value !== violationForm.directSupervisor) {
                          setViolationForm({
                            ...violationForm,
                            directSupervisor: "",
                            directSupervisorJob: "",
                          });
                        }
                      }}
                      onFocus={() => setShowSupervisorSuggestions(true)}
                    />
                    {showSupervisorSuggestions && supervisorSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-[110] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-40 overflow-y-auto">
                        {supervisorSuggestions.map((s: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSupervisor(s)}
                            className="w-full text-right p-3 hover:bg-red-50 font-black border-b last:border-none flex justify-between items-center text-[10px] md:text-[11px] transition-colors"
                          >
                            <span>{s.name}</span>
                            <span className="text-[8px] md:text-[9px] bg-slate-100 px-2 py-1 rounded-lg">
                              {Array.isArray(s.jobTitles) ? s.jobTitles[0] : (s.jobTitles || "")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                      الوظيفة
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-sm outline-none text-slate-500"
                      placeholder="تعبئة تلقائية..."
                      value={violationForm.directSupervisorJob || ""}
                    />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    الأطراف المشاركة في المشكلة
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white border-2 rounded-2xl font-black text-sm outline-none focus:border-red-500 shadow-sm"
                    placeholder="ابحث عن طالب مشارك..."
                    value={participantSearch}
                    onChange={(e) => {
                      setParticipantSearch(e.target.value);
                      setShowParticipantSuggestions(true);
                    }}
                    onFocus={() => setShowParticipantSuggestions(true)}
                  />
                  {showParticipantSuggestions && participantSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[110] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-40 overflow-y-auto">
                      {participantSuggestions.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleAddParticipant(s)}
                          className="w-full text-right p-3 hover:bg-red-50 font-black border-b last:border-none flex justify-between items-center text-[10px] md:text-[11px] transition-colors"
                        >
                          <span>{s.name}</span>
                          <span className="text-[8px] md:text-[9px] bg-slate-100 px-2 py-1 rounded-lg">
                            {s.grade}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {violationForm.participants && violationForm.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {violationForm.participants.map((name) => (
                        <span
                          key={name}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm border border-red-200"
                        >
                          {name}
                          <X
                            size={14}
                            className="cursor-pointer hover:text-red-900 transition-colors"
                            onClick={() => handleRemoveParticipant(name)}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    الإجراء المتخذ
                  </label>
                  <select
                    className="w-full p-4 md:p-5 bg-white border-2 rounded-2xl md:rounded-3xl font-black text-base md:text-lg outline-none focus:border-red-500 shadow-sm appearance-none cursor-pointer"
                    value={violationForm.action}
                    onChange={(e) =>
                      setViolationForm({
                        ...violationForm,
                        action: e.target.value,
                      })
                    }
                  >
                    {[
                      "تنبيه 1",
                      "تنبيه 2",
                      "تعهد خطي",
                      "استدعاء ولي الأمر",
                      "فصل مؤقت",
                    ].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 mr-2">
                    ملاحظات إضافية...
                  </label>
                  <textarea
                    className="w-full p-4 border-2 rounded-2xl outline-none font-black text-[10px] md:text-xs bg-slate-50 min-h-[80px] md:min-h-[100px] focus:border-red-400 shadow-inner"
                    placeholder="..."
                    value={violationForm.notes}
                    onChange={(e) =>
                      setViolationForm({
                        ...violationForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="p-6 md:p-10 bg-red-600 text-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl space-y-4 md:space-y-6 relative group overflow-hidden border-4 border-red-700">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full group-hover:scale-150 transition-all duration-1000"></div>
                <h4 className="flex items-center gap-3 font-black text-xl md:text-2xl">
                  <Fingerprint size={32} /> بصمة الطالب (تعهد)
                </h4>
                <p className="text-[10px] md:text-xs font-bold leading-relaxed opacity-90">
                  أتعهد بعدم تكرار المخالفة وفي حالة التكرار فللإدارة الحق في
                  اتخاذ اللازم.
                </p>
                <button
                  onClick={() =>
                    setViolationForm({
                      ...violationForm,
                      pledge: "تم التبصيم بنجاح",
                    })
                  }
                  className={`w-full p-4 md:p-5 rounded-2xl font-black text-base md:text-xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${violationForm.pledge ? "bg-green-500 border-none" : "bg-white/10 border-2 border-white/20 backdrop-blur-md hover:bg-white/20"}`}
                >
                  {violationForm.pledge ? (
                    <CheckCircle size={24} />
                  ) : (
                    <Zap size={22} />
                  )}
                  {violationForm.pledge || "اعتماد التبصيم"}
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={saveLog}
                className="flex-1 bg-red-600 text-white p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-red-700 shadow-2xl active:scale-[0.98] transition-all"
              >
                حفظ السجل
              </button>
              <button
                onClick={() => setShowPreviousViolation(true)}
                className="bg-slate-800 text-white px-8 md:px-10 rounded-[2rem] font-black text-lg hover:bg-black shadow-2xl transition-all mt-4"
              >
                فتح مخالفة سابقة
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <FilterSection
              suggestions={nameSugg}
              values={filterValues}
              setValues={setFilterValues}
              tempNames={tempNames}
              setTempNames={setTempNames}
              appliedNames={appliedNames}
              setAppliedNames={setAppliedNames}
              nameInput={nameInput}
              setNameInput={setNameInput}
              onExportExcel={() =>
                exportExcelFiltered(
                  "مخالفات_الطلاب",
                  filtered,
                  cols,
                  data.profile,
                  currentUser,
                )
              }
              onExportTxt={() =>
                exportTxtFiltered(
                  "مخالفات_الطلاب",
                  filtered,
                  cols,
                  data.profile,
                )
              }
              onExportWA={() =>
                shareWhatsAppRich("سجل مخالفات الطلاب المفلتر", filtered, cols)
              }
            />
            <div className="overflow-x-auto rounded-[1.5rem] md:rounded-[3rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black sticky top-0">
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="p-4 md:p-6 border-e border-slate-200"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-20 text-slate-300 italic text-base md:text-lg font-bold"
                      >
                        لا توجد مخالفات مسجلة.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-red-50/20 transition-colors h-12 md:h-14"
                      >
                        <td className="p-3 md:p-5 border-e border-slate-100 font-black">
                          {l.studentName}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100 font-bold">
                          {l.grade} / {l.section}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100 text-red-600 font-black text-lg">
                          {l.totalViolations}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100 font-bold">
                          {l.location || "---"}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100 font-bold">
                          {l.directSupervisor ? `${l.directSupervisor}${l.directSupervisorJob ? ` (${l.directSupervisorJob})` : ""}` : "---"}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100 font-bold whitespace-normal max-w-[200px]">
                          {Array.isArray(l.participants) && l.participants.length > 0 ? l.participants.join("، ") : "---"}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100 text-[10px] text-slate-400">
                          {l.date}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-100">
                          <span className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] md:text-[10px] font-black uppercase">
                            {l.status}
                          </span>
                        </td>
                        <td className="p-3 md:p-5 text-red-700 font-black border-slate-100">
                          {l.action}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExitModule = () => {
    const suggestions =
      searchQuery.trim() && searchQuery !== exitForm.studentName
        ? students.filter((s) => s.name && s.name.includes(searchQuery))
        : [];
    const nameSugg = nameInput.trim()
      ? students.filter(
          (s) => s.name && s.name.includes(nameInput) && !tempNames.includes(s.name),
        )
      : [];
    const filtered = (data.exitLogs || []).filter((l) => {
      if (!matchesFilter(l.userId)) return false;
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName))
        return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester)
        return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section)
        return false;
      return true;
    });

    const handleSelectStudent = (s: StudentReport) => {
      setExitForm({
        ...exitForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevExitCount: (data.exitLogs || []).filter((l) => l.studentId === s.id)
          .length,
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (isReadOnly) return;
      if (!exitForm.studentId) {
        toast.error("يرجى اختيار طالب أولاً");
        return;
      }
      const newLog: ExitLog = {
        ...(exitForm as ExitLog),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        day: getDayName(exitForm.date || today),
      };
      updateData({ exitLogs: [newLog, ...(data.exitLogs || [])] });
      setExitForm({
        ...exitForm,
        studentName: "",
        studentId: "",
        notes: "",
        status: "نادر الخروج",
        action: "تنبيه 1",
      });
      setSearchQuery("");
      toast.success("تم حفظ بيانات الخروج");
    };

    const cols = [
      { label: "اسم الطالب", key: "studentName" },
      { label: "الصف", key: "grade" },
      { label: "الشعبة", key: "section" },
      { label: "عدد مرات الخروج", key: "prevExitCount" },
      { label: "التاريخ", key: "date" },
      { label: "حالة الخروج", key: "status" },
      { label: "نوع الإجراء", key: "action" },
      { label: "ملاحظات أخرى", key: "notes" },
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.exitLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button
              onClick={() => setShowTable(!showTable)}
              className="bg-blue-50 text-blue-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-blue-100 transition-all flex items-center gap-2 shadow-sm"
            >
              {showTable ? <Plus size={18} /> : <LayoutList size={18} />}
              {showTable ? "رصد خروج جديد" : "جدول الخروج"}
            </button>
            {!showTable && (
              <button
                onClick={() => setShowFrequentNames(true)}
                className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-blue-600 flex items-center gap-3">
              خروج طالب أثناء الدراسة <UserPlus size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                className="text-[10px] md:text-xs font-black bg-transparent outline-none"
                value={exitForm.date}
                onChange={(e) =>
                  setExitForm({ ...exitForm, date: e.target.value })
                }
              />
              <span className="text-[10px] font-bold text-slate-400">
                {getDayName(exitForm.date || today)}
              </span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6">
            <div className="relative">
              <label className="text-xs font-black text-slate-400 mb-2 block mr-2">
                ابحث عن الطالب
              </label>
              <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-blue-500 shadow-sm transition-all">
                <Search size={20} className="text-slate-400" />
                <input
                  type="text"
                  className="bg-transparent w-full outline-none font-black text-base md:text-lg"
                  placeholder="اكتب الاسم هنا..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-64 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className="w-full text-right p-3 md:p-4 hover:bg-blue-50 font-black border-b last:border-none flex justify-between items-center transition-colors"
                    >
                      <span className="text-xs md:text-sm">{s.name}</span>{" "}
                      <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">
                        {s.grade} - {s.section}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                  الصف
                </label>
                <span className="font-black text-base md:text-lg text-slate-700">
                  {exitForm.grade || "---"}
                </span>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                  الشعبة
                </label>
                <span className="font-black text-base md:text-lg text-slate-700">
                  {exitForm.section || "---"}
                </span>
              </div>
              <div className="bg-blue-600 text-white p-3 md:p-4 rounded-2xl shadow-lg text-center">
                <label className="text-[9px] md:text-[10px] block opacity-80 mb-1">
                  مرات الخروج
                </label>
                <span className="font-black text-xl md:text-2xl">
                  {exitForm.prevExitCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-2 rounded-2xl border-2 shadow-sm flex flex-col justify-center text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                  الفصل
                </label>
                <select
                  className="bg-transparent font-black text-[10px] md:text-xs outline-none"
                  value={exitForm.semester}
                  onChange={(e) =>
                    setExitForm({
                      ...exitForm,
                      semester: e.target.value as any,
                    })
                  }
                >
                  <option value="الأول">الأول</option>
                  <option value="الثاني">الثاني</option>
                  <option value="الفصلين">الفصلين</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">
                  حالة الخروج
                </label>
                <input
                  className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-blue-400"
                  value={exitForm.status}
                  onChange={(e) =>
                    setExitForm({ ...exitForm, status: e.target.value })
                  }
                  placeholder="مثال: نادر الخروج"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">
                  الإجراء المتخذ
                </label>
                <input
                  className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-blue-400"
                  value={exitForm.action}
                  onChange={(e) =>
                    setExitForm({ ...exitForm, action: e.target.value })
                  }
                  placeholder="تنبيه 1"
                />
              </div>
            </div>
            <button
              onClick={saveLog}
              className="w-full bg-[#0f172a] text-white p-5 md:p-6 rounded-3xl font-black text-lg md:text-xl hover:bg-black shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all mt-4"
            >
              <Save size={24} /> حفظ بيانات الخروج
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <FilterSection
              suggestions={nameSugg}
              values={filterValues}
              setValues={setFilterValues}
              tempNames={tempNames}
              setTempNames={setTempNames}
              appliedNames={appliedNames}
              setAppliedNames={setAppliedNames}
              nameInput={nameInput}
              setNameInput={setNameInput}
              onExportExcel={() =>
                exportExcelFiltered(
                  "خروج_الطلاب",
                  filtered,
                  cols,
                  data.profile,
                  currentUser,
                )
              }
              onExportTxt={() =>
                exportTxtFiltered("خروج_الطلاب", filtered, cols, data.profile)
              }
              onExportWA={() =>
                shareWhatsAppRich("سجل خروج الطلاب المفلتر", filtered, cols)
              }
            />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black">
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="p-3 md:p-5 border-e border-blue-200"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={cols.length}
                        className="p-20 text-slate-300 italic text-base md:text-lg font-bold"
                      >
                        لا توجد بيانات خروج.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-blue-50/30 transition-colors h-10 md:h-12"
                      >
                        <td className="p-3 md:p-5 border-e border-slate-50 font-black">
                          {l.studentName}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 font-bold">
                          {l.grade}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50">
                          {l.section}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-blue-600 text-lg">
                          {l.prevExitCount + 1}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-slate-400 text-[10px]">
                          {l.date}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50">
                          {l.status}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50">
                          {l.action}
                        </td>
                        <td className="p-3 md:p-5 text-slate-400 text-[10px]">
                          {l.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDamageModule = () => {
    const suggestions =
      searchQuery.trim() && searchQuery !== damageForm.studentName
        ? students.filter((s) => s.name && s.name.includes(searchQuery))
        : [];
    const nameSugg = nameInput.trim()
      ? students.filter(
          (s) => s.name && s.name.includes(nameInput) && !tempNames.includes(s.name),
        )
      : [];
    const filtered = (data.damageLogs || []).filter((l) => {
      if (!matchesFilter(l.userId)) return false;
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName))
        return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester)
        return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section)
        return false;
      return true;
    });

    const handleSelectStudent = (s: StudentReport) => {
      setDamageForm({
        ...damageForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevDamageCount: (data.damageLogs || []).filter(
          (l) => l.studentId === s.id,
        ).length,
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (isReadOnly) return;
      if (!damageForm.studentId) {
        toast.error("يرجى اختيار طالب أولاً");
        return;
      }
      const newLog: DamageLog = {
        ...(damageForm as DamageLog),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        day: getDayName(damageForm.date || today),
      };
      updateData({ damageLogs: [newLog, ...(data.damageLogs || [])] });
      setDamageForm({
        ...damageForm,
        studentName: "",
        studentId: "",
        notes: "",
        description: "",
        participants: "",
        followUpStatus: "قيد المتابعة",
        action: "تنبيه",
      });
      setSearchQuery("");
      toast.success("تم حفظ بيانات الإتلاف");
    };

    const cols = [
      { label: "اسم الطالب", key: "studentName" },
      { label: "الصف", key: "grade" },
      { label: "الشعبة", key: "section" },
      { label: "عدد الإتلافات", key: "prevDamageCount" },
      { label: "التاريخ", key: "date" },
      { label: "بيان الإتلاف", key: "description" },
      { label: "المشاركين", key: "participants" },
      { label: "الإجراء", key: "action" },
      { label: "حالة المتابعة", key: "followUpStatus" },
      { label: "ملاحظات أخرى", key: "notes" },
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.damageLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button
              onClick={() => setShowTable(!showTable)}
              className="bg-red-50 text-red-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm"
            >
              {showTable ? <Plus size={18} /> : <LayoutList size={18} />}
              {showTable ? "رصد إتلاف جديد" : "جدول الإتلاف"}
            </button>
            {!showTable && (
              <button
                onClick={() => setShowFrequentNames(true)}
                className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-red-600 flex items-center gap-3">
              سجل الإتلاف المدرسي <Hammer size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                className="text-[10px] md:text-xs font-black bg-transparent outline-none"
                value={damageForm.date}
                onChange={(e) =>
                  setDamageForm({ ...damageForm, date: e.target.value })
                }
              />
              <span className="text-[10px] font-bold text-slate-400">
                {getDayName(damageForm.date || today)}
              </span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6">
            <div className="relative">
              <label className="text-xs font-black text-slate-400 mb-2 block mr-2">
                ابحث عن الطالب
              </label>
              <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-red-500 shadow-sm transition-all">
                <Search size={20} className="text-slate-400" />
                <input
                  type="text"
                  className="bg-transparent w-full outline-none font-black text-base md:text-lg"
                  placeholder="اكتب الاسم هنا..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-64 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className="w-full text-right p-3 md:p-4 hover:bg-red-50 font-black border-b last:border-none flex justify-between items-center transition-colors"
                    >
                      <span className="text-xs md:text-sm">{s.name}</span>{" "}
                      <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">
                        {s.grade} - {s.section}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                  الصف
                </label>
                <span className="font-black text-base md:text-lg text-slate-700">
                  {damageForm.grade || "---"}
                </span>
              </div>
              <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                  الشعبة
                </label>
                <span className="font-black text-base md:text-lg text-slate-700">
                  {damageForm.section || "---"}
                </span>
              </div>
              <div className="bg-red-600 text-white p-3 md:p-4 rounded-2xl shadow-lg text-center">
                <label className="text-[9px] md:text-[10px] block opacity-80 mb-1">
                  مرات الإتلاف
                </label>
                <span className="font-black text-xl md:text-2xl">
                  {damageForm.prevDamageCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-2 rounded-2xl border-2 shadow-sm flex flex-col justify-center text-center">
                <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                  الفصل
                </label>
                <select
                  className="bg-transparent font-black text-[10px] md:text-xs outline-none"
                  value={damageForm.semester}
                  onChange={(e) =>
                    setDamageForm({
                      ...damageForm,
                      semester: e.target.value as any,
                    })
                  }
                >
                  <option value="الأول">الأول</option>
                  <option value="الثاني">الثاني</option>
                  <option value="الفصلين">الفصلين</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">
                  بيان الإتلاف
                </label>
                <input
                  className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400"
                  value={damageForm.description}
                  onChange={(e) =>
                    setDamageForm({
                      ...damageForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="ماذا تم إتلافه؟"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">
                  المشاركين معه في الإتلاف
                </label>
                <input
                  className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400"
                  value={damageForm.participants}
                  onChange={(e) =>
                    setDamageForm({
                      ...damageForm,
                      participants: e.target.value,
                    })
                  }
                  placeholder="أسماء المشاركين إن وجدوا..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">
                  الإجراء المتخذ
                </label>
                <input
                  className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400"
                  value={damageForm.action}
                  onChange={(e) =>
                    setDamageForm({ ...damageForm, action: e.target.value })
                  }
                  placeholder="تنبيه"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 mr-2">
                  حالة المتابعة
                </label>
                <select
                  className="w-full p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-red-400"
                  value={damageForm.followUpStatus}
                  onChange={(e) =>
                    setDamageForm({
                      ...damageForm,
                      followUpStatus: e.target.value,
                    })
                  }
                >
                  <option value="قيد المتابعة">قيد المتابعة</option>
                  <option value="تم الإصلاح">تم الإصلاح</option>
                  <option value="تم شراء البديل">تم شراء البديل</option>
                  <option value="لم يتم الإصلاح">لم يتم الإصلاح</option>
                  <option value="لم يتم شراء البديل">لم يتم شراء البديل</option>
                </select>
              </div>
            </div>
            <button
              onClick={saveLog}
              className="w-full bg-[#0f172a] text-white p-5 md:p-6 rounded-3xl font-black text-lg md:text-xl hover:bg-black shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all mt-4"
            >
              <Save size={24} /> حفظ بيانات الإتلاف
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <FilterSection
              suggestions={nameSugg}
              values={filterValues}
              setValues={setFilterValues}
              tempNames={tempNames}
              setTempNames={setTempNames}
              appliedNames={appliedNames}
              setAppliedNames={setAppliedNames}
              nameInput={nameInput}
              setNameInput={setNameInput}
              onExportExcel={() =>
                exportExcelFiltered(
                  "إتلاف_المدرسة",
                  filtered,
                  cols,
                  data.profile,
                  currentUser,
                )
              }
              onExportTxt={() =>
                exportTxtFiltered("إتلاف_المدرسة", filtered, cols, data.profile)
              }
              onExportWA={() =>
                shareWhatsAppRich("سجل إتلاف المدرسة المفلتر", filtered, cols)
              }
            />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1000px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black">
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="p-3 md:p-5 border-e border-red-200"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={cols.length}
                        className="p-20 text-slate-300 italic text-base md:text-lg font-bold"
                      >
                        لا توجد بيانات إتلاف.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-red-50/30 transition-colors h-10 md:h-12"
                      >
                        <td className="p-3 md:p-5 border-e border-slate-50 font-black">
                          {l.studentName}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 font-bold">
                          {l.grade}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50">
                          {l.section}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-red-600 text-lg">
                          {l.prevDamageCount + 1}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-400 text-[10px]">
                          {l.date}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-[11px]">
                          {l.description}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-[10px] text-slate-500 italic">
                          {l.participants || "---"}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-red-700">
                          {l.action}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50">
                          <span
                            className={`px-2 py-1 rounded-lg text-[9px] font-black ${
                              l.followUpStatus?.includes("تم")
                                ? "bg-green-100 text-green-700"
                                : l.followUpStatus?.includes("قيد")
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {l.followUpStatus || "قيد المتابعة"}
                          </span>
                        </td>
                        <td className="p-3 md:p-5 text-slate-400 text-[10px]">
                          {l.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderParentVisitModule = () => {
    const suggestions =
      searchQuery.trim() && searchQuery !== visitForm.studentName
        ? students.filter((s) => s.name && s.name.includes(searchQuery))
        : [];
    const nameSugg = nameInput.trim()
      ? students.filter(
          (s) => s.name && s.name.includes(nameInput) && !tempNames.includes(s.name),
        )
      : [];
    const filtered = (data.parentVisitLogs || []).filter((l) => {
      if (!matchesFilter(l.userId)) return false;
      if (appliedNames.length > 0 && !appliedNames.includes(l.studentName))
        return false;
      if (filterValues.start && l.date < filterValues.start) return false;
      if (filterValues.end && l.date > filterValues.end) return false;
      if (filterValues.semester && l.semester !== filterValues.semester)
        return false;
      if (filterValues.grade && l.grade !== filterValues.grade) return false;
      if (filterValues.section && l.section !== filterValues.section)
        return false;
      return true;
    });

    const handleSelectStudent = (s: StudentReport) => {
      setVisitForm({
        ...visitForm,
        studentId: s.id,
        studentName: s.name,
        grade: s.grade,
        section: s.section,
        prevVisitCount: (data.parentVisitLogs || []).filter(
          (l) => l.studentId === s.id,
        ).length,
      });
      setSearchQuery(s.name);
    };

    const saveLog = () => {
      if (!visitForm.studentId) {
        toast.error("يرجى اختيار طالب أولاً");
        return;
      }
      const newLog: ParentVisitLog = {
        ...(visitForm as ParentVisitLog),
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        day: getDayName(visitForm.date || today),
      };
      updateData({
        parentVisitLogs: [newLog, ...(data.parentVisitLogs || [])],
      });
      setVisitForm({
        ...visitForm,
        studentName: "",
        studentId: "",
        visitorName: "",
        reason: "",
        actions: "",
        notes: "",
      });
      setSearchQuery("");
      toast.success("تم حفظ سجل التواصل/الزيارة");
    };

    const cols = [
      { label: "اسم الطالب", key: "studentName" },
      { label: "اسم الزائر", key: "visitorName" },
      { label: "الصف", key: "grade" },
      { label: "الشعبة", key: "section" },
      { label: "التاريخ", key: "date" },
      { label: "نوع التواصل", key: "type" },
      { label: "السبب", key: "reason" },
      { label: "الإجراءات", key: "actions" },
      { label: "ملاحظات", key: "notes" },
    ];

    return (
      <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border shadow-2xl animate-in fade-in zoom-in duration-300 font-arabic text-right relative overflow-hidden">
        {/* Pass state and handlers to Picker component */}
        <FrequentNamesPicker
          logs={data.parentVisitLogs || []}
          onSelectQuery={(q) => setSearchQuery(q)}
          isOpen={showFrequentNames}
          onClose={() => setShowFrequentNames(false)}
        />
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            <button
              onClick={() => setShowTable(!showTable)}
              className="bg-indigo-50 text-indigo-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm"
            >
              {showTable ? <Plus size={18} /> : <LayoutList size={18} />}
              {showTable ? "رصد جديد" : "جدول السجلات"}
            </button>
            {!showTable && (
              <button
                onClick={() => setShowFrequentNames(true)}
                className="bg-orange-50 text-orange-600 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm hover:bg-orange-100 transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} /> الأسماء المتكررة
              </button>
            )}
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-indigo-600 flex items-center gap-3">
              سجل زيارات أولياء الأمور <UserPlus size={24} />
            </h2>
            <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                className="text-[10px] md:text-xs font-black bg-transparent outline-none"
                value={visitForm.date}
                onChange={(e) =>
                  setVisitForm({ ...visitForm, date: e.target.value })
                }
              />
              <span className="text-[10px] font-bold text-slate-400">
                {getDayName(visitForm.date || today)}
              </span>
            </div>
          </div>
        </div>

        {!showTable ? (
          <div className="space-y-6 md:space-y-10">
            <div className="flex gap-4 p-2 bg-slate-100 rounded-3xl w-fit mx-auto shadow-inner border border-white">
              <button
                onClick={() => setVisitForm({ ...visitForm, type: "visit" })}
                className={`flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all ${visitForm.type === "visit" ? "bg-indigo-600 text-white shadow-lg scale-105" : "text-slate-400 hover:bg-white"}`}
              >
                <Users size={16} /> زيارة ولي أمر
              </button>
              <button
                onClick={() =>
                  setVisitForm({ ...visitForm, type: "communication" })
                }
                className={`flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all ${visitForm.type === "communication" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-slate-400 hover:bg-white"}`}
              >
                <Phone size={16} /> التواصل بولي الأمر
              </button>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <label className="text-xs font-black text-slate-400 mb-2 block mr-2">
                  ابحث عن الطالب
                </label>
                <div className="flex items-center gap-3 bg-white border-2 rounded-2xl p-3 md:p-4 focus-within:border-indigo-500 shadow-sm transition-all">
                  <Search size={20} className="text-slate-400" />
                  <input
                    type="text"
                    className="bg-transparent w-full outline-none font-black text-base md:text-lg"
                    placeholder="اكتب اسم الطالب هنا..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[100] bg-white border-2 rounded-2xl shadow-2xl mt-2 max-h-64 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-right p-3 md:p-4 hover:bg-indigo-50 font-black border-b last:border-none flex justify-between items-center transition-colors"
                      >
                        <span className="text-xs md:text-sm">{s.name}</span>{" "}
                        <span className="text-[9px] md:text-[10px] bg-slate-100 px-2 py-1 rounded-lg">
                          {s.grade} - {s.section}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center">
                  <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                    الصف
                  </label>
                  <span className="font-black text-base md:text-lg text-slate-700">
                    {visitForm.grade || "---"}
                  </span>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-2xl border-2 shadow-sm text-center">
                  <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                    الشعبة
                  </label>
                  <span className="font-black text-base md:text-lg text-slate-700">
                    {visitForm.section || "---"}
                  </span>
                </div>
                <div className="bg-blue-600 text-white p-3 md:p-4 rounded-2xl shadow-lg text-center">
                  <label className="text-[9px] md:text-[10px] block opacity-80 mb-1">
                    مرات التواصل
                  </label>
                  <span className="font-black text-xl md:text-2xl">
                    {visitForm.prevVisitCount ?? 0}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-2xl border-2 shadow-sm flex flex-col justify-center text-center">
                  <label className="text-[9px] md:text-[10px] block text-slate-400 mb-1">
                    الفصل
                  </label>
                  <select
                    className="bg-transparent font-black text-[10px] md:text-xs outline-none"
                    value={visitForm.semester}
                    onChange={(e) =>
                      setVisitForm({
                        ...visitForm,
                        semester: e.target.value as any,
                      })
                    }
                  >
                    <option value="الأول">الأول</option>
                    <option value="الثاني">الثاني</option>
                    <option value="الفصلين">الفصلين</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 mr-2">
                    السبب
                  </label>
                  <textarea
                    className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]"
                    value={visitForm.reason}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, reason: e.target.value })
                    }
                    placeholder="..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 mr-2">
                    اسم الزائر/المتواصل
                  </label>
                  <textarea
                    className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]"
                    value={visitForm.visitorName}
                    onChange={(e) =>
                      setVisitForm({
                        ...visitForm,
                        visitorName: e.target.value,
                      })
                    }
                    placeholder="..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 mr-2">
                    ملاحظات
                  </label>
                  <textarea
                    className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]"
                    value={visitForm.notes}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, notes: e.target.value })
                    }
                    placeholder="..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 mr-2">
                    الإجراءات
                  </label>
                  <textarea
                    className="w-full p-3 md:p-4 border-2 rounded-2xl outline-none font-black text-xs md:text-sm bg-slate-50 focus:border-indigo-400 min-h-[60px] md:min-h-[80px]"
                    value={visitForm.actions}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, actions: e.target.value })
                    }
                    placeholder="..."
                  />
                </div>
              </div>

              <button
                onClick={saveLog}
                className="w-full bg-[#0f172a] text-white p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] font-black text-xl md:text-2xl hover:bg-black shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] mt-4"
              >
                <Save size={32} /> حفظ السجل
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <FilterSection
              suggestions={nameSugg}
              values={filterValues}
              setValues={setFilterValues}
              tempNames={tempNames}
              setTempNames={setTempNames}
              appliedNames={appliedNames}
              setAppliedNames={setAppliedNames}
              nameInput={nameInput}
              setNameInput={setNameInput}
              onExportExcel={() =>
                exportExcelFiltered(
                  "زيارات_أولياء_الأمور",
                  filtered,
                  cols,
                  data.profile,
                  currentUser,
                )
              }
              onExportTxt={() =>
                exportTxtFiltered(
                  "زيارات_أولياء_الأمور",
                  filtered,
                  cols,
                  data.profile,
                )
              }
              onExportWA={() =>
                shareWhatsAppRich(
                  "سجل زيارات وتواصل أولياء الأمور المفلتر",
                  filtered,
                  cols,
                )
              }
            />
            <div className="overflow-x-auto rounded-[1.5rem] border shadow-inner">
              <table className="w-full text-center text-[10px] md:text-sm border-collapse min-w-[1200px]">
                <thead className="bg-[#FFD966] text-slate-800 font-black">
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        className="p-3 md:p-5 border-e border-indigo-200"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-bold">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={cols.length}
                        className="p-20 text-slate-300 italic text-base md:text-lg font-bold"
                      >
                        لا توجد سجلات.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-indigo-50/30 transition-colors h-10 md:h-12"
                      >
                        <td className="p-3 md:p-5 border-e border-slate-50 font-black">
                          {l.studentName}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 font-bold">
                          {l.visitorName}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 font-bold">
                          {l.grade}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 font-bold">
                          {l.section}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-400 text-[10px]">
                          {l.date}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 font-black">
                          {l.type === "visit" ? "زيارة" : "تواصل"}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-[10px]">
                          {l.reason}
                        </td>
                        <td className="p-3 md:p-5 border-e border-slate-50 text-[10px]">
                          {l.actions}
                        </td>
                        <td className="p-3 md:p-5 text-slate-400 text-[10px]">
                          {l.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const PreviousRecordModal = ({
    isOpen,
    onClose,
    title,
    type,
    studentId,
    studentName,
    onSelect,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: "absence" | "lateness" | "violation";
    studentId?: string;
    studentName?: string;
    onSelect: (record: any) => void;
  }) => {
    if (!isOpen) return null;

    const filteredRecords =
      (type === "absence"
        ? data.absenceLogs
        : type === "lateness"
          ? data.studentLatenessLogs
          : data.studentViolationLogs) || [];

    const studentRecords = studentId
      ? filteredRecords.filter((r: any) => r.studentId === studentId)
      : filteredRecords;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">
                <History className="text-orange-500" /> {title}
              </h3>
              {studentName && (
                <p className="text-orange-400 font-bold text-sm mt-1">
                  للطالب: {studentName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-right">
            {studentRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                <Search size={64} className="opacity-20" />
                <p className="font-black text-lg text-right">
                  لا توجد سجلات سابقة متاحة.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {[...studentRecords].reverse().map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelect(r);
                      onClose();
                    }}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:border-orange-500 hover:bg-orange-50/30 transition-all text-right group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-base md:text-lg">
                          {r.date}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white border text-[10px] font-black text-slate-400">
                          {r.semester}
                        </span>
                      </div>
                      <p className="text-slate-500 font-bold text-xs md:text-sm line-clamp-1 text-right">
                        {r.reason ||
                          r.action ||
                          [
                            ...(r.behaviorViolations || []),
                            ...(r.dutiesViolations || []),
                            ...(r.achievementViolations || []),
                            ...(r.examsViolations || []),
                          ].join("، ") ||
                          "بدون تفاصيل"}
                      </p>
                    </div>
                    <div className="mt-3 md:mt-0 flex items-center gap-4">
                      <div className="text-left hidden md:block">
                        <p className="text-[10px] font-black text-slate-400">
                          انقر للتعديل أو العرض
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-white border-2 font-black text-slate-600 hover:bg-slate-100 transition-all"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [customViolation, setCustomViolation] = useState<{
    cat: string;
    item: string;
  }>({ cat: "", item: "" });

  const addCustomViolation = (cat: string) => {
    if (isReadOnly) return;
    if (!customViolation.item.trim()) return;
    const current = data.customViolationElements || {};
    const catItems = current[cat as keyof typeof current] || [];
    if (catItems.includes(customViolation.item.trim())) {
      toast.error("هذا العنصر موجود بالفعل");
      return;
    }

    updateData({
      customViolationElements: {
        ...current,
        [cat]: [...catItems, customViolation.item.trim()],
      },
    });

    // Also toggle it in the form automatically
    const field =
      cat === "behavior"
        ? "behaviorViolations"
        : cat === "duties"
          ? "dutiesViolations"
          : cat === "achievement"
            ? "achievementViolations"
            : "examsViolations";
    const currentSelected = (violationForm as any)[field] || [];
    setViolationForm({
      ...violationForm,
      [field]: [...currentSelected, customViolation.item.trim()],
    });

    setCustomViolation({ cat: "", item: "" });
  };

  const renderTasksModule = () => {
    const templates = data.taskTemplates || [];
    const dailyTemplates = templates.filter((t) => t.category === "daily");
    const weeklyTemplates = templates.filter((t) => t.category === "weekly");
    const monthlyTemplates = templates.filter((t) => t.category === "monthly");

    const resetTasksToDefaults = () => {
      if (isReadOnly) return;
      setConfirmDialog({
        isOpen: true,
        title: "استعادة الافتراضي",
        message:
          "هل أنت متأكد من استعادة المهام الافتراضية؟ سيؤدي ذلك إلى حذف أي مهام مخصصة قمت بإضافتها.",
        onConfirm: () => {
          updateData({ taskTemplates: defaultTaskTemplates });
          toast.success("تم استعادة المهام الافتراضية بنجاح");
        },
      });
    };

    const handleAddTaskTemplate = (cat: "daily" | "weekly" | "monthly") => {
      if (isReadOnly) return;
      if (!customTaskInput.trim()) return;
      const newTemplate: TaskItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        category: cat,
        text: customTaskInput.trim(),
      };
      updateData({ taskTemplates: [...templates, newTemplate] });
      setCustomTaskInput("");
      setActiveCategoryForAdd(null);
    };

    const removeTaskTemplate = (id: string) => {
      if (isReadOnly) return;
      updateData({ taskTemplates: templates.filter((t) => t.id !== id) });
    };

    const generateTaskTable = () => {
      const selectedTemplates = templates.filter((t) =>
        selectedTaskCategories.includes(t.category),
      );
      if (selectedTemplates.length === 0) {
        toast.error("يرجى اختيار فئة واحدة على الأقل");
        return;
      }

      const records: TaskRecord[] = selectedTemplates.map((t) => ({
        id: Math.random().toString(36).substr(2, 9),
        taskText: t.text,
        degree: 2,
        maxDegree: 2,
        status: "pending",
        failReason: "",
        notes: "",
      }));

      const d = taskTableDate;
      const gy = new Date(d).getFullYear();
      const hy = Math.floor((gy - 622) * (33 / 32));

      const newReport: TaskReport = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id,
        dateStr: d,
        dateHijri: `${hy} هـ`,
        dayName: getDayName(d),
        selectedCategories: [...selectedTaskCategories],
        tasks: records,
      };

      setActiveTaskReport(newReport);
    };

    const saveTaskReport = () => {
      if (isReadOnly) return;
      if (!activeTaskReport) return;

      const reports = data.taskReports || [];
      const exists = reports.find(
        (r) => r.dateStr === activeTaskReport.dateStr,
      );

      if (exists) {
        setConfirmDialog({
          isOpen: true,
          title: "تكرار التقرير",
          message: "يوجد تقرير بالفعل لهذا التاريخ. هل تريد استبداله؟",
          onConfirm: () => {
            updateData({
              taskReports: reports.map((r) =>
                r.dateStr === activeTaskReport.dateStr ? activeTaskReport : r,
              ),
            });
            toast.success("تم حفظ جدول المهام بنجاح");
          },
        });
      } else {
        updateData({ taskReports: [activeTaskReport, ...reports] });
        toast.success("تم حفظ جدول المهام بنجاح");
      }
    };

    const toggleStatus = (taskId: string) => {
      if (!activeTaskReport) return;
      const updatedTasks = activeTaskReport.tasks.map((t) => {
        if (t.id === taskId) {
          const next: "pending" | "done" | "failed" =
            t.status === "pending"
              ? "done"
              : t.status === "done"
                ? "failed"
                : "pending";
          return { ...t, status: next };
        }
        return t;
      });
      setActiveTaskReport({ ...activeTaskReport, tasks: updatedTasks });
    };

    const updateTaskRecord = (
      taskId: string,
      field: keyof TaskRecord,
      value: any,
    ) => {
      if (!activeTaskReport) return;
      const updatedTasks = activeTaskReport.tasks.map((t) => {
        if (t.id === taskId) {
          if (field === "degree") {
            const newVal = Math.min(Number(value), t.maxDegree);
            return { ...t, [field]: newVal };
          }
          if (field === "maxDegree") {
            const newMax = Number(value);
            const newDegree = Math.min(t.degree, newMax);
            return { ...t, maxDegree: newMax, degree: newDegree };
          }
          return { ...t, [field]: value };
        }
        return t;
      });
      setActiveTaskReport({ ...activeTaskReport, tasks: updatedTasks });
    };

    const deleteReport = (reportId: string) => {
      if (isReadOnly) return;
      setConfirmDialog({
        isOpen: true,
        title: "حذف التقرير",
        message: "هل أنت متأكد من حذف هذا التقرير؟",
        type: "danger",
        onConfirm: () => {
          updateData({
            taskReports: (data.taskReports || []).filter(
              (r) => r.id !== reportId,
            ),
          });
          toast.success("تم حذف التقرير بنجاح");
        },
      });
    };

    const renderCategoryBox = (
      title: string,
      category: "daily" | "weekly" | "monthly",
      items: TaskItem[],
    ) => (
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 flex flex-col h-[400px] shadow-sm hover:shadow-md transition-all">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h4 className="font-black text-slate-800 flex items-center gap-2">
            <LayoutList size={18} className="text-blue-500" /> {title}
          </h4>
          <button
            onClick={() => setActiveCategoryForAdd(category)}
            className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          >
            <Plus size={14} /> إضافة عنصر
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {items.map((t) => (
            <div
              key={t.id}
              className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-transparent hover:border-blue-100 transition-all"
            >
              <span className="text-xs font-bold text-slate-600 leading-relaxed text-right">
                {t.text}
              </span>
              <button
                onClick={() => removeTaskTemplate(t.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );

    if (showPreviousTaskReports) {
      const reports = (data.taskReports || []).filter((r) =>
        matchesFilter(r.userId),
      );
      return (
        <div className="bg-[#f8fafc] p-6 md:p-10 rounded-[3rem] border-4 border-slate-200 shadow-2xl animate-in fade-in duration-500 font-arabic text-right min-h-[600px]">
          <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <History className="text-blue-600" /> تقارير المهام السابقة
            </h2>
            <button
              onClick={() => setShowPreviousTaskReports(false)}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-white rounded-[2rem] border-2 border-dashed">
                لا توجد تقارير سابقة
              </div>
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black">
                      {r.dayName}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveTaskReport(r);
                          setShowPreviousTaskReports(false);
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteReport(r.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">
                    {r.dateStr}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold mb-4">
                    {r.dateHijri}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-4 border-t">
                    {r.selectedCategories.map((c) => (
                      <span
                        key={c}
                        className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black border"
                      >
                        {c === "daily"
                          ? "يومية"
                          : c === "weekly"
                            ? "أسبوعية"
                            : "شهرية"}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeTaskReport) {
      const reasonsList = [
        "غياب",
        "تأخر عن الدوام",
        "خروج أثناء الدوام",
        "اجتماع بالإدارة",
        "إقامة نشاط مدرسي",
        "تكليف بعمل آخر من الإدارة",
        "ضغوط عمل لهذا اليوم",
        "أخرى",
      ];

      // Bulk Actions logic
      const applyBulkValue = (field: keyof TaskRecord, value: any) => {
        const updated = activeTaskReport.tasks.map((t) => {
          let newVal = value;
          if (field === "degree") newVal = Math.min(Number(value), t.maxDegree);
          return { ...t, [field]: newVal };
        });
        setActiveTaskReport({ ...activeTaskReport, tasks: updated });
      };

      const cycleBulkStatus = () => {
        const current = activeTaskReport.tasks[0]?.status || "pending";
        const next: ExecutionStatus =
          current === "pending"
            ? "done"
            : current === "done"
              ? "failed"
              : "pending";
        applyBulkValue("status", next);
      };

      // Calculations
      const totalMax = activeTaskReport.tasks.reduce(
        (sum, t) => sum + (t.maxDegree || 0),
        0,
      );
      const totalDegree = activeTaskReport.tasks.reduce(
        (sum, t) => sum + (t.degree || 0),
        0,
      );
      const percentage =
        totalMax > 0 ? ((totalDegree / totalMax) * 100).toFixed(2) : "0";

      const exportTasksToExcel = () => {
        const rows: any[] = activeTaskReport.tasks.map((t, i) => ({
          م: i + 1,
          المهمة: t.taskText,
          "الدرجة القصوى": t.maxDegree,
          "الدرجة المستحقة": t.degree,
          "حالة التنفيذ":
            t.status === "done"
              ? "تم"
              : t.status === "failed"
                ? "لم ينفذ"
                : "قيد التنفيذ",
          السبب:
            t.failReason + (t.failOtherReason ? ` (${t.failOtherReason})` : ""),
          ملاحظات: t.notes,
        }));

        // Add summary row to excel
        rows.push({
          م: "",
          المهمة: "المجموع الكلي والنسبة",
          "الدرجة القصوى": totalMax,
          "الدرجة المستحقة": totalDegree,
          "حالة التنفيذ": `% ${percentage}`,
          السبب: "",
          ملاحظات: "",
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تقرير المهام");
        XLSX.writeFile(wb, `تقرير_المهام_${activeTaskReport.dateStr}.xlsx`);
      };

      const exportTasksToTxt = () => {
        let content = `تقرير المهام - ${activeTaskReport.dayName} - ${activeTaskReport.dateStr}\n`;
        content += `التاريخ الهجري: ${activeTaskReport.dateHijri}\n`;
        content += `--------------------------------------------------\n\n`;

        activeTaskReport.tasks.forEach((t, i) => {
          content += `${i + 1}- ${t.taskText}\n`;
          content += `   الدرجة: ${t.degree}/${t.maxDegree} | الحالة: ${t.status === "done" ? "تم" : t.status === "failed" ? "لم ينفذ" : "قيد التنفيذ"}\n`;
          if (t.failReason)
            content += `   السبب: ${t.failReason}${t.failOtherReason ? ` (${t.failOtherReason})` : ""}\n`;
          if (t.notes) content += `   ملاحظات: ${t.notes}\n`;
          content += `\n`;
        });

        content += `--------------------------------------------------\n`;
        content += `المجموع الكلي: ${totalDegree} من ${totalMax}\n`;
        content += `النسبة المئوية: ${percentage}%\n`;

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `تقرير_المهام_${activeTaskReport.dateStr}.txt`;
        link.click();
      };

      const shareTasksWhatsApp = () => {
        let msg = `*📊 تقرير المهام الإدارية*\n`;
        msg += `*🗓 اليوم:* ${activeTaskReport.dayName}\n`;
        msg += `*📅 التاريخ:* ${activeTaskReport.dateStr} م / ${activeTaskReport.dateHijri}\n`;
        msg += `------------------------------------------\n\n`;

        activeTaskReport.tasks.forEach((t, i) => {
          const statusIcon =
            t.status === "done" ? "✅" : t.status === "failed" ? "❌" : "⏳";
          msg += `*${i + 1}.* ${t.taskText}\n`;
          msg += `${statusIcon} *الحالة:* ${t.status === "done" ? "تم التنفيذ" : t.status === "failed" ? "لم ينفذ" : "قيد التنفيذ"}\n`;
          msg += `🎯 *الدرجة:* ${t.degree} / ${t.maxDegree}\n`;
          if (t.failReason)
            msg += `⚠️ *السبب:* ${t.failReason}${t.failOtherReason ? ` - ${t.failOtherReason}` : ""}\n`;
          if (t.notes) msg += `📝 *ملاحظات:* ${t.notes}\n`;
          msg += `\n`;
        });

        msg += `------------------------------------------\n`;
        msg += `*📈 المجموع:* ${totalDegree} / ${totalMax}\n`;
        msg += `*💯 النسبة المئوية:* ${percentage}%\n`;
        msg += `------------------------------------------\n`;
        msg += `${getReportMessageFooter(activeTaskReport.dateStr)}\n`;

        shareViaWhatsApp(msg);
      };

      return (
        <div className="bg-[#fdfdfd] p-6 md:p-10 rounded-[3rem] border-4 border-blue-600 shadow-2xl animate-in zoom-in-95 duration-500 font-arabic text-right relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100%] -mr-16 -mt-16 -z-10"></div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b pb-8">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveTaskReport}
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-lg active:scale-95"
              >
                <Save size={20} /> حفظ الجدول
              </button>
              <div className="flex bg-white border-2 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={exportTasksToExcel}
                  title="تصدير إكسل"
                  className="p-4 hover:bg-slate-50 text-emerald-600 border-e transition-all"
                >
                  <FileSpreadsheet size={20} />
                </button>
                <button
                  onClick={exportTasksToTxt}
                  title="تصدير نصي"
                  className="p-4 hover:bg-slate-50 text-blue-600 border-e transition-all"
                >
                  <FileText size={20} />
                </button>
                <button
                  onClick={shareTasksWhatsApp}
                  title="ارسال واتساب"
                  className="p-4 hover:bg-slate-50 text-emerald-500 transition-all"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
              <button
                onClick={() => setShowPreviousTaskReports(true)}
                className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all flex items-center gap-3 shadow-lg"
              >
                <History size={20} /> تقارير المهام السابقة
              </button>
              <button
                onClick={() => setActiveTaskReport(null)}
                className="p-4 bg-white border-2 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            <div className="text-center md:text-right">
              <h2 className="text-3xl font-black text-slate-800 mb-2">
                جدول المهام
              </h2>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-white p-4 rounded-2xl border-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="text-blue-600" size={18} />
                  <input
                    type="date"
                    className="bg-transparent font-black text-sm outline-none w-32"
                    value={activeTaskReport.dateStr}
                    onChange={(e) => {
                      const d = e.target.value;
                      const gy_new = new Date(d).getFullYear();
                      const hy_new = Math.floor((gy_new - 622) * (33 / 32));
                      setActiveTaskReport({
                        ...activeTaskReport,
                        dateStr: d,
                        dayName: getDayName(d),
                        dateHijri: `${hy_new} هـ`,
                      });
                    }}
                  />
                </div>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-black text-xs md:text-sm whitespace-nowrap">
                  {activeTaskReport.dayName} -{" "}
                  {activeTaskReport.dateStr.split("-")[0]} م /{" "}
                  {activeTaskReport.dateHijri}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[2.5rem] border-2 shadow-2xl bg-white mb-8">
            <table className="w-full border-collapse text-center min-w-[1200px]">
              <thead>
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <th className="p-5 border-e border-slate-700 w-16">م</th>
                  <th className="p-5 border-e border-slate-700 w-12 text-center">
                    <CheckSquare size={18} className="mx-auto" />
                  </th>
                  <th className="p-5 border-e border-slate-700 w-80 text-right">
                    المهمة
                  </th>
                  <th className="p-5 border-e border-slate-700 w-32">
                    الدرجة القصوى
                  </th>
                  <th className="p-5 border-e border-slate-700 w-24">الدرجة</th>
                  <th className="p-5 border-e border-slate-700 w-32">
                    حالة التنفيذ
                  </th>
                  <th className="p-5 border-e border-slate-700 w-56 text-right">
                    سبب عدم التنفيذ
                  </th>
                  <th className="p-5 w-40 text-right">ملاحظات</th>
                </tr>
                <tr className="bg-slate-100 border-b-2 border-slate-200">
                  <td className="p-2 border-e border-slate-200"></td>
                  <td className="p-2 border-e border-slate-200"></td>
                  <td className="p-2 border-e border-slate-200 font-black text-[10px] text-slate-500">
                    تعبئة تلقائية للكل ⬅️
                  </td>
                  <td className="p-2 border-e border-slate-200">
                    <div className="flex gap-1 justify-center">
                      <input
                        type="number"
                        defaultValue="2"
                        className="w-12 p-1 border rounded text-center text-xs font-black bulk-max-degree"
                      />
                      <button
                        onClick={() => {
                          const val = Number(
                            (
                              document.querySelector(
                                ".bulk-max-degree",
                              ) as HTMLInputElement
                            )?.value || 2,
                          );
                          applyBulkValue("maxDegree", val);
                        }}
                        title="تطبيق على الكل"
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
                      >
                        <Zap size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 border-e border-slate-200">
                    <div className="flex gap-1 justify-center">
                      <input
                        type="number"
                        defaultValue="2"
                        className="w-12 p-1 border rounded text-center text-xs font-black bulk-degree-val"
                      />
                      <button
                        onClick={() => {
                          const val = Number(
                            (
                              document.querySelector(
                                ".bulk-degree-val",
                              ) as HTMLInputElement
                            )?.value || 2,
                          );
                          applyBulkValue("degree", val);
                        }}
                        title="تطبيق على الكل"
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all"
                      >
                        <Zap size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 border-e border-slate-200 px-4 text-center">
                    <button
                      onClick={cycleBulkStatus}
                      className="w-full py-1.5 bg-slate-800 text-white rounded-lg font-black text-[10px] hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={12} /> تغيير الكل
                    </button>
                  </td>
                  <td className="p-2 border-e border-slate-200 px-4">
                    <select
                      className="w-full p-1 border rounded text-[10px] font-black"
                      onChange={(e) =>
                        applyBulkValue("failReason", e.target.value)
                      }
                    >
                      <option value="">اختر للكل...</option>
                      {reasonsList.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center bg-slate-50/50">
                    <button
                      onClick={() => setShowBulkNotePopup(true)}
                      className="w-[80%] py-1.5 bg-blue-100 text-blue-700 rounded-lg font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all mx-auto flex items-center justify-center gap-2"
                    >
                      <PencilLine size={12} /> ملاحظة للكل
                    </button>
                  </td>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTaskReport.tasks.map((task, idx) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 transition-colors h-16 ${task.status === "done" ? "bg-emerald-50/20" : task.status === "failed" ? "bg-red-50/20" : ""}`}
                  >
                    <td className="font-black text-slate-400 border-e">
                      {idx + 1}
                    </td>
                    <td className="border-e">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded accent-blue-600"
                      />
                    </td>
                    <td className="text-right px-6 font-black text-slate-700 border-e text-xs leading-relaxed">
                      {task.taskText}
                    </td>
                    <td className="border-e text-center">
                      <input
                        type="number"
                        className="w-16 p-2 bg-slate-50 border rounded-lg text-center font-black text-xs"
                        value={task.maxDegree}
                        onChange={(e) =>
                          updateTaskRecord(
                            task.id,
                            "maxDegree",
                            Number(e.target.value),
                          )
                        }
                      />
                    </td>
                    <td className="border-e text-center">
                      <input
                        type="number"
                        className="w-16 p-2 bg-white border-2 border-blue-100 rounded-lg text-center font-black text-xs text-blue-600 focus:border-blue-500 outline-none"
                        value={task.degree}
                        max={task.maxDegree}
                        onChange={(e) =>
                          updateTaskRecord(
                            task.id,
                            "degree",
                            Number(e.target.value),
                          )
                        }
                      />
                    </td>
                    <td className="border-e p-2">
                      <button
                        onClick={() => toggleStatus(task.id)}
                        className={`w-full py-2.5 rounded-xl font-black text-[10px] shadow-sm transition-all active:scale-95 ${
                          task.status === "done"
                            ? "bg-emerald-600 text-white"
                            : task.status === "failed"
                              ? "bg-red-600 text-white"
                              : "bg-amber-500 text-white"
                        }`}
                      >
                        {task.status === "done"
                          ? "تم التنفيذ"
                          : task.status === "failed"
                            ? "لم يتم التنفيذ"
                            : "قيد التنفيذ"}
                      </button>
                    </td>
                    <td className="border-e p-2 text-right">
                      <div className="space-y-1.5 px-2">
                        <select
                          className="w-full p-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-blue-400"
                          value={task.failReason}
                          onChange={(e) =>
                            updateTaskRecord(
                              task.id,
                              "failReason",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">اختر السبب...</option>
                          {reasonsList.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {task.failReason === "أخرى" && (
                          <input
                            className="w-full p-2 border rounded-lg text-[10px] font-bold outline-none animate-in slide-in-from-top-1 px-1"
                            placeholder="اكتب السبب المخصص..."
                            value={task.failOtherReason || ""}
                            onChange={(e) =>
                              updateTaskRecord(
                                task.id,
                                "failOtherReason",
                                e.target.value,
                              )
                            }
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <textarea
                        className="w-full p-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:bg-white focus:border-blue-300 min-h-[40px] resize-none"
                        placeholder="..."
                        value={task.notes}
                        onChange={(e) =>
                          updateTaskRecord(task.id, "notes", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black">
                  <td
                    colSpan={3}
                    className="p-5 text-right text-lg border-e border-slate-700"
                  >
                    المجموع الكلي والنسبة المئوية للمهام
                  </td>
                  <td className="p-5 border-e border-slate-700 text-xl">
                    {totalMax}
                  </td>
                  <td className="p-5 border-e border-slate-700 text-xl text-emerald-400">
                    {totalDegree}
                  </td>
                  <td
                    className="p-5 border-e border-slate-700 text-xl"
                    colSpan={2}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-slate-400 text-sm">الإحصائية:</span>
                      <span className="text-blue-400">{percentage}%</span>
                    </div>
                  </td>
                  <td className="p-5"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {showBulkNotePopup && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[210] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border-4 border-blue-500 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <PencilLine className="text-blue-500" /> كتابة ملاحظة للجميع
                </h3>
                <textarea
                  className="w-full p-4 border-2 rounded-2xl outline-none font-bold text-sm bg-slate-50 focus:border-blue-500 min-h-[120px] shadow-inner mb-6"
                  placeholder="العبارة التي ستظهر في جميع الحقول..."
                  value={bulkNoteValue}
                  onChange={(e) => setBulkNoteValue(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      applyBulkValue("notes", bulkNoteValue);
                      setShowBulkNotePopup(false);
                      setBulkNoteValue("");
                    }}
                    className="bg-blue-600 text-white p-4 rounded-xl font-black hover:bg-blue-700 transition-all shadow-md"
                  >
                    تم
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkNotePopup(false);
                      setBulkNoteValue("");
                    }}
                    className="bg-slate-100 text-slate-500 p-4 rounded-xl font-black hover:bg-slate-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[2.5rem] border shadow-xl gap-6">
          <div className="flex-1 w-full space-y-4">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Briefcase className="text-blue-600" /> إدارة المهام
            </h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border cursor-pointer hover:bg-white transition-all">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-600"
                  checked={selectedTaskCategories.includes("daily")}
                  onChange={(e) =>
                    e.target.checked
                      ? setSelectedTaskCategories([
                          ...selectedTaskCategories,
                          "daily",
                        ])
                      : setSelectedTaskCategories(
                          selectedTaskCategories.filter((c) => c !== "daily"),
                        )
                  }
                />
                <span className="text-xs font-black text-slate-600">
                  المهام اليومية
                </span>
              </label>
              <label className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border cursor-pointer hover:bg-white transition-all">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-600"
                  checked={selectedTaskCategories.includes("weekly")}
                  onChange={(e) =>
                    e.target.checked
                      ? setSelectedTaskCategories([
                          ...selectedTaskCategories,
                          "weekly",
                        ])
                      : setSelectedTaskCategories(
                          selectedTaskCategories.filter((c) => c !== "weekly"),
                        )
                  }
                />
                <span className="text-xs font-black text-slate-600">
                  المهام الأسبوعية
                </span>
              </label>
              <label className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border cursor-pointer hover:bg-white transition-all">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-600"
                  checked={selectedTaskCategories.includes("monthly")}
                  onChange={(e) =>
                    e.target.checked
                      ? setSelectedTaskCategories([
                          ...selectedTaskCategories,
                          "monthly",
                        ])
                      : setSelectedTaskCategories(
                          selectedTaskCategories.filter((c) => c !== "monthly"),
                        )
                  }
                />
                <span className="text-xs font-black text-slate-600">
                  المهام الشهرية
                </span>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={generateTaskTable}
              className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <Zap size={18} /> جدول المهام
            </button>
            <button
              onClick={() => setShowPreviousTaskReports(true)}
              className="flex-1 bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <History size={18} /> تقارير المهام السابقة
            </button>
            <button
              onClick={resetTasksToDefaults}
              title="استعادة المهام الافتراضية"
              className="p-4 bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm flex items-center justify-center"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => setActiveSubTab(null)}
              className="p-4 bg-white border-2 hover:bg-slate-50 rounded-2xl transition-all shadow-sm flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderCategoryBox("المهام اليومية", "daily", dailyTemplates)}
          {renderCategoryBox("المهام الأسبوعية", "weekly", weeklyTemplates)}
          {renderCategoryBox("المهام الشهرية", "monthly", monthlyTemplates)}
        </div>

        {activeCategoryForAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 border-4 border-emerald-500 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="text-emerald-500" /> إضافة عنصر جديد
              </h3>
              <textarea
                autoFocus
                className="w-full p-4 border-2 rounded-2xl outline-none font-bold text-sm bg-slate-50 focus:border-emerald-500 min-h-[120px] shadow-inner mb-6"
                placeholder="اكتب المهمة هنا..."
                value={customTaskInput}
                onChange={(e) => setCustomTaskInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(),
                  handleAddTaskTemplate(activeCategoryForAdd))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAddTaskTemplate(activeCategoryForAdd)}
                  className="bg-emerald-600 text-white p-4 rounded-xl font-black hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                >
                  إضافة
                </button>
                <button
                  onClick={() => {
                    setActiveCategoryForAdd(null);
                    setCustomTaskInput("");
                  }}
                  className="bg-slate-100 text-slate-500 p-4 rounded-xl font-black hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubModuleContent = () => {
    switch (activeSubTab) {
      case "المهام":
        return renderTasksModule();
      case "الغياب اليومي":
        return renderAbsenceModule();
      case "التأخر":
        return renderLatenessModule();
      case "المخالفات الطلابية":
        return renderViolationModule();
      case "التعزيزات والمكافآت":
        return <StudentReinforcementsView onClose={() => setActiveSubTab(null)} />;
      case "خروج طالب أثناء الدراسة":
        return renderExitModule();
      case "سجل الإتلاف المدرسي":
        return renderDamageModule();
      case "سجل زيارة أولياء الأمور والتواصل بهم":
        return renderParentVisitModule();
      case "الاختبار الشهري":
      case "الاختبار الفصلي":
        return renderExamModule();
      case "المهام المضافة":
        return <AddedTasksView onClose={() => setActiveSubTab(null)} />;
      case "المهام المرحلة":
        return <PostponedTasksView onClose={() => setActiveSubTab(null)} />;
      case "المشكلات والتوصيات والمقترحات":
        return (
          <IssuesAndRecommendationsView onClose={() => setActiveSubTab(null)} />
        );
      case "سجل الإبداع والتميز":
        return (
          <CreativityAndExcellenceView onClose={() => setActiveSubTab(null)} />
        );
      case "كشف الاستلام والتسليم":
        return <DeliveryReceiptView onClose={() => setActiveSubTab(null)} />;
      case "سجل متابعة الدفاتر والتصحيح":
        return <NotebookCorrectionFollowUpView onClose={() => setActiveSubTab(null)} />;
      default:
        return (
          <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border shadow-2xl relative overflow-hidden font-arabic text-right">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-black text-slate-800">
                {activeSubTab}
              </h3>
              <button
                onClick={() => setActiveSubTab(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <X />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-slate-500 font-bold text-sm md:text-base">
                هذا السجل ({activeSubTab}) قيد التطوير البرمجي ليكون متكاملاً مع
                باقي أقسام البرنامج.
              </p>
              <div className="bg-slate-50 p-10 md:p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Database size={64} />
                <span className="font-black text-base md:text-lg text-center">
                  قاعدة بيانات قيد التجهيز
                </span>
              </div>
            </div>
          </div>
        );
    }
  };

  const renderCurrentModule = () => {
    return (
      <>
        {renderSubModuleContent()}

        <PreviousRecordModal
          isOpen={showPreviousAbsence}
          onClose={() => setShowPreviousAbsence(false)}
          title="سجل غياب سابق"
          type="absence"
          studentId={absenceForm.studentId}
          studentName={absenceForm.studentName}
          onSelect={(r) => setAbsenceForm({ ...r })}
        />

        <PreviousRecordModal
          isOpen={showPreviousLateness}
          onClose={() => setShowPreviousLateness(false)}
          title="سجل تأخر سابق"
          type="lateness"
          studentId={latenessForm.studentId}
          studentName={latenessForm.studentName}
          onSelect={(r) => setLatenessForm({ ...r })}
        />

        <PreviousRecordModal
          isOpen={showPreviousViolation}
          onClose={() => setShowPreviousViolation(false)}
          title="سجل مخالفة سابقة"
          type="violation"
          studentId={violationForm.studentId}
          studentName={violationForm.studentName}
          onSelect={(r) => setViolationForm({ ...r })}
        />

        {customViolation.cat && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-800">
                إضافة مخالفة مخصصة
              </h3>
              <input
                autoFocus
                className="w-full p-4 border-2 rounded-2xl outline-none font-black text-lg focus:border-red-500 shadow-inner bg-slate-50"
                placeholder="اكتب المخالفة هنا..."
                value={customViolation.item}
                onChange={(e) =>
                  setCustomViolation({
                    ...customViolation,
                    item: e.target.value,
                  })
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && addCustomViolation(customViolation.cat)
                }
              />
              <div className="flex gap-3">
                <button
                  onClick={() => addCustomViolation(customViolation.cat)}
                  className="flex-1 bg-red-600 text-white p-4 rounded-xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95"
                >
                  إضافة
                </button>
                <button
                  onClick={() => setCustomViolation({ cat: "", item: "" })}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-black hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const handleSubTabClick = (item: string) => {
    setActiveSubTab(item);
    setShowTable(false);
    setShowPresenceTracker(false); // Ensure tracker is off when switching
    onSubTabOpen?.(item);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 font-arabic pb-20 text-right">
      {!activeSubTab ? (
        <>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                <Sparkles className="text-blue-600 animate-pulse" />
                التقارير الخاصة والمتقدمة
              </h2>
              <p className="text-slate-500 font-bold mt-1 text-sm md:text-base">
                إدارة شاملة لجميع السجلات الإدارية والتربوية
              </p>
            </div>
          </header>
          <div className="flex flex-wrap gap-2 md:gap-4 justify-center md:justify-start">
            {Object.entries(structure).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as MainTab)}
                className={`flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black text-sm md:text-lg transition-all shadow-sm ${activeTab === key ? "bg-blue-600 text-white shadow-xl scale-105" : "bg-white text-slate-600 border border-slate-100 hover:bg-blue-50"}`}
              >
                {React.cloneElement(cat.icon as React.ReactElement<any>, {
                  size: 20,
                })}{" "}
                {cat.title}
              </button>
            ))}
          </div>
          <div className="bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {structure[activeTab].items.map((item) => (
                <button
                  key={item}
                  onClick={() => handleSubTabClick(item)}
                  className="group flex items-center justify-between p-4 md:p-6 rounded-[1.2rem] md:rounded-[1.5rem] bg-slate-50 border-2 border-slate-50 hover:border-blue-500 hover:bg-white transition-all text-right shadow-sm hover:shadow-xl"
                >
                  <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-xl bg-white flex-shrink-0 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <FileText size={16} />
                    </div>
                    <span className="font-black text-slate-700 group-hover:text-blue-600 transition-colors text-[10px] md:text-xs truncate">
                      {item}
                    </span>
                  </div>
                  <ChevronRight
                    className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0"
                    size={18}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        renderCurrentModule()
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

export default SpecialReportsPage;
