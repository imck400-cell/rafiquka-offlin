import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Save,
  FileSpreadsheet,
  Plus,
  Combine,
  History,
  TrendingUp,
  ChevronLeft,
  Search,
  CheckCircle2,
  ChevronDown,
  Download,
  AlertCircle,
  X,
  Trash2,
  Star,
  Check,
  User,
  BookOpen,
  ClipboardList
} from "lucide-react";
import { localDB } from "../src/lib/localDB";
import { stampRecord } from "../src/lib/recordStamping";
import {
  normalizeArabicText,
  normalizeSchool,
  normalizeBranch,
  normalizeGrade,
  normalizeSection,
  hasIntersection,
  isEntityVisibleToSupervisor,
  canUserModifyDataKey,
} from "../src/lib/NormalizationEngine";
import { toast } from "sonner";

// Type definitions
interface GradeSheet {
  id?: string;
  schoolName: string;
  branch: string;
  teacherName: string;
  subject: string;
  grade: string;
  section: string;
  sheetName: string;
  date: string;
  months: string[]; // ['شهر الأول', 'شهر الثاني', 'شهر الثالث']
  cells: Record<string, string>; // key: `${studentId}-${colId}` -> value
  userId: string;
  timestamp: string;
  maxScores?: Record<string, number>;
  disabledCols?: string[];
}

interface StudentGradeSheetDoc {
  id?: string;
  schoolName: string;
  branch: string;
  academicYear: string;
  term: string;
  grade: string;
  section: string;
  sheetName: string; // The month/exam
  studentId: string;
  studentName: string;
  cells: Record<string, string>; // key: `${subjectName}-${colId}` -> value
  userId: string;
  timestamp: string;
}

interface AllSubjectsGradeSheetDoc {
  id?: string;
  schoolName: string;
  branch: string;
  academicYear: string;
  term: string;
  grade: string;
  section: string;
  sheetName: string;
  cells: Record<string, string>; // key: `${studentId}-${subjectName}` -> value
  userId: string;
  timestamp: string;
}

