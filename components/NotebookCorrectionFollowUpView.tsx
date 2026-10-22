import React, { useState, useEffect, useMemo } from "react";
import { useGlobal } from "../context/GlobalState";
import { NotebookFollowUpLog, NotebookReportArchive } from "../types";
import {
  Calendar,
  Save,
  Archive,
  Filter,
  CheckCircle,
  Plus,
  Trash2,
  FileSpreadsheet,
  MessageCircle,
  X,
  ChevronDown,
  Database,
  Search,
  Check,
  UserCheck,
  ClipboardList,
  ArrowRight,
  BookOpen,
  Printer,
  Edit,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toHijri } from "../src/lib/excelExport";

interface Props {
  onClose?: () => void;
}

// Arabic Day Names helper
const getArabicDayName = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", { weekday: "long" });
  } catch {
    return "";
  }
};

// Subject list for the dropdown select in individual card
const dropdownSubjects = [
  "القرآن كريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "الكيمياء",
  "الفيزياء",
  "الأحياء",
  "المجتمع",
  "الجغرافيا",
  "التاريخ",
  "الحاسوب"
];

// Subjects list for KG to Grade 9 Table (9 subjects)
const kg9TableSubjects = [
  "القرآن الكريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "المجتمع",
  "الجغرافيا",
  "التاريخ"
];

// Subjects list for Grades 10 to 12 Table (11 subjects)
const secondaryTableSubjects = [
  "القرآن الكريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الأحياء",
  "الكيمياء",
  "الفيزياء",
  "المجتمع",
  "الجغرافيا",
  "التاريخ"
];

// Standard rating options
const standardRatings = ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف", "ضعيف جداً"];

// Rating colors mapping for styling
const getRatingColor = (rating: string) => {
  switch (rating) {
    case "ممتاز":
      return "bg-emerald-500 text-white border-emerald-600";
    case "جيد جداً":
      return "bg-cyan-500 text-white border-cyan-600";
    case "جيد":
      return "bg-blue-500 text-white border-blue-600";
    case "مقبول":
      return "bg-amber-500 text-white border-amber-600";
    case "ضعيف":
      return "bg-orange-500 text-white border-orange-600";
    case "ضعيف جداً":
      return "bg-red-500 text-white border-red-600";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
  }
};

// Teacher correction rating options
const teacherCorrectionRatings = [
  "تصحيح دقيق",
  "تصحيح متوسط",
  "تصحيح دون كتابة الملاحظات",
  "قصور في التصحيح",
  "قصور كبير جداً في التصحيح",
  "لم يتم التصحيح"
];

const getTeacherCorrectionColor = (rating: string) => {
  switch (rating) {
    case "تصحيح دقيق":
      return "bg-emerald-500 text-white border-emerald-600";
    case "تصحيح متوسط":
      return "bg-blue-500 text-white border-blue-600";
    case "تصحيح دون كتابة الملاحظات":
      return "bg-purple-500 text-white border-purple-600";
    case "قصور في التصحيح":
      return "bg-amber-500 text-white border-amber-600";
    case "قصور كبير جداً في التصحيح":
      return "bg-orange-500 text-white border-orange-600";
    case "لم يتم التصحيح":
      return "bg-red-500 text-white border-red-600";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
  }
};

// Subject name normalizer helper
const normalizeSubjectName = (name: string) => {
  if (!name) return "";
  let s = name.trim();
  if (s === "القرآن كريم") return "القرآن الكريم";
  if (s === "التربية الاسلامية") return "التربية الإسلامية";
  if (s === "جغرافيا") return "الجغرافيا";
  if (s === "تاريخ") return "التاريخ";
  return s;
};

