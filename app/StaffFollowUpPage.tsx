import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import ConfirmDialog from "../components/ConfirmDialog";
import { useGlobal } from "../context/GlobalState";
import {
  Plus,
  Archive,
  UserPlus,
  FileUp,
  UserCircle,
  Palette,
  Search,
  CheckCircle,
  Zap,
  Trash2,
  Star,
  X,
  AlertCircle,
  FileText,
  Share2,
  Download,
  ChevronUp,
  ChevronDown,
  ListFilter,
  Users,
  LayoutDashboard,
  ClipboardList,
  Send,
  Calendar,
  Clock,
  FileBarChart2,
  MoreHorizontal,
  MessageSquare,
  Edit3,
  Check,
} from "lucide-react";
import {
  AdminFollowUp,
  AdminReportContainer,
  MetricDefinition,
} from "../types";
import { INDICATORS_DATA, ACTIVITIES_DATA } from "./evaluationData";
import { exportToStyledExcel } from "../src/lib/excelExport";

const StaffFollowUpPage: React.FC = () => {
  const { lang, data, updateData, currentUser, userFilter, globalDataFilters, getReportMessageFooter, shareViaWhatsApp } =
    useGlobal();
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser.permissions.secretariat.includes("allowEdits");
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isModuleDisabled =
    Array.isArray(currentUser?.permissions?.adminFollowUp) &&
    currentUser.permissions.adminFollowUp.includes("disable");
  // Local State
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"group" | "individual">(
    "individual",
  );
  const [showArchive, setShowArchive] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const hasPermissionToEdit = isGeneralSupervisor || (!isModuleDisabled && (!isReadOnlyFlag || isAllowEdits));
  const [isEditingReport, setIsEditingReport] = useState(false);
  const isReadOnly = !hasPermissionToEdit || (viewMode === "group" && !isEditingReport);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [followUpType, setFollowUpType] = useState("متابعة المدير العام");
  const [writer, setWriter] = useState("");
  const [showSummaryReport, setShowSummaryReport] = useState<string | null>(
    null,
  ); // 'أسبوعي', 'شهري', etc.
  const [violationModal, setViolationModal] = useState<{
    id: string;
    notes: string[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [showIndividualModal, setShowIndividualModal] = useState<string | null>(
    null,
  );
  const [notesModal, setNotesModal] = useState<{
    empId: string;
    text: string;
  } | null>(null);
  const [individualSearch, setIndividualSearch] = useState("");
  const [fillValues, setFillValues] = useState<Record<string, number>>({});
  const [aggDateFrom, setAggDateFrom] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [aggDateTo, setAggDateTo] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<
    string | null
  >(null);
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [individualForm, setIndividualForm] = useState({
    schoolName: data.profile?.schoolName || "",
    branch: data.profile?.branch || "المركز الرئيسي",
    semester: data.profile?.semester || "الأول",
    writer: "",
    reportNumber: "",
    employeeName: "",
    gender: "ذكر",
    role: "",
    reportField: "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس",
  });

  const [individualScores, setIndividualScores] = useState<
    Record<string, number>
  >({});
  const [evidenceStatus, setEvidenceStatus] = useState<
    Record<string, "توفر الشاهد" | "الشاهد ناقص" | "لم يتوفر الشاهد">
  >({});
  const [failureReasons, setFailureReasons] = useState<Record<string, string>>(
    {},
  );
  const [customItems, setCustomItems] = useState<
    { id: string; label: string }[]
  >([]);
  const [violationTags, setViolationTags] = useState<string[]>([]);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [activeViolationTags, setActiveViolationTags] = useState<string[]>([]);
  const [activeNoteTags, setActiveNoteTags] = useState<string[]>([]);
  const [violationsText, setViolationsText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [employeeComment, setEmployeeComment] = useState("");
  const [isCriteriaCollapsed, setIsCriteriaCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
  const [unaccreditedItems, setUnaccreditedItems] = useState<
    Record<string, boolean>
  >({});
  const [executedCounts, setExecutedCounts] = useState<Record<string, number>>(
    {},
  );

  const DEFAULT_INDIVIDUAL_FIELDS = [
    "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس",
    "متابعة المدير العام",
    "متابعة مدير الفرع",
    "متابعة إدارة الجودة",
    "متابعة المالية",
    "متابعة وكيل المدرسة",
    "متابعة السكرتارية",
    "متابعة المشرف التربوي",
    "متابعة المشرف الإداري",
    "متابعة المشرف الأكاديمي",
    "متابعة المختص الاجتماعي",
    "متابعة مسؤول معمل العلوم",
    "متابعة مسؤول الأنشطة",
    "متابعة مسؤول الرياضة",
    "متابعة مسؤول الفنية",
    "متابعة مسؤول المخازن",
    "متابعة معمل الوسائل",
    "متابعة مسؤول المكتبة",
    "متابعة شاشة العرض",
    "متابعة مهندس البيئة",
    "متابعة الحراسة",
    "متابعة حركة المواصلات",
    "متابعة أداء المقصف",
  ];

  const reportFields = Array.from(
    new Set([
      ...DEFAULT_INDIVIDUAL_FIELDS,
      ...(data.adminIndividualReportFields?.length
        ? data.adminIndividualReportFields
        : (() => {
            const saved = null;
            if (saved) return JSON.parse(saved);
            return [];
          })()),
    ]),
  );

  const setReportFields = (newFields: string[]) => {
    updateData({ adminIndividualReportFields: newFields });
    
  };

  const activeSchool =
    globalDataFilters?.schools?.[0] || data.profile?.schoolName || "بدون مدرسة";
  const activeBranch =
    globalDataFilters?.branches?.[0] || data.profile?.branch || "";
  const activeBranchKey = activeBranch
    ? `${activeSchool}_${activeBranch}`
    : `${activeSchool}_بدون فرع مخصص`;

  const getActivitiesForField = (field: string) => {
    if (!field) return [];
    if (data.adminBranchActivities?.[activeBranchKey]?.[field]) {
      return data.adminBranchActivities[activeBranchKey][field];
    }
    if (data.adminActivitiesList?.[field]) {
      return data.adminActivitiesList[field];
    }
    return ACTIVITIES_DATA[field] || [];
  };

  const updateActivitiesForField = (field: string, newActivities: any[]) => {
    const newBranches = { ...(data.adminBranchActivities || {}) };
    if (!newBranches[activeBranchKey]) newBranches[activeBranchKey] = {};
    newBranches[activeBranchKey][field] = newActivities;
    updateData({ adminBranchActivities: newBranches });
  };

  // Initialize Executed Counts when report field changes
  useEffect(() => {
    const activities = getActivitiesForField(individualForm.reportField);
    const newCounts: Record<string, number> = {};
    let hasNew = false;
    activities.forEach((a, i) => {
      const key = `${individualForm.reportField}_${i}`;
      // If we don't have a value yet, default to planned
      if (executedCounts[key] === undefined) {
        newCounts[key] = parseInt(String(a.planned)) || 0;
        hasNew = true;
      }
    });

    if (hasNew) {
      setExecutedCounts((prev) => ({ ...prev, ...newCounts }));
    }
  }, [
    individualForm.reportField,
    data.adminBranchActivities,
    data.adminActivitiesList,
    activeBranchKey,
  ]);

  // Utility function to convert Arabic numerals to English
  const toEnglishNum = (num: number | string): string => {
    const arabicNums = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    const englishNums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let str = String(num);
    for (let i = 0; i < arabicNums.length; i++) {
      str = str.replace(new RegExp(arabicNums[i], "g"), englishNums[i]);
    }
    return str;
  };

  // Hijri date helper with month names
  const hijriMonths = [
    "محرم",
    "صفر",
    "ربيع الأول",
    "ربيع الثاني",
    "جمادى الأولى",
    "جمادى الثانية",
    "رجب",
    "شعبان",
    "رمضان",
    "شوال",
    "ذو القعدة",
    "ذو الحجة",
  ];
  const toHijri = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).formatToParts(d);
      const day = parts.find((p) => p.type === "day")?.value || "";
      const monthNum = parseInt(
        parts.find((p) => p.type === "month")?.value || "1",
      );
      const year = parts.find((p) => p.type === "year")?.value || "";
      return `${day}/ ${hijriMonths[monthNum - 1]}/ ${year}`;
    } catch {
      return "";
    }
  };

  // Generate report title helper
  const getReportTitle = (report: any) => {
    if (report?.periodName) {
      return `التقرير ${report.periodName} ل${followUpType}`;
    }
    return `تقرير ${followUpType}`;
  };

  const getReportDateLabel = (report: any) => {
    if (report?.reportCount) {
      const parts = (report.dateStr || "").split(" إلى ");
      const from = parts[0] || "";
      const to = parts[1] || "";
      return `من تاريخ ${toHijri(from)}هـ - ${from}م إلى تاريخ ${toHijri(to)}هـ - ${to}م`;
    }
    return `بتاريخ ${toHijri(report?.dateStr || "")}هـ - ${report?.dateStr || ""}م`;
  };

  const reports = useMemo(() => {
    return data.adminReports || [];
  }, [data.adminReports]);

  const [displayLimit, setDisplayLimit] = useState(50);
  useEffect(() => {
    setDisplayLimit(50);
  }, [currentReportId, followUpType, viewMode]);

  const employees = useMemo(() => {
    const report = reports.find((r) => r.id === currentReportId);
    if (!report) return [];
    
    // Ensure we only show employees that STILL exist in secretariatStaff 
    // AND match the current user's school/branch permissions.
    const validStaffNames = new Set((data.secretariatStaff || [])
      .filter((s: any) => {
        if (activeSchool && s.school !== activeSchool) return false;
        if (activeBranch && s.branch && s.branch !== activeBranch) return false;
        return true;
      })
      .map((s: any) => s.name));

    return report.employeesData.filter(emp => validStaffNames.has(emp.employeeName));
  }, [reports, currentReportId, data.secretariatStaff, activeSchool, activeBranch]);

  const displayedEmployees = useMemo(
    () => employees.slice(0, displayLimit),
    [employees, displayLimit],
  );

  const branchKey =
    activeSchool && activeBranch ? `${activeSchool}_${activeBranch}` : null;
  const displayedMetrics = useMemo(() => {
    const isIndicators = followUpType === "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس";
    if (isIndicators) {
      const metrics: MetricDefinition[] = [];
      INDICATORS_DATA.forEach(domain => {
        domain.items.forEach((item, idx) => {
          metrics.push({
            key: `${domain.label}_${idx}`,
            label: item,
            emoji: "",
            max: 4,
            color: "#f1f5f9"
          });
        });
      });
      return metrics;
    } else {
      const activities = getActivitiesForField(followUpType) || [];
      return activities.map((act, idx) => ({
        key: `${followUpType}_${idx}`,
        label: act.text,
        emoji: "",
        max: 4,
        color: "#f1f5f9"
      }));
    }
  }, [followUpType, data.adminBranchActivities, data.adminActivitiesList, activeBranchKey]);

  const [showStaffSelector, setShowStaffSelector] = useState(false);

  // Auto-save logic for current individual form draft
  useEffect(() => {
    if (viewMode === "individual") {
      const draft = {
        form: individualForm,
        scores: individualScores,
        evidence: evidenceStatus,
        reasons: failureReasons,
        unaccredited: unaccreditedItems,
        reportDate,
      };
      
    }
  }, [
    individualForm,
    individualScores,
    evidenceStatus,
    failureReasons,
    unaccreditedItems,
    reportDate,
    viewMode,
  ]);

  // Load draft on mount
  useEffect(() => {
    const draft = null;
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setIndividualForm(parsed.form);
        setIndividualScores(parsed.scores);
        setEvidenceStatus(parsed.evidence);
        setFailureReasons(parsed.reasons);
        setUnaccreditedItems(parsed.unaccredited || {});
        setReportDate(parsed.reportDate);
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  // Archive Logic
  const individualArchive = data.adminIndividualReports || [];

  const saveToArchive = () => {
    const newReport = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      form: individualForm,
      scores: individualScores,
      evidence: evidenceStatus,
      reasons: failureReasons,
      unaccredited: unaccreditedItems,
      reportDate,
      activities: getActivitiesForField(individualForm.reportField),
    };
    const updatedArchive = [newReport, ...individualArchive];
    updateData({ adminIndividualReports: updatedArchive });
    toast.success("تم حفظ التقرير في الأرشيف بنجاح");
  };

  const deleteFromArchive = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "حذف من الأرشيف",
      message: "هل أنت متأكد من حذف هذا التقرير؟",
      type: "danger",
      onConfirm: () => {
        const updated = individualArchive.filter((r) => r.id !== id);
        updateData({ adminIndividualReports: updated });
        toast.success("تم حذف التقرير من الأرشيف");
      },
    });
  };

  const restoreFromArchive = (report: any) => {
    setIndividualForm(report.form);
    setIndividualScores(report.scores);
    setEvidenceStatus(report.evidence);
    setFailureReasons(report.reasons);
    setUnaccreditedItems(report.unaccredited || {});
    setReportDate(report.reportDate);

    if (report.activities) {
      updateActivitiesForField(report.form.reportField, report.activities);
    }

    setShowArchive(false);
    toast.success("تم استعادة التقرير للتعديل");
  };

  // Actions
  useEffect(() => {
    // Automatically switch to the latest report of this type if it exists
    const reportsOfType = (data.adminReports || []).filter(
      (r) => r.followUpType === followUpType,
    );
    if (reportsOfType.length > 0) {
      if (!currentReportId || !reportsOfType.some(r => r.id === currentReportId)) {
        setCurrentReportId(reportsOfType[0].id);
        setWriter(reportsOfType[0].writer || "");
        setIsEditingReport(false);
      }
    } else {
      if (currentReportId !== null) setCurrentReportId(null);
      setWriter("");
      setIsEditingReport(false);
    }
  }, [followUpType, data.adminReports, currentReportId]);

  const createNewReport = () => {
    if (isReadOnly) return;
    
    // Find matching individual reports for this followUpType
    const matchedReports = (data.adminIndividualReports || []).filter(
      (r) => r.form && r.form.reportField === followUpType
    );
    
    // Group by employee name to get the latest report per employee
    const latestPerEmp = new Map();
    matchedReports.forEach((r) => {
      const emp = r.form.employeeName;
      if (!emp) return;
      if (!latestPerEmp.has(emp) || new Date(r.createdAt) > new Date(latestPerEmp.get(emp).createdAt)) {
        latestPerEmp.set(emp, r);
      }
    });

    const inheritedEmployees = Array.from(latestPerEmp.values()).map((r) => {
      // Map unaccredited logic
      const unaccreditedItemsObj = r.unaccredited || {};
      const unaccreditedKeys = Object.keys(unaccreditedItemsObj).filter((k) => unaccreditedItemsObj[k]);
      
      const empData: AdminFollowUp = {
        id: `emp_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        employeeName: r.form.employeeName || "",
        gender: r.form.gender || "ذكر",
        role: r.form.role || "",
        branch: r.form.branch || "المركز الرئيسي",
        violations_score: 0,
        violations_notes: [],
        unaccreditedMetrics: unaccreditedKeys,
      };

      // Add scores from individual report
      const scores = r.scores || {};
      displayedMetrics.forEach((m) => {
        empData[m.key] = scores[m.key] !== undefined && scores[m.key] !== -1 ? Number(scores[m.key]) : 0;
      });

      return empData;
    });

    const newId = `admin_report_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newReport: AdminReportContainer = {
      id: newId,
      userId: currentUser?.id,
      dateStr: new Date().toISOString().split("T")[0],
      followUpType: followUpType,
      writer: writer,
      employeesData: inheritedEmployees,
    };
    updateData({ adminReports: [newReport, ...(data.adminReports || [])] });
    setCurrentReportId(newId);
    setIsEditingReport(true);
    toast.success("تم إنشاء تقرير متابعة جديد بنجاح");
  };

  const aggregateReports = (period: string) => {
    if (isReadOnly) return;
    if (!data.adminReports || data.adminReports.length === 0) {
      toast.error("لا توجد تقارير سابقة لتجميعها");
      return;
    }

    const filtered = (data.adminReports || []).filter(
      (r) =>
        r.followUpType === followUpType &&
        r.dateStr >= aggDateFrom &&
        r.dateStr <= aggDateTo &&
        !r.reportCount, // Don't aggregate already aggregated reports to avoid double counting
    );

    if (filtered.length === 0) {
      toast.error(
        "لا توجد تقارير في هذه الفترة الزمنية لهذا النوع من المتابعة",
      );
      return;
    }

    const reportCount = filtered.length;

    // Aggregation Logic: Group by employee name
    const aggregatedData: Record<string, AdminFollowUp> = {};
    filtered.forEach((report) => {
      report.employeesData.forEach((emp) => {
        if (!aggregatedData[emp.employeeName]) {
          aggregatedData[emp.employeeName] = {
            ...emp,
            id: `agg_${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${emp.employeeName}`,
            unaccreditedMetrics: emp.unaccreditedMetrics || [],
          };
          // Initialize metrics to 0 for aggregation
          displayedMetrics.forEach((m) => {
            aggregatedData[emp.employeeName][m.key] = 0;
          });
          aggregatedData[emp.employeeName].violations_score = 0;
          aggregatedData[emp.employeeName].violations_notes = [];
        }

        const target = aggregatedData[emp.employeeName];
        displayedMetrics.forEach((m) => {
          target[m.key] =
            (Number(target[m.key]) || 0) + (Number(emp[m.key]) || 0);
        });
        target.violations_score += emp.violations_score || 0;
        target.violations_notes = [
          ...new Set([...target.violations_notes, ...emp.violations_notes]),
        ];
      });
    });

    const periodMap: Record<string, string> = {
      أسبوعي: "الأسبوعي",
      شهري: "الشهري",
      فصلي: "الفصلي",
      سنوي: "السنوي",
    };
    const newId = `agg_report_${period}_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newReport: AdminReportContainer = {
      id: newId,
      userId: currentUser?.id,
      dateStr: `${aggDateFrom} إلى ${aggDateTo}`,
      followUpType: followUpType,
      writer: writer,
      employeesData: Object.values(aggregatedData),
      reportCount: reportCount,
      periodName: periodMap[period] || period,
    };

    updateData({ adminReports: [newReport, ...(data.adminReports || [])] });
    setCurrentReportId(newId);
    toast.success(
      `تم إنشاء التقرير الـ ${period} بنجاح من ${reportCount} تقرير سابق في الفترة المحددة`,
    );
  };

  const deleteReport = (reportId: string) => {
    if (isReadOnly) return;
    setConfirmDialog({
      isOpen: true,
      title: "حذف التقرير",
      message: "هل أنت متأكد من حذف هذا التقرير؟",
      type: "danger",
      onConfirm: () => {
        const newList = (data.adminReports || []).filter(
          (r) => r.id !== reportId,
        );
        updateData({ adminReports: newList });
        if (currentReportId === reportId) setCurrentReportId(null);
        toast.success("تم حذف التقرير بنجاح");
      },
    });
  };

  const addEmployee = () => {
    if (isReadOnly) return;
    if (!currentReportId) {
      toast.error("نرجو إنشاء جدول جديد أولاً");
      return;
    }
    setShowStaffSelector(true);
  };

  const addSelectedEmployees = (selectedNames: string[]) => {
    if (!currentReportId || selectedNames.length === 0) {
      setShowStaffSelector(false);
      return;
    }

    const newEmployees = selectedNames.map(name => {
      const staffBase = (data.secretariatStaff || []).find((s: any) => s.name === name);
      return {
        id: `emp_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        employeeName: name,
        gender: staffBase?.gender || "ذكر",
        branch: staffBase?.branch || "المركز الرئيسي",
        role: followUpType.includes("متابعة")
          ? followUpType.split("متابعة ")[1] || followUpType
          : followUpType,
        violations_score: 0,
        violations_notes: [],
        unaccreditedMetrics: [],
      } as AdminFollowUp;
    });

    const updatedReports = (data.adminReports || []).map((r) => {
      if (r.id === currentReportId)
        return { ...r, employeesData: [...r.employeesData, ...newEmployees] };
      return r;
    });
    updateData({ adminReports: updatedReports });
    setShowStaffSelector(false);
  };

  const updateEmployee = (empId: string, updates: Partial<AdminFollowUp>) => {
    if (isReadOnly) return;
    const updatedReports = (data.adminReports || []).map((r) => {
      if (r.id === currentReportId) {
        const newEmps = r.employeesData.map((e) =>
          e.id === empId ? { ...e, ...updates } : e,
        );
        return { ...r, employeesData: newEmps };
      }
      return r;
    });
    updateData({ adminReports: updatedReports });
  };

  const deleteEmployees = (ids: string[]) => {
    if (isReadOnly) return;
    setConfirmDialog({
      isOpen: true,
      title: "حذف موظفين",
      message: `حذف ${ids.length} موظف؟`,
      type: "danger",
      onConfirm: () => {
        const updatedReports = (data.adminReports || []).map((r) => {
          if (r.id === currentReportId)
            return {
              ...r,
              employeesData: r.employeesData.filter((e) => !ids.includes(e.id)),
            };
          return r;
        });
        updateData({ adminReports: updatedReports });
        setSelectedEmployees((prev) => prev.filter((id) => !ids.includes(id)));
        toast.success("تم الحذف بنجاح");
      },
    });
  };

  const toggleAccreditation = (empId: string | "bulk", metricKey: string) => {
    if (isReadOnly) return;
    const updatedReports = (data.adminReports || []).map((r) => {
      if (r.id === currentReportId) {
        const newEmps = r.employeesData.map((e) => {
          if (empId === "bulk" || e.id === empId) {
            const current = e.unaccreditedMetrics || [];
            const updated = current.includes(metricKey)
              ? current.filter((k) => k !== metricKey)
              : [...current, metricKey];
            return { ...e, unaccreditedMetrics: updated };
          }
          return e;
        });
        return { ...r, employeesData: newEmps };
      }
      return r;
    });
    updateData({ adminReports: updatedReports });
  };

  const fillMetricColumn = (metricKey: string, value: number) => {
    if (isReadOnly) return;
    const updatedReports = (data.adminReports || []).map((r) => {
      if (r.id === currentReportId) {
        const newEmps = r.employeesData.map((e) => ({
          ...e,
          [metricKey]: value,
        }));
        return { ...r, employeesData: newEmps };
      }
      return r;
    });
    updateData({ adminReports: updatedReports });
  };

  // Calculations
  const calculateTotal = (emp: AdminFollowUp) => {
    return displayedMetrics.reduce((acc, m) => {
      if ((emp.unaccreditedMetrics || []).includes(m.key)) return acc;
      return acc + (Number(emp[m.key]) || 0);
    }, 0);
  };

  const calculateMaxTotal = (emp: AdminFollowUp) => {
    const report = data.adminReports?.find((r) => r.id === currentReportId);
    const reportCount = report?.reportCount || 1;
    return displayedMetrics.reduce((acc, m) => {
      if ((emp.unaccreditedMetrics || []).includes(m.key)) return acc;
      return acc + m.max * reportCount;
    }, 0);
  };

  const getColSum = (metricKey: string) => {
    return employees.reduce((acc, e) => {
      if ((e.unaccreditedMetrics || []).includes(metricKey)) return acc;
      return acc + (Number(e[metricKey]) || 0);
    }, 0);
  };

  const getColPercent = (metricKey: string, maxVal: number) => {
    const report = data.adminReports?.find((r) => r.id === currentReportId);
    const reportCount = report?.reportCount || 1;
    const multipliedMax = maxVal * reportCount;

    const credibleEmps = employees.filter(
      (e) => !(e.unaccreditedMetrics || []).includes(metricKey),
    );
    if (credibleEmps.length === 0 || multipliedMax === 0) return "0";
    const sum = getColSum(metricKey);
    const totalMax = credibleEmps.length * multipliedMax;
    return ((sum / totalMax) * 100).toFixed(1);
  };

  const saveMetrics = (newMetrics: MetricDefinition[]) => {
    if (branchKey) {
      updateData({
        adminBranchMetrics: {
          ...(data.adminBranchMetrics || {}),
          [branchKey]: {
            ...(data.adminBranchMetrics?.[branchKey] || {}),
            [followUpType]: newMetrics,
          },
        },
      });
    } else {
      updateData({
        adminMetricsList: {
          ...(data.adminMetricsList || {}),
          [followUpType]: newMetrics,
        },
      });
    }
  };

  const handleMaxChange = (key: string, newMax: number) => {
    if (isReadOnly) return;
    const updated = displayedMetrics.map((m) =>
      m.key === key ? { ...m, max: newMax } : m,
    );
    saveMetrics(updated);
  };

  const reorderDomain = (index: number, direction: "up" | "down") => {
    if (isReadOnly) return;
    const newMetrics = [...displayedMetrics];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newMetrics.length) {
      [newMetrics[index], newMetrics[targetIndex]] = [
        newMetrics[targetIndex],
        newMetrics[index],
      ];
      saveMetrics(newMetrics);
    }
  };

  const renameDomain = (key: string, newLabel: string) => {
    if (isReadOnly) return;
    const updated = displayedMetrics.map((m) =>
      m.key === key ? { ...m, label: newLabel } : m,
    );
    saveMetrics(updated);
  };

  const handleAddOption = (
    field: "gender" | "role" | "branch",
    empId: string,
  ) => {
    const newVal = prompt("أدخل القيمة الجديدة:");
    if (newVal) {
      updateEmployee(empId, { [field]: newVal });
    }
  };

  // Styling Helpers
  const getTextColor = (bgColor: string) => {
    if (!bgColor) return "text-slate-800";
    if (bgColor.startsWith("bg-")) return "text-white";
    const color = bgColor.startsWith("#") ? bgColor.substring(1) : bgColor;
    if (color.length !== 6) return "text-slate-900";
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128 ? "text-white" : "text-slate-900";
  };

  const getMetricStyle = (m: MetricDefinition) => {
    if (m.color?.startsWith("bg-")) return {};
    return { backgroundColor: m.color };
  };

  const generateWhatsAppReport = (empId: string | "bulk") => {
    const report = data.adminReports?.find((r) => r.id === currentReportId);
    if (!report) return;

    const profile = data.profile;
    const title = getReportTitle(report) + " - " + getReportDateLabel(report);

    let msg = `✨ *${profile.schoolName || "المدرسة"} - ${profile.branch || "الفرع"}* ✨\n`;
    msg += `📋 *${title}*\n`;
    msg += `✍️ *كاتب التقرير:* ${writer || report.writer || "غير محدد"}\n`;
    msg += `━━━━━━━━━━━━━━━\n\n`;

    if (empId === "bulk") {
      employees.forEach((emp, idx) => {
        const total = calculateTotal(emp);
        const max = calculateMaxTotal(emp);
        const percent = max > 0 ? ((total / max) * 100).toFixed(1) : "0";

        msg += `👤 *${idx + 1}. ${emp.employeeName}*\n`;
        msg += `🛠️ الوظيفة: ${emp.role}\n`;
        msg += `🏆 الدرجة: ${total} / ${max} (${percent}%)\n`;
        if (emp.violations_score > 0)
          msg += `⚠️ المخالفات: ${emp.violations_score}\n`;
        msg += `┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈\n`;
      });
    } else {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return;
      const total = calculateTotal(emp);
      const max = calculateMaxTotal(emp);
      const percent = max > 0 ? ((total / max) * 100).toFixed(1) : "0";

      msg += `👤 *الاسم:* ${emp.employeeName}\n`;
      msg += `🏢 *الفرع:* ${emp.branch}\n`;
      msg += `🛠️ *الوظيفة:* ${emp.role}\n\n`;
      msg += `✅ *نتائج المجالات:*\n`;

      displayedMetrics.forEach((m) => {
        if (!(emp.unaccreditedMetrics || []).includes(m.key)) {
          msg += `- ${m.label}: ${emp[m.key] || 0} / ${m.max * (report.reportCount || 1)}\n`;
        }
      });

      msg += `\n🚨 *المخالفات:* ${emp.violations_score}\n`;
      msg += `🏆 *المجموع الكلي:* ${total} / ${max}\n`;
      msg += `📈 *النسبة المئوية:* ${percent}%\n`;
    }

    msg += `\n${getReportMessageFooter(report?.dateStr)}`;

    shareViaWhatsApp(msg);
  };

  const exportToExcel = () => {
    const report = data.adminReports?.find((r) => r.id === currentReportId);
    if (!report) return;

    const profile = data.profile;
    const title = getReportTitle(report);
    const dateLabel = getReportDateLabel(report);
    const rcCount = report.reportCount || 1;

    // Build Excel-compatible HTML table for better formatting
    let content = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
    table { border-collapse: collapse; width: 100%; direction: rtl; }
    th, td { border: 1px solid #000; padding: 8px; text-align: center; font-family: Arial, sans-serif; }
    .header { background-color: #800000; color: white; font-weight: bold; font-size: 16px; }
    .subheader { background-color: #FFD966; color: #4F3F0F; font-weight: bold; }
    .metric-header { background-color: #f0f0f0; font-weight: bold; font-size: 11px; }
    .data-row { background-color: #fff; }
    .data-row:nth-child(even) { background-color: #f9f9f9; }
    .footer-row { background-color: #FFD966; font-weight: bold; }
    .total-cell { background-color: #E6B11F; font-weight: bold; }
    .percent-cell { background-color: #800000; color: white; font-weight: bold; }
    .signature { border: none; padding: 20px; font-weight: bold; }
    .title-section { border: none; text-align: center; font-size: 18px; font-weight: bold; }
    .date-section { border: none; text-align: center; font-size: 14px; color: #666; }
</style>
</head>
<body>
<table>
    <!-- Header Section -->
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" class="title-section" style="background-color: #800000; color: white; font-size: 20px; padding: 15px;">
            ${profile.schoolName || "المدرسة"} ${profile.branch ? `- فرع ${profile.branch}` : ""}
        </td>
    </tr>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" class="title-section" style="padding: 10px;">
            ${title}
        </td>
    </tr>
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" class="date-section" style="padding: 8px;">
            ${dateLabel}
        </td>
    </tr>
    <tr><td colspan="${5 + displayedMetrics.length + 4}" style="border: none; height: 10px;"></td></tr>
    
    <!-- Table Header Row 1 -->
    <tr class="subheader">
        <th rowspan="2" style="width: 40px;">#</th>
        <th rowspan="2" style="min-width: 150px;">اسم الموظف</th>
        <th rowspan="2">النوع</th>
        <th rowspan="2">الوظيفة</th>
        <th rowspan="2">الفرع</th>
        <th colspan="${displayedMetrics.length}">مجالات تقييم الموظفين</th>
        <th rowspan="2">المخالفات</th>
        <th rowspan="2">المجموع</th>
        <th rowspan="2">النسبة %</th>
        <th rowspan="2" style="min-width: 200px;">الملاحظات والتوصيات</th>
    </tr>
    
    <!-- Table Header Row 2 - Metrics -->
    <tr class="metric-header">
        ${displayedMetrics.map((m) => `<th style="background-color: ${m.color}; min-width: 80px;">${m.label}<br/>(${m.max * rcCount})</th>`).join("")}
    </tr>
    
    <!-- Data Rows -->
    ${employees
      .map((emp, idx) => {
        const total = calculateTotal(emp);
        const max = calculateMaxTotal(emp);
        const percent = max > 0 ? ((total / max) * 100).toFixed(1) : "0";
        return `
    <tr class="data-row">
        <td>${idx + 1}</td>
        <td style="text-align: right; font-weight: bold;">${emp.employeeName}</td>
        <td>${emp.gender}</td>
        <td>${emp.role}</td>
        <td>${emp.branch}</td>
        ${displayedMetrics
          .map((m) => {
            const isUnaccredited = (emp.unaccreditedMetrics || []).includes(
              m.key,
            );
            const val = isUnaccredited ? "غ.م" : emp[m.key] || 0;
            return `<td style="background-color: ${m.color}15;">${val}</td>`;
          })
          .join("")}
        <td style="${emp.violations_score > 0 ? "background-color: #fee2e2; color: #dc2626;" : ""}">${emp.violations_score}</td>
        <td style="background-color: #dbeafe; font-weight: bold;">${total}</td>
        <td style="background-color: #dbeafe; font-weight: bold;">${percent}%</td>
        <td style="text-align: right; font-size: 11px;">${(emp.recommendations || "").replace(/[\n\r]/g, " ")}</td>
    </tr>`;
      })
      .join("")}
    
    <!-- Statistics Footer Row -->
    <tr class="footer-row">
        <td colspan="5" style="text-align: right; font-weight: bold;">الإحصائيات الإجمالية والنسب المئوية المحققة</td>
        ${displayedMetrics
          .map((m) => {
            const sum = getColSum(m.key);
            const pct = getColPercent(m.key, m.max);
            return `<td style="background-color: ${m.color}30;">(${sum})<br/>${pct}%</td>`;
          })
          .join("")}
        <td></td>
        <td class="total-cell">(${employees.reduce((acc, e) => acc + calculateTotal(e), 0)})</td>
        <td class="percent-cell">${(() => {
          const tSum = employees.reduce((acc, e) => acc + calculateTotal(e), 0);
          const tMax = employees.reduce(
            (acc, e) => acc + calculateMaxTotal(e),
            0,
          );
          return tMax > 0 ? ((tSum / tMax) * 100).toFixed(1) : "0";
        })()}%</td>
        <td></td>
    </tr>
    
    <!-- Empty Row -->
    <tr><td colspan="${5 + displayedMetrics.length + 4}" style="border: none; height: 20px;"></td></tr>
    
    <!-- Signature Section -->
    <tr>
        <td colspan="${Math.floor((5 + displayedMetrics.length + 4) / 2)}" class="signature" style="text-align: right;">
            <strong>كاتب التقرير:</strong> ${writer || report.writer || "......................"}
        </td>
        <td colspan="${Math.ceil((5 + displayedMetrics.length + 4) / 2)}" class="signature" style="text-align: left;">
            <strong>مدير الفرع:</strong> ${profile.branchManager || "......................"}
        </td>
    </tr>
    
    <!-- Legend -->
    <tr>
        <td colspan="${5 + displayedMetrics.length + 4}" style="border: none; font-size: 10px; color: #666; text-align: center; padding: 10px;">
            غ.م = غير معتمد (مستبعد من الحساب) | الدرجات الضعيفة أقل من 30%
        </td>
    </tr>
</table>
</body>
</html>`;

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + content], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, "_")}.xls`;
    link.click();
  };

  const exportToTxt = () => {
    const report = data.adminReports?.find((r) => r.id === currentReportId);
    if (!report) return;
    const title = getReportTitle(report) + " - " + getReportDateLabel(report);
    let content = `${title}\n`;
    content += `كاتب التقرير: ${writer || report.writer}\n`;
    content += `${"=".repeat(50)}\n\n`;
    employees.forEach((emp, idx) => {
      const total = calculateTotal(emp);
      const max = calculateMaxTotal(emp);
      const percent = max > 0 ? ((total / max) * 100).toFixed(1) : "0";
      content += `${idx + 1}. ${emp.employeeName} (${emp.role} - ${emp.branch})\n`;
      displayedMetrics.forEach((m) => {
        if (!(emp.unaccreditedMetrics || []).includes(m.key)) {
          content += `   - ${m.label}: ${emp[m.key] || 0} / ${m.max * (report.reportCount || 1)}\n`;
        }
      });
      content += `   المخالفات: ${emp.violations_score}\n`;
      content += `   المجموع: ${total} / ${max} (${percent}%)\n`;
      if (emp.recommendations)
        content += `   الملاحظات: ${emp.recommendations}\n`;
      content += `${"-".repeat(40)}\n`;
    });
    content += `\nمدير الفرع: ${data.profile.branchManager || ""}\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getReportTitle(report).replace(/\s+/g, "_")}.txt`;
    link.click();
  };

  const exportIndividualToExcel = () => {
    const isIndicators =
      individualForm.reportField ===
      "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس";

    // Helper for consistent styling
    const styleHeader =
      "background-color: #e0e7ff; color: #1e3a8a; font-weight: bold; border: 1px solid #94a3b8; padding: 10px; text-align: center; font-family: Arial, sans-serif;";
    const styleCell =
      "border: 1px solid #cbd5e1; padding: 8px; text-align: center; vertical-align: middle; font-family: Arial, sans-serif;";
    const styleCellLeft =
      "border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: middle; font-family: Arial, sans-serif;";
    const styleTitle =
      "font-size: 18px; font-weight: bold; text-align: center; padding: 15px; background-color: #f8fafc; border: 1px solid #cbd5e1;";
    const styleLabel =
      "font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px;";

    const activitesList = isIndicators
      ? []
      : getActivitiesForField(individualForm.reportField) || [];
    const indicatorsList = isIndicators ? INDICATORS_DATA : [];

    let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>تقرير ${individualForm.employeeName}</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayRightToLeft/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body style="direction: rtl;">
                <table style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <td colspan="7" style="${styleTitle}">
                            تقرير متابعة ${individualForm.reportField}
                            <br/>
                            <span style="font-size: 14px; font-weight: normal;">
                                ( ${individualForm.schoolName} - ${individualForm.branch} )
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4" style="${styleLabel}">الاسم: ${individualForm.employeeName}</td>
                        <td colspan="3" style="${styleLabel}">التاريخ: ${reportDate}</td>
                    </tr>
                    <tr style="height: 20px;"><td colspan="7"></td></tr>
                    <tr>
                        <th style="${styleHeader} width: 50px;">م</th>
                        <th style="${styleHeader} width: 300px;">النشاط / المؤشر</th>
                        <th style="${styleHeader} width: 80px;">المخطط</th>
                        <th style="${styleHeader} width: 80px;">المنفذ</th>
                        <th style="${styleHeader} width: 150px;">الشواهد</th>
                        <th style="${styleHeader} width: 100px;">توفر الشاهد</th>
                        <th style="${styleHeader} width: 250px;">أسباب عدم التنفيذ</th>
                    </tr>
        `;

    if (isIndicators) {
      let seq = 1;
      indicatorsList.forEach((d) => {
        html += `<tr><td colspan="7" style="${styleHeader} background-color: #f1f5f9; text-align: right;">${d.label}</td></tr>`;
        d.items.forEach((item, idx) => {
          const score = individualScores[`${d.label}_${idx}`] ?? "-";
          html += `
                        <tr>
                            <td style="${styleCell}">${seq++}</td>
                            <td style="${styleCellLeft} text-align: right;">${item}</td>
                            <td style="${styleCell}">4</td>
                            <td style="${styleCell}">${score}</td>
                            <td style="${styleCell}">-</td>
                            <td style="${styleCell}">-</td>
                            <td style="${styleCell}">-</td>
                        </tr>
                     `;
        });
      });
    } else {
      activitesList.forEach((a, i) => {
        const k = `${individualForm.reportField}_${i}`;
        const score = individualScores[k] ?? 0;
        const executed =
          executedCounts[k] !== undefined
            ? executedCounts[k]
            : parseInt(String(a.planned)) || 0;
        const stat = evidenceStatus[k] || "توفر الشاهد";
        const reason = failureReasons[k] || "";
        const isUnacc = unaccreditedItems[k];

        const bgRow = i % 2 === 0 ? "#ffffff" : "#f8fafc";

        html += `
                    <tr style="background-color: ${bgRow};">
                        <td style="${styleCell}">${i + 1}</td>
                        <td style="${styleCellLeft} text-align: right; ${isUnacc ? "text-decoration: line-through; color: #94a3b8;" : ""}">
                            ${a.text} ${isUnacc ? "(غير معتمد)" : ""}
                        </td>
                        <td style="${styleCell}">${a.planned}</td>
                        <td style="${styleCell}">${isUnacc ? "-" : executed}</td>
                        <td style="${styleCell}">${a.evidence}</td>
                        <td style="${styleCell} ${stat === "توفر الشاهد" ? "color: green;" : stat === "الشاهد ناقص" ? "color: orange;" : "color: red;"}">
                            ${stat}
                        </td>
                        <td style="${styleCell}">${reason}</td>
                    </tr>
                `;
      });
    }

    // Violations Row
    const allViolations = [...activeViolationTags, violationsText]
      .filter(Boolean)
      .join(" - ");
    if (allViolations) {
      html += `
                <tr>
                    <td colspan="1" style="${styleHeader} background-color: #fef2f2; color: #991b1b;">المخالفات</td>
                    <td colspan="6" style="${styleCellLeft} background-color: #fef2f2; color: #991b1b;">${allViolations}</td>
                </tr>
            `;
    }

    // Notes Row
    const allNotes = [...activeNoteTags, notesText].filter(Boolean).join(" - ");
    if (allNotes) {
      html += `
                <tr>
                    <td colspan="1" style="${styleHeader} background-color: #fffbeb; color: #92400e;">الملاحظات والتوصيات</td>
                    <td colspan="6" style="${styleCellLeft} background-color: #fffbeb; color: #92400e;">${allNotes}</td>
                </tr>
            `;
    }

    html += `
                </table>
            </body>
            </html>
        `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_${individualForm.employeeName || "فردي"}_${reportDate}.xls`;
    link.click();
  };

  const exportIndividualToTxt = () => {
    const isIndicators =
      individualForm.reportField ===
      "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس";
    let content = `تقرير متابعة ${individualForm.reportField}\n`;
    content += `المدرسة: ${individualForm.schoolName}\n`;
    content += `الفرع: ${individualForm.branch}\n`;
    content += `الاسم: ${individualForm.employeeName}\n`;
    content += `التاريخ: ${reportDate}\n`;
    content += `${"=".repeat(50)}\n\n`;

    if (isIndicators) {
      INDICATORS_DATA.forEach((d) => {
        content += `[ ${d.label} ]\n`;
        d.items.forEach((item, idx) => {
          const score = individualScores[`${d.label}_${idx}`] ?? "-";
          content += `- ${item}: ${score} / 4\n`;
        });
        content += "\n";
      });
    } else {
      (getActivitiesForField(individualForm.reportField) || []).forEach(
        (a, i) => {
          const k = `${individualForm.reportField}_${i}`;
          const score = individualScores[k] ?? 0;
          const executed =
            executedCounts[k] !== undefined
              ? executedCounts[k]
              : parseInt(String(a.planned)) || 0;
          const stat = evidenceStatus[k] || "توفر الشاهد";
          const reason = failureReasons[k] || "";
          const isUnacc = unaccreditedItems[k];

          content += `${i + 1}. ${a.text} ${isUnacc ? "(غير معتمد)" : ""}\n`;
          content += `   المخطط: ${a.planned} | المنفذ: ${isUnacc ? "-" : executed} | الدرجة: ${score}/4\n`;
          content += `   الشاهد: ${a.evidence} | حالة الشاهد: ${stat}\n`;
          if (reason) content += `   أسباب عدم التنفيذ: ${reason}\n`;
          content += `${"-".repeat(30)}\n`;
        },
      );
    }

    const allViolations = [...activeViolationTags, violationsText]
      .filter(Boolean)
      .join(" - ");
    if (allViolations) content += `\nالمخالفات: ${allViolations}\n`;

    const allNotes = [...activeNoteTags, notesText].filter(Boolean).join(" - ");
    if (allNotes) content += `الملاحظات والتوصيات: ${allNotes}\n`;

    if (employeeComment) content += `\nتعليق الموظف: ${employeeComment}\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_${individualForm.employeeName || "فردي"}_${reportDate}.txt`;
    link.click();
  };

  const addDomain = () => {
    const name = prompt("أدخل مسمى المجال الجديد:");
    if (!name) return;
    const max = parseInt(prompt("أدخل الدرجة القصوى لهذا المجال:") || "4");

    const newMetric: MetricDefinition = {
      key: `custom_${Date.now()}`,
      label: name,
      emoji: "⭐",
      max: max,
      color: "#fbbf24",
    };

    saveMetrics([...displayedMetrics, newMetric]);
  };

  const deleteDomain = (key: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "حذف مجال",
      message: "حذف هذا المجال؟ سيؤدي ذلك لحذف درجاته في هذا الجدول.",
      type: "danger",
      onConfirm: () => {
        saveMetrics(displayedMetrics.filter((m) => m.key !== key));
        toast.success("تم حذف المجال بنجاح");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Top Navigation Toggle */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] self-center mb-4 shadow-inner border border-slate-200 w-full max-w-2xl">
        <button
          onClick={() => setViewMode("individual")}
          className={`flex-1 flex items-center justify-center gap-3 py-4 px-8 rounded-[1.8rem] font-black text-lg transition-all transform active:scale-95 ${
            viewMode === "individual"
              ? "bg-white text-blue-600 shadow-xl scale-[1.02]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserCircle size={24} /> التقارير الفردية
        </button>
        <button
          onClick={() => setViewMode("group")}
          className={`flex-1 flex items-center justify-center gap-3 py-4 px-8 rounded-[1.8rem] font-black text-lg transition-all transform active:scale-95 ${
            viewMode === "group"
              ? "bg-white text-blue-600 shadow-xl scale-[1.02]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users size={24} /> التقارير الجماعية
        </button>
      </div>

      {viewMode === "individual" ? (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          {/* 1. Header Form */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                اسم المدرسة
              </label>
              <input
                type="text"
                readOnly
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none"
                value={individualForm.schoolName}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                الفرع
              </label>
              <select
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none cursor-pointer"
                value={individualForm.branch}
                onChange={(e) =>
                  setIndividualForm({
                    ...individualForm,
                    branch: e.target.value,
                  })
                }
              >
                <option>المركز الرئيسي</option>
                <option>فرع الطلاب</option>
                <option>فرع الطالبات</option>
                <option>فرع البراعم</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                الفصل الدراسي
              </label>
              <select
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none cursor-pointer"
                value={individualForm.semester}
                onChange={(e) =>
                  setIndividualForm({
                    ...individualForm,
                    semester: e.target.value,
                  })
                }
              >
                <option>الأول</option>
                <option>الثاني</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm font-black text-slate-600 mr-2 flex items-center justify-between">
                  <span>مجال التقرير</span>
                  <button
                    onClick={() => setShowCustomizer(true)}
                    className="text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                    title="تخصيص القائمة"
                  >
                    <Palette size={16} />
                    <span className="text-[10px] font-black">
                      تحرير القائمة
                    </span>
                  </button>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full h-14 bg-white rounded-[1.2rem] border-2 border-slate-100 px-5 text-right font-black text-sm text-slate-700 flex items-center justify-between hover:border-blue-300 transition-all select-none"
                  >
                    <span className="truncate ml-2">
                      {individualForm.reportField}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full right-0 left-0 mt-2 bg-white border-2 border-blue-50 rounded-[1.5rem] shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {reportFields.map((field) => (
                          <button
                            key={field}
                            onClick={() => {
                              setIndividualForm({
                                ...individualForm,
                                reportField: field,
                              });
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-right px-6 py-3.5 text-sm font-black transition-all hover:bg-blue-50 hover:text-blue-600 ${individualForm.reportField === field ? "bg-blue-600 text-white" : "text-slate-600"}`}
                          >
                            {field}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                التاريخ (ميلادي)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none font-sans"
                  value={reportDate || ""}
                  onChange={(e) => setReportDate(e.target.value)}
                />
                <div className="flex-1 bg-blue-50 border-2 border-blue-100 rounded-[1.2rem] p-3.5 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-blue-400">
                    التاريخ الهجري
                  </span>
                  <span className="font-black text-blue-700 text-sm">
                    {toHijri(reportDate)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                اسم كاتب التقرير
              </label>
              <input
                type="text"
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none"
                value={individualForm.writer || ""}
                onChange={(e) =>
                  setIndividualForm({
                    ...individualForm,
                    writer: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                رقم التقرير
              </label>
              <input
                type="text"
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none font-sans"
                value={individualForm.reportNumber || ""}
                onChange={(e) =>
                  setIndividualForm({
                    ...individualForm,
                    reportNumber: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                اسم الموظف
              </label>
              <select
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none cursor-pointer"
                value={individualForm.employeeName || ""}
                onChange={(e) => {
                  const emp = (data.secretariatStaff || []).find(
                    (s: any) => s.name === e.target.value
                  );
                  setIndividualForm({
                    ...individualForm,
                    employeeName: e.target.value,
                    gender: emp?.gender || individualForm.gender || "ذكر"
                  });
                }}
              >
                <option value="" disabled>اختر الموظف...</option>
                {(data.secretariatStaff || [])
                  .filter((s: any) => {
                    if (activeSchool && s.school !== activeSchool) return false;
                    if (activeBranch && s.branch && s.branch !== activeBranch)
                      return false;
                    return true;
                  })
                  .map((s: any) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                النوع
              </label>
              <select
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none cursor-pointer"
                value={individualForm.gender || "ذكر"}
                onChange={(e) =>
                  setIndividualForm({ ...individualForm, gender: e.target.value })
                }
              >
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2">
                الدور
              </label>
              <input
                type="text"
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none"
                value={individualForm.role || ""}
                onChange={(e) =>
                  setIndividualForm({ ...individualForm, role: e.target.value })
                }
              />
            </div>
          </div>

          {/* 1.5 Criteria Customizer Button */}
          <div className="flex justify-center my-8">
            <button
              onClick={() => setShowCriteriaModal(true)}
              className="bg-amber-500 text-white px-12 py-5 rounded-[2.2rem] font-black text-xl shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 border-4 border-white"
            >
              <Palette size={24} />
              تخصيص المعايير (البطاقات)
            </button>
          </div>

          {/* 2. Evaluation Interface */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <ClipboardList className="text-blue-500" size={28} />
                معايير التقييم والمتابعة
              </h3>
              <button
                onClick={() => setIsCriteriaCollapsed(!isCriteriaCollapsed)}
                className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"
              >
                {isCriteriaCollapsed ? (
                  <ChevronDown size={24} />
                ) : (
                  <ChevronUp size={24} />
                )}
              </button>
            </div>

            {isCriteriaCollapsed ? (
              <div className="bg-white/60 backdrop-blur-md p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                    <CheckCircle size={20} />
                  </div>
                  <h4 className="text-xl font-black text-slate-800">
                    المعايير المختارة والمقيمة
                  </h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(() => {
                    const activities =
                      getActivitiesForField(individualForm.reportField) || [];
                    const selected = activities.filter((_, idx) => {
                      const key = `${individualForm.reportField}_${idx}`;
                      return (
                        !unaccreditedItems[key] &&
                        individualScores[key] !== undefined &&
                        individualScores[key] !== -1
                      );
                    });

                    if (selected.length === 0) {
                      return (
                        <p className="text-slate-400 font-bold italic">
                          لم يتم اختيار أو تقييم أي معايير بعد...
                        </p>
                      );
                    }

                    return selected.map((activity, idx) => (
                      <div
                        key={idx}
                        className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 animate-in slide-in-from-right-2"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <span className="w-6 h-6 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-black text-slate-700">
                          {activity.text}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : individualForm.reportField ===
              "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس" ? (
              // الحالة أ: المؤشرات
              <div className="grid grid-cols-1 gap-8">
                {INDICATORS_DATA.map((domain, dIdx) => (
                  <div
                    key={dIdx}
                    className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
                  >
                    <div className="bg-slate-800 p-5 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white font-black">
                        {dIdx + 1}
                      </div>
                      <h3 className="text-xl font-black text-white">
                        {domain.label}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {domain.items.map((item, iIdx) => {
                        const key = `${domain.label}_${iIdx}`;
                        const score = individualScores[key] ?? -1;
                        return (
                          <div
                            key={iIdx}
                            className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <span className="text-slate-700 font-bold flex-1 min-w-[300px]">
                              {item}
                            </span>
                            <div className="flex items-center gap-2">
                              {[0, 1, 2, 3, 4].map((num) => (
                                <button
                                  key={num}
                                  onClick={() =>
                                    setIndividualScores({
                                      ...individualScores,
                                      [key]: num,
                                    })
                                  }
                                  style={{
                                    backgroundColor:
                                      score === num
                                        ? num === 0
                                          ? "#991b1b"
                                          : num === 1
                                            ? "#ea580c"
                                            : num === 2
                                              ? "#eab308"
                                              : num === 3
                                                ? "#2563eb"
                                                : "#166534"
                                        : "transparent",
                                    color: score === num ? "white" : "#64748b",
                                    borderColor:
                                      score === num ? "transparent" : "#e2e8f0",
                                  }}
                                  className="w-10 h-10 rounded-full border-2 font-black font-sans transition-all transform active:scale-90"
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // الحالة ب: الأنشطة
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!ACTIVITIES_DATA[individualForm.reportField] ||
                ACTIVITIES_DATA[individualForm.reportField].length === 0 ? (
                  <div className="md:col-span-2 flex flex-col items-center justify-center p-20 bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6 shadow-inner animate-pulse">
                      <AlertCircle size={48} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 italic tracking-tighter shadow-sm">
                      قيد التطوير
                    </h3>
                    <p className="text-slate-400 font-bold mt-2">
                      جاري العمل على إضافة المعايير الخاصة بهذا المجال
                    </p>
                  </div>
                ) : (
                  (getActivitiesForField(individualForm.reportField) || []).map(
                    (activity, idx) => {
                      const key = `${individualForm.reportField}_${idx}`;
                      const score = individualScores[key] ?? -1;
                      const executed =
                        executedCounts[key] !== undefined
                          ? executedCounts[key]
                          : parseInt(String(activity.planned)) || 0;
                      const status = evidenceStatus[key] || "لم يتم التحديد";
                      const isUnaccredited = unaccreditedItems[key] || false;

                      return (
                        <div
                          key={key}
                          className={`bg-white p-6 rounded-[2.5rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-slate-100 space-y-5 transition-all hover:shadow-2xl ${isUnaccredited ? "opacity-60 grayscale-[0.5]" : ""}`}
                        >
                          {/* Header: Activity Name + Logic */}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setUnaccreditedItems({
                                      ...unaccreditedItems,
                                      [key]: !isUnaccredited,
                                    })
                                  }
                                  className={`p-2 rounded-xl transition-all active:scale-90 flex items-center gap-2 ${isUnaccredited ? "bg-rose-100 text-rose-600" : "bg-emerald-50 text-emerald-500"}`}
                                >
                                  <Star
                                    size={18}
                                    fill={
                                      isUnaccredited ? "none" : "currentColor"
                                    }
                                  />
                                  <span className="text-[10px] font-black">
                                    {isUnaccredited ? "غير معتمد" : "معتمد"}
                                  </span>
                                </button>
                                <h4 className="text-lg font-black text-slate-800">
                                  {activity.text}
                                </h4>
                              </div>
                            </div>

                            {/* Row 1: Planned & Executed */}
                            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-400">
                                  المخطط:
                                </span>
                                <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                  {activity.planned}
                                </span>
                              </div>
                              <div className="w-px h-6 bg-slate-200 mx-2"></div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-400">
                                  المنفذ:
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      if (executed > 0) {
                                        setExecutedCounts({
                                          ...executedCounts,
                                          [key]: executed - 1,
                                        });
                                      }
                                    }}
                                    disabled={isUnaccredited}
                                    className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-100 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-90 select-none shadow-sm cursor-pointer"
                                    title="اضغط للإنقاص"
                                  >
                                    {executed}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const max =
                                        parseInt(String(activity.planned)) || 0;
                                      if (executed < max) {
                                        setExecutedCounts({
                                          ...executedCounts,
                                          [key]: executed + 1,
                                        });
                                      }
                                    }}
                                    disabled={isUnaccredited}
                                    className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 transition-all active:scale-90"
                                    title="زيادة"
                                  >
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Rows 2 & 3 Combined Container */}
                          <div className="flex flex-wrap items-center justify-between gap-5 pt-4 border-t border-slate-50">
                            {/* Evidence Row */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-400">
                                  الشاهد:
                                </span>
                                <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg">
                                  {activity.evidence}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const states: (
                                    | "توفر الشاهد"
                                    | "الشاهد ناقص"
                                    | "لم يتوفر الشاهد"
                                  )[] = [
                                    "توفر الشاهد",
                                    "الشاهد ناقص",
                                    "لم يتوفر الشاهد",
                                  ];
                                  const currentIdx = states.indexOf(
                                    (evidenceStatus[key] ||
                                      "توفر الشاهد") as any,
                                  );
                                  const nextIdx =
                                    (currentIdx + 1) % states.length;
                                  setEvidenceStatus({
                                    ...evidenceStatus,
                                    [key]: states[nextIdx],
                                  });
                                }}
                                disabled={isUnaccredited}
                                className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all active:scale-95 shadow-sm border ${
                                  !evidenceStatus[key] ||
                                  evidenceStatus[key] === "توفر الشاهد"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : evidenceStatus[key] === "الشاهد ناقص"
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : evidenceStatus[key] ===
                                          "لم يتوفر الشاهد"
                                        ? "bg-rose-50 text-rose-600 border-rose-200"
                                        : "bg-slate-50 text-slate-400 border-slate-200"
                                }`}
                              >
                                {evidenceStatus[key] || "توفر الشاهد"}
                              </button>
                            </div>

                            {/* Score Row */}
                            <div className="flex flex-col gap-2 items-end">
                              <span className="text-[10px] font-black text-slate-400">
                                نسبة التنفيذ
                              </span>
                              <div className="flex items-center gap-1.5">
                                {[0, 1, 2, 3, 4].map((num) => (
                                  <button
                                    key={num}
                                    onClick={() =>
                                      setIndividualScores({
                                        ...individualScores,
                                        [key]: num,
                                      })
                                    }
                                    disabled={isUnaccredited}
                                    style={{
                                      backgroundColor:
                                        score === num
                                          ? num === 0
                                            ? "#991b1b"
                                            : num === 1
                                              ? "#ea580c"
                                              : num === 2
                                                ? "#eab308"
                                                : num === 3
                                                  ? "#2563eb"
                                                  : "#166534"
                                          : "#f8fafc",
                                      color:
                                        score === num ? "white" : "#94a3b8",
                                    }}
                                    className="w-9 h-9 rounded-full font-black font-sans text-xs transition-all transform active:scale-90 shadow-sm disabled:opacity-50 border border-slate-100 hover:border-blue-200"
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <label className="text-[10px] font-black text-slate-400 mb-1.5 block pr-4">
                              أسباب عدم التنفيذ
                            </label>
                            <textarea
                              rows={1}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black text-slate-700 outline-none focus:bg-white focus:border-amber-200 focus:ring-4 focus:ring-amber-50 transition-all resize-none custom-scrollbar overflow-hidden"
                              placeholder="اكتب التبريرات هنا..."
                              value={failureReasons[key] || ""}
                              onChange={(e) => {
                                setFailureReasons({
                                  ...failureReasons,
                                  [key]: e.target.value,
                                });
                                e.target.style.height = "auto";
                                e.target.style.height =
                                  e.target.scrollHeight + "px";
                              }}
                              onFocus={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height =
                                  e.target.scrollHeight + "px";
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            )}
          </div>

          {/* 3. Summary Results */}
          <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-wrap items-center justify-between gap-10 shadow-2xl">
            <div className="flex gap-10">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-bold text-sm">
                  إجمالي الدرجات الممكنة
                </span>
                <span className="text-white text-5xl font-black font-sans">
                  {individualForm.reportField ===
                  "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                    ? INDICATORS_DATA.reduce(
                        (acc, d) => acc + d.items.length * 4,
                        0,
                      )
                    : (() => {
                        const activities =
                          getActivitiesForField(individualForm.reportField) ||
                          [];
                        const totalMax = activities.reduce((acc, _, idx) => {
                          const key = `${individualForm.reportField}_${idx}`;
                          return unaccreditedItems[key] ? acc : acc + 4;
                        }, 0);
                        return totalMax;
                      })()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-bold text-sm">
                  إجمالي المنفذ
                </span>
                <span className="text-blue-400 text-5xl font-black font-sans">
                  {individualForm.reportField ===
                  "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                    ? Object.values(individualScores).reduce(
                        (acc, s) => acc + (s === -1 ? 0 : s),
                        0,
                      )
                    : (() => {
                        const activities =
                          getActivitiesForField(individualForm.reportField) ||
                          [];
                        const obtained = activities.reduce((acc, _, idx) => {
                          const key = `${individualForm.reportField}_${idx}`;
                          if (unaccreditedItems[key]) return acc;
                          return acc + (individualScores[key] ?? 0);
                        }, 0);
                        return obtained;
                      })()}
                </span>
              </div>
            </div>

            {(() => {
              const possible =
                individualForm.reportField ===
                "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                  ? INDICATORS_DATA.reduce(
                      (acc, d) => acc + d.items.length * 4,
                      0,
                    )
                  : (() => {
                      const activities =
                        getActivitiesForField(individualForm.reportField) || [];
                      const totalMax = activities.reduce((acc, _, idx) => {
                        const key = `${individualForm.reportField}_${idx}`;
                        return unaccreditedItems[key] ? acc : acc + 4;
                      }, 0);
                      return totalMax;
                    })();
              const earned =
                individualForm.reportField ===
                "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                  ? Object.values(individualScores).reduce(
                      (acc, s) => acc + (s === -1 ? 0 : s),
                      0,
                    )
                  : (() => {
                      const activities =
                        getActivitiesForField(individualForm.reportField) || [];
                      const obtained = activities.reduce((acc, _, idx) => {
                        const key = `${individualForm.reportField}_${idx}`;
                        if (unaccreditedItems[key]) return acc;
                        return acc + (individualScores[key] ?? 0);
                      }, 0);
                      return obtained;
                    })();
              const percent = possible > 0 ? (earned / possible) * 100 : 0;
              const status =
                percent >= 90
                  ? { text: "ممتاز", color: "bg-green-600" }
                  : percent >= 80
                    ? { text: "جيد جداً", color: "bg-blue-600" }
                    : percent >= 60
                      ? { text: "جيد", color: "bg-yellow-600" }
                      : { text: "القصور كبير", color: "bg-red-700" };

              return (
                <div
                  className={`px-12 py-8 rounded-[2rem] ${status.color} text-white flex flex-col items-center gap-1 shadow-xl transform hover:scale-105 transition-all`}
                >
                  <span className="text-[4rem] font-black font-sans leading-none">
                    {percent.toFixed(0)}%
                  </span>
                  <span className="text-xl font-black">{status.text}</span>
                </div>
              );
            })()}
            <div className="flex flex-col items-center">
              <span className="text-slate-500 font-black text-xs mb-2 tracking-[0.2em] uppercase">
                الإنجاز الكلي
              </span>
              <div className="relative flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-800"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-blue-500 transition-all duration-1000"
                    strokeDasharray={251.2}
                    strokeDashoffset={
                      251.2 -
                      251.2 *
                        (() => {
                          const possible =
                            individualForm.reportField ===
                            "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                              ? INDICATORS_DATA.reduce(
                                  (acc, d) => acc + d.items.length * 4,
                                  0,
                                )
                              : (() => {
                                  const activities =
                                    getActivitiesForField(
                                      individualForm.reportField,
                                    ) || [];
                                  const totalMax = activities.reduce(
                                    (acc, _, idx) => {
                                      const key = `${individualForm.reportField}_${idx}`;
                                      return unaccreditedItems[key]
                                        ? acc
                                        : acc + 4;
                                    },
                                    0,
                                  );
                                  return totalMax;
                                })();
                          const earned =
                            individualForm.reportField ===
                            "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                              ? Object.values(individualScores).reduce(
                                  (acc, s) => acc + (s === -1 ? 0 : s),
                                  0,
                                )
                              : (() => {
                                  const activities =
                                    getActivitiesForField(
                                      individualForm.reportField,
                                    ) || [];
                                  const obtained = activities.reduce(
                                    (acc, _, idx) => {
                                      const key = `${individualForm.reportField}_${idx}`;
                                      if (unaccreditedItems[key]) return acc;
                                      return acc + (individualScores[key] ?? 0);
                                    },
                                    0,
                                  );
                                  return obtained;
                                })();
                          return possible > 0 ? earned / possible : 0;
                        })()
                    }
                  />
                </svg>
                <span className="absolute text-xl font-black text-white font-sans">
                  {(() => {
                    const possible =
                      individualForm.reportField ===
                      "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                        ? INDICATORS_DATA.reduce(
                            (acc, d) => acc + d.items.length * 4,
                            0,
                          )
                        : (() => {
                            const activities =
                              getActivitiesForField(
                                individualForm.reportField,
                              ) || [];
                            const totalMax = activities.reduce(
                              (acc, _, idx) => {
                                const key = `${individualForm.reportField}_${idx}`;
                                return unaccreditedItems[key] ? acc : acc + 4;
                              },
                              0,
                            );
                            return totalMax;
                          })();
                    const earned =
                      individualForm.reportField ===
                      "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                        ? Object.values(individualScores).reduce(
                            (acc, s) => acc + (s === -1 ? 0 : s),
                            0,
                          )
                        : (() => {
                            const activities =
                              getActivitiesForField(
                                individualForm.reportField,
                              ) || [];
                            const obtained = activities.reduce(
                              (acc, _, idx) => {
                                const key = `${individualForm.reportField}_${idx}`;
                                if (unaccreditedItems[key]) return acc;
                                return acc + (individualScores[key] ?? 0);
                              },
                              0,
                            );
                            return obtained;
                          })();
                    return possible > 0
                      ? Math.round((earned / possible) * 100)
                      : 0;
                  })()}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* 4. Notes & Additions */}
          <div className="space-y-8">
            {/* Violations */}
            <div className="bg-red-50/50 p-8 rounded-[2.5rem] border-2 border-red-50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-red-900 flex items-center gap-2">
                  <AlertCircle className="text-red-600" /> المخالفات
                </h3>
                <button
                  onClick={() => {
                    const text = prompt("أدخل نص المخالفة:");
                    if (text) setViolationTags([...violationTags, text]);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-100"
                >
                  إضافة عنصر
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {violationTags.map((tag, idx) => (
                  <button
                    key={`${tag}-${idx}`}
                    onClick={() => {
                      const updated = activeViolationTags.includes(tag)
                        ? activeViolationTags.filter((t) => t !== tag)
                        : [...activeViolationTags, tag];
                      setActiveViolationTags(updated);
                      setViolationsText(updated.join(" - "));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeViolationTags.includes(tag) ? "bg-red-600 text-white" : "bg-white text-red-600 border border-red-100 hover:bg-red-50"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full bg-white border-2 border-red-100 rounded-[1.5rem] p-6 font-black h-32 outline-none focus:border-red-500 transition-all text-red-900"
                placeholder="اكتب المخالفات هنا..."
                value={violationsText}
                onChange={(e) => setViolationsText(e.target.value)}
              />
            </div>

            {/* Notes & Recommendations */}
            <div className="bg-amber-50/50 p-8 rounded-[2.5rem] border-2 border-amber-50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-amber-900 flex items-center gap-2">
                  <MessageSquare className="text-amber-600" /> الملاحظات
                  والتوصيات
                </h3>
                <button
                  onClick={() => {
                    const text = prompt("أدخل نص الملاحظة:");
                    if (text) setNoteTags([...noteTags, text]);
                  }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-100"
                >
                  إضافة عنصر
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {noteTags.map((tag, idx) => (
                  <button
                    key={`${tag}-${idx}`}
                    onClick={() => {
                      const updated = activeNoteTags.includes(tag)
                        ? activeNoteTags.filter((t) => t !== tag)
                        : [...activeNoteTags, tag];
                      setActiveNoteTags(updated);
                      setNotesText(updated.join(" - "));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeNoteTags.includes(tag) ? "bg-amber-600 text-white" : "bg-white text-amber-600 border border-amber-100 hover:bg-amber-50"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full bg-white border-2 border-amber-100 rounded-[1.5rem] p-6 font-black h-32 outline-none focus:border-amber-500 transition-all text-amber-900"
                placeholder="اكتب الملاحظات والتوصيات هنا..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
            </div>

            {/* Employee Comment */}
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">
                  تعليق الموظف
                </h3>
                <button
                  onClick={() => {
                    const possible =
                      individualForm.reportField ===
                      "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس"
                        ? INDICATORS_DATA.reduce(
                            (acc, d) => acc + d.items.length * 4,
                            0,
                          )
                        : (ACTIVITIES_DATA[individualForm.reportField] || [])
                            .length * 4;
                    const earned = Object.values(individualScores).reduce(
                      (acc, s) => acc + (s === -1 ? 0 : s),
                      0,
                    );
                    const percent =
                      possible > 0 ? (earned / possible) * 100 : 0;

                    if (percent <= 80) {
                      if (percent <= 40)
                        setEmployeeComment(
                          "تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وأتعهد بالمتابعة لكل ما ذكر",
                        );
                      else
                        setEmployeeComment(
                          "تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وسأعمل على الأخذ بكافة ما تم ذكره.",
                        );
                    } else {
                      setEmployeeComment(
                        "تم الاطلاع على التقرير كاملاً بما في ذلك جميع الإيجابيات والملاحظات والتوصيات، وسأعمل على الاستمرار في الصدارة و الأخذ بكافة ما تم ذكره.",
                      );
                    }
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-200"
                >
                  إنشاء تعليق الموظف
                </button>
              </div>
              <textarea
                className="w-full bg-white border-2 border-slate-200 rounded-[1.5rem] p-6 font-black h-32 outline-none focus:border-blue-500 transition-all text-slate-800"
                placeholder="تعليق الموظف..."
                value={employeeComment}
                onChange={(e) => setEmployeeComment(e.target.value)}
              />
            </div>
          </div>

          {/* 5. Final Actions */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-wrap gap-4 mt-8">
            <button
              onClick={saveToArchive}
              className="flex-1 bg-emerald-600 text-white rounded-[1.8rem] py-5 font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Archive size={24} />
              أرشفة التقرير
            </button>
            <button
              onClick={exportIndividualToExcel}
              className="flex-1 bg-blue-600 text-white rounded-[1.8rem] py-5 font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Download size={24} />
              تصدير إكسل
            </button>
            <button
              onClick={exportIndividualToTxt}
              className="flex-1 bg-rose-600 text-white rounded-[1.8rem] py-5 font-black text-lg shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <FileText size={24} />
              تصدير TXT
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className="flex-1 bg-slate-800 text-white rounded-[1.8rem] py-5 font-black text-lg shadow-xl shadow-slate-200 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Archive size={24} />
              أرشيف التقارير
            </button>
            <button
              onClick={() => {
                const isIndicators =
                  individualForm.reportField ===
                  "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس";
                let msg = `*✨ تقرير متابعة فردي ✨*\n`;
                msg += `🏛️ *المدرسة:* ${individualForm.schoolName}\n`;
                msg += `👤 *الموظف:* ${individualForm.employeeName}\n`;
                msg += `📅 *التاريخ:* ${reportDate} (${toHijri(reportDate)})\n`;
                msg += `المجال: ${individualForm.reportField}\n`;
                msg += `━━━━━━━━━━━━━━━\n\n`;

                if (isIndicators) {
                  INDICATORS_DATA.forEach((d) => {
                    let ds = 0;
                    d.items.forEach(
                      (_, i) =>
                        (ds += individualScores[`${d.label}_${i}`] || 0),
                    );
                    msg += `◽ *${d.label}:* ${ds} / ${d.items.length * 4}\n`;
                  });
                } else {
                  (
                    getActivitiesForField(individualForm.reportField) || []
                  ).forEach((a, i) => {
                    const k = `${individualForm.reportField}_${i}`;
                    if (unaccreditedItems[k]) return;
                    const s = individualScores[k] || 0;
                    const executed =
                      executedCounts[k] !== undefined
                        ? executedCounts[k]
                        : parseInt(String(a.planned)) || 0;
                    const icon = s >= 3 ? "🟢" : s >= 2 ? "🟡" : "🔴";
                    msg += `${icon} ${a.text}\n`;
                    msg += `   └ المخطط: ${a.planned} | المنفذ: ${executed} | الدرجة: ${s}/4\n`;
                  });
                }

                if (violationTags.length > 0)
                  msg += `\n⚠️ *المخالفات:* ${violationTags.join("، ")}`;
                if (notesText) msg += `\n📝 *الملاحظات:* ${notesText}`;

                // Footer with School & Branch
                msg += `\n\n${getReportMessageFooter(reportDate)}`;

                shareViaWhatsApp(msg);
              }}
              className="w-full bg-green-600 text-white rounded-[1.8rem] py-5 font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Share2 size={24} />
              مشاركة عبر واتساب
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Selector Bar */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-4 border-slate-50 flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                <ListFilter size={18} className="text-blue-500" /> نوع المتابعة
              </label>
              <select
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                value={followUpType}
                onChange={(e) => {
                  if (e.target.value === "ADD_NEW") {
                    const customName = prompt("أدخل مسمى نوع المتابعة الجديد:");
                    if (customName) {
                      setReportFields([...reportFields, customName]);
                      setFollowUpType(customName);
                    }
                  } else {
                    setFollowUpType(e.target.value);
                  }
                }}
              >
                {reportFields.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="ADD_NEW">+ إضافة نوع متابعة جديد</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 min-w-[200px]">
              <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                <UserCircle size={18} className="text-blue-500" /> كاتب التقرير
              </label>
              <input
                type="text"
                className="bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3.5 font-black text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-sans"
                placeholder="اسم كاتب التقرير..."
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                <FileBarChart2 size={18} className="text-blue-500" /> نوع
                التقرير
              </label>
              <div className="flex gap-2">
                {["أسبوعي", "شهري", "فصلي", "سنوي"].map((period) => (
                  <button
                    key={period}
                    onClick={() =>
                      setSelectedReportPeriod(
                        selectedReportPeriod === period ? null : period,
                      )
                    }
                    className={`px-5 py-3.5 border-2 rounded-[1.2rem] font-black text-xs transition-all shadow-sm active:scale-95 ${
                      selectedReportPeriod === period
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-blue-500"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {selectedReportPeriod && (
              <div className="flex flex-col gap-2 flex-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                  <Calendar size={18} className="text-amber-500" /> فترة التجميع
                  (من تاريخ - إلى تاريخ)
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-2">
                      من تاريخ
                    </span>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3 font-bold text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 font-sans transition-all"
                      value={aggDateFrom}
                      onChange={(e) => setAggDateFrom(e.target.value)}
                    />
                  </div>
                  <span className="text-slate-400 font-bold mt-5">إلى</span>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-2">
                      إلى تاريخ
                    </span>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] p-3 font-bold text-xs outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 font-sans transition-all"
                      value={aggDateTo}
                      onChange={(e) => setAggDateTo(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      aggregateReports(selectedReportPeriod);
                      setSelectedReportPeriod(null);
                    }}
                    className="mt-5 px-6 py-3 bg-amber-500 text-white rounded-[1.2rem] font-black text-xs hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95"
                  >
                    تجميع
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={createNewReport}
              className="mt-auto h-[58px] px-8 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 transform hover:scale-[1.02] active:scale-95"
            >
              <Plus size={22} /> إظهار التقرير
            </button>
          </div>

          {currentReportId && (
            <>
              {/* Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 backdrop-blur-lg p-5 rounded-[2.2rem] border border-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={createNewReport}
                    className="flex items-center gap-2 h-11 px-5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    <Plus size={18} /> إضافة جدول
                  </button>
                  <button
                    onClick={() => setShowArchive(true)}
                    className="flex items-center gap-2 h-11 px-5 bg-slate-800 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-100 hover:bg-slate-900 transition-all"
                  >
                    <Archive size={18} /> أرشيف التقارير
                  </button>
                  <button
                    onClick={() =>
                      currentReportId && deleteReport(currentReportId)
                    }
                    className="flex items-center gap-2 h-11 px-5 bg-rose-100 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-200 transition-all"
                  >
                    <Trash2 size={18} /> حذف التقرير
                  </button>
                  <div className="h-8 w-[2px] bg-slate-200 mx-2" />
                  <button
                    onClick={addEmployee}
                    className="flex items-center gap-2 h-11 px-5 bg-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
                  >
                    <UserPlus size={18} /> إضافة اسم
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".txt,.xml,.xlsx";
                      input.onchange = (e) =>
                        toast.success("تم استيراد الأسماء بنجاح (محاكاة)");
                      input.click();
                    }}
                    className="flex items-center gap-2 h-11 px-5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                  >
                    <FileUp size={18} /> استيراد الأسماء
                  </button>
                  <button
                    onClick={() => {
                      if (employees.length > 0)
                        setShowIndividualModal(employees[0].id);
                    }}
                    className="flex items-center gap-2 h-11 px-5 bg-purple-600 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all"
                  >
                    <UserCircle size={18} /> تقرير فردي
                  </button>
                  <div className="h-8 w-[2px] bg-slate-200 mx-2" />
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 h-11 px-5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                  >
                    <Download size={18} /> excel الجماعي
                  </button>
                  <div className="h-8 w-[2px] bg-slate-200 mx-2" />
                  <button
                    onClick={exportToTxt}
                    className="flex items-center gap-2 h-11 px-5 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all"
                  >
                    <FileText size={18} /> TXT
                  </button>
                  <button
                    onClick={() => generateWhatsAppReport("bulk")}
                    className="flex items-center gap-2 h-11 px-5 bg-green-600 text-white rounded-xl text-xs font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
                  >
                    <Share2 size={18} /> واتساب
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="بحث سريع عن اسم..."
                      className="bg-white border-2 border-slate-100 rounded-2xl pr-12 pl-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none w-72 shadow-inner transition-all font-sans"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Report Title Header */}
              {(() => {
                const report = data.adminReports?.find(
                  (r) => r.id === currentReportId,
                );
                if (!report) return null;
                return (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center gap-2 text-center animate-in mb-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                      {getReportTitle(report)}
                    </h2>
                    <div className="flex items-center gap-3 bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
                      <Calendar size={18} className="text-blue-500" />
                      <span className="font-black text-slate-600 text-sm">
                        {getReportDateLabel(report)}
                      </span>
                    </div>
                    {hasPermissionToEdit && (
                      <div className="mt-4 flex gap-4 items-center">
                        {!isEditingReport ? (
                          <button
                            onClick={() => setIsEditingReport(true)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                          >
                            <Edit3 size={16} />
                            تعديل البيانات
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setIsEditingReport(false);
                              toast.success("تم اعتماد التعديل الجديد بنجاح");
                            }}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                          >
                            <Check size={16} />
                            اعتماد التعديل الجديد
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Smart Table */}
              <div className="bg-white rounded-[2.8rem] shadow-2xl border-[8px] border-[#800000] overflow-hidden flex flex-col min-h-[550px] animate-in zoom-in-95 duration-500 relative print:border-0 print:shadow-none">
                <div className="overflow-x-auto overflow-y-auto max-h-[750px] staff-follow-table custom-scrollbar">
                  <table className="w-full border-collapse text-right select-none">
                    <thead className="sticky top-0 z-30 shadow-xl border-b-2 border-slate-200">
                      {/* Row 1: Categories */}
                      <tr className="bg-[#FFD966] text-[#4F3F0F] h-12">
                        <th
                          rowSpan={2}
                          className="w-12 p-2 border-e border-[#E6B11F] text-center text-xs font-black bg-[#E6B11F]/20 font-sans"
                        >
                          #
                        </th>
                        <th
                          rowSpan={2}
                          className="w-12 p-2 border-e border-[#E6B11F] text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded cursor-pointer accent-[#D4A017]"
                              checked={
                                selectedEmployees.length === employees.length &&
                                employees.length > 0
                              }
                              onChange={() =>
                                setSelectedEmployees(
                                  selectedEmployees.length === employees.length
                                    ? []
                                    : employees.map((e) => e.id),
                                )
                              }
                            />
                            {selectedEmployees.length > 0 && (
                              <button
                                onClick={() =>
                                  deleteEmployees(selectedEmployees)
                                }
                                className="text-red-600 hover:text-red-700 transition-colors"
                                title="حذف المحددين"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </th>
                        <th
                          rowSpan={2}
                          className="min-w-[220px] p-4 border-e border-[#E6B11F] text-sm font-black text-center"
                        >
                          اسم الموظف والبيانات
                        </th>
                        <th
                          colSpan={displayedMetrics.length}
                          className="p-2 border-e border-[#E6B11F] text-xs font-black text-center tracking-widest shadow-inner"
                        >
                          مجالات تقييم الموظفين
                        </th>
                        <th
                          rowSpan={2}
                          className="min-w-[80px] p-2 border-e border-[#E6B11F] text-xs font-black text-center shadow-inner"
                        >
                          المخالفات
                        </th>
                        <th
                          colSpan={2}
                          className="p-2 border-e border-[#E6B11F] text-xs font-black text-center tracking-widest"
                        >
                          المجموع الكلي
                        </th>
                        <th
                          rowSpan={2}
                          className="min-w-[160px] p-2 border-e border-[#E6B11F] text-xs font-black text-center"
                        >
                          الملاحظات والتوصيات
                        </th>
                        <th
                          rowSpan={2}
                          className="w-24 p-2 text-xs font-black text-center"
                        >
                          إجراءات
                        </th>
                      </tr>
                      {/* Row 2: Metrics */}
                      <tr className="bg-slate-50 text-slate-700 h-32 shadow-md">
                        {displayedMetrics.map((m) => (
                          <th
                            key={m.key}
                            className="p-1 border-e border-slate-200 min-w-[90px] align-bottom transition-all relative overflow-hidden group"
                            style={getMetricStyle(m)}
                          >
                            <div className="flex flex-col items-center justify-between h-full gap-2 py-2">
                              <div
                                className={`font-black text-[11px] leading-tight text-center px-1 break-words max-w-[85px] line-clamp-3 mb-auto ${getTextColor(m.color)}`}
                              >
                                {m.label.split(" ").map((word, i, arr) => (
                                  <React.Fragment key={`word-${word}-${i}`}>
                                    {word}{" "}
                                    {(i + 1) % 2 === 0 &&
                                      i !== arr.length - 1 && <br />}
                                  </React.Fragment>
                                ))}
                              </div>
                              <div className="flex flex-col items-center gap-1 w-full px-1.5 z-10 mt-auto">
                                <input
                                  type="number"
                                  className="w-full bg-white/40 backdrop-blur-sm border-2 border-slate-200/50 rounded-lg text-center text-[11px] font-black py-1 outline-none font-sans focus:border-white transition-all text-current"
                                  value={toEnglishNum(
                                    m.max *
                                      (data.adminReports?.find(
                                        (r) => r.id === currentReportId,
                                      )?.reportCount || 1),
                                  )}
                                  readOnly
                                />
                                <div className="flex items-center gap-1 w-full">
                                  <input
                                    type="number"
                                    placeholder="قيمة"
                                    className="w-full bg-white/20 border-none rounded-md text-center text-[9px] font-black py-0.5 outline-none font-sans text-current placeholder:text-current/50"
                                    value={fillValues[m.key] || ""}
                                    onChange={(e) =>
                                      setFillValues((prev) => ({
                                        ...prev,
                                        [m.key]: parseInt(e.target.value) || 0,
                                      }))
                                    }
                                  />
                                  <button
                                    onClick={() =>
                                      fillMetricColumn(
                                        m.key,
                                        Math.min(
                                          m.max,
                                          fillValues[m.key] || m.max,
                                        ),
                                      )
                                    }
                                    className="bg-white/30 text-current rounded-md p-1 hover:bg-white/50 transition-all shadow-sm active:scale-90"
                                    title="تعبئة الدرجة للعمود"
                                  >
                                    <Zap size={10} className="mx-auto" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          </th>
                        ))}
                        <th className="p-3 border-e border-slate-200 text-[11px] font-black bg-indigo-50/80 text-indigo-900 text-center">
                          المجموع
                        </th>
                        <th className="p-3 border-slate-200 text-[11px] font-black bg-indigo-50/80 text-indigo-900 text-center">
                          النسبة %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={100}
                            className="p-32 text-center text-slate-300 font-bold text-lg"
                          >
                            لم يتم رصد أي موظفين بعد في هذا الجدول
                          </td>
                        </tr>
                      ) : (
                        employees
                          .filter((e) => e.employeeName?.includes(searchTerm))
                          .slice(0, displayLimit)
                          .map((emp, idx) => {
                            const total = calculateTotal(emp);
                            const max = calculateMaxTotal(emp);
                            const percent =
                              max > 0 ? ((total / max) * 100).toFixed(1) : "0";
                            return (
                              <tr
                                key={`${emp.id}-${idx}`}
                                onClick={() => setHighlightedRowId(emp.id)}
                                className={`transition-all duration-200 group h-14 ${highlightedRowId === emp.id ? "bg-blue-50" : selectedEmployees.includes(emp.id) ? "bg-indigo-50/50" : "hover:bg-slate-50/80"}`}
                              >
                                <td className="p-3 border-e text-center text-xs font-bold text-slate-400 font-sans">
                                  {idx + 1}
                                </td>
                                <td className="p-3 border-e text-center">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded cursor-pointer transition-transform group-hover:scale-110"
                                    checked={selectedEmployees.includes(emp.id)}
                                    onChange={() =>
                                      setSelectedEmployees((prev) =>
                                        prev.includes(emp.id)
                                          ? prev.filter((id) => id !== emp.id)
                                          : [...prev, emp.id],
                                      )
                                    }
                                  />
                                </td>
                                <td className="p-4 border-e bg-inherit">
                                  <div className="flex flex-col gap-1.5">
                                    <input
                                      type="text"
                                      className="bg-transparent border-none font-black text-slate-800 text-sm outline-none w-full focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-1 transition-all"
                                      value={emp.employeeName}
                                      onChange={(e) =>
                                        updateEmployee(emp.id, {
                                          employeeName: e.target.value,
                                        })
                                      }
                                    />
                                    <div className="flex flex-wrap gap-1.5 text-[8px] font-black">
                                      <select
                                        className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border-none outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                                        value={emp.gender}
                                        onChange={(e) =>
                                          e.target.value === "ADD_NEW"
                                            ? handleAddOption("gender", emp.id)
                                            : updateEmployee(emp.id, {
                                                gender: e.target.value,
                                              })
                                        }
                                      >
                                        <option value="ذكر">ذكر</option>
                                        <option value="أنثى">أنثى</option>
                                        <option value="ADD_NEW">+ إضافة</option>
                                      </select>

                                      <select
                                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border-none outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                                        value={emp.role}
                                        onChange={(e) =>
                                          e.target.value === "ADD_NEW"
                                            ? handleAddOption("role", emp.id)
                                            : updateEmployee(emp.id, {
                                                role: e.target.value,
                                              })
                                        }
                                      >
                                        <option value={emp.role}>
                                          {emp.role}
                                        </option>
                                        <option value="إداري">إداري</option>
                                        <option value="معلم">معلم</option>
                                        <option value="مدير فرع">
                                          مدير فرع
                                        </option>
                                        <option value="ADD_NEW">+ إضافة</option>
                                      </select>

                                      <select
                                        className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border-none outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                                        value={emp.branch}
                                        onChange={(e) =>
                                          e.target.value === "ADD_NEW"
                                            ? handleAddOption("branch", emp.id)
                                            : updateEmployee(emp.id, {
                                                branch: e.target.value,
                                              })
                                        }
                                      >
                                        <option value="المركز الرئيسي">
                                          المركز الرئيسي
                                        </option>
                                        <option value="فرع الطلاب">
                                          فرع الطلاب
                                        </option>
                                        <option value="فرع الطالبات">
                                          فرع الطالبات
                                        </option>
                                        <option value="فرع البراعم">
                                          فرع البراعم
                                        </option>
                                        <option value="ADD_NEW">+ إضافة</option>
                                      </select>
                                    </div>
                                  </div>
                                </td>
                                {displayedMetrics.map((m, mIdx) => {
                                  const isUnaccredited = (
                                    emp.unaccreditedMetrics || []
                                  ).includes(m.key);
                                  const val = Number(emp[m.key]) || 0;
                                  // Use the pastel background from metric color with high transparency
                                  return (
                                    <td
                                      key={`${m.key}-${mIdx}`}
                                      className="p-1 border-e relative group/cell"
                                      style={{
                                        backgroundColor: `${m.color}15`,
                                      }}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <div
                                          className="w-1.5 h-1.5 rounded-full mb-1"
                                          style={{ backgroundColor: m.color }}
                                        />
                                        <input
                                          type="number"
                                          className={`w-full text-center outline-none bg-transparent font-black text-[14px] font-sans transition-all ${isUnaccredited ? "opacity-20 pointer-events-none" : ""} ${!isUnaccredited && val <= m.max * 0.3 && val > 0 ? "text-red-500 scale-110" : "text-slate-800"}`}
                                          value={emp[m.key] || ""}
                                          placeholder="(0)"
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) => {
                                            const v = Math.min(
                                              m.max,
                                              Math.max(
                                                0,
                                                parseInt(e.target.value) || 0,
                                              ),
                                            );
                                            updateEmployee(emp.id, {
                                              [m.key]: v,
                                            });
                                          }}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleAccreditation(emp.id, m.key);
                                          }}
                                          className={`opacity-0 group-hover/cell:opacity-100 transition-all p-0.5 rounded hover:bg-white shadow-sm ${isUnaccredited ? "text-rose-500 opacity-100 scale-110" : "text-slate-300"}`}
                                          title={
                                            isUnaccredited
                                              ? "إلغاء الاستبعاد"
                                              : "استبعاد من الحساب لهذا الموظف"
                                          }
                                        >
                                          <Star
                                            size={11}
                                            className={
                                              isUnaccredited
                                                ? "fill-rose-500"
                                                : ""
                                            }
                                          />
                                        </button>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td
                                  className={`p-1 border-e text-center cursor-pointer transition-colors ${emp.violations_score > 0 ? "bg-red-50/50" : ""}`}
                                  onClick={() =>
                                    setViolationModal({
                                      id: emp.id,
                                      notes: emp.violations_notes,
                                    })
                                  }
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span
                                      className={`text-[14px] font-black font-sans ${emp.violations_score > 0 ? "text-red-600 scale-110 animate-pulse" : "text-slate-300"}`}
                                    >
                                      {emp.violations_score}
                                    </span>
                                    {emp.violations_notes.length > 0 && (
                                      <AlertCircle
                                        size={12}
                                        className="text-red-500"
                                      />
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 border-e text-center font-black text-[14px] text-blue-800 bg-blue-50/40 font-sans">
                                  {total}
                                </td>
                                <td className="p-2 border-e text-center font-black text-[14px] text-blue-800 bg-blue-50/40 font-sans">
                                  {percent}%
                                </td>
                                <td
                                  className="p-2 border-e text-right text-[11px] text-slate-600 max-w-[180px] cursor-pointer hover:bg-amber-50/50 transition-colors"
                                  onClick={() =>
                                    setNotesModal({
                                      empId: emp.id,
                                      text: emp.recommendations || "",
                                    })
                                  }
                                >
                                  <div className="flex items-start gap-1">
                                    <span className="flex-1 line-clamp-3 whitespace-pre-wrap">
                                      {emp.recommendations || ""}
                                    </span>
                                    <MessageSquare
                                      size={14}
                                      className="text-amber-500 flex-shrink-0 mt-0.5"
                                    />
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateWhatsAppReport(emp.id);
                                      }}
                                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                      title="إرسال تقرير فردي بالواتساب"
                                    >
                                      <Send size={18} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteEmployees([emp.id]);
                                      }}
                                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="حذف"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                      {displayLimit <
                        employees.filter((e) =>
                          e.employeeName?.includes(searchTerm),
                        ).length && (
                        <tr>
                          <td
                            colSpan={100}
                            className="p-2 text-center bg-slate-50 border-t"
                          >
                            <button
                              onClick={() =>
                                setDisplayLimit((prev) => prev + 50)
                              }
                              className="px-6 py-2 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-lg border border-slate-200 transition-colors shadow-sm text-xs"
                            >
                              تحميل المزيد... (
                              {employees.filter((e) =>
                                e.employeeName?.includes(searchTerm),
                              ).length - displayLimit}{" "}
                              متبقي)
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-30 bg-[#FFD966] text-[#4F3F0F] font-black text-xs h-16 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
                      <tr className="border-t-4 border-[#E6B11F]">
                        <td
                          colSpan={3}
                          className="px-6 text-right bg-[#E6B11F]/20 border-e border-[#E6B11F] text-sm tracking-wide"
                        >
                          الإحصائيات الإجمالية والنسب المئوية المحققة
                        </td>
                        {displayedMetrics.map((m, mIdx) => (
                          <td
                            key={`${m.key}-footer-${mIdx}`}
                            className="p-2 border-e border-[#E6B11F] text-center"
                            style={{ backgroundColor: `${m.color}15` }}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-sans text-[13px]">
                                ({getColSum(m.key)})
                              </span>
                              <div className="w-10 h-0.5 bg-black opacity-10 rounded-full my-0.5" />
                              <span className="text-[10px] opacity-80 font-sans">
                                {getColPercent(m.key, m.max)}%
                              </span>
                            </div>
                          </td>
                        ))}
                        <td className="border-e border-[#E6B11F] bg-rose-50/50"></td>
                        <td className="bg-amber-100 border-e border-[#E6B11F] text-center text-[15px] font-sans shadow-inner">
                          (
                          {employees.reduce(
                            (acc, e) => acc + calculateTotal(e),
                            0,
                          )}
                          )
                        </td>
                        <td className="bg-amber-200 text-center text-[18px] font-sans shadow-inner text-[#800000]">
                          {(() => {
                            const tSum = employees.reduce(
                              (acc, e) => acc + calculateTotal(e),
                              0,
                            );
                            const tMax = employees.reduce(
                              (acc, e) => acc + calculateMaxTotal(e),
                              0,
                            );
                            return tMax > 0
                              ? ((tSum / tMax) * 100).toFixed(1)
                              : "0";
                          })()}
                          %
                        </td>
                        <td className="bg-[#E6B11F]/20"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures Footer */}
                <div className="flex flex-col gap-8 flex-1">
                  <div className="flex items-center gap-3 text-slate-400 group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:text-blue-600 transition-colors">
                      <UserCircle size={20} />
                    </div>
                    <span className="font-black text-sm tracking-widest uppercase opacity-60">
                      كاتب التقرير
                    </span>
                  </div>
                  <div className="border-b-4 border-slate-200 border-dotted w-full pb-4 px-2">
                    <span className="text-2xl font-black text-slate-800 font-sans">
                      {writer ||
                        data.adminReports?.find((r) => r.id === currentReportId)
                          ?.writer}
                    </span>
                  </div>
                </div>

                <div
                  className="flex flex-col gap-8"
                  style={{ minWidth: "200px" }}
                >
                  <div className="flex items-center gap-3 text-slate-400 group">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:text-blue-600 transition-colors">
                      <Users size={20} />
                    </div>
                    <span className="font-black text-sm tracking-widest uppercase opacity-60">
                      مدير الفرع
                    </span>
                  </div>
                  <div className="border-b-4 border-slate-200 border-dotted w-full pb-4 px-2">
                    <span className="text-2xl font-black text-slate-800 font-sans">
                      {data.profile.branchManager || "......................"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Legend */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-center gap-6 text-[10px] font-black text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-500 rounded" />{" "}
                  درجات ضعيفة (أقل من 30%)
                </div>
                <div className="flex items-center gap-2">
                  <Star size={12} className="text-rose-500 fill-rose-500" />{" "}
                  مجال مستبعد من حسابات هذا الموظف
                </div>
                <div className="flex items-center gap-2 font-sans opacity-70">
                  123 - الأرقام باللاتينية
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl border-[10px] border-white flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-10 bg-slate-900 text-white flex items-center justify-between shadow-2xl">
              <div className="flex flex-col">
                <h3 className="text-3xl font-black tracking-tight">
                  أرشيف تقارير المتابعة
                </h3>
                <p className="text-slate-400 font-bold mt-1">
                  تصفح وإدارة الجوال السابقة
                </p>
              </div>
              <button
                onClick={() => setShowArchive(false)}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90 bg-white/5 border border-white/10"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-10 space-y-4 custom-scrollbar">
              {viewMode === "group" ? (
                (data.adminReports || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                    <Archive size={64} strokeWidth={1} />
                    <span className="font-black text-xl">
                      الأرشيف فارغ حالياً
                    </span>
                  </div>
                ) : (
                  (data.adminReports || [])
                    .filter((r) => r.followUpType === followUpType)
                    .map((r, idx) => {
                      const reportTypeLabel = r.periodName
                        ? r.periodName
                        : "يومي";
                      return (
                        <div
                          key={`${r.id}-${idx}`}
                          className="group relative flex items-center justify-between p-6 bg-slate-50 border-2 border-indigo-100 rounded-[2rem] hover:border-indigo-500 hover:bg-white transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1"
                        >
                          <div
                            className="flex items-center gap-6"
                            onClick={() => {
                              setCurrentReportId(r.id);
                              setFollowUpType(r.followUpType);
                              setWriter(r.writer || "");
                              setIsEditingReport(false);
                              setShowArchive(false);
                            }}
                          >
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center font-black shadow-inner group-hover:scale-110 transition-transform">
                              <Calendar size={28} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                    reportTypeLabel === "يومي"
                                      ? "bg-green-100 text-green-700"
                                      : reportTypeLabel === "الأسبوعي"
                                        ? "bg-blue-100 text-blue-700"
                                        : reportTypeLabel === "الشهري"
                                          ? "bg-purple-100 text-purple-700"
                                          : reportTypeLabel === "الفصلي"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {reportTypeLabel}
                                </span>
                                <span className="font-black text-xl text-slate-800">
                                  {r.dateStr}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full inline-block w-fit">
                                {r.followUpType}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => deleteReport(r.id)}
                              className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                            >
                              <Trash2 size={24} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )
              ) : individualArchive.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                  <Archive size={64} strokeWidth={1} />
                  <span className="font-black text-xl">
                    الأرشيف الفردي فارغ
                  </span>
                </div>
              ) : (
                individualArchive.map((r, idx) => (
                  <div
                    key={`${r.id}-${idx}`}
                    className="group relative flex items-center justify-between p-6 bg-slate-50 border-2 border-emerald-100 rounded-[2rem] hover:border-emerald-500 hover:bg-white transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1"
                  >
                    <div
                      className="flex items-center gap-6"
                      onClick={() => restoreFromArchive(r)}
                    >
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center font-black shadow-inner group-hover:scale-110 transition-transform">
                        <UserCircle size={28} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xl text-slate-800">
                            {r.form.employeeName || "تقرير بدون اسم"}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {r.reportDate}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full inline-block w-fit">
                          {r.form.reportField}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => deleteFromArchive(r.id)}
                        className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Violation Modal */}
      {violationModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-red-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-[0_30px_60px_-15px_rgba(220,38,38,0.3)] border-[6px] border-white p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-[1.2rem] flex items-center justify-center shadow-inner">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    سجل المخالفات
                  </h3>
                  <p className="text-red-500 text-sm font-bold tracking-tight">
                    رصد السلوكيات والتقصير الإداري
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViolationModal(null)}
                className="p-3 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all active:scale-90"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-600 mr-2 flex items-center gap-2">
                  درجة المخالفة{" "}
                  <span className="text-xs text-slate-400">
                    (تطرح من المجموع)
                  </span>
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border-3 border-slate-100 rounded-[1.5rem] p-5 font-black text-2xl text-center text-red-600 focus:ring-8 focus:ring-red-100 focus:border-red-500 outline-none transition-all font-sans"
                  value={
                    employees.find((e) => e.id === violationModal.id)
                      ?.violations_score || 0
                  }
                  onChange={(e) =>
                    updateEmployee(violationModal.id, {
                      violations_score: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-600 mr-2">
                  تفاصيل الملاحظات{" "}
                  <span className="text-xs text-slate-400">
                    (كل ملاحظة في سطر)
                  </span>
                </label>
                <textarea
                  className="w-full bg-slate-50 border-3 border-slate-100 rounded-[1.5rem] p-6 font-black h-48 outline-none focus:ring-8 focus:ring-slate-100 focus:border-slate-800 transition-all text-slate-800 leading-relaxed custom-scrollbar"
                  placeholder="مثال: تأخر في تسليم التقارير، مخالفة الزي الرسمي..."
                  value={(violationModal.notes || []).join("\n")}
                  onChange={(e) =>
                    updateEmployee(violationModal.id, {
                      violations_notes: e.target.value
                        .split("\n")
                        .filter((n) => n.trim()),
                    })
                  }
                />
              </div>
              <button
                onClick={() => setViolationModal(null)}
                className="w-full bg-slate-900 text-white p-6 rounded-[1.8rem] font-black text-xl shadow-2xl hover:bg-black transition-all transform active:scale-95 shadow-slate-200"
              >
                اعتماد وحفظ السجل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Domains Modal */}
      {showCustomizer && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl border-[8px] border-white flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-8 bg-amber-500 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black">إدارة مجالات التقارير</h3>
                <p className="text-amber-100 font-bold text-sm">
                  تعديل قائمة الـ 22 مجالاً للمتابعة
                </p>
              </div>
              <button
                onClick={() => setShowCustomizer(false)}
                className="p-3 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto space-y-4 custom-scrollbar">
              <button
                onClick={() => {
                  const name = prompt("أدخل مسمى المجال الجديد:");
                  if (name) setReportFields([...reportFields, name]);
                }}
                className="w-full p-6 bg-amber-50 border-2 border-amber-200 border-dashed rounded-[1.5rem] text-amber-700 font-black flex items-center justify-center gap-3 hover:bg-amber-100 transition-all"
              >
                <Plus size={24} /> إضافة مجال جديد بالكامل
              </button>
              <div className="grid grid-cols-1 gap-3">
                {reportFields.map((field, idx) => (
                  <div
                    key={`report-field-${idx}`}
                    className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-sans font-black shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-all">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        className="flex-1 font-black text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-amber-200 rounded px-3 py-2 transition-all"
                        value={field}
                        onChange={(e) => {
                          const newFields = [...reportFields];
                          newFields[idx] = e.target.value;
                          setReportFields(newFields);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: "حذف مجال التقرير",
                          message:
                            "هل أنت متأكد من حذف هذا المجال؟ سيختفي من القائمة تماماً.",
                          type: "danger",
                          onConfirm: () => {
                            setReportFields(
                              reportFields.filter((_, i) => i !== idx),
                            );
                            toast.success("تم حذف المجال بنجاح");
                          },
                        });
                      }}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t">
              <button
                onClick={() => setShowCustomizer(false)}
                className="px-10 py-4 bg-amber-500 text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-amber-100 transition-all hover:scale-105 active:scale-95"
              >
                إغلاق وحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Selector Modal for Group view */}
      {showStaffSelector && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-blue-950/30 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl border-[8px] border-white p-10 flex flex-col gap-8 animate-in zoom-in-95 max-h-[85vh]">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <Users className="text-blue-500" />
                اختر الموظفين
              </h3>
              <button
                onClick={() => setShowStaffSelector(false)}
                className="p-3 hover:bg-white rounded-2xl transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-4">
              <div className="flex flex-col gap-2">
                {(() => {
                  const staffList = (data.secretariatStaff || []).filter((s: any) => {
                    if (activeSchool && s.school !== activeSchool) return false;
                    if (activeBranch && s.branch && s.branch !== activeBranch) return false;
                    return true;
                  });
                  
                  if (staffList.length === 0) {
                    return <p className="text-slate-400 text-center py-10 font-bold">لا يوجد موظفين مسجلين حالياً في هذا الفرع والمدرسة.</p>;
                  }

                  return staffList.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-transparent hover:border-blue-100 cursor-pointer shadow-sm transition-all group">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 transition-all staff-checkbox"
                        value={s.name || ""}
                      />
                      <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{s.name || "بدون اسم"}</span>
                      <span className="text-xs text-slate-400 mr-auto bg-slate-100 px-2 py-1 rounded-full">{s.jobTitles?.join(" / ") || ""}</span>
                    </label>
                  ));
                })()}
              </div>
            </div>

            <button
              onClick={() => {
                const checkboxes = document.querySelectorAll(".staff-checkbox:checked") as NodeListOf<HTMLInputElement>;
                const selectedNames = Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
                addSelectedEmployees(selectedNames);
              }}
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
            >
              إضافة المحددين
            </button>
          </div>
        </div>
      )}

      {/* Individual Detail Modal */}
      {showIndividualModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-blue-950/30 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-2xl border-[8px] border-white p-10 flex flex-col gap-8 animate-in slide-in-from-bottom-8 max-h-[90vh] overflow-auto custom-scrollbar">
            {/* Search field */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="ابحث عن اسم الموظف..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pr-12 pl-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-sans"
                  value={individualSearch}
                  onChange={(e) => {
                    setIndividualSearch(e.target.value);
                    const found = employees.find((emp) =>
                      emp.employeeName.includes(e.target.value),
                    );
                    if (found) setShowIndividualModal(found.id);
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setShowIndividualModal(null);
                  setIndividualSearch("");
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
            {/* Employee selector */}
            <div className="flex flex-wrap gap-2 max-h-20 overflow-auto custom-scrollbar">
              {employees
                .filter(
                  (e) =>
                    !individualSearch ||
                    e.employeeName.includes(individualSearch),
                )
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setShowIndividualModal(e.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-black transition-all ${e.id === showIndividualModal ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {e.employeeName}
                  </button>
                ))}
            </div>
            {(() => {
              const emp = employees.find((e) => e.id === showIndividualModal);
              if (!emp)
                return (
                  <div className="text-center text-slate-400 py-10 font-black">
                    لم يتم العثور على الموظف
                  </div>
                );
              const total = calculateTotal(emp);
              const max = calculateMaxTotal(emp);
              const percent = max > 0 ? ((total / max) * 100).toFixed(1) : "0";
              return (
                <>
                  <div className="flex items-center gap-5 border-b pb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3">
                      <UserCircle size={48} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900">
                        {emp.employeeName}
                      </h3>
                      <p className="text-blue-600 font-bold tracking-tighter">
                        {emp.role} - {emp.branch}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-50 flex flex-col items-center">
                      <span className="text-xs font-black text-blue-400 mb-1">
                        نسبة الإنجاز
                      </span>
                      <span className="text-4xl font-black text-blue-700 font-sans tracking-tight">
                        {percent}%
                      </span>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center">
                      <span className="text-xs font-black text-slate-400 mb-1">
                        الدرجة المحققة
                      </span>
                      <span className="text-4xl font-black text-slate-800 font-sans tracking-tight">
                        {total}{" "}
                        <span className="text-lg opacity-30">/ {max}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-black text-slate-800 mr-2 flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-500" /> تحليل
                      مجالات التقييم
                    </h4>
                    <div className="bg-slate-50/50 rounded-[2rem] border-2 border-slate-50 p-6 space-y-3 max-h-60 overflow-auto custom-scrollbar">
                      {displayedMetrics.map((m) => {
                        if ((emp.unaccreditedMetrics || []).includes(m.key))
                          return null;
                        const v = Number(emp[m.key]) || 0;
                        const rcCount =
                          data.adminReports?.find(
                            (r) => r.id === currentReportId,
                          )?.reportCount || 1;
                        const mMax = m.max * rcCount;
                        const p = mMax > 0 ? (v / mMax) * 100 : 0;
                        return (
                          <div key={m.key} className="space-y-1.5 px-2">
                            <div className="flex justify-between text-[11px] font-black">
                              <span className="text-slate-600">{m.label}</span>
                              <span className="text-blue-600 font-sans">
                                {v} / {mMax}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white rounded-full overflow-hidden border">
                              <div
                                className={`h-full transition-all duration-1000 ${p > 75 ? "bg-green-500" : p > 40 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(p, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => generateWhatsAppReport(emp.id)}
                      className="flex-1 bg-green-600 text-white rounded-[1.8rem] p-5 font-black flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
                    >
                      <Send size={24} /> مشاركة عبر واتساب
                    </button>
                    <button
                      onClick={() => {
                        const report = data.adminReports?.find(
                          (r) => r.id === currentReportId,
                        );
                        if (!report) return;
                        const rcCount = report.reportCount || 1;
                        const title =
                          getReportTitle(report) +
                          " - " +
                          getReportDateLabel(report);
                        let content = `${title}\n\n`;
                        content += `الاسم: ${emp.employeeName}\nالوظيفة: ${emp.role}\nالفرع: ${emp.branch}\n\n`;
                        displayedMetrics.forEach((m) => {
                          if (
                            !(emp.unaccreditedMetrics || []).includes(m.key)
                          ) {
                            content += `${m.label}\t${emp[m.key] || 0}\t${m.max * rcCount}\n`;
                          }
                        });
                        content += `\nالمخالفات\t${emp.violations_score}\n`;
                        content += `المجموع\t${total}\t${max}\n`;
                        content += `النسبة\t${percent}%\n`;
                        if (emp.recommendations)
                          content += `\nالملاحظات: ${emp.recommendations}\n`;
                        content += `\nكاتب التقرير: ${writer || report.writer}`;
                        const BOM = "\uFEFF";
                        const blob = new Blob([BOM + content], {
                          type: "text/tab-separated-values;charset=utf-8",
                        });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = `تقرير_${emp.employeeName}.xls`;
                        link.click();
                      }}
                      className="w-20 bg-emerald-100 text-emerald-700 rounded-[1.8rem] flex items-center justify-center hover:bg-emerald-200 transition-all font-sans font-black"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Notes/Recommendations Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-amber-950/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-white p-10 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-[1.2rem] flex items-center justify-center shadow-inner">
                  <MessageSquare size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    الملاحظات والتوصيات
                  </h3>
                  <p className="text-amber-600 text-sm font-bold">
                    {
                      employees.find((e) => e.id === notesModal.empId)
                        ?.employeeName
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesModal(null)}
                className="p-3 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all active:scale-90"
              >
                <X size={24} />
              </button>
            </div>
            <textarea
              className="w-full h-40 bg-slate-50 rounded-2xl border-2 border-slate-100 p-4 text-sm font-bold outline-none resize-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all"
              placeholder="اكتب الملاحظات والتوصيات هنا..."
              value={notesModal.text}
              onChange={(e) =>
                setNotesModal({ ...notesModal, text: e.target.value })
              }
            />
            <button
              onClick={() => {
                updateEmployee(notesModal.empId, {
                  recommendations: notesModal.text,
                });
                setNotesModal(null);
              }}
              className="w-full bg-amber-500 text-white rounded-2xl p-4 font-black text-lg hover:bg-amber-600 transition-all active:scale-95 shadow-xl shadow-amber-100"
            >
              موافق
            </button>
          </div>
        </div>
      )}

      {/* Criteria Customizer Modal (Cards) */}
      {showCriteriaModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl border-[8px] border-white flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-8 bg-amber-500 text-white flex items-center justify-between shadow-lg">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <Palette size={32} strokeWidth={2.5} />
                  <h3 className="text-3xl font-black tracking-tight">
                    تخصيص معايير البطاقات
                  </h3>
                </div>
                <p className="text-amber-100 font-bold mt-1 opacity-90">
                  تعديل الأنشطة والأدلة للمجال: {individualForm.reportField}
                </p>
              </div>
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-90 border border-white/20"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-10 space-y-6 custom-scrollbar bg-slate-50/40">
              <div className="grid grid-cols-1 gap-4">
                {getActivitiesForField(individualForm.reportField).map(
                  (activity, idx) => (
                    <div
                      key={`custom-activity-${idx}`}
                      className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all group animate-in slide-in-from-bottom-3"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-slate-50 shadow-inner group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 mr-2 flex items-center gap-1">
                            نص المعيار <span className="text-amber-500">*</span>
                          </label>
                          <input
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                            value={activity.text || ""}
                            onChange={(e) => {
                              const newAct = [
                                ...getActivitiesForField(
                                  individualForm.reportField,
                                ),
                              ];
                              newAct[idx] = {
                                ...newAct[idx],
                                text: e.target.value,
                              };
                              const newBranches = {
                                ...(data.adminBranchActivities || {}),
                              };
                              if (!newBranches[activeBranchKey])
                                newBranches[activeBranchKey] = {};
                              newBranches[activeBranchKey][
                                individualForm.reportField
                              ] = newAct;
                              updateData({
                                adminBranchActivities: newBranches,
                              });
                            }}
                            placeholder="مثلاً: الإشراف على صلاة الظهر..."
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newAct = [
                              ...getActivitiesForField(
                                individualForm.reportField,
                              ),
                            ];
                            newAct.splice(idx, 1);
                            const newBranches = {
                              ...(data.adminBranchActivities || {}),
                            };
                            if (!newBranches[activeBranchKey])
                              newBranches[activeBranchKey] = {};
                            newBranches[activeBranchKey][
                              individualForm.reportField
                            ] = newAct;
                            updateData({ adminBranchActivities: newBranches });
                          }}
                          className="mt-6 p-4 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 ml-16">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 mr-2 flex items-center gap-1.5">
                            <Zap size={14} className="text-amber-500" /> الأداة
                            / الأسلوب
                          </label>
                          <input
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 text-xs font-black focus:border-amber-400 focus:bg-white transition-all outline-none"
                            value={activity.planned || ""}
                            onChange={(e) => {
                              const newAct = [
                                ...getActivitiesForField(
                                  individualForm.reportField,
                                ),
                              ];
                              newAct[idx] = {
                                ...newAct[idx],
                                planned: e.target.value,
                              };
                              const newBranches = {
                                ...(data.adminBranchActivities || {}),
                              };
                              if (!newBranches[activeBranchKey])
                                newBranches[activeBranchKey] = {};
                              newBranches[activeBranchKey][
                                individualForm.reportField
                              ] = newAct;
                              updateData({
                                adminBranchActivities: newBranches,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 mr-2 flex items-center gap-1.5">
                            <ClipboardList
                              size={14}
                              className="text-blue-500"
                            />{" "}
                            دليل التنفيذ
                          </label>
                          <input
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 text-xs font-black focus:border-amber-400 focus:bg-white transition-all outline-none"
                            value={activity.evidence || ""}
                            onChange={(e) => {
                              const newAct = [
                                ...getActivitiesForField(
                                  individualForm.reportField,
                                ),
                              ];
                              newAct[idx] = {
                                ...newAct[idx],
                                evidence: e.target.value,
                              };
                              const newBranches = {
                                ...(data.adminBranchActivities || {}),
                              };
                              if (!newBranches[activeBranchKey])
                                newBranches[activeBranchKey] = {};
                              newBranches[activeBranchKey][
                                individualForm.reportField
                              ] = newAct;
                              updateData({
                                adminBranchActivities: newBranches,
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
              <button
                onClick={() => {
                  const newAct = [
                    ...getActivitiesForField(individualForm.reportField),
                    {
                      text: "معيار جديد",
                      planned: "بالملاحظة المباشرة",
                      evidence: "سجل المتابعة",
                    },
                  ];
                  const newBranches = { ...(data.adminBranchActivities || {}) };
                  if (!newBranches[activeBranchKey])
                    newBranches[activeBranchKey] = {};
                  newBranches[activeBranchKey][individualForm.reportField] =
                    newAct;
                  updateData({ adminBranchActivities: newBranches });
                }}
                className="w-full py-8 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-400 font-black hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center justify-center gap-4 group"
              >
                <div className="w-12 h-12 bg-white rounded-[1.2rem] shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all">
                  <Plus size={28} />
                </div>
                <span className="text-xl">إضافة معيار جديد للقائمة</span>
              </button>
            </div>
            <div className="p-10 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="px-16 py-5 bg-amber-500 text-white rounded-[2rem] font-black text-2xl hover:bg-amber-600 transition-all shadow-2xl shadow-amber-100 transform hover:scale-[1.02] active:scale-95"
              >
                حفظ جميع التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
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

      {/* Custom styles for the page */}
      <style>{`
        .staff-follow-table th .vertical-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          white-space: nowrap;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes dropdown-cinematic {
          0% { opacity: 0; transform: translateY(-20px) scale(0.95) rotateX(-10deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); }
        }
        .dropdown-cinematic {
          animation: dropdown-cinematic 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-style: preserve-3d;
          perspective: 1000px;
        }
        .item-3d {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .item-3d:hover {
          transform: translateZ(20px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default StaffFollowUpPage;
