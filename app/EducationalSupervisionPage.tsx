import React, { useState, useEffect, useMemo } from 'react';
import { useGlobal } from '../context/GlobalState';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, PenTool, BarChart3, ClipboardList, 
  ChevronDown, ArrowRight, FileText, BookOpen, UserCircle, ListChecks, Trash2, Share2, Download, Search, Filter, RefreshCw
} from 'lucide-react';
import { formatEvaluationToWhatsApp, matchSubjects, isSameSchool, normalizeSchoolName } from './evaluationUtils';
import {
  normalizeArabicText,
  normalizeBranch,
  hasIntersection,
  isEntityVisibleToSupervisor,
} from '../src/lib/NormalizationEngine';
import { ShortEvaluationForm } from './ShortEvaluationForm';
import { ExtEvaluationForm } from './ExtEvaluationForm';
import FinalReportsPage from './FinalReportsPage';
import PeerVisitsPage from './PeerVisitsPage';
import { TeacherEvaluation } from '../types';
import VisitsSummaryPage from './VisitsSummaryPage';
import EducationalPerformanceIndicatorsPage from './EducationalPerformanceIndicatorsPage';
import { DeliveryReceiptView } from '../components/DeliveryReceiptView';

export default function EducationalSupervisionPage({ initialTab = '' }: { initialTab?: string }) {
  const { data, currentUser, updateData, shareViaWhatsApp } = useGlobal();
  
  const [activeTab, setActiveTab] = useState<string>(initialTab); // '', 'teachers', 'tools', 'reports', 'summary'
  const [activeDropdown, setActiveDropdown] = useState<string>('');

  // Form State for Teachers Management
  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.permissions?.all === true;
  const availableSchools = isSuperAdmin 
    ? data.availableSchools || [] 
    : (currentUser?.schools || []);

  const [selectedSchool, setSelectedSchool] = useState<string>(
    currentUser?.selectedSchool?.split(',').map(s => s.trim()).filter(s => s !== "all")[0] || availableSchools[0] || ''
  );
  
  const allBranchesForSchool = data.schoolBranches?.[selectedSchool];
  const derivedBranches = Array.isArray(allBranchesForSchool) && allBranchesForSchool.length > 0 
    ? allBranchesForSchool 
    : ['بنين', 'بنات'];
    
  const schoolBranches = isSuperAdmin 
    ? derivedBranches
    : (currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || []);

  const [selectedBranch, setSelectedBranch] = useState<string>(schoolBranches[0] || '');
  
  const [semester, setSemester] = useState<string>('الفصل الأول');
  
  const [showTeachersList, setShowTeachersList] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [activeTeacherView, setActiveTeacherView] = useState<string>(''); // 'new_visit' or 'archive'
  const [isFormDirty, setIsFormDirty] = useState(false);

  const [editingEvaluation, setEditingEvaluation] = useState<TeacherEvaluation | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx');
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          alert('ملف الإكسل المستورد غير صالح.');
          return;
        }

        // تحويل ورقة العمل إلى مصفوفة صفوف ثنائية الأبعاد
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (rows.length < 10) {
          alert('بنية ملف الإكسل غير صالحة للتقييم.');
          return;
        }

        // استخراج البيانات الأساسية من الخلايا الثابتة
        const teacherName = (rows[2]?.[1] || '').toString().trim();
        const evaluatorName = (rows[2]?.[3] || '').toString().trim();
        
        const subjectFull = (rows[3]?.[1] || '').toString().trim();
        let subject = subjectFull;
        let subSubject = '';
        if (subjectFull.includes(' - ')) {
          const parts = subjectFull.split(' - ');
          subject = parts[0];
          subSubject = parts[1];
        }

        const visitType = (rows[3]?.[3] || '').toString().trim();
        const grade = (rows[4]?.[1] || '').toString().trim();
        const section = (rows[4]?.[3] || '').toString().trim();
        const period = (rows[4]?.[5] || '').toString().trim();
        const lessonName = (rows[5]?.[1] || '').toString().trim();
        const date = (rows[5]?.[3] || '').toString().trim();
        const semester = (rows[6]?.[1] || '').toString().trim();
        const academicYear = (rows[6]?.[3] || '').toString().trim();

        // البحث عن المعلم في قاعدة البيانات لمطابقة الـ ID
        const matchedTeacher = (data.secretariatStaff || []).find(
          s => s.name === teacherName && s.school === selectedSchool
        );

        if (!matchedTeacher) {
          alert(`خطأ: لم يتم العثور على معلم باسم "${teacherName}" في مدرسة "${selectedSchool}". يرجى التأكد من تطابق اسم المعلم أولاً.`);
          return;
        }

        // تحديد نوع التقييم من اسم الورقة
        let evaluationType: 'short' | 'ext' | 'subject' = 'short';
        if (sheetName.includes('موسع')) {
          evaluationType = 'ext';
        } else if (sheetName.includes('مادة')) {
          evaluationType = 'subject';
        }

        // قراءة الدرجات من جدول التقييم (يبدأ من الصف 10)
        const scores: Record<string, number> = {};
        let rowIndex = 9; // 0-indexed row index 9 = Row 10
        while (rowIndex < rows.length) {
          const row = rows[rowIndex];
          if (!row || row.length === 0) {
            rowIndex++;
            continue;
          }
          
          const label = (row[1] || '').toString().trim();
          const firstVal = (row[0] || '').toString().trim();
          
          // التوقف عند الوصول لصفوف المجموع الإحصائي أو النسبة النهائية
          if (label === 'النسبة المئوية النهائية' || firstVal === 'النسبة المئوية النهائية' || 
              label === 'المجموع' || firstVal === 'المجموع') {
            break;
          }

          const criterion = (row[2] || '').toString().trim();
          const scoreVal = row[3];
          
          if (criterion && scoreVal !== undefined && scoreVal !== '') {
            const scoreNum = Number(scoreVal);
            if (!isNaN(scoreNum)) {
              scores[criterion] = scoreNum;
            }
          }
          rowIndex++;
        }

        // قراءة الاستراتيجيات والملاحظات الإضافية بعد جدول الدرجات
        let strategies = '';
        let tools = '';
        let sources = '';
        let programs = '';
        let strengths = '';
        let improvements = '';
        let recommendations = '';
        let employeeComment = '';

        while (rowIndex < rows.length) {
          const row = rows[rowIndex];
          if (row && row.length > 1) {
            const key = (row[0] || '').toString().trim();
            const val = (row[1] || '').toString().trim();
            if (key === 'أهم الاستراتيجيات') strategies = val;
            else if (key === 'أهم الوسائل') tools = val;
            else if (key === 'أهم المصادر') sources = val;
            else if (key === 'البرامج المنفذة') programs = val;
            else if (key === 'الإيجابيات') strengths = val;
            else if (key === 'الملاحظات للتحسين') improvements = val;
            else if (key === 'التوصيات') recommendations = val;
            else if (key === 'تعليق الموظف') employeeComment = val;
          }
          rowIndex++;
        }

        // بناء كائن التقييم المستورد بالكامل
        const importedEvaluation: TeacherEvaluation = {
          id: Date.now().toString(), // سيتم استبداله بمعرّف التقرير السابق إن وُجد عند الحفظ
          teacherId: matchedTeacher.id,
          teacherName: matchedTeacher.name,
          school: selectedSchool,
          branch: matchedTeacher.branch || selectedBranch || 'بنين',
          semester: semester || 'الفصل الأول',
          academicYear: academicYear || '2024-2025',
          date: date || new Date().toISOString().split('T')[0],
          evaluatorId: currentUser?.id || '',
          evaluatorName: evaluatorName || currentUser?.name || '',
          evaluationType: evaluationType,
          visitType: visitType || 'استطلاعية',
          subject: subject,
          subSubject: subSubject,
          className: grade && section ? `${grade} - ${section}` : '',
          period: period,
          lessonName: lessonName,
          scores: scores,
          totalScore: Object.values(scores).reduce((sum, s) => sum + s, 0),
          percentage: 0, // ستحسبه الاستمارة تلقائياً
          strengths: strengths,
          improvements: improvements,
          recommendations: recommendations,
          notes: '',
          employeeComment: employeeComment,
          customOptions: {
            strategies: strategies.split('\n').filter(Boolean),
            tools: tools.split('\n').filter(Boolean),
            sources: sources.split('\n').filter(Boolean),
            programs: programs.split('\n').filter(Boolean)
          }
        };

        // تعبئة البيانات في النموذج المقابل
        setSelectedSchool(importedEvaluation.school);
        setSelectedBranch(importedEvaluation.branch);
        setSelectedTeacherId(importedEvaluation.teacherId);
        setEditingEvaluation(importedEvaluation);

        if (evaluationType === 'ext') {
          setActiveTeacherView('new_visit_ext');
        } else if (evaluationType === 'subject') {
          setActiveTeacherView('new_visit_sub');
        } else {
          setActiveTeacherView('new_visit_short');
        }

        alert('تم استيراد بيانات تقييم الإكسل بنجاح! يمكنك الآن مراجعتها وحفظها.');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة أو معالجة ملف الإكسل. يرجى التأكد من اختيار الملف الصحيح.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!selectedSchool && availableSchools.length > 0) {
      setSelectedSchool(availableSchools[0]);
    }
  }, [availableSchools, selectedSchool]);

  const safeNavigate = (action: () => void) => {
    if (isFormDirty) {
      if (window.confirm("تحذير: يرجى حفظ العمل. هل تود الخروج من الصفحة بدون حفظ؟")) {
        setIsFormDirty(false);
        action();
      }
    } else {
      action();
    }
  };

  const handleOpenVisit = (ev: TeacherEvaluation) => {
    setSelectedSchool(ev.school);
    setSelectedBranch(ev.branch);
    setSelectedTeacherId(ev.teacherId);
    setEditingEvaluation(ev);
    if (ev.evaluationType === 'ext') {
      setActiveTeacherView('new_visit_ext');
    } else if (ev.evaluationType === 'subject') {
      setActiveTeacherView('new_visit_sub');
    } else {
      setActiveTeacherView('new_visit_short');
    }
    setActiveTab('teachers');
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (selectedSchool && schoolBranches.length > 0 && (selectedBranch === '' || !schoolBranches.includes(selectedBranch))) {
      setSelectedBranch(schoolBranches[0]);
    } else if (schoolBranches.length === 0) {
      setSelectedBranch('');
    }
  }, [selectedSchool, schoolBranches, selectedBranch]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = 'يوجد تغييرات غير محفوظة، يرجى حفظ العمل قبل الخروج.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown('');
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // فحص وتشخيص الزيارات الصفية في الذاكرة لتحديد أسباب الاستبعاد بدقة
  useEffect(() => {
    const allEvals = data.teacherEvaluations || [];
    console.group(`🔍 [DIAGNOSTIC] فحص زيارات الإشراف التربوي - إجمالي في الذاكرة: ${allEvals.length}`);
    console.log('المدرسة المحددة:', selectedSchool, 'الفرع المحدد:', selectedBranch, 'المعلم المحدد:', selectedTeacherId);
    console.log('صلاحيات المشرف الحالية:', {
      isSuperAdmin,
      role: currentUser?.role,
      schools: currentUser?.schools,
      subjects: currentUser?.subjects,
      grades: currentUser?.grades
    });

    const rejectionStats = {
      retained: 0,
      rejectedSchool: 0,
      rejectedBranch: 0,
      rejectedSubject: 0,
      rejectedGrade: 0,
      rejectedTeacher: 0
    };

    allEvals.forEach((ev: any, idx: number) => {
      if (!ev || !ev.school || !isSameSchool(ev.school, selectedSchool)) {
        rejectionStats.rejectedSchool++;
        console.warn(`[زيارة #${idx + 1}] استبعاد بسبب عدم تطابق المدرسة: "${ev?.school}" لا تطابق "${selectedSchool}"`, ev);
        return;
      }

      if (!isSuperAdmin) {
        const supervisorBranches = currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || [];
        if (supervisorBranches.length > 0 && ev.branch && !supervisorBranches.includes(ev.branch)) {
          rejectionStats.rejectedBranch++;
          console.warn(`[زيارة #${idx + 1}] استبعاد بسبب الفرع للمشرف المقيد: "${ev.branch}" ليس في`, supervisorBranches, ev);
          return;
        }

        const supervisorGrades = currentUser?.grades || [];
        if (supervisorGrades.length > 0 && ev.className && !supervisorGrades.some((g: string) => ev.className.includes(g))) {
          rejectionStats.rejectedGrade++;
          console.warn(`[زيارة #${idx + 1}] استبعاد بسبب الصف للمشرف المقيد: "${ev.className}" ليس في`, supervisorGrades, ev);
          return;
        }

        const supervisorSubjects = currentUser?.subjects || [];
        if (supervisorSubjects.length > 0 && ev.subject && !supervisorSubjects.some((sub: string) => matchSubjects(sub, ev.subject))) {
          rejectionStats.rejectedSubject++;
          console.warn(`[زيارة #${idx + 1}] استبعاد بسبب المادة للمشرف المقيد: "${ev.subject}" ليس في`, supervisorSubjects, ev);
          return;
        }
      }

      if (selectedTeacherId && selectedTeacherId !== 'ALL') {
        const isMatched = (selectedTeacher?.id && ev.teacherId === selectedTeacher.id) ||
                          (ev.teacherId === selectedTeacherId) ||
                          (selectedTeacher?.name && ev.teacherName && ev.teacherName.trim() === selectedTeacher.name.trim());
        if (!isMatched) {
          rejectionStats.rejectedTeacher++;
          return;
        }
      }

      rejectionStats.retained++;
    });

    console.log('📊 ملخص نتائج فحص الزيارات:', rejectionStats);
    console.groupEnd();
  }, [data.teacherEvaluations, selectedSchool, selectedBranch, selectedTeacherId, isSuperAdmin, currentUser]);

  const teachersList = React.useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    // 1. تصفية كادر المعلمين (secretariatStaff) عبر محرك التطبيع والعزل الصارم (NormalizationEngine)
    (data.secretariatStaff || []).forEach((s) => {
      if (!s || !s.school || !isSameSchool(s.school, selectedSchool)) return;
      if (selectedBranch && s.branch && !hasIntersection([s.branch], [selectedBranch], normalizeBranch)) return;

      // فحص ظهور المعلم للمشرف الحالي (استبعاد الإداريين + اشتراط المواد وتقاطع المدرسة والفرع والصف والمادة والشعبة)
      if (!isEntityVisibleToSupervisor(s, currentUser, 'secretariatStaff')) return;

      const item = {
        ...s,
        jobTitle: Array.isArray(s.jobTitles) ? s.jobTitles.join('، ') : (s.jobTitle || 'معلم مادة'),
      };
      if (item.id) seenIds.add(item.id);
      if (item.name) seenNames.add(normalizeArabicText(item.name));
      list.push(item);
    });

    // 2. إدراج المعلمين ذوي الزيارات السابقة المقيدين حصراً بالمدرسة النشطة وبنطاق صلاحيات المشرف عبر isEntityVisibleToSupervisor
    (data.teacherEvaluations || []).forEach((ev: any) => {
      if (!ev || !ev.school || !isSameSchool(ev.school, selectedSchool)) return;
      if (selectedBranch && ev.branch && !hasIntersection([ev.branch], [selectedBranch], normalizeBranch)) return;

      if (!isEntityVisibleToSupervisor(ev, currentUser, 'teacherEvaluations')) return;

      const tId = ev.teacherId || `teacher_${ev.teacherName || 'unknown'}`;
      const tName = ev.teacherName ? ev.teacherName.trim() : '';
      const normTName = normalizeArabicText(tName);
      if ((tId && seenIds.has(tId)) || (normTName && seenNames.has(normTName))) return;
      if (tId) seenIds.add(tId);
      if (normTName) seenNames.add(normTName);

      list.push({
        id: tId,
        name: tName || '—',
        school: selectedSchool,
        branch: ev.branch || selectedBranch,
        jobTitle: 'معلم مادة',
        subjects: ev.subject ? [ev.subject] : [],
      });
    });

    return list;
  }, [data.secretariatStaff, data.teacherEvaluations, selectedSchool, selectedBranch, isSuperAdmin, currentUser]);

  const selectedTeacher = React.useMemo(() => {
    if (!selectedTeacherId) return null;
    if (selectedTeacherId === 'ALL') {
      return { id: 'ALL', name: 'أرشيف جميع الزيارات الصفية للمدرسة', jobTitle: 'عام', school: selectedSchool };
    }
    const found = teachersList.find(t => t.id === selectedTeacherId || (t.name && t.name === selectedTeacherId));
    if (found) return found;
    const fromEval = (data.teacherEvaluations || []).find(e => 
      (e.teacherId === selectedTeacherId || e.teacherName === selectedTeacherId) &&
      e.school && isSameSchool(e.school, selectedSchool)
    );
    return {
      id: selectedTeacherId,
      name: fromEval?.teacherName || editingEvaluation?.teacherName || '—',
      jobTitle: 'معلم مادة',
      school: selectedSchool,
      branch: selectedBranch
    };
  }, [selectedTeacherId, teachersList, data.teacherEvaluations, editingEvaluation, selectedSchool, selectedBranch]);

  const mainButtons = [
    { id: 'teachers', label: 'إدارة المعلمين والتقارير', icon: <Users size={24} />, color: 'from-blue-600 to-blue-500' },
    { 
      id: 'tools', 
      label: 'الأدوات الإشرافية', 
      icon: <PenTool size={24} />, 
      color: 'from-violet-600 to-violet-500',
      dropdownItems: ['الزيارات التبادلية', 'كشوفات الاستلام والتسليم']
    },
    { 
      id: 'reports', 
      label: 'التقارير ومؤشرات الأداء', 
      icon: <BarChart3 size={24} />, 
      color: 'from-emerald-600 to-emerald-500',
      dropdownItems: ['التقارير الختامية', 'تقرير الزيارات التبادلية', 'تقرير كشوفات الاستلام والتسليم', 'مؤشرات الأداء التربوية']
    },
    { id: 'summary', label: 'خلاصة الزيارات', icon: <ClipboardList size={24} />, color: 'from-amber-500 to-amber-400' },
  ];

  const handleDropdownClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeDropdown === id) {
      setActiveDropdown('');
    } else {
      setActiveDropdown(id);
    }
  };

  const renderTeachersManagement = () => {
    if (selectedTeacherId && activeTeacherView) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => safeNavigate(() => {
              setActiveTeacherView('');
              setSelectedTeacherId('');
            })}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
          >
            <ArrowRight size={20} /> العودة لقائمة المعلمين
          </button>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <UserCircle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedTeacher?.name}</h3>
                <p className="text-sm font-semibold text-slate-500">{selectedTeacher?.jobTitle} - {selectedSchool}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFile} 
                accept=".xlsx" 
                className="hidden" 
              />
              <button 
                onClick={() => safeNavigate(() => setActiveTeacherView('new_visit_short'))}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'new_visit_short' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PenTool size={20} /> تقييم مختصر
              </button>
              <button 
                onClick={() => safeNavigate(() => setActiveTeacherView('new_visit_ext'))}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'new_visit_ext' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={20} /> تقييم موسع
              </button>
              <button 
                onClick={() => safeNavigate(() => setActiveTeacherView('new_visit_sub'))}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'new_visit_sub' 
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen size={20} /> تقييم مادة
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 hover:shadow-lg hover:shadow-emerald-100 border border-emerald-200"
              >
                <Download size={20} className="rotate-180" /> استيراد تقييم
              </button>
              <button 
                onClick={() => safeNavigate(() => setActiveTeacherView('archive'))}
                className={`flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTeacherView === 'archive' 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ListChecks size={20} /> أرشيف
              </button>
            </div>

            <div className="mt-8 bg-slate-50 rounded-xl">
              {activeTeacherView === 'new_visit_short' && (
                <ShortEvaluationForm 
                  teacher={selectedTeacher} 
                  school={selectedSchool} 
                  branch={selectedBranch} 
                  semester={semester} 
                  academicYear={localStorage.getItem('selected_year') || currentUser?.selectedYear || data.availableYears?.[0] || '2024-2025'} 
                  setIsFormDirty={setIsFormDirty}
                  existingEvaluation={editingEvaluation}
                  onClose={() => {
                    setIsFormDirty(false);
                    setEditingEvaluation(null);
                    setActiveTeacherView('archive');
                  }}
                />
              )}
              {activeTeacherView === 'archive' && (
                <TeacherArchiveView
                  evaluations={(data.teacherEvaluations || []).filter(e => {
                    if (!e || !e.school || !isSameSchool(e.school, selectedSchool)) return false;

                    // التحقق من صلاحيات المشرف المقيد عبر محرك العزل الصارم
                    if (!isEntityVisibleToSupervisor(e, currentUser, 'teacherEvaluations')) return false;

                    // وضع الأرشيف العام للمدرسة
                    if (selectedTeacherId === 'ALL') {
                      return true;
                    }

                    // وضع أرشيف المعلم المحدد (بالـ ID أو بالاسم بعد التطبيع)
                    if (selectedTeacher?.id && e.teacherId === selectedTeacher.id) return true;
                    if (selectedTeacherId && e.teacherId === selectedTeacherId) return true;
                    if (
                      selectedTeacher?.name &&
                      e.teacherName &&
                      normalizeArabicText(e.teacherName) === normalizeArabicText(selectedTeacher.name)
                    ) {
                      return true;
                    }
                    return false;
                  })}
                  onEdit={(ev) => {
                    setEditingEvaluation(ev);
                    if (ev.evaluationType === 'ext') setActiveTeacherView('new_visit_ext');
                    else if (ev.evaluationType === 'subject') setActiveTeacherView('new_visit_sub');
                    else setActiveTeacherView('new_visit_short');
                  }}
                  onDelete={(id) => {
                    if (window.confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
                      const prevEvals = data.teacherEvaluations || [];
                      updateData({ teacherEvaluations: prevEvals.filter(e => e.id !== id) });
                    }
                  }}
                />
              )}
              {activeTeacherView === 'new_visit_ext' && (
                <ExtEvaluationForm 
                  teacher={selectedTeacher} 
                  school={selectedSchool} 
                  branch={selectedBranch} 
                  semester={semester} 
                  academicYear={localStorage.getItem('selected_year') || currentUser?.selectedYear || data.availableYears?.[0] || '2024-2025'} 
                  setIsFormDirty={setIsFormDirty}
                  existingEvaluation={editingEvaluation}
                  onClose={() => {
                    setIsFormDirty(false);
                    setEditingEvaluation(null);
                    setActiveTeacherView('archive');
                  }}
                />
              )}
              {activeTeacherView === 'new_visit_sub' && (
                <ExtEvaluationForm 
                  teacher={selectedTeacher} 
                  school={selectedSchool} 
                  branch={selectedBranch} 
                  semester={semester} 
                  academicYear={localStorage.getItem('selected_year') || currentUser?.selectedYear || data.availableYears?.[0] || '2024-2025'} 
                  isSubjectEvaluation={true}
                  setIsFormDirty={setIsFormDirty}
                  existingEvaluation={editingEvaluation}
                  onClose={() => {
                    setIsFormDirty(false);
                    setEditingEvaluation(null);
                    setActiveTeacherView('archive');
                  }}
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
         <button 
            onClick={() => safeNavigate(() => setActiveTab(''))}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
          >
            <ArrowRight size={20} /> العودة للقائمة الرئيسية
          </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <Users className="text-blue-600" /> إدارة المعلمين والتقارير
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المدرسة</label>
              <select 
                value={selectedSchool}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSchool(val);
                  localStorage.setItem('selected_school', val);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
              >
                {availableSchools.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {schoolBranches.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">الفرع</label>
                <select 
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
                >
                  <option value="">كل الفروع</option>
                  {schoolBranches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">اسم المشرف التربوي</label>
              <input 
                type="text"
                readOnly
                value={currentUser?.name || ''}
                className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-3 outline-none font-semibold cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الفصل الدراسي</label>
              <select 
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
              >
                <option value="الفصل الأول">الفصل الأول</option>
                <option value="الفصل الثاني">الفصل الثاني</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">العام الدراسي</label>
              <input 
                type="text"
                readOnly
                value={localStorage.getItem('selected_year') || currentUser?.selectedYear || data.availableYears?.[0] || '2024-2025'}
                className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-3 outline-none font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2 mb-6 border-t border-slate-100 pt-6">
            <label className="text-sm font-bold text-slate-700">البحث عن اسم معلم</label>
            <div className="relative">
              <input 
                type="text"
                value={teacherSearchQuery}
                onChange={(e) => {
                  setTeacherSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                placeholder="اكتب اسم المعلم أو جزء منه للبحث..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors font-semibold"
              />
              {teacherSearchQuery && showSearchDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                  {teachersList.filter(t => t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())).length > 0 ? (
                    <div className="p-2 space-y-1">
                      {teachersList.filter(t => t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())).map(teacher => (
                        <button
                          key={teacher.id}
                          onClick={() => safeNavigate(() => {
                            setSelectedTeacherId(teacher.id);
                            setActiveTeacherView('new_visit_short');
                            setTeacherSearchQuery('');
                            setShowSearchDropdown(false);
                          })}
                          className="w-full text-right px-4 py-3 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-slate-700 flex items-center justify-between group"
                        >
                          <span>{teacher.name}</span>
                          <span className="text-xs text-slate-400 group-hover:text-blue-500 bg-slate-100 px-2 py-1 rounded-md">{teacher.jobTitle}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 font-semibold">
                      لا يوجد معلم مطابق للبحث
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => safeNavigate(() => {
                  setSelectedTeacherId('ALL');
                  setActiveTeacherView('archive');
                })}
                className="flex-1 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"
              >
                <ListChecks size={20} /> أرشيف جميع الزيارات الصفية للمدرسة
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowTeachersList(!showTeachersList)}
                className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 p-4 rounded-xl flex items-center justify-between font-bold transition-colors"
              >
                <span className="flex items-center gap-2"><BookOpen size={20}/> قائمة المعلمين</span>
                <ChevronDown size={20} className={`transform transition-transform ${showTeachersList ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showTeachersList && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden max-h-[300px] overflow-y-auto"
                  >
                    {teachersList.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {teachersList.map(teacher => (
                          <button
                            key={teacher.id}
                            onClick={() => safeNavigate(() => {
                              setSelectedTeacherId(teacher.id);
                              setActiveTeacherView('new_visit_short');
                              setShowTeachersList(false);
                            })}
                            className="w-full text-right px-4 py-3 hover:bg-slate-50 rounded-lg transition-colors font-semibold text-slate-700 flex items-center justify-between group"
                          >
                            <span>{teacher.name}</span>
                            <span className="text-xs text-slate-400 group-hover:text-blue-500 bg-slate-100 px-2 py-1 rounded-md">{teacher.jobTitle}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 font-semibold">
                        لا يوجد معلمين مطابقين للخيارات المحددة
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="font-arabic pb-20 fade-in min-h-[70vh]">
      {!activeTab ? (
        <div className="max-w-4xl mx-auto mt-10">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-100/50">
              <BookOpen size={40} />
            </div>
            <h1 className="text-4xl font-black text-slate-800">الإشراف التربوي</h1>
            <p className="text-slate-500 mt-2 font-semibold">أدوات إشرافية متكاملة لتقييم ومتابعة الكادر التعليمي</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {mainButtons.map((btn) => (
              <div key={btn.id} className="relative">
                <button
                  onClick={(e) => {
                    if (btn.dropdownItems) {
                      handleDropdownClick(e, btn.id);
                    } else {
                      safeNavigate(() => {
                        setActiveTab(btn.id);
                        setActiveDropdown('');
                      });
                    }
                  }}
                  className={`w-full group bg-gradient-to-br ${btn.color} p-6 border-b-4 border-black/20 rounded-2xl text-white shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-4 min-h-[160px]`}
                >
                  <div className="bg-white/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                    {btn.icon}
                  </div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {btn.label}
                    {btn.dropdownItems && <ChevronDown size={18} className={`transition-transform duration-300 ${activeDropdown === btn.id ? 'rotate-180' : ''}`} />}
                  </h3>
                </button>

                <AnimatePresence>
                  {btn.dropdownItems && activeDropdown === btn.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-20 w-full mt-3 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
                    >
                      {btn.dropdownItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown('');
                            safeNavigate(() => {
                              if (item === 'التقارير الختامية') setActiveTab('reports_final');
                              if (item === 'الزيارات التبادلية') setActiveTab('peer_visits');
                              if (item === 'مؤشرات الأداء التربوية') setActiveTab('perf_indicators');
                              if (item === 'كشوفات الاستلام والتسليم') setActiveTab('delivery_receipt');
                              if (item === 'تقرير كشوفات الاستلام والتسليم') setActiveTab('delivery_receipt_report');
                            });
                          }}
                          className="w-full text-right px-6 py-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 font-bold text-slate-700 transition-colors flex items-center justify-between group"
                        >
                          {item}
                          <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'teachers' ? (
        renderTeachersManagement()
      ) : activeTab === 'reports_final' ? (
        <FinalReportsPage 
          onBack={() => safeNavigate(() => setActiveTab(''))} 
          selectedSchool={selectedSchool}
        />
      ) : activeTab === 'peer_visits' ? (
        <PeerVisitsPage
          onBack={() => safeNavigate(() => setActiveTab(''))}
          selectedSchool={selectedSchool}
        />
      ) : activeTab === 'summary' ? (
        <VisitsSummaryPage
          onBack={() => safeNavigate(() => setActiveTab(''))}
          selectedSchool={selectedSchool}
          selectedBranch={selectedBranch}
          onOpenVisit={handleOpenVisit}
        />
      ) : activeTab === 'perf_indicators' ? (
        <EducationalPerformanceIndicatorsPage
          onBack={() => safeNavigate(() => setActiveTab(''))}
          selectedSchool={selectedSchool}
        />
      ) : activeTab === 'delivery_receipt' ? (
        <DeliveryReceiptView
          onClose={() => safeNavigate(() => setActiveTab(''))}
        />
      ) : activeTab === 'delivery_receipt_report' ? (
        <DeliveryReceiptView
          initialShowFilter={true}
          onClose={() => safeNavigate(() => setActiveTab(''))}
        />
      ) : (
        <div className="animate-in fade-in flex flex-col items-center justify-center h-[50vh] text-center">
            <button 
                onClick={() => safeNavigate(() => setActiveTab(''))}
                className="mb-8 flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors font-bold"
            >
                <ArrowRight size={20} /> العودة للقائمة الرئيسية
            </button>
            <div className="p-8 bg-amber-50 text-amber-700 rounded-2xl font-bold text-xl border border-amber-200">
                هذه الصفحة قيد التطوير حالياً
            </div>
        </div>
      )}
    </div>
  );
}

function TeacherArchiveView({ evaluations, onEdit, onDelete }: {
  evaluations: any[];
  onEdit: (ev: any) => void;
  onDelete: (id: string) => void;
}) {
  const { data, shareViaWhatsApp } = useGlobal();
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSemester, setArchiveSemester] = useState('all');
  const [archiveYear, setArchiveYear] = useState('all');

  // Extract unique academic years present in evaluations
  const availableArchiveYears = useMemo(() => {
    const years = new Set<string>();
    (evaluations || []).forEach(e => {
      if (e.academicYear) years.add(e.academicYear.trim());
    });
    (data.availableYears || []).forEach((y: string) => {
      if (y) years.add(y.trim());
    });
    return Array.from(years).filter(Boolean);
  }, [evaluations, data.availableYears]);

  // Filter evaluations by search, semester, and academic year
  const filteredEvaluations = useMemo(() => {
    return (evaluations || []).filter(ev => {
      if (!ev) return false;

      // Semester filter (defaults to all)
      if (archiveSemester !== 'all' && archiveSemester !== 'الكل') {
        const evSem = (ev.semester || '').trim();
        const filterSem = archiveSemester.trim();
        if (evSem !== filterSem && !evSem.includes(filterSem) && !filterSem.includes(evSem)) {
          return false;
        }
      }

      // Year filter (defaults to all)
      if (archiveYear !== 'all' && archiveYear !== 'الكل') {
        const evYear = (ev.academicYear || '').trim();
        const filterYear = archiveYear.trim();
        if (evYear !== filterYear) {
          return false;
        }
      }

      // Search query (teacher name, subject, subSubject, lessonName)
      if (archiveSearch.trim()) {
        const q = archiveSearch.trim().toLowerCase();
        const teacherName = (ev.teacherName || '').toLowerCase();
        const subject = (ev.subject || '').toLowerCase();
        const subSubject = (ev.subSubject || '').toLowerCase();
        const lesson = (ev.lessonName || '').toLowerCase();
        const evaluator = (ev.evaluatorName || '').toLowerCase();
        if (!teacherName.includes(q) && !subject.includes(q) && !subSubject.includes(q) && !lesson.includes(q) && !evaluator.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [evaluations, archiveSemester, archiveYear, archiveSearch]);

  const hasActiveFilters = archiveSearch.trim() !== '' || archiveSemester !== 'all' || archiveYear !== 'all';

  const resetFilters = () => {
    setArchiveSearch('');
    setArchiveSemester('all');
    setArchiveYear('all');
  };

  return (
    <div className="p-6 space-y-6">
      {/* شريط أدوات وفلاتر الأرشيف مع ضمان عرض كل السجلات افتراضياً */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالمعلم، المادة، الدرس، المشرف..."
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* فلتر الفصل الدراسي */}
            <select
              value={archiveSemester}
              onChange={(e) => setArchiveSemester(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="all">كل الفصول الدراسية</option>
              <option value="الفصل الأول">الفصل الأول</option>
              <option value="الفصل الثاني">الفصل الثاني</option>
              <option value="الفصل الثالث">الفصل الثالث</option>
            </select>

            {/* فلتر العام الدراسي */}
            <select
              value={archiveYear}
              onChange={(e) => setArchiveYear(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 font-bold text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
            >
              <option value="all">كل الأعوام الدراسية</option>
              {availableArchiveYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                title="إعادة تعيين الفلاتر"
              >
                <RefreshCw size={14} />
                إعادة ضبط
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-2 border-t border-slate-200/60">
          <span>
            عرض <strong className="text-blue-600">{filteredEvaluations.length}</strong> من أصل <strong className="text-slate-700">{evaluations.length}</strong> زيارة مسجلة
          </span>
          {evaluations.length > filteredEvaluations.length && (
            <span className="text-amber-600">
              يوجد {evaluations.length - filteredEvaluations.length} زيارات محجوبة بواسطة الفلترة الحالية
            </span>
          )}
        </div>
      </div>

      {/* قائمة التقارير المحفوظة */}
      {filteredEvaluations.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <div className="text-slate-400 font-bold text-lg">
            {evaluations.length === 0 
              ? 'لا توجد تقارير سابقة محفوظة في الأرشيف مطابقة لهذه المدرسة/المعلم.' 
              : 'لا توجد زيارات مطابقة لخيارات الفلترة الحالية.'}
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              إلغاء الفلاتر وإظهار كافة الزيارات ({evaluations.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvaluations.map(ev => (
            <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  <h4 className="text-xl font-bold text-slate-800">
                    {ev.evaluationType === 'ext' ? 'تقييم موسع' : ev.evaluationType === 'subject' ? 'تقييم المادة' : 'تقييم مختصر'}
                  </h4>
                  {ev.semester && (
                    <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                      {ev.semester}
                    </span>
                  )}
                  {ev.academicYear && (
                    <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                      {ev.academicYear}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-600">
                  <span>👤 المعلم: <strong>{ev.teacherName || '—'}</strong></span>
                  <span>📚 المادة: <strong>{ev.subSubject ? `${ev.subject || '—'} - ${ev.subSubject}` : (ev.subject || '—')}</strong></span>
                  <span>🏢 الفرع: {ev.branch || '—'}</span>
                  <span>📅 التاريخ: {ev.date || '—'}</span>
                  {ev.evaluatorName && <span>✍️ المشرف: {ev.evaluatorName}</span>}
                </div>
                {ev.lessonName && <div className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded inline-block">📖 الدرس: {ev.lessonName}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={() => {
                    const msg = formatEvaluationToWhatsApp(ev, data.customSupervisionCriteria || []);
                    shareViaWhatsApp(msg);
                  }}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3.5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 text-sm"
                  title="إرسال عبر الواتساب"
                >
                  <Share2 size={16} />
                  واتس
                </button>
                <button 
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(ev, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    const typeStr = ev.evaluationType === 'short' ? 'تقييم_مختصر' : ev.evaluationType === 'subject' ? 'تقييم_مادة' : 'تقييم_موسع';
                    link.download = `${typeStr}_${ev.teacherName || 'زيارة'}_${ev.date || 'تاريخ'}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3.5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 text-sm"
                  title="تصدير كملف JSON"
                >
                  <Download size={16} />
                  JSON
                </button>
                <button 
                  onClick={() => onEdit(ev)}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-sm"
                >
                  عرض وتعديل
                </button>
                <button 
                  onClick={() => onDelete(ev.id)}
                  className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-xl font-bold transition-colors"
                  title="حذف التقرير"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
