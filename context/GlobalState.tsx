import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Language,
  AppData,
  TaskItem,
  TaskReport,
  AuthUser,
  User,
} from "../types";
import {
  localDB,
  ensureSeedDatabase,
  loadFullAppDataFromLocalDB,
  saveSystemConfigToLocalDB,
  saveSchoolSharedKeyToLocalDB,
  saveUserCollectionToLocalDB,
} from "../src/lib/localDB";
import { stampRecord, stampArrayRecords } from "../src/lib/recordStamping";
import {
  normalizeArabicText,
  normalizeSchool,
  normalizeBranch,
  normalizeGrade,
  normalizeSection,
  normalizeSubject,
  hasIntersection,
  isAdministrativePosition,
  isEntityVisibleToSupervisor,
  canUserModifyDataKey,
  isModuleReadOnly,
} from "../src/lib/NormalizationEngine";
import { toast } from "sonner";
import { isSameSchool } from "../app/evaluationUtils";

export const normalizeDailyReports = (reports: any[]): any[] => {
  if (!Array.isArray(reports)) return reports;

  const dailyGroups: Record<string, any[]> = {};
  reports.forEach((r) => {
    if (r && (r.periodType || "daily") === "daily") {
      const dateKey = r.dateStr;
      if (dateKey) {
        if (!dailyGroups[dateKey]) dailyGroups[dateKey] = [];
        dailyGroups[dateKey].push(r);
      }
    }
  });

  Object.keys(dailyGroups).forEach((dateKey) => {
    const group = dailyGroups[dateKey];
    if (group.length <= 1) return;

    const maxScores: Record<string, Record<string, number>> = {};
    const mergedNotes: Record<string, Set<string>> = {};
    const mergedReinforcements: Record<string, Set<string>> = {};
    const mergedUnaccredited: Record<string, Set<string>> = {};

    group.forEach((r) => {
      const teachers = r.teachersData || [];
      teachers.forEach((t: any) => {
        const tName = t && t.teacherName ? String(t.teacherName).trim() : "";
        if (!tName) return;

        if (!maxScores[tName]) maxScores[tName] = {};
        if (!mergedNotes[tName]) mergedNotes[tName] = new Set();
        if (!mergedReinforcements[tName]) mergedReinforcements[tName] = new Set();
        if (!mergedUnaccredited[tName]) mergedUnaccredited[tName] = new Set();

        Object.keys(t).forEach((key) => {
          const val = t[key];
          if (typeof val === "number") {
            maxScores[tName][key] = Math.max(maxScores[tName][key] || 0, val);
          }
        });

        if (Array.isArray(t.violations_notes)) {
          t.violations_notes.forEach((note: string) => {
            if (note) mergedNotes[tName].add(note);
          });
        }
        if (Array.isArray(t.reinforcements)) {
          t.reinforcements.forEach((re: string) => {
            if (re) mergedReinforcements[tName].add(re);
          });
        }
        if (Array.isArray(t.unaccreditedMetrics)) {
          t.unaccreditedMetrics.forEach((m: string) => {
            if (m) mergedUnaccredited[tName].add(m);
          });
        }
      });
    });

    group.forEach((r) => {
      if (Array.isArray(r.teachersData)) {
        r.teachersData = r.teachersData.map((t: any) => {
          const tName = t && t.teacherName ? String(t.teacherName).trim() : "";
          if (!tName || !maxScores[tName]) return t;

          const updated = { ...t };
          Object.keys(maxScores[tName]).forEach((key) => {
            updated[key] = maxScores[tName][key];
          });

          if (mergedNotes[tName].size > 0) {
            updated.violations_notes = Array.from(mergedNotes[tName]);
          }
          if (mergedReinforcements[tName].size > 0) {
            updated.reinforcements = Array.from(mergedReinforcements[tName]);
          }
          if (mergedUnaccredited[tName].size > 0) {
            updated.unaccreditedMetrics = Array.from(mergedUnaccredited[tName]);
          }

          return updated;
        });
      }
    });
  });

  return reports;
};

interface GlobalContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  data: AppData;
  updateData: (newData: Partial<AppData>, overrideSchools?: string[]) => void;
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  userFilter: string;
  setUserFilter: (userId: string) => void;
  dashboardFilter: { view: string; filterValue: string } | null;
  setDashboardFilter: (
    filter: { view: string; filterValue: string } | null,
  ) => void;
  globalDataFilters: {
    schools: string[];
    branches: string[];
    grades: string[];
    sections: string[];
  };
  setGlobalDataFilters: (filters: {
    schools: string[];
    branches: string[];
    grades: string[];
    sections: string[];
  }) => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
  checkSchoolsAndYears: (username: string, code: string) => Promise<{ schools: string[]; years: string[] }>;
  completeLogin: (username: string, code: string, school: string, year: string, branch?: string) => Promise<boolean>;
  logout: () => void;
  effectiveUserIds: string[];
  syncStatus: 'synced' | 'pending' | 'syncing' | 'offline' | 'connecting';
  pendingSyncCount: number;
  queueSyncRequest: (url: string, payload: any, method?: 'POST' | 'DELETE') => void;
  getReportMessageFooter: (dateStr?: string) => string;
  shareViaWhatsApp: (text: string, phone?: string) => void;
  isEntityVisible: (entity: any, entityType?: string) => boolean;
  canUserEdit: (moduleOrKey?: string | string[]) => boolean;
  isReadOnlyModule: (moduleKey?: string) => boolean;
  supervisorTeachers: any[];
}

const defaultMaxGrades = {
  attendance: 5,
  appearance: 5,
  preparation: 10,
  supervision_queue: 5,
  supervision_rest: 5,
  supervision_end: 5,
  correction_notebooks: 10,
  correction_books: 10,
  correction_followup: 10,
  teaching_aids: 10,
  extra_activities: 10,
  radio: 5,
  creativity: 5,
  zero_period: 5,
};

const defaultMetricLabels = {
  attendance: "الحضور اليومي",
  appearance: "المظهر الشخصي",
  preparation: "اكتمال التحضير",
  supervision_queue: "إشراف الطابور",
  supervision_rest: "إشراف الراحة",
  supervision_end: "إشراف نهاية الدوام",
  correction_notebooks: "تصحيح الدفاتر",
  correction_books: "تصحيح الكتب",
  correction_followup: "تصحيح المتابعة",
  teaching_aids: "توفر وسيلة تعلمية",
  extra_activities: "أنشطة لا صفية",
  radio: "إقامة إذاعة",
  creativity: "إبداع",
  zero_period: "إقامة حصة صفرية",
  violations_score: "المخالفات",
};

const initialMetricsList = [
  {
    key: "attendance",
    label: "الحضور اليومي",
    emoji: "📅",
    color: "bg-green-600",
    max: 5,
  },
  {
    key: "appearance",
    label: "المظهر الشخصي",
    emoji: "👔",
    color: "bg-emerald-600",
    max: 5,
  },
  {
    key: "preparation",
    label: "اكتمال التحضير",
    emoji: "📝",
    color: "bg-teal-600",
    max: 10,
  },
  {
    key: "supervision_queue",
    label: "إشراف الطابور",
    emoji: "🚶",
    color: "bg-orange-600",
    max: 5,
  },
  {
    key: "supervision_rest",
    label: "إشراف الراحة",
    emoji: "☕",
    color: "bg-orange-500",
    max: 5,
  },
  {
    key: "supervision_end",
    label: "إشراف نهاية الدوام",
    emoji: "🔚",
    color: "bg-orange-400",
    max: 5,
  },
  {
    key: "correction_books",
    label: "تصحيح الكتب",
    emoji: "📖",
    color: "bg-cyan-600",
    max: 10,
  },
  {
    key: "correction_notebooks",
    label: "تصحيح الدفاتر",
    emoji: "📒",
    color: "bg-cyan-500",
    max: 10,
  },
  {
    key: "correction_followup",
    label: "تصحيح المتابعة",
    emoji: "📋",
    color: "bg-cyan-400",
    max: 10,
  },
  {
    key: "teaching_aids",
    label: "توفر وسيلة تعلمية",
    emoji: "💡",
    color: "bg-yellow-600",
    max: 10,
  },
  {
    key: "extra_activities",
    label: "أنشطة لا صفية",
    emoji: "⚽",
    color: "bg-lime-600",
    max: 10,
  },
  {
    key: "radio",
    label: "إقامة إذاعة",
    emoji: "🎙️",
    color: "bg-red-600",
    max: 5,
  },
  {
    key: "creativity",
    label: "إبداع",
    emoji: "✨",
    color: "bg-amber-600",
    max: 5,
  },
  {
    key: "zero_period",
    label: "إقامة حصة صفرية",
    emoji: "0️⃣",
    color: "bg-slate-600",
    max: 5,
  },
  {
    key: "violations_score",
    label: "المخالفات",
    emoji: "⚠️",
    color: "bg-red-700",
    max: 0,
  },
];

