import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  X,
  Save,
  Share2,
  FileSpreadsheet,
  User,
  ClipboardList,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { localDB } from "../src/lib/localDB";
import { stampRecord } from "../src/lib/recordStamping";
import * as XLSX from "xlsx";
import { StudentReport } from "../types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  { id: "teacher", label: "معلم المادة" },
  { id: "supervisor", label: "المشرف الإداري" },
  { id: "parent", label: "ولي الأمر" },
  { id: "student", label: "الطالب (تقييم ذاتي)" },
  { id: "activity_leader", label: "رائد النشاط" },
  { id: "health_guide", label: "المرشد الصحي" },
  { id: "special_ed_teacher", label: "معلم التربية الخاصة" },
  { id: "social_worker", label: "المختص الاجتماعي" },
];

const RATINGS = [
  { id: "ممتاز", color: "bg-emerald-500", text: "text-emerald-700" },
  { id: "جيد جداً", color: "bg-blue-500", text: "text-blue-700" },
  { id: "جيد", color: "bg-teal-500", text: "text-teal-700" },
  { id: "ضعيف", color: "bg-orange-500", text: "text-orange-700" },
  { id: "ضعيف جداً", color: "bg-red-500", text: "text-red-700" },
];

const normalizeArabic = (text: any) => {
  if (!text) return "";
  return String(text)
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
};

const ALL_FIELDS_MAP: Record<string, string> = {
  academic_understanding: "الاستيعاب العلمي",
  homework_commitment: "الالتزام بالواجبات",
  participation: "المشاركة والتفاعل",
  classroom_behavior: "السلوك الصفي",
  strengths: "نقاط التميز",
  attendance: "الحضور والانصراف",
  appearance: "المظهر العام",
  yard_behavior: "السلوك العام في الساحات",
  property_respect: "احترام الممتلكات",
  admin_communication: "التواصل مع الإدارة",
  home_environment: "البيئة المنزلية",
  study_independence: "الاستقلالية في المذاكرة",
  social_life: "الحياة الاجتماعية",
  health_status: "الحالة الصحية",
  behavioral_notes: "الملاحظات السلوكية",
  school_feelings: "المشاعر تجاه المدرسة",
  favorite_hard_subjects: "المواد المفضلة / الصعبة",
  peer_relations: "العلاقات مع الزملاء / التنمر",
  preferred_learning_style: "طريقة التعلم المفضلة",
  leadership_skills: "المهارات القيادية",
  teamwork: "العمل الجماعي",
  talents: "المواهب",
  chronic_diseases: "الحالة الصحية والأمراض المزمنة",
  medication_used: "العلاج المستخدم",
  handling_procedures: "إجراءات وتعليمات التعامل مع الحالة",
  clinic_visits: "أوقات زيارة العيادة أو الطبيب المختص",
  physical_growth: "أدوية أو مأكولات أو مشربات وغيرها ممنوع منها",
  developmental_skills: "المهارات النمائية",
  academic_skills: "المهارات الأكاديمية الخاصة",
  iep_progress: "تقدم الخطة الفردية",
  initial_diagnosis: "التشخيص المبدئي (نوع الحالة)",
  swot_analysis: "مصفوفة SWOT",
  risk_level: "مؤشر الخطورة",
  sociogram: "العلاقات (الأصدقاء / حالة التنمر)",
  sessions_log: "سجل الجلسات والمقاييس",
  interventions: "التدخلات والإحالة",
};

