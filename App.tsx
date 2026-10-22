import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { GlobalProvider, useGlobal } from './context/GlobalState';
import Layout from './components/Layout';
import Dashboard from './app/Dashboard';
import DataManagementModal from './components/DataManagementModal';
import AccessCodesModal from './components/AccessCodesModal';
import IssuesAndSolutionsModal from './components/IssuesAndSolutionsModal';
import CaseStudyModal from './components/CaseStudyModal';
import TrainingCoursesModal from './components/TrainingCoursesModal';
import ComprehensiveIndicatorsModal from './components/ComprehensiveIndicatorsModal';
import { QuickAccess, useQuickAccess } from './components/QuickAccess';
import { SecretariatView } from './components/SecretariatView';
import SkeletonLoader from './components/SkeletonLoader';

const lazyWithRetry = (componentImport: () => Promise<any>) => {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Error loading component chunk, retrying with page reload...", error);
      // Reload the page once to pull the latest service worker assets or reload from network/cache
      window.location.reload();
      return new Promise(() => {}); // Return a pending promise to prevent rendering half-loaded state
    }
  });
};

const SubstitutionPage = lazyWithRetry(() => import('./app/SubstitutionPage'));
const StaffFollowUpPage = lazyWithRetry(() => import('./app/StaffFollowUpPage'));
const SpecialReportsPage = lazyWithRetry(() => import('./app/SpecialReportsPage'));
const ProfilePage = lazyWithRetry(() => import('./app/ProfilePage'));
const DailyReportsPage = lazyWithRetry(() => import('./app/ReportsPage').then(module => ({ default: module.DailyReportsPage })));
const EducationalSupervisionPage = lazyWithRetry(() => import('./app/EducationalSupervisionPage'));
const ViolationsPage = lazyWithRetry(() => import('./app/ReportsPage').then(module => ({ default: module.ViolationsPage })));
const StudentsReportsPage = lazyWithRetry(() => import('./app/ReportsPage').then(module => ({ default: module.StudentsReportsPage })));
const TeacherPortalPage = lazyWithRetry(() => import('./app/TeacherPortalPage').then(module => ({ default: module.TeacherPortalPage })));
const IntroPage = lazyWithRetry(() => import('./app/IntroPage'));
const AboutProgramPage = lazyWithRetry(() => import('./app/AboutProgramPage'));
const TransportPage = lazyWithRetry(() => import('./app/TransportPage'));
const CommunicationDevPage = lazyWithRetry(() => import('./app/CommunicationDevPage'));
const ComprehensiveReportsPage = lazyWithRetry(() => import('./app/ComprehensiveReportsPage'));
const FinancePage = lazyWithRetry(() => import('./app/FinancePage'));
const SchoolActivitiesPage = lazyWithRetry(() => import('./app/SchoolActivitiesPage'));

