import React, { useState, useMemo, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  Calendar,
  Clock,
  Filter,
  ChevronDown,
  UserCheck,
  UserX,
  BookOpen,
  Star,
  AlertTriangle,
  Search,
  ClipboardCheck,
  Sparkles,
  GraduationCap,
  ShieldAlert,
  CalendarDays,
  Activity,
  Medal,
  School,
  User,
  FileSpreadsheet,
  Share2,
  ChevronLeft,
  ChevronRight,
  Triangle,
  ArrowLeftRight,
  History,
  Home,
  MapPin,
  Briefcase,
  HeartPulse,
  UserPlus,
  Hammer,
  MessageSquare,
  FileSearch,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

const UserPlusIcon = UserPlus;

type DataCategory =
  | "students"
  | "teachers"
  | "violations"
  | "substitutions"
  | "special_reports"
  | "staff_followup";
type TimeRange = "daily" | "weekly" | "monthly" | "custom" | "all";

interface CardConfig {
  id: number;
  category: DataCategory;
  subType: string;
  subSubTypes: string[];
}

const Dashboard: React.FC<{
  setView?: (v: string) => void;
  recentActions?: any[];
}> = ({ setView, recentActions = [] }) => {
  const {
    lang,
    data,
    userFilter,
    dateRange: globalDateRange,
    setDateRange: setGlobalDateRange,
    setDashboardFilter,
    currentUser,
    globalDataFilters,
    effectiveUserIds,
    getReportMessageFooter,
    shareViaWhatsApp,
  } = useGlobal();

  const today = new Date().toISOString().split("T")[0];
  const [globalTimeRange, setGlobalTimeRange] = useState<TimeRange>("all");
  const [dateRange, setDateRange] = useState({ start: today, end: today });

  // Sync global date range to local state if it's set
  useEffect(() => {
    if (globalDateRange.from || globalDateRange.to) {
      setDateRange({
        start: globalDateRange.from || today,
        end: globalDateRange.to || today,
      });

      // Check if it matches predefined ranges
      const from = globalDateRange.from;
      const to = globalDateRange.to;

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split("T")[0];

      const firstDay = new Date();
      firstDay.setDate(1);
      const firstDayStr = firstDay.toISOString().split("T")[0];

      if (from === today && to === today) {
        setGlobalTimeRange("daily");
      } else if (from === lastWeekStr && to === today) {
        setGlobalTimeRange("weekly");
      } else if (from === firstDayStr && to === today) {
        setGlobalTimeRange("monthly");
      } else {
        setGlobalTimeRange("custom");
      }
    } else {
      setGlobalTimeRange("all");
    }
  }, [globalDateRange]);

  // Update global date range when local state changes
  const handleTimeRangeChange = (t: TimeRange) => {
    setGlobalTimeRange(t);
    if (t === "all") {
      setGlobalDateRange({ from: "", to: "" });
    } else if (t === "daily") {
      setGlobalDateRange({ from: today, to: today });
    } else if (t === "weekly") {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      setGlobalDateRange({
        from: lastWeek.toISOString().split("T")[0],
        to: today,
      });
    } else if (t === "monthly") {
      const firstDay = new Date();
      firstDay.setDate(1);
      setGlobalDateRange({
        from: firstDay.toISOString().split("T")[0],
        to: today,
      });
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setDateRange({ start, end });
    setGlobalDateRange({ from: start, to: end });
  };

  const [cycleIndex, setCycleIndex] = useState(0);
  const [cycleDuration, setCycleDuration] = useState(5000);
  const [cardOffsets, setCardOffsets] = useState<Record<number, number>>({});

  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const checkPerm = (
    permValue: boolean | string[] | undefined,
    legacySubPerm?: string,
  ): boolean => {
    if (isGeneralSupervisor) return true;
    if (permValue === undefined) return false;
    if (permValue === true) return true;
    if (permValue === false) return false;
    if (Array.isArray(permValue)) {
      if (permValue.length === 0) return false;
      if (permValue.includes("view")) return true;
      if (legacySubPerm && permValue.includes(legacySubPerm)) return true;
      return false;
    }
    return false;
  };

  const mainCategories = [
    ...(checkPerm(currentUser?.permissions?.studentAffairs)
      ? [
          {
            id: "students",
            label: "تقارير الطلاب",
            icon: <GraduationCap className="text-blue-500" />,
            view: "studentReports",
          },
        ]
      : []),
    ...(checkPerm(currentUser?.permissions?.dailyFollowUp)
      ? [
          {
            id: "teachers",
            label: "متابعة المعلمين",
            icon: <UserCheck className="text-emerald-500" />,
            view: "daily",
          },
        ]
      : []),
    ...(checkPerm(currentUser?.permissions?.studentAffairs)
      ? [
          {
            id: "violations",
            label: "التعهدات والمخالفات",
            icon: <ShieldAlert className="text-red-500" />,
            view: "violations",
          },
        ]
      : []),
    ...(checkPerm(currentUser?.permissions?.specialReports)
      ? [
          {
            id: "special_reports",
            label: "التقارير الخاصة",
            icon: <FileText className="text-orange-500" />,
            view: "specialReports",
          },
        ]
      : []),
    ...(checkPerm(currentUser?.permissions?.substitutions)
      ? [
          {
            id: "substitutions",
            label: "جدول التغطية",
            icon: <UserPlusIcon className="text-purple-500" />,
            view: "substitute",
          },
        ]
      : []),
    ...(checkPerm(currentUser?.permissions?.adminFollowUp)
      ? [
          {
            id: "staff_followup",
            label: "متابعة الموظفين",
            icon: <ClipboardCheck className="text-indigo-500" />,
            view: "staffFollowUp",
          },
        ]
      : []),
  ];

  const getSubTypes = (category: DataCategory) => {
    switch (category) {
      case "students":
        return [
          { id: "all", label: "جميع الحقول", icon: <Users size={12} /> },
          { id: "address", label: "السكن", icon: <MapPin size={12} /> },
          { id: "workOutside", label: "العمل", icon: <Briefcase size={12} /> },
          {
            id: "healthStatus",
            label: "الحالة الصحية",
            icon: <HeartPulse size={12} />,
          },
          {
            id: "academicReading",
            label: "القراءة",
            icon: <BookOpen size={12} />,
          },
          {
            id: "academicWriting",
            label: "الكتابة",
            icon: <FileText size={12} />,
          },
          {
            id: "academicParticipation",
            label: "المشاركة الأكاديمية",
            icon: <Star size={12} />,
          },
          {
            id: "behaviorLevel",
            label: "المستوى السلوكي",
            icon: <Activity size={12} />,
          },
          {
            id: "mainNotes",
            label: "الملاحظات الأساسية",
            icon: <AlertTriangle size={12} />,
          },
          {
            id: "guardianFollowUp",
            label: "متابعة ولي الأمر",
            icon: <UserPlus size={12} />,
          },
          {
            id: "guardianCooperation",
            label: "تعاون ولي الأمر",
            icon: <UserPlus size={12} />,
          },
          {
            id: "absenceSummary",
            label: "الغياب اليومي",
            icon: <UserX size={12} />,
          },
          { id: "latenessSummary", label: "التأخر", icon: <Clock size={12} /> },
          {
            id: "exitSummary",
            label: "خروج طالب",
            icon: <UserPlusIcon size={12} />,
          },
          {
            id: "violationSummary",
            label: "المخالفات الطلابية",
            icon: <ShieldAlert size={12} />,
          },
          {
            id: "damageSummary",
            label: "الإتلاف المدرسي",
            icon: <Hammer size={12} />,
          },
          {
            id: "notes",
            label: "ملاحظات أخرى",
            icon: <MessageSquare size={12} />,
          },
        ];
      case "teachers": {
        const activeBranch = globalDataFilters?.branches?.[0];
        const activeSchool = globalDataFilters?.schools?.[0];
        const key =
          activeSchool && activeBranch
            ? `${activeSchool}_${activeBranch}`
            : null;
        const currentMetrics =
          key && data.branchMetrics?.[key]
            ? data.branchMetrics[key]
            : data.metricsList || [];
        return [
          { id: "all", label: "الكل", icon: <Users size={12} /> },
          ...currentMetrics.map((m) => ({
            id: m.key,
            label: m.label,
            icon: <Activity size={12} />, // Default icon for dynamic metrics
          })),
        ];
      }
      case "special_reports":
        return [
          { id: "all", label: "جميع التقارير", icon: <History size={12} /> },
          {
            id: "supervisor",
            label: "المشرف الإداري",
            icon: <Briefcase size={12} />,
          },
          { id: "staff", label: "الكادر التعليمي", icon: <Users size={12} /> },
          {
            id: "students_sr",
            label: "الطلاب/ الطالبات",
            icon: <GraduationCap size={12} />,
          },
          {
            id: "tests",
            label: "تقارير الاختبار",
            icon: <FileSearch size={12} />,
          },
        ];
      case "substitutions":
        return [
          { id: "all", label: "الكل", icon: <UserPlusIcon size={12} /> },
          { id: "pending", label: "قيد التغطية", icon: <Clock size={12} /> },
          {
            id: "paid",
            label: "تمت التغطية",
            icon: <CheckCircle2 size={12} />,
          },
        ];
      case "staff_followup":
        return [
          { id: "all", label: "الكل", icon: <Users size={12} /> },
          ...(data.adminFollowUpTypes || []).map((t) => ({
            id: t,
            label: t,
            icon: <ClipboardCheck size={12} />,
          })),
        ];
      default:
        return [{ id: "all", label: "الكل", icon: <Users size={12} /> }];
    }
  };

  const getSubSubTypes = (category: DataCategory, subType: string) => {
    if (category === "teachers") {
      return [
        { id: "highest", label: "الأعلى تقييما" },
        { id: "lowest", label: "الأدنى تقييما" },
        { id: "ممتاز", label: "ممتاز" },
        { id: "متوسط", label: "متوسط" },
        { id: "جيد", label: "جيد" },
        { id: "ضعيف", label: "ضعيف" },
        { id: "ضعيف جدا", label: "ضعيف جدا" },
      ];
    }

    const commonRatings = [
      { id: "ممتاز", label: "ممتاز" },
      { id: "جيد جدا", label: "جيد جدا" },
      { id: "جيد", label: "جيد" },
      { id: "متوسط", label: "متوسط" },
      { id: "مقبول", label: "مقبول" },
      { id: "ضعيف", label: "ضعيف" },
      { id: "ضعيف جدا", label: "ضعيف جدا" },
    ];

    if (
      [
        "behaviorLevel",
        "academicReading",
        "academicWriting",
        "academicParticipation",
      ].includes(subType)
    ) {
      return commonRatings;
    }

    if (subType === "healthStatus") {
      return [
        { id: "ممتاز", label: "ممتاز" },
        { id: "مريض", label: "مريض" },
      ];
    }
    if (subType === "workOutside") {
      return [
        { id: "لا يعمل", label: "لا يعمل" },
        { id: "يعمل", label: "يعمل" },
      ];
    }
    if (["guardianFollowUp", "guardianCooperation"].includes(subType)) {
      return [
        { id: "ممتازة", label: "ممتازة" },
        { id: "متوسطة", label: "متوسطة" },
        { id: "ضعيفة", label: "ضعيفة" },
        { id: "عدواني", label: "عدواني" },
      ];
    }

    if (
      [
        "absenceSummary",
        "latenessSummary",
        "exitSummary",
        "violationSummary",
        "damageSummary",
      ].includes(subType)
    ) {
      return [
        { id: "has_data", label: "يوجد سجلات" },
        { id: "no_data", label: "لا يوجد" },
      ];
    }

    if (subType === "mainNotes") {
      return [
        { id: "ممتاز", label: "ممتاز" },
        { id: "كثير الكلام", label: "كثير الكلام" },
        { id: "كثير الشغب", label: "كثير الشغب" },
        { id: "عدواني", label: "عدواني" },
        { id: "تطاول على معلم", label: "تطاول على معلم" },
        { id: "اعتداء على طالب جسدياً", label: "اعتداء على طالب جسدياً" },
        { id: "اعتداء على طالب لفظيا", label: "اعتداء على طالب لفظيا" },
        { id: "أخذ أدوات الغير دون أذنهم", label: "أخذ أدوات الغير دون أذنهم" },
        { id: "إتلاف ممتلكات طالب", label: "إتلاف ممتلكات طالب" },
        { id: "إتلاف ممتلكات المدرسة", label: "إتلاف ممتلكات المدرسة" },
      ];
    }

    switch (subType) {
      case "supervisor":
        return [
          { id: "الخطة الفصلية", label: "الخطة الفصلية" },
          { id: "الخلاصة الشهرية", label: "الخلاصة الشهرية" },
          { id: "المهام اليومية", label: "المهام اليومية" },
          { id: "أهم المشكلات اليومية", label: "أهم المشكلات اليومية" },
          { id: "احتياجات الدور", label: "احتياجات الدور" },
          {
            id: "سجل متابعة الدفاتر والتصحيح",
            label: "سجل متابعة الدفاتر والتصحيح",
          },
        ];
      case "staff":
        return [
          { id: "سجل الإبداع والتميز", label: "سجل الإبداع والتميز" },
          { id: "المخالفات", label: "المخالفات" },
          { id: "التعميمات", label: "التعميمات" },
        ];
      case "students_sr":
        return [
          { id: "الغياب اليومي", label: "الغياب اليومي" },
          { id: "التأخر", label: "التأخر" },
          { id: "خروج طالب أثناء الدراسة", label: "خروج طالب أثناء الدراسة" },
          { id: "المخالفات الطلابية", label: "المخالفات الطلابية" },
          { id: "سجل الإتلاف المدرسي", label: "سجل الإتلاف المدرسي" },
          {
            id: "سجل زيارة أولياء الأمور والتواصل بهم",
            label: "زيارات أولياء الأمور",
          },
        ];
      case "tests":
        return [
          { id: "الاختبار الشهري", label: "الاختبار الشهري" },
          { id: "الاختبار الفصلي", label: "الاختبار الفصلي" },
        ];
      default:
        return [];
    }
  };

  const processedData = useMemo(() => {
    const isGeneralSupervisor =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    const allowedIds = effectiveUserIds || [currentUser?.id];
    const userGrades = currentUser?.grades || [];
    const userSections = currentUser?.sections || [];
    const userSchools = currentUser?.selectedSchool?.split(",").map((s) => s.trim()) || [];

    const userSchoolArr =
      currentUser?.selectedSchool?.split(",").map((s) => s.trim()) || [];
    const defaultSchool =
      userSchoolArr.length === 1 && userSchoolArr[0] !== "all"
        ? userSchoolArr[0]
        : null;
    const activeSchool = globalDataFilters?.schools?.[0] || defaultSchool;

    const userBranches = activeSchool
      ? currentUser?.permissions?.schoolsAndBranches?.[activeSchool] || []
      : [];
    const defaultBranch = userBranches.length === 1 ? userBranches[0] : null;
    const activeBranch = globalDataFilters?.branches?.[0] || defaultBranch;

    // Check if the current user has permission over a specific item based on their assignments
    const canSeeStudent = (s: any, secMatch?: any) => {
      if (!secMatch) return false; // MUST have record in secretariat!

      // Strict school context filter
      if (activeSchool) {
        if (!secMatch.school || String(secMatch.school).trim() !== String(activeSchool).trim()) {
          return false;
        }
      } else if (userSchools.length > 0 && !userSchools.includes("all")) {
        if (!secMatch.school || !userSchools.includes(String(secMatch.school).trim())) {
          return false;
        }
      }

      // Strict branch context filter
      if (activeBranch) {
        if (!secMatch.branch || String(secMatch.branch).trim() !== String(activeBranch).trim()) {
          return false;
        }
      } else if (activeSchool && currentUser?.permissions?.schoolsAndBranches) {
        const allowedBranches = currentUser.permissions.schoolsAndBranches[activeSchool] || [];
        if (allowedBranches.length > 0 && (!secMatch.branch || !allowedBranches.includes(String(secMatch.branch).trim()))) {
          return false;
        }
      }

      if (isGeneralSupervisor) return true;
      let ok = true;
      
      const grade = secMatch?.grade || s.grade;
      if (userGrades.length > 0 && grade && !userGrades.includes(grade)) ok = false;
      
      const section = secMatch?.section || s.section;
      if (userSections.length > 0 && section && !userSections.includes(section)) ok = false;
      
      const uid = s.userId || s._ownerId;
      if (uid && !allowedIds.includes(uid)) ok = false;
      
      return ok;
    };

    const canSeeTeacher = (t: any, secMatch?: any) => {
      if (!secMatch) return false; // MUST have record in secretariat staff!

      // Filter by teacher job titles
      const TEACHER_JOB_TITLES = ["معلم مادة", "معلم فنية", "مربية"];
      const sTitles = Array.isArray(secMatch.jobTitles) ? secMatch.jobTitles : [];
      const isTeacher = sTitles.some((title: string) => TEACHER_JOB_TITLES.includes(title));
      if (!isTeacher) return false;

      // Strict school context filter
      if (activeSchool) {
        if (!secMatch.school || String(secMatch.school).trim() !== String(activeSchool).trim()) {
          return false;
        }
      } else if (userSchools.length > 0 && !userSchools.includes("all")) {
        if (!secMatch.school || !userSchools.includes(String(secMatch.school).trim())) {
          return false;
        }
      }

      // Strict branch context filter
      if (activeBranch) {
        if (!secMatch.branch || String(secMatch.branch).trim() !== String(activeBranch).trim()) {
          return false;
        }
      } else if (activeSchool && currentUser?.permissions?.schoolsAndBranches) {
        const allowedBranches = currentUser.permissions.schoolsAndBranches[activeSchool] || [];
        if (allowedBranches.length > 0 && (!secMatch.branch || !allowedBranches.includes(String(secMatch.branch).trim()))) {
          return false;
        }
      }

      const isAdminOrFull =
        currentUser?.role === "admin" ||
        currentUser?.permissions?.all === true ||
        currentUser?.permissions?.specialCodes === true ||
        (Array.isArray(currentUser?.permissions?.specialCodes) &&
          currentUser.permissions.specialCodes.length > 0) ||
        currentUser?.permissions?.userManagement === true ||
        (Array.isArray(currentUser?.permissions?.userManagement) &&
          currentUser.permissions.userManagement.length > 0);

      if (isAdminOrFull) return true;

      let ok = true;
      if (currentUser?.permissions?.schoolsAndBranches) {
        const branchesForSchool =
          currentUser.permissions.schoolsAndBranches[secMatch.school] || [];
        if (
          branchesForSchool.length > 0 &&
          secMatch.branch &&
          !branchesForSchool.includes(secMatch.branch)
        )
          ok = false;
      }

      if (
        currentUser?.grades &&
        currentUser.grades.length > 0 &&
        secMatch.grades &&
        secMatch.grades.length > 0
      ) {
        if (!secMatch.grades.some((g: string) => currentUser.grades!.includes(g)))
          ok = false;
      }

      if (
        currentUser?.sections &&
        currentUser.sections.length > 0 &&
        secMatch.classes &&
        secMatch.classes.length > 0
      ) {
        if (!secMatch.classes.some((c: string) => currentUser.sections!.includes(c)))
          ok = false;
      }

      const uid = t.userId || t._ownerId;
      if (uid && !allowedIds.includes(uid)) {
        ok = false;
      }

      return ok;
    };

    // Pre-merge students using O(1) Set lookup
    let mergedStudents = [...(data.studentReports || [])];
    const existingStudentIds = new Set(mergedStudents.map((r) => r.id).filter(Boolean));
    
    (data.secretariatStudents || []).forEach((s: any) => {
      if (s && s.id && !existingStudentIds.has(s.id)) {
        mergedStudents.push({
          id: s.id,
          name: s.name || "",
          gender: s.gender || "",
          grade: s.grade || "",
          section: s.section || "",
        } as any);
        existingStudentIds.add(s.id);
      }
    });

    // Create a fast lookup map for secretariatStudents by ID and by Name
    const secStudentsById = new Map<string, any>();
    const secStudentsByName = new Map<string, any>();
    (data.secretariatStudents || []).forEach((ss: any) => {
      if (ss) {
        if (ss.id) secStudentsById.set(String(ss.id), ss);
        if (ss.name) secStudentsByName.set(String(ss.name).trim(), ss);
      }
    });

    // Apply baseline authorization filter for students with O(1) lookups
    mergedStudents = mergedStudents.filter((s) => {
      const sId = s.id ? String(s.id) : "";
      const sName = s.name ? String(s.name).trim() : "";
      const secMatch = (sId && secStudentsById.get(sId)) || (sName && secStudentsByName.get(sName));
      return canSeeStudent(s, secMatch);
    });

    if (globalDataFilters) {
      mergedStudents = mergedStudents.filter((s) => {
        let ok = true;
        const sId = s.id ? String(s.id) : "";
        const sName = s.name ? String(s.name).trim() : "";
        const secMatch = (sId && secStudentsById.get(sId)) || (sName && secStudentsByName.get(sName));
        if (secMatch) {
          const grade = secMatch?.grade || s.grade;
          if (
            globalDataFilters.grades.length > 0 &&
            grade &&
            !globalDataFilters.grades.includes(String(grade).trim())
          )
            ok = false;
            
          const section = secMatch?.section || s.section;
          if (
            globalDataFilters.sections.length > 0 &&
            section &&
            !globalDataFilters.sections.includes(String(section).trim())
          )
            ok = false;
        }
        return ok;
      });
    }

    // Convert logs into Sets containing unique studentIds to avoid O(N * M) nested some loops
    const studentsWithAbsence = new Set((data.absenceLogs || []).map((l) => l.studentId).filter(Boolean));
    const studentsWithLateness = new Set((data.studentLatenessLogs || []).map((l) => l.studentId).filter(Boolean));
    const studentsWithExit = new Set((data.exitLogs || []).map((l) => l.studentId).filter(Boolean));
    const studentsWithViolation = new Set((data.studentViolationLogs || []).map((l) => l.studentId).filter(Boolean));
    const studentsWithDamage = new Set((data.damageLogs || []).map((l) => l.studentId).filter(Boolean));

    const results: Record<string, any[]> = {
      students: mergedStudents.map((s) => {
        const hasAbsence = studentsWithAbsence.has(s.id);
        const hasLateness = studentsWithLateness.has(s.id);
        const hasExit = studentsWithExit.has(s.id);
        const hasViolation = studentsWithViolation.has(s.id);
        const hasDamage = studentsWithDamage.has(s.id);

        return {
          ...s,
          displayName: s.name,
          type: "student",
          absenceSummary: hasAbsence ? "has_data" : "",
          latenessSummary: hasLateness ? "has_data" : "",
          exitSummary: hasExit ? "has_data" : "",
          violationSummary: hasViolation ? "has_data" : "",
          damageSummary: hasDamage ? "has_data" : "",
        };
      }),
      teachers: (() => {
        const TEACHER_JOB_TITLES = ["معلم مادة", "معلم فنية", "مربية"];
        let secretariatStaff: any[] = data.secretariatStaff || [];
        
        // Fast Map for secretariatStaff lookup by id and/or name
        const staffById = new Map<string, any>();
        const staffByName = new Map<string, any>();
        secretariatStaff.forEach((ss: any) => {
          if (ss) {
            if (ss.id) staffById.set(String(ss.id), ss);
            if (ss.name) staffByName.set(String(ss.name).trim(), ss);
          }
        });

        // 1. Filter secretariatStaff to get only authorized teachers
        let validStaff = secretariatStaff.filter((s) => {
          // Filter by teacher job titles
          const sTitles = Array.isArray(s.jobTitles) ? s.jobTitles : [];
          const isTeacher = sTitles.some((title: string) => TEACHER_JOB_TITLES.includes(title));
          if (!isTeacher) return false;

          // Strict school context filter
          if (activeSchool) {
            if (!s.school || String(s.school).trim() !== String(activeSchool).trim()) {
              return false;
            }
          } else if (userSchools.length > 0 && !userSchools.includes("all")) {
            if (!s.school || !userSchools.includes(String(s.school).trim())) {
              return false;
            }
          }

          // Strict branch context filter
          if (activeBranch) {
            if (!s.branch || String(s.branch).trim() !== String(activeBranch).trim()) {
              return false;
            }
          } else if (activeSchool && currentUser?.permissions?.schoolsAndBranches) {
            const allowedBranches = currentUser.permissions.schoolsAndBranches[activeSchool] || [];
            if (allowedBranches.length > 0 && (!s.branch || !allowedBranches.includes(String(s.branch).trim()))) {
              return false;
            }
          }

          let ok = true;
          if (globalDataFilters) {
            if (
              globalDataFilters.grades.length > 0 &&
              s.grades &&
              s.grades.length > 0
            ) {
              if (
                !s.grades.some((g: string) =>
                  globalDataFilters.grades.includes(String(g).trim()),
                )
              )
                ok = false;
            }
          }
          if (!ok) return false;

          const isAdminOrFull =
            currentUser?.role === "admin" ||
            currentUser?.permissions?.all === true ||
            currentUser?.permissions?.specialCodes === true ||
            (Array.isArray(currentUser?.permissions?.specialCodes) &&
              currentUser.permissions.specialCodes.length > 0) ||
            currentUser?.permissions?.userManagement === true ||
            (Array.isArray(currentUser?.permissions?.userManagement) &&
              currentUser.permissions.userManagement.length > 0);

          if (isAdminOrFull) return true;

          if (currentUser?.permissions?.schoolsAndBranches && ok) {
            const branchesForSchool =
              currentUser.permissions.schoolsAndBranches[s.school] || [];
            if (
              branchesForSchool.length > 0 &&
              s.branch &&
              !branchesForSchool.includes(s.branch)
            )
              ok = false;
          }
          if (
            currentUser?.grades &&
            currentUser.grades.length > 0 &&
            s.grades &&
            s.grades.length > 0
          ) {
            if (!s.grades.some((g: string) => currentUser.grades!.includes(g)))
              ok = false;
          }
          if (
            currentUser?.sections &&
            currentUser.sections.length > 0 &&
            s.classes &&
            s.classes.length > 0
          ) {
            if (!s.classes.some((c: string) => currentUser.sections!.includes(c)))
              ok = false;
          }
          return ok;
        });

        // Now map validStaff to their data
        const validTeacherNames = new Set(validStaff.map((vs) => String(vs.name).trim()).filter(Boolean));
        const validTeacherIds = new Set(validStaff.map((vs) => String(vs.id)).filter(Boolean));

        // Get daily report teacher rows, but ONLY for the valid teachers
        let mergedTeachers: any[] = [];
        (data.dailyReports || []).forEach((r) => {
          (r.teachersData || []).forEach((t) => {
            const tId = t.id ? String(t.id) : "";
            const tName = t.teacherName ? String(t.teacherName).trim() : "";
            if (validTeacherIds.has(tId) || validTeacherNames.has(tName)) {
              // Apply userId / _ownerId filters if not admin
              const isAdminOrFull =
                currentUser?.role === "admin" ||
                currentUser?.permissions?.all === true ||
                currentUser?.permissions?.specialCodes === true ||
                (Array.isArray(currentUser?.permissions?.specialCodes) &&
                  currentUser.permissions.specialCodes.length > 0) ||
                currentUser?.permissions?.userManagement === true ||
                (Array.isArray(currentUser?.permissions?.userManagement) &&
                  currentUser.permissions.userManagement.length > 0);

              let allowed = true;
              if (!isAdminOrFull) {
                const uid = t.userId || t._ownerId;
                if (uid && !allowedIds.includes(uid)) {
                  allowed = false;
                }
              }

              if (allowed) {
                mergedTeachers.push({
                  ...t,
                  date: r.dateStr,
                  displayName: t.teacherName,
                  type: "teacher",
                });
              }
            }
          });
        });

        // Add base teacher info for those that don't have reports in mergedTeachers
        const teacherNamesWithReports = new Set(mergedTeachers.map((mt) => String(mt.displayName).trim()).filter(Boolean));
        validStaff.forEach((st) => {
          const stName = st.name ? String(st.name).trim() : "";
          if (stName && !teacherNamesWithReports.has(stName)) {
            mergedTeachers.push({
              id: st.id,
              teacherName: st.name,
              displayName: st.name,
              type: "teacher",
              date: today,
            } as any);
            teacherNamesWithReports.add(stName);
          }
        });

        return mergedTeachers;
      })(),
    };

    // Extract valid names
    const validStudentNames = new Set(
      results.students.map((s: any) => s.displayName || s.name),
    );
    const validTeacherNames = new Set(
      results.teachers.map((t: any) => t.displayName || t.teacherName),
    );

    // Filter secondary lists
    results.violations = (data.violations || [])
      .map((v) => ({
        ...v,
        displayName: v.studentName || v.teacherName,
        type: "violation",
      }))
      .filter((v) => {
        if (v.type === "students") return validStudentNames.has(v.displayName);
        if (v.type === "teachers") return validTeacherNames.has(v.displayName);
        return true; // fallback
      });

    results.substitutions = (data.substitutions || [])
      .map((s) => ({
        ...s,
        displayName: s.absentTeacher,
        type: "substitution",
      }))
      .filter((s) => validTeacherNames.has(s.displayName));

    results.staff_followup = (data.adminReports || [])
      .flatMap((r) =>
        (r.employeesData || []).map((e) => ({
          ...e,
          displayName: e.employeeName,
          type: "staff_followup",
          followUpType: r.followUpType,
          date: r.dateStr,
        })),
      )
      .filter((e) => validTeacherNames.has(e.displayName));

    results.special_reports = [
      ...(data.absenceLogs || [])
        .filter((l) => validStudentNames.has(l.studentName))
        .map((l) => ({
          ...l,
          displayName: l.studentName,
          cat: "students_sr",
          sub: "الغياب اليومي",
          icon: <UserX size={12} />,
        })),
      ...(data.studentLatenessLogs || [])
        .filter((l) => validStudentNames.has(l.studentName))
        .map((l) => ({
          ...l,
          displayName: l.studentName,
          cat: "students_sr",
          sub: "التأخر",
          icon: <Clock size={12} />,
        })),
      ...(data.exitLogs || [])
        .filter((l) => validStudentNames.has(l.studentName))
        .map((l) => ({
          ...l,
          displayName: l.studentName,
          cat: "students_sr",
          sub: "خروج طالب أثناء الدراسة",
          icon: <UserPlusIcon size={12} />,
        })),
      ...(data.damageLogs || [])
        .filter((l) => validStudentNames.has(l.studentName))
        .map((l) => ({
          ...l,
          displayName: l.studentName,
          cat: "students_sr",
          sub: "سجل الإتلاف المدرسي",
          icon: <Hammer size={12} />,
        })),
      ...(data.studentViolationLogs || [])
        .filter((l) => validStudentNames.has(l.studentName))
        .map((l) => ({
          ...l,
          displayName: l.studentName,
          cat: "students_sr",
          sub: "المخالفات الطلابية",
          icon: <ShieldAlert size={12} />,
        })),
      ...(data.parentVisitLogs || [])
        .filter((l) => validStudentNames.has(l.studentName))
        .map((l) => ({
          ...l,
          displayName: l.studentName,
          cat: "students_sr",
          sub: "سجل زيارة أولياء الأمور والتواصل بهم",
          icon: <Users size={12} />,
        })),
      ...(data.genericSpecialReports || []).map((l) => ({
        ...l,
        displayName: l.title,
        cat:
          l.category === "supervisor"
            ? "supervisor"
            : l.category === "staff"
              ? "staff"
              : l.category === "tests"
                ? "tests"
                : "supervisor",
        sub: l.subCategory,
        icon: <FileText size={12} />,
      })),
      ...(data.addedTasks || []).flatMap((at) =>
        at.tasks.map((t) => ({
          ...t,
          date: at.dateStr,
          displayName: at.supervisorName,
          cat: "supervisor",
          sub: "المهام المضافة",
          icon: <FileText size={12} />,
        })),
      ),
      ...(data.postponedTasks || []).flatMap((at) =>
        at.tasks.map((t) => ({
          ...t,
          date: at.dateStr,
          displayName: at.supervisorName,
          cat: "supervisor",
          sub: "المهام المرحلة",
          icon: <FileText size={12} />,
        })),
      ),
    ];

    return results;
  }, [data, currentUser, globalDataFilters]);

  const [cards, setCards] = useState<CardConfig[]>(() => {
    const saved = null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const cats: DataCategory[] = [
      "students",
      "teachers",
      "violations",
      "special_reports",
      "substitutions",
      "students",
      "teachers",
      "special_reports",
    ];
    return cats.map((cat, i) => ({
      id: i + 1,
      category: cat,
      subType: "all",
      subSubTypes: [],
    }));
  });

  useEffect(() => {
    
  }, [cards]);

  useEffect(() => {
    const timer = setInterval(
      () => setCycleIndex((prev) => prev + 1),
      cycleDuration,
    );
    return () => clearInterval(timer);
  }, [cycleDuration]);

  const normalizeArabic = (str: string) => {
    if (!str) return "";
    return str
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  };

  const getFilteredListForCard = (card: CardConfig) => {
    let list = processedData[card.category] || [];
    const subSubOptions = getSubSubTypes(card.category, card.subType);

    if (card.category === "teachers") {
      const activeBranch = globalDataFilters?.branches?.[0];
      const activeSchool = globalDataFilters?.schools?.[0];
      const key =
        activeSchool && activeBranch ? `${activeSchool}_${activeBranch}` : null;
      const currentMetrics =
        key && data.branchMetrics?.[key]
          ? data.branchMetrics[key]
          : data.metricsList || [];
      const getTeacherMetricPercent = (
        teacher: any,
        metricKey: string,
        metricsList: any[],
      ) => {
        if (metricKey === "all") {
          let total = 0;
          let max = 0;
          metricsList.forEach((m) => {
            if (!(teacher.unaccreditedMetrics || []).includes(m.key)) {
              total += Number(teacher[m.key]) || 0;
              max += m.max || 10;
            }
          });
          return max > 0 ? (total / max) * 100 : 0;
        } else {
          const m = metricsList.find((x) => x.key === metricKey);
          if (!m || (teacher.unaccreditedMetrics || []).includes(metricKey))
            return undefined;
          const max = m.max || 10;
          return max > 0 ? ((Number(teacher[metricKey]) || 0) / max) * 100 : 0;
        }
      };

      if (card.subType !== "all") {
        // Must have data for this metric if a specific one is selected
        list = list.filter((i) => {
          const val = (i as any)[card.subType];
          return (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            val !== "0" &&
            val !== 0
          );
        });
      }

      // Filter and categorize by percentage
      list = list.filter((i) => {
        const pt = getTeacherMetricPercent(i, card.subType, currentMetrics);
        if (pt === undefined) return false;

        if (card.subSubTypes.length > 0) {
          const ratings = card.subSubTypes.filter((opt) =>
            ["ممتاز", "جيد", "متوسط", "ضعيف", "ضعيف جدا"].includes(opt),
          );
          if (ratings.length > 0) {
            const ratMatch = ratings.some((r) => {
              if (r === "ممتاز" && pt >= 90) return true;
              if (r === "جيد" && pt >= 75 && pt < 90) return true;
              if (r === "متوسط" && pt >= 60 && pt < 75) return true;
              if (r === "ضعيف" && pt >= 50 && pt < 60) return true;
              if (r === "ضعيف جدا" && pt < 50) return true;
              return false;
            });
            if (!ratMatch) return false;
          }
        }
        return true;
      });

      // Apply sorting
      if (card.subSubTypes.includes("highest")) {
        list = list.sort((a, b) => {
          const pa =
            getTeacherMetricPercent(a, card.subType, currentMetrics) || 0;
          const pb =
            getTeacherMetricPercent(b, card.subType, currentMetrics) || 0;
          return pb - pa;
        });
      } else if (card.subSubTypes.includes("lowest")) {
        list = list.sort((a, b) => {
          const pa =
            getTeacherMetricPercent(a, card.subType, currentMetrics) || 0;
          const pb =
            getTeacherMetricPercent(b, card.subType, currentMetrics) || 0;
          return pa - pb;
        });
      }
    } else if (card.category === "special_reports") {
      if (card.subType !== "all") {
        list = list.filter((i) => i.cat === card.subType);

        // Filter by specific sub-report title if subSubTypes selected
        if (card.subSubTypes.length > 0) {
          list = list.filter((i) => card.subSubTypes.includes(i.sub));
        }
      }
    } else if (card.subType !== "all") {
      if (card.category === "substitutions") {
        list = list.filter((i) => i.paymentStatus === card.subType);
      } else if (card.category === "students") {
        // Only show items where this specific metric has data
        list = list.filter((i) => {
          const val = (i as any)[card.subType];
          return (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            val !== "0" &&
            val !== 0
          );
        });

        if (subSubOptions.length > 0 && card.subSubTypes.length > 0) {
          list = list.filter((i) => {
            const val = String((i as any)[card.subType] || "");
            if (
              card.subSubTypes.includes("has_data") &&
              val !== "" &&
              val !== "undefined"
            )
              return true;
            if (
              card.subSubTypes.includes("no_data") &&
              (val === "" || val === "undefined")
            )
              return true;
            return card.subSubTypes.some((selected) => {
              if (selected === "has_data" || selected === "no_data")
                return false;
              if (Array.isArray((i as any)[card.subType])) {
                return (i as any)[card.subType].some(
                  (v: string) =>
                    normalizeArabic(v) === normalizeArabic(selected),
                );
              }
              const normalizedVal = normalizeArabic(val);
              const normalizedSelected = normalizeArabic(selected);
              return (
                normalizedVal === normalizedSelected ||
                val
                  .split(", ")
                  .some((v) => normalizeArabic(v) === normalizedSelected)
              );
            });
          });
        }
      } else if (card.category === "staff_followup") {
        if (card.subType !== "all") {
          list = list.filter((i) => i.followUpType === card.subType);
        }
      } else if (card.category === "violations") {
        // If needed, add specific violation filters here
      }
    }
    return list;
  };

  useEffect(() => {
    setCardOffsets((prev) => {
      const nextOffsets = { ...prev };
      cards.forEach((card) => {
        const list = getFilteredListForCard(card);
        if (list.length > 3) {
          const current = nextOffsets[card.id] || 0;
          let next = current + 3;
          if (next >= list.length) next = 0;
          nextOffsets[card.id] = next;
        }
      });
      return nextOffsets;
    });
  }, [cycleIndex, processedData, cards]);

  const updateCard = (id: number, updates: Partial<CardConfig>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
    setCardOffsets((prev) => ({ ...prev, [id]: 0 }));
  };

  const toggleSubSubValue = (cardId: number, value: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          const current = c.subSubTypes;
          const updated = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
          return { ...c, subSubTypes: updated };
        }
        return c;
      }),
    );
    setCardOffsets((prev) => ({ ...prev, [cardId]: 0 }));
  };

  const shiftCardData = (
    cardId: number,
    direction: "prev" | "next",
    max: number,
  ) => {
    setCardOffsets((prev) => {
      const current = prev[cardId] || 0;
      let next = direction === "next" ? current + 3 : current - 3;
      if (next < 0) next = Math.max(0, (Math.ceil(max / 3) - 1) * 3);
      if (next >= max) next = 0;
      return { ...prev, [cardId]: next };
    });
  };

  const handleExportExcel = (title: string, list: any[], card?: CardConfig) => {
    const worksheet = XLSX.utils.json_to_sheet(
      list.map((item) => {
        let stateVal = item.sub || item.stype || "---";
        if (card && card.subType !== "all") {
          const val = (item as any)[card.subType];
          if (Array.isArray(val)) stateVal = val.join("، ");
          else if (val !== undefined && val !== null) stateVal = String(val);
        }
        return {
          الاسم: item.displayName,
          الحالة: stateVal,
          تاريخ: item.date || item.createdAt || "---",
        };
      }),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${title}_Report.xlsx`);
  };

  const handleExportWhatsApp = (title: string, list: any[]) => {
    let msg = `*📋 تقرير داشبورد: ${title}*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;

    list.slice(0, 15).forEach((item, idx) => {
      const isBad =
        (item.behaviorLevel &&
          (item.behaviorLevel.includes("ضعيف") ||
            item.behaviorLevel.includes("مخالفة"))) ||
        (item.academicReading && item.academicReading.includes("ضعيف")) ||
        item.stype === "absences" ||
        item.violations_score > 0;

      const emoji = isBad ? "🔴" : "🔹";
      msg += `*${emoji} (${idx + 1}) الاسم:* ${item.displayName}\n`;
      if (item.grade)
        msg += `📍 *الصف:* ${item.grade} / ${item.section || ""}\n`;
      if (item.sub || item.stype)
        msg += `🏷️ *النوع:* _${item.sub || item.stype}_\n`;
      if (isBad) msg += `⚠️ *ملاحظة:* يرجى المتابعة العاجلة\n`;
      msg += `\n`;
    });
    msg += `----------------------------------\n`;
    msg += `${getReportMessageFooter()}\n`;

    shareViaWhatsApp(msg);
  };

  const cardColors = [
    {
      gradient: "linear-gradient(135deg, #f0f9ff 50%, #e0f2fe 50%)",
      text: "text-sky-700",
      border: "border-sky-200",
      accent: "bg-sky-600",
    },
    {
      gradient: "linear-gradient(135deg, #f0fdf4 50%, #dcfce7 50%)",
      text: "text-emerald-700",
      border: "border-emerald-200",
      accent: "bg-emerald-600",
    },
    {
      gradient: "linear-gradient(135deg, #faf5ff 50%, #f3e8ff 50%)",
      text: "text-purple-700",
      border: "border-purple-200",
      accent: "bg-purple-600",
    },
    {
      gradient: "linear-gradient(135deg, #fff7ed 50%, #ffedd5 50%)",
      text: "text-orange-700",
      border: "border-orange-200",
      accent: "bg-orange-600",
    },
    {
      gradient: "linear-gradient(135deg, #f5f3ff 50%, #ede9fe 50%)",
      text: "text-indigo-700",
      border: "border-indigo-200",
      accent: "bg-indigo-600",
    },
    {
      gradient: "linear-gradient(135deg, #fdf2f8 50%, #fce7f3 50%)",
      text: "text-pink-700",
      border: "border-pink-200",
      accent: "bg-pink-600",
    },
    {
      gradient: "linear-gradient(135deg, #f0fdfa 50%, #ccfbf1 50%)",
      text: "text-teal-700",
      border: "border-teal-200",
      accent: "bg-teal-600",
    },
    {
      gradient: "linear-gradient(135deg, #fefce8 50%, #fef9c3 50%)",
      text: "text-yellow-700",
      border: "border-yellow-200",
      accent: "bg-yellow-600",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-arabic pb-20">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Sparkles className="text-blue-600 animate-pulse" />
            لوحة التحكم الذكية
          </h2>
          <p className="text-slate-500 font-bold mt-1 text-xs">
            أتمتة ذكية ومتابعة مرئية لكافة المعايير
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border shadow-sm">
            <History className="w-4 h-4 text-blue-500" />
            <select
              value={cycleDuration}
              onChange={(e) => setCycleDuration(Number(e.target.value))}
              className="text-[10px] font-black bg-transparent outline-none cursor-pointer"
            >
              <option value={3000}>3 ثوانٍ</option>
              <option value={5000}>5 ثوانٍ</option>
              <option value={10000}>10 ثوانٍ</option>
            </select>
          </div>

          <div className="flex gap-1 bg-white p-1 rounded-2xl border shadow-inner">
            {["all", "daily", "weekly", "monthly", "custom"].map((t) => (
              <button
                key={t}
                onClick={() => handleTimeRangeChange(t as any)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${globalTimeRange === t ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}
              >
                {t === "all"
                  ? "الكل"
                  : t === "daily"
                    ? "يومية"
                    : t === "weekly"
                      ? "أسبوعية"
                      : t === "monthly"
                        ? "شهرية"
                        : "مخصص"}
              </button>
            ))}
          </div>

          {globalTimeRange === "custom" && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border shadow-sm animate-in slide-in-from-right-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  handleCustomDateChange(e.target.value, dateRange.end)
                }
                className="text-[9px] font-black outline-none bg-transparent"
              />
              <span className="text-slate-200">|</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  handleCustomDateChange(dateRange.start, e.target.value)
                }
                className="text-[9px] font-black outline-none bg-transparent"
              />
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const list = getFilteredListForCard(card);
          const count = list.length;
          const currentCat = mainCategories.find((c) => c.id === card.category);
          const currentSub = getSubTypes(card.category).find(
            (s) => s.id === card.subType,
          );
          const subSubOptions = getSubSubTypes(card.category, card.subType);
          const design = cardColors[idx % cardColors.length];
          const offset = cardOffsets[card.id] || 0;
          const visibleItems = list.slice(offset, offset + 3);

          return (
            <div
              key={card.id}
              className={`rounded-[2.5rem] border-2 ${design.border} p-4 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group flex flex-col gap-1.5 relative overflow-visible h-[340px] mt-6`}
              style={{ background: design.gradient }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30">
                <div
                  className={`w-14 h-14 rounded-full border-4 border-white flex items-center justify-center font-black text-2xl text-white shadow-xl ${design.accent}`}
                >
                  {count}
                </div>
              </div>

              <div className="absolute top-4 left-4 z-40 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() =>
                    handleExportWhatsApp(
                      currentSub?.label || currentCat?.label || "تقرير",
                      list,
                    )
                  }
                  className="p-1 bg-white/80 rounded-lg text-green-600 shadow-sm hover:bg-white"
                >
                  <Share2 size={12} />
                </button>
                <button
                  onClick={() =>
                    handleExportExcel(
                      currentSub?.label || currentCat?.label || "تقرير",
                      list,
                      card,
                    )
                  }
                  className="p-1 bg-white/80 rounded-lg text-blue-600 shadow-sm hover:bg-white"
                >
                  <FileSpreadsheet size={12} />
                </button>
              </div>

              <div className="flex flex-col gap-1 relative z-10 pt-4 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1.5 rounded-xl bg-white shadow-md transform group-hover:rotate-12 transition-transform`}
                    >
                      {currentCat?.icon &&
                        React.cloneElement(
                          currentCat.icon as React.ReactElement<any>,
                          { size: 14 },
                        )}
                    </div>
                    <select
                      value={card.category}
                      onChange={(e) =>
                        updateCard(card.id, {
                          category: e.target.value as DataCategory,
                          subType: "all",
                          subSubTypes: [],
                        })
                      }
                      className={`text-[9px] font-black bg-white ${design.text} rounded-lg px-2 py-1 outline-none border-none cursor-pointer shadow-sm hover:bg-slate-50 transition-colors uppercase tracking-wider`}
                    >
                      {mainCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md p-0.5 rounded-lg border border-white/40 shadow-inner">
                    <div className={`p-1 rounded bg-white shadow-sm`}>
                      {currentSub?.icon}
                    </div>
                    <select
                      value={card.subType}
                      onChange={(e) =>
                        updateCard(card.id, {
                          subType: e.target.value,
                          subSubTypes: [],
                        })
                      }
                      className={`text-[9px] font-bold ${design.text} bg-transparent outline-none w-full cursor-pointer`}
                    >
                      {getSubTypes(card.category).map((sub, sIdx) => (
                        <option key={`${sub.id}-${sIdx}`} value={sub.id}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subSubOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 p-1 bg-white/30 rounded-xl max-h-12 overflow-y-auto scrollbar-hide">
                      {subSubOptions.map((ss, ssIdx) => (
                        <button
                          key={`${ss.id}-${ssIdx}`}
                          onClick={() => toggleSubSubValue(card.id, ss.id)}
                          className={`px-2 py-0.5 rounded-full text-[7px] font-black transition-all border ${card.subSubTypes.includes(ss.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white/50 text-slate-500 border-white/20 hover:bg-white"}`}
                        >
                          {ss.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1.5 py-1.5 relative z-10 overflow-hidden">
                {count === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                    <History size={20} className="opacity-20" />
                    <span className="italic text-[8px] font-bold">
                      لا توجد بيانات
                    </span>
                  </div>
                ) : (
                  visibleItems.map((item, i) => (
                    <div
                      key={`${card.id}-${offset}-${i}`}
                      onClick={() => {
                        if (currentCat?.view) {
                          setDashboardFilter({
                            view: currentCat.view,
                            filterValue: item.displayName,
                          });
                          setView?.(currentCat.view);
                        }
                      }}
                      className="bg-white/95 backdrop-blur-sm px-3 rounded-2xl border border-white shadow-sm flex items-center gap-3 hover:bg-white hover:shadow-xl hover:-translate-x-1 cursor-pointer transition-all animate-in slide-in-from-right-2 fade-in duration-300 h-[60px]"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm bg-slate-50 border-2 border-slate-100 flex-shrink-0`}
                      >
                        {item.icon || <User size={20} />}
                      </div>
                      {/* START OF CHANGE: Enlarged Name and Inline Data */}
                      <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <div className="font-black text-[19px] text-slate-900 truncate leading-none flex-shrink-0">
                          {item.displayName}
                        </div>
                        <div className="text-[11px] text-blue-600 font-black truncate bg-blue-50/90 px-2.5 py-1.5 rounded-xl border border-blue-100/50 whitespace-nowrap min-w-0">
                          {item.grade
                            ? `${item.grade}-${item.section || ""}`
                            : item.sub ||
                              item.subjectCode ||
                              item.date ||
                              "---"}
                        </div>
                      </div>
                      <ChevronLeft
                        size={18}
                        className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
                      />
                      {/* END OF CHANGE */}
                    </div>
                  ))
                )}
              </div>

              {count > 3 && (
                <div className="flex justify-center items-center gap-10 relative z-20 pt-1 border-t border-white/40 mt-auto">
                  <button
                    onClick={() => shiftCardData(card.id, "prev", count)}
                    className={`p-1.5 rounded-full bg-white/80 hover:bg-white ${design.text} transition-all shadow-md active:scale-90`}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => shiftCardData(card.id, "next", count)}
                    className={`p-1.5 rounded-full bg-white/80 hover:bg-white ${design.text} transition-all shadow-md active:scale-90`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 group-hover:w-3 transition-all"></div>
        <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
          <CalendarDays className="text-blue-600" />
          بيانات المؤسسة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
                <School size={16} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase mb-1 block">
                  اسم المدرسة
                </label>
                <div className="text-slate-800 font-black text-sm">
                  {data.profile.schoolName || "---"}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600">
                <User size={16} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-black uppercase mb-1 block">
                  المشرف المسؤول
                </label>
                <div className="text-slate-800 font-black text-sm">
                  {data.profile.supervisorName || "---"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