export const GradeSheetsView = ({ onBack }: { onBack: () => void }) => {
  const { lang, data, currentUser, queueSyncRequest } = useGlobal();
  
  // Navigation Mode
  const [mode, setMode] = useState<"menu" | "subject" | "student" | "all_subjects">("menu");

  const [displayMode, setDisplayMode] = useState<"total" | "exam_only">("total");

  const findMonthIndex = (monthsList: string[], targetMonth: string) => {
    const clean = (s: string) => s.replace(/\s+/g, "").replace(/ال/g, "");
    const cleanedTarget = clean(targetMonth);
    return monthsList.findIndex((m) => clean(m) === cleanedTarget);
  };

  const SUBJECTS = [
    "القرآن الكريم",
    "التربية الإسلامية",
    "اللغة العربية",
    "اللغة الإنجليزية",
    "الرياضيات",
    "العلوم",
    "الكيمياء",
    "الفيزياء",
    "الأحياء",
    "الاجتماعيات",
    "الحاسوب",
  ];
  const GRADES = [
    "تمهيدي",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];
  const SECTIONS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

  // Helper lists of subjects by grade
  const getSubjectsForStudent = (grade: string) => {
    if (grade === "10") {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "الكيمياء",
        "الفيزياء",
        "الأحياء",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    } else if (grade === "11" || grade === "12") {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الجبر والهندسة",
        "التفاضل والتكامل",
        "الكيمياء",
        "الفيزياء",
        "الأحياء",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    } else {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "العلوم",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    }
  };

  const getSubjectsForAllTable = (grade: string) => {
    if (grade === "10") {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "الكيمياء",
        "الفيزياء",
        "الأحياء",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    } else if (grade === "11" || grade === "12") {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "جبر وهندسة",
        "تفاضل وتكامل",
        "الكيمياء",
        "الفيزياء",
        "الأحياء",
        "الحاسوب"
      ];
    } else {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "العلوم",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    }
  };

  // State collections from Firebase
  const [sheets, setSheets] = useState<GradeSheet[]>([]);
  const [studentSheets, setStudentSheets] = useState<StudentGradeSheetDoc[]>([]);
  const [allSubjectsSheets, setAllSubjectsSheets] = useState<AllSubjectsGradeSheetDoc[]>([]);
  
  // Calculate permissions
  const userStaffProfile = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return null;
    }
    return data.secretariatStaff?.find(
      (s: any) => normalizeArabicText(s.name) === normalizeArabicText(currentUser?.name)
    );
  }, [data.secretariatStaff, currentUser]);

  const allowedSchools = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return Object.keys(data.profile?.schoolsAndBranches || {});
    }
    if (userStaffProfile?.school) {
      return [userStaffProfile.school];
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    return userRecord?.schools || [];
  }, [currentUser, data.profile?.schoolsAndBranches, data.users, userStaffProfile]);

  const [schoolName, setSchoolName] = useState(
    currentUser?.selectedSchool || allowedSchools[0] || "",
  );

  const allowedBranches = useMemo(() => {
    if (!schoolName) return [];
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      const branchesDict = data.profile?.schoolsAndBranches || {};
      return branchesDict[schoolName] || [];
    }
    if (userStaffProfile?.branch) {
      return [userStaffProfile.branch];
    }
    const userPerms = data.users?.find((u) => u.id === currentUser?.id)
      ?.permissions?.schoolsAndBranches;
    return userPerms?.[schoolName] || [];
  }, [schoolName, currentUser, data.users, data.profile?.schoolsAndBranches, userStaffProfile]);

  const [branch, setBranch] = useState(currentUser?.selectedBranch || allowedBranches[0] || "");

  const allowedTeachers = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      const staffList = data.secretariatStaff || [];
      if (staffList.length > 0) {
        return staffList.map((s: any) => ({
          id: s.id || s.name,
          name: s.name,
        }));
      }
      return [
        {
          id: currentUser?.id || "id",
          name: currentUser?.name || "مستخدم غير معروف",
        },
      ];
    }
    return [
      {
        id: currentUser?.id || "id",
        name: currentUser?.name || "مستخدم غير معروف",
      },
    ];
  }, [currentUser, data.secretariatStaff]);

  const [teacherName, setTeacherName] = useState(currentUser?.name || "");

  const allowedSubjects = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return SUBJECTS;
    }
    if (userStaffProfile?.subjects && userStaffProfile.subjects.length > 0) {
      return userStaffProfile.subjects;
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    if (userRecord?.subjects && userRecord.subjects.length > 0) {
      return userRecord.subjects;
    }
    return SUBJECTS;
  }, [currentUser, data.users, userStaffProfile]);

  const allowedGrades = useMemo(() => {
    if (currentUser?.grades && currentUser.grades.length > 0) {
      return currentUser.grades;
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    if (userRecord?.grades && userRecord.grades.length > 0) {
      return userRecord.grades;
    }
    if (userStaffProfile?.grades && userStaffProfile.grades.length > 0) {
      return userStaffProfile.grades;
    }
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return GRADES;
    }
    return GRADES;
  }, [currentUser, data.users, userStaffProfile]);

  const allowedSections = useMemo(() => {
    if (currentUser?.sections && currentUser.sections.length > 0) {
      return currentUser.sections;
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    if (userRecord?.sections && userRecord.sections.length > 0) {
      return userRecord.sections;
    }
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return SECTIONS;
    }
    return SECTIONS;
  }, [currentUser, data.users]);

  // Adjust selections automatically
  useEffect(() => {
    if (allowedSchools.length > 0 && !allowedSchools.includes(schoolName)) {
      setSchoolName(allowedSchools[0]);
    }
  }, [allowedSchools]);

  useEffect(() => {
    if (allowedBranches.length > 0 && !allowedBranches.includes(branch)) {
      setBranch(allowedBranches[0]);
    }
  }, [allowedBranches]);

  // Real-time synchronization loader
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allowedSchoolsRef = useRef(allowedSchools);
  const allowedBranchesRef = useRef(allowedBranches);

  useEffect(() => {
    allowedSchoolsRef.current = allowedSchools;
    allowedBranchesRef.current = allowedBranches;
  }, [allowedSchools, allowedBranches]);

  const updateLocalGradeSheetsCache = (item: GradeSheet) => {
    const cached = localStorage.getItem('cached_standalone_GradeSheets');
    let list = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((x: any) => x.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem('cached_standalone_GradeSheets', JSON.stringify(list));
  };

  const updateLocalStudentGradeSheetsCache = (item: any) => {
    const cached = localStorage.getItem('cached_standalone_StudentGradeSheets');
    let list = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((x: any) => x.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem('cached_standalone_StudentGradeSheets', JSON.stringify(list));
  };

  const updateLocalAllSubjectsGradeSheetsCache = (item: any) => {
    const cached = localStorage.getItem('cached_standalone_AllSubjectsGradeSheets');
    let list = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((x: any) => x.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem('cached_standalone_AllSubjectsGradeSheets', JSON.stringify(list));
  };

  const fetchData = async () => {
    const isSuperAdmin = currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    const filterFn = (item: any) => {
      if (isSuperAdmin) return true;
      if (item.userId === currentUser?.id) return true;

      // فحص الكشف عبر محرك العزل الصارم للمشرف التربوي (المدرسة، الفرع، الصف، المادة، الشعبة)
      if (!isEntityVisibleToSupervisor(item, currentUser, "GradeSheets")) {
        return false;
      }

      const hasSchool =
        item.schoolName &&
        hasIntersection([item.schoolName], allowedSchoolsRef.current, normalizeSchool);
      const hasBranch =
        !item.branch ||
        allowedBranchesRef.current.length === 0 ||
        hasIntersection([item.branch], allowedBranchesRef.current, normalizeBranch);

      return Boolean(hasSchool && hasBranch);
    };

    try {
      const [sheetsData, studentSheetsData, allSubjectsSheetsData] = await Promise.all([
        localDB.gradeSheets.toArray(),
        localDB.studentGradeSheets.toArray(),
        localDB.allSubjectsGradeSheets.toArray()
      ]);
      
      setSheets((sheetsData as GradeSheet[]).filter(filterFn));
      setStudentSheets((studentSheetsData as StudentGradeSheetDoc[]).filter(filterFn));
      setAllSubjectsSheets((allSubjectsSheetsData as AllSubjectsGradeSheetDoc[]).filter(filterFn));
    } catch (err) {
      console.error("Error fetching grade sheets data from localDB", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // -------------------------------------------------------------
  // MODE 1: SUBJECT GRADE SHEET (كشف درجات مادة)
  // -------------------------------------------------------------
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [months, setMonths] = useState(["شهر الأول", "شهر الثاني", "شهر الثالث"]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [disabledCols, setDisabledCols] = useState<string[]>([]);
  const [maxScores, setMaxScores] = useState<Record<string, number>>({
    w_k: 20, // Default to 20 as requested
    oral: 10,
    attend: 10,
    written: 60,
    term_result: 20,
  });
  
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  
  const [highlightedRows, setHighlightedRows] = useState<string[]>([]);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [showVisibleMonthsModal, setShowVisibleMonthsModal] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState<number[]>([0, 1, 2]);
  
  const [indicatorConfig, setIndicatorConfig] = useState({
    months: [] as number[],
    fields: [] as string[],
    level: "" as string,
  });

  const monthCols = [
    { id: "w_k", label: "الواجب" }, // Renamed from واجب (ك) to الواجب
    { id: "oral", label: "شفوي" },
    { id: "attend", label: "مواظبة" },
    { id: "written", label: "تحريري" },
    { id: "total_m", label: "المجموع", isTotal: true },
    { id: "ratio_m", label: "النسبة", isTotal: true },
  ];

  const finalCols = [
    { id: "term_result", label: "المحصلة الفصلية" },
    { id: "term_exam", label: "اختبار فصلي" },
  ];

  const canEditData =
    canUserModifyDataKey(currentUser, "gradeSheets") &&
    (currentUser?.role === "admin" ||
      currentUser?.permissions?.all === true ||
      currentUser?.permissions?.gradeSheets === undefined ||
      currentUser?.permissions?.gradeSheets === true ||
      (Array.isArray(currentUser?.permissions?.gradeSheets) &&
        (currentUser.permissions.gradeSheets.includes("edit_data") ||
          currentUser.permissions.gradeSheets.includes("allowEdits"))));

  useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.includes(subject)) {
      setSubject(allowedSubjects[0]);
    }
  }, [allowedSubjects, subject]);

  useEffect(() => {
    if (allowedGrades.length > 0 && !allowedGrades.includes(selectedGrade)) {
      setSelectedGrade(allowedGrades[0]);
    }
  }, [allowedGrades, selectedGrade]);

  useEffect(() => {
    if (allowedSections.length > 0 && !allowedSections.includes(selectedSection)) {
      setSelectedSection(allowedSections[0]);
    }
  }, [allowedSections, selectedSection]);

  // Sync loaded subject sheet cells when sheets change
  useEffect(() => {
    if (currentSheetId) {
      const current = sheets.find((l) => l.id === currentSheetId);
      if (current && !saveTimeoutRef.current) {
        setCells(current.cells || {});
        setMaxScores(current.maxScores || { w_k: 20, oral: 10, attend: 10, written: 60, term_result: 20 });
        setDisabledCols(current.disabledCols || []);
        setSchoolName(current.schoolName || "");
        setBranch(current.branch || "");
        setTeacherName(current.teacherName || "");
        setSubject(current.subject || "");
        setSelectedGrade(current.grade || "");
        setSheetName(current.sheetName || "");
        setMonths(current.months || ["شهر الأول", "شهر الثاني", "شهر الثالث"]);
      }
    }
  }, [sheets, currentSheetId]);

  const students = useMemo(() => {
    let filtered = (data.secretariatStudents || []) as any[];
    if (schoolName) {
      filtered = filtered.filter((s) =>
        hasIntersection([s.school], [schoolName], normalizeSchool)
      );
    }
    if (branch) {
      filtered = filtered.filter((s) =>
        hasIntersection([s.branch], [branch], normalizeBranch)
      );
    }
    if (selectedGrade) {
      filtered = filtered.filter((s) =>
        hasIntersection([s.grade], [selectedGrade], normalizeGrade)
      );
    }
    if (selectedSection) {
      filtered = filtered.filter((s) =>
        hasIntersection([s.section], [selectedSection], normalizeSection)
      );
    }
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  }, [data.secretariatStudents, schoolName, branch, selectedGrade, selectedSection]);

  const displayedStudents = useMemo(() => {
    if (!indicatorConfig.level) return students;

    const studentsWithScore = students.map((s) => {
      let hasWritten = false;
      let hasAnyGrade = false;
      const targetMonths = indicatorConfig.months.length > 0 ? indicatorConfig.months : visibleMonths;
      const targetFields = indicatorConfig.fields.length > 0 ? indicatorConfig.fields : ["w_k", "oral", "attend", "written"];

      let indicatorTotal = 0;
      let indicatorMax = 0;

      targetMonths.forEach((mIdx) => {
        targetFields.forEach((f) => {
          const val = cells[`${s.id}-m${mIdx}-${f}`];
          if (val !== undefined && val.trim() !== "") {
            hasAnyGrade = true;
            indicatorTotal += parseFloat(val) || 0;
          }
          if (f === "written" && val && val.trim() !== "") hasWritten = true;
          const maxF = maxScores[f] || (f === "written" ? 60 : 10);
          indicatorMax += maxF;
        });
      });

      const percentage = indicatorMax > 0 ? (indicatorTotal / indicatorMax) * 100 : 0;
      return { ...s, indicatorTotal, percentage, hasWritten, hasAnyGrade };
    });

    if (indicatorConfig.level === "highest") {
      return studentsWithScore.sort((a, b) => b.indicatorTotal - a.indicatorTotal).slice(0, Math.max(1, Math.floor(studentsWithScore.length / 4)));
    }
    if (indicatorConfig.level === "lowest") {
      return studentsWithScore.sort((a, b) => a.indicatorTotal - b.indicatorTotal).slice(0, Math.max(1, Math.floor(studentsWithScore.length / 4)));
    }
    if (indicatorConfig.level === "average") {
      return studentsWithScore.sort((a, b) => b.indicatorTotal - a.indicatorTotal).slice(Math.floor(studentsWithScore.length / 4), Math.floor((studentsWithScore.length * 3) / 4));
    }
    if (indicatorConfig.level === "absent_written") {
      return studentsWithScore.filter((s) => !s.hasWritten).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    }
    if (indicatorConfig.level === "no_grades") {
      return studentsWithScore.filter((s) => !s.hasAnyGrade).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    }
    if (indicatorConfig.level === "excellent") {
      return studentsWithScore.filter((s) => s.percentage >= 90).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === "vgood") {
      return studentsWithScore.filter((s) => s.percentage >= 80 && s.percentage < 90).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === "good") {
      return studentsWithScore.filter((s) => s.percentage >= 65 && s.percentage < 80).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === "fair") {
      return studentsWithScore.filter((s) => s.percentage >= 50 && s.percentage < 65).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    if (indicatorConfig.level === "fail") {
      return studentsWithScore.filter((s) => s.percentage < 50 && s.hasAnyGrade).sort((a, b) => b.indicatorTotal - a.indicatorTotal);
    }
    return students;
  }, [students, cells, visibleMonths, indicatorConfig, maxScores]);

  const updateStudentCalculations = (
    currentCells: Record<string, string>,
    studentId: string,
    currentMaxScores: Record<string, number>,
    currentVisibleMonths: number[] = visibleMonths,
  ) => {
    months.forEach((_, idx) => {
      const mIdx = String(idx);
      let monthTotal = 0;
      ["w_k", "oral", "attend", "written"].forEach((mc) => {
        monthTotal += parseFloat(currentCells[`${studentId}-m${mIdx}-${mc}`] || "0") || 0;
      });

      currentCells[`${studentId}-m${mIdx}-total_m`] = monthTotal.toString();

      const monthMaxSum =
        (currentMaxScores.w_k || 20) +
        (currentMaxScores.oral || 10) +
        (currentMaxScores.attend || 10) +
        (currentMaxScores.written || 60);
      const ratio = monthMaxSum > 0 ? (monthTotal / monthMaxSum) * 100 : 0;
      currentCells[`${studentId}-m${mIdx}-ratio_m`] = Math.round(ratio).toString() + "%";
    });

    const monthMaxSum =
      (currentMaxScores.w_k || 20) +
      (currentMaxScores.oral || 10) +
      (currentMaxScores.attend || 10) +
      (currentMaxScores.written || 60);
    const termTargetMax = currentMaxScores.term_result || 20;
    let sumOfMonths = 0;

    currentVisibleMonths.forEach((idx) => {
      sumOfMonths += parseFloat(currentCells[`${studentId}-m${idx}-total_m`] || "0") || 0;
    });

    const maxAllMonths = monthMaxSum * currentVisibleMonths.length;
    const termResult = maxAllMonths > 0 ? (sumOfMonths / maxAllMonths) * termTargetMax : 0;

    if (sumOfMonths > 0) {
      currentCells[`${studentId}-final-term_result`] = termResult.toFixed(1).replace(/\.0$/, "");
    } else if (currentCells[`${studentId}-final-term_result`]) {
      currentCells[`${studentId}-final-term_result`] = "";
    }
  };

  const triggerAutoSave = (newCells: Record<string, string>, disabled: string[], maxs: Record<string, number>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newCells, disabled, maxs, true);
    }, 1500);
  };

  const [bulkFill, setBulkFill] = useState<Record<string, string>>({});

  const handleBulkFill = (colKey: string) => {
    if (!canEditData || disabledCols.includes(colKey)) return;
    const val = bulkFill[colKey];
    if (val === undefined || val === "") return;

    let finalVal = val;
    const field = colKey.split("-")[1];
    if (field && maxScores[field] !== undefined && finalVal.trim() !== "") {
      const numVal = parseFloat(finalVal);
      if (!isNaN(numVal) && numVal > maxScores[field]) {
        finalVal = maxScores[field].toString();
      }
    }

    const newCells = { ...cells };
    displayedStudents.forEach((s) => {
      newCells[`${s.id}-${colKey}`] = finalVal;
      updateStudentCalculations(newCells, s.id, maxScores);
    });

    setCells(newCells);
    setBulkFill((prev) => ({ ...prev, [colKey]: "" }));
    triggerAutoSave(newCells, disabledCols, maxScores);
  };

  const handleColToggle = (colKey: string) => {
    if (!canEditData) return;
    const newDisabled = disabledCols.includes(colKey)
      ? disabledCols.filter((c) => c !== colKey)
      : [...disabledCols, colKey];
    setDisabledCols(newDisabled);
    triggerAutoSave(cells, newDisabled, maxScores);
  };

  const handleCellChange = (studentId: string, colKey: string, val: string) => {
    if (disabledCols.includes(colKey)) return;

    let finalVal = val;
    if (colKey.startsWith("m") || colKey.startsWith("final")) {
      const field = colKey.split("-")[1];
      if (field && maxScores[field] !== undefined && finalVal.trim() !== "") {
        const numVal = parseFloat(finalVal);
        if (!isNaN(numVal) && numVal > maxScores[field]) {
          finalVal = maxScores[field].toString();
        }
      }
    }

    const newCells = { ...cells, [`${studentId}-${colKey}`]: finalVal };

    if (colKey.startsWith("m") || colKey.startsWith("final")) {
      updateStudentCalculations(newCells, studentId, maxScores);
    }

    setCells(newCells);
    triggerAutoSave(newCells, disabledCols, maxScores);
  };

  const calculateColumnTotal = (colKey: string) => {
    let tot = 0;
    displayedStudents.forEach((s) => {
      tot += parseFloat(cells[`${s.id}-${colKey}`] || "0") || 0;
    });
    return tot;
  };

  const calculateColumnRatio = (colKey: string) => {
    let totalScore = calculateColumnTotal(colKey);
    let count = displayedStudents.length;
    if (count === 0) return 0;
    return (totalScore / count).toFixed(1);
  };

  const isCreatingRef = useRef(false);

  const handleSave = async (
    currentCells: Record<string, string> = cells,
    currentDisabledCols = disabledCols,
    currentMaxScores = maxScores,
    isAutoSave = false,
  ) => {
    let missingFields = [];
    if (!schoolName) missingFields.push("اسم المدرسة");
    if (!branch) missingFields.push("الفرع");
    if (!teacherName) missingFields.push("اسم المعلم");
    if (!subject) missingFields.push("المادة");
    if (!selectedGrade) missingFields.push("الصف");
    if (!selectedSection) missingFields.push("الشعبة");
    if (!sheetName) missingFields.push("الفصل الدراسي");

    if (missingFields.length > 0) {
      if (!isAutoSave) toast.error(`الرجاء إكمال البيانات التالية قبل الحفظ: ${missingFields.join("، ")}`);
      return;
    }

    if (isCreatingRef.current) return;

    try {
      const payload: GradeSheet = {
        schoolName: schoolName || "",
        branch: branch || "",
        teacherName: teacherName || "",
        subject: subject || "",
        grade: selectedGrade || "",
        section: selectedSection || "",
        sheetName: sheetName || "",
        date: dateStr || "",
        months: months || [],
        cells: currentCells || {},
        userId: currentUser?.id || "unknown",
        timestamp: new Date().toISOString(),
        disabledCols: currentDisabledCols || [],
        maxScores: currentMaxScores || {},
      };

      const cleanPayload = JSON.parse(JSON.stringify(payload));

      isCreatingRef.current = !currentSheetId;
      try {
        const existing = currentSheetId
          ? await localDB.gradeSheets.get(currentSheetId)
          : null;
        const stamped = stampRecord(
          { ...cleanPayload, id: currentSheetId || undefined },
          { id: currentUser?.id, name: currentUser?.name },
          existing
        );
        await localDB.gradeSheets.put(stamped);
        setCurrentSheetId(stamped.id);
        if (!isAutoSave) toast.success("تم حفظ الكشف بنجاح");
        fetchData();
      } finally {
        isCreatingRef.current = false;
      }
    } catch (e) {
      console.error(e);
      isCreatingRef.current = false;
      if (!isAutoSave) toast.error("فشل حفظ الكشف");
    }
  };

  const handleNewSheet = () => {
    setCells({});
    setSheetName("");
    setCurrentSheetId(null);
    setDisabledCols([]);
    setMaxScores({ w_k: 20, oral: 10, attend: 10, written: 60, term_result: 20 });
  };

  const loadSheet = (sheet: GradeSheet) => {
    setSchoolName(sheet.schoolName || "");
    setBranch(sheet.branch || "");
    setTeacherName(sheet.teacherName || "");
    setSubject(sheet.subject || "");
    setSelectedGrade(sheet.grade || "");
    setTimeout(() => setSelectedSection(sheet.section || ""), 100);
    setSheetName(sheet.sheetName || "");
    setDateStr(sheet.date || "");
    setMonths(sheet.months || ["شهر الأول", "شهر الثاني", "شهر الثالث"]);
    setCells(sheet.cells || {});
    setDisabledCols(sheet.disabledCols || []);
    setMaxScores(sheet.maxScores || { w_k: 20, oral: 10, attend: 10, written: 60, term_result: 20 });
    setCurrentSheetId(sheet.id || null);
    setShowHistoryModal(false);
  };

  const handleDeleteSheet = async (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("هل أنت متأكد من حذف هذا الكشف؟")) {
      // Optimistic cache update
      setSheets((prev) => prev.filter((s) => s.id !== id));
      const cached = localStorage.getItem('cached_standalone_GradeSheets');
      if (cached) {
        try {
          const list = JSON.parse(cached).filter((s: any) => s.id !== id);
          localStorage.setItem('cached_standalone_GradeSheets', JSON.stringify(list));
        } catch (err) {
          console.error(err);
        }
      }

      try {
        await localDB.gradeSheets.delete(id);
        toast.success("تم حذف الكشف محلياً بنجاح.");
      } catch (err: any) {
        console.error(err);
        toast.error("فشل حذف الكشف");
      }
      if (currentSheetId === id) handleNewSheet();
    }
  };

  const exportTableToExcel = () => {
    const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const gregorianDate = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

    const htmlSnippet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <style>
        body { direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        table { border-collapse: collapse; direction: rtl; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; vertical-align: middle; white-space: nowrap; }
        .header-info { text-align: right; margin-bottom: 20px; font-weight: bold; }
      </style>
      </head>
      <body dir="rtl">
        <div class="header-info">
            <h2 style="text-align:center; font-size:24px; margin-bottom: 20px;">${sheetName || "كشف درجات بدون اسم"}</h2>
            <table style="border: none; width: 100%; margin-bottom: 20px;">
                <tr>
                    <td style="border: none; text-align: right; font-size: 16px;">
                        <div>المدرسة: <span>${schoolName || ".........."}</span></div>
                        <div>الفرع: <span>${branch || ".........."}</span></div>
                        <div>المعلم: <span>${teacherName || ".........."}</span></div>
                    </td>
                    <td style="border: none; text-align: center; font-size: 16px;">
                        <div>المادة: <span>${subject || ".........."}</span></div>
                        <div>الصف: <span>${selectedGrade || ".........."}</span></div>
                        <div>الشعبة: <span>${selectedSection || ".........."}</span></div>
                    </td>
                    <td style="border: none; text-align: left; font-size: 16px;">
                        <div>التاريخ الميلادي: <span>${gregorianDate}</span></div>
                        <div>التاريخ الهجري: <span>${hijriDate}</span></div>
                    </td>
                </tr>
            </table>
        </div>
        <table>
            <thead>
                <tr>
                   <th rowspan="2" style="background-color: #f59e0b; color: white;">م</th>
                   <th rowspan="2" style="background-color: #fef3c7; width: 250px;">اسم الطالب</th>
                   ${months.map((m, i) => (visibleMonths.includes(i) ? `<th colspan="6" style="background-color: ${i === 0 ? "#bfdbfe" : i === 1 ? "#fecdd3" : "#e9d5ff"}; font-size: 18px;">${m}</th>` : "")).join("")}
                   <th rowspan="2" style="background-color: #ffedd5;">
                        <div>المحصلة</div>
                        <div>القصوى: ${maxScores.term_result || 20}</div>
                   </th>
                   <th rowspan="2" style="background-color: #fed7aa; width: 100px;">اختبار فصلي</th>
                </tr>
                <tr>
                   ${months.map((m, mIdx) => (visibleMonths.includes(mIdx) ? monthCols.map((mc) => `<th style="background-color: ${mc.isTotal ? "#fde047" : mIdx === 0 ? "#dbeafe" : mIdx === 1 ? "#ffe4e6" : "#f3e8ff"};">${mc.label}<br><span style="font-size:10px;color:#64748b;">الحد: ${maxScores[mc.id] !== undefined ? maxScores[mc.id] : ""}</span></th>`).join("") : "")).join("")}
                </tr>
            </thead>
            <tbody>
                ${displayedStudents.map((s, sIdx) => {
                  let rowHtml = `<tr>`;
                  rowHtml += `<td style="background-color: #fffbeb;">${sIdx + 1}</td>`;
                  rowHtml += `<td style="background-color: #f8fafc; text-align: right; font-weight: bold;">${s.name}</td>`;

                  months.forEach((m, mIdx) => {
                    if (visibleMonths.includes(mIdx)) {
                      monthCols.forEach((mc) => {
                        const val = cells[`${s.id}-m${mIdx}-${mc.id}`] || "";
                        rowHtml += `<td style="${mc.isTotal ? "background-color:#fef08a; font-weight:bold;" : ""}">${val}</td>`;
                      });
                    }
                  });

                  const termResult = cells[`${s.id}-final-term_result`] || "";
                  rowHtml += `<td style="background-color:#fff7ed; font-weight:bold; color: #7c2d12;">${termResult}</td>`;

                  const termExam = cells[`${s.id}-final-term_exam`] || "";
                  rowHtml += `<td style="background-color:#ffedd5; font-weight:bold; color: #7c2d12;">${termExam}</td>`;

                  rowHtml += `</tr>`;
                  return rowHtml;
                }).join("")}
                <tr style="background-color: #f1f5f9; font-weight: bold;">
                    <td colspan="2" style="background-color: #e2e8f0;">الإجمالي / النسبة</td>
                    ${months.map((m, mIdx) => {
                      if (visibleMonths.includes(mIdx)) {
                        return monthCols.map((mc) => {
                          const colKeyStr = `m${mIdx}-${mc.id}`;
                          const total = calculateColumnTotal(colKeyStr);
                          const ratio = calculateColumnRatio(colKeyStr);
                          return `<td><div>${Number(total) > 0 ? total : ""}</div><div style="color: #047857;">${Number(ratio) > 0 ? `%${ratio}` : ""}</div></td>`;
                        }).join("");
                      }
                      return "";
                    }).join("")}
                    <td style="background-color: #e2e8f0;"></td>
                    <td style="background-color: #e2e8f0;"></td>
                </tr>
            </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlSnippet], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `كشف_درجات_${sheetName || "جديد"}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [selectedCombineSheets, setSelectedCombineSheets] = useState<string[]>([]);

  const handleCombine = () => {
    if (selectedCombineSheets.length < 2) {
      toast.error("الرجاء اختيار كشفين على الأقل للجمع");
      return;
    }

    let combinedCells: Record<string, string> = {};
    const sheetsToCombine = sheets.filter((s) => selectedCombineSheets.includes(s.id || ""));

    sheetsToCombine.forEach((s) => {
      Object.keys(s.cells).forEach((k) => {
        const existVal = parseFloat(combinedCells[k]) || 0;
        const newVal = parseFloat(s.cells[k]) || 0;
        if (!isNaN(parseFloat(s.cells[k]))) {
          combinedCells[k] = (existVal + newVal).toString();
        } else {
          if (s.cells[k]) combinedCells[k] = s.cells[k];
        }
      });
    });

    setCells(combinedCells);
    setSheetName("كشف إجمالي");
    setCurrentSheetId(null);
    setShowCombineModal(false);
  };


  // -------------------------------------------------------------
  // MODE 2: STUDENT GRADE SHEET (كشف درجات طالب)
  // -------------------------------------------------------------
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("الفصل الأول");
  const [studentSheetName, setStudentSheetName] = useState("الشهر الأول");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [studentCells, setStudentCells] = useState<Record<string, string>>({});
  
  const [activeStudentRowSubject, setActiveStudentRowSubject] = useState<string | null>(null);
  const [activeStudentColField, setActiveStudentColField] = useState<string | null>(null);

  // Filter student list by parameters
  const studentViewStudentsList = useMemo(() => {
    let filtered = (data.secretariatStudents || []) as any[];
    if (schoolName) filtered = filtered.filter((s) => s.school === schoolName);
    if (branch) filtered = filtered.filter((s) => s.branch === branch);
    if (selectedGrades.length > 0) {
      filtered = filtered.filter((s) => selectedGrades.includes(s.grade));
    }
    if (selectedSections.length > 0) {
      filtered = filtered.filter((s) => selectedSections.includes(s.section));
    }
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  }, [data.secretariatStudents, schoolName, branch, selectedGrades, selectedSections]);

  const activeStudentInfo = useMemo(() => {
    return studentViewStudentsList.find(s => s.id === selectedStudentId);
  }, [studentViewStudentsList, selectedStudentId]);

  const activeStudentSubjectsList = useMemo(() => {
    if (!activeStudentInfo) return [];
    return getSubjectsForStudent(activeStudentInfo.grade);
  }, [activeStudentInfo]);

  // Load student cells on key parameter changes
  useEffect(() => {
    if (selectedStudentId && studentSheetName && selectedTerm) {
      const match = studentSheets.find(s => 
        s.studentId === selectedStudentId && 
        s.term === selectedTerm && 
        s.sheetName === studentSheetName
      );
      if (match) {
        setStudentCells(match.cells || {});
      } else {
        setStudentCells({});
      }
    } else {
      setStudentCells({});
    }
  }, [selectedStudentId, studentSheetName, selectedTerm, studentSheets]);

  const handleStudentCellChange = (subjectName: string, colId: string, val: string) => {
    let finalVal = val;
    const maxVal = colId === "w_k" ? 20 : colId === "written" ? 60 : 10;
    if (finalVal.trim() !== "") {
      const numVal = parseFloat(finalVal);
      if (!isNaN(numVal) && numVal > maxVal) {
        finalVal = maxVal.toString();
      }
    }

    const newCells = { ...studentCells, [`${subjectName}-${colId}`]: finalVal };
    
    // Auto compute total and ratio
    const wk = parseFloat(newCells[`${subjectName}-w_k`] || "0") || 0;
    const oral = parseFloat(newCells[`${subjectName}-oral`] || "0") || 0;
    const attend = parseFloat(newCells[`${subjectName}-attend`] || "0") || 0;
    const written = parseFloat(newCells[`${subjectName}-written`] || "0") || 0;
    const total = wk + oral + attend + written;
    
    newCells[`${subjectName}-total_m`] = total.toString();
    newCells[`${subjectName}-ratio_m`] = total.toString() + "%";

    setStudentCells(newCells);
    triggerStudentAutoSave(newCells);
  };

  const triggerStudentAutoSave = (newCells: Record<string, string>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveStudentSheet(newCells, true);
    }, 1500);
  };

  const handleSaveStudentSheet = async (currentCells: Record<string, string> = studentCells, isAutoSave = false) => {
    if (!selectedStudentId || !activeStudentInfo) {
      if (!isAutoSave) toast.error("الرجاء اختيار الطالب أولاً");
      return;
    }
    
    const stableId = `${selectedStudentId}_${selectedTerm}_${studentSheetName.replace(/\s+/g, "_")}`;
    const payload: StudentGradeSheetDoc = {
      id: stableId,
      schoolName: schoolName || "",
      branch: branch || "",
      academicYear: localStorage.getItem('selected_year') || "2024-2025",
      term: selectedTerm,
      grade: activeStudentInfo.grade,
      section: activeStudentInfo.section,
      sheetName: studentSheetName,
      studentId: selectedStudentId,
      studentName: activeStudentInfo.name,
      cells: currentCells,
      userId: currentUser?.id || "unknown",
      timestamp: new Date().toISOString()
    };

      try {
        const existing = payload.id
          ? await localDB.studentGradeSheets.get(payload.id)
          : null;
        const stamped = stampRecord(
          payload,
          { id: currentUser?.id, name: currentUser?.name },
          existing
        );
        await localDB.studentGradeSheets.put(stamped);
        if (!isAutoSave) toast.success("تم حفظ كشف درجات الطالب بنجاح");
      } catch (e: any) {
        console.error(e);
        if (!isAutoSave) toast.error("فشل حفظ كشف الطالب");
      }
      fetchData();
  };

  // Student sync helpers
  const getStudentSynchronizedScore = (subjectName: string, field: string) => {
    if (displayMode === "exam_only" && field !== "written") {
      return ""; // Don't sync other fields in exam only mode
    }
    
    const cleanSubject = (s: string) => s.replace(/\s+/g, "").replace(/ال/g, "");
    const targetSubClean = cleanSubject(subjectName);
    
    const matchedSheets = sheets.filter(s => 
      s.schoolName === schoolName &&
      s.branch === branch &&
      s.grade === activeStudentInfo?.grade &&
      s.section === activeStudentInfo?.section &&
      cleanSubject(s.subject) === targetSubClean &&
      findMonthIndex(s.months || [], studentSheetName) !== -1
    );
    
    if (matchedSheets.length === 0) return null;
    
    const matchedSheet = matchedSheets.sort((a, b) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    )[0];
    
    const mIdx = findMonthIndex(matchedSheet.months || [], studentSheetName);
    const val = matchedSheet.cells[`${selectedStudentId}-m${mIdx}-${field}`];
    return val !== undefined && val.trim() !== "" ? val : null;
  };

  const getStudentCellDisplayValue = (subName: string, colId: string) => {
    const manualVal = studentCells[`${subName}-${colId}`];
    if (manualVal !== undefined && manualVal !== "") {
      return manualVal;
    }
    return getStudentSynchronizedScore(subName, colId) ?? "";
  };

  const getStudentRowTotal = (subName: string) => {
    const wk = parseFloat(getStudentCellDisplayValue(subName, "w_k")) || 0;
    const oral = parseFloat(getStudentCellDisplayValue(subName, "oral")) || 0;
    const attend = parseFloat(getStudentCellDisplayValue(subName, "attend")) || 0;
    const written = parseFloat(getStudentCellDisplayValue(subName, "written")) || 0;
    return wk + oral + attend + written;
  };

  const getStudentRowPercentage = (subName: string) => {
    const total = getStudentRowTotal(subName);
    const maxVal = displayMode === "exam_only" ? 60 : 100;
    return Math.round((total / maxVal) * 100).toString() + "%";
  };

  const calculateStudentColTotal = (colId: string) => {
    let tot = 0;
    activeStudentSubjectsList.forEach(sub => {
      if (colId === "total_m") {
        tot += getStudentRowTotal(sub);
      } else {
        tot += parseFloat(getStudentCellDisplayValue(sub, colId)) || 0;
      }
    });
    return tot;
  };

  const calculateStudentColAverage = (colId: string) => {
    const total = calculateStudentColTotal(colId);
    if (activeStudentSubjectsList.length === 0) return "0";
    return (total / activeStudentSubjectsList.length).toFixed(1);
  };

  const calculateStudentColAveragePercentage = (colId: string) => {
    const total = calculateStudentColTotal(colId);
    if (activeStudentSubjectsList.length === 0) return 0;
    const maxVal = colId === "w_k" ? 20 : colId === "written" ? 60 : colId === "total_m" ? (displayMode === "exam_only" ? 60 : 100) : 10;
    const average = total / activeStudentSubjectsList.length;
    return Math.round((average / maxVal) * 100);
  };

  const exportStudentToExcel = (student: any, subjectsList: string[]) => {
    const title = `كشف درجات الطالب - ${student.name}`;
    
    let htmlSnippet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <style>
        body { direction: rtl; font-family: 'Segoe UI', sans-serif; }
        table { border-collapse: collapse; width: 100%; direction: rtl; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
        th { background-color: #f1f5f9; font-weight: bold; }
      </style>
      </head>
      <body dir="rtl">
        <h2 style="text-align:center;">${title}</h2>
        <p style="text-align:right;">المدرسة: ${schoolName} | الفرع: ${branch} | الفصل: ${selectedTerm} | الشهر: ${studentSheetName}</p>
        <table>
          <thead>
            <tr>
              <th>م</th>
              <th>المادة</th>
              <th>الواجب (20)</th>
              <th>شفوي (10)</th>
              <th>مواظبة (10)</th>
              <th>تحريري (60)</th>
              <th>المجموع (${displayMode === "exam_only" ? "60" : "100"})</th>
              <th>النسبة</th>
            </tr>
          </thead>
          <tbody>
            ${subjectsList.map((sub, idx) => {
              const wk = parseFloat(getStudentCellDisplayValue(sub, "w_k")) || 0;
              const oral = parseFloat(getStudentCellDisplayValue(sub, "oral")) || 0;
              const attend = parseFloat(getStudentCellDisplayValue(sub, "attend")) || 0;
              const written = parseFloat(getStudentCellDisplayValue(sub, "written")) || 0;
              const total = wk + oral + attend + written;
              const maxVal = displayMode === "exam_only" ? 60 : 100;
              const ratio = Math.round((total / maxVal) * 100);
              const serialNum = (student.grade === "11" || student.grade === "12") ? (idx + 13) : (idx + 1);
              return `
                <tr>
                  <td>${serialNum}</td>
                  <td style="text-align:right;">${sub}</td>
                  <td>${getStudentCellDisplayValue(sub, "w_k") || ""}</td>
                  <td>${getStudentCellDisplayValue(sub, "oral") || ""}</td>
                  <td>${getStudentCellDisplayValue(sub, "attend") || ""}</td>
                  <td>${getStudentCellDisplayValue(sub, "written") || ""}</td>
                  <td>${total}</td>
                  <td>${ratio}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlSnippet], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // -------------------------------------------------------------
  // MODE 3: ALL SUBJECTS GRADE SHEET (كشف درجات جميع المواد)
  // -------------------------------------------------------------
  const [allSubjectsSheetName, setAllSubjectsSheetName] = useState("الشهر الأول");
  const [activeTab, setActiveTab] = useState(""); // Format: "grade-section" (e.g. "5-أ")
  const [allSubjectsCells, setAllSubjectsCells] = useState<Record<string, string>>({});
  
  const [activeAllSubjectsRowStudentId, setActiveAllSubjectsRowStudentId] = useState<string | null>(null);
  const [activeAllSubjectsColSubject, setActiveAllSubjectsColSubject] = useState<string | null>(null);
  const [showAllSubjectsHistoryModal, setShowAllSubjectsHistoryModal] = useState(false);

  // Generate tab combinations dynamically
  const activeTabsList = useMemo(() => {
    const tabs: { grade: string; section: string; label: string; key: string }[] = [];
    selectedGrades.forEach(g => {
      selectedSections.forEach(s => {
        tabs.push({
          grade: g,
          section: s,
          label: `الصف ${g} - شعبة ${s}`,
          key: `${g}-${s}`
        });
      });
    });
    return tabs;
  }, [selectedGrades, selectedSections]);

  // Set active tab automatically if empty
  useEffect(() => {
    if (activeTabsList.length > 0) {
      if (!activeTab || !activeTabsList.find(t => t.key === activeTab)) {
        setActiveTab(activeTabsList[0].key);
      }
    } else {
      setActiveTab("");
    }
  }, [activeTabsList, activeTab]);

  const activeTabDetails = useMemo(() => {
    if (!activeTab) return null;
    const [grade, section] = activeTab.split("-");
    return { grade, section };
  }, [activeTab]);

  const allSubjectsStudentsList = useMemo(() => {
    if (!activeTabDetails) return [];
    let filtered = (data.secretariatStudents || []) as any[];
    if (schoolName) filtered = filtered.filter((s) => s.school === schoolName);
    if (branch) filtered = filtered.filter((s) => s.branch === branch);
    filtered = filtered.filter((s) => s.grade === activeTabDetails.grade && s.section === activeTabDetails.section);
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  }, [data.secretariatStudents, schoolName, branch, activeTabDetails]);

  const activeAllSubjectsList = useMemo(() => {
    if (!activeTabDetails) return [];
    return getSubjectsForAllTable(activeTabDetails.grade);
  }, [activeTabDetails]);

  // Load All Subjects cells on tab or criteria change
  useEffect(() => {
    if (activeTabDetails && allSubjectsSheetName && selectedTerm) {
      const { grade, section } = activeTabDetails;
      const match = allSubjectsSheets.find(s => 
        s.grade === grade && 
        s.section === section && 
        s.term === selectedTerm && 
        s.sheetName === allSubjectsSheetName
      );
      if (match) {
        setAllSubjectsCells(match.cells || {});
      } else {
        setAllSubjectsCells({});
      }
    } else {
      setAllSubjectsCells({});
    }
  }, [activeTabDetails, allSubjectsSheetName, selectedTerm, allSubjectsSheets]);

  const handleAllSubjectsCellChange = (studentId: string, subjectName: string, val: string) => {
    let finalVal = val;
    if (finalVal.trim() !== "") {
      const numVal = parseFloat(finalVal);
      if (!isNaN(numVal) && numVal > 60) {
        finalVal = "60";
      }
    }

    const newCells = { ...allSubjectsCells, [`${studentId}-${subjectName}`]: finalVal };
    setAllSubjectsCells(newCells);
    triggerAllSubjectsAutoSave(newCells);
  };

  const triggerAllSubjectsAutoSave = (newCells: Record<string, string>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveAllSubjectsSheet(newCells, true);
    }, 1500);
  };

  const handleSaveAllSubjectsSheet = async (currentCells: Record<string, string> = allSubjectsCells, isAutoSave = false) => {
    if (!activeTabDetails) {
      if (!isAutoSave) toast.error("الرجاء اختيار الصف والشعبة أولاً");
      return;
    }
    
    const { grade, section } = activeTabDetails;
    const stableId = `${schoolName}_${branch}_${grade}_${section}_${selectedTerm}_${allSubjectsSheetName.replace(/\s+/g, "_")}`;

    const payload: AllSubjectsGradeSheetDoc = {
      id: stableId,
      schoolName: schoolName || "",
      branch: branch || "",
      academicYear: localStorage.getItem('selected_year') || "2024-2025",
      term: selectedTerm,
      grade,
      section,
      sheetName: allSubjectsSheetName,
      cells: currentCells,
      userId: currentUser?.id || "unknown",
      timestamp: new Date().toISOString()
    };

      try {
        const existing = payload.id
          ? await localDB.allSubjectsGradeSheets.get(payload.id)
          : null;
        const stamped = stampRecord(
          payload,
          { id: currentUser?.id, name: currentUser?.name },
          existing
        );
        await localDB.allSubjectsGradeSheets.put(stamped);
        if (!isAutoSave) toast.success("تم حفظ كشف جميع المواد بنجاح");
      } catch (e: any) {
        console.error(e);
        if (!isAutoSave) toast.error("فشل حفظ كشف جميع المواد");
      }
      fetchData();
  };

  // All subjects sync helpers
  const getAllSubjectsSynchronizedScore = (studentId: string, subjectName: string) => {
    const cleanSubject = (s: string) => s.replace(/\s+/g, "").replace(/ال/g, "");
    const targetSubClean = cleanSubject(subjectName);
    
    const matchedSheets = sheets.filter(s => 
      s.schoolName === schoolName &&
      s.branch === branch &&
      s.grade === activeTabDetails?.grade &&
      s.section === activeTabDetails?.section &&
      cleanSubject(s.subject) === targetSubClean &&
      findMonthIndex(s.months || [], allSubjectsSheetName) !== -1
    );
    
    if (matchedSheets.length === 0) return null;
    
    const matchedSheet = matchedSheets.sort((a, b) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    )[0];
    
    const mIdx = findMonthIndex(matchedSheet.months || [], allSubjectsSheetName);
    
    if (displayMode === "exam_only") {
      const val = matchedSheet.cells[`${studentId}-m${mIdx}-written`];
      return val !== undefined && val.trim() !== "" ? val : null;
    } else {
      const val = matchedSheet.cells[`${studentId}-m${mIdx}-total_m`];
      return val !== undefined && val.trim() !== "" ? val : null;
    }
  };

  const getAllSubjectsCellDisplayValue = (studentId: string, subjectName: string) => {
    const manualVal = allSubjectsCells[`${studentId}-${subjectName}`];
    if (manualVal !== undefined && manualVal !== "") {
      return manualVal;
    }
    return getAllSubjectsSynchronizedScore(studentId, subjectName) ?? "";
  };

  // Calculations for all subjects summaries
  const calculateAllSubjectsColTotal = (subjectName: string) => {
    let tot = 0;
    allSubjectsStudentsList.forEach(s => {
      tot += parseFloat(getAllSubjectsCellDisplayValue(s.id, subjectName) || "0") || 0;
    });
    return tot;
  };

  const calculateAllSubjectsColAverage = (subjectName: string) => {
    const total = calculateAllSubjectsColTotal(subjectName);
    if (allSubjectsStudentsList.length === 0) return "0";
    const maxVal = displayMode === "exam_only" ? 60 : 100;
    return (total / (allSubjectsStudentsList.length * maxVal) * 100).toFixed(1);
  };

  const exportAllSubjectsToExcel = (grade: string, section: string, studentsList: any[], subjectsList: string[]) => {
    const title = `كشف درجات جميع المواد - الصف ${grade} (${section})`;
    
    let htmlSnippet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <style>
        body { direction: rtl; font-family: 'Segoe UI', sans-serif; }
        table { border-collapse: collapse; width: 100%; direction: rtl; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
        th { background-color: #f1f5f9; font-weight: bold; }
      </style>
      </head>
      <body dir="rtl">
        <h2 style="text-align:center;">${title}</h2>
        <p style="text-align:right;">المدرسة: ${schoolName} | الفرع: ${branch} | الفصل: ${selectedTerm} | الشهر: ${allSubjectsSheetName}</p>
        <table>
          <thead>
            <tr>
              <th>م</th>
              <th>اسم الطالب</th>
              ${subjectsList.map(sub => `<th>${sub}</th>`).join("")}
              <th>المجموع</th>
              <th>النسبة</th>
            </tr>
          </thead>
          <tbody>
            ${studentsList.map((s, idx) => {
              const rowSum = subjectsList.reduce((acc, sub) => acc + (parseFloat(getAllSubjectsCellDisplayValue(s.id, sub)) || 0), 0);
              const maxPossible = subjectsList.length * (displayMode === "exam_only" ? 60 : 100);
              const pct = maxPossible > 0 ? ((rowSum / maxPossible) * 100).toFixed(1) + "%" : "0%";
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="text-align:right;">${s.name}</td>
                  ${subjectsList.map(sub => `<td>${getAllSubjectsCellDisplayValue(s.id, sub) || ""}</td>`).join("")}
                  <td>${rowSum}</td>
                  <td>${pct}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlSnippet], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // -------------------------------------------------------------
  // GENERAL RENDER BLOCKS
  // -------------------------------------------------------------
  
  const renderMenu = () => {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-12 font-arabic animate-fade-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8 font-bold"
        >
          <ChevronLeft size={20} /> لوحة المعلم
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">كشوف درجات الطلاب</h1>
          <p className="text-slate-500 font-bold mt-3 text-lg">اختر نوع الكشف الذي ترغب في رصده وإدارته</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Button 1: Subject Grade Sheet */}
          <button
            onClick={() => { setMode("subject"); handleNewSheet(); }}
            className="bg-white border-2 border-blue-100 hover:border-blue-500 text-slate-800 p-8 rounded-[2rem] shadow-xl hover:shadow-blue-100 flex flex-col items-center justify-center transition-all duration-300 transform hover:-translate-y-2 group text-center"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <ClipboardList size={40} className="text-blue-600 transition-colors duration-300 group-hover:text-white" />
            </div>
            <span className="text-2xl font-black text-slate-800">كشف درجات مادة</span>
            <p className="text-slate-400 font-bold text-xs mt-3">رصد درجات الطلاب لمادة دراسية واحدة محددة بكافة بنود التقييم</p>
          </button>

          {/* Button 2: Student Grade Sheet */}
          <button
            onClick={() => setMode("student")}
            className="bg-white border-2 border-emerald-100 hover:border-emerald-500 text-slate-800 p-8 rounded-[2rem] shadow-xl hover:shadow-emerald-100 flex flex-col items-center justify-center transition-all duration-300 transform hover:-translate-y-2 group text-center"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <User size={40} className="text-emerald-600 transition-colors duration-300 group-hover:text-white" />
            </div>
            <span className="text-2xl font-black text-slate-800">كشف درجات طالب</span>
            <p className="text-slate-400 font-bold text-xs mt-3">عرض وإدخال درجات طالب واحد لكافة المواد الدراسية في صفه</p>
          </button>

          {/* Button 3: All Subjects Grade Sheet */}
          <button
            onClick={() => setMode("all_subjects")}
            className="bg-white border-2 border-amber-100 hover:border-amber-500 text-slate-800 p-8 rounded-[2rem] shadow-xl hover:shadow-amber-100 flex flex-col items-center justify-center transition-all duration-300 transform hover:-translate-y-2 group text-center"
          >
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
              <FileSpreadsheet size={40} className="text-amber-600 transition-colors duration-300 group-hover:text-white" />
            </div>
            <span className="text-2xl font-black text-slate-800">كشف درجات جميع المواد</span>
            <p className="text-slate-400 font-bold text-xs mt-3">رصد درجات الصف لشهر محدد متضمناً كافة المواد وعمليات الحساب التلقائية</p>
          </button>
        </div>
      </div>
    );
  };

  const renderSubjectGradeSheet = () => {
    return (
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-arabic animate-fade-in relative z-10 pb-20">
        <button
          onClick={() => setMode("menu")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold"
        >
          <ChevronLeft size={20} /> العودة للقائمة الرئيسية
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800">كشف درجات مادة</h1>
            <p className="text-slate-500 font-bold mt-2">إعداد وإدارة كشوف المتابعة والدرجات للمواد الدراسية</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-2 md:px-4 md:py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
            >
              <History size={18} /> الكشوفات السابقة
            </button>
            <button
              onClick={() => handleSave()}
              className="px-3 py-2 md:px-4 md:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
            >
              <Save size={18} /> حفظ الكشف
            </button>
            <button
              onClick={handleNewSheet}
              className="px-3 py-2 md:px-4 md:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus size={18} /> جدول جديد
            </button>
            <button
              onClick={() => setShowCombineModal(true)}
              className="px-3 py-2 md:px-4 md:py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
            >
              <Combine size={18} /> جمع الجداول
            </button>
            <button
              onClick={exportTableToExcel}
              className="px-3 py-2 md:px-4 md:py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
            >
              <Download size={18} /> تصدير اكسل
            </button>
          </div>
        </div>

        {/* Attributes Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم المدرسة</label>
            <select
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار المدرسة...</option>
              {allowedSchools.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار الفرع...</option>
              {allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم المعلم</label>
            <select
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار المعلم...</option>
              {allowedTeachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">المادة</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار المادة...</option>
              {allowedSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الصف</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار الصف...</option>
              {allowedGrades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الشعبة</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار الشعبة...</option>
              {allowedSections.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الفصل الدراسي</label>
            <select
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار الفصل الدراسي...</option>
              <option value="الفصل الأول">الفصل الأول</option>
              <option value="الفصل الثاني">الفصل الثاني</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">التاريخ</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Performance Indicators & Visible Months */}
        <div className="bg-blue-50 p-4 rounded-2xl mb-6 flex flex-wrap gap-4 items-center">
          <button
            onClick={() => setShowIndicatorModal(true)}
            className={`flex items-center gap-2 border px-4 py-2 rounded-xl font-bold text-sm transition-colors ${indicatorConfig.level ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-900 border-blue-200 hover:bg-blue-100"}`}
          >
            <TrendingUp size={18} /> مؤشرات الأداء
          </button>
          <button
            onClick={() => setShowVisibleMonthsModal(true)}
            className="flex items-center gap-2 bg-white text-slate-800 border-slate-200 border hover:bg-slate-50 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
          >
            <FileSpreadsheet size={18} /> الأشهر الظاهرة
          </button>
        </div>

        {/* The Spreadsheet-like grid */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto relative min-h-[400px]">
          {selectedGrade && selectedSection ? (
            <table id="grade-sheet-table" className="w-full text-center text-sm border-collapse min-w-[1200px]">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-slate-200 bg-amber-500 text-white w-12 font-black">م</th>
                  <th rowSpan={2} className="border border-slate-200 bg-amber-50 w-48 text-slate-800 font-black p-2 min-w-[150px]">اسم الطالب</th>
                  {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                    <th key={mIdx} colSpan={6} className={`border border-slate-300 font-black text-slate-800 p-2 text-lg ${mIdx === 0 ? "bg-blue-200" : mIdx === 1 ? "bg-rose-200" : "bg-purple-200"}`}>
                      <input
                        className="bg-transparent text-center font-black w-full outline-none placeholder-slate-500"
                        value={m}
                        onChange={(e) => {
                          const nm = [...months];
                          nm[mIdx] = e.target.value;
                          setMonths(nm);
                        }}
                      />
                    </th>
                  ))}
                  <th rowSpan={2} className="border border-slate-300 bg-orange-100 p-2 w-24 align-top">
                    <div className="flex flex-col items-center justify-center gap-2 h-full">
                      <span>المحصلة الفصلية</span>
                      <input
                        type="number"
                        value={maxScores.term_result || 20}
                        onChange={(e) => canEditData && setMaxScores({ ...maxScores, term_result: parseFloat(e.target.value) })}
                        disabled={!canEditData}
                        className="w-12 h-6 text-center border border-slate-300 bg-white rounded outline-none text-xs text-orange-800"
                      />
                    </div>
                  </th>
                  <th rowSpan={2} className="border border-slate-300 bg-orange-200 p-2 w-24">اختبار فصلي</th>
                </tr>
                <tr>
                  {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                    <React.Fragment key={"sub-" + mIdx}>
                      {monthCols.map((mc, mcIdx) => {
                        const colKeyStr = `m${mIdx}-${mc.id}`;
                        const isDisabled = disabledCols.includes(colKeyStr);
                        return (
                          <th key={`head-${mIdx}-${mc.id}`} className={`border border-slate-300 p-2 font-bold text-xs ${mc.isTotal ? "bg-yellow-300 text-black shadow-inner shadow-yellow-500/50" : mIdx === 0 ? "bg-blue-100" : mIdx === 1 ? "bg-rose-100" : "bg-purple-100"}`}>
                            <div className="flex flex-col items-center justify-between w-full min-h-[6rem] py-1">
                              <span className="whitespace-normal leading-tight text-center break-words max-w-[70px] flex-grow flex items-center">{mc.label}</span>
                              {!mc.isTotal && (
                                <div className="flex flex-col items-center gap-1 mt-1 justify-center w-full">
                                  <div className="flex items-center justify-center gap-1 w-full bg-white/50 p-1 rounded">
                                    <button
                                      disabled={!canEditData}
                                      onClick={() => handleColToggle(colKeyStr)}
                                      className={`p-1 rounded transition-colors shrink-0 ${isDisabled ? "text-red-500 bg-red-100" : "text-green-500 bg-green-100"}`}
                                    >
                                      <Star size={14} fill={isDisabled ? "currentColor" : "none"} />
                                    </button>
                                    <input
                                      type="text"
                                      value={bulkFill[colKeyStr] || ""}
                                      onChange={(e) => setBulkFill({ ...bulkFill, [colKeyStr]: e.target.value })}
                                      disabled={!canEditData || isDisabled}
                                      placeholder="الكل"
                                      className="w-8 h-6 text-center text-[10px] border border-slate-300 rounded outline-blue-500 bg-white"
                                    />
                                    <button
                                      disabled={!canEditData || isDisabled}
                                      onClick={() => handleBulkFill(colKeyStr)}
                                      className="p-1 rounded text-white bg-blue-500"
                                    >
                                      <Check size={12} />
                                    </button>
                                  </div>
                                  <div className="text-[10px] shrink-0 mt-2 flex flex-col items-center">
                                    <span className="text-[9px] text-slate-500 mb-0.5">الحد الأقصى</span>
                                    <input
                                      type="number"
                                      value={maxScores[mc.id] !== undefined ? maxScores[mc.id] : ""}
                                      onChange={(e) => canEditData && setMaxScores({ ...maxScores, [mc.id]: parseFloat(e.target.value) })}
                                      disabled={!canEditData}
                                      className="w-[3rem] h-6 text-center border border-slate-400 bg-white rounded outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedStudents.map((s, sIdx) => {
                  const isRowSelected = highlightedRows.includes(s.id);
                  const toggleRow = () => {
                    setHighlightedRows(isRowSelected ? highlightedRows.filter((id) => id !== s.id) : [...highlightedRows, s.id]);
                  };
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 ${isRowSelected ? "ring-2 ring-black bg-white" : ""}`}>
                      <td className="border border-slate-200 p-1 font-bold bg-amber-50">{sIdx + 1}</td>
                      <td className="border border-slate-200 p-2 font-bold text-right cursor-pointer hover:bg-amber-100" onClick={toggleRow}>{s.name}</td>
                      {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                        <React.Fragment key={"r-" + s.id + "-" + mIdx}>
                          {monthCols.map((mc, mcIdx) => {
                            const colKeyStr = `m${mIdx}-${mc.id}`;
                            const cellKey = `${s.id}-${colKeyStr}`;
                            const val = cells[cellKey] || "";
                            const isEmpty = val.trim() === "";
                            const numVal = parseFloat(val);
                            const cIndex = mIdx * monthCols.length + mcIdx;
                            const isColSelected = selectedColIndex === cIndex && !isRowSelected;
                            const isDisabled = disabledCols.includes(colKeyStr);
                            const maxVal = maxScores[mc.id];
                            const isFailingField = !mc.isTotal && !isNaN(numVal) && mc.id !== "ratio_m" && maxVal && numVal < maxVal / 2;

                            return (
                              <td key={cellKey} onMouseEnter={() => setSelectedColIndex(cIndex)} className={`border border-slate-300 p-0 transition-colors ${isColSelected ? "bg-cyan-100" : ""} ${mc.isTotal ? "bg-yellow-100 font-bold" : ""} ${isDisabled ? "bg-red-50 opacity-80" : ""} ${isFailingField ? "!bg-orange-500/20" : ""} ${!mc.isTotal && isEmpty && !isDisabled && !isRowSelected ? "bg-yellow-500/10" : ""}`}>
                                <input
                                  type="text"
                                  onFocus={(e) => e.target.select()}
                                  className="w-full h-full p-2 text-center bg-transparent outline-blue-500 font-bold max-w-[50px] md:max-w-[80px]"
                                  value={val}
                                  readOnly={mc.isTotal || isDisabled}
                                  onChange={(e) => handleCellChange(s.id, colKeyStr, e.target.value)}
                                />
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      {finalCols.map((fc, fcIdx) => {
                        const colKeyStr = `final-${fc.id}`;
                        const cellKey = `${s.id}-${colKeyStr}`;
                        const val = cells[cellKey] || "";
                        const valNum = parseFloat(val) || 0;
                        const isTermResult = fc.id === "term_result";
                        const maxVal = isTermResult ? maxScores.term_result || 20 : maxScores.term_exam || 0;
                        const isFailing = !isNaN(valNum) && maxVal > 0 && valNum < maxVal / 2;
                        const cIndex = months.length * monthCols.length + fcIdx;
                        const isColSelected = selectedColIndex === cIndex && !isRowSelected;

                        return (
                          <td key={cellKey} onMouseEnter={() => setSelectedColIndex(cIndex)} className={`border border-slate-300 p-0 ${isColSelected ? "bg-cyan-100" : "bg-orange-50/50"} ${isFailing ? "!bg-orange-500/20" : ""}`}>
                            <input
                              type="text"
                              onFocus={(e) => !isTermResult && e.target.select()}
                              readOnly={isTermResult}
                              className="w-full h-full p-2 text-center bg-transparent outline-blue-500 font-bold max-w-[50px] md:max-w-[80px]"
                              value={val}
                              onChange={(e) => handleCellChange(s.id, colKeyStr, e.target.value)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {displayedStudents.length > 0 && (
                  <tr className="bg-slate-100 font-black">
                    <td colSpan={2} className="border border-slate-300 p-2 text-left bg-slate-200">الإجمالي / النسبة</td>
                    {months.map((m, mIdx) => visibleMonths.includes(mIdx) && (
                      <React.Fragment key={"tot-" + mIdx}>
                        {monthCols.map((mc) => {
                          const colKeyStr = `m${mIdx}-${mc.id}`;
                          const total = calculateColumnTotal(colKeyStr);
                          const ratio = calculateColumnRatio(colKeyStr);
                          return (
                            <td key={colKeyStr} className="border border-slate-300 p-1 text-xs text-center text-slate-700">
                              <div className="text-blue-700 border-b border-slate-300/50 mb-1 pb-1">{Number(total) > 0 ? total : ""}</div>
                              <div className="text-emerald-700">{Number(ratio) > 0 ? `%${ratio}` : ""}</div>
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {finalCols.map((fc) => {
                      const colKeyStr = `final-${fc.id}`;
                      const total = calculateColumnTotal(colKeyStr);
                      const ratio = calculateColumnRatio(colKeyStr);
                      return (
                        <td key={colKeyStr} className="border border-slate-300 p-1 text-xs text-center text-slate-700 bg-orange-100/50">
                          <div className="text-orange-700 border-b border-orange-200 mb-1 pb-1">{Number(total) > 0 ? total : ""}</div>
                          <div>{Number(ratio) > 0 ? `%${ratio}` : ""}</div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <AlertCircle size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-lg mb-2">يرجى اختيار الصف والشعبة لعرض أسماء الطلاب</p>
              <p>سيتم جلب الأسماء مسجلة في شؤون الطلاب تلقائياً</p>
            </div>
          )}
        </div>

        {/* Signatures Section */}
        {selectedGrade && selectedSection && (
          <div className="mt-8 px-8 flex justify-between items-center font-bold text-slate-800 pb-10 max-w-[1200px] mx-auto">
            <div className="text-center w-48">
              <p className="text-lg">معلم المادة</p>
              <p className="mt-4 text-blue-800 text-xl border-b-2 border-dashed border-slate-300 pb-1 inline-block min-w-[200px]">
                {currentUser?.name || "........................"}
              </p>
            </div>
            <div className="text-center w-48">
              <p className="text-lg">مدير المدرسة</p>
              <p className="mt-4 border-b-2 border-dashed border-slate-300 pb-1 inline-block min-w-[200px] h-8 text-xl text-slate-400">........................</p>
            </div>
          </div>
        )}

        {/* Visible Months Modal */}
        {showVisibleMonthsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl relative">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-blue-500" />الأشهر الظاهرة</h3>
                <button onClick={() => setShowVisibleMonthsModal(false)} className="bg-slate-100 p-2 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                {months.map((m, mIdx) => (
                  <label key={mIdx} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-xl">
                    <input
                      type="checkbox"
                      checked={visibleMonths.includes(mIdx)}
                      onChange={() => {
                        let newVm = visibleMonths.includes(mIdx) ? visibleMonths.filter((v) => v !== mIdx) : [...visibleMonths, mIdx];
                        if (newVm.length === 0) newVm = [mIdx];
                        setVisibleMonths(newVm.sort());

                        const newCells = { ...cells };
                        displayedStudents.forEach((s) => {
                          updateStudentCalculations(newCells, s.id, maxScores, newVm);
                        });
                        setCells(newCells);
                        triggerAutoSave(newCells, disabledCols, maxScores);
                      }}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-bold text-slate-700">{m}</span>
                  </label>
                ))}
                <button onClick={() => setShowVisibleMonthsModal(false)} className="mt-4 w-full bg-blue-600 text-white font-bold py-3 rounded-xl">تطبيق وإغلاق</button>
              </div>
            </div>
          </div>
        )}

        {/* Indicators Modal */}
        {showIndicatorModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative my-auto">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><TrendingUp className="text-blue-500" />مؤشرات الأداء</h3>
                <button onClick={() => setShowIndicatorModal(false)} className="bg-slate-100 p-2 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اختر الشهر (أو عدة أشهر)</label>
                  <div className="flex flex-wrap gap-2">
                    {months.map((m, mIdx) => (
                      <button
                        key={mIdx}
                        onClick={() => {
                          setIndicatorConfig((prev) => ({
                            ...prev,
                            months: prev.months.includes(mIdx) ? prev.months.filter((v) => v !== mIdx) : [...prev.months, mIdx],
                          }));
                        }}
                        className={`px-4 py-2 rounded-xl font-bold text-sm border transition-colors ${indicatorConfig.months.includes(mIdx) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اختر البنود</label>
                  <div className="flex flex-wrap gap-2">
                    {monthCols.filter((mc) => !mc.isTotal && mc.id !== "ratio_m").map((mc) => (
                      <button
                        key={mc.id}
                        onClick={() => {
                          setIndicatorConfig((prev) => ({
                            ...prev,
                            fields: prev.fields.includes(mc.id) ? prev.fields.filter((v) => v !== mc.id) : [...prev.fields, mc.id],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-sm border transition-colors ${indicatorConfig.fields.includes(mc.id) ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-700 border-slate-200"}`}
                      >
                        {mc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">خيارات الفرز</label>
                  <select
                    value={indicatorConfig.level}
                    onChange={(e) => setIndicatorConfig((prev) => ({ ...prev, level: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">عرض الكل</option>
                    <option value="absent_written">الغائبين عن الاختبار</option>
                    <option value="no_grades">لم تضف له درجة</option>
                    <option value="highest">الأكثر درجة</option>
                    <option value="lowest">الأقل درجة</option>
                    <option value="average">المتوسط</option>
                    <option value="excellent">ممتاز (90%+)</option>
                    <option value="vgood">جيد جداً (80%+)</option>
                    <option value="good">جيد (65%+)</option>
                    <option value="fair">ضعيف (50%+)</option>
                    <option value="fail">راسب (&lt;50%)</option>
                  </select>
                </div>

                <button onClick={() => setShowIndicatorModal(false)} className="mt-2 w-full bg-blue-600 text-white font-bold py-3 rounded-xl">تطبيق</button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><History className="text-blue-500" /> الكشوفات السابقة</h3>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {sheets.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 font-bold">لا يوجد كشوفات سابقة محفوظة</div>
                ) : (
                  sheets.map((sh) => (
                    <div key={sh.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 group cursor-pointer" onClick={() => loadSheet(sh)}>
                      <div>
                        <p className="font-black text-slate-800 mb-1">{sh.sheetName || "بدون اسم"}</p>
                        <p className="text-xs font-bold text-slate-500">{sh.date} - {sh.grade} ({sh.section})</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={(e) => handleDeleteSheet(sh.id!, e)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Combine Modal */}
        {showCombineModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Combine className="text-blue-500" /> جمع الكشوفات</h3>
                <button onClick={() => setShowCombineModal(false)} className="p-2 bg-slate-50 text-slate-500 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                <p className="text-sm font-bold text-slate-500 mb-4">اختر الكشوفات التي ترغب في جمع درجاتها</p>
                {sheets.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 font-bold">لا يوجد كشوفات محفوظة</div>
                ) : (
                  sheets.map((sh) => (
                    <label key={sh.id} className="flex items-center gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-blue-600 rounded"
                        checked={selectedCombineSheets.includes(sh.id!)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCombineSheets([...selectedCombineSheets, sh.id!]);
                          else setSelectedCombineSheets(selectedCombineSheets.filter((id) => id !== sh.id!));
                        }}
                      />
                      <div>
                        <p className="font-black text-slate-800">{sh.sheetName || "بدون اسم"}</p>
                        <p className="text-xs font-bold text-slate-500">{sh.date} - {sh.grade} ({sh.section})</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                <button onClick={() => setShowCombineModal(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl">إلغاء</button>
                <button onClick={handleCombine} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-xl shadow-lg">تأكيد لجمع الجداول</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStudentGradeSheet = () => {
    return (
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-arabic animate-fade-in relative z-10 pb-20">
        <button
          onClick={() => setMode("menu")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold"
        >
          <ChevronLeft size={20} /> العودة للقائمة الرئيسية
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800">كشف درجات طالب</h1>
            <p className="text-slate-500 font-bold mt-2">رصد وتفصيل درجات طالب واحد لكافة المواد الدراسية</p>
          </div>
          {activeStudentInfo && (
            <button
              onClick={() => exportStudentToExcel(activeStudentInfo, activeStudentSubjectsList)}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-bold flex items-center gap-2 shadow-sm"
            >
              <Download size={18} /> تصدير اكسل
            </button>
          )}
        </div>

        {/* Filtering & Parameter selection card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم المدرسة</label>
            <select
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار المدرسة...</option>
              {allowedSchools.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار الفرع...</option>
              {allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">العام الدراسي</label>
            <select
              defaultValue={localStorage.getItem('selected_year') || "2024-2025"}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الفصل الدراسي</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="الفصل الأول">الفصل الأول</option>
              <option value="الفصل الثاني">الفصل الثاني</option>
            </select>
          </div>
          
          {/* Multi-select Grade Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الصف</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-slate-200 bg-slate-50 p-2 rounded-xl">
              {allowedGrades.map(g => (
                <label key={g} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(g)}
                    onChange={() => {
                      if (selectedGrades.includes(g)) {
                        setSelectedGrades(selectedGrades.filter(x => x !== g));
                      } else {
                        setSelectedGrades([...selectedGrades, g]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-blue-600"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Multi-select Section Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الشعبة</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-slate-200 bg-slate-50 p-2 rounded-xl">
              {allowedSections.map(s => (
                <label key={s} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(s)}
                    onChange={() => {
                      if (selectedSections.includes(s)) {
                        setSelectedSections(selectedSections.filter(x => x !== s));
                      } else {
                        setSelectedSections([...selectedSections, s]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-blue-600"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Student Select dropdown */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اختر الطالب</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر طالباً...</option>
              {studentViewStudentsList.map(s => (
                <option key={s.id} value={s.id}>{s.name} (الصف: {s.grade} - {s.section})</option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم الكشف</label>
            <select
              value={studentSheetName}
              onChange={(e) => setStudentSheetName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="الشهر الأول">الشهر الأول</option>
              <option value="الشهر الثاني">الشهر الثاني</option>
              <option value="الشهر الثالث">الشهر الثالث</option>
              <option value="اختبار نصف العام">اختبار نصف العام</option>
              <option value="اختبار آخر العام">اختبار آخر العام</option>
            </select>
          </div>
        </div>

        {/* Student Grade Sheet Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto p-6 relative min-h-[400px]">
          {activeStudentInfo ? (
            <div className="space-y-6">
              {/* Toggle Mode Buttons */}
              <div className="flex justify-start items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
                <button
                  onClick={() => setDisplayMode("total")}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    displayMode === "total"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  مجموع الدرجات
                </button>
                <button
                  onClick={() => setDisplayMode("exam_only")}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    displayMode === "exam_only"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  درجة الاختبار فقط
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    كشف درجات الطالب: <span className="text-blue-600">{activeStudentInfo.name}</span>
                  </h3>
                  <p className="text-slate-500 font-bold text-xs mt-2">
                    للشهر: <span className="text-slate-700">{studentSheetName}</span> | الفصل الدراسي: <span className="text-slate-700">{selectedTerm}</span> | العام الدراسي: <span className="text-slate-700">{localStorage.getItem('selected_year') || "2024-2025"}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-black">الصف: {activeStudentInfo.grade}</span>
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black">الشعبة: {activeStudentInfo.section}</span>
                </div>
              </div>

              <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <th className="border border-slate-200 p-3 w-16">م</th>
                    <th className="border border-slate-200 p-3 text-right">المادة</th>
                    <th className="border border-slate-200 p-3 w-32 cursor-pointer hover:bg-slate-200" onClick={() => setActiveStudentColField(activeStudentColField === "w_k" ? null : "w_k")}>واجب (20)</th>
                    <th className="border border-slate-200 p-3 w-32 cursor-pointer hover:bg-slate-200" onClick={() => setActiveStudentColField(activeStudentColField === "oral" ? null : "oral")}>شفوي (10)</th>
                    <th className="border border-slate-200 p-3 w-32 cursor-pointer hover:bg-slate-200" onClick={() => setActiveStudentColField(activeStudentColField === "attend" ? null : "attend")}>مواظبة (10)</th>
                    <th className="border border-slate-200 p-3 w-32 cursor-pointer hover:bg-slate-200" onClick={() => setActiveStudentColField(activeStudentColField === "written" ? null : "written")}>تحريري (60)</th>
                    <th className="border border-slate-200 p-3 w-32">المجموع ({displayMode === "exam_only" ? "60" : "100"})</th>
                    <th className="border border-slate-200 p-3 w-28">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudentSubjectsList.map((sub, idx) => {
                    const serialNum = (activeStudentInfo.grade === "11" || activeStudentInfo.grade === "12") ? (idx + 13) : (idx + 1);
                    const isRowSelected = activeStudentRowSubject === sub;
                    
                    const totalVal = getStudentRowTotal(sub);
                    const ratioVal = getStudentRowPercentage(sub);

                    const fields = ["w_k", "oral", "attend", "written"];
                    
                    const toggleRow = () => {
                      setActiveStudentRowSubject(isRowSelected ? null : sub);
                    };

                    const maxRowVal = displayMode === "exam_only" ? 60 : 100;
                    const isRowFailing = totalVal < maxRowVal / 2 && totalVal > 0;

                    return (
                      <tr key={sub} className={`hover:bg-slate-50 transition-colors border-b border-slate-200 ${isRowSelected ? "bg-sky-200/20" : ""}`}>
                        <td className="border border-slate-200 p-3 font-bold bg-slate-50/50">{serialNum}</td>
                        <td className="border border-slate-200 p-3 text-right font-black cursor-pointer hover:text-blue-600" onClick={toggleRow}>{sub}</td>
                        
                        {fields.map((f) => {
                          const val = getStudentCellDisplayValue(sub, f);
                          const isEmpty = val.trim() === "";
                          const numVal = parseFloat(val);
                          const maxVal = f === "w_k" ? 20 : f === "written" ? 60 : 10;
                          const isFailing = !isEmpty && !isNaN(numVal) && numVal < maxVal / 2;
                          const isColSelected = activeStudentColField === f;
                          const isFieldReadOnly = displayMode === "exam_only" && f !== "written";

                          return (
                            <td key={f} className={`border border-slate-200 p-0 transition-colors ${isColSelected ? "bg-sky-200/20" : ""} ${isFailing ? "bg-orange-500/20" : ""} ${isEmpty && !isRowSelected ? "bg-yellow-500/10" : ""} ${isFieldReadOnly ? "bg-slate-100 opacity-60" : ""}`}>
                              <input
                                type="text"
                                onFocus={(e) => !isFieldReadOnly && e.target.select()}
                                className="w-full h-full p-3 text-center bg-transparent outline-blue-500 font-bold"
                                value={val}
                                readOnly={isFieldReadOnly}
                                onChange={(e) => handleStudentCellChange(sub, f, e.target.value)}
                              />
                            </td>
                          );
                        })}

                        {/* Total cell */}
                        <td className={`border border-slate-200 p-3 font-black bg-slate-50/80 ${isRowFailing ? "bg-orange-500/20 text-orange-700" : ""}`}>{totalVal > 0 ? totalVal : ""}</td>
                        
                        {/* Ratio cell */}
                        <td className="border border-slate-200 p-3 font-black bg-slate-50/80 text-emerald-700">{totalVal > 0 ? ratioVal : ""}</td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <tr className="bg-slate-100 font-black text-slate-700">
                    <td colSpan={2} className="border border-slate-200 p-3 text-left">الإجمالي / النسبة</td>
                    
                    {/* واجب */}
                    <td className={`border border-slate-200 p-3 text-center ${displayMode === "exam_only" ? "bg-slate-100 opacity-60" : ""}`}>
                      {displayMode !== "exam_only" && (
                        <>
                          <div className="text-blue-700">{calculateStudentColTotal("w_k")}</div>
                          <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage("w_k")) / 20 * 100).toFixed(0)}</div>
                        </>
                      )}
                    </td>
                    
                    {/* شفوي */}
                    <td className={`border border-slate-200 p-3 text-center ${displayMode === "exam_only" ? "bg-slate-100 opacity-60" : ""}`}>
                      {displayMode !== "exam_only" && (
                        <>
                          <div className="text-blue-700">{calculateStudentColTotal("oral")}</div>
                          <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage("oral")) / 10 * 100).toFixed(0)}</div>
                        </>
                      )}
                    </td>
                    
                    {/* مواظبة */}
                    <td className={`border border-slate-200 p-3 text-center ${displayMode === "exam_only" ? "bg-slate-100 opacity-60" : ""}`}>
                      {displayMode !== "exam_only" && (
                        <>
                          <div className="text-blue-700">{calculateStudentColTotal("attend")}</div>
                          <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage("attend")) / 10 * 100).toFixed(0)}</div>
                        </>
                      )}
                    </td>
                    
                    {/* تحريري */}
                    <td className="border border-slate-200 p-3 text-center">
                      <div className="text-blue-700">{calculateStudentColTotal("written")}</div>
                      <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage("written")) / 60 * 100).toFixed(0)}</div>
                    </td>
                    
                    {/* المجموع */}
                    <td className="border border-slate-200 p-3 text-center bg-slate-200/80 text-blue-700">{calculateStudentColTotal("total_m")}</td>
                    
                    {/* النسبة */}
                    <td className="border border-slate-200 p-3 text-center bg-slate-200/80 text-emerald-700">
                      %{(() => {
                        const totalAvg = parseFloat(calculateStudentColAverage("total_m")) || 0;
                        const maxPossibleTotal = displayMode === "exam_only" ? 60 : 100;
                        return Math.round((totalAvg / maxPossibleTotal) * 100);
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleSaveStudentSheet()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 transition-colors"
                >
                  <Save size={18} /> حفظ العمل
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <User size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-lg mb-2">يرجى اختيار الطالب لعرض ورصد كشف الدرجات</p>
              <p>سيتم تصفية الأسماء المتاحة بموجب الصفوف والشعب المحددة أعلاه تلقائياً</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAllSubjectsGradeSheet = () => {
    return (
      <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-arabic animate-fade-in relative z-10 pb-20">
        <button
          onClick={() => setMode("menu")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold"
        >
          <ChevronLeft size={20} /> العودة للقائمة الرئيسية
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800">كشف درجات جميع المواد</h1>
            <p className="text-slate-500 font-bold mt-2">عرض ورصد شامل لدرجات جميع المواد الدراسية لطلاب الصف</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
            <button
              onClick={() => setShowAllSubjectsHistoryModal(true)}
              className="px-3 py-2 md:px-4 md:py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
            >
              <History size={18} /> الكشوفات السابقة
            </button>
            <button
              onClick={() => handleSaveAllSubjectsSheet()}
              className="px-3 py-2 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-md shadow-blue-200 whitespace-nowrap"
            >
              <Save size={18} /> حفظ العمل
            </button>
            {activeTabDetails && allSubjectsStudentsList.length > 0 && (
              <button
                onClick={() => exportAllSubjectsToExcel(activeTabDetails.grade, activeTabDetails.section, allSubjectsStudentsList, activeAllSubjectsList)}
                className="px-3 py-2 md:px-4 md:py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors font-bold flex items-center gap-1 md:gap-2 shadow-sm whitespace-nowrap"
              >
                <Download size={18} /> تصدير اكسل
              </button>
            )}
          </div>
        </div>

        {/* Filters and multi-select selectors */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم المدرسة</label>
            <select
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار المدرسة...</option>
              {allowedSchools.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختيار الفرع...</option>
              {allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">العام الدراسي</label>
            <select
              defaultValue={localStorage.getItem('selected_year') || "2024-2025"}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الفصل الدراسي</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="الفصل الأول">الفصل الأول</option>
              <option value="الفصل الثاني">الفصل الثاني</option>
            </select>
          </div>

          {/* Multi-select Grade Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الصف</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-slate-200 bg-slate-50 p-2 rounded-xl">
              {allowedGrades.map(g => (
                <label key={g} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(g)}
                    onChange={() => {
                      if (selectedGrades.includes(g)) {
                        setSelectedGrades(selectedGrades.filter(x => x !== g));
                      } else {
                        setSelectedGrades([...selectedGrades, g]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-blue-600"
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Multi-select Section Checkboxes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الشعبة</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-slate-200 bg-slate-50 p-2 rounded-xl">
              {allowedSections.map(s => (
                <label key={s} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(s)}
                    onChange={() => {
                      if (selectedSections.includes(s)) {
                        setSelectedSections(selectedSections.filter(x => x !== s));
                      } else {
                        setSelectedSections([...selectedSections, s]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-blue-600"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Month Select */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم الكشف</label>
            <select
              value={allSubjectsSheetName}
              onChange={(e) => setAllSubjectsSheetName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
            >
              <option value="الشهر الأول">الشهر الأول</option>
              <option value="الشهر الثاني">الشهر الثاني</option>
              <option value="الشهر الثالث">الشهر الثالث</option>
              <option value="اختبار نصف العام">اختبار نصف العام</option>
              <option value="اختبار آخر العام">اختبار آخر العام</option>
            </select>
          </div>
        </div>

        {/* Tabs for multiple grade and section combinations */}
        {activeTabsList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 bg-slate-100 p-2 rounded-2xl">
            {activeTabsList.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.key ? "bg-amber-500 text-white shadow-md" : "bg-transparent text-slate-600 hover:bg-slate-200"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* All Subjects Grid Sheet Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto p-6 relative min-h-[400px]">
          {activeTabDetails ? (
            <div className="space-y-6">
              {/* Toggle Mode Buttons */}
              <div className="flex justify-start items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
                <button
                  onClick={() => setDisplayMode("total")}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    displayMode === "total"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  مجموع الدرجات
                </button>
                <button
                  onClick={() => setDisplayMode("exam_only")}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                    displayMode === "exam_only"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  درجة الاختبار فقط
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    رصد درجات طلاب: <span className="text-amber-600">الصف {activeTabDetails.grade} - شعبة {activeTabDetails.section}</span>
                  </h3>
                  <p className="text-slate-500 font-bold text-xs mt-2">
                    الفصل الدراسي: <span className="text-slate-700">{selectedTerm}</span> | العام الدراسي: <span className="text-slate-700">{localStorage.getItem('selected_year') || "2024-2025"}</span> | الكشف: <span className="text-slate-700">{allSubjectsSheetName}</span>
                  </p>
                </div>
              </div>

              <table className="w-full text-center text-sm border-collapse min-w-[1000px]">
                <thead>
                  {/* month / sheetName header */}
                  <tr className="bg-amber-50 border border-amber-200">
                    <th colSpan={activeAllSubjectsList.length + 4} className="bg-amber-100/50 p-2.5 text-lg font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-slate-500 font-bold text-sm">اسم الكشف/الشهر:</span>
                        <input
                          type="text"
                          value={allSubjectsSheetName}
                          onChange={(e) => setAllSubjectsSheetName(e.target.value)}
                          className="bg-transparent text-center font-black outline-none w-48 border-b-2 border-dashed border-amber-300 focus:border-amber-600 pb-0.5 text-slate-800"
                          placeholder="مثال: الشهر الأول"
                        />
                      </div>
                    </th>
                  </tr>
                  
                  {/* Subjects Headers */}
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <th className="border border-slate-200 p-3 w-16">م</th>
                    <th className="border border-slate-200 p-3 text-right">اسم الطالب</th>
                    
                    {activeAllSubjectsList.map(sub => (
                      <th
                        key={sub}
                        className="border border-slate-200 p-3 cursor-pointer hover:bg-slate-200 min-w-[100px]"
                        onClick={() => setActiveAllSubjectsColSubject(activeAllSubjectsColSubject === sub ? null : sub)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="whitespace-normal leading-tight text-center break-words max-w-[80px]">{sub}</span>
                          <span className="text-[10px] text-slate-500 font-normal mt-0.5">({displayMode === "exam_only" ? 60 : 100})</span>
                        </div>
                      </th>
                    ))}
                    
                    <th className="border border-slate-200 p-3 w-28 bg-amber-50/80">المجموع</th>
                    <th className="border border-slate-200 p-3 w-24 bg-amber-50/80">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {allSubjectsStudentsList.map((s, sIdx) => {
                    const isRowSelected = activeAllSubjectsRowStudentId === s.id;
                    const subjects = activeAllSubjectsList;
                    
                    // Row Calculations
                    const rowTotal = subjects.reduce((sum, sub) => {
                      return sum + (parseFloat(getAllSubjectsCellDisplayValue(s.id, sub) || "0") || 0);
                    }, 0);
                    const maxScorePossible = subjects.length * (displayMode === "exam_only" ? 60 : 100);
                    const rowRatio = maxScorePossible > 0 ? Math.round((rowTotal / maxScorePossible) * 100) : 0;
                    const isFailingRow = rowRatio < 50 && rowTotal > 0;

                    const toggleRow = () => {
                      setActiveAllSubjectsRowStudentId(isRowSelected ? null : s.id);
                    };

                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition-colors border-b border-slate-200 ${isRowSelected ? "bg-sky-200/20" : ""}`}>
                        <td className="border border-slate-200 p-3 font-bold bg-slate-50/50">{sIdx + 1}</td>
                        <td className="border border-slate-200 p-3 text-right font-black cursor-pointer hover:text-blue-600" onClick={toggleRow}>{s.name}</td>
                        
                        {subjects.map(sub => {
                          const val = getAllSubjectsCellDisplayValue(s.id, sub);
                          const isEmpty = val.trim() === "";
                          const numVal = parseFloat(val);
                          const maxVal = displayMode === "exam_only" ? 60 : 100;
                          const isFailingCell = !isEmpty && !isNaN(numVal) && numVal < maxVal / 2;
                          const isColSelected = activeAllSubjectsColSubject === sub;

                          return (
                            <td key={sub} className={`border border-slate-200 p-0 transition-colors ${isColSelected ? "bg-sky-200/20" : ""} ${isFailingCell ? "bg-orange-500/20 text-red-600" : ""} ${isEmpty && !isRowSelected ? "bg-yellow-500/10" : ""}`}>
                              <input
                                type="text"
                                onFocus={(e) => e.target.select()}
                                className="w-full h-full p-3 text-center bg-transparent outline-blue-500 font-bold"
                                value={val}
                                onChange={(e) => handleAllSubjectsCellChange(s.id, sub, e.target.value)}
                              />
                            </td>
                          );
                        })}

                        {/* Sum Column */}
                        <td className={`border border-slate-200 p-3 font-black bg-amber-50/20 ${isFailingRow ? "text-red-500 bg-orange-500/10" : ""}`}>{rowTotal}</td>
                        
                        {/* Ratio Column */}
                        <td className={`border border-slate-200 p-3 font-black bg-amber-50/20 text-emerald-700 ${isFailingRow ? "text-red-500 bg-orange-500/10" : ""}`}>{rowRatio}%</td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row */}
                  {allSubjectsStudentsList.length > 0 && (
                    <tr className="bg-slate-100 font-black text-slate-700">
                      <td colSpan={2} className="border border-slate-200 p-3 text-left">الإجمالي / النسبة</td>
                      
                      {activeAllSubjectsList.map(sub => {
                        const colTotal = calculateAllSubjectsColTotal(sub);
                        const colRatio = calculateAllSubjectsColAverage(sub);
                        
                        return (
                          <td key={sub} className="border border-slate-200 p-2 text-xs text-center text-slate-700">
                            <div className="text-blue-700 border-b border-slate-300/50 mb-1 pb-1">{colTotal > 0 ? colTotal : ""}</div>
                            <div className="text-emerald-700">{Number(colRatio) > 0 ? `%${colRatio}` : ""}</div>
                          </td>
                        );
                      })}

                      {/* Total of Totals */}
                      <td className="border border-slate-200 p-3 text-center bg-amber-50 text-blue-700">
                        {allSubjectsStudentsList.reduce((acc, s) => {
                          const rowSum = activeAllSubjectsList.reduce((sum, sub) => sum + (parseFloat(getAllSubjectsCellDisplayValue(s.id, sub) || "0") || 0), 0);
                          return acc + rowSum;
                        }, 0)}
                      </td>
                      
                      {/* Average Percentage of all subjects */}
                      <td className="border border-slate-200 p-3 text-center bg-amber-50 text-emerald-700">
                        {(() => {
                          const totalRowsCount = allSubjectsStudentsList.length;
                          const totalSubjectsCount = activeAllSubjectsList.length;
                          const maxVal = displayMode === "exam_only" ? 60 : 100;
                          const maxAllScore = totalRowsCount * totalSubjectsCount * maxVal;
                          
                          const allScoresSum = allSubjectsStudentsList.reduce((acc, s) => {
                            const rowSum = activeAllSubjectsList.reduce((sum, sub) => sum + (parseFloat(getAllSubjectsCellDisplayValue(s.id, sub) || "0") || 0), 0);
                            return acc + rowSum;
                          }, 0);
                          
                          return maxAllScore > 0 ? `${Math.round((allScoresSum / maxAllScore) * 100)}%` : "0%";
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <FileSpreadsheet size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-lg mb-2">يرجى اختيار الصف والشعبة وتعبئة البنود لعرض الكشف الأفقي المشترك</p>
              <p>سيتم جلب الطلاب ديناميكياً من شؤون الطلاب وعمليات الحساب التلقائية فور توفير المعطيات</p>
            </div>
          )}
        </div>

        {/* History Modal for All Subjects sheets */}
        {showAllSubjectsHistoryModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><History className="text-blue-500" /> الكشوفات السابقة</h3>
                <button onClick={() => setShowAllSubjectsHistoryModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {allSubjectsSheets.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 font-bold">لا يوجد كشوفات سابقة محفوظة</div>
                ) : (
                  allSubjectsSheets.map((sh) => (
                    <div
                      key={sh.id}
                      className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 group cursor-pointer"
                      onClick={() => {
                        setSchoolName(sh.schoolName || "");
                        setBranch(sh.branch || "");
                        setSelectedGrades([sh.grade]);
                        setSelectedSections([sh.section]);
                        setAllSubjectsSheetName(sh.sheetName || "");
                        setSelectedTerm(sh.term || "الفصل الأول");
                        setAllSubjectsCells(sh.cells || {});
                        setShowAllSubjectsHistoryModal(false);
                      }}
                    >
                      <div>
                        <p className="font-black text-slate-800 mb-1">{sh.sheetName || "بدون اسم"}</p>
                        <p className="text-xs font-bold text-slate-500">{sh.term} - الصف: {sh.grade} ({sh.section})</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("هل أنت متأكد من حذف هذا الكشف؟")) {
                              const shId = sh.id;
                              
                              // Optimistically update
                              setAllSubjectsSheets((prev) => prev.filter((s) => s.id !== shId));
                              try {
                                await localDB.allSubjectsGradeSheets.delete(shId);
                                toast.success("تم حذف كشف جميع المواد بنجاح");
                              } catch (err: any) {
                                console.error(err);
                                toast.error("فشل حذف كشف جميع المواد");
                              }
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Switch between navigation modes
  if (mode === "menu") {
    return renderMenu();
  }
  if (mode === "subject") {
    return renderSubjectGradeSheet();
  }
  if (mode === "student") {
    return renderStudentGradeSheet();
  }
  if (mode === "all_subjects") {
    return renderAllSubjectsGradeSheet();
  }

  return null;
};
