import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  BookOpen,
  Briefcase,
  UserPlus,
  AlertCircle,
  Users,
  FileSearch,
  FileText,
  BarChart,
  ClipboardList,
  Key,
  Database,
  Zap,
  Plus,
  X,
  Star,
  Pin,
  Link,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobal } from "../context/GlobalState";

const ALL_ACTIONS = [
  { id: "dashboard", label: "الرئيسية", icon: <Home size={18} /> },
  { id: "daily", label: "متابعة المعلمين", icon: <BookOpen size={18} /> },
  {
    id: "adminReports",
    label: "متابعة الموظفين",
    icon: <Briefcase size={18} />,
  },
  { id: "substitute", label: "جدول التغطية", icon: <UserPlus size={18} /> },
  { id: "violations", label: "التعهدات", icon: <AlertCircle size={18} /> },
  { id: "studentReports", label: "شؤون الطلاب", icon: <Users size={18} /> },
  {
    id: "specialReports",
    label: "التقارير الخاصة",
    icon: <FileSearch size={18} />,
  },
  {
    id: "transport",
    label: "مسؤول الحركة والمواصلات",
    icon: <Briefcase size={18} />,
  },
  { id: "profile", label: "ملف المدرسة", icon: <FileText size={18} /> },
  {
    id: "comprehensiveIndicatorsModal",
    label: "مؤشرات الأداء",
    icon: <BarChart size={18} />,
  },
  {
    id: "caseStudyModal",
    label: "دراسة حالة طالب",
    icon: <ClipboardList size={18} />,
  },
  {
    id: "trainingCoursesModal",
    label: "الدورات التدريبية",
    icon: <BookOpen size={18} />,
  },
  {
    id: "issuesModal",
    label: "المشكلات والحلول",
    icon: <AlertCircle size={18} />,
  },
  { id: "codesModal", label: "التحكم بالصلاحيات", icon: <Key size={18} /> },
  { id: "dataModal", label: "إدارة البيانات", icon: <Database size={18} /> },
  { id: "secretariat", label: "السكرتارية", icon: <Briefcase size={18} /> },
  { id: "teacherPortal", label: "بوابة المعلم", icon: <BookOpen size={18} /> },
  // Sub-items for Special Reports
  {
    id: "specialReports-الغياب اليومي",
    label: "سجل الغياب اليومي",
    icon: <Users size={18} />,
  },
  {
    id: "specialReports-التأخر",
    label: "سجل التأخر المتكرر",
    icon: <AlertCircle size={18} />,
  },
  {
    id: "specialReports-خروج طالب أثناء الدراسة",
    label: "سجل خروج الطلاب",
    icon: <AlertCircle size={18} />,
  },
  {
    id: "specialReports-المخالفات الطلابية",
    label: "سجل المخالفات الطلابية",
    icon: <AlertCircle size={18} />,
  },
  {
    id: "specialReports-سجل الإتلاف المدرسي",
    label: "سجل الإتلاف المدرسي",
    icon: <AlertCircle size={18} />,
  },
  {
    id: "specialReports-سجل الحالات الخاصة",
    label: "سجل الحالات الخاصة",
    icon: <Users size={18} />,
  },
  {
    id: "specialReports-سجل الحالة الصحية",
    label: "سجل الحالة الصحية",
    icon: <AlertCircle size={18} />,
  },
  {
    id: "specialReports-سجل زيارة أولياء الأمور والتواصل بهم",
    label: "زيارات أولياء الأمور",
    icon: <Users size={18} />,
  },
  {
    id: "specialReports-الاختبار الشهري",
    label: "الاختبارات الشهرية",
    icon: <FileSearch size={18} />,
  },
  {
    id: "specialReports-الاختبار الفصلي",
    label: "الاختبارات الفصلية",
    icon: <FileSearch size={18} />,
  },
];

import {
  getUserCollectionFromLocalDB,
  saveUserCollectionToLocalDB,
} from "../src/lib/localDB";