export const NotebookCorrectionFollowUpView: React.FC<Props> = ({ onClose }) => {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const today = new Date().toISOString().split("T")[0];

  // Active sub tab inside the notebook module
  const [notebookSubTab, setNotebookSubTab] = useState<"individual" | "reports">("individual");

  // ==========================================
  // I. Individual Follow-up View States
  // ==========================================
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Auto-populated or fixed values
  const [school, setSchool] = useState("");
  const [branch, setBranch] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");

  const [semester, setSemester] = useState<"الأول" | "الثاني">("الأول");
  const [date, setDate] = useState(today);
  const [subject, setSubject] = useState("القرآن كريم");

  // Follow-up Criteria
  const [cleanliness, setCleanliness] = useState({ rating: "", notes: "" });
  const [completeness, setCompleteness] = useState({ rating: "", notes: "" });
  const [spellingCorrection, setSpellingCorrection] = useState({ rating: "", notes: "" });
  const [teacherCorrection, setTeacherCorrection] = useState({ rating: "", notes: "" });
  const [correctionDate, setCorrectionDate] = useState(today);
  const [generalNotes, setGeneralNotes] = useState("");

  // ==========================================
  // II. Reports View States
  // ==========================================
  const [reportSchool, setReportSchool] = useState("");
  const [reportBranch, setReportBranch] = useState("");
  const [reportDate, setReportDate] = useState(today);
  const [reportSemester, setReportSemester] = useState<"الأول" | "الثاني">("الأول");
  const [reportGrade, setReportGrade] = useState("تمهيدي");
  const [reportSection, setReportSection] = useState("أ");

  // Applied filters states (applied when clicking the "Create" button)
  const [appliedSchool, setAppliedSchool] = useState("");
  const [appliedBranch, setAppliedBranch] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [appliedSemester, setAppliedSemester] = useState<"الأول" | "الثاني">("الأول");
  const [appliedGrade, setAppliedGrade] = useState("");
  const [appliedSection, setAppliedSection] = useState("");
  const [isTableGenerated, setIsTableGenerated] = useState(false);

  // Check if there are pending filter changes that haven't been applied yet
  const hasFilterChanges = useMemo(() => {
    return isTableGenerated && (
      reportSchool !== appliedSchool ||
      reportBranch !== appliedBranch ||
      reportDate !== appliedDate ||
      reportSemester !== appliedSemester ||
      reportGrade !== appliedGrade ||
      reportSection !== appliedSection
    );
  }, [
    isTableGenerated,
    reportSchool, appliedSchool,
    reportBranch, appliedBranch,
    reportDate, appliedDate,
    reportSemester, appliedSemester,
    reportGrade, appliedGrade,
    reportSection, appliedSection
  ]);

  const handleGenerateTable = () => {
    if (!reportSchool) {
      toast.error("الرجاء اختيار المدرسة أولاً");
      return;
    }
    setAppliedSchool(reportSchool);
    setAppliedBranch(reportBranch);
    setAppliedDate(reportDate);
    setAppliedSemester(reportSemester);
    setAppliedGrade(reportGrade);
    setAppliedSection(reportSection);
    setIsTableGenerated(true);
    toast.success("تم إنشاء جدول المتابعة والتصحيح حسب الفلاتر المحددة");
  };

  // Header Propagation Selection states for the interactive table headers
  const [propagateValues, setPropagateValues] = useState<Record<string, {
    cleanliness: string;
    completeness: string;
    spelling: string;
    teacher: string;
  }>>({});

  const [archiveOpen, setArchiveOpen] = useState(false);

  // 1. Resolve schools and branches matching supervisor scope
  const schoolsList = useMemo(() => {
    const list = new Set<string>();
    if (isGeneralSupervisor) {
      if (Array.isArray(data.availableSchools)) {
        data.availableSchools.forEach((s: any) => list.add(s));
      }
      if (Array.isArray(data.secretariatStaff)) {
        data.secretariatStaff.forEach((s: any) => s.school && list.add(s.school));
      }
    } else {
      const perms = currentUser?.permissions?.schoolsAndBranches || {};
      Object.keys(perms).forEach(s => list.add(s));
      if (currentUser?.selectedSchool) {
        currentUser.selectedSchool.split(",").forEach(s => list.add(s.trim()));
      }
    }
    if (list.size === 0 && data.profile?.schoolName) {
      list.add(data.profile.schoolName);
    }
    return Array.from(list);
  }, [data.availableSchools, data.secretariatStaff, currentUser, isGeneralSupervisor, data.profile]);

  const branchesList = useMemo(() => {
    if (!reportSchool) return [];
    const list = new Set<string>();
    if (isGeneralSupervisor) {
      if (data.schoolBranches?.[reportSchool]) {
        data.schoolBranches[reportSchool].forEach((b: any) => list.add(b));
      }
      if (Array.isArray(data.secretariatStaff)) {
        data.secretariatStaff.forEach((s: any) => {
          if (s.school === reportSchool && s.branch) {
            list.add(s.branch);
          }
        });
      }
    } else {
      const perms = currentUser?.permissions?.schoolsAndBranches || {};
      const branches = perms[reportSchool] || [];
      branches.forEach((b: string) => list.add(b));
      if (currentUser?.selectedBranch) {
        list.add(currentUser.selectedBranch);
      }
    }
    if (list.size === 0 && data.profile?.schoolName === reportSchool && data.profile?.branch) {
      list.add(data.profile.branch);
    }
    return Array.from(list);
  }, [reportSchool, data.schoolBranches, data.secretariatStaff, currentUser, isGeneralSupervisor, data.profile]);

  useEffect(() => {
    if (schoolsList.length > 0 && !reportSchool) {
      setReportSchool(currentUser?.selectedSchool || schoolsList[0]);
    }
  }, [schoolsList, currentUser]);

  useEffect(() => {
    if (branchesList.length > 0) {
      setReportBranch(currentUser?.selectedBranch || branchesList[0]);
    } else {
      setReportBranch("");
    }
  }, [branchesList, currentUser]);

  // Autocomplete Suggestions logic for student search in Secretariat list
  const filteredStudentsSuggestions = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return [];
    const list = data.secretariatStudents || [];
    return list.filter((s: any) => s.name && String(s.name).toLowerCase().includes(query));
  }, [studentSearch, data.secretariatStudents]);

  const handleSelectStudent = (s: any) => {
    setSelectedStudent(s);
    setStudentSearch(s.name);
    setSchool(s.school || data.profile?.schoolName || "");
    setBranch(s.branch || data.profile?.branch || "");
    setGrade(s.grade || "");
    setSection(s.section || "");
    setShowSuggestions(false);

    // Look up existing individual follow-up entry to populate the form if already present
    const existing = (data.notebookFollowUpLogs || []).find(
      (log: NotebookFollowUpLog) =>
        log.studentId === s.id &&
        log.date === date &&
        log.semester === semester &&
        log.subject === subject
    );

    if (existing) {
      setCleanliness({ rating: existing.cleanliness.rating, notes: existing.cleanliness.notes });
      setCompleteness({ rating: existing.completeness.rating, notes: existing.completeness.notes });
      setSpellingCorrection({ rating: existing.spellingCorrection.rating, notes: existing.spellingCorrection.notes });
      setTeacherCorrection({ rating: existing.teacherCorrection.rating, notes: existing.teacherCorrection.notes });
      setCorrectionDate(existing.correctionDate || date);
      setGeneralNotes(existing.generalNotes || "");
    } else {
      // Clear ratings to let user enter fresh ones
      setCleanliness({ rating: "", notes: "" });
      setCompleteness({ rating: "", notes: "" });
      setSpellingCorrection({ rating: "", notes: "" });
      setTeacherCorrection({ rating: "", notes: "" });
      setCorrectionDate(date);
      setGeneralNotes("");
    }
  };

  // Re-fetch individual card if date, semester or subject changes
  useEffect(() => {
    if (selectedStudent) {
      const existing = (data.notebookFollowUpLogs || []).find(
        (log: NotebookFollowUpLog) =>
          log.studentId === selectedStudent.id &&
          log.date === date &&
          log.semester === semester &&
          log.subject === subject
      );
      if (existing) {
        setCleanliness({ rating: existing.cleanliness.rating, notes: existing.cleanliness.notes });
        setCompleteness({ rating: existing.completeness.rating, notes: existing.completeness.notes });
        setSpellingCorrection({ rating: existing.spellingCorrection.rating, notes: existing.spellingCorrection.notes });
        setTeacherCorrection({ rating: existing.teacherCorrection.rating, notes: existing.teacherCorrection.notes });
        setCorrectionDate(existing.correctionDate || date);
        setGeneralNotes(existing.generalNotes || "");
      }
    }
  }, [date, semester, subject, selectedStudent]);

  // Main saving function
  const handleSaveFollowUp = (isSilent = false) => {
    if (!selectedStudent || !subject) return;

    const existingLogs = data.notebookFollowUpLogs || [];
    const index = existingLogs.findIndex(
      (log: NotebookFollowUpLog) =>
        log.studentId === selectedStudent.id &&
        log.date === date &&
        log.semester === semester &&
        log.subject === subject
    );

    const logEntry: NotebookFollowUpLog = {
      id: index !== -1 ? existingLogs[index].id : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: currentUser?.id || "",
      school: school,
      branch: branch,
      semester: semester,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      grade: grade,
      section: section,
      date: date,
      dateHijri: toHijri(date),
      day: getArabicDayName(date),
      subject: subject,
      cleanliness: cleanliness,
      completeness: completeness,
      spellingCorrection: spellingCorrection,
      teacherCorrection: teacherCorrection,
      correctionDate: correctionDate,
      generalNotes: generalNotes,
      createdAt: index !== -1 ? existingLogs[index].createdAt : new Date().toISOString()
    };

    let updatedLogs = [...existingLogs];
    if (index !== -1) {
      updatedLogs[index] = logEntry;
    } else {
      updatedLogs = [logEntry, ...updatedLogs];
    }

    updateData({ notebookFollowUpLogs: updatedLogs });

    if (!isSilent) {
      toast.success("تم حفظ كارت المتابعة الفردية بنجاح");
    }
  };

  // Auto save effect trigger
  useEffect(() => {
    if (selectedStudent && subject) {
      // Debounce slightly or save on key changes
      const delay = setTimeout(() => {
        handleSaveFollowUp(true);
      }, 600);
      return () => clearTimeout(delay);
    }
  }, [cleanliness, completeness, spellingCorrection, teacherCorrection, correctionDate, generalNotes]);

  // ==========================================
  // Interactive Table / Reports view helpers
  // ==========================================
  const activeTableSubjects = useMemo(() => {
    const isSecondary = ["10", "11", "12"].includes(appliedGrade);
    return isSecondary ? secondaryTableSubjects : kg9TableSubjects;
  }, [appliedGrade]);

  const studentsInReportClass = useMemo(() => {
    if (!isTableGenerated) return [];
    const list = data.secretariatStudents || [];
    return list.filter((s: any) =>
      s.school && String(s.school).trim() === appliedSchool.trim() &&
      s.branch && String(s.branch).trim() === appliedBranch.trim() &&
      s.grade && String(s.grade).trim() === appliedGrade.trim() &&
      s.section && String(s.section).trim() === appliedSection.trim()
    );
  }, [data.secretariatStudents, appliedSchool, appliedBranch, appliedGrade, appliedSection, isTableGenerated]);

  // Map of studentId -> subject -> NotebookFollowUpLog
  const notebookLogsMap = useMemo(() => {
    const map: Record<string, Record<string, NotebookFollowUpLog>> = {};
    const list = data.notebookFollowUpLogs || [];
    list.forEach((log: NotebookFollowUpLog) => {
      const sId = log.studentId;
      const sub = normalizeSubjectName(log.subject);
      if (!map[sId]) map[sId] = {};
      map[sId][sub] = log;
    });
    return map;
  }, [data.notebookFollowUpLogs]);

  // Generalize rating helper
  const handlePropagateRating = (sub: string, criteriaKey: "cleanliness" | "completeness" | "spelling" | "teacher") => {
    const ratingValue = propagateValues[sub]?.[criteriaKey];
    if (!ratingValue) {
      toast.error("الرجاء اختيار تقييم أولاً من المنسدلة للتعميم");
      return;
    }

    if (studentsInReportClass.length === 0) {
      toast.error("لا يوجد طلاب في الصف والشعبة المحددة لتعميم التقييم عليهم");
      return;
    }

    const existingLogs = data.notebookFollowUpLogs || [];
    let updatedLogs = [...existingLogs];

    studentsInReportClass.forEach((st) => {
      const idx = updatedLogs.findIndex(
        (log: NotebookFollowUpLog) =>
          log.studentId === st.id &&
          log.date === appliedDate &&
          log.semester === appliedSemester &&
          normalizeSubjectName(log.subject) === normalizeSubjectName(sub)
      );

      const oldLog = idx !== -1 ? updatedLogs[idx] : null;

      const logEntry: NotebookFollowUpLog = {
        id: oldLog ? oldLog.id : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId: currentUser?.id || "",
        school: appliedSchool,
        branch: appliedBranch,
        semester: appliedSemester,
        studentId: st.id,
        studentName: st.name,
        grade: appliedGrade,
        section: appliedSection,
        date: appliedDate,
        dateHijri: toHijri(appliedDate),
        day: getArabicDayName(appliedDate),
        subject: sub,
        cleanliness: criteriaKey === "cleanliness" ? { rating: ratingValue, notes: oldLog?.cleanliness.notes || "" } : (oldLog?.cleanliness || { rating: "", notes: "" }),
        completeness: criteriaKey === "completeness" ? { rating: ratingValue, notes: oldLog?.completeness.notes || "" } : (oldLog?.completeness || { rating: "", notes: "" }),
        spellingCorrection: criteriaKey === "spelling" ? { rating: ratingValue, notes: oldLog?.spellingCorrection.notes || "" } : (oldLog?.spellingCorrection || { rating: "", notes: "" }),
        teacherCorrection: criteriaKey === "teacher" ? { rating: ratingValue, notes: oldLog?.teacherCorrection.notes || "" } : (oldLog?.teacherCorrection || { rating: "", notes: "" }),
        correctionDate: oldLog?.correctionDate || appliedDate,
        generalNotes: oldLog?.generalNotes || "",
        createdAt: oldLog ? oldLog.createdAt : new Date().toISOString()
      };

      if (idx !== -1) {
        updatedLogs[idx] = logEntry;
      } else {
        updatedLogs.push(logEntry);
      }
    });

    updateData({ notebookFollowUpLogs: updatedLogs });
    toast.success(`تم تعميم تقييم (${ratingValue}) للجميع بنجاح في مادة ${sub}`);
  };

  // Archive report saving helper
  const handleSaveReportToArchive = () => {
    const archives = data.notebookReportArchives || [];
    const exists = archives.find(
      (a: NotebookReportArchive) =>
        a.school === appliedSchool &&
        a.branch === appliedBranch &&
        a.semester === appliedSemester &&
        a.grade === appliedGrade &&
        a.section === appliedSection &&
        a.date === appliedDate
    );

    if (exists) {
      toast.info("هذا التقرير محفوظ مسبقاً في الأرشيف");
      return;
    }

    const newArchive: NotebookReportArchive = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: currentUser?.id || "",
      school: appliedSchool,
      branch: appliedBranch,
      date: appliedDate,
      dateHijri: toHijri(appliedDate),
      day: getArabicDayName(appliedDate),
      semester: appliedSemester,
      grade: appliedGrade,
      section: appliedSection,
      createdAt: new Date().toISOString()
    };

    updateData({ notebookReportArchives: [newArchive, ...archives] });
    toast.success("تم أرشفة وحفظ التقرير بنجاح");
  };

  const handleDeleteArchive = (id: string) => {
    const updated = (data.notebookReportArchives || []).filter((a: NotebookReportArchive) => a.id !== id);
    updateData({ notebookReportArchives: updated });
    toast.success("تم حذف التقرير المؤرشف بنجاح");
  };

  const handleEditArchive = (archive: NotebookReportArchive) => {
    setReportSchool(archive.school);
    setReportBranch(archive.branch);
    setReportDate(archive.date);
    setReportSemester(archive.semester);
    setReportGrade(archive.grade);
    setReportSection(archive.section);

    setAppliedSchool(archive.school);
    setAppliedBranch(archive.branch);
    setAppliedDate(archive.date);
    setAppliedSemester(archive.semester);
    setAppliedGrade(archive.grade);
    setAppliedSection(archive.section);
    setIsTableGenerated(true);

    setArchiveOpen(false);
    toast.info(`تم فتح التقرير للصف ${archive.grade} / ${archive.section} للتعديل`);
  };

  // ==========================================
  // Excel Export Custom styled
  // ==========================================
  const handleExportExcel = async () => {
    if (studentsInReportClass.length === 0) {
      toast.error("لا توجد بيانات طلاب لتصديرها في هذا الصف والشعبة");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("متابعة الدفاتر", {
      views: [{ rightToLeft: true }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 }
    });

    // Sub-columns headers list mapping
    const subHeaderLabels = ["النظافة والخط", "اكتمال الدروس", "تصويب الأخطاء", "تصحيح المعلم", "تاريخ التصحيح"];
    const totalCols = 2 + (activeTableSubjects.length * 5) + 1; // 2 for (Index, Name) + subjects*5 + 1 for general notes

    // 1. Column widths setup
    worksheet.getColumn(1).width = 6;  // Index
    worksheet.getColumn(2).width = 25; // Name
    for (let c = 3; c < totalCols; c++) {
      worksheet.getColumn(c).width = 13;
    }
    worksheet.getColumn(totalCols).width = 20; // General Notes

    // 2. Set Row heights
    for (let r = 1; r <= 6; r++) worksheet.getRow(r).height = 20;
    worksheet.getRow(7).height = 26; // Subject Row
    worksheet.getRow(8).height = 24; // Sub criteria Row

    // A. Right Side: Ministry Info
    worksheet.getCell(1, 1).value = "الجمهـورية اليمنية";
    worksheet.getCell(2, 1).value = data.profile?.ministry || "وزارة التربية والتعـليم والبحث العلمي";
    worksheet.getCell(3, 1).value = data.profile?.district || "مكتب التربية والتعليم بالأمانة";
    worksheet.getCell(4, 1).value = data.profile?.district?.includes("منطقة") ? data.profile.district : "مكتب التربية والتعليم بالمنطقة";
    worksheet.getCell(5, 1).value = appliedSchool;
    worksheet.getCell(6, 1).value = `فرع: ${appliedBranch || "الرئيسي"}`;

    for (let r = 1; r <= 6; r++) {
      const cell = worksheet.getCell(r, 1);
      cell.font = { name: "Arial", bold: true, size: 9 };
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }

    // B. Center: Logo + Title
    const centerCol = Math.ceil(totalCols / 2);
    worksheet.mergeCells(5, centerCol - 2, 5, centerCol + 2);
    const titleCell = worksheet.getCell(5, centerCol - 2);
    titleCell.value = `سجل متابعة وتصحيح الدفاتر - الصف: ${appliedGrade} / ${appliedSection}`;
    titleCell.font = { name: "Arial", bold: true, size: 12, color: { argb: "FF0891B2" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    if (data.profile?.logoImg) {
      try {
        const logoBase64 = data.profile.logoImg;
        const base64Data = logoBase64.includes(";base64,") ? logoBase64.split(";base64,")[1] : logoBase64;
        const extension = logoBase64.includes("image/png") ? "png" : "jpeg";
        const imageId = workbook.addImage({ base64: base64Data, extension: extension as any });
        worksheet.addImage(imageId, {
          tl: { col: centerCol - 1, row: 0 },
          ext: { width: 65, height: 65 }
        });
      } catch (err) {
        console.error("Failed to embed logo in Excel", err);
      }
    }

    // C. Left Side: Dates
    const hijri = toHijri(appliedDate);
    const dayName = getArabicDayName(appliedDate);
    worksheet.getCell(1, totalCols).value = `اليوم: ${dayName}`;
    worksheet.getCell(2, totalCols).value = `التاريخ الهجري: ${hijri}`;
    worksheet.getCell(3, totalCols).value = `التاريخ الميلادي: ${appliedDate}`;

    for (let r = 1; r <= 3; r++) {
      const cell = worksheet.getCell(r, totalCols);
      cell.font = { name: "Arial", bold: true, size: 9 };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    }

    // D. Table Nested Headers Setup
    // Row 7 (Subjects Row) & Row 8 (Criteria Row)
    worksheet.mergeCells(7, 1, 8, 1);
    const h1 = worksheet.getCell(7, 1);
    h1.value = "م";
    h1.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
    h1.alignment = { horizontal: "center", vertical: "middle" };
    h1.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

    worksheet.mergeCells(7, 2, 8, 2);
    const h2 = worksheet.getCell(7, 2);
    h2.value = "بيانات الطالب";
    h2.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
    h2.alignment = { horizontal: "center", vertical: "middle" };
    h2.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

    // Set Subject labels & sub-header labels
    let curCol = 3;
    activeTableSubjects.forEach((sub) => {
      // Merge Row 7 columns 0 to 4
      worksheet.mergeCells(7, curCol, 7, curCol + 4);
      const subCell = worksheet.getCell(7, curCol);
      subCell.value = sub;
      subCell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      subCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

      // Set Row 8 labels
      subHeaderLabels.forEach((lbl, offset) => {
        const subColCell = worksheet.getCell(8, curCol + offset);
        subColCell.value = lbl;
        subColCell.font = { name: "Arial", bold: true, size: 9, color: { argb: "FFFFFFFF" } };
        subColCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
        subColCell.alignment = { horizontal: "center", vertical: "middle" };
        subColCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });

      curCol += 5;
    });

    // Merge Notes column
    worksheet.mergeCells(7, totalCols, 8, totalCols);
    const hn = worksheet.getCell(7, totalCols);
    hn.value = "ملاحظات عامة";
    hn.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    hn.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
    hn.alignment = { horizontal: "center", vertical: "middle" };
    hn.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

    // 3. Populate rows
    studentsInReportClass.forEach((st, sIdx) => {
      const rowNum = 9 + sIdx;
      worksheet.getRow(rowNum).height = 24;

      worksheet.getCell(rowNum, 1).value = sIdx + 1;
      worksheet.getCell(rowNum, 2).value = st.name;

      let subCol = 3;
      let notesAccumulated = "";

      activeTableSubjects.forEach((sub) => {
        const normalized = normalizeSubjectName(sub);
        const log = notebookLogsMap[st.id]?.[normalized];

        if (log) {
          worksheet.getCell(rowNum, subCol).value = log.cleanliness?.rating || "---";
          worksheet.getCell(rowNum, subCol + 1).value = log.completeness?.rating || "---";
          worksheet.getCell(rowNum, subCol + 2).value = log.spellingCorrection?.rating || "---";
          worksheet.getCell(rowNum, subCol + 3).value = log.teacherCorrection?.rating || "---";
          worksheet.getCell(rowNum, subCol + 4).value = log.correctionDate || "---";

          if (log.generalNotes?.trim()) {
            notesAccumulated += `[${sub}: ${log.generalNotes}] `;
          }
        } else {
          for (let o = 0; o < 5; o++) {
            worksheet.getCell(rowNum, subCol + o).value = "";
          }
        }
        subCol += 5;
      });

      worksheet.getCell(rowNum, totalCols).value = notesAccumulated || "لا توجد ملاحظات";

      // Style row cells
      const excelRow = worksheet.getRow(rowNum);
      const isEven = sIdx % 2 === 0;
      excelRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 9, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" }
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } }
        };
      });
    });

    // 4. Footer Row setup
    const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 10;
    const footerStart = lastRow + 2;
    worksheet.getRow(footerStart).height = 35;

    // Writer on the left, Branch Manager on the right
    const writerCell = worksheet.getCell(footerStart, 2);
    writerCell.value = `إعداد التقرير: ${currentUser?.name || "..."}`;
    writerCell.font = { name: "Arial", bold: true, size: 10 };
    writerCell.alignment = { horizontal: "right", vertical: "middle" };

    const managerCell = worksheet.getCell(footerStart, totalCols - 1);
    managerCell.value = `مدير الفرع: ${data.profile?.branchManager || "..."}`;
    managerCell.font = { name: "Arial", bold: true, size: 10 };
    managerCell.alignment = { horizontal: "left", vertical: "middle" };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `تقرير_متابعة_الدفاتر_${appliedGrade}_الشعبة_${appliedSection}.xlsx`);
    toast.success("تم تصدير ملف إكسل المنسق بنجاح");
  };

  // ==========================================
  // WhatsApp Message Generator
  // ==========================================
  const handleSendWhatsApp = () => {
    if (studentsInReportClass.length === 0) {
      toast.error("لا توجد بيانات طلاب لإرسالها");
      return;
    }

    let msg = `*🏫 سجل متابعة وتصحيح الدفاتر والواجبات*\n\n`;
    msg += `*🏢 المدرسة:* ${appliedSchool}\n`;
    msg += `*📍 الفرع:* ${appliedBranch || "الرئيسي"}\n`;
    msg += `*📅 التاريخ:* ${appliedDate} م / ${toHijri(appliedDate)} (${getArabicDayName(appliedDate)})\n`;
    msg += `* الفصل الدراسي:* ${appliedSemester}\n`;
    msg += `* الصف:* ${appliedGrade} | * الشعبة:* ${appliedSection}\n`;
    msg += `*━━━━━━━━━━━━━━━━━━━━━*\n\n`;

    studentsInReportClass.forEach((st, idx) => {
      msg += `👤 *${idx + 1} - الطالب: ${st.name}*\n`;
      let recordsExist = false;

      activeTableSubjects.forEach((sub) => {
        const normalized = normalizeSubjectName(sub);
        const log = notebookLogsMap[st.id]?.[normalized];

        if (log) {
          recordsExist = true;
          msg += `  📓 *مادة ${sub}:*\n`;
          msg += `    ✨ الخط والنظافة: _${log.cleanliness?.rating || "---"}_\n`;
          msg += `    📝 اكتمال الواجبات: _${log.completeness?.rating || "---"}_\n`;
          msg += `    ✍️ تصحيح الأخطاء: _${log.spellingCorrection?.rating || "---"}_\n`;
          msg += `    👨‍🏫 تصحيح المعلم: _${log.teacherCorrection?.rating || "---"}_\n`;
          if (log.generalNotes?.trim()) {
            msg += `    💬 ملاحظات: _${log.generalNotes}_\n`;
          }
        }
      });

      if (!recordsExist) {
        msg += `    ⚠️ _لا توجد بيانات مسجلة له._\n`;
      }
      msg += `\n`;
    });

    msg += `*━━━━━━━━━━━━━━━━━━━━━*\n`;
    msg += `✍️ *معد التقرير:* ${currentUser?.name || "..."}\n`;
    msg += `💼 *مدير الفرع:* ${data.profile?.branchManager || "..."}\n\n`;
    msg += `${getReportMessageFooter(appliedDate)}`;
    shareViaWhatsApp(msg);
  };

  return (
    <div className="space-y-6 text-right font-arabic" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top duration-300">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <ClipboardList size={26} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">سجل متابعة الدفاتر والتصحيح</h2>
            <p className="text-xs text-slate-400 font-bold">المتابعة الميدانية للكتب والواجبات وتصحيح المعلم وتوثيقها</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Main Action View Toggles */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setNotebookSubTab("individual")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                notebookSubTab === "individual"
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              متابعة فردية
            </button>
            <button
              onClick={() => setNotebookSubTab("reports")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                notebookSubTab === "reports"
                  ? "bg-white text-cyan-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              تقارير الدفاتر والتصحيح
            </button>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all"
          >
            <ArrowRight size={16} />
            <span>الخروج</span>
          </button>
        </div>
      </div>

      {notebookSubTab === "individual" ? (
        // =======================================================
        // I. Individual Follow-up Panel
        // =======================================================
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom duration-300">
          {/* Right Inputs Setup (1/3 size) */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 space-y-5 shadow-sm">
            <h3 className="text-base font-black text-slate-700 border-b pb-2 flex items-center gap-2">
              <UserCheck size={18} className="text-cyan-600" />
              <span>بيانات الطالب والمادة</span>
            </h3>

            {/* School name (Disabled) */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 pr-1 block">المدرسة</label>
              <input
                type="text"
                value={school}
                readOnly
                placeholder="سيتم ملء الحقل تلقائياً عند اختيار الطالب"
                className="w-full p-3.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-xs font-black outline-none block"
              />
            </div>

            {/* Branch name (Disabled) */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 pr-1 block">الفرع</label>
              <input
                type="text"
                value={branch}
                readOnly
                placeholder="سيتم ملء الحقل تلقائياً عند اختيار الطالب"
                className="w-full p-3.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-xs font-black outline-none block"
              />
            </div>

            {/* Student Name Auto-complete Input */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-black text-slate-500 pr-1 block">اسم الطالب</label>
              <div className="relative">
                <Search className="absolute right-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setSelectedStudent(null);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="ابحث عن اسم الطالب بالسكرتارية..."
                  className="w-full pr-10 pl-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none transition-all"
                />
              </div>

              {showSuggestions && studentSearch.trim() && (
                <div className="absolute right-0 left-0 bg-white border border-slate-200 mt-1.5 rounded-2xl shadow-xl z-50 p-2 max-h-[220px] overflow-y-auto space-y-1 text-right">
                  {filteredStudentsSuggestions.length > 0 ? (
                    filteredStudentsSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStudent(s)}
                        className="w-full p-2.5 text-xs text-slate-700 font-bold hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between"
                      >
                        <span className="font-black">{s.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {s.grade} / {s.section} ({s.school})
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400 font-bold">
                      لا توجد نتائج مطابقة لاسم الطالب بالتحكم
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Grade & Section (Disabled) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 block">الصف</label>
                <input
                  type="text"
                  value={grade}
                  readOnly
                  placeholder="الصف"
                  className="w-full p-3 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-xs font-black text-center outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 block">الشعبة</label>
                <input
                  type="text"
                  value={section}
                  readOnly
                  placeholder="الشعبة"
                  className="w-full p-3 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-xs font-black text-center outline-none"
                />
              </div>
            </div>

            {/* Semester Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 pr-1 block">الفصل الدراسي</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none transition-all"
              >
                <option value="الأول">الفصل الأول</option>
                <option value="الثاني">الفصل الثاني</option>
              </select>
            </div>

            {/* Subject Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 pr-1 block">المادة المدرسية</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none transition-all"
              >
                {dropdownSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Date Input with Hijri & Day labels */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 pr-1 block">تاريخ اليوم</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none transition-all"
              />
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-bold flex justify-between items-center">
                <span>🕋 الهجري: {toHijri(date)}</span>
                <span>📅 اليوم: {getArabicDayName(date)}</span>
              </div>
            </div>
          </div>

          {/* Left Main Form: Indicators evaluation (2/3 size) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-6 shadow-sm">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-black text-slate-700 flex items-center gap-2">
                  <ClipboardList size={18} className="text-cyan-600" />
                  <span>معايير التقييم والمتابعة للدفتر والكتب</span>
                </h3>
                <span className="text-[10px] text-amber-500 font-black animate-pulse">
                  ⚡ يتم الحفظ تلقائياً أثناء الكتابة والاختيار
                </span>
              </div>

              {/* 1. cleanliness */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 block">1. النظافة والتنظيم والخط</label>
                <div className="flex flex-wrap gap-2">
                  {standardRatings.map((rating) => {
                    const isSelected = cleanliness.rating === rating;
                    return (
                      <button
                        key={rating}
                        onClick={() => setCleanliness({ ...cleanliness, rating })}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                          isSelected ? getRatingColor(rating) : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={cleanliness.notes}
                  onChange={(e) => setCleanliness({ ...cleanliness, notes: e.target.value })}
                  placeholder="ملاحظات النظافة والخط..."
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              {/* 2. completeness */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 block">2. اكتمال الدروس والواجبات</label>
                <div className="flex flex-wrap gap-2">
                  {standardRatings.map((rating) => {
                    const isSelected = completeness.rating === rating;
                    return (
                      <button
                        key={rating}
                        onClick={() => setCompleteness({ ...completeness, rating })}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                          isSelected ? getRatingColor(rating) : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={completeness.notes}
                  onChange={(e) => setCompleteness({ ...completeness, notes: e.target.value })}
                  placeholder="ملاحظات اكتمال الدروس والواجبات..."
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              {/* 3. spellingCorrection */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 block">3. تصويب الأخطاء الإملائية والعلمية</label>
                <div className="flex flex-wrap gap-2">
                  {standardRatings.map((rating) => {
                    const isSelected = spellingCorrection.rating === rating;
                    return (
                      <button
                        key={rating}
                        onClick={() => setSpellingCorrection({ ...spellingCorrection, rating })}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                          isSelected ? getRatingColor(rating) : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={spellingCorrection.notes}
                  onChange={(e) => setSpellingCorrection({ ...spellingCorrection, notes: e.target.value })}
                  placeholder="ملاحظات تصويب الأخطاء..."
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              {/* 4. teacherCorrection */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-700 block">4. تصحيح المعلم والمتابعة</label>
                <div className="flex flex-wrap gap-2">
                  {teacherCorrectionRatings.map((rating) => {
                    const isSelected = teacherCorrection.rating === rating;
                    return (
                      <button
                        key={rating}
                        onClick={() => setTeacherCorrection({ ...teacherCorrection, rating })}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${
                          isSelected ? getTeacherCorrectionColor(rating) : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={teacherCorrection.notes}
                  onChange={(e) => setTeacherCorrection({ ...teacherCorrection, notes: e.target.value })}
                  placeholder="ملاحظات تصحيح المعلم للدفتر..."
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Correction Date & General notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 block">تاريخ التصحيح</label>
                  <input
                    type="date"
                    value={correctionDate}
                    onChange={(e) => setCorrectionDate(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 block">ملاحظات عامة</label>
                  <textarea
                    rows={2}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="اكتب أي ملاحظات أخرى عامة هنا..."
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-cyan-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Save buttons */}
              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveFollowUp(false)}
                  disabled={!selectedStudent}
                  className="px-8 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  <span>حفظ المتابعة الفردية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // =======================================================
        // II. Reports & Class Table View Panel
        // =======================================================
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
          {/* Filters Area */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-700 flex items-center gap-2">
                <Filter size={18} className="text-cyan-600" />
                <span>خيارات تصفية الصف والمدرسة</span>
              </h3>
              <button
                type="button"
                onClick={() => setArchiveOpen(!archiveOpen)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <Archive size={14} />
                <span>أرشيف التقارير المحفوظة</span>
              </button>
            </div>

            {/* Archive Reports List overlay section */}
            {archiveOpen && (
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-slate-700">التقارير التي تم أرشفتها مسبقاً:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(data.notebookReportArchives || []).length > 0 ? (
                    (data.notebookReportArchives || []).map((arch: NotebookReportArchive) => (
                      <div key={arch.id} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col justify-between gap-3 shadow-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">التاريخ: {arch.date}</span>
                          <span className="text-xs font-black text-slate-700 block">الصف: {arch.grade} | الشعبة: {arch.section}</span>
                          <span className="text-[9px] text-slate-400 block truncate">مدرسة: {arch.school} / {arch.branch}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditArchive(arch)}
                            className="flex-1 py-1.5 bg-cyan-50 text-cyan-600 font-bold text-[10px] rounded-lg hover:bg-cyan-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit size={10} />
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteArchive(arch.id)}
                            className="py-1.5 px-2.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="md:col-span-3 text-center p-6 text-xs text-slate-400 font-bold">
                      لا توجد تقارير مؤرشفة لهذا السجل بعد.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
              {/* School Select */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">المدرسة</label>
                <select
                  value={reportSchool}
                  onChange={(e) => setReportSchool(e.target.value)}
                  disabled={schoolsList.length <= 1}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-cyan-500 transition-all"
                >
                  {schoolsList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Branch Select */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">الفرع</label>
                <select
                  value={reportBranch}
                  onChange={(e) => setReportBranch(e.target.value)}
                  disabled={branchesList.length <= 1}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-cyan-500 transition-all"
                >
                  {branchesList.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Date Select */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">التاريخ</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white"
                />
              </div>

              {/* Semester Select */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">الفصل الدراسي</label>
                <select
                  value={reportSemester}
                  onChange={(e) => setReportSemester(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="الأول">الأول</option>
                  <option value="الثاني">الثاني</option>
                </select>
              </div>

              {/* Grade Class Select */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">الصف</label>
                <select
                  value={reportGrade}
                  onChange={(e) => setReportGrade(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="تمهيدي">تمهيدي</option>
                  <option value="1">الصف 1</option>
                  <option value="2">الصف 2</option>
                  <option value="3">الصف 3</option>
                  <option value="4">الصف 4</option>
                  <option value="5">الصف 5</option>
                  <option value="6">الصف 6</option>
                  <option value="7">الصف 7</option>
                  <option value="8">الصف 8</option>
                  <option value="9">الصف 9</option>
                  <option value="10">الصف 10</option>
                  <option value="11">الصف 11</option>
                  <option value="12">الصف 12</option>
                </select>
              </div>

              {/* Section Select */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">الشعبة</label>
                <select
                  value={reportSection}
                  onChange={(e) => setReportSection(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="أ">أ</option>
                  <option value="ب">ب</option>
                  <option value="ج">ج</option>
                  <option value="د">د</option>
                  <option value="هـ">هـ</option>
                  <option value="و">و</option>
                  <option value="ز">ز</option>
                  <option value="ح">ح</option>
                  <option value="ط">ط</option>
                  <option value="ي">ي</option>
                </select>
              </div>
            </div>

            {/* Date Details Bar & Generate Table Button */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pt-2">
              <div className="p-3 bg-cyan-50/50 rounded-2xl border border-cyan-100/50 text-xs font-bold text-slate-600 flex justify-between items-center flex-wrap gap-2 flex-1">
                <span className="flex items-center gap-1 text-cyan-800">
                  <Calendar size={14} />
                  <span>تاريخ التقرير المعتمد:</span>
                </span>
                <span>الميلادي: {reportDate}</span>
                <span>🕋 الهجري: {toHijri(reportDate)}</span>
                <span>📅 اليوم الموافق: {getArabicDayName(reportDate)}</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateTable}
                className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-white ${
                  hasFilterChanges
                    ? "bg-gradient-to-l from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 animate-pulse"
                    : "bg-gradient-to-l from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
                }`}
              >
                <Plus size={18} />
                <span>{hasFilterChanges ? "تحديث الجدول (تغييرات معلقة)" : "إنشاء الجدول"}</span>
              </button>
            </div>
          </div>

          {/* Table Actions and Excel / WA Exports */}
          {studentsInReportClass.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-xs font-black text-slate-700">
                  📚 عدد الطلاب المسجلين بالصف والشعبة: <span className="text-cyan-600 text-sm">{studentsInReportClass.length} طلاب</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSaveReportToArchive}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl font-bold text-xs hover:bg-cyan-100 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} />
                    حفظ التقرير للأرشيف
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-xs hover:bg-green-100 transition-all flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet size={14} />
                    تصدير إكسل منسق
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <MessageCircle size={14} />
                    إرسال للواتساب
                  </button>
                </div>
              </div>

              {/* Main Interactive Table wrapper */}
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-right border-collapse" style={{ minWidth: "1200px" }}>
                    <thead>
                      {/* First Header Row: Nested subjects */}
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-xs">
                        <th className="p-3 border-l border-slate-200 text-center w-12" rowSpan={2}>م</th>
                        <th className="p-3 border-l border-slate-200 text-center w-52" rowSpan={2}>اسم الطالب</th>
                        
                        {activeTableSubjects.map((sub, idx) => (
                          <th
                            key={idx}
                            colSpan={5}
                            className="p-3 border-l border-slate-200 text-center bg-cyan-50/50 text-cyan-900 border-b border-cyan-100 font-black"
                          >
                            {sub}
                          </th>
                        ))}
                        <th className="p-3 text-center" rowSpan={2}>ملاحظات</th>
                      </tr>

                      {/* Second Header Row: Interactive headers with dropdowns */}
                      <tr className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-200">
                        {activeTableSubjects.map((sub) => {
                          const propVals = propagateValues[sub] || { cleanliness: "", completeness: "", spelling: "", teacher: "" };
                          return (
                            <React.Fragment key={sub}>
                              {/* cleanliness */}
                              <th className="p-2 border-l border-slate-200 text-center">
                                <div className="space-y-1 block">
                                  <span>النظافة والخط</span>
                                  <select
                                    value={propVals.cleanliness}
                                    onChange={(e) => setPropagateValues({
                                      ...propagateValues,
                                      [sub]: { ...propVals, cleanliness: e.target.value }
                                    })}
                                    className="w-full p-1 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none block"
                                  >
                                    <option value="">خيار...</option>
                                    {standardRatings.map(x => <option key={x} value={x}>{x}</option>)}
                                  </select>
                                  <button
                                    onClick={() => handlePropagateRating(sub, "cleanliness")}
                                    className="text-[8px] bg-cyan-600 text-white font-bold px-1 py-0.5 rounded hover:bg-cyan-700"
                                  >
                                    تعميم
                                  </button>
                                </div>
                              </th>

                              {/* completeness */}
                              <th className="p-2 border-l border-slate-200 text-center">
                                <div className="space-y-1 block">
                                  <span>اكتمال الدروس</span>
                                  <select
                                    value={propVals.completeness}
                                    onChange={(e) => setPropagateValues({
                                      ...propagateValues,
                                      [sub]: { ...propVals, completeness: e.target.value }
                                    })}
                                    className="w-full p-1 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none block"
                                  >
                                    <option value="">خيار...</option>
                                    {standardRatings.map(x => <option key={x} value={x}>{x}</option>)}
                                  </select>
                                  <button
                                    onClick={() => handlePropagateRating(sub, "completeness")}
                                    className="text-[8px] bg-cyan-600 text-white font-bold px-1 py-0.5 rounded hover:bg-cyan-700"
                                  >
                                    تعميم
                                  </button>
                                </div>
                              </th>

                              {/* spelling */}
                              <th className="p-2 border-l border-slate-200 text-center">
                                <div className="space-y-1 block">
                                  <span>تصويب الأخطاء</span>
                                  <select
                                    value={propVals.spelling}
                                    onChange={(e) => setPropagateValues({
                                      ...propagateValues,
                                      [sub]: { ...propVals, spelling: e.target.value }
                                    })}
                                    className="w-full p-1 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none block"
                                  >
                                    <option value="">خيار...</option>
                                    {standardRatings.map(x => <option key={x} value={x}>{x}</option>)}
                                  </select>
                                  <button
                                    onClick={() => handlePropagateRating(sub, "spelling")}
                                    className="text-[8px] bg-cyan-600 text-white font-bold px-1 py-0.5 rounded hover:bg-cyan-700"
                                  >
                                    تعميم
                                  </button>
                                </div>
                              </th>

                              {/* teacher */}
                              <th className="p-2 border-l border-slate-200 text-center">
                                <div className="space-y-1 block">
                                  <span>تصحيح المعلم</span>
                                  <select
                                    value={propVals.teacher}
                                    onChange={(e) => setPropagateValues({
                                      ...propagateValues,
                                      [sub]: { ...propVals, teacher: e.target.value }
                                    })}
                                    className="w-full p-1 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none block"
                                  >
                                    <option value="">خيار...</option>
                                    {teacherCorrectionRatings.map(x => <option key={x} value={x}>{x}</option>)}
                                  </select>
                                  <button
                                    onClick={() => handlePropagateRating(sub, "teacher")}
                                    className="text-[8px] bg-cyan-600 text-white font-bold px-1 py-0.5 rounded hover:bg-cyan-700"
                                  >
                                    تعميم
                                  </button>
                                </div>
                              </th>

                              {/* last date */}
                              <th className="p-2 border-l border-slate-200 text-center w-24">آخر تصحيح</th>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-bold">
                      {studentsInReportClass.map((st, idx) => {
                        let notesAccumulated = "";
                        return (
                          <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 border-l border-slate-100 text-center w-12">{idx + 1}</td>
                            <td className="p-3 border-l border-slate-100 font-black text-slate-800 w-52">
                              {/* Interactive Student edit/open card helper link */}
                              <button
                                onClick={() => {
                                  setNotebookSubTab("individual");
                                  handleSelectStudent(st);
                                }}
                                className="hover:underline text-cyan-600 hover:text-cyan-800 text-right font-black"
                              >
                                {st.name}
                              </button>
                            </td>

                            {activeTableSubjects.map((sub) => {
                              const normalized = normalizeSubjectName(sub);
                              const log = notebookLogsMap[st.id]?.[normalized];

                              if (log && log.generalNotes?.trim()) {
                                notesAccumulated += `[${sub}: ${log.generalNotes}] `;
                              }

                              return (
                                <React.Fragment key={sub}>
                                  <td className="p-2 border-l border-slate-100 text-center">{log?.cleanliness?.rating || "---"}</td>
                                  <td className="p-2 border-l border-slate-100 text-center">{log?.completeness?.rating || "---"}</td>
                                  <td className="p-2 border-l border-slate-100 text-center">{log?.spellingCorrection?.rating || "---"}</td>
                                  <td className="p-2 border-l border-slate-100 text-center">{log?.teacherCorrection?.rating || "---"}</td>
                                  <td className="p-2 border-l border-slate-100 text-center text-[10px] w-24 text-slate-500">{log?.correctionDate || "---"}</td>
                                </React.Fragment>
                              );
                            })}

                            <td className="p-3 text-slate-400 font-medium text-[10px] text-right truncate max-w-[200px]" title={notesAccumulated}>
                              {notesAccumulated || "لا توجد ملاحظات"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : !isTableGenerated ? (
            /* Placeholder when table is not generated yet */
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[300px]">
              <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center border border-cyan-100">
                <ClipboardList size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-700 text-sm">بانتظار إنشاء جدول المتابعة</h4>
                <p className="text-xs text-slate-400 max-w-sm font-bold leading-5">
                  الرجاء اختيار المدرسة، الفرع، الصف والشعبة من الفلاتر أعلاه، ثم الضغط على زر "إنشاء الجدول" لعرض البيانات.
                </p>
              </div>
            </div>
          ) : (
            /* Empty list state when no student matching the selected grade/section */
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[300px]">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <Database size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-700 text-sm">لا يوجد طلاب مسجلين بالصف والشعبة</h4>
                <p className="text-xs text-slate-400 max-w-sm font-bold leading-5">
                  الرجاء مراجعة بيانات الطلاب من زر التحكم بشؤون الطلاب الموجود بالسكرتارية لتسجيل الطلاب وتعبئة بياناتهم.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
