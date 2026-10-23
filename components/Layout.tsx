import React, { useState } from "react";
import { useGlobal } from "../context/GlobalState";
import DataSyncCenterModal from "./DataSyncCenterModal";
import {
  Menu,
  X,
  Home,
  Users,
  ClipboardList,
  BookOpen,
  Settings,
  LogOut,
  MessageCircle,
  FileText,
  UserPlus,
  FileSearch,
  Briefcase,
  AlertCircle,
  UserX,
  BarChart,
  FileBarChart,
  Wallet,
  Award,
  RefreshCw,
  Database,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  onNavigate,
  onOpenSettings,
  onLogout,
}) => {
  const { lang, setLang, logout, data, currentUser } = useGlobal();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState(false);

  const managedIds = currentUser?.permissions?.managedUserIds || [];
  const isManager =
    currentUser?.permissions?.userManagement === true || managedIds.length > 0;
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

  // If we want to check view on caseStudy, we use checkPerm
  const canUseCaseStudy =
    isGeneralSupervisor ||
    isManager ||
    checkPerm(currentUser?.permissions?.caseStudyModal);

  const trainingPerm = currentUser?.permissions?.trainingCourses;
  const canUseTrainingCourses = checkPerm(trainingPerm);

  const teacherPerm = currentUser?.permissions?.teacherPortal;
  const canUseTeacherPortal = checkPerm(teacherPerm, "view");

  const studentAffairsPerm = currentUser?.permissions?.studentAffairs;
  const canUseStudentAffairs = checkPerm(studentAffairsPerm);

  const compIndPerm = currentUser?.permissions?.comprehensiveIndicators;
  const canUseComprehensiveIndicators = checkPerm(compIndPerm, "showButton");

  const canUseDashboard = checkPerm(currentUser?.permissions?.dashboard);
  const commPerms = currentUser?.permissions?.communicationDev;
  const canUseCommunicationDev =
    isGeneralSupervisor ||
    commPerms === true ||
    (Array.isArray(commPerms) &&
      commPerms.some((p: string) =>
        ["circulars", "surveys", "homework"].includes(p),
      ));

  const canUseDaily = checkPerm(currentUser?.permissions?.dailyFollowUp);
  const canUseEducationalSupervision = checkPerm(
    currentUser?.permissions?.educationalSupervision,
  );
  const canUseAdmin = checkPerm(currentUser?.permissions?.adminFollowUp);
  const canUseSpecial = checkPerm(currentUser?.permissions?.specialReports);
  const canUseSchoolActivities =
    isGeneralSupervisor ||
    checkPerm(currentUser?.permissions?.schoolActivities) ||
    checkPerm(currentUser?.permissions?.specialReports);
  const canUseFinance =
    isGeneralSupervisor || checkPerm(currentUser?.permissions?.finance);
  const canUseSubstitutes = checkPerm(currentUser?.permissions?.substitutions);
  const canUseProfile = checkPerm(currentUser?.permissions?.schoolProfile);

  const transportPerm = currentUser?.permissions?.transport;
  const canUseTransport =
    isGeneralSupervisor ||
    transportPerm === true ||
    (Array.isArray(transportPerm) && transportPerm.length > 0) ||
    !!(
      currentUser?.jobTitle &&
      (currentUser.jobTitle.includes("حركة") ||
        currentUser.jobTitle.includes("مواصلات") ||
        currentUser.jobTitle.includes("مشرف") ||
        currentUser.jobTitle.includes("سائق"))
    );

  const isSecretariatRole = [
    "مدير عام المدارس",
    "مدير الفرع",
    "السكرتارية",
  ].includes(currentUser?.jobTitle || "");
  const canUseSecretariat =
    checkPerm(currentUser?.permissions?.secretariat, "showButton") ||
    isSecretariatRole;

  const menuItems = [
    ...(canUseDashboard
      ? [{ icon: <Home size={20} />, label: "لوحة التحكم", path: "dashboard" }]
      : []),
    {
      icon: <RefreshCw size={20} />,
      label: "إدارة وتبادل البيانات / المزامنة",
      path: "syncCenterModal",
      action: () => setIsSyncCenterOpen(true),
    },
    ...(canUseDashboard
      ? [
          {
            icon: <FileBarChart size={20} />,
            label: "التقارير الشاملة",
            path: "comprehensiveReports",
          },
        ]
      : []),
    ...(canUseFinance
      ? [{ icon: <Wallet size={20} />, label: "المالية", path: "finance" }]
      : []),
    ...(canUseCommunicationDev
      ? [
          {
            icon: <MessageCircle size={20} />,
            label: "التواصل والتطوير",
            path: "communicationDev",
          },
        ]
      : []),
    ...(canUseDaily
      ? [
          {
            icon: <BookOpen size={20} />,
            label: "متابعة المعلمين",
            path: "daily",
          },
        ]
      : []),
    ...(canUseEducationalSupervision
      ? [
          {
            icon: <BookOpen size={20} />,
            label: "الإشراف التربوي",
            path: "educationalSupervision",
          },
        ]
      : []),
    ...(canUseAdmin
      ? [
          {
            icon: <Briefcase size={20} />,
            label: "متابعة الموظفين والعاملين",
            path: "adminReports",
          },
        ]
      : []),
    ...(canUseSecretariat
      ? [
          {
            icon: <Briefcase size={20} />,
            label: "السكرتارية",
            path: "secretariat",
          },
        ]
      : []),
    ...(canUseStudentAffairs
      ? [{ icon: <UserX size={20} />, label: "التعهدات", path: "violations" }]
      : []),
    ...(canUseStudentAffairs
      ? [
          {
            icon: <Users size={20} />,
            label: "شؤون الطلاب",
            path: "studentReports",
          },
        ]
      : []),
    ...(canUseTeacherPortal
      ? [
          {
            icon: <BookOpen size={20} />,
            label: "خاص بالمعلم",
            path: "teacherPortal",
          },
        ]
      : []),
    ...(canUseSpecial
      ? [
          {
            icon: <FileSearch size={20} />,
            label: "التقارير الخاصة",
            path: "specialReports",
          },
        ]
      : []),
    ...(canUseSchoolActivities
      ? [
          {
            icon: <Award size={20} />,
            label: "الأنشطة المدرسية",
            path: "schoolActivities",
          },
        ]
      : []),
    ...(canUseTransport
      ? [
          {
            icon: <Briefcase size={20} />,
            label: "مسؤول الحركة والمواصلات",
            path: "transport",
          },
        ]
      : []),
    ...(canUseComprehensiveIndicators
      ? [
          {
            icon: <BarChart size={20} />,
            label: "مؤشرات الأداء الشاملة",
            path: "comprehensiveIndicatorsModal",
          },
        ]
      : []),
    ...(canUseCaseStudy
      ? [
          {
            icon: <ClipboardList size={20} />,
            label: "دراسة حالة طالب",
            path: "caseStudyModal",
          },
        ]
      : []),
    ...(canUseTrainingCourses
      ? [
          {
            icon: <BookOpen size={20} />,
            label: "الدورات التدريبية",
            path: "trainingCoursesModal",
          },
        ]
      : []),
    ...(canUseIssuesButton
      ? [
          {
            icon: <AlertCircle size={20} />,
            label: "المشكلات والحلول",
            path: "issuesModal",
          },
        ]
      : []),
    ...(canUseSubstitutes
      ? [
          {
            icon: <UserPlus size={20} />,
            label: "جدول التغطية",
            path: "substitute",
          },
        ]
      : []),
    ...(canUseProfile
      ? [
          {
            icon: <FileText size={20} />,
            label: "ملف المدرسة",
            path: "profile",
          },
        ]
      : []),
  ];

  const handleMenuClick = (item: any) => {
    if (item.action) {
      item.action();
    } else if (item.path === "dataModal" || item.path === "syncCenterModal") {
      setIsSyncCenterOpen(true);
    } else {
      onNavigate(item.path);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen flex flex-col font-arabic`}>
      <header className="bg-white border-b h-16 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </button>

          <button
            type="button"
            onClick={() => setIsSyncCenterOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
            title="إدارة وتبادل البيانات / المزامنة (.schpack)"
          >
            <Database size={16} />
            <span>إدارة وتبادل البيانات / المزامنة</span>
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:block">
          <h1 className="text-xl font-black text-blue-600 whitespace-nowrap">
            {" "}
            رفيقك المدرسي{" "}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="px-4 py-1.5 border rounded-full text-sm font-semibold bg-white shadow-sm"
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
          <button
            onClick={onLogout || logout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed sm:sticky top-16 z-40 h-[calc(100vh-4rem)] bg-white border-e transition-all duration-300 shadow-xl sm:shadow-none ${isSidebarOpen ? "w-64" : "w-0 overflow-hidden"} flex flex-col`}
        >
          <nav className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleMenuClick(item)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all text-sm font-bold text-right"
              >
                <div className="text-blue-500">{item.icon}</div>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 bg-slate-50 overflow-auto">
          {children}
        </main>
      </div>

      <DataSyncCenterModal
        isOpen={isSyncCenterOpen}
        onClose={() => setIsSyncCenterOpen(false)}
      />

      <footer className="bg-white border-t py-4 px-6 text-center text-slate-600 font-semibold text-xs sm:text-sm">
        إعداد المستشار الإداري والتربوي إبراهيم دخان - R27-
      </footer>
    </div>
  );
};

export default Layout;