export const useQuickAccess = (userId?: string) => {
  const { currentUser } = useGlobal();
  const [pinned, setPinned] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId || !currentUser?.selectedSchool) return;
    const school = currentUser.selectedSchool.split(",")[0].trim();
    const cacheKey = `cached_quick_access_${school}_${userId}`;

    const fetchPrefs = async () => {
      try {
        const fetchedData = await getUserCollectionFromLocalDB(
          school,
          userId,
          "quickAccess"
        );
        if (fetchedData) {
          localStorage.setItem(cacheKey, JSON.stringify(fetchedData));
          setPinned(Array.isArray(fetchedData.pinned) ? fetchedData.pinned : []);
          setRecent(Array.isArray(fetchedData.recent) ? fetchedData.recent : []);
          setUsage(typeof fetchedData.usage === "object" ? fetchedData.usage : {});
          return;
        }
      } catch (e) {
        console.error("Failed to fetch quick access prefs from localDB:", e);
      }

      const localPrefs = localStorage.getItem(cacheKey);
      if (localPrefs) {
        try {
          const parsed = JSON.parse(localPrefs);
          setPinned(Array.isArray(parsed.pinned) ? parsed.pinned : []);
          setRecent(Array.isArray(parsed.recent) ? parsed.recent : []);
          setUsage(typeof parsed.usage === "object" ? parsed.usage : {});
        } catch (err) {
          console.error("Failed to parse cached quick access prefs:", err);
        }
      }
    };
    fetchPrefs();
  }, [userId, currentUser?.selectedSchool]);

  const save = async (p: string[], r: string[], u: Record<string, number>) => {
    if (!userId || !currentUser?.selectedSchool) return;
    const school = currentUser.selectedSchool.split(",")[0].trim();
    const cacheKey = `cached_quick_access_${school}_${userId}`;
    const cachedData = { pinned: p, recent: r, usage: u };

    localStorage.setItem(cacheKey, JSON.stringify(cachedData));

    try {
      await saveUserCollectionToLocalDB(
        school,
        userId,
        "quickAccess",
        cachedData,
        { id: currentUser.id, name: currentUser.name }
      );
    } catch (e) {
      console.error("Failed to save quick access prefs to localDB:", e);
    }
  };

  const recordUsage = (actionId: string) => {
    setRecent((prev) => {
      const newList = [actionId, ...prev.filter((id) => id !== actionId)].slice(
        0,
        5,
      ); // Keep last 5
      const newUsage = { ...usage, [actionId]: (usage[actionId] || 0) + 1 };
      setUsage(newUsage);
      save(pinned, newList, newUsage);
      return newList;
    });
  };

  const togglePin = (actionId: string) => {
    setPinned((prev) => {
      const newList = prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId];
      save(newList, recent, usage);
      return newList;
    });
  };

  return { pinned, recent, usage, recordUsage, togglePin };
};