const getSubjectsForGrade = (grade: any) => {
  return [
    "مربية",
    "القرآن كريم",
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
};

const CaseStudyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, data, isAuthenticated, queueSyncRequest, shareViaWhatsApp } = useGlobal();
  const [activeTab, setActiveTab] = useState<"create" | "view">("create");

  // Create Form State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [evaluatorRole, setEvaluatorRole] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedEvalId, setSelectedEvalId] = useState("");
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState<
    Record<string, { rating: string; text: string }>
  >({});
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: "", message: "" });
  const syncedEvalIdRef = useRef<string | null>(null);

  // View Log State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStudentsQuery, setFilterStudentsQuery] = useState("");
  const [selectedFilterStudents, setSelectedFilterStudents] = useState<
    string[]
  >([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === "view" && isOpen) {
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const fetchedLogs = await localDB.caseStudies.toArray();
          processLogs(fetchedLogs || []);
        } catch (err) {
          console.error("Error fetching case studies from localDB", err);
        } finally {
          setIsLoadingLogs(false);
        }
      };

      const processLogs = (fetchedLogs: any[]) => {
        // Sort by timestamp desc
        fetchedLogs.sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        const isGenSuper =
          currentUser?.role === "admin" || currentUser?.permissions?.all;
        let filteredLogs = fetchedLogs;
        if (!isGenSuper) {
          const userSchools = (currentUser?.selectedSchool || "")
            .split(",")
            .map((s) => s.trim());
          filteredLogs = fetchedLogs.filter((log: any) =>
            userSchools.includes(log.school),
          );
        }

        setLogs(filteredLogs);
      };

      fetchLogs();
      const interval = setInterval(fetchLogs, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isOpen, currentUser]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = normalizeArabic(searchQuery);
    const userSchools =
      currentUser?.role === "admin" || currentUser?.permissions?.all
        ? []
        : Object.keys(currentUser?.permissions?.schoolsAndBranches || {});

    return (data.secretariatStudents || [])
      .filter((s) => {
        if (
          userSchools.length > 0 &&
          !userSchools.includes(s.school || s.schoolName || s.schoolId)
        )
          return false;
        return s.name && normalizeArabic(s.name).includes(term);
      })
      .slice(0, 7);
  }, [searchQuery, data.secretariatStudents, currentUser]);

  const filteredFilterStudents = useMemo(() => {
    if (!filterStudentsQuery.trim()) return [];
    const term = normalizeArabic(filterStudentsQuery);
    const userSchools =
      currentUser?.role === "admin" || currentUser?.permissions?.all
        ? []
        : Object.keys(currentUser?.permissions?.schoolsAndBranches || {});

    return (data.secretariatStudents || [])
      .filter((s) => {
        if (
          userSchools.length > 0 &&
          !userSchools.includes(s.school || s.schoolName || s.schoolId)
        )
          return false;
        return s.name && normalizeArabic(s.name).includes(term);
      })
      .slice(0, 7);
  }, [filterStudentsQuery, data.secretariatStudents, currentUser]);

  // View Log Filtering
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filterDateFrom)
      result = result.filter(
        (l) => l.timestamp.split("T")[0] >= filterDateFrom,
      );
    if (filterDateTo)
      result = result.filter((l) => l.timestamp.split("T")[0] <= filterDateTo);
    if (selectedFilterStudents.length > 0) {
      result = result.filter((l) =>
        selectedFilterStudents.includes(l.studentName),
      );
    }
    return result;
  }, [logs, filterDateFrom, filterDateTo, selectedFilterStudents]);

  // Sync when selectedSubject or selectedEvalId changes
  const pastEvaluations = useMemo(() => {
    if (!selectedStudent || evaluatorRole !== "teacher" || !selectedSubject)
      return [];
    return (data.studentEvaluations || [])
      .filter((e: any) => {
        if (e.studentId !== selectedStudent.id) return false;
        if (e.subjects) {
          const subArr = e.subjects.split(/[,،]/).map((s: string) => s.trim());
          return subArr.includes(selectedSubject);
        }
        return false;
      })
      .sort((a: any, b: any) => {
        // Sort so newest dates appear first (assuming dateStr is dd/mm/yyyy)
        const parseDate = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split("/");
          if (parts.length !== 3) return 0;
          return new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0]),
          ).getTime();
        };
        return parseDate(b.dateStr) - parseDate(a.dateStr);
      });
  }, [
    data.studentEvaluations,
    selectedStudent,
    evaluatorRole,
    selectedSubject,
  ]);

  useEffect(() => {
    if (selectedStudent && evaluatorRole === "teacher" && selectedSubject) {
      if (pastEvaluations.length > 0) {
        let targetEval = pastEvaluations[0];
        if (selectedEvalId) {
          const specific = pastEvaluations.find(
            (e: any) => e.id === selectedEvalId,
          );
          if (specific) targetEval = specific;
        } else {
          setSelectedEvalId(targetEval.id);
        }

        const normalizeRating = (str: string) => {
          if (!str) return "";
          if (str.includes("جيد جدا")) return "جيد جداً";
          if (str.includes("ضعيف جدا")) return "ضعيف جداً";
          if (str.includes("ممتاز")) return "ممتاز";
          if (str.includes("ضعيف")) return "ضعيف";
          if (str.includes("جيد")) return "جيد";
          return str.trim();
        };

        const criteria: any = targetEval.criteria || {};
        const newFormData: Record<string, { rating: string; text: string }> =
          {};

        if (criteria.comprehension) {
          newFormData["academic_understanding"] = {
            rating: normalizeRating(criteria.comprehension.rating),
            text: criteria.comprehension.details || "",
          };
        }
        if (criteria.homework) {
          newFormData["homework_commitment"] = {
            rating: normalizeRating(criteria.homework.rating),
            text: criteria.homework.details || "",
          };
        }
        if (criteria.participation) {
          newFormData["participation"] = {
            rating: normalizeRating(criteria.participation.rating),
            text: criteria.participation.details || "",
          };
        }
        if (criteria.behavior) {
          newFormData["classroom_behavior"] = {
            rating: normalizeRating(criteria.behavior.rating),
            text: criteria.behavior.details || "",
          };
        }
        if (criteria.excellence) {
          newFormData["strengths"] = {
            rating: normalizeRating(criteria.excellence.rating),
            text: criteria.excellence.details || "",
          };
        }

        setFormData(newFormData);
        setIsManualMode(false);

        if (criteria.customAction?.text) {
          setAdditionalDetails(criteria.customAction.text);
        } else {
          setAdditionalDetails("");
        }
      } else {
        setFormData({});
        setAdditionalDetails("");
        setSelectedEvalId("");
      }
    }
  }, [
    selectedSubject,
    selectedStudent,
    evaluatorRole,
    pastEvaluations,
    selectedEvalId,
  ]);

  if (!isOpen) return null;

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setShowSuggestions(false);
    setSelectedEvalId("");

    // Perform sync immediately
    const evals = data.studentEvaluations || [];
    const studentEvals = evals
      .filter((e: any) => e.studentId === student.id)
      .sort((a: any, b: any) => {
        const parseDate = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split("/");
          if (parts.length !== 3) return 0;
          return new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0]),
          ).getTime();
        };
        return parseDate(b.dateStr) - parseDate(a.dateStr);
      });

    if (studentEvals.length > 0) {
      const latestEval = studentEvals[0];
      setEvaluatorRole("teacher");
      if (latestEval.subjects) {
        const subjectsArr = latestEval.subjects
          .split(/[,،]/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (subjectsArr.length > 0) {
          setSelectedSubject(subjectsArr[0]);
        }
      }
    } else {
      setEvaluatorRole("");
      setFormData({});
      setAdditionalDetails("");
      setSelectedSubject("");
    }
  };

  const handleFormDataChange = (
    key: string,
    fieldType: "rating" | "text",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [fieldType]: value,
      },
    }));
  };

  const getDynamicFields = () => {
    switch (evaluatorRole) {
      case "teacher":
        return [
          { key: "academic_understanding", label: "الاستيعاب العلمي" },
          { key: "homework_commitment", label: "الالتزام بالواجبات" },
          { key: "participation", label: "المشاركة والتفاعل" },
          { key: "classroom_behavior", label: "السلوك الصفي" },
          { key: "strengths", label: "نقاط التميز", noRating: true },
        ];
      case "supervisor":
        return [
          { key: "attendance", label: "الحضور والانصراف" },
          { key: "appearance", label: "المظهر العام" },
          { key: "yard_behavior", label: "السلوك العام في الساحات" },
          { key: "property_respect", label: "احترام الممتلكات" },
          { key: "admin_communication", label: "التواصل مع الإدارة" },
        ];
      case "parent":
        return [
          { key: "home_environment", label: "البيئة المنزلية" },
          { key: "study_independence", label: "الاستقلالية في المذاكرة" },
          { key: "social_life", label: "الحياة الاجتماعية" },
          { key: "health_status", label: "الحالة الصحية" },
          { key: "behavioral_notes", label: "الملاحظات السلوكية" },
        ];
      case "student":
        return [
          { key: "school_feelings", label: "المشاعر تجاه المدرسة" },
          { key: "favorite_hard_subjects", label: "المواد المفضلة / الصعبة" },
          { key: "peer_relations", label: "العلاقات مع الزملاء / التنمر" },
          { key: "preferred_learning_style", label: "طريقة التعلم المفضلة" },
        ];
      case "activity_leader":
        return [
          { key: "leadership_skills", label: "المهارات القيادية" },
          { key: "teamwork", label: "العمل الجماعي" },
          { key: "talents", label: "المواهب", noRating: true },
        ];
      case "health_guide":
        return [
          {
            key: "chronic_diseases",
            label: "الحالة الصحية والأمراض المزمنة",
            ratingLabel: "نوع الحالة",
            customRatings: [
              { id: "عادية", color: "bg-emerald-500", text: "text-emerald-700" },
              { id: "حرجة", color: "bg-orange-500", text: "text-orange-700" },
              { id: "حرجة للغاية", color: "bg-red-500", text: "text-red-700" },
            ],
          },
          { key: "medication_used", label: "العلاج المستخدم", noRating: true },
          { key: "handling_procedures", label: "إجراءات وتعليمات التعامل مع الحالة", noRating: true },
          { key: "clinic_visits", label: "أوقات زيارة العيادة أو الطبيب المختص", noRating: true },
          { key: "physical_growth", label: "أدوية أو مأكولات أو مشربات وغيرها ممنوع منها", noRating: true },
        ];
      case "special_ed_teacher":
        return [
          { key: "developmental_skills", label: "المهارات النمائية" },
          { key: "academic_skills", label: "المهارات الأكاديمية الخاصة" },
          { key: "iep_progress", label: "تقدم الخطة الفردية" },
        ];
      case "social_worker":
        return [
          { key: "initial_diagnosis", label: "التشخيص المبدئي (نوع الحالة)" },
          { key: "swot_analysis", label: "مصفوفة SWOT", noRating: true },
          {
            key: "risk_level",
            label: "مؤشر الخطورة",
            type: "select",
            options: ["أخضر - آمن", "أصفر - يحتاج متابعة", "أحمر - حرج"],
          },
          { key: "sociogram", label: "العلاقات (الأصدقاء / حالة التنمر)" },
          {
            key: "sessions_log",
            label: "سجل الجلسات والمقاييس",
            noRating: true,
          },
          { key: "interventions", label: "التدخلات والإحالة", noRating: true },
        ];
      default:
        return [];
    }
  };

  const fields = getDynamicFields();

  const handleSave = async () => {
    if (!selectedStudent || !evaluatorRole) {
      setSaveStatus({
        type: "error",
        message: "يرجى اختيار الطالب وصفة المقيم",
      });
      return;
    }

    if (evaluatorRole === "teacher" && !selectedSubject) {
      setSaveStatus({ type: "error", message: "يرجى اختيار مادة التقييم" });
      return;
    }

    setIsSubmitting(true);
    setSaveStatus({ type: "", message: "" });

    const flatFormData: Record<string, string> = {};
    fields.forEach((f) => {
      const fieldData = formData[f.key];
      if (fieldData) {
        if (fieldData.rating)
          flatFormData[f.key + "_rating"] = fieldData.rating;
        if (fieldData.text) flatFormData[f.key + "_text"] = fieldData.text;
      }
    });

    const payload = {
      studentId: selectedStudent.id || "",
      studentName: selectedStudent.name || "",
      studentGrade: selectedStudent.grade || "",
      studentSection: selectedStudent.section || "",
      studentGender: selectedStudent.gender || "",
      studentAddress: selectedStudent.address || "",
      studentWork: selectedStudent.workOutside || "",
      guardianName: selectedStudent.guardianName || "",
      guardianPhone: selectedStudent.guardianPhones?.[0] || "",
      evaluatorRole: evaluatorRole || "",
      roleName:
        ROLES.find((r) => r.id === evaluatorRole)?.label || evaluatorRole || "",
      subject: selectedSubject || "",
      formData: flatFormData || {},
      additionalDetails: additionalDetails || "",
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || "unknown",
      userName: currentUser?.name || "مستخدم غير معروف",
      school: currentUser?.selectedSchool || "",
    };

    try {
      const stamped = stampRecord(payload, {
        id: currentUser?.id,
        name: currentUser?.name,
      });
      await localDB.caseStudies.put(stamped);
      setLogs((prev) => [stamped, ...prev]);
      setSaveStatus({ type: "success", message: "تم حفظ التقرير محلياً بنجاح" });

      setTimeout(() => {
        setSaveStatus({ type: "", message: "" });
        setSearchQuery("");
        setSelectedStudent(null);
        setEvaluatorRole("");
        setSelectedSubject("");
        setFormData({});
        setAdditionalDetails("");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus({
        type: "error",
        message: "حدث خطأ أثناء الحفظ المحلي. يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الدراسة؟")) return;

    setLogs((prev) => prev.filter((l) => l.id !== docId));

    try {
      await localDB.caseStudies.delete(docId);
    } catch (e: any) {
      console.error(e);
      alert("فشل حذف الدراسة محلياً");
    }
  };

  const generateWhatsAppText = (log: any) => {
    let text = `*دراسة حالة مفصلة - ${log.studentName}*\n`;
    text += `*الصف:* ${log.studentGrade || "-"} | *الشعبة:* ${log.studentSection || "-"}\n`;
    text += `*نوع التقرير:* ${log.roleName} ${log.subject ? `(${log.subject})` : ""}\n`;
    text += `*التاريخ:* ${new Date(log.timestamp).toLocaleDateString("ar-SA")}\n`;
    text += `*مُدخل التقرير:* ${log.userName}\n\n`;

    const getFieldsForRole = () => {
      // Mock evaluatorRole change to get matching fields
      const originalEvaluator = evaluatorRole;
      return ROLES.map((r) => r.id); // Hack: To iterate flatFormData we can just output everything keys
    };

    const flat = log.formData || {};

    // Instead of reconstructing dynamic fields, iterate collected data
    Object.keys(flat).forEach((key) => {
      if (key.endsWith("_text")) {
        const mainKey = key.replace("_text", "");
        const rating = flat[mainKey + "_rating"];
        const val = flat[key];

        const label = ALL_FIELDS_MAP[mainKey] || mainKey;
        text += `*${label}*\n`;
        if (rating) text += `التقييم: ${rating}\n`;
        text += `الملاحظات: ${val}\n\n`;
      }
    });

    if (log.additionalDetails) {
      text += `*ملاحظات إضافية:*\n${log.additionalDetails}\n`;
    }

    return text;
  };

  const handleExport = (exportData: any[]) => {
    if (!exportData.length) return;
    const wsData = exportData.map((log) => {
      const flat = log.formData || {};
      return {
        "تاريخ الإدخال": new Date(log.timestamp).toLocaleDateString("ar-SA"),
        "اسم الطالب": log.studentName,
        الصف: log.studentGrade,
        الشعبة: log.studentSection,
        "صفة المُقييم": log.roleName,
        المادة: log.subject || "N/A",
        التقييمات: JSON.stringify(flat),
        "تفاصيل إضافية": log.additionalDetails,
        المدخل: log.userName,
        المدرسة: log.school,
      };
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cases");
    XLSX.writeFile(wb, `سجل_دراسات_الحالة_${Date.now()}.xlsx`);
  };

  const handleShareAll = (exportData: any[]) => {
    if (!exportData.length) return;

    let text = `*سجل دراسات الحالة المُجمع*\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString("ar-SA")}\n\n`;

    exportData.forEach((log, index) => {
      text += `*[${index + 1}] الطالب:* ${log.studentName} | ${log.studentGrade} / ${log.studentSection}\n`;
      text += `*نوع التقرير:* ${log.roleName} ${log.subject ? `(${log.subject})` : ""}\n`;
      text += `*تاريخ الدراسة:* ${new Date(log.timestamp).toLocaleDateString("ar-SA")}\n`;

      const flat = log.formData || {};
      let hasData = false;
      Object.keys(flat).forEach((key) => {
        if (key.endsWith("_text")) {
          hasData = true;
        }
      });

      if (hasData || log.additionalDetails) {
        text += `يوجد تفاصيل تقييمية وملاحظات مسجلة للحالة.\n`;
      }

      text += `\n`;
    });

    shareViaWhatsApp(text);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm rtl font-arabic overflow-hidden">
      <div className="bg-slate-50 w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50 flex flex-col h-[95vh] sm:h-[90vh]">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                نظام دراسة الحالة الشامل
              </h2>
              <p className="text-blue-600 text-xs sm:text-sm font-bold">
                توثيق ومتابعة تفصيلية للطلاب
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-2xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-100 flex p-2 gap-2 z-10 shadow-sm">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "create" ? "bg-blue-600 text-white shadow-md" : "bg-slate-50 text-slate-600 hover:bg-blue-50"}`}
          >
            <TrendingUp size={18} /> إنشاء دراسة تقييمية
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "view" ? "bg-blue-600 text-white shadow-md" : "bg-slate-50 text-slate-600 hover:bg-blue-50"}`}
          >
            <Briefcase size={18} /> جدول دراسة الحالات
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {activeTab === "create" && (
            <div className="space-y-6 max-w-4xl mx-auto pb-20">
              {saveStatus.message && (
                <div
                  className={`p-4 rounded-2xl text-sm font-bold border shadow-sm ${saveStatus.type === "error" ? "bg-red-50 text-red-600 border-red-100" : saveStatus.type === "success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"}`}
                >
                  {saveStatus.message}
                </div>
              )}

              {/* Student Search & Info Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="relative" ref={searchRef}>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    اسم الطالب
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                        if (
                          selectedStudent &&
                          e.target.value !== selectedStudent.name
                        )
                          setSelectedStudent(null);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="ابحث عن اسم الطالب من السجل..."
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 focus:bg-white h-[56px] px-12 appearance-none font-bold transition-all"
                    />
                  </div>

                  {showSuggestions &&
                    filteredStudents.length > 0 &&
                    !selectedStudent && (
                      <div className="absolute top-full mt-2 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                        {filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            onClick={() => handleStudentSelect(student)}
                            className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-slate-800">
                                {student.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {student.grade} - الشعبة {student.section}
                              </p>
                            </div>
                            <ChevronLeft className="text-slate-400" size={16} />
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {selectedStudent && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          الصف
                        </span>
                        <p className="text-sm font-black text-slate-700">
                          {selectedStudent.grade}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          الشعبة
                        </span>
                        <p className="text-sm font-black text-slate-700">
                          {selectedStudent.section}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          النوع
                        </span>
                        <p className="text-sm font-black text-slate-700">
                          {selectedStudent.gender}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          السكن
                        </span>
                        <p className="text-sm font-black text-slate-700">
                          {selectedStudent.address || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          العمل
                        </span>
                        <p className="text-sm font-black text-slate-700">
                          {selectedStudent.workOutside || "-"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          ولي الأمر
                        </span>
                        <p className="text-sm font-black text-slate-700">
                          {selectedStudent.guardianName || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          هاتف والي الأمر
                        </span>
                        <p className="text-sm font-black text-slate-700 dir-ltr text-right">
                          {selectedStudent.guardianPhones?.[0] || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div
                className={`transition-all duration-300 ${selectedStudent ? "opacity-100" : "opacity-50 pointer-events-none"}`}
              >
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    صفة المُقيِّم المستهدف
                  </label>
                  <select
                    value={evaluatorRole}
                    onChange={(e) => {
                      setEvaluatorRole(e.target.value);
                      setFormData({});
                      setSelectedSubject("");
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 h-[56px] px-4 font-bold transition-all cursor-pointer"
                  >
                    <option value="">اختر صفة المُقيِّم للبدء...</option>
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  {evaluatorRole === "teacher" && selectedStudent && (
                    <div className="mt-4 animate-in fade-in space-y-4">
                      <div>
                        <label className="block text-sm font-black text-slate-700 mb-2">
                          المادة الدراسية
                        </label>
                        <select
                          value={selectedSubject}
                          onChange={(e) => {
                            setSelectedSubject(e.target.value);
                            setSelectedEvalId("");
                          }}
                          className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-indigo-800 focus:border-indigo-500 h-[56px] px-4 font-bold transition-all cursor-pointer"
                        >
                          <option value="">اختر المادة...</option>
                          {(() => {
                            const opts = getSubjectsForGrade(
                              selectedStudent.grade,
                            );
                            if (
                              selectedSubject &&
                              !opts.includes(selectedSubject)
                            ) {
                              opts.push(selectedSubject);
                            }
                            return opts.map((sub, i) => (
                              <option key={i} value={sub}>
                                {sub}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {selectedSubject && pastEvaluations.length > 0 && (
                        <div className="animate-in slide-in-from-top-2 fade-in">
                          <label className="block text-sm font-black text-slate-700 mb-2">
                            تقييمات سابقة للمادة
                          </label>
                          <select
                            value={selectedEvalId}
                            onChange={(e) => setSelectedEvalId(e.target.value)}
                            className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl text-amber-800 focus:border-amber-500 h-[56px] px-4 font-bold transition-all cursor-pointer"
                          >
                            <option value="">تقييم جديد...</option>
                            {pastEvaluations.map((ev: any, i: number) => (
                              <option key={ev.id} value={ev.id}>
                                التقييم بتاريخ {ev.dateStr} (الفصل {ev.semester}
                                )
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Assessment Fields */}
              <div
                className={`transition-all duration-300 ${evaluatorRole ? "opacity-100 translate-y-0" : "opacity-50 translate-y-4 pointer-events-none hidden"}`}
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                        1
                      </span>
                      <h3 className="text-lg font-black text-slate-800">
                        المعايير المخصصة والتقييم
                      </h3>
                    </div>
                    {evaluatorRole === "teacher" && selectedEvalId && (
                      <button
                        type="button"
                        onClick={() => setIsManualMode(!isManualMode)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition border-2 ${isManualMode ? "bg-amber-100 text-amber-700 border-amber-200 shadow-sm" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:border-slate-300"}`}
                      >
                        {isManualMode ? "إلغاء التعبئة اليدوية" : "تعبئة يدوية"}
                      </button>
                    )}
                  </div>

                  {(() => {
                    const isReadOnly =
                      evaluatorRole === "teacher" &&
                      !!selectedEvalId &&
                      !isManualMode;
                    return (
                      <>
                        {fields.map((f, i) => (
                          <div
                            key={i}
                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors"
                          >
                            <label className="block text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                              <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                              {f.label}
                            </label>

                            {f.type === "select" ? (
                              <select
                                value={formData[f.key]?.text || ""}
                                onChange={(e) =>
                                  handleFormDataChange(
                                    f.key,
                                    "text",
                                    e.target.value,
                                  )
                                }
                                disabled={isReadOnly}
                                className={`w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 h-[56px] px-4 font-bold ${isReadOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                              >
                                <option value="">اختر...</option>
                                {f.options?.map((opt, idx) => (
                                  <option key={idx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="space-y-4">
                                {!f.noRating && (
                                  <div className="space-y-2">
                                    {f.ratingLabel && (
                                      <span className="block text-sm font-black text-slate-700">
                                        {f.ratingLabel}:
                                      </span>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      {(f.customRatings || RATINGS).map((rating) => {
                                        const isSelected =
                                          formData[f.key]?.rating === rating.id;
                                        return (
                                          <button
                                            key={rating.id}
                                            type="button"
                                            onClick={() =>
                                              handleFormDataChange(
                                                f.key,
                                                "rating",
                                                rating.id,
                                              )
                                            }
                                            disabled={isReadOnly}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all ${isSelected ? rating.color + " text-white shadow-md" : "bg-slate-50 text-slate-500"} ${isReadOnly && !isSelected ? "opacity-50 cursor-not-allowed" : ""} ${!isReadOnly && !isSelected ? "hover:bg-slate-100 hover:text-slate-700" : ""}`}
                                          >
                                            {rating.id}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <textarea
                                  value={formData[f.key]?.text || ""}
                                  onChange={(e) =>
                                    handleFormDataChange(
                                      f.key,
                                      "text",
                                      e.target.value,
                                    )
                                  }
                                  disabled={isReadOnly}
                                  placeholder={`أدخل تفاصيل وملاحظات ${f.label} مع الشرح...`}
                                  className={`w-full bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 focus:border-blue-500 p-4 font-medium min-h-[100px] resize-y ${isReadOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                                />
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 shadow-sm mt-8">
                          <label className="block text-base font-black text-indigo-900 mb-3 flex items-center gap-2">
                            <CheckCircle2
                              size={20}
                              className="text-indigo-500"
                            />
                            تفاصيل إضافية / إجراءات مخصصة
                          </label>
                          <textarea
                            value={additionalDetails}
                            onChange={(e) =>
                              setAdditionalDetails(e.target.value)
                            }
                            disabled={isReadOnly}
                            placeholder="سجل أي ملاحظات واسعة، الإجراءات التي تم اتخاذها، أو التوصيات المستقبلية..."
                            className={`w-full bg-white border-2 border-indigo-100 rounded-2xl text-slate-800 focus:border-indigo-400 p-4 font-medium min-h-[140px] resize-y shadow-inner ${isReadOnly ? "opacity-70 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === "view" && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                      من تاريخ
                    </label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 font-bold focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                      إلى تاريخ
                    </label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 font-bold focus:border-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                      تصفية بأسماء الطلاب
                    </label>
                    <input
                      type="text"
                      value={filterStudentsQuery}
                      onChange={(e) => setFilterStudentsQuery(e.target.value)}
                      placeholder="اكتب لإضافة أسماء..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 font-bold focus:border-blue-500"
                    />
                    {filteredFilterStudents.length > 0 &&
                      filterStudentsQuery && (
                        <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                          {filteredFilterStudents.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (!selectedFilterStudents.includes(s.name)) {
                                  setSelectedFilterStudents([
                                    ...selectedFilterStudents,
                                    s.name,
                                  ]);
                                }
                                setFilterStudentsQuery("");
                              }}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 font-bold text-sm"
                            >
                              {s.name}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
                {/* Selected student chips */}
                {selectedFilterStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {selectedFilterStudents.map((s) => (
                      <span
                        key={s}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      >
                        {s}
                        <X
                          size={14}
                          className="cursor-pointer hover:text-blue-900"
                          onClick={() =>
                            setSelectedFilterStudents((prev) =>
                              prev.filter((x) => x !== s),
                            )
                          }
                        />
                      </span>
                    ))}
                  </div>
                )}
                {/* Toolbar Actions */}
                <div className="flex flex-wrap gap-3 pt-6 mt-4 border-t border-slate-100 justify-end">
                  <button
                    onClick={() => handleExport(filteredLogs)}
                    className="px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100"
                  >
                    <FileSpreadsheet size={18} />
                    تصدير المخرجات Excel
                  </button>
                  <button
                    onClick={() => handleShareAll(filteredLogs)}
                    className="px-6 py-2.5 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 hover:bg-green-100"
                  >
                    <Share2 size={18} />
                    إرسال واتساب للجميع
                  </button>
                </div>
              </div>

              {/* The Table View */}
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="font-bold animate-pulse">
                    جاري جلب سجل دراسات الحالة...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredLogs.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 font-bold">
                      لا توجد دراسات حالة مسجلة تطابق بحثك.
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      return (
                        <div
                          key={log.id}
                          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative"
                        >
                          {/* Header / Student Info Table */}
                          <div className="bg-slate-50 p-6 border-b border-slate-200">
                            <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
                              <div>
                                <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                                  <User size={20} className="text-blue-500" />
                                  {log.studentName}
                                </h3>
                                <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                  <Calendar size={14} />
                                  {new Date(log.timestamp).toLocaleDateString(
                                    "ar-SA",
                                  )}{" "}
                                  - المدخل: {log.userName}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    shareViaWhatsApp(generateWhatsAppText(log))
                                  }
                                  className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm shadow-sm border border-green-200"
                                >
                                  <Share2 size={16} /> إرسال للمتابعة
                                </button>
                                {(currentUser?.role === "admin" ||
                                  currentUser?.id === log.userId) && (
                                  <button
                                    onClick={() => handleDelete(log.id)}
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors shadow-sm border border-red-200"
                                    title="حذف"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm font-bold bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                              <div>
                                <span className="block text-slate-400 text-xs mb-1">
                                  النوع
                                </span>
                                <span className="text-slate-700">
                                  {log.studentGender || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-xs mb-1">
                                  الصف / الشعبة
                                </span>
                                <span className="text-slate-700">
                                  {log.studentGrade || "-"} /{" "}
                                  {log.studentSection || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-xs mb-1">
                                  السكن
                                </span>
                                <span className="text-slate-700">
                                  {log.studentAddress || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-xs mb-1">
                                  ولي الأمر (العمل)
                                </span>
                                <span className="text-slate-700">
                                  {log.guardianName || "-"}{" "}
                                  {log.studentWork
                                    ? `(${log.studentWork})`
                                    : ""}
                                </span>
                              </div>
                              <div>
                                <span className="block text-slate-400 text-xs mb-1">
                                  هاتف ولي الأمر
                                </span>
                                <span className="text-slate-700 dir-ltr inline-block">
                                  {log.guardianPhone || "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Body / Evaluator and Criteria */}
                          <div className="p-0 overflow-x-auto">
                            <table className="w-full text-right text-sm">
                              <tbody className="divide-y divide-slate-100">
                                <tr className="bg-blue-50/50">
                                  <th className="w-1/3 min-w-[200px] p-6 text-slate-600 font-black border-l border-slate-200 align-top max-w-[250px]">
                                    صفة المقيم
                                  </th>
                                  <td className="p-6 font-black text-blue-700 align-top text-base">
                                    {log.roleName}{" "}
                                    {log.subject ? `(${log.subject})` : ""}
                                  </td>
                                </tr>

                                {Object.keys(log.formData || {})
                                  .filter((k) => k.endsWith("_text"))
                                  .map((textKey) => {
                                    const mainKey = textKey.replace(
                                      "_text",
                                      "",
                                    );
                                    const rating =
                                      log.formData[`${mainKey}_rating`];
                                    const text = log.formData[textKey];
                                    const label =
                                      ALL_FIELDS_MAP[mainKey] || mainKey;
                                    return (
                                      <tr
                                        key={mainKey}
                                        className="hover:bg-slate-50 transition-colors"
                                      >
                                        <th className="w-1/3 min-w-[200px] p-6 align-top font-black text-slate-700 border-l border-slate-200 leading-relaxed max-w-[250px]">
                                          {label}
                                        </th>
                                        <td className="p-6 align-top">
                                          {rating && (
                                            <div className="mb-3">
                                              <span
                                                className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                                                  rating === "عادية"
                                                    ? "bg-emerald-500"
                                                    : rating === "حرجة"
                                                    ? "bg-orange-500"
                                                    : rating === "حرجة للغاية"
                                                    ? "bg-red-500"
                                                    : RATINGS.find((r) => r.id === rating)?.color || "bg-slate-500"
                                                } text-white shadow-sm inline-block`}
                                              >
                                                {rating}
                                              </span>
                                            </div>
                                          )}
                                          <p className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">
                                            {text}
                                          </p>
                                        </td>
                                      </tr>
                                    );
                                  })}

                                {log.additionalDetails && (
                                  <tr className="bg-indigo-50/30">
                                    <th className="w-1/3 min-w-[200px] p-6 align-top font-black text-indigo-900 border-l border-indigo-100 max-w-[250px]">
                                      تفاصيل إضافية / إجراءات مخصصة
                                    </th>
                                    <td className="p-6 align-top text-indigo-800 font-bold whitespace-pre-wrap leading-relaxed">
                                      {log.additionalDetails}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons (Only for Create Tab) */}
        {activeTab === "create" && (
          <div className="bg-white/80 backdrop-blur-md p-4 sm:px-6 sm:py-5 border-t border-slate-100 z-20 sticky bottom-0">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={isSubmitting || !selectedStudent || !evaluatorRole}
                className="flex-1 min-h-[56px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-lg rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
              >
                <Save size={24} /> حفظ تقييم الحالة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseStudyModal;