const standardAdminMetrics = [
  {
    key: "appearance",
    label: "المظهر الشخصي",
    emoji: "👔",
    color: "#E2EFDA",
    max: 4,
  },
  {
    key: "discipline",
    label: "الانضباط في الوقت",
    emoji: "⏱️",
    color: "#FCE4D6",
    max: 4,
  },
  {
    key: "quality",
    label: "جودة العمل",
    emoji: "💎",
    color: "#DDEBF7",
    max: 4,
  },
  {
    key: "communication",
    label: "التواصل الفعال",
    emoji: "🗣️",
    color: "#FFF2CC",
    max: 4,
  },
  {
    key: "problem_solving",
    label: "حسن احتواء المشكلات",
    emoji: "🧩",
    color: "#E1F5FE",
    max: 4,
  },
  {
    key: "quality_plan",
    label: "السير وفق خطة المدرسة للجودة",
    emoji: "📊",
    color: "#F3E5F5",
    max: 4,
  },
];

const specializedAdminMetrics: Record<string, any[]> = {
  "متابعة أداء المقصف": [
    {
      key: "appearance",
      label: "المظهر الشخصي",
      emoji: "👔",
      color: "#E2EFDA",
      max: 4,
    },
    {
      key: "hygiene_personal",
      label: "النظافة الشخصية",
      emoji: "🧼",
      color: "#FCE4D6",
      max: 4,
    },
    {
      key: "hygiene_general",
      label: "النظافة العامة",
      emoji: "🧹",
      color: "#DDEBF7",
      max: 4,
    },
    {
      key: "quality",
      label: "جودة العمل",
      emoji: "💎",
      color: "#FFF2CC",
      max: 4,
    },
    {
      key: "provision",
      label: "توفير الطلبات",
      emoji: "📦",
      color: "#E1F5FE",
      max: 4,
    },
    {
      key: "speed",
      label: "سرعة الإنجاز",
      emoji: "⚡",
      color: "#F3E5F5",
      max: 4,
    },
    {
      key: "quality_plan",
      label: "السير وفق خطة المدرسة للجودة",
      emoji: "📊",
      color: "#E8F5E9",
      max: 4,
    },
  ],
  "متابعة المشرف الأكاديمي": [
    {
      key: "appearance",
      label: "المظهر الشخصي",
      emoji: "👔",
      color: "#E2EFDA",
      max: 4,
    },
    {
      key: "early_attendance",
      label: "الحضور أول الوقت",
      emoji: "⏱️",
      color: "#FCE4D6",
      max: 4,
    },
    {
      key: "quality",
      label: "جودة العمل",
      emoji: "💎",
      color: "#DDEBF7",
      max: 4,
    },
    {
      key: "reports_completion",
      label: "اكتمال التقارير",
      emoji: "📋",
      color: "#FFF2CC",
      max: 4,
    },
    {
      key: "quality_plan",
      label: "السير وفق خطة المدرسة للجودة",
      emoji: "📊",
      color: "#E1F5FE",
      max: 4,
    },
  ],
  "متابعة أخرى": [
    {
      key: "appearance",
      label: "المظهر الشخصي",
      emoji: "👔",
      color: "#E2EFDA",
      max: 4,
    },
    {
      key: "early_attendance",
      label: "الحضور أول الوقت",
      emoji: "⏱️",
      color: "#FCE4D6",
      max: 4,
    },
    {
      key: "quality",
      label: "جودة العمل",
      emoji: "💎",
      color: "#DDEBF7",
      max: 4,
    },
    {
      key: "communication",
      label: "التواصل الفعال",
      emoji: "🗣️",
      color: "#FFF2CC",
      max: 4,
    },
    {
      key: "problem_solving",
      label: "حسن احتواء المشكلات",
      emoji: "🧩",
      color: "#E1F5FE",
      max: 4,
    },
    {
      key: "quality_plan",
      label: "السير وفق خطة المدرسة للجودة",
      emoji: "📊",
      color: "#F3E5F5",
      max: 4,
    },
  ],
};

const adminFollowUpTypes = [
  "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس",
  "متابعة المدير العام",
  "متابعة مدير الفرع",
  "متابعة إدارة الجودة",
  "متابعة المالية",
  "متابعة وكيل المدرسة",
  "متابعة الإشراف التربوي",
  "متابعة الإشراف الإداري",
  "متابعة المشرف الأكاديمي",
  "متابعة المختص الاجتماعي",
  "متابعة مسؤول المعمل",
  "متابعة مسؤول معمل العلوم",
  "متابعة السكرتارية",
  "متابعة مسؤول الأنشطة",
  "متابعة مسؤول المخازن",
  "متابعة مسؤول الرياضة",
  "متابعة الفنية",
  "متابعة مهندس البيئة",
  "متابعة الحراسة",
  "متابعة حركة المواصلات",
  "متابعة أداء المقصف",
  "متابعة أخرى",
];

// Ensure admin metrics always have max: 4
const ensureAdminMetricsMax = (metrics: any[]): any[] => {
  return metrics.map((m) => ({ ...m, max: 4 }));
};

const initialAdminMetricsList: Record<string, any[]> = {};
adminFollowUpTypes.forEach((type) => {
  if (specializedAdminMetrics[type]) {
    initialAdminMetricsList[type] = ensureAdminMetricsMax(
      specializedAdminMetrics[type],
    );
  } else {
    initialAdminMetricsList[type] = ensureAdminMetricsMax(standardAdminMetrics);
  }
});

export const defaultTaskTemplates: TaskItem[] = [
  // Daily Tasks
  { id: "d1", category: "daily", text: "توثيق المهام اليومية في الأدوات" },
  { id: "d2", category: "daily", text: "الرفع باحتياجات الدور ورقياً" },
  { id: "d3", category: "daily", text: "التواصل بولي امر الطالب الغائب" },
  { id: "d4", category: "daily", text: "حصر الأعمال الابداعية للمعلمين" },
  { id: "d5", category: "daily", text: "متابعة الإشراف على الطابور" },
  { id: "d6", category: "daily", text: "متابعة الإشراف على الراحة" },
  { id: "d7", category: "daily", text: "متابعة الإشراف نهاية الدوام" },
  { id: "d8", category: "daily", text: "متابعة خروج الطلاب من المدرسة" },
  { id: "d9", category: "daily", text: "متابعة إذاعة الفصول اليومية" },
  { id: "d10", category: "daily", text: "الاطلاع على دفاتر التحضير" },
  { id: "d11", category: "daily", text: "متابعة جدول الحصص" },
  { id: "d12", category: "daily", text: "تغطية الفصول بالمعلمين" },
  { id: "d13", category: "daily", text: "متابعة المخالفات الطلابية" },
  { id: "d14", category: "daily", text: "متابعة مخالفات الكادر" },
  { id: "d15", category: "daily", text: "جلسات فردية لحل المشكلات" },
  { id: "d16", category: "daily", text: "متابعة نظافة الدور" },
  { id: "d17", category: "daily", text: "حل مشاكل أولياء الأمور" },
  { id: "d18", category: "daily", text: "توثيق الأنشطة في الدور" },
  { id: "d19", category: "daily", text: "إنزال الأنشطة في المجموعات" },
  { id: "d20", category: "daily", text: "متابعة نظافة الدور وتهيئته" },
  { id: "d21", category: "daily", text: "التوثيق في سجل مخالفات الطلاب" },
  { id: "d22", category: "daily", text: "التوثيق في سجل تعهدات الطلاب" },
  { id: "d23", category: "daily", text: "توثيق الطلاب المصرح لهم بالخروج" },
  { id: "d24", category: "daily", text: "متابعة المتأخرين عن الحصة الأولى" },
  // Weekly Tasks
  { id: "w1", category: "weekly", text: "تسليم التقرير الأسبوعي" },
  { id: "w2", category: "weekly", text: "استقبال أولياء الأمور" },
  { id: "w3", category: "weekly", text: "الزيارة الصفية للطلاب" },
  { id: "w4", category: "weekly", text: "متابعة دفتر الحصة والواجب والمتابعة" },
  { id: "w5", category: "weekly", text: "التواصل بولي امر الطالب المتميز" },
  { id: "w6", category: "weekly", text: "التواصل بولي امر الطالب الضعيف" },
  { id: "w7", category: "weekly", text: "متابعة تفعيل الريادة" },
  { id: "w8", category: "weekly", text: "تفعيل لوحة الشرف والتميز" },
  { id: "w9", category: "weekly", text: "رفع كشف المتفاعلين في الإشراف" },
  { id: "w10", category: "weekly", text: "نزول ميداني لمتابعة البوفية" },
  { id: "w11", category: "weekly", text: "تحفيز الطلاب المتميزين" },
  { id: "w12", category: "weekly", text: "الرفع بكشف غياب الطلاب المتجاوز" },
  { id: "w13", category: "weekly", text: "حصر الطلاب كثيري المشاكل" },
  { id: "w14", category: "weekly", text: "تدوين الزيارات والرفع بأهمها" },
  { id: "w15", category: "weekly", text: "تعليق أنشطة الدور على الجدار" },
  { id: "w16", category: "weekly", text: "متابعة الزي والشعر والأظافر" },
  { id: "w17", category: "weekly", text: "متابعة توظيف المساحات الجدارية" },
  // Monthly Tasks
  { id: "m1", category: "monthly", text: "اعداد الخلاصة الشهرية" },
  { id: "m2", category: "monthly", text: "تحفيز المعلمين المبدعين" },
  { id: "m3", category: "monthly", text: "جمع كشوفات الدرجات" },
  {
    id: "m4",
    category: "monthly",
    text: "متابعة استلام الاختبارات من المعلمين",
  },
  { id: "m5", category: "monthly", text: "تسليم مقررات الاختبارات للسكرتيرة" },
  { id: "m6", category: "monthly", text: "متابعة استلام سجلات الدرجات" },
  { id: "m7", category: "monthly", text: "متابعة تسليم سجلات الدرجات" },
  { id: "m8", category: "monthly", text: "تسليم جدول الاختبارات للطلاب" },
  { id: "m9", category: "monthly", text: "توزيع أسماء الطلاب على اللجان" },
  { id: "m10", category: "monthly", text: "استلام أدبيات الكنترول كاملة" },
  { id: "m11", category: "monthly", text: "متابعة تسليم أرقام الجلوس" },
  { id: "m12", category: "monthly", text: "متابعة سير الاختبارات الشهرية" },
  {
    id: "m13",
    category: "monthly",
    text: "متابعة المعلمين لتسليم أوراق الاختبارات مصححة",
  },
  { id: "m14", category: "monthly", text: "حصر المتأخرين عن الاختبارات" },
  { id: "m15", category: "monthly", text: "إعداد جدول اختبار الغائبين" },
  { id: "m16", category: "monthly", text: "تسليم السكرتير كشوف الدرجات" },
  { id: "m17", category: "monthly", text: "تسليم السكرتير كشوف غياب الطلاب" },
  { id: "m18", category: "monthly", text: "مراجعة رصد الدرجات بعد السكرتير" },
  {
    id: "m19",
    category: "monthly",
    text: "متابعة تسليم أوراق الاختبارات طلاب",
  },
  { id: "m20", category: "monthly", text: "رفع استمارة التغطية" },
  { id: "m21", category: "monthly", text: "حصر الطلاب الضعاف و المتفوقين" },
  { id: "m22", category: "monthly", text: "حصر الحالات الخاصة" },
];