export const QuickAccess: React.FC<{
  userId?: string;
  onAction: (id: string) => void;
}> = ({ userId, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useGlobal();

  const { pinned, recent, usage, togglePin } = useQuickAccess(userId);

  // Permission logic (matching Layout)
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

  const issuesModalPerm = currentUser?.permissions?.issuesModal;
  const canUseIssuesButton = checkPerm(issuesModalPerm, "useIssuesButton");

  const managedIds = currentUser?.permissions?.managedUserIds || [];
  const isManager =
    currentUser?.permissions?.userManagement === true || managedIds.length > 0;

  const canUseCaseStudy =
    isGeneralSupervisor ||
    isManager ||
    checkPerm(currentUser?.permissions?.caseStudyModal);

  const trainingPerm = currentUser?.permissions?.trainingCourses;
  const canUseTrainingCourses = checkPerm(trainingPerm);

  const studentAffairsPerm = currentUser?.permissions?.studentAffairs;
  const canUseStudentAffairs = checkPerm(studentAffairsPerm);

  const compIndPerm = currentUser?.permissions?.comprehensiveIndicators;
  const canUseComprehensiveIndicators = checkPerm(compIndPerm, "showButton");

  const isTeacher =
    !!currentUser?.jobTitle && currentUser.jobTitle.includes("معلم");
  const canUseDashboard =
    checkPerm(currentUser?.permissions?.dashboard) && !isTeacher;
  const canUseTeacherPortal =
    checkPerm(currentUser?.permissions?.teacherPortal) || isTeacher;
  const canUseDaily = checkPerm(currentUser?.permissions?.dailyFollowUp);
  const canUseAdmin = checkPerm(currentUser?.permissions?.adminFollowUp);
  const canUseSpecial = checkPerm(currentUser?.permissions?.specialReports);
  const canUseSubstitutes = checkPerm(currentUser?.permissions?.substitutions);
  const canUseProfile = checkPerm(currentUser?.permissions?.schoolProfile);

  const transportPerm = currentUser?.permissions?.transport;
  const canUseTransport = isGeneralSupervisor || 
    (transportPerm === true) || 
    (Array.isArray(transportPerm) && transportPerm.length > 0) ||
    !!(currentUser?.jobTitle && (currentUser.jobTitle.includes("حركة") || currentUser.jobTitle.includes("مواصلات") || currentUser.jobTitle.includes("مشرف") || currentUser.jobTitle.includes("سائق")));

  const canUseCodesModal =
    isGeneralSupervisor ||
    !!(currentUser?.name && (
      currentUser.name.includes("المشرف العام") || 
      currentUser.name.includes("نائب المشرف العام")
    )) ||
    !!(currentUser?.jobTitle && (
      currentUser.jobTitle.includes("المشرف العام") || 
      currentUser.jobTitle.includes("نائب المشرف العام")
    ));
  const canUseDataModal = isGeneralSupervisor;
  const isSecretariatRole = [
    "مدير عام المدارس",
    "مدير الفرع",
    "السكرتارية",
  ].includes(currentUser?.jobTitle || "");
  const canUseSecretariat =
    checkPerm(currentUser?.permissions?.secretariat, "showButton") ||
    isSecretariatRole;

  const allowedIds = [
    ...(canUseDashboard ? ["dashboard"] : []),
    ...(canUseDaily ? ["daily"] : []),
    ...(canUseAdmin ? ["adminReports"] : []),
    ...(canUseSubstitutes ? ["substitute"] : []),
    ...(canUseStudentAffairs ? ["violations", "studentReports"] : []),
    ...(canUseSpecial
      ? [
          "specialReports",
          ...(checkPerm(currentUser?.permissions?.specialReports, "absenceLog")
            ? ["specialReports-الغياب اليومي"]
            : []),
          ...(checkPerm(currentUser?.permissions?.specialReports, "latenessLog")
            ? ["specialReports-التأخر"]
            : []),
          ...(checkPerm(currentUser?.permissions?.specialReports, "exitLog")
            ? ["specialReports-خروج طالب أثناء الدراسة"]
            : []),
          ...(checkPerm(
            currentUser?.permissions?.specialReports,
            "violationLog",
          )
            ? ["specialReports-المخالفات الطلابية"]
            : []),
          ...(checkPerm(currentUser?.permissions?.specialReports, "damageLog")
            ? ["specialReports-سجل الإتلاف المدرسي"]
            : []),
          ...(checkPerm(
            currentUser?.permissions?.specialReports,
            "specialCasesLog",
          )
            ? ["specialReports-سجل الحالات الخاصة"]
            : []),
          ...(checkPerm(currentUser?.permissions?.specialReports, "healthLog")
            ? ["specialReports-سجل الحالة الصحية"]
            : []),
          ...(checkPerm(
            currentUser?.permissions?.specialReports,
            "parentVisitLog",
          )
            ? ["specialReports-سجل زيارة أولياء الأمور والتواصل بهم"]
            : []),
          ...(checkPerm(currentUser?.permissions?.specialReports, "examLog")
            ? [
                "specialReports-الاختبار الشهري",
                "specialReports-الاختبار الفصلي",
              ]
            : []),
        ]
      : []),
    ...(canUseTransport ? ["transport"] : []),
    ...(canUseProfile ? ["profile"] : []),
    ...(canUseComprehensiveIndicators ? ["comprehensiveIndicatorsModal"] : []),
    ...(canUseCaseStudy ? ["caseStudyModal"] : []),
    ...(canUseTrainingCourses ? ["trainingCoursesModal"] : []),
    ...(canUseIssuesButton ? ["issuesModal"] : []),
    ...(canUseCodesModal ? ["codesModal"] : []),
    ...(canUseDataModal ? ["dataModal"] : []),
    ...(canUseSecretariat ? ["secretariat"] : []),
    ...(canUseTeacherPortal ? ["teacherPortal"] : []),
  ];

  const allowedActions = ALL_ACTIONS.filter((a) => allowedIds.includes(a.id));

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowAll(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAction = (id: string) => allowedActions.find((a) => a.id === id);

  // Frequently used items (top 3, not pinned, not recent)
  const popular = Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])
    .filter(
      (id) =>
        allowedIds.includes(id) && !pinned.includes(id) && !recent.includes(id),
    )
    .slice(0, 3);

  const handleActionClick = (id: string) => {
    onAction(id);
    setIsOpen(false);
  };

  const ActionButton = ({
    id,
    isPinned,
  }: {
    id: string;
    isPinned?: boolean;
  }) => {
    const action = getAction(id);
    if (!action) return null;
    return (
      <div className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl group transition-all">
        <button
          className="flex items-center gap-3 flex-1 text-slate-700 font-bold text-sm"
          onClick={() => handleActionClick(id)}
        >
          <div className="text-blue-500">{action.icon}</div>
          {action.label}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePin(id);
          }}
          className={`p-1.5 rounded-lg transition-colors ${isPinned ? "text-amber-600 bg-amber-100 opacity-100" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50 sm:opacity-0 sm:group-hover:opacity-100 opacity-100"}`}
          title={isPinned ? "إلغاء التثبيت" : "تثبيت في الوصول السريع"}
        >
          <Pin
            size={16}
            fill={isPinned ? "currentColor" : "none"}
            className={isPinned ? "rotate-45" : ""}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-2 border-amber-100 rounded-[1.2rem] text-amber-700 font-bold text-sm hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm"
      >
        <Zap size={18} className="fill-amber-500 text-amber-500" /> الوصول
        السريع
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 \${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 z-[90] sm:hidden backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown / Action sheet */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed sm:absolute bottom-4 sm:bottom-auto left-4 right-4 sm:start-auto sm:end-0 sm:translate-x-0 sm:top-full z-[100] sm:mt-2 sm:w-72 bg-white rounded-3xl sm:rounded-2xl shadow-xl sm:border border-slate-100 flex flex-col overflow-hidden max-h-[85vh]"
            >
              <div className="overflow-y-auto custom-scrollbar p-2 overscroll-contain flex-1">
                {!showAll ? (
                  <>
                    {pinned.length > 0 && (
                      <div className="mb-3">
                        <div className="px-3 py-1 text-xs font-black text-amber-600 mb-1 flex items-center gap-1">
                          <Pin
                            size={12}
                            fill="currentColor"
                            className="rotate-45"
                          />{" "}
                          المثبتة
                        </div>
                        {pinned.map((id) => (
                          <ActionButton key={id} id={id} isPinned={true} />
                        ))}
                      </div>
                    )}

                    {recent.length > 0 && (
                      <div className="mb-3">
                        <div className="px-3 py-1 text-xs font-black text-blue-400 mb-1">
                          الأخيرة
                        </div>
                        {recent
                          .filter((id) => !pinned.includes(id))
                          .map((id) => (
                            <ActionButton key={id} id={id} />
                          ))}
                      </div>
                    )}

                    {popular.length > 0 && (
                      <div className="mb-3">
                        <div className="px-3 py-1 text-xs font-black text-emerald-500 mb-1">
                          الأكثر استخداماً
                        </div>
                        {popular.map((id) => (
                          <ActionButton key={id} id={id} />
                        ))}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setShowAll(true)}
                        className="w-full text-center py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        تخصيص القائمة (إظهار الكل)
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-2">
                      <span className="font-black text-slate-800 text-sm">
                        كافة الإجراءات المتاحة
                      </span>
                      <button
                        onClick={() => setShowAll(false)}
                        className="text-slate-400 hover:text-slate-700 bg-slate-50 p-1 rounded-lg"
                      >
                        <ChevronDown size={16} className="rotate-90" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {allowedActions.map((action) => (
                        <ActionButton
                          key={action.id}
                          id={action.id}
                          isPinned={pinned.includes(action.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