import {
  Lock, LayoutDashboard, ClipboardCheck, ClipboardList, UserX, UserPlus,
  Users, Database, FileSearch, Briefcase, BookOpen,
  School, Calendar, AlertTriangle, AlertCircle, Phone, MessageCircle, Key, LogOut, User as UserIcon, X, Check,
  ChevronDown, ChevronUp, Sparkles, BarChart, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import GlobalScrollArrows from './components/GlobalScrollArrows';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { User, UserPermissions } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

interface AdvancedLoginPageProps {
  step: 'credentials' | 'selection' | 'expired';
  setStep: React.Dispatch<React.SetStateAction<'credentials' | 'selection' | 'expired'>>;
}

const AdvancedLoginPage: React.FC<AdvancedLoginPageProps> = ({ step, setStep }) => {
  const { completeLogin, checkSchoolsAndYears, data } = useGlobal();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [error, setError] = useState('');
  const [showMultiSchool, setShowMultiSchool] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [userSchools, setUserSchools] = useState<string[]>([]);
  const [userYears, setUserYears] = useState<string[]>([]);

  const handleCheckCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !code) {
      setError('يرجى إدخال اسم المستخدم ورقم الكود');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const res = await checkSchoolsAndYears(username, code);
      const { schools, years } = res;

      if (!schools || schools.length === 0) {
        setError('لم يتم العثور على أي مدارس مصرح بها لهذا المستخدم');
        setIsLoading(false);
        return;
      }

      setUserSchools((schools || []).filter(Boolean));
      setUserYears((years || []).filter(Boolean));

      if (schools.length === 1 && years.length === 1) {
        await completeLogin(username, code, schools[0], years[0]);
      } else {
        setSelectedSchools([schools[0]]);
        setAcademicYear(years[0] || data.availableYears?.[0] || '2024-2025');
        setStep('selection');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'اسم المستخدم أو كود الدخول غير صحيح';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !code || selectedSchools.length === 0 || !academicYear) {
      setError('يرجى إكمال جميع الحقول');
      return;
    }

    setError('');
    try {
      await completeLogin(username, code, selectedSchools.join(','), academicYear);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'كود الدخول غير صحيح لهذا المستخدم';
      setError(errMsg);
    }
  };

  const toggleSchool = (school: string) => {
    setSelectedSchools(prev =>
      prev.includes(school) ? prev.filter(s => s !== school) : [...prev, school]
    );
  };

  const selectAllSchools = () => {
    setSelectedSchools(userSchools || []);
  };

  const renderStep = () => {
    switch (step) {
      case 'credentials':
        return (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-lg shadow-blue-200 mb-6 transform rotate-3">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">تسجيل الدخول</h2>
              <p className="text-blue-500 font-bold mt-2 text-sm">أدخل بياناتك للمتابعة</p>
            </div>
            <form onSubmit={handleCheckCredentials} className="space-y-4">
              {/* 1. Username */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">اسم المستخدم</label>
                <div className="relative">
                  <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all"
                    value={username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* 2. Code */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">رقم الكود</label>
                <div className="relative">
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="password"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center text-xl font-bold transition-all outline-none"
                    value={code || ''}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="كود الدخول"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-center font-bold text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all hover:-translate-y-1 active:translate-y-0 mt-4 flex items-center justify-center gap-2"
              >
                {isLoading ? 'جاري التحقق...' : 'التالي'}
              </button>
            </form>
          </motion.div>
        );
      case 'selection':
        return (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-lg shadow-blue-200 mb-6 transform rotate-3">
                <School className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">تحديد المدرسة والعام</h2>
              <p className="text-blue-500 font-bold mt-2 text-sm">حدد النطاق للولوج للنظام</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* 3. School Name */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">اسم المدرسة</label>
                <div className="relative">
                  <School className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <div
                    onClick={() => setShowMultiSchool(!showMultiSchool)}
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedSchools.length === 0 ? 'اختر المدرسة' :
                        selectedSchools.length === 1 ? selectedSchools[0] :
                          `${selectedSchools.length} مدارس مختارة`}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {showMultiSchool && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden mt-2 p-4 space-y-2 shadow-inner"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-400">اختر المدارس المتاحة لك:</span>
                        <button
                          type="button"
                          onClick={selectAllSchools}
                          className="text-xs font-black text-blue-600 hover:underline"
                        >
                          تحديد الكل
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {userSchools.filter(Boolean).map(school => (
                          <label key={school} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school)}
                              onChange={() => toggleSchool(school)}
                              className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-slate-700">{school}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 4. Academic Year */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 mr-4">العام الدراسي</label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold outline-none transition-all"
                    value={academicYear || ''}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  >
                    <option value="" disabled hidden>اختر العام الدراسي</option>
                    {userYears.filter(Boolean).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-red-500 text-center font-bold text-sm">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="w-1/3 bg-slate-100 text-slate-600 p-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-200 transition-all text-center"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all text-center"
                >
                  دخول النظام
                </button>
              </div>
            </form>
          </motion.div>
        );
      case 'expired':
        return (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full blur-2xl opacity-20"
              />
              <div className="relative inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-orange-50 text-orange-500 rounded-full shadow-2xl mb-2">
                <AlertTriangle className="w-12 h-12" />
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">انتهت صلاحية الاشتراك</h2>
              <div className="mt-4 p-6 bg-orange-50 rounded-3xl border-2 border-orange-100">
                <p className="text-orange-700 font-bold leading-relaxed">
                  عذراً، لقد انتهت مدة الصلاحية الخاصة بك.
                  <br />
                  لتمديدها يرجى التواصل مع فريق التوافق.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a
                href="tel:967780804012"
                className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:shadow-xl transition-all group"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Phone size={24} />
                </div>
                <span className="font-black text-slate-700">اتصال هاتف</span>
              </a>
              <a
                href="whatsapp://send?phone=967780804012"
                className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-green-500 hover:shadow-xl transition-all group"
              >
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all">
                  <MessageCircle size={24} />
                </div>
                <span className="font-black text-slate-700">واتساب</span>
              </a>
            </div>

            <button
              onClick={() => setStep('credentials')}
              className="px-8 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
            >
              رجوع
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 font-arabic overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            y: [0, 100, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"
        />
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 border-8 border-slate-50/50">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface AppHistoryState {
  isAuthenticated: boolean;
  loginStep: 'credentials' | 'selection' | 'expired';
  view: string;
  isDataModalOpen: boolean;
  isCodesModalOpen: boolean;
  isUserFilterModalOpen: boolean;
  isAppIssuesModalOpen: boolean;
  isCaseStudyModalOpen: boolean;
  isTrainingCoursesModalOpen: boolean;
  isComprehensiveIndicatorsOpen: boolean;
  isPasswordModalOpen: boolean;
}

const MainApp: React.FC = () => {
  const { isAuthenticated, currentUser, userFilter, setUserFilter, data, updateData, logout, dateRange, setDateRange, globalDataFilters, setGlobalDataFilters, syncStatus, pendingSyncCount } = useGlobal();
  const [view, setView] = useState('intro');
  const [loginStep, setLoginStep] = useState<'credentials' | 'selection' | 'expired'>('credentials');
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    setView('intro');
  }, [isAuthenticated]);


  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCodesModalOpen, setIsCodesModalOpen] = useState(false);
  const [isUserFilterModalOpen, setIsUserFilterModalOpen] = useState(false);
  const [isAppIssuesModalOpen, setIsAppIssuesModalOpen] = useState(false);
  const [isCaseStudyModalOpen, setIsCaseStudyModalOpen] = useState(false);
  const [isTrainingCoursesModalOpen, setIsTrainingCoursesModalOpen] = useState(false);
  const [isComprehensiveIndicatorsOpen, setIsComprehensiveIndicatorsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [specialCodesPassword, setSpecialCodesPassword] = useState('');

  const [isInitialSyncing, setIsInitialSyncing] = useState(false);

  useEffect(() => {
    // If the app loads and we are online with pending sync queue items, enable initial sync locking overlay
    if (pendingSyncCount > 0 && navigator.onLine) {
      setIsInitialSyncing(true);
    }
  }, []);

  useEffect(() => {
    if (pendingSyncCount === 0) {
      setIsInitialSyncing(false);
    }
  }, [pendingSyncCount]);

  const swUpdateReady = localStorage.getItem('sw_update_ready') === 'true';
  const showSyncOverlay = (isInitialSyncing || swUpdateReady) && pendingSyncCount > 0 && navigator.onLine;

  const isSystemUpdating = React.useRef(false);
  const allowExit = React.useRef(false);

  const getAppState = (): AppHistoryState => ({
    isAuthenticated,
    loginStep,
    view,
    isDataModalOpen,
    isCodesModalOpen,
    isUserFilterModalOpen,
    isAppIssuesModalOpen,
    isCaseStudyModalOpen,
    isTrainingCoursesModalOpen,
    isComprehensiveIndicatorsOpen,
    isPasswordModalOpen,
  });

  useEffect(() => {
    const initialState = getAppState();
    
    // Replace current state with index 0
    window.history.replaceState({ ...initialState, index: 0, isGuard: true }, '');
    // Push the current state with index 1
    window.history.pushState({ ...initialState, index: 1 }, '');

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state) return;

      const isExitAttempt = 
        state.isGuard || 
        state.index === 0 || 
        (isAuthenticated && !state.isAuthenticated);

      if (isExitAttempt) {
        if (allowExit.current) {
          return;
        }

        setIsExitConfirmOpen(true);
        const activeState = getAppState();
        window.history.pushState({ ...activeState, index: 1 }, '');
        return;
      }

      isSystemUpdating.current = true;
      
      setLoginStep(state.loginStep);
      setView(state.view);
      setIsDataModalOpen(state.isDataModalOpen);
      setIsCodesModalOpen(state.isCodesModalOpen);
      setIsUserFilterModalOpen(state.isUserFilterModalOpen);
      setIsAppIssuesModalOpen(state.isAppIssuesModalOpen);
      setIsCaseStudyModalOpen(state.isCaseStudyModalOpen);
      setIsTrainingCoursesModalOpen(state.isTrainingCoursesModalOpen);
      setIsComprehensiveIndicatorsOpen(state.isComprehensiveIndicatorsOpen);
      setIsPasswordModalOpen(state.isPasswordModalOpen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isSystemUpdating.current) {
      isSystemUpdating.current = false;
      return;
    }

    const activeState = getAppState();
    const historyState = window.history.state;
    
    if (historyState) {
      const modalKeys = [
        'isDataModalOpen',
        'isCodesModalOpen',
        'isUserFilterModalOpen',
        'isAppIssuesModalOpen',
        'isCaseStudyModalOpen',
        'isTrainingCoursesModalOpen',
        'isComprehensiveIndicatorsOpen',
        'isPasswordModalOpen',
      ] as const;

      let modalClosed = false;
      let isTransitionToCodes = false;
      for (const key of modalKeys) {
        if (historyState[key] && !activeState[key]) {
          if (key === 'isPasswordModalOpen' && activeState.isCodesModalOpen) {
            isTransitionToCodes = true;
            continue;
          }
          modalClosed = true;
          break;
        }
      }

      const isLoginStepBack = 
        (historyState.loginStep === 'selection' && activeState.loginStep === 'credentials') ||
        (historyState.loginStep === 'expired' && activeState.loginStep === 'credentials');

      const viewChanged = historyState.view !== activeState.view;
      if ((modalClosed && !viewChanged) || isLoginStepBack) {
        window.history.back();
      } else if (isTransitionToCodes) {
        window.history.replaceState({ ...activeState, index: historyState.index }, '');
      } else {
        const isDifferent = 
          historyState.view !== activeState.view ||
          historyState.loginStep !== activeState.loginStep ||
          historyState.isDataModalOpen !== activeState.isDataModalOpen ||
          historyState.isCodesModalOpen !== activeState.isCodesModalOpen ||
          historyState.isUserFilterModalOpen !== activeState.isUserFilterModalOpen ||
          historyState.isAppIssuesModalOpen !== activeState.isAppIssuesModalOpen ||
          historyState.isCaseStudyModalOpen !== activeState.isCaseStudyModalOpen ||
          historyState.isTrainingCoursesModalOpen !== activeState.isTrainingCoursesModalOpen ||
          historyState.isComprehensiveIndicatorsOpen !== activeState.isComprehensiveIndicatorsOpen ||
          historyState.isPasswordModalOpen !== activeState.isPasswordModalOpen;

        if (isDifferent) {
          window.history.pushState({ ...activeState, index: (historyState.index || 1) + 1 }, '');
        }
      }
    }
  }, [
    view,
    loginStep,
    isDataModalOpen,
    isCodesModalOpen,
    isUserFilterModalOpen,
    isAppIssuesModalOpen,
    isCaseStudyModalOpen,
    isTrainingCoursesModalOpen,
    isComprehensiveIndicatorsOpen,
    isPasswordModalOpen,
  ]);

  const { recordUsage } = useQuickAccess(currentUser?.id);

  const isAdminOrFull = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

  const isSuperSupervisor = !!currentUser && (
    (currentUser.name && (
      currentUser.name.includes("المشرف العام") ||
      currentUser.name.includes("نائب المشرف العام")
    )) ||
    (currentUser.jobTitle && (
      currentUser.jobTitle.includes("المشرف العام") ||
      currentUser.jobTitle.includes("نائب المشرف العام")
    )) ||
    currentUser.role === 'admin' ||
    currentUser.permissions?.all === true
  );

  const handleOpenCodesModal = () => {
    setIsPasswordModalOpen(true);
  };

  const validateSpecialCodesPassword = (password: string): boolean => {
    return password === '2#3#2*4*a';
  };

  // Helper to handle navigation so both Layout and Quick Access buttons trigger the modal
  const handleNavigation = (v: string) => {
    if (v) recordUsage(v);

    if (v === 'issuesModal') {
      setIsAppIssuesModalOpen(true);
    } else if (v === 'caseStudyModal') {
      setIsCaseStudyModalOpen(true);
    } else if (v === 'trainingCoursesModal') {
      setIsTrainingCoursesModalOpen(true);
    } else if (v === 'comprehensiveIndicatorsModal') {
      setIsComprehensiveIndicatorsOpen(true);
    } else if (v === 'codesModal') {
      handleOpenCodesModal();
    } else if (v === 'dataModal') {
      setIsDataModalOpen(true);
    } else {
      setView(v);
    }
  };

  const filteredUsersForModal = useMemo(() => {
    const userSchools = currentUser?.selectedSchool?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const managedIds = currentUser?.permissions?.managedUserIds || [];

    // Check if the user is a manager or admin
    const isManager = currentUser?.permissions?.userManagement === true || managedIds.length > 0;

    return data.users.filter(u => {
      // 1. If explicit list exists, honor it exclusively (+ self)
      if (managedIds.length > 0) {
        if (u.id === currentUser?.id) return true;
        return managedIds.includes(u.id);
      }

      // If we reach here, no managedIds list exists.

      // 2. Hide admins/full-perm from non-admins
      const isTargetAdmin = u.role === 'admin' || u.permissions?.all === true;
      if (!isAdminOrFull && isTargetAdmin) return false;

      // 3. Fallback for super-admins or non-restricted managers
      if (isAdminOrFull) return true;

      if (isManager) {
        // If they have manager permission but no specific list, they see the whole school/branch
        return u.schools.some(s => {
          if (!userSchools.includes(s)) return false;

          // Branch verification
          const managerBranches = currentUser?.permissions?.schoolsAndBranches?.[s] || [];
          if (managerBranches.length > 0) {
            const targetBranches = u.permissions?.schoolsAndBranches?.[s] || [];
            if (targetBranches.length === 0) return false; // Target has no branch but manager has specific branches
            return managerBranches.some(b => targetBranches.includes(b));
          }
          return true;
        });
      }

      return u.id === currentUser?.id;
    });
  }, [data.users, currentUser, isAdminOrFull]);

  // Build a label that clearly describes the current filter state
  const filterLabel = React.useMemo(() => {
    let label = 'خيارات التصفية';
    if (globalDataFilters) {
      const allEmpty = !globalDataFilters.schools.length && !globalDataFilters.branches.length && !globalDataFilters.grades.length && !globalDataFilters.sections.length;
      if (allEmpty) label = 'تصفية كل المستخدمين';
      else {
        const parts = [];
        if (globalDataFilters.schools.length) parts.push(`المعاهد: ${globalDataFilters.schools.length}`);
        if (globalDataFilters.branches.length) parts.push(`الفروع: ${globalDataFilters.branches.length}`);
        if (globalDataFilters.grades.length) parts.push(`الصفوف: ${globalDataFilters.grades.length}`);
        if (globalDataFilters.sections.length) parts.push(`الشعب: ${globalDataFilters.sections.length}`);
        label = parts.length > 0 ? parts.join(' - ') : label;
      }
    }

    const { from, to } = dateRange;
    if (from || to) {
      const dateLabel = from && to ? `${from} ← ${to}` : from ? `من ${from}` : `إلى ${to}`;
      return `${label} | ${dateLabel}`;
    }
    return label;
  }, [globalDataFilters, dateRange]);

  const hasActiveFilter = dateRange.from !== '' || dateRange.to !== '' || (globalDataFilters && (globalDataFilters.schools.length > 0 || globalDataFilters.branches.length > 0 || globalDataFilters.grades.length > 0 || globalDataFilters.sections.length > 0));

  const schoolsToDisplay = useMemo(() => {
    if (isAdminOrFull) return (data.availableSchools || []).filter(Boolean);
    return (currentUser?.selectedSchool?.split(',') || []).map(s => s.trim()).filter(Boolean);
  }, [data.availableSchools, currentUser, isAdminOrFull]);

  if (!isAuthenticated) return <AdvancedLoginPage step={loginStep} setStep={setLoginStep} />;

  const renderView = () => {
    let Content;
    if (view.startsWith('specialReports-')) {
      const subTab = view.split('-')[1];
      Content = <SpecialReportsPage initialSubTab={subTab} onNavigate={handleNavigation} />;
    } else if (view.startsWith('educationalSupervision-')) {
      const subTab = view.split('-')[1];
      Content = <EducationalSupervisionPage initialTab={subTab} />;
    } else {
      switch (view) {
        case 'intro': Content = <IntroPage onEnter={() => setView('dashboard')} onAbout={() => setView('about')} onNavigate={handleNavigation} />; break;
        case 'about': Content = <AboutProgramPage onBack={() => setView('intro')} />; break;
        case 'dashboard': Content = <Dashboard setView={handleNavigation} />; break;
        case 'substitute': Content = <SubstitutionPage />; break;
        case 'daily': Content = <DailyReportsPage />; break;
        case 'educationalSupervision': Content = <EducationalSupervisionPage />; break;
        case 'adminReports': Content = <StaffFollowUpPage />; break;
        case 'violations': Content = <ViolationsPage />; break;
        case 'studentReports': Content = <StudentsReportsPage />; break;
        case 'teacherPortal': Content = <TeacherPortalPage />; break;
        case 'specialReports': Content = <SpecialReportsPage onNavigate={handleNavigation} />; break;
        case 'profile': Content = <ProfilePage />; break;
        case 'secretariat': Content = <SecretariatView />; break;
        case 'transport': Content = <TransportPage />; break;
        case 'communicationDev': Content = <CommunicationDevPage />; break;
        case 'comprehensiveReports': Content = <ComprehensiveReportsPage />; break;
        case 'finance': Content = <FinancePage />; break;
        case 'schoolActivities': Content = <SchoolActivitiesPage onBack={() => setView('dashboard')} />; break;
        default: Content = <Dashboard setView={handleNavigation} />; break;
      }
    }

    return (
      <Suspense fallback={<SkeletonLoader />}>
        {Content}
      </Suspense>
    );
  };

  const managedIds = currentUser?.permissions?.managedUserIds || [];
  const isManager = currentUser?.permissions?.userManagement === true || managedIds.length > 0;
  const isGeneralSupervisor = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;

  const checkPerm = (permValue: boolean | string[] | undefined, legacySubPerm?: string): boolean => {
    if (isGeneralSupervisor) return true;
    if (permValue === undefined) return false;
    if (permValue === true) return true;
    if (permValue === false) return false;
    if (Array.isArray(permValue)) {
      if (permValue.length === 0) return false;
      if (permValue.includes('view') || permValue.includes('showButton')) return true;
      if (legacySubPerm && permValue.includes(legacySubPerm)) return true;
      return false;
    }
    return false;
  };

  const canUseCaseStudy = isGeneralSupervisor || isManager || checkPerm(currentUser?.permissions?.caseStudyModal);
  const canUseComprehensiveIndicators = checkPerm(currentUser?.permissions?.comprehensiveIndicators, 'showButton');

  return (
    <Layout onNavigate={handleNavigation} onOpenSettings={() => setIsDataModalOpen(true)} onLogout={() => setIsLogoutConfirmOpen(true)}>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 relative">
            <UserIcon size={32} />
            {syncStatus === 'offline' ? (
              <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center border-2 border-white" title="يعمل بدون اتصال">
                <WifiOff size={10} />
              </span>
            ) : (syncStatus === 'connecting' || syncStatus === 'syncing') ? (
              <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white animate-pulse" title="جاري الاتصال...">
                <Wifi size={10} />
              </span>
            ) : (
              <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white" title="متصل بالشبكة">
                <Wifi size={10} />
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800"> مرحباً، {currentUser?.name} </h2>
              
              {/* Sync Status Badges */}
              {syncStatus === 'offline' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-black text-xs">
                  <WifiOff size={12} />
                  <span>بدون اتصال {pendingSyncCount > 0 && `(${pendingSyncCount} معلقة)`}</span>
                </span>
              )}
              {(syncStatus === 'connecting' || syncStatus === 'syncing') && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-black text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>جاري الاتصال بالنت</span>
                  <span className="inline-flex gap-0.5 items-center mr-0.5" dir="ltr">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot3" />
                  </span>
                  {pendingSyncCount > 0 && (
                    <span className="text-[10px] text-blue-500 font-bold mr-1">({pendingSyncCount})</span>
                  )}
                </span>
              )}
              {syncStatus === 'pending' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full font-black text-xs">
                  <span>بانتظار الشبكة ({pendingSyncCount})</span>
                </span>
              )}
              {syncStatus === 'synced' && pendingSyncCount === 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-xs">
                  <Check size={12} />
                  <span>متصل ومزامن</span>
                </span>
              )}
            </div>
            {currentUser?.jobTitle && (
              <p className="text-slate-500 text-sm font-semibold">{currentUser.jobTitle}</p>
            )}
            <p className="text-blue-600 text-sm font-bold">
              {currentUser?.selectedSchool}
              {currentUser?.selectedBranch && currentUser?.selectedBranch !== 'all' && ` - ${currentUser.selectedBranch}`}
            </p>
            <p className="text-slate-400 text-xs font-medium">العام الدراسي: {localStorage.getItem('selected_year') || currentUser?.selectedYear || data.profile?.year || '2024-2025'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <QuickAccess userId={currentUser?.id} onAction={handleNavigation} />
          <button
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 border-2 border-red-100 rounded-[1.2rem] text-red-600 font-black text-sm hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            <LogOut size={18} /> تسجيل الخروج
          </button>

          {view !== 'intro' && (
            <>
              {/* User + Date Filter Button */}
              {(currentUser?.role === 'admin' || currentUser?.permissions?.all || currentUser?.permissions?.userManagement) && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsUserFilterModalOpen(true)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-[1.2rem] font-black text-sm shadow-sm transition-all border-2 ${hasActiveFilter
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:shadow-md'
                      }`}
                  >
                    <Users size={18} className={hasActiveFilter ? 'text-white' : 'text-blue-600'} />
                    <span className="max-w-[180px] truncate">{filterLabel}</span>
                  </button>
                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setUserFilter('all');
                        setDateRange({ from: '', to: '' });
                      }}
                      title="مسح الفلترة"
                      className="p-2 bg-red-50 border-2 border-red-100 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {canUseComprehensiveIndicators && (
                <button
                  onClick={() => setIsComprehensiveIndicatorsOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-emerald-100 rounded-[1.2rem] text-emerald-700 font-black text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md transition-all whitespace-nowrap"
                >
                  <BarChart className="text-emerald-600" size={18} /> مؤشرات الأداء الشاملة
                </button>
              )}

              {isSuperSupervisor && (
                <button
                  onClick={handleOpenCodesModal}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm hover:border-blue-200 hover:shadow-md transition-all whitespace-nowrap"
                >
                  <Key className="text-blue-600" size={18} /> التحكم بالصلاحيات
                </button>
              )}

              {(currentUser?.role === 'admin' || currentUser?.permissions?.all) && (
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-[1.2rem] text-slate-600 font-black text-sm hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <Database className="text-blue-600" size={18} /> إدارة البيانات
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {renderView()}
      </div>

      <DataManagementModal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} />
      <AccessCodesModal
        isOpen={isCodesModalOpen}
        onClose={() => {
          setIsCodesModalOpen(false);
          setSpecialCodesPassword(''); // Reset on close
        }}
        enteredPassword={specialCodesPassword}
      />

      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Key size={24} />
                  إدخال الرقم السري
                </h2>
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setSpecialCodesPassword('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-600 font-bold text-sm text-center">
                  الرجاء إدخال الرقم السري للوصول إلى إدارة الصلاحيات
                </p>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  value={specialCodesPassword}
                  onChange={(e) => setSpecialCodesPassword(e.target.value)}
                  placeholder="الرقم السري"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (validateSpecialCodesPassword(specialCodesPassword)) {
                        setIsPasswordModalOpen(false);
                        setIsCodesModalOpen(true);
                      } else {
                        alert('الرقم السري غير صحيح');
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (validateSpecialCodesPassword(specialCodesPassword)) {
                      setIsPasswordModalOpen(false);
                      setIsCodesModalOpen(true);
                    } else {
                      alert('الرقم السري غير صحيح');
                    }
                  }}
                  className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors"
                >
                  دخول
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GlobalDataFilterModal
        isOpen={isUserFilterModalOpen}
        onClose={() => setIsUserFilterModalOpen(false)}
        schools={schoolsToDisplay}
        globalDataFilters={globalDataFilters}
        dateRange={dateRange}
        data={data}
        onApply={(filters, range) => {
          setDateRange(range);
          setGlobalDataFilters(filters);
        }}
      />

      <IssuesAndSolutionsModal
        isOpen={isAppIssuesModalOpen}
        onClose={() => setIsAppIssuesModalOpen(false)}
      />
      <CaseStudyModal
        isOpen={isCaseStudyModalOpen}
        onClose={() => setIsCaseStudyModalOpen(false)}
      />
      <TrainingCoursesModal
        isOpen={isTrainingCoursesModalOpen}
        onClose={() => setIsTrainingCoursesModalOpen(false)}
      />
      <ComprehensiveIndicatorsModal
        isOpen={isComprehensiveIndicatorsOpen}
        onClose={() => setIsComprehensiveIndicatorsOpen(false)}
      />

      <AnimatePresence>
        {isExitConfirmOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border-4 border-red-50 text-center"
            >
              <div className="p-6 bg-red-50 text-red-600 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-md animate-bounce">
                  <AlertTriangle size={36} />
                </div>
                <h3 className="text-xl font-black mt-2">تأكيد الخروج</h3>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-slate-600 font-bold text-base leading-relaxed">
                  هل أنت متأكد من رغبتك في الخروج من البرنامج وإغلاق الصفحة؟
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsExitConfirmOpen(false);
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      allowExit.current = true;
                      window.history.go(-2);
                    }}
                    className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all text-sm cursor-pointer"
                  >
                    نعم، خروج
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border-4 border-red-50 text-center"
            >
              <div className="p-6 bg-red-50 text-red-600 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-md">
                  <LogOut size={36} />
                </div>
                <h3 className="text-xl font-black mt-2">تأكيد تسجيل الخروج</h3>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-slate-600 font-bold text-base leading-relaxed">
                  هل أنت متأكد من رغبتك في تسجيل الخروج والعودة إلى شاشة تسجيل الدخول؟
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsLogoutConfirmOpen(false);
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={async () => {
                      setIsLogoutConfirmOpen(false);
                      setIsExitConfirmOpen(false);
                      setLoginStep('credentials');
                      setView('intro');
                      await logout();
                    }}
                    className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all text-sm cursor-pointer"
                  >
                    نعم، خروج
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSyncOverlay && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
                    <RefreshCw size={24} className="animate-spin" style={{ animationDuration: '4s' }} />
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-800">جاري تحديث ومزامنة النظام</h3>
                <p className="text-slate-600 font-bold text-base leading-relaxed">
                  الرجاء الانتظار قليلاً حتى يتم مزامنة النظام...
                </p>
                <p className="text-slate-400 text-sm font-semibold">
                  يتم الآن رفع العمليات المعلقة وتثبيت أحدث نسخة من النظام بأمان.
                </p>
              </div>

              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse w-4/5" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full font-black text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>متبقي {pendingSyncCount} عملية معلقة</span>
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};


const GlobalDataFilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  schools: string[];
  globalDataFilters: { schools: string[], branches: string[], grades: string[], sections: string[] };
  dateRange: { from: string; to: string };
  onApply: (filters: { schools: string[], branches: string[], grades: string[], sections: string[] }, range: { from: string; to: string }) => void;
  data: any;
}> = ({ isOpen, onClose, schools, globalDataFilters, dateRange, onApply, data }) => {
  const [tempFilters, setTempFilters] = React.useState(globalDataFilters);
  const [tempRange, setTempRange] = React.useState(dateRange);

  React.useEffect(() => {
    if (isOpen) {
      setTempFilters(globalDataFilters);
      setTempRange(dateRange);
    }
  }, [isOpen, globalDataFilters, dateRange]);

  if (!isOpen) return null;

  const validGrades = ['تمهيدي', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const validSections = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'];

  // Extract all unique branches 
  const availableBranches = new Set<string>();
  if (data?.secretariatStudents) {
    data.secretariatStudents.forEach((s: any) => { if (s.branch) availableBranches.add(String(s.branch).trim()); });
  }
  if (data?.secretariatStaff) {
    data.secretariatStaff.forEach((s: any) => { if (s.branch) availableBranches.add(String(s.branch).trim()); });
  }
  const branchList = Array.from(availableBranches).map(b => b.trim()).filter(Boolean);
  if (branchList.length === 0) branchList.push('بدون فرع مخصص');

  const toggleArrayItem = (key: keyof typeof tempFilters, val: string) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(v => v !== val) : [...prev[key], val]
    }));
  };

  const selectAll = () => {
    setTempFilters({ schools: [...schools], branches: [...branchList], grades: [...validGrades], sections: [...validSections] });
  };
  const selectNone = () => {
    setTempFilters({ schools: [], branches: [], grades: [], sections: [] });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden border-4 border-blue-50 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800">تصفية البيانات (شؤون الطلاب ومعلمين)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          <div className="bg-blue-50/50 p-5 rounded-3xl border-2 border-blue-100/50 space-y-4">
            <h3 className="font-black text-blue-800 flex items-center gap-2"><Calendar size={18} /> الفترة الزمنية</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 pr-2">من تاريخ</label>
                <input type="date" value={tempRange.from} onChange={(e) => setTempRange(prev => ({ ...prev, from: e.target.value }))} className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-400" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 pr-2">إلى تاريخ</label>
                <input type="date" value={tempRange.to} onChange={(e) => setTempRange(prev => ({ ...prev, to: e.target.value }))} className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-slate-700 focus:border-blue-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={selectAll} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all">تحديد الكل</button>
            <button onClick={selectNone} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-all">إلغاء التحديد</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">المدارس</h4>
              <div className="flex flex-wrap gap-2">
                {schools.map((s: string, idx) => (
                  <button key={`filter-school-${s}-${idx}`} onClick={() => toggleArrayItem('schools', s)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.schools.includes(s) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">الفروع</h4>
              <div className="flex flex-wrap gap-2">
                {branchList.map((b, idx) => (
                  <button key={`filter-branch-${b}-${idx}`} onClick={() => toggleArrayItem('branches', b)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.branches.includes(b) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">الصفوف</h4>
              <div className="flex flex-wrap gap-2">
                {validGrades.map((g, idx) => (
                  <button key={`filter-grade-${g}-${idx}`} onClick={() => toggleArrayItem('grades', g)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.grades.includes(g) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 border-b pb-2">الشعب</h4>
              <div className="flex flex-wrap gap-2">
                {validSections.map((s, idx) => (
                  <button key={`filter-section-${s}-${idx}`} onClick={() => toggleArrayItem('sections', s)} className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (tempFilters.sections.includes(s) ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all">إلغاء</button>
          <button onClick={() => { onApply(tempFilters, tempRange); onClose(); }} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">تطبيق التصفية</button>
        </div>
      </motion.div>
    </div>
  );
};

const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Check standalone mode (already installed/running standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 2. Check if dismissed before
    const isDismissed = localStorage.getItem('pwa_install_dismissed');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-[92%] max-w-sm bg-[#0f172a]/95 border border-slate-800/80 backdrop-blur-xl rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 text-right dir-rtl select-none"
      >
        <div className="flex items-center gap-4">
          <img 
            src="/icon-192.png" 
            alt="رفيقك" 
            className="w-14 h-14 rounded-2xl border border-slate-800/60 shadow-lg shadow-blue-900/10 object-cover flex-shrink-0"
          />
          <div className="flex flex-col gap-1">
            <h3 className="text-white font-black text-base">ثبّت تطبيق رفيقك</h3>
            <p className="text-slate-400 text-[11px] font-bold leading-relaxed">
              أضف التطبيق لشاشتك الرئيسية للوصول السريع لمتابعة الأدبيات والتقارير المدرسية في أي وقت.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDismiss}
            className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer text-center"
          >
            تخطي
          </button>
          <button 
            onClick={handleInstall}
            className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-blue-500/20 cursor-pointer text-center"
          >
            تثبيت الآن
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <GlobalProvider>
      <Toaster position="top-center" richColors />
      <MainApp />
      <GlobalScrollArrows />
      <PwaInstallPrompt />
    </GlobalProvider>
  </ErrorBoundary>
);
export default App;