import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Language,
  AppData,
  TaskItem,
  TaskReport,
  AuthUser,
  User,
} from "../types";
import api from "../src/lib/api";
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

  // Offline status & synchronization queue states
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'offline' | 'connecting'>(
    navigator.onLine ? 'synced' : 'offline'
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const isSyncing = useRef(false);

  // Trigger syncing of queued requests
  const triggerSyncQueue = async () => {
    if (isSyncing.current) return;
    
    // Check if offline
    if (!navigator.onLine) {
      setSyncStatus('offline');
      const savedQueue = localStorage.getItem('pending_sync_queue');
      const queue = savedQueue ? JSON.parse(savedQueue) : [];
      setPendingSyncCount(queue.length);
      return;
    }

    const savedQueue = localStorage.getItem('pending_sync_queue');
    let queue = savedQueue ? JSON.parse(savedQueue) : [];
    
    if (queue.length === 0) {
      setSyncStatus('synced');
      setPendingSyncCount(0);
      return;
    }

    isSyncing.current = true;
    setSyncStatus('connecting');
    setPendingSyncCount(queue.length);

    try {
      while (true) {
        // Read fresh queue state from localStorage in each iteration
        const currentSaved = localStorage.getItem('pending_sync_queue');
        const currentQueue = currentSaved ? JSON.parse(currentSaved) : [];
        if (currentQueue.length === 0) {
          break;
        }

        const item = currentQueue[0];
        console.log(`🔄 Syncing item to server: ${item.method || 'POST'} ${item.url}`, item.payload);
        
        try {
          if (item.method === 'DELETE') {
            await api.delete(item.url);
          } else {
            await api.post(item.url, item.payload);
          }
        } catch (err: any) {
          console.error("Syncing item failed:", item, err);
          const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';
          if (isNetworkError) {
            setSyncStatus(navigator.onLine ? 'connecting' : 'offline');
            throw err; // Re-throw to stop processing and keep it in the queue
          }
          // Non-network error (e.g. 400 validation error, 403, 500): Skip it to prevent locking queue
        }

        // Read fresh queue again to get any requests appended during the network call
        const freshSaved = localStorage.getItem('pending_sync_queue');
        let freshQueue = freshSaved ? JSON.parse(freshSaved) : [];
        
        // Remove the processed item by ID (ensuring we don't accidentally remove a different item if queue shifted)
        if (freshQueue.length > 0 && freshQueue[0].id === item.id) {
          freshQueue.shift();
        } else {
          freshQueue = freshQueue.filter((q: any) => q.id !== item.id);
        }

        localStorage.setItem('pending_sync_queue', JSON.stringify(freshQueue));
        setPendingSyncCount(freshQueue.length);
      }
      setSyncStatus('synced');
      toast.success("تم مزامنة جميع التعديلات بنجاح مع السيرفر!");

      // Check if there is a deferred system update waiting to be applied
      if (localStorage.getItem('sw_update_ready') === 'true') {
        localStorage.removeItem('sw_update_ready');
        console.log("🔄 Applying deferred system update after sync completion...");
        window.location.reload();
      }
    } catch (err) {
      console.error("Syncing offline queue failed:", err);
    } finally {
      isSyncing.current = false;
      // Trigger again in case new items were added right when we were exiting the finally block
      const finalSaved = localStorage.getItem('pending_sync_queue');
      const finalQueue = finalSaved ? JSON.parse(finalSaved) : [];
      setPendingSyncCount(finalQueue.length);
      if (finalQueue.length > 0 && navigator.onLine) {
        // Run triggerSyncQueue asynchronously to prevent infinite call stack
        setTimeout(() => triggerSyncQueue(), 50);
      }
    }
  };

  const queueSyncRequest = (url: string, payload: any, method: 'POST' | 'DELETE' = 'POST') => {
    const savedQueue = localStorage.getItem('pending_sync_queue');
    let queue = savedQueue ? JSON.parse(savedQueue) : [];

    // Overwrite same URL & key/id to prevent duplicate database records (only for POST)
    const existingIndex = queue.findIndex(
      (item: any) => item.url === url && item.method === method && item.payload?.key === payload?.key
    );

    if (existingIndex !== -1 && method === 'POST') {
      queue[existingIndex].payload = payload;
      queue[existingIndex].timestamp = Date.now();
    } else {
      queue.push({
        id: Math.random().toString(36).substring(2, 9),
        url,
        payload,
        method,
        timestamp: Date.now()
      });
    }

    localStorage.setItem('pending_sync_queue', JSON.stringify(queue));
    setPendingSyncCount(queue.length);
    setSyncStatus('pending');
    
    triggerSyncQueue();
  };

  // Automatically save full state to localStorage on modification
  useEffect(() => {
    if (data && data !== defaultData) {
      localStorage.setItem('cached_app_data', JSON.stringify(data));
    }
  }, [data]);

  // Cache authenticated user profile
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cached_auth_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Monitor network connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      console.log("📶 Network status: Online. Flusher triggered.");
      const saved = localStorage.getItem('pending_sync_queue');
      const q = saved ? JSON.parse(saved) : [];
      setSyncStatus(q.length > 0 ? 'connecting' : 'synced');
      triggerSyncQueue();
    };

    const handleOffline = () => {
      console.log("📴 Network status: Offline.");
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count check
    const savedQueue = localStorage.getItem('pending_sync_queue');
    const queue = savedQueue ? JSON.parse(savedQueue) : [];
    setPendingSyncCount(queue.length);
    if (queue.length > 0) {
      setSyncStatus(navigator.onLine ? 'pending' : 'offline');
      triggerSyncQueue();
    } else {
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    }

    // Interval flusher check (every 30 seconds)
    const interval = setInterval(triggerSyncQueue, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);
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
        .filter((u) => u.schools.some((s) => allSchools.includes(s)))
        .map((u) => u.id);
    } else {
      // Non-admin logic: see fellow members based on overlap
      return data.users
        .filter((u) => {
          if (u.id === currentUser.id) return true;
          const isTargetAdmin =
            u.role === "admin" || u.permissions?.all === true;
          if (!isAdminOrFull && isTargetAdmin) return false;

          return u.schools.some((s) => {
            if (!selectedSchools.includes(s)) return false;

            // Branch check
            const managerBranches =
              currentUser.permissions?.schoolsAndBranches?.[s] || [];
            if (managerBranches.length > 0) {
              const targetBranches =
                u.permissions?.schoolsAndBranches?.[s] || [];
              // If target has branch restrictions, they must overlap
              if (targetBranches.length > 0 && !managerBranches.some((b) => targetBranches.includes(b))) {
                return false;
              }
            }

            // If not a school-wide viewer, we must enforce grades/sections overlap if defined
            if (!isSchoolWideViewer) {
              const managerGrades = currentUser.grades || [];
              const managerSections = currentUser.sections || [];
              const targetGrades = u.grades || [];
              const targetSections = u.sections || [];

               // Only check overlap if the manager actually has specific grades/sections assigned
               // If the manager has no grades/sections assigned but isn't a schoolWideViewer, they shouldn't see anyone except themselves (which is handled above)
              if (managerGrades.length === 0 && managerSections.length === 0) {
                 return false;
              }

              if (managerGrades.length > 0 && targetGrades.length > 0) {
                if (!managerGrades.some(g => targetGrades.includes(g))) return false;
              }
              if (managerSections.length > 0 && targetSections.length > 0) {
                 if (!managerSections.some(sec => targetSections.includes(sec))) return false;
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

      // School & Branch Isolation (Even for items without userId like synced staff items)
      if (item.school && !isGeneralSupervisor) {
        const userSchools = (currentUser?.selectedSchool || "")
          .split(",")
          .map((s) => s.trim());
        if (!userSchools.includes("all") && !userSchools.includes(item.school))
          return false;
      }
      if (item.branch && !isGeneralSupervisor) {
        const userBranches = (currentUser?.selectedBranch || "")
          .split(",")
          .map((b) => b.trim());
        if (
          userBranches.length > 0 &&
          !userBranches.includes("all") &&
          !userBranches.includes(item.branch)
        )
          return false;
      }

      // Always filter: if item has no userId, keep it (shared data)
      if (!item.userId) return true;

      const isAdminOrFull = isGeneralSupervisor;

      // Special logic for Daily/Periodical reports
      if (key === "dailyReports") {
        const periodType = item.periodType || "daily";
        if (periodType === "daily") {
          // Verify that the daily report belongs to the user's active/authorized schools
          const rSchools = [item.schoolId, item.schoolName, item.school]
            .filter(Boolean)
            .flatMap((s: string) => String(s).split(',').map((x: string) => x.trim()));

          const userSchools = [
            ...(Array.isArray(currentUser?.schools) ? currentUser.schools : []),
            ...(currentUser?.selectedSchool ? currentUser.selectedSchool.split(',') : [])
          ].map((s: string) => s.trim()).filter(Boolean);

          if (userSchools.includes("all") || rSchools.length === 0 || rSchools.some((s: string) => userSchools.includes(s))) {
            return true; // Allowed: belongs to user's current school scope regardless of recording supervisor
          }
          return false; // Isolated: belongs to another school
        }
        if (!isAdminOrFull) {
          // Aggregated reports (weekly, monthly, etc.) are strictly private to the user
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

    // 1. Filter secretariatStaff (Teachers) to match user's school and branch
    if (newData.secretariatStaff) {
      newData.secretariatStaff = newData.secretariatStaff.filter((s: any) => {
        // School check
        if (activeSchool && activeSchool !== "all") {
          if (s.school && String(s.school).trim() !== String(activeSchool).trim()) {
            return false;
          }
        }
        // Branch check
        if (currentBranch && currentBranch !== "all" && currentBranch !== "الجميع") {
          const allowedBranches = currentBranch.split(",").map((b: string) => b.trim());
          if (s.branch && !allowedBranches.includes(String(s.branch).trim())) {
            return false;
          }
        }
        return true;
      });
    }

    // 2. Filter secretariatStudents (Students) to match user's school and branch
    if (newData.secretariatStudents) {
      newData.secretariatStudents = newData.secretariatStudents.filter((s: any) => {
        // School check
        if (activeSchool && activeSchool !== "all") {
          if (s.school && String(s.school).trim() !== String(activeSchool).trim()) {
            return false;
          }
        }
        // Branch check
        if (currentBranch && currentBranch !== "all" && currentBranch !== "الجميع") {
          const allowedBranches = currentBranch.split(",").map((b: string) => b.trim());
          if (s.branch && !allowedBranches.includes(String(s.branch).trim())) {
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

    // Activity arrays — filter by both user and date
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
    ];

    // Entity arrays — filter by user only (date is irrelevant for profile cards)
    const entityKeys = ["studentReports", "timetable", "teacherFollowUps"];

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
  }, [data, effectiveUserIds, dateRange, currentUser?.selectedSchool, currentUser?.selectedBranch]);

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

  const activeListeners = React.useRef<Set<string>>(new Set());

  // 1. Initial mounting and session restoration
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const savedSchool = localStorage.getItem('selected_school') || '';
          const savedYear = localStorage.getItem('selected_year') || '';
          const savedBranch = localStorage.getItem('selected_branch') || '';
          
          if (!navigator.onLine) {
            // Restore session offline from cached auth user
            const cachedUserStr = localStorage.getItem('cached_auth_user');
            if (cachedUserStr) {
              const cachedUser = JSON.parse(cachedUserStr);
              setCurrentUser(cachedUser);
              setIsAuthenticated(true);
              console.log("Restored offline session for user:", cachedUser.name);
              
              // Load offline app data
              const cachedDataStr = localStorage.getItem('cached_app_data');
              if (cachedDataStr) {
                setData(JSON.parse(cachedDataStr));
              }
              return;
            }
          }

          const res = await api.get(`/user/profile?school=${encodeURIComponent(savedSchool)}&year=${encodeURIComponent(savedYear)}&branch=${encodeURIComponent(savedBranch)}`);
          setIsAuthenticated(true);
          const validatedUser = res.data.user;
          setCurrentUser(validatedUser);
          if (validatedUser) {
            if (validatedUser.selectedSchool) {
              localStorage.setItem('selected_school', validatedUser.selectedSchool);
            }
            if (validatedUser.selectedYear) {
              localStorage.setItem('selected_year', validatedUser.selectedYear);
            }
            if (validatedUser.selectedBranch) {
              localStorage.setItem('selected_branch', validatedUser.selectedBranch);
            }
          }
        } catch (error: any) {
          console.error("Failed to restore session, checking network error:", error);
          const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error';
          if (isNetworkError) {
            const cachedUserStr = localStorage.getItem('cached_auth_user');
            if (cachedUserStr) {
              const cachedUser = JSON.parse(cachedUserStr);
              setCurrentUser(cachedUser);
              setIsAuthenticated(true);
              console.log("Restored session from cache due to network glitch");
              
              const cachedDataStr = localStorage.getItem('cached_app_data');
              if (cachedDataStr) {
                setData(JSON.parse(cachedDataStr));
              }
              return;
            }
          }
          // Only remove token if it's a real Auth error (401, 403, etc.)
          localStorage.removeItem('auth_token');
        }
      }
    }
    restoreSession();

    // Fetch initial global configurations once on mount
    async function loadGlobalConfigs() {
      try {
        if (!navigator.onLine) {
          throw new Error("Offline status");
        }
        const res = await api.get('/sync/global');
        setData((prev) => ({
          ...prev,
          ...res.data
        }));
      } catch (error) {
        console.error("Failed to load global configurations, loading offline cache:", error);
        const cached = localStorage.getItem('cached_app_data');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setData(parsed);
            console.log("Successfully loaded offline fallback configurations");
          } catch (e) {
            console.error("Failed to parse cached app data", e);
          }
        }
      }
    }
    loadGlobalConfigs();
  }, []);

  // 2. Dynamic polling effect when authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      // No unauthenticated polling needed anymore since login is dynamic and secure
      return;
    }

    const schoolId = currentUser.selectedSchool?.split(",")[0]?.trim();
    const userId = currentUser.id;

    if (!schoolId || !userId) return;

    const fetchSyncData = async () => {
      try {
        // Skip polling if there are active sync operations in progress
        // This prevents the poller from overwriting local deletions/changes
        // before they reach the server
        if (activeSyncCount.current > 0) {
          console.log("Skipping poll: active sync operations in progress", activeSyncCount.current);
          return;
        }

        // Also skip if there are pending items in the sync queue
        const pendingQueueStr = localStorage.getItem('pending_sync_queue');
        if (pendingQueueStr) {
          try {
            const pendingQueue = JSON.parse(pendingQueueStr);
            if (Array.isArray(pendingQueue) && pendingQueue.length > 0) {
              console.log("Skipping poll: pending sync queue has", pendingQueue.length, "items");
              return;
            }
          } catch(e) { /* ignore parse errors */ }
        }

        // Parallel fetching of school-shared logs and user-personal logs
        const [sharedRes, userRes] = await Promise.all([
          api.get(`/sync/school/${encodeURIComponent(schoolId)}`),
          api.get(`/sync/school/${encodeURIComponent(schoolId)}/user/${encodeURIComponent(userId)}/data`),
        ]);

        setData((prev) => {
          // Union merge for dailyPreparations, studentEvaluations, teacherEvaluations from userRes.data to prevent losing legacy entries
          const mergedShared = { ...sharedRes.data };
          const mergeKeys = [
            "dailyPreparations",
            "studentEvaluations",
            "teacherEvaluations",
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
            "adminReports"
          ];
          
          mergeKeys.forEach((key) => {
            const sharedArr = mergedShared[key] || [];
            const userArr = userRes.data?.[key] || [];
            if (Array.isArray(sharedArr) && Array.isArray(userArr) && userArr.length > 0) {
              const map = new Map();
              sharedArr.forEach((item) => {
                if (item && item.id) map.set(item.id, item);
              });
              userArr.forEach((item) => {
                if (item && item.id && !map.has(item.id)) {
                  map.set(item.id, item);
                }
              });
              mergedShared[key] = Array.from(map.values());
            }
          });

          if (Array.isArray(mergedShared.dailyReports)) {
            mergedShared.dailyReports = normalizeDailyReports(mergedShared.dailyReports);
          }

          // Clean userRes.data from strictlySharedKeys to prevent overriding shared school data
          const cleanUserData = { ...userRes.data };
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
          strictlySharedKeys.forEach((key) => {
            delete cleanUserData[key];
          });

          // Normalize server users to ensure camelCase keys exist
          const normalizedServerUsers = (sharedRes.data.users || []).map((u: any) => ({
            ...u,
            jobTitle: u.jobTitle || u.job_title || "",
            academicYears: u.academicYears || u.academic_years || [],
            startDate: u.startDate || u.start_date || "",
            expiryDate: u.expiryDate || u.expiry_date || "",
          }));

          // Merge school-scoped arrays rather than replacing to protect multi-tenant state
          const localUsers = prev.users || [];
          const serverUserIds = new Set(normalizedServerUsers.map((u: any) => u.id));
          
          // Protect sequential offline sync train: ONLY preserve local users if they are genuinely
          // queued in the offline outbox / pending_sync_queue awaiting server upload
          let pendingLocalUserIds = new Set<string>();
          try {
            const queueStr = localStorage.getItem('pending_sync_queue');
            if (queueStr) {
              const queue = JSON.parse(queueStr);
              if (Array.isArray(queue)) {
                queue.forEach((q: any) => {
                  if (q?.key === 'users' && Array.isArray(q?.data)) {
                    q.data.forEach((item: any) => {
                      if (item?.id) pendingLocalUserIds.add(item.id);
                    });
                  }
                });
              }
            }
          } catch (e) { /* ignore */ }

          const pendingLocalUsers = localUsers.filter((u: any) => {
            if (!u || !u.id) return false;
            return pendingLocalUserIds.has(u.id) && !serverUserIds.has(u.id);
          });
          
          const otherSchoolsUsers = localUsers.filter((u: any) => {
            if (!u) return false;
            const userSchools = u.schools || [];
            const belongsToPolledSchool = userSchools.includes(schoolId) || userSchools.includes('all') || u.role === 'admin';
            return !belongsToPolledSchool;
          });
          // Merge: other-school users + server users + any pending-local users not yet on server
          const mergedUsers = [...otherSchoolsUsers, ...normalizedServerUsers, ...pendingLocalUsers];

          const localStudents = prev.secretariatStudents || [];
          const newServerStudents = sharedRes.data.secretariatStudents || [];
          const otherSchoolsStudents = localStudents.filter((item: any) => {
            if (!item) return false;
            const belongsToPolledSchool = (item.school && item.school.trim() === schoolId) ||
                                          (item.schoolBranch && item.schoolBranch.startsWith(schoolId));
            return !belongsToPolledSchool;
          });
          const mergedStudents = [...otherSchoolsStudents, ...newServerStudents];

          const localStaff = prev.secretariatStaff || [];
          const newServerStaff = sharedRes.data.secretariatStaff || [];
          const otherSchoolsStaff = localStaff.filter((item: any) => {
            if (!item) return false;
            const belongsToPolledSchool = (item.school && item.school.trim() === schoolId) ||
                                          (item.schoolBranch && item.schoolBranch.startsWith(schoolId));
            return !belongsToPolledSchool;
          });
          const mergedStaff = [...otherSchoolsStaff, ...newServerStaff];

          const localCriteria = prev.customSupervisionCriteria || [];
          const newServerCriteria = sharedRes.data.customSupervisionCriteria || [];
          const otherSchoolsCriteria = localCriteria.filter((item: any) => {
            if (!item) return false;
            const belongsToPolledSchool = item.school === schoolId;
            return !belongsToPolledSchool;
          });
          const mergedCriteria = [...otherSchoolsCriteria, ...newServerCriteria];

          // Strict Multi-School Data Isolation: Keyed merge for teacherEvaluations
          const cleanSchoolId = (schoolId || "").trim();
          const localTeacherEvaluations = prev.teacherEvaluations || [];
          const newServerTeacherEvaluations = sharedRes.data.teacherEvaluations || [];
          // 1. عزل صارم: الاحتفاظ بزيارات المدارس الأخرى بشرط وجود اسم المدرسة وتطابقه
          const otherSchoolsTeacherEvaluations = localTeacherEvaluations.filter((item: any) => {
            if (!item || !item.school) return false;
            return !isSameSchool(item.school, cleanSchoolId);
          });
          // 2. دمج زيارات المدرسة الحالية بالمعرّف الفريد لمنع التكرار وتفادي المسح
          const serverEvalIds = new Set(newServerTeacherEvaluations.map((e: any) => e.id));
          const pendingLocalEvaluations = localTeacherEvaluations.filter((item: any) => {
            if (!item || !item.school) return false;
            return isSameSchool(item.school, cleanSchoolId) && !serverEvalIds.has(item.id);
          });
          const mergedTeacherEvaluations = [
            ...otherSchoolsTeacherEvaluations,
            ...newServerTeacherEvaluations,
            ...pendingLocalEvaluations
          ];

          // Server is the single source of truth for users - replace, don't merge with stale local data
          // CRITICAL: Remove global-only keys from mergedShared to prevent
          // stale school_shared_data from overwriting current global configs.
          // availableSchools and availableYears are global configs stored in system_configs,
          // but may also exist as stale entries in school_shared_data.
          delete mergedShared.availableSchools;
          delete mergedShared.availableYears;
          delete mergedShared.aboutSliderImages;
          delete mergedShared.aboutExternalLinks;
          delete mergedShared.aboutLogoImg;
          delete mergedShared.schoolBranches;

          // Delete the merged arrays from raw payloads to prevent them from being overwritten during spread
          delete mergedShared.users;
          delete mergedShared.secretariatStudents;
          delete mergedShared.secretariatStaff;
          delete mergedShared.customSupervisionCriteria;
          delete mergedShared.teacherEvaluations;

          delete cleanUserData.users;
          delete cleanUserData.secretariatStudents;
          delete cleanUserData.secretariatStaff;
          delete cleanUserData.customSupervisionCriteria;
          delete cleanUserData.teacherEvaluations;

          const merged = {
            ...prev,
            ...mergedShared,
            ...cleanUserData,
            users: mergedUsers,
            secretariatStudents: mergedStudents,
            secretariatStaff: mergedStaff,
            customSupervisionCriteria: mergedCriteria,
            teacherEvaluations: mergedTeacherEvaluations,
          };
          if (sharedRes.data && sharedRes.data.profile) {
            merged.profiles = {
              ...(prev.profiles || {}),
              [schoolId]: sharedRes.data.profile,
            };
          }
          return merged;
        });
      } catch (err) {
        console.error("Poller synchronization failed:", err);
      }
    };

    fetchSyncData();
    // Poll every 60 seconds (1 minute) to drastically reduce database connection spikes
    const interval = setInterval(fetchSyncData, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id, currentUser?.selectedSchool]);

  const syncTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const latestPayloads = useRef<Record<string, any>>({});
  const latestTransactionData = useRef<Record<string, any>>({});
  // Track active sync operations to prevent poller from overwriting local changes
  const activeSyncCount = useRef<number>(0);

  const enqueueSync = (syncId: string, syncFn: () => Promise<void>) => {
    if (syncTimeouts.current[syncId]) {
      clearTimeout(syncTimeouts.current[syncId]);
    }
    activeSyncCount.current++;
    syncTimeouts.current[syncId] = setTimeout(async () => {
      try {
        await syncFn();
      } catch (err) {
        console.error("Delayed sync failed:", syncId, err);
      } finally {
        activeSyncCount.current = Math.max(0, activeSyncCount.current - 1);
      }
    }, 0); // 0ms delay for maximum immediacy to support instant multi-device syncing
  };

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

      let isBlockedByReadOnly = currentUser.permissions?.readOnly;

      if (isBlockedByReadOnly) {
        // Find if this specific update is allowed by a specific module's allowEdits
        let canBypass = false;
        const perms: any = currentUser.permissions || {};

        // Define mapping of data keys to their parent permission key
        const keyToModuleMap: Record<string, string[]> = {
          secretariatStudents: ["secretariat"],
          secretariatStaff: ["secretariat"],
          timetable: ["secretariat"],
          dailyReports: ["dailyFollowUp"],
          adminReports: ["adminFollowUp"],
          adminIndividualReports: ["adminFollowUp"],
          studentReports: ["studentAffairs", "secretariat"], // Secretariat might update this implicitly
          violations: ["studentAffairs"],
          parentVisits: ["studentAffairs"],
          teacherFollowUps: ["teacherPortal"],
          selfEvaluations: ["teacherPortal"],
          studentEvaluations: ["teacherPortal"],
          dailyPreparations: ["teacherPortal"],
          substitutions: ["substitutions"],
          schoolProfile: ["schoolProfile"],
          profile: ["schoolProfile"],
          schoolBranches: ["schoolProfile"],
          availableSchools: ["schoolProfile"], // Admins can manage this usually, but keep it mapped just in case
          users: ["userManagement"],
          taskReports: ["specialReports"],
          absenceLogs: ["specialReports"],
          studentLatenessLogs: ["specialReports"],
          studentViolationLogs: ["specialReports"],
          exitLogs: ["specialReports"],
          damageLogs: ["specialReports"],
          parentVisitLogs: ["specialReports"],
          examLogs: ["specialReports"],
          notebookFollowUpLogs: ["specialReports"],
          notebookReportArchives: ["specialReports"],
          transportBuses: ["specialReports"],
          transportLogs: ["specialReports"],
          transportDailyStatus: ["specialReports"],
          financeRecords: ["specialReports"],
          issues: ["issuesModal"],
          trainingCourses: ["trainingCourses"],
          caseStudies: ["caseStudyModal"],
          comprehensiveIndicators: ["comprehensiveIndicators"],
          taskTemplates: ["dashboard"],
        };

        const tryingToUpdateKeys = Object.keys(newData);
        canBypass = tryingToUpdateKeys.every((key) => {
          const modNames = keyToModuleMap[key] || [key];
          return modNames.some((modName) => {
            const modPerms = perms[modName];
            return Array.isArray(modPerms) && modPerms.includes("allowEdits");
          });
        });

        if (canBypass) {
          isBlockedByReadOnly = false;
        }
      }

      if (isBlockedByReadOnly) {
        console.warn("ReadOnly permission: Update blocked");
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

            // Update local state immediately for instant feedback *before* any network logic
            if (key !== "profile" && key !== "profiles") {
              if (
                (key === "secretariatStaff" ||
                  key === "secretariatStudents" ||
                  key === "customSupervisionCriteria" ||
                  key === "teacherEvaluations") &&
                Array.isArray(newData[key])
              ) {
                const oldArray = (rawData[key] as any[]) || [];
                const newArray = (newData[key] as any[]) || [];
                
                const mergedMap = new Map();
                oldArray.forEach((item) => {
                  const id = item.id || item.uuid;
                  if (id) mergedMap.set(id, item);
                });
                newArray.forEach((item) => {
                  const id = item.id || item.uuid;
                  if (id) mergedMap.set(id, item);
                });
                
                // Remove items belonging to the target schools being updated if they are not in the new array
                const newArrayIds = new Set(newArray.map(item => item.id || item.uuid));
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
                pendingChanges[key] = newData[key] as any;
              }
            }

            // CRITICAL: availableSchools and availableYears are GLOBAL configs.
            // They must ONLY be saved to system_configs via /sync/global,
            // NOT to school_shared_data via /sync/school/${school}.
            // Saving them to school_shared_data causes stale copies to overwrite
            // the current state when fetchSyncData pulls school data.
            const globalOnlyKeys: string[] = ["availableSchools", "availableYears"];
            
            if ((key as string) === "users") {
              // Direct individual user synchronization methodology
              const newUsers = (newData.users || []) as any[];
              const oldUsers = (data.users || []) as any[];
              const newUserIds = newUsers.map((u) => u.id);

              // 1. Detect and queue added/modified users
              newUsers.forEach((u) => {
                const oldU = oldUsers.find((ou) => ou.id === u.id);
                if (!oldU || JSON.stringify(oldU) !== JSON.stringify(u)) {
                  const syncId = `user_save_${u.id}`;
                  latestPayloads.current[syncId] = u;
                  enqueueSync(syncId, async () => {
                    queueSyncRequest('/sync/user', latestPayloads.current[syncId], 'POST');
                  });
                }
              });

              // 2. Detect and queue deleted users
              // CRITICAL: Only delete users that belong to the target schools being updated.
              // Without this guard, any page that calls updateData({ users: someSubset })
              // would send DELETE requests for ALL users not in that subset, even users
              // from other schools or newly-added users not yet reflected in the caller's data snapshot.
              oldUsers.forEach((u) => {
                if (u && u.id && !newUserIds.includes(u.id)) {
                  // Only delete if this user actually belongs to one of the schools being updated
                  const userSchools = u.schools || [];
                  const belongsToTargetSchool = 
                    u.role === 'admin' || 
                    u.permissions?.all === true ||
                    schoolsToUpdate.some((s) => userSchools.includes(s));
                  
                  if (belongsToTargetSchool) {
                    const syncId = `user_delete_${u.id}`;
                    enqueueSync(syncId, async () => {
                      queueSyncRequest(`/sync/user/${encodeURIComponent(u.id)}`, null, 'DELETE');
                    });
                  }
                }
              });
            } else if (!globalOnlyKeys.includes(key as string)) {
            schoolsToUpdateForThisKey.forEach((school) => {
              const fullPath = `schools/${school}/shared/${key}`;
              let payloadToSave = newData[key];

              // Determine intended actions to prevent Array Overwrites
              let isArrayWithIds = false;
              let intendedUpdates = new Map();
              let intendedDeletes = new Set();
              
              if (Array.isArray(payloadToSave) && Array.isArray(rawData[key as keyof AppData])) {
                 const oldClientArray = rawData[key as keyof AppData] as any[];
                 const hasIds = payloadToSave.length > 0 ? !!(payloadToSave[0].id || payloadToSave[0].uuid) : (oldClientArray.length > 0 ? !!(oldClientArray[0].id || oldClientArray[0].uuid) : false);
                 
                 if (hasIds) {
                    isArrayWithIds = true;
                    // For the debounced update, we merge changes locally before sending
                    const newMap = new Map<string, any>(payloadToSave.map((i: any) => [i.id || i.uuid, i] as [string, any]));
                    const oldMap = new Map<string, any>(oldClientArray.map(i => [i.id || i.uuid, i] as [string, any]));
                    
                    for (const [id, newItem] of newMap.entries()) {
                       if (!id) continue;
                       const oldItem = oldMap.get(id);
                       if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                          intendedUpdates.set(id, newItem);
                       }
                    }
                    for (const id of oldMap.keys()) {
                       if (!id) continue;
                       if (!newMap.has(id)) {
                          intendedDeletes.add(id);
                       }
                    }
                 }
              }

              // Apply pre-filtering rules for multi-tenant isolation
              const filterPayloadItem = (item: any) => {
                 if ((key as string) === "users") {
                    return (item.schools && item.schools.some((s: string) => s && (s.trim() === school.trim() || s.trim() === "all"))) ||
                           item.role === "admin" ||
                           item.permissions?.all === true;
                 } else if (key === "secretariatStudents" || key === "secretariatStaff") {
                    return (item.school && item.school.trim() === school.trim()) ||
                           (item.schoolBranch && item.schoolBranch.startsWith(school));
                 } else if (key === "customSupervisionCriteria") {
                    return item.school === school.trim();
                 } else if (key === "teacherEvaluations") {
                    return item.school && isSameSchool(item.school, school);
                 }
                 return true;
              };

              if (Array.isArray(payloadToSave) && (!isArrayWithIds || (key as string) === "users" || key === "secretariatStudents" || key === "secretariatStaff" || key === "customSupervisionCriteria" || key === "teacherEvaluations")) {
                 payloadToSave = payloadToSave.filter(filterPayloadItem) as any;
              }

              const syncId = `shared_${school}_${key}`;
              latestPayloads.current[syncId] = payloadToSave;
              enqueueSync(syncId, async () => {
                const currentPayloadToSave = latestPayloads.current[syncId];
                queueSyncRequest(`/sync/school/${encodeURIComponent(school)}`, {
                  key: key,
                  data: currentPayloadToSave,
                });
              });
              if (key === "profile") {
                pendingChanges.profiles = {
                  ...(pendingChanges.profiles || data.profiles),
                  [school]: newData[key],
                } as any;
              }
            });
            } // end of globalOnlyKeys guard

            if (key === "availableSchools" || key === "availableYears") {
               if (isAdminOrFull) {
                 const syncId = `global_${key}`;
                 latestPayloads.current[syncId] = newData[key];
                 enqueueSync(syncId, async () => {
                   queueSyncRequest('/sync/global', {
                     key: key,
                     data: latestPayloads.current[syncId],
                   });
                 });
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
            queueSyncRequest('/sync/global', {
              key: key,
              data: newData[key],
            });
          }
          continue;
        }

        if (customizableKeys.includes(key)) {
          pendingChanges[key] = newData[key] as any;
          const isAdminOrFull =
            currentUser.role === "admin" ||
            currentUser.permissions?.all === true;
  
          schoolsToUpdate.forEach((school) => {
            const syncId = `custom_${school}_${currentUser.id}_${key}`;
            latestPayloads.current[syncId] = newData[key];
            
            enqueueSync(syncId, async () => {
              if (isAdminOrFull) {
                queueSyncRequest(`/sync/school/${encodeURIComponent(school)}`, {
                  key: key,
                  data: latestPayloads.current[syncId],
                });
              } else {
                queueSyncRequest(`/sync/school/${encodeURIComponent(school)}/user/${encodeURIComponent(currentUser.id)}/data`, {
                  key: key,
                  items: latestPayloads.current[syncId],
                });
              }
            });
          });
          continue;
        }

        const newArray = newData[key] as any[];
        if (!Array.isArray(newArray)) {
          pendingChanges[key] = newData[key] as any;
          continue;
        }

        const oldArray = (rawData[key] as any[]) || [];

        // Merge: keep items outside the current filter window, replace those inside.
        const itemsNotMatchingFilter = oldArray.filter(
          (item) => !matchesCurrentFilter(item, key),
        );
        let finalArray = [...itemsNotMatchingFilter, ...newArray];
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
          // Check if the items changed, independent of array ordering
          const userItems = finalArray.filter((item) => item.userId === uid);
          const oldUserItems = oldArray.filter((item) => item.userId === uid);

          const sortedUserItems = [...userItems].sort((a, b) =>
            (a.id || "").localeCompare(b.id || ""),
          );
          const sortedOldUserItems = [...oldUserItems].sort((a, b) =>
            (a.id || "").localeCompare(b.id || ""),
          );

          if (
            JSON.stringify(sortedUserItems) ===
            JSON.stringify(sortedOldUserItems)
          ) {
            continue; // No changes for this user, skip Firebase write
          }

          // Group by school
          const itemsBySchool: Record<string, any[]> = {};
          schoolsToUpdate.forEach((s) => (itemsBySchool[s] = [])); // Initialize all with empty array

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
            const syncId = `user_${sId}_${uid}_${key}`;
            latestPayloads.current[syncId] = itemsBySchool[sId];
            
            enqueueSync(syncId, async () => {
              queueSyncRequest(`/sync/school/${encodeURIComponent(sId)}/user/${encodeURIComponent(uid)}/data`, {
                key: key,
                items: latestPayloads.current[syncId],
              });
            });
          }
        }
      }

      setData((prev) => {
        const final = { ...prev, ...pendingChanges };
        
        return final;
      });
    } else {
      // Fallback for non-authenticated or initial state
      setData((prev) => {
        const final = { ...prev, ...newDataPayload };
        
        return final;
      });
    }
  };

  

  const checkSchoolsAndYears = async (username: string, code: string): Promise<{ schools: string[]; years: string[] }> => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('cached_app_data');
      if (!cached) {
        throw new Error("لا توجد بيانات محلية مسجلة مسبقاً. يرجى الاتصال بالشبكة أولاً.");
      }
      const parsed = JSON.parse(cached);
      const matchedUser = (parsed.users || []).find(
        (u: any) => u.name && u.name.trim().toLowerCase() === username.trim().toLowerCase()
      );
      
      if (!matchedUser || matchedUser.code !== code) {
        throw new Error("اسم المستخدم أو الكود غير صحيح محلياً.");
      }
      
      let schools = matchedUser.schools || [];
      let years = matchedUser.academicYears || [];
      if (matchedUser.role === 'admin' || matchedUser.permissions?.all === true) {
        schools = parsed.availableSchools || [];
        years = parsed.availableYears || [];
      }
      return {
        schools: schools.filter(Boolean),
        years: years.filter(Boolean)
      };
    }

    try {
      const res = await api.post("/auth/check-schools-years", {
        username: username,
        code: code,
      });
      return res.data;
    } catch (err: any) {
      console.error("Credentials check failed online, checking offline fallback:", err);
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';
      if (isNetworkError) {
        const cached = localStorage.getItem('cached_app_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          const matchedUser = (parsed.users || []).find(
            (u: any) => u.name && u.name.trim().toLowerCase() === username.trim().toLowerCase()
          );
          if (matchedUser && matchedUser.code === code) {
            let schools = matchedUser.schools || [];
            let years = matchedUser.academicYears || [];
            if (matchedUser.role === 'admin' || matchedUser.permissions?.all === true) {
              schools = parsed.availableSchools || [];
              years = parsed.availableYears || [];
            }
            return {
              schools: schools.filter(Boolean),
              years: years.filter(Boolean)
            };
          }
        }
      }
      throw err;
    }
  };

  const completeLogin = async (username: string, code: string, school: string, year: string, branch?: string): Promise<boolean> => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('cached_app_data');
      if (!cached) {
        throw new Error("لا توجد بيانات محلية مسجلة مسبقاً.");
      }
      const parsed = JSON.parse(cached);
      const matchedUser = (parsed.users || []).find(
        (u: any) => u.name && u.name.trim().toLowerCase() === username.trim().toLowerCase()
      );

      if (!matchedUser || matchedUser.code !== code) {
        throw new Error("فشل التحقق من كود الدخول أوفلاين.");
      }

      let derivedBranch = branch ?? '';
      if (!derivedBranch && matchedUser.permissions?.schoolsAndBranches) {
        const selectedSchools = school.split(',');
        const allBranches: string[] = [];
        selectedSchools.forEach((sch: string) => {
          const brList = matchedUser.permissions.schoolsAndBranches[sch];
          if (Array.isArray(brList)) {
            allBranches.push(...brList);
          }
        });
        if (allBranches.length > 0) {
          derivedBranch = Array.from(new Set(allBranches)).join(',');
        }
      }
      if (!derivedBranch && (matchedUser.role === 'admin' || matchedUser.permissions?.all === true)) {
        derivedBranch = 'all';
      }

      const mockAuthUser = {
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

      const offlineToken = "offline_token_" + matchedUser.id;
      localStorage.setItem("auth_token", offlineToken);
      localStorage.setItem("selected_school", school);
      localStorage.setItem("selected_year", year);
      localStorage.setItem("selected_branch", derivedBranch);

      if (currentUser?.id && currentUser.id !== mockAuthUser.id) {
         setData({
           ...defaultData,
           users: parsed.users,
           availableSchools: parsed.availableSchools,
           availableYears: parsed.availableYears,
           schoolBranches: parsed.schoolBranches,
         });
      } else {
         setData(parsed);
      }

      setIsAuthenticated(true);
      setCurrentUser(mockAuthUser);
      toast.success("تم تسجيل الدخول بنجاح (بدون اتصال)");
      return true;
    }

    try {
      const res = await api.post("/login", {
        username: username,
        code: code,
        school: school,
        year: year,
        branch: branch,
      });

      const { token, user: authUser } = res.data;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("selected_school", school);
      localStorage.setItem("selected_year", year);
      localStorage.setItem("selected_branch", authUser.selectedBranch);

      if (currentUser?.id && currentUser.id !== authUser.id) {
         setData((prev) => ({
           ...defaultData,
           users: [],
           secretariatStaff: [],
           availableSchools: prev.availableSchools,
           availableYears: prev.availableYears,
           schoolBranches: prev.schoolBranches,
         }));
      }

      setIsAuthenticated(true);
      setCurrentUser(authUser);
      toast.success("تم تسجيل الدخول بنجاح");
      return true;
    } catch (err: any) {
      console.error("Login failed online, checking network glitch for offline fallback:", err);
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';
      if (isNetworkError) {
        const cached = localStorage.getItem('cached_app_data');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const matchedUser = (parsed.users || []).find(
              (u: any) => u.name && u.name.trim().toLowerCase() === username.trim().toLowerCase()
            );
            if (matchedUser && matchedUser.code === code) {
              let derivedBranch = branch ?? '';
              if (!derivedBranch && matchedUser.permissions?.schoolsAndBranches) {
                const selectedSchools = school.split(',');
                const allBranches: string[] = [];
                selectedSchools.forEach((sch: string) => {
                  const brList = matchedUser.permissions.schoolsAndBranches[sch];
                  if (Array.isArray(brList)) {
                    allBranches.push(...brList);
                  }
                });
                if (allBranches.length > 0) {
                  derivedBranch = Array.from(new Set(allBranches)).join(',');
                }
              }
              if (!derivedBranch && (matchedUser.role === 'admin' || matchedUser.permissions?.all === true)) {
                derivedBranch = 'all';
              }

              const mockAuthUser = {
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

              const offlineToken = "offline_token_" + matchedUser.id;
              localStorage.setItem("auth_token", offlineToken);
              localStorage.setItem("selected_school", school);
              localStorage.setItem("selected_year", year);
              localStorage.setItem("selected_branch", derivedBranch);

              if (currentUser?.id && currentUser.id !== mockAuthUser.id) {
                setData({
                  ...defaultData,
                  users: parsed.users,
                  availableSchools: parsed.availableSchools,
                  availableYears: parsed.availableYears,
                  schoolBranches: parsed.schoolBranches,
                });
              } else {
                setData(parsed);
              }

              setIsAuthenticated(true);
              setCurrentUser(mockAuthUser);
              toast.success("تم تسجيل الدخول بنجاح (بدون اتصال)");
              return true;
            }
          } catch (e) {
            console.error("Failed offline login fallback parse:", e);
          }
        }
      }
      const errMsg = err.response?.data?.message || err.message;
      toast.error("فشل تسجيل الدخول: " + errMsg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (err) {
      console.warn("Logout request failed:", err);
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("selected_school");
    localStorage.removeItem("selected_year");
    localStorage.removeItem("selected_branch");
    localStorage.removeItem("cached_auth_user");
    
    setIsAuthenticated(false);
    setCurrentUser(null);
    setData((prev) => ({
      ...defaultData,
      users: [],
      secretariatStaff: [],
      availableSchools: prev.availableSchools,
      availableYears: prev.availableYears,
      schoolBranches: prev.schoolBranches,
    }));
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