const defaultData: AppData = {
  users: [],
  availableSchools: [],
  availableYears: [],
  schoolBranches: {},
  trainingEvaluations: [],
  profiles: {},
  profile: {
    ministry: "",
    district: "",
    schoolName: "",
    branch: "",
    year: "2024-2025",
    semester: "",
    branchManager: "",
    generalManager: "",
    customFields: [],
  },
  substitutions: [],
  timetable: [],
  dailyReports: [],
  violations: [],
  parentVisits: [],
  teacherFollowUps: [],
  maxGrades: defaultMaxGrades,
  studentReports: [],
  absenceLogs: [],
  studentLatenessLogs: [],
  studentViolationLogs: [],
  exitLogs: [],
  damageLogs: [],
  parentVisitLogs: [],
  examLogs: [],
  notebookFollowUpLogs: [],
  notebookReportArchives: [],
  genericSpecialReports: [],
  customViolationElements: {
    behavior: [],
    duties: [],
    achievement: [],
    exams: [],
  },
  taskTemplates: defaultTaskTemplates,
  customEvaluationOptions: {
    strategies: [],
    tools: [],
    sources: [],
    programs: []
  },
  customSupervisionCriteria: [],
  taskReports: [],
  metricLabels: defaultMetricLabels,
  metricsList: initialMetricsList,
  adminReports: [],
  adminMetricsList: initialAdminMetricsList,
  adminFollowUpTypes: adminFollowUpTypes,
  transportBuses: [],
  transportLogs: [],
  transportDailyStatus: [],
  communicationPosts: [],
  schoolHomeworks: [],
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLang] = useState<Language>("ar");
  const [data, setData] = useState<AppData>(defaultData);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [dashboardFilter, setDashboardFilter] = useState<{
    view: string;
    filterValue: string;
  } | null>(null);
  const [globalDataFilters, setGlobalDataFilters] = useState<{
    schools: string[];
    branches: string[];
    grades: string[];
    sections: string[];
  }>({
    schools: [],
    branches: [],
    grades: [],
    sections: [],
  });

  // 100% Serverless Offline LocalDB status (zero pending network queue)
  const [syncStatus] = useState<'synced' | 'pending' | 'syncing' | 'offline' | 'connecting'>('synced');
  const [pendingSyncCount] = useState(0);

  const queueSyncRequest = (_url: string, _payload: any, _method: 'POST' | 'DELETE' = 'POST') => {
    // No-op in 100% Serverless Offline mode: all writes go directly to localDB (IndexedDB)
  };

  // Cache authenticated user profile for instant session continuity
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cached_auth_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // 🔥 GLOBAL REAL-TIME SYNC FOR PROFILES - Handled in the main effect below to avoid conflicts
  // The logic for listening to 'profile' and populating 'data.profiles' is moved 
  // into the main strictlySharedKeys listener to ensure atomicity and consistency.

  // Compute the effective set of user IDs that should be visible.
  // This is ALWAYS a concrete list — never null — so filtering is always applied.
  const effectiveUserIds = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];

    // If a specific list is chosen, use it directly.
    if (userFilter !== "all") {
      return userFilter.split(",").filter((id) => id.length > 0);
    }

    // userFilter === 'all': derive the allowed set from school membership.
    const selectedSchools = currentUser.selectedSchool
      .split(",")
      .map((s) => s.trim());
    const isAdminOrFull =
      currentUser.role === "admin" ||
      currentUser.permissions?.all === true ||
      currentUser.permissions?.specialCodes === true ||
      (Array.isArray(currentUser.permissions?.specialCodes) && currentUser.permissions.specialCodes.length > 0) ||
      currentUser.permissions?.userManagement === true ||
      (Array.isArray(currentUser.permissions?.userManagement) && currentUser.permissions.userManagement.length > 0);
    const managedIds = currentUser.permissions?.managedUserIds || [];
    const isManager =
      currentUser.permissions?.userManagement === true ||
      (Array.isArray(currentUser.permissions?.userManagement) && currentUser.permissions.userManagement.length > 0) ||
      managedIds.length > 0;

    const isSchoolWideViewer =
      isManager ||
      !!currentUser.permissions?.secretariat ||
      !!currentUser.permissions?.studentAffairs ||
      !!currentUser.permissions?.dailyFollowUp ||
      !!currentUser.permissions?.adminFollowUp ||
      !!currentUser.permissions?.specialCodes ||
      !!currentUser.permissions?.specialReports ||
      !!currentUser.permissions?.issuesModal ||
      !!currentUser.permissions?.comprehensiveIndicators ||
      ["مدير عام المدارس", "مدير الفرع", "السكرتارية", "مشرف الدور"].includes(
        currentUser.jobTitle || "",
      );

    if (managedIds.length > 0) {
      // Priority: If user has an explicit managed list, they ONLY see that list (+ themselves)
      return data.users
        .filter((u) => {
          if (u.id === currentUser.id) return true; // Always see self

          // Hide admins/full-perms from people who aren't super-admins
          const isTargetAdmin =
            u.role === "admin" || u.permissions?.all === true;
          if (!isAdminOrFull && isTargetAdmin) return false;

          return managedIds.includes(u.id);
        })
        .map((u) => u.id);
    }

    if (isAdminOrFull) {
      // Admin sees all users in the selected school(s)
      const allSchools = selectedSchools.includes("all")
        ? data.availableSchools || []
        : selectedSchools;
      return data.users
        .filter((u) => hasIntersection(u.schools, allSchools, normalizeSchool))
        .map((u) => u.id);
    } else {
      // Non-admin logic: see fellow members based on normalized overlap
      return data.users
        .filter((u) => {
          if (u.id === currentUser.id) return true;
          const isTargetAdmin =
            u.role === "admin" || u.permissions?.all === true;
          if (!isAdminOrFull && isTargetAdmin) return false;

          return (u.schools || []).some((s) => {
            if (!hasIntersection([s], selectedSchools, normalizeSchool)) return false;

            // Branch check using normalizeBranch
            const sab = currentUser.permissions?.schoolsAndBranches || {};
            const managerBranchKey = Object.keys(sab).find((k) =>
              hasIntersection([k], [s], normalizeSchool)
            );
            const managerBranches = managerBranchKey ? sab[managerBranchKey] || [] : [];
            if (managerBranches.length > 0) {
              const targetSab = u.permissions?.schoolsAndBranches || {};
              const targetBranchKey = Object.keys(targetSab).find((k) =>
                hasIntersection([k], [s], normalizeSchool)
              );
              const targetBranches = targetBranchKey ? targetSab[targetBranchKey] || [] : [];
              if (
                targetBranches.length > 0 &&
                !hasIntersection(managerBranches, targetBranches, normalizeBranch)
              ) {
                return false;
              }
            }

            // If not a school-wide viewer, enforce grades/sections/subjects overlap using NormalizationEngine
            if (!isSchoolWideViewer) {
              const managerGrades = currentUser.grades || [];
              const managerSections = currentUser.sections || [];
              const managerSubjects = currentUser.subjects || [];
              const targetGrades = u.grades || [];
              const targetSections = u.sections || [];
              const targetSubjects = u.subjects || [];

              if (
                managerGrades.length === 0 &&
                managerSections.length === 0 &&
                managerSubjects.length === 0
              ) {
                return false;
              }

              if (managerGrades.length > 0 && targetGrades.length > 0) {
                if (!hasIntersection(managerGrades, targetGrades, normalizeGrade)) return false;
              }
              if (managerSections.length > 0 && targetSections.length > 0) {
                if (!hasIntersection(managerSections, targetSections, normalizeSection)) return false;
              }
              if (managerSubjects.length > 0 && targetSubjects.length > 0) {
                if (!hasIntersection(managerSubjects, targetSubjects, normalizeSubject)) return false;
              }
            }

            return true;
          });
        })
        .map((u) => u.id);
    }
  }, [
    isAuthenticated,
    currentUser,
    userFilter,
    data.users,
    data.availableSchools?.join(",")
  ]);

  const filteredData = React.useMemo(() => {
    const { from, to } = dateRange;

    const filterByDate = (item: any) => {
      // Try multiple date fields used across the app
      const rawDate =
        item.date ||
        item.dateStr ||
        (item.createdAt ? item.createdAt.substring(0, 10) : null);

      if (rawDate && typeof rawDate === "string") {
        // Strip range suffixes like "2024-01-01 إلى 2024-01-07"
        const actualDate = rawDate.split(" ")[0];
        if (from && actualDate < from) return false;
        if (to && actualDate > to) return false;
      }
      return true;
    };

    const filterByUser = (item: any, key?: string) => {
      const isGeneralSupervisor =
        currentUser?.role === "admin" || currentUser?.permissions?.all === true;

      if (isGeneralSupervisor) return true;

      // Normalized School & Branch Isolation
      const itemSchools = [item.school, item.schoolName, item.schoolId].filter(Boolean);
      if (itemSchools.length > 0) {
        const userSchools = (currentUser?.selectedSchool || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!hasIntersection(userSchools, itemSchools, normalizeSchool)) {
          return false;
        }
      }

      const itemBranches = [item.branch, item.branchName].filter(Boolean);
      if (itemBranches.length > 0) {
        const userBranches = (currentUser?.selectedBranch || "")
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean);
        if (
          userBranches.length > 0 &&
          !hasIntersection(userBranches, itemBranches, normalizeBranch)
        ) {
          return false;
        }
      }

      // Apply strict supervisor specialization isolation for educational evaluations, homeworks, daily preps, and peer visits
      if (
        key === "teacherEvaluations" ||
        key === "schoolHomeworks" ||
        key === "dailyPreparations" ||
        key === "peerVisits"
      ) {
        return isEntityVisibleToSupervisor(item, currentUser, key);
      }

      // Always filter: if item has no userId, keep it (shared data)
      if (!item.userId) return true;

      const isAdminOrFull = isGeneralSupervisor;

      // Special logic for Daily/Periodical reports
      if (key === "dailyReports") {
        const periodType = item.periodType || "daily";
        if (periodType === "daily") {
          const rSchools = [item.schoolId, item.schoolName, item.school]
            .filter(Boolean)
            .flatMap((s: string) => String(s).split(',').map((x: string) => x.trim()));

          const userSchools = [
            ...(Array.isArray(currentUser?.schools) ? currentUser.schools : []),
            ...(currentUser?.selectedSchool ? currentUser.selectedSchool.split(',') : [])
          ].map((s: string) => s.trim()).filter(Boolean);

          if (
            rSchools.length === 0 ||
            hasIntersection(userSchools, rSchools, normalizeSchool)
          ) {
            return true;
          }
          return false;
        }
        if (!isAdminOrFull) {
          return item.userId === currentUser?.id;
        }
      }

      return (
        effectiveUserIds.length === 0 || effectiveUserIds.includes(item.userId)
      );
    };

    const newData = { ...data };

    // Inject current active school's profile
    let activeSchool = currentUser?.selectedSchool?.split(",")[0]?.trim();
    if (activeSchool === "all") {
      activeSchool = data.availableSchools?.[0];
    }
    const currentBranch = currentUser?.selectedBranch?.trim();

    const isSuperAdmin =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    const hasAdminOrSecretariatAccess =
      isSuperAdmin ||
      !!currentUser?.permissions?.secretariat ||
      !!currentUser?.permissions?.adminFollowUp ||
      isAdministrativePosition(currentUser?.jobTitle, currentUser?.role);

    // 1. Filter secretariatStaff (Teachers & Staff) using NormalizationEngine
    if (newData.secretariatStaff) {
      newData.secretariatStaff = newData.secretariatStaff.filter((s: any) => {
        // Normalized School check
        if (activeSchool && activeSchool !== "all") {
          if (s.school && !hasIntersection([s.school], [activeSchool], normalizeSchool)) {
            return false;
          }
        }
        // Normalized Branch check
        if (currentBranch && currentBranch !== "all" && currentBranch !== "الجميع") {
          const allowedBranches = currentBranch.split(",").map((b: string) => b.trim());
          if (s.branch && !hasIntersection([s.branch], allowedBranches, normalizeBranch)) {
            return false;
          }
        }
        // If user is a specialized Educational Supervisor / Teacher (without Secretariat or Admin Follow-Up roles),
        // enforce strict supervisor isolation (exclude administrative staff + require grade/subject/section intersection)
        if (currentUser && !hasAdminOrSecretariatAccess) {
          return isEntityVisibleToSupervisor(s, currentUser, "secretariatStaff");
        }
        return true;
      });
    }

    // 2. Filter secretariatStudents (Students) using NormalizationEngine
    if (newData.secretariatStudents) {
      newData.secretariatStudents = newData.secretariatStudents.filter((s: any) => {
        if (activeSchool && activeSchool !== "all") {
          if (s.school && !hasIntersection([s.school], [activeSchool], normalizeSchool)) {
            return false;
          }
        }
        if (currentBranch && currentBranch !== "all" && currentBranch !== "الجميع") {
          const allowedBranches = currentBranch.split(",").map((b: string) => b.trim());
          if (s.branch && !hasIntersection([s.branch], allowedBranches, normalizeBranch)) {
            return false;
          }
        }
        return true;
      });
    }

    console.log("filteredData Profile Sync Debug:", {
      activeSchool,
      profiles: newData.profiles,
      hasMatch: !!(activeSchool && newData.profiles && newData.profiles[activeSchool]),
      schoolProfiles: activeSchool ? newData.profiles[activeSchool] : null,
      currentUser
    });

    if (activeSchool && newData.profiles && newData.profiles[activeSchool]) {
      const schoolProfiles = newData.profiles[activeSchool];
      const currentBranch = currentUser?.selectedBranch?.trim();

      // Support new branch-based format and legacy fallback
      if (currentBranch && schoolProfiles[currentBranch]) {
        newData.profile = {
          ...newData.profile,
          ...schoolProfiles[currentBranch],
          branch: currentBranch
        };
      } else if (schoolProfiles.ministry !== undefined) {
        // Legacy: previously stored directly in profiles[school]
        newData.profile = { ...newData.profile, ...schoolProfiles };
      } else {
        // Default to the first available real branch (excluding metadata like lastUpdated)
        const firstBranchKey = Object.keys(schoolProfiles).find(k => 
          k !== "lastUpdated" && typeof schoolProfiles[k] === "object"
        );
        if (firstBranchKey) {
          newData.profile = {
            ...newData.profile,
            ...schoolProfiles[firstBranchKey],
            branch: firstBranchKey
          };
        }
      }
      
      // Override with user's custom profile for this school/branch if any
      const customProfiles = currentUser?.customSchoolProfiles?.[activeSchool];
      if (customProfiles) {
        if (currentBranch && customProfiles[currentBranch]) {
             newData.profile = { ...newData.profile, ...customProfiles[currentBranch], branch: currentBranch };
        } else if (customProfiles[""] !== undefined) { // general overlay
             newData.profile = { ...newData.profile, ...customProfiles[""], branch: "" };
        }
      }
    }

    // Activity arrays — filter by both user/supervisor specialization and date
    const activityKeys = [
      "substitutions",
      "dailyReports",
      "violations",
      "parentVisits",
      "absenceLogs",
      "studentLatenessLogs",
      "studentViolationLogs",
      "exitLogs",
      "damageLogs",
      "parentVisitLogs",
      "examLogs",
      "notebookFollowUpLogs",
      "notebookReportArchives",
      "genericSpecialReports",
      "taskReports",
      "adminReports",
      "teacherEvaluations",
      "schoolHomeworks",
      "dailyPreparations",
    ];

    // Entity arrays — filter by user/supervisor specialization only (date is irrelevant for profile cards)
    const entityKeys = ["studentReports", "timetable", "teacherFollowUps", "peerVisits"];

    activityKeys.forEach((key) => {
      const k = key as keyof AppData;
      if (Array.isArray(newData[k])) {
        (newData as any)[k] = (newData[k] as any[]).filter(
          (item: any) => filterByUser(item, key) && filterByDate(item),
        );
      }
    });

    entityKeys.forEach((key) => {
      const k = key as keyof AppData;
      if (Array.isArray(newData[k])) {
        (newData as any)[k] = (newData[k] as any[]).filter((item) =>
          filterByUser(item, key),
        );
      }
    });

    return newData;
  }, [data, effectiveUserIds, dateRange, currentUser]);

  // Derived list of teachers strictly filtered for Educational Supervision via NormalizationEngine
  const supervisorTeachers = React.useMemo(() => {
    if (!currentUser) return [];
    return (data.secretariatStaff || []).filter((s: any) =>
      isEntityVisibleToSupervisor(s, currentUser, "secretariatStaff")
    );
  }, [data.secretariatStaff, currentUser]);

  const isEntityVisible = React.useCallback(
    (entity: any, entityType?: string) => {
      return isEntityVisibleToSupervisor(entity, currentUser, entityType);
    },
    [currentUser]
  );

  const canUserEdit = React.useCallback(
    (moduleOrKey?: string | string[]) => {
      return canUserModifyDataKey(currentUser, moduleOrKey);
    },
    [currentUser]
  );

  const isReadOnlyModule = React.useCallback(
    (moduleKey?: string) => {
      return isModuleReadOnly(currentUser, moduleKey);
    },
    [currentUser]
  );

  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== "admin") {
      // Non-admins default to seeing only themselves; keep userFilter as 'all'
      // so the effectiveUserIds logic (which already scopes by school) applies.
      // No override needed — the effectiveUserIds memo handles it.
    }
  }, [isAuthenticated, currentUser]);

  // Sync currentUser permissions from Firestore whenever data.users changes
  // This ensures permission changes take effect immediately without re-login
  // We use a debounce to prevent "evaporation" of permissions during multi-school load cycles
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const timer = setTimeout(() => {
      const latestUser = data.users.find((u) => u.id === currentUser.id);
      if (!latestUser) return;

      // Only update if permissions or relevant fields actually changed
      const rolesMatch = latestUser.role === currentUser.role;
      const schoolsMatch = JSON.stringify(latestUser.schools || []) === JSON.stringify(currentUser.schools || []);
      const gradesMatch = JSON.stringify(latestUser.grades || []) === JSON.stringify(currentUser.grades || []);
      const sectionsMatch = JSON.stringify(latestUser.sections || []) === JSON.stringify(currentUser.sections || []);
      const permsMatch =
        JSON.stringify(latestUser.permissions) ===
        JSON.stringify(currentUser.permissions);
      const customProfilesMatch =
        JSON.stringify(latestUser.customSchoolProfiles) ===
        JSON.stringify(currentUser.customSchoolProfiles);
        
      if (rolesMatch && permsMatch && customProfilesMatch && schoolsMatch && gradesMatch && sectionsMatch) return;

      console.log("🔄 GlobalState: Correcting local session from remote master (data.users)");
      
      const updatedAuthUser: AuthUser = {
        ...currentUser,
        role: latestUser.role,
        schools: latestUser.schools || [],
        grades: latestUser.grades || [],
        sections: latestUser.sections || [],
        permissions: latestUser.permissions,
        customSchoolProfiles: latestUser.customSchoolProfiles,
      };
      
      // Also ensure selectedSchool includes at least all assigned schools if it's currently empty
      if (!updatedAuthUser.selectedSchool && (latestUser.schools || []).length > 0) {
        updatedAuthUser.selectedSchool = (latestUser.schools || []).join(',');
      }

      setCurrentUser(updatedAuthUser);
      
      // Local Laravel session automatically retains active permissions from MySQL users table.
    }, 1500); // 1.5s debounce to allow all school snapshots to arrive and merge

    return () => clearTimeout(timer);
  }, [data.users, isAuthenticated, currentUser?.id]);

  // 1. Initial mounting, Seed Admin initialization, and session restoration from localDB
  useEffect(() => {
    let mounted = true;
    async function initLocalSystem() {
      try {
        await ensureSeedDatabase();
        const token = localStorage.getItem('auth_token');
        const cachedUserStr = localStorage.getItem('cached_auth_user');
        const savedSchool = localStorage.getItem('selected_school') || '';

        let restoredUser: AuthUser | null = null;
        if (token && cachedUserStr) {
          try {
            restoredUser = JSON.parse(cachedUserStr);
          } catch (e) {
            console.error("Failed to parse cached_auth_user:", e);
          }
        }

        const loadedData = await loadFullAppDataFromLocalDB(
          defaultData,
          restoredUser?.selectedSchool || savedSchool,
          restoredUser?.id
        );

        if (!mounted) return;

        if (loadedData.dailyReports && Array.isArray(loadedData.dailyReports)) {
          loadedData.dailyReports = normalizeDailyReports(loadedData.dailyReports);
        }

        setData(loadedData);

        if (restoredUser) {
          const dbUser = loadedData.users.find((u) => u.id === restoredUser!.id);
          if (dbUser) {
            const syncedUser: AuthUser = {
              ...restoredUser,
              name: dbUser.name,
              role: dbUser.role,
              jobTitle: dbUser.jobTitle,
              schools: dbUser.schools || [],
              grades: dbUser.grades || [],
              sections: dbUser.sections || [],
              subjects: dbUser.subjects || [],
              permissions: dbUser.permissions,
              customSchoolProfiles: dbUser.customSchoolProfiles,
            };
            setCurrentUser(syncedUser);
            setIsAuthenticated(true);
          } else {
            setCurrentUser(restoredUser);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error("Failed initializing localDB system:", err);
      }
    }
    initLocalSystem();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Hydrate school & user data immediately from localDB when active school or user changes
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    let active = true;
    async function hydrateActiveScope() {
      try {
        const loadedData = await loadFullAppDataFromLocalDB(
          defaultData,
          currentUser?.selectedSchool,
          currentUser?.id
        );
        if (!active) return;
        if (loadedData.dailyReports && Array.isArray(loadedData.dailyReports)) {
          loadedData.dailyReports = normalizeDailyReports(loadedData.dailyReports);
        }
        setData(loadedData);
      } catch (err) {
        console.error("Failed hydrating active school/user scope from localDB:", err);
      }
    }
    hydrateActiveScope();
    return () => {
      active = false;
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.selectedSchool]);

  const updateData = async (
    newDataPayload: Partial<AppData>,
    overrideSchools?: string[],
  ) => {
    if (isAuthenticated && currentUser) {
      const processedNewData = { ...newDataPayload };

      // Ensure profile updates always target the branch-specific map format in the cloud
      if (processedNewData.profile) {
        const isFlatProfile =
          (processedNewData.profile as any).ministry !== undefined ||
          (processedNewData.profile as any).district !== undefined;
        if (isFlatProfile) {
          const currentSchool = currentUser.selectedSchool
            ?.split(",")[0]
            ?.trim();
          const currentBranch = currentUser.selectedBranch?.trim();
          if (currentSchool && currentBranch) {
            const existingSchoolProfiles = data.profiles?.[currentSchool] || {};
            const activeProfileObj = {
              ...existingSchoolProfiles[currentBranch],
              ...(processedNewData.profile as any),
              branch: currentBranch,
            };
            delete activeProfileObj.lastUpdated;
            processedNewData.profile = {
              ...existingSchoolProfiles,
              [currentBranch]: activeProfileObj,
            } as any;
          } else if (currentSchool) {
            const fallbackBranch = "الاعدادات العامة";
            const existingSchoolProfiles = data.profiles?.[currentSchool] || {};
            const activeProfileObj = {
              ...existingSchoolProfiles[fallbackBranch],
              ...(processedNewData.profile as any),
              branch: fallbackBranch,
            };
            delete activeProfileObj.lastUpdated;
            processedNewData.profile = {
              ...existingSchoolProfiles,
              [fallbackBranch]: activeProfileObj,
            } as any;
          }
        }
      }

      const newData = processedNewData;

      const tryingToUpdateKeys = Object.keys(newData);
      const isAllowedByReadOnlyPolicy = canUserModifyDataKey(
        currentUser,
        tryingToUpdateKeys
      );

      if (!isAllowedByReadOnlyPolicy) {
        console.warn("ReadOnly permission: Update blocked for keys:", tryingToUpdateKeys);
        toast.error(
          lang === "ar"
            ? "غير مسموح بتغيير البيانات للرتب الممنوحة لك (للقراءة فقط)"
            : "Data change not allowed for your role (Read-Only)",
        );
        return;
      }
      const selectedSchools =
        overrideSchools && overrideSchools.length > 0
          ? overrideSchools.map((s) => s.trim())
          : (currentUser?.selectedSchool || "").split(",").map((s) => s.trim()).filter(Boolean);
      let targetAvailableSchools = data.availableSchools || [];
      if (newData.availableSchools) {
        targetAvailableSchools = newData.availableSchools;
      }
      const schoolsToUpdate = (
        selectedSchools.includes("all")
          ? targetAvailableSchools
          : selectedSchools
      ).map((s) => s.trim());
      // const schoolsToUpdate = ['TEST_SCHOOL']; // 🔥 HARDCODED FOR TEST
      const strictlySharedKeys = [
        "profile",
        "users",
        "secretariatStudents",
        "secretariatStaff",
        "customSupervisionCriteria",
        "selfEvaluationTemplates",
        "courseEvaluationSchema_v3",
        "metricsList",
        "adminMetricsList",
        "branchMetrics",
        "adminBranchMetrics",
        "adminFollowUpTypes",
        "adminActivitiesList",
        "adminBranchActivities",
        "adminIndividualReportFields",
        "adminIndividualReports",
        "addedTasks",
        "studentReinforcements",
        "postponedTasks",
        "issueRecommendations",
        "creativityRecords",
        "trainingEvaluations",
        "transportBuses",
        "transportLogs",
        "transportDailyStatus",
        "communicationPosts",
        "schoolHomeworks",
        "studentEvaluations",
        "teacherEvaluations",
        "dailyPreparations",
        "substitutions",
        "timetable",
        "dailyReports",
        "violations",
        "parentVisits",
        "teacherFollowUps",
        "studentReports",
        "absenceLogs",
        "studentLatenessLogs",
        "studentViolationLogs",
        "exitLogs",
        "damageLogs",
        "parentVisitLogs",
        "examLogs",
        "selfEvaluations",
        "notebookFollowUpLogs",
        "notebookReportArchives",
        "genericSpecialReports",
        "taskReports",
        "financeRecords",
        "adminReports"
      ];
      const customizableKeys = [
        "taskTemplates",
        "customViolationElements",
        "absenceManualAdditions",
        "absenceExclusions",
        "customEvaluationOptions",
      ];

      // Helper to check if an item matches the current active filters (user + date).
      // Uses effectiveUserIds so 'all' still resolves to a concrete list.
      const matchesCurrentFilter = (item: any, key: string) => {
        const { from, to } = dateRange;

        // User filter: item belongs to one of the currently-visible users
        if (
          item.userId &&
          effectiveUserIds.length > 0 &&
          !effectiveUserIds.includes(item.userId)
        ) {
          return false;
        }

        // Date filter: only for activity arrays
        const entityKeys = ["studentReports", "timetable", "teacherFollowUps"];
        if (!entityKeys.includes(key)) {
          const rawDate =
            item.date ||
            item.dateStr ||
            (item.createdAt ? item.createdAt.substring(0, 10) : null);
          if (rawDate && typeof rawDate === "string") {
            const actualDate = rawDate.split(" ")[0];
            if (from && actualDate < from) return false;
            if (to && actualDate > to) return false;
          }
        }
        return true;
      };

      const rawData = data;
      const pendingChanges: Partial<AppData> = {};

      for (const key of Object.keys(newData) as Array<keyof AppData>) {
        const isAdminOrFull =
          currentUser.role === "admin" ||
          currentUser.permissions?.all === true;

        const isSecretariatRole = [
          "مدير عام المدارس",
          "مدير الفرع",
          "السكرتارية",
        ].includes(currentUser.jobTitle || "");
        const isSecretariatDisabled =
          Array.isArray(currentUser.permissions?.secretariat) &&
          currentUser.permissions.secretariat.includes("disable");
        const isSecretariatEnabled =
          !isSecretariatDisabled &&
          (isSecretariatRole ||
            (Array.isArray(currentUser.permissions?.secretariat)
              ? currentUser.permissions?.secretariat.includes("allowEdits")
              : currentUser.permissions?.secretariat === true));

        if (strictlySharedKeys.includes(key)) {
          const isManager =
            currentUser.permissions?.userManagement === true ||
            (Array.isArray(currentUser.permissions?.userManagement) &&
              currentUser.permissions.userManagement.length > 0) ||
            currentUser.permissions?.specialCodes === true ||
            (Array.isArray(currentUser.permissions?.specialCodes) &&
              currentUser.permissions.specialCodes.length > 0);

          const canEditTemplate = Array.isArray(
            currentUser.permissions?.teacherPortal,
          )
            ? currentUser.permissions.teacherPortal.includes(
                "editEvaluationTemplate",
              )
            : currentUser.permissions?.teacherPortal === true;

          const isGeneralSupervisor =
            (currentUser.role as string) === "general_supervisor" ||
            currentUser.permissions?.specialCodes === true ||
            (Array.isArray(currentUser.permissions?.specialCodes) &&
              currentUser.permissions.specialCodes.length > 0);
          const canEditDaily =
            isGeneralSupervisor ||
            currentUser.permissions?.dailyFollowUp === true ||
            (Array.isArray(currentUser.permissions?.dailyFollowUp) &&
              !currentUser.permissions.dailyFollowUp.includes("view") &&
              !currentUser.permissions.dailyFollowUp.includes("disable"));
          const canEditAdminFollowUp =
            isGeneralSupervisor ||
            currentUser.permissions?.adminFollowUp === true ||
            (Array.isArray(currentUser.permissions?.adminFollowUp) &&
              !currentUser.permissions.adminFollowUp.includes("view") &&
              !currentUser.permissions.adminFollowUp.includes("disable"));

          const hasTransportAccess =
            isGeneralSupervisor ||
            currentUser.permissions?.transport === true ||
            (Array.isArray(currentUser.permissions?.transport) &&
              currentUser.permissions.transport.length > 0) ||
            !!(
              currentUser.jobTitle &&
              (currentUser.jobTitle.includes("حركة") ||
                currentUser.jobTitle.includes("مواصلات") ||
                currentUser.jobTitle.includes("مشرف") ||
                currentUser.jobTitle.includes("سائق") ||
                currentUser.jobTitle.includes("باص"))
            );

          let canSave = false;
          if (isAdminOrFull) canSave = true;
          else if (key === "users" && isManager) canSave = true;
          else if (
            (key === "transportBuses" ||
              key === "transportLogs" ||
              key === "transportDailyStatus") &&
            hasTransportAccess
          )
            canSave = true;
          else if (
            (key === "secretariatStudents" || key === "secretariatStaff" || key === "customSupervisionCriteria") &&
            isSecretariatEnabled
          )
            canSave = true;
          else if (
            (key === "metricsList" || key === "branchMetrics") &&
            (isSecretariatEnabled || canEditDaily)
          )
            canSave = true;
          else if (
            (key === "adminMetricsList" ||
              key === "adminBranchMetrics" ||
              key === "adminActivitiesList" ||
              key === "adminBranchActivities" ||
              key === "adminIndividualReportFields" ||
              key === "adminIndividualReports" ||
              key === "adminFollowUpTypes") &&
            (isSecretariatEnabled || canEditAdminFollowUp)
          )
            canSave = true;
          else if (key === "selfEvaluationTemplates" && canEditTemplate)
            canSave = true;
          else if ((key === "profile" || key === "schoolBranches") && isSecretariatEnabled) canSave = true;
          else if (
            (key === "availableSchools" || key === "availableYears") &&
            isAdminOrFull
          )
            canSave = true;
          else if (
            (key === "aboutSliderImages" ||
              key === "aboutExternalLinks" ||
              key === "aboutLogoImg") &&
            isAdminOrFull
          )
            canSave = true;
          else if (
            key === "communicationPosts" ||
            key === "schoolHomeworks" ||
            key === "dailyPreparations" ||
            key === "studentEvaluations" ||
            key === "teacherEvaluations" ||
            key === "addedTasks" ||
            key === "postponedTasks" ||
            key === "studentReinforcements" ||
            key === "issueRecommendations" ||
            key === "creativityRecords" ||
            key === "financeRecords" ||
            key === "trainingEvaluations" ||
            key === "substitutions" ||
            key === "timetable" ||
            key === "dailyReports" ||
            key === "violations" ||
            key === "parentVisits" ||
            key === "teacherFollowUps" ||
            key === "studentReports" ||
            key === "absenceLogs" ||
            key === "studentLatenessLogs" ||
            key === "studentViolationLogs" ||
            key === "exitLogs" ||
            key === "damageLogs" ||
            key === "parentVisitLogs" ||
            key === "examLogs" ||
            key === "selfEvaluations" ||
            key === "notebookFollowUpLogs" ||
            key === "notebookReportArchives" ||
            key === "genericSpecialReports" ||
            key === "taskReports" ||
            key === "adminReports"
          ) {
            canSave = true;
          }

          if (canSave) {
            if (key === "profile") {
              const profileData = {
                ...(newData[key] as any),
                lastUpdated: Date.now(),
              };
              newData[key] = profileData;

              // Update local profiles map for all targeted schools to ensure instant feedback
              const currentProfiles = { ...(data.profiles || {}) };
              schoolsToUpdate.forEach((s) => {
                currentProfiles[s] = profileData;
              });
              pendingChanges.profiles = currentProfiles;
            }
            if ((key as string) === "users" && Array.isArray(newData[key])) {
              const mergedUsersMap = new Map();
              
              // 1. Lowest Priority: defaultData
              defaultData.users.forEach((u) => mergedUsersMap.set(u.id, u));
              
              // 2. Medium Priority: rawData (only for items not explicitly deleted)
              const newDataIds = new Set((newData[key] as any[]).map(u => u.id));
              if (Array.isArray(rawData[key])) {
                  (rawData[key] as any[]).forEach((u) => {
                     if (newDataIds.has(u.id)) {
                         const existing = mergedUsersMap.get(u.id) || {};
                         mergedUsersMap.set(u.id, { ...existing, ...u });
                     }
                  });
              }
              
              // 3. Highest Priority: newData
              (newData[key] as any[]).forEach((u) => {
                  const existing = mergedUsersMap.get(u.id) || {};
                  mergedUsersMap.set(u.id, { ...existing, ...u });
              });
              
              newData[key] = Array.from(mergedUsersMap.values()) as any;
            }
            if (key === "availableSchools" && Array.isArray(newData[key])) {
              // Use the new list directly without merging back defaultData
              // This prevents deleted schools from being re-added from defaults
              newData[key] = [
                ...new Set(newData[key]),
              ] as any;
            }

            // Priority: Send to Firestore first for strictly shared data
            let schoolsToUpdateForThisKey = [...schoolsToUpdate];
            
            if (key === "availableSchools" || key === "schoolBranches") {
                const sourceArray = key === "availableSchools" ? (newData[key] as string[]) : (rawData.availableSchools as string[]);
                schoolsToUpdateForThisKey = Array.from(
                    new Set([
                        ...(rawData.availableSchools || []),
                        ...(sourceArray || [])
                    ])
                ).filter(Boolean);
            }

            // Stamp array items automatically with author and version metadata before saving
            if (key !== "profile" && key !== "profiles" && key !== "availableSchools" && key !== "availableYears") {
              if (Array.isArray(newData[key])) {
                const oldArray = (rawData[key] as any[]) || [];
                const stampedIncoming = stampArrayRecords(
                  newData[key] as any[],
                  oldArray,
                  { id: currentUser.id, name: currentUser.name }
                );

                if (
                  key === "secretariatStaff" ||
                  key === "secretariatStudents" ||
                  key === "customSupervisionCriteria" ||
                  key === "teacherEvaluations"
                ) {
                  const mergedMap = new Map();
                  oldArray.forEach((item) => {
                    const id = item.id || item.uuid;
                    if (id) mergedMap.set(id, item);
                  });
                  stampedIncoming.forEach((item) => {
                    const id = item.id || item.uuid;
                    if (id) mergedMap.set(id, item);
                  });

                  const newArrayIds = new Set(stampedIncoming.map((item) => item.id || item.uuid));
                  oldArray.forEach((item) => {
                    const id = item.id || item.uuid;
                    const itemSchool = item.school || item.schoolId || "";
                    if (schoolsToUpdate.includes(itemSchool.trim()) && !newArrayIds.has(id)) {
                      mergedMap.delete(id);
                    }
                  });

                  const mergedArray = Array.from(mergedMap.values());
                  pendingChanges[key] = mergedArray as any;
                  newData[key] = mergedArray as any;
                } else {
                  pendingChanges[key] = stampedIncoming as any;
                  newData[key] = stampedIncoming as any;
                }
              } else {
                pendingChanges[key] = newData[key] as any;
              }
            } else if (key === "availableSchools" || key === "availableYears") {
              pendingChanges[key] = newData[key] as any;
            }

            const globalOnlyKeys: string[] = ["availableSchools", "availableYears"];

            if ((key as string) === "users") {
              const newUsers = (newData.users || []) as any[];
              const oldUsers = (data.users || []) as any[];
              const newUserIds = newUsers.map((u) => u.id);

              for (const u of newUsers) {
                const oldU = oldUsers.find((ou) => ou.id === u.id);
                if (!oldU || JSON.stringify(oldU) !== JSON.stringify(u)) {
                  const stampedUser = stampRecord(
                    u,
                    { id: currentUser.id, name: currentUser.name },
                    oldU
                  );
                  await localDB.users.put(stampedUser);
                }
              }

              for (const u of oldUsers) {
                if (u && u.id && !newUserIds.includes(u.id)) {
                  const userSchools = u.schools || [];
                  const belongsToTargetSchool =
                    u.role === "admin" ||
                    u.permissions?.all === true ||
                    schoolsToUpdate.some((s) => userSchools.includes(s));

                  if (belongsToTargetSchool) {
                    await localDB.users.delete(u.id);
                  }
                }
              }
            } else if (!globalOnlyKeys.includes(key as string)) {
              for (const school of schoolsToUpdateForThisKey) {
                let payloadToSave = newData[key];

                const filterPayloadItem = (item: any) => {
                  if (key === "secretariatStudents" || key === "secretariatStaff") {
                    return (
                      (item.school && hasIntersection([item.school], [school], normalizeSchool)) ||
                      (item.schoolBranch && item.schoolBranch.startsWith(school))
                    );
                  } else if (key === "customSupervisionCriteria") {
                    return item.school && hasIntersection([item.school], [school], normalizeSchool);
                  } else if (key === "teacherEvaluations") {
                    return item.school && isSameSchool(item.school, school);
                  }
                  return true;
                };

                if (
                  Array.isArray(payloadToSave) &&
                  (key === "secretariatStudents" ||
                    key === "secretariatStaff" ||
                    key === "customSupervisionCriteria" ||
                    key === "teacherEvaluations")
                ) {
                  payloadToSave = payloadToSave.filter(filterPayloadItem) as any;
                }

                await saveSchoolSharedKeyToLocalDB(
                  school,
                  key as string,
                  payloadToSave,
                  { id: currentUser.id, name: currentUser.name }
                );

                if (key === "profile") {
                  pendingChanges.profiles = {
                    ...(pendingChanges.profiles || data.profiles),
                    [school]: newData[key],
                  } as any;
                }
              }
            }

            if (key === "availableSchools" || key === "availableYears") {
              if (isAdminOrFull) {
                await saveSystemConfigToLocalDB(key as string, newData[key]);
              }
            }
          }
          continue;
        }

        if (
          key === "aboutSliderImages" ||
          key === "aboutExternalLinks" ||
          key === "aboutLogoImg" ||
          key === "availableSchools" ||
          key === "availableYears" ||
          key === "schoolBranches"
        ) {
          pendingChanges[key] = newData[key] as any;
          if (
            currentUser.role === "admin" ||
            currentUser.permissions?.all === true ||
            (key === "schoolBranches" && isSecretariatEnabled)
          ) {
            await saveSystemConfigToLocalDB(key as string, newData[key]);
          }
          continue;
        }

        if (customizableKeys.includes(key)) {
          pendingChanges[key] = newData[key] as any;
          const isAdminOrFull =
            currentUser.role === "admin" ||
            currentUser.permissions?.all === true;

          for (const school of schoolsToUpdate) {
            if (isAdminOrFull) {
              await saveSchoolSharedKeyToLocalDB(
                school,
                key as string,
                newData[key],
                { id: currentUser.id, name: currentUser.name }
              );
            } else {
              await saveUserCollectionToLocalDB(
                school,
                currentUser.id,
                key as string,
                newData[key],
                { id: currentUser.id, name: currentUser.name }
              );
            }
          }
          continue;
        }

        const newArray = newData[key] as any[];
        if (!Array.isArray(newArray)) {
          pendingChanges[key] = newData[key] as any;
          continue;
        }

        const oldArray = (rawData[key] as any[]) || [];

        const itemsNotMatchingFilter = oldArray.filter(
          (item) => !matchesCurrentFilter(item, key),
        );
        const stampedNewArray = stampArrayRecords(newArray, oldArray, {
          id: currentUser.id,
          name: currentUser.name,
        });
        let finalArray = [...itemsNotMatchingFilter, ...stampedNewArray];
        if (key === "dailyReports") {
          finalArray = normalizeDailyReports(finalArray);
        }

        pendingChanges[key] = finalArray as any;

        const userIds = new Set<string>();
        finalArray.forEach((item) => {
          if (!item.userId) item.userId = currentUser.id;
          userIds.add(item.userId);
        });

        if (userIds.size === 0) {
          userIds.add(currentUser.id);
        }

        for (const uid of userIds) {
          const userItems = finalArray.filter((item) => item.userId === uid);
          const itemsBySchool: Record<string, any[]> = {};
          schoolsToUpdate.forEach((s) => (itemsBySchool[s] = []));

          userItems.forEach((item) => {
            let sId =
              item.schoolId ||
              item.schoolName ||
              item.school ||
              schoolsToUpdate[0];
            if (!schoolsToUpdate.includes(sId)) {
              sId = schoolsToUpdate[0];
            }
            if (!itemsBySchool[sId]) itemsBySchool[sId] = [];
            itemsBySchool[sId].push(item);
          });

          for (const sId of Object.keys(itemsBySchool)) {
            await saveUserCollectionToLocalDB(
              sId,
              uid,
              key as string,
              itemsBySchool[sId],
              { id: currentUser.id, name: currentUser.name }
            );
          }
        }
      }

      setData((prev) => ({
        ...prev,
        ...pendingChanges,
      }));
    } else {
      setData((prev) => ({
        ...prev,
        ...newDataPayload,
      }));
    }
  };

  const checkSchoolsAndYears = async (
    username: string,
    code: string
  ): Promise<{ schools: string[]; years: string[] }> => {
    await ensureSeedDatabase();

    const allUsers = await localDB.users.toArray();
    const matchedUser = allUsers.find(
      (u: any) =>
        u.name &&
        normalizeArabicText(u.name) === normalizeArabicText(username) &&
        String(u.code).trim() === String(code).trim()
    );

    if (!matchedUser) {
      throw new Error("اسم المستخدم أو كود الدخول غير صحيح.");
    }

    const schoolsCfg = await localDB.systemConfigs.get("availableSchools");
    const yearsCfg = await localDB.systemConfigs.get("availableYears");
    const globalSchools: string[] = Array.isArray(schoolsCfg?.data) && schoolsCfg.data.length > 0
      ? schoolsCfg.data
      : ["المدرسة الافتراضية"];
    const globalYears: string[] = Array.isArray(yearsCfg?.data) && yearsCfg.data.length > 0
      ? yearsCfg.data
      : ["2024-2025"];

    let schools = Array.isArray(matchedUser.schools) ? matchedUser.schools.filter(Boolean) : [];
    let years = Array.isArray(matchedUser.academicYears) ? matchedUser.academicYears.filter(Boolean) : [];

    if (matchedUser.role === "admin" || matchedUser.permissions?.all === true) {
      schools = Array.from(new Set([...globalSchools, ...schools])).filter(Boolean);
      years = Array.from(new Set([...globalYears, ...years])).filter(Boolean);
    } else {
      if (schools.length === 0) schools = globalSchools;
      if (years.length === 0) years = globalYears;
    }

    return {
      schools,
      years,
    };
  };

  const completeLogin = async (
    username: string,
    code: string,
    school: string,
    year: string,
    branch?: string
  ): Promise<boolean> => {
    await ensureSeedDatabase();

    const allUsers = await localDB.users.toArray();
    const matchedUser = allUsers.find(
      (u: any) =>
        u.name &&
        normalizeArabicText(u.name) === normalizeArabicText(username) &&
        String(u.code).trim() === String(code).trim()
    );

    if (!matchedUser) {
      toast.error("اسم المستخدم أو كود الدخول غير صحيح.");
      throw new Error("اسم المستخدم أو كود الدخول غير صحيح.");
    }

    let derivedBranch = branch ?? "";
    if (!derivedBranch && matchedUser.permissions?.schoolsAndBranches) {
      const selectedSchools = school.split(",").map((s) => s.trim());
      const allBranches: string[] = [];
      selectedSchools.forEach((sch: string) => {
        const brList = matchedUser.permissions?.schoolsAndBranches?.[sch];
        if (Array.isArray(brList)) {
          allBranches.push(...brList);
        }
      });
      if (allBranches.length > 0) {
        derivedBranch = Array.from(new Set(allBranches)).join(",");
      }
    }
    if (!derivedBranch && (matchedUser.role === "admin" || matchedUser.permissions?.all === true)) {
      derivedBranch = "all";
    }

    const authUser: AuthUser = {
      id: matchedUser.id,
      name: matchedUser.name,
      jobTitle: matchedUser.jobTitle,
      grades: matchedUser.grades || [],
      sections: matchedUser.sections || [],
      subjects: matchedUser.subjects || [],
      schools: matchedUser.schools || [],
      selectedSchool: school,
      selectedYear: year,
      selectedBranch: derivedBranch,
      role: matchedUser.role,
      permissions: matchedUser.permissions,
      customSchoolProfiles: matchedUser.customSchoolProfiles,
    };

    const localToken = "local_session_" + matchedUser.id;
    localStorage.setItem("auth_token", localToken);
    localStorage.setItem("selected_school", school);
    localStorage.setItem("selected_year", year);
    localStorage.setItem("selected_branch", derivedBranch);
    localStorage.setItem("cached_auth_user", JSON.stringify(authUser));

    const loadedData = await loadFullAppDataFromLocalDB(defaultData, school, matchedUser.id);
    if (loadedData.dailyReports && Array.isArray(loadedData.dailyReports)) {
      loadedData.dailyReports = normalizeDailyReports(loadedData.dailyReports);
    }

    setData(loadedData);
    setCurrentUser(authUser);
    setIsAuthenticated(true);
    toast.success("تم تسجيل الدخول بنجاح");
    return true;
  };

  const logout = async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("selected_school");
    localStorage.removeItem("selected_year");
    localStorage.removeItem("selected_branch");
    localStorage.removeItem("cached_auth_user");

    setIsAuthenticated(false);
    setCurrentUser(null);

    const basicData = await loadFullAppDataFromLocalDB(defaultData);
    setData(basicData);
  };

  const handleSetLang = (l: Language) => {
    setLang(l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  const getReportMessageFooter = (dateStr?: string) => {
    let schoolName = "";
    let branchName = "";
    
    const sab = currentUser?.permissions?.schoolsAndBranches;
    if (sab && typeof sab === "object") {
      const schools = Object.keys(sab);
      if (schools.length > 0) {
        schoolName = schools[0];
        const branches = sab[schoolName];
        if (Array.isArray(branches) && branches.length > 0) {
          branchName = branches[0];
        }
      }
    }
    if (!schoolName) {
      schoolName = currentUser?.selectedSchool || (currentUser?.schools && currentUser?.schools[0]) || "";
    }
    if (!branchName) {
      branchName = currentUser?.selectedBranch || "";
    }
    if (!schoolName && data?.profile?.schoolName) {
      schoolName = data.profile.schoolName;
    }
    if (!branchName && data?.profile?.branch) {
      branchName = data.profile.branch;
    }

    schoolName = (schoolName || "").trim();
    branchName = (branchName || "").trim();

    let schoolLabel = schoolName;
    if (schoolLabel && !schoolLabel.startsWith("مدارس")) {
      schoolLabel = `مدارس ${schoolLabel}`;
    }

    let branchLabel = "";
    if (branchName) {
      if (branchName === "المركز الرئيسي") {
        branchLabel = "المركز الرئيسي";
      } else if (branchName.startsWith("فرع")) {
        branchLabel = branchName;
      } else {
        branchLabel = `فرع ${branchName}`;
      }
    }

    let targetDate = new Date();
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        targetDate = new Date(year, month, day);
      } else {
        const fallback = new Date(dateStr);
        if (!isNaN(fallback.getTime())) {
          targetDate = fallback;
        }
      }
    }

    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dayName = days[targetDate.getDay()];
    const day = targetDate.getDate();
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();
    const dateText = `${dayName} ${day}/${month}/${year}`;

    const footerParts = [];
    footerParts.push(dateText);
    if (schoolLabel) footerParts.push(schoolLabel);
    if (branchLabel) footerParts.push(branchLabel);

    return footerParts.join(" - ");
  };

  const shareViaWhatsApp = (text: string, phone?: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch((err) => {
          console.error("Failed to copy text: ", err);
        });
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
        } catch (copyErr) {
          console.error("execCommand copy failed: ", copyErr);
        }
        document.body.removeChild(textarea);
      }
    } catch (e) {
      console.error("Clipboard copy failed: ", e);
    }

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    let url = "";
    if (cleanPhone) {
      url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    } else {
      url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    }
    window.location.href = url;
  };

  return (
    <GlobalContext.Provider
      value={{
        lang,
        setLang: handleSetLang,
        data: filteredData,
        updateData,
        isAuthenticated,
        currentUser,
        userFilter,
        setUserFilter,
        dashboardFilter,
        setDashboardFilter,
        globalDataFilters,
        setGlobalDataFilters,
        dateRange,
        setDateRange,
        completeLogin,
        checkSchoolsAndYears,
        logout,
        effectiveUserIds,
        syncStatus,
        pendingSyncCount,
        queueSyncRequest,
        getReportMessageFooter,
        shareViaWhatsApp,
        isEntityVisible,
        canUserEdit,
        isReadOnlyModule,
        supervisorTeachers,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error("useGlobal must be used within GlobalProvider");
  return context;
};
