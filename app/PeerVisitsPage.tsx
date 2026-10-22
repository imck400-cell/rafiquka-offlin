import React, { useState, useEffect, useRef } from "react";
import { useGlobal } from "../context/GlobalState";
import { Plus, Trash2, ArrowRight, ChevronDown } from "lucide-react";
import { PeerVisit } from "../types";
import { motion } from "framer-motion";

interface PeerVisitsPageProps {
  onBack: () => void;
  selectedSchool: string;
}

export default function PeerVisitsPage({ onBack, selectedSchool }: PeerVisitsPageProps) {
  const { data, updateData, currentUser } = useGlobal();
  const [visits, setVisits] = useState<PeerVisit[]>([]);

  // Filter staff based on selected school and permissions
  const currentUserSchoolBranches = currentUser?.permissions?.all === true
    ? data.schoolBranches?.[selectedSchool] || []
    : currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || [];

  const currentUserGrades = currentUser?.permissions?.all === true 
    ? [] 
    : (currentUser?.customSchoolProfiles?.[selectedSchool]?.grades || currentUser?.grades || []);

  const staffList = (data.secretariatStaff || []).filter(s => {
    if (s.school !== selectedSchool) return false;
    
    const jobTitles = s.jobTitles || [];
    const isTeacher = jobTitles.includes('معلم مادة') || jobTitles.includes('مربية');
    if (!isTeacher) return false;

    const userBranch = s.branch || '';
    if (currentUser?.permissions?.all !== true && userBranch && userBranch !== 'all') {
      if (!currentUserSchoolBranches.includes(userBranch)) return false;
    }

    const userGrades = s.grades || [];
    if (currentUser?.permissions?.all !== true && currentUserGrades.length > 0) {
      const hasIntersection = userGrades.some((g: string) => currentUserGrades.includes(g));
      if (!hasIntersection) return false;
    }

    return true;
  });

  useEffect(() => {
    let appVisits = data.peerVisits || [];
    appVisits = appVisits.filter(v => v.school === selectedSchool);
    
    if (appVisits.length === 0) {
      // Add one empty visit if none exist
      appVisits = [{
        id: Date.now().toString(),
        school: selectedSchool,
        branch: currentUserSchoolBranches[0] || '',
        semester: '',
        academicYear: '',
        visitingTeacherNames: [],
        visitingSubject: '',
        visitingClass: '',
        visitedTeacherName: '',
        visitedSubject: '',
        visitedClass: '',
        status: 'pending'
      }];
    }
    setVisits(appVisits);
  }, [data.peerVisits, selectedSchool]);

  const saveVisits = (newVisits: PeerVisit[]) => {
    setVisits(newVisits);
    const otherVisits = (data.peerVisits || []).filter(v => v.school !== selectedSchool);
    updateData({ peerVisits: [...otherVisits, ...newVisits] });
  };

  const handleUpdateVisit = (id: string, updates: Partial<PeerVisit>) => {
    const isLastCard = visits[visits.length - 1].id === id;
    const isEditingEmptyCard = isLastCard && 
      (updates.visitingTeacherNames?.length || updates.visitedTeacherName || updates.visitingSubject || updates.visitedSubject);
    
    let newVisits = visits.map(v => v.id === id ? { ...v, ...updates } : v);

    if (isEditingEmptyCard) {
      newVisits.push({
        id: Date.now().toString(),
        school: selectedSchool,
        branch: currentUserSchoolBranches[0] || '',
        semester: '',
        academicYear: '',
        visitingTeacherNames: [],
        visitingSubject: '',
        visitingClass: '',
        visitedTeacherName: '',
        visitedSubject: '',
        visitedClass: '',
        status: 'pending'
      });
    }

    saveVisits(newVisits);
  };

  const handleAddVisit = () => {
    const newVisits = [...visits, {
      id: Date.now().toString(),
      school: selectedSchool,
      branch: currentUserSchoolBranches[0] || '',
      semester: '',
      academicYear: '',
      visitingTeacherNames: [],
      visitingSubject: '',
      visitingClass: '',
      visitedTeacherName: '',
      visitedSubject: '',
      visitedClass: '',
      status: 'pending' as const
    }];
    saveVisits(newVisits);
  };

  const handleDeleteVisit = (id: string) => {
    const newVisits = visits.filter(v => v.id !== id);
    if (newVisits.length === 0) {
      newVisits.push({
        id: Date.now().toString(),
        school: selectedSchool,
        branch: currentUserSchoolBranches[0] || '',
        semester: '',
        academicYear: '',
        visitingTeacherNames: [],
        visitingSubject: '',
        visitingClass: '',
        visitedTeacherName: '',
        visitedSubject: '',
        visitedClass: '',
        status: 'pending' as const
      });
    }
    saveVisits(newVisits);
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
      >
        <ArrowRight size={20} /> العودة للقائمة
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800">إدارة الزيارات التبادلية</h2>
        <button
          onClick={handleAddVisit}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
        >
          <Plus size={20} /> إضافة زيارة تبادلية
        </button>
      </div>

      <div className="space-y-6">
        {visits.map((visit, index) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            cardNumber={index + 1}
            staffList={staffList}
            onUpdate={(updates) => handleUpdateVisit(visit.id, updates)}
            onDelete={() => handleDeleteVisit(visit.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VisitCard({ 
  visit, 
  cardNumber, 
  staffList, 
  onUpdate, 
  onDelete 
}: { 
  visit: PeerVisit; 
  cardNumber: number;
  staffList: any[]; 
  onUpdate: (updates: Partial<PeerVisit>) => void; 
  onDelete: () => void; 
}) {
  const [visitingSearch, setVisitingSearch] = useState('');
  const [visitedSearch, setVisitedSearch] = useState('');
  
  const [showVisitingDrop, setShowVisitingDrop] = useState(false);
  const [showVisitedDrop, setShowVisitedDrop] = useState(false);

  // Status mapping
  const statusColors = {
    'pending': 'text-red-500 bg-red-50 border-red-200',
    'in_progress': 'text-orange-500 bg-orange-50 border-orange-200',
    'completed': 'text-green-500 bg-green-50 border-green-200'
  };
  
  const statusLabels = {
    'pending': 'لم تتم الزيارة',
    'in_progress': 'قيد التنفيذ',
    'completed': 'تمت الزيارة'
  };

  const getStaffMatch = (term: string) => {
    return staffList.filter(s => s.name.toLowerCase().includes(term.toLowerCase()));
  };

  const handleSelectVisiting = (staff: any) => {
    const current = visit.visitingTeacherNames || [];
    if (!current.includes(staff.name)) {
      onUpdate({ 
        visitingTeacherNames: [...current, staff.name],
        visitingClass: staff.grades?.join('، ') || visit.visitingClass,
        // Since subject is not strictly defined in StaffData, we let it be editable
      });
    }
    setVisitingSearch('');
    setShowVisitingDrop(false);
  };

  const handleRemoveVisiting = (name: string) => {
    onUpdate({
      visitingTeacherNames: (visit.visitingTeacherNames || []).filter(n => n !== name)
    });
  };

  const handleSelectVisited = (staff: any) => {
    onUpdate({ 
      visitedTeacherName: staff.name,
      visitedClass: staff.grades?.join('، ') || visit.visitedClass
    });
    setVisitedSearch('');
    setShowVisitedDrop(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="flex justify-between items-center bg-slate-50 p-4 border-b border-slate-200">
        <h3 className="font-bold text-slate-700">بطاقة زيارة تبادلية رقم ({cardNumber})</h3>
        <button 
          onClick={onDelete}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
        >
          <Trash2 size={16} /> حذف البطاقة
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        {/* Visiting Teacher(s) */}
        <div className="space-y-4 relative bg-blue-50/30 p-4 rounded-xl border border-blue-50">
          <h4 className="font-bold text-blue-700 border-b border-blue-100 pb-2">المعلم الزائر (يمكن اختيار أكثر من واحد)</h4>
          
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-slate-700">اسم المعلم الزائر</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(visit.visitingTeacherNames || []).map(name => (
                <div key={name} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold border border-blue-200">
                  {name}
                  <button onClick={() => handleRemoveVisiting(name)} className="text-blue-400 hover:text-blue-600">✕</button>
                </div>
              ))}
            </div>
            <input 
              type="text" 
              value={visitingSearch}
              onChange={(e) => {
                setVisitingSearch(e.target.value);
                setShowVisitingDrop(true);
                // Trigger an update to create new block if it's the last one
                if (e.target.value.length === 1 && visit.visitingTeacherNames.length === 0) {
                  onUpdate({}); 
                }
              }}
              onFocus={() => setShowVisitingDrop(true)}
              onBlur={() => setTimeout(() => setShowVisitingDrop(false), 200)}
              placeholder="ابحث عن معلم زائر..."
              className="w-full bg-white/80 backdrop-blur-sm border border-blue-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 shadow-sm"
            />
            {showVisitingDrop && getStaffMatch(visitingSearch).length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {getStaffMatch(visitingSearch).map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => handleSelectVisiting(s)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-slate-700 border-b border-slate-50 font-semibold"
                  >
                    {s.name} <span className="text-xs text-slate-400">({s.jobTitles?.join('، ')})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المادة</label>
            <input 
              type="text" 
              value={visit.visitingSubject || ''}
              onChange={(e) => onUpdate({ visitingSubject: e.target.value })}
              className="w-full bg-white/80 backdrop-blur-sm border border-blue-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الصف</label>
            <input 
              type="text" 
              value={visit.visitingClass || ''}
              onChange={(e) => onUpdate({ visitingClass: e.target.value })}
              className="w-full bg-white/80 backdrop-blur-sm border border-blue-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        {/* Visited Teacher */}
        <div className="space-y-4 relative bg-emerald-50/30 p-4 rounded-xl border border-emerald-50">
          <h4 className="font-bold text-emerald-700 border-b border-emerald-100 pb-2">المعلم المزور (اسم واحد فقط)</h4>
          
          <div className="space-y-2 relative">
            <label className="text-sm font-bold text-slate-700">اسم المعلم المزور</label>
            {visit.visitedTeacherName && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-bold border border-emerald-200 mb-2">
                {visit.visitedTeacherName}
                <button onClick={() => onUpdate({ visitedTeacherName: '' })} className="mr-auto text-emerald-400 hover:text-emerald-600">✕</button>
              </div>
            )}
            {!visit.visitedTeacherName && (
              <input 
                type="text" 
                value={visitedSearch}
                onChange={(e) => {
                  setVisitedSearch(e.target.value);
                  setShowVisitedDrop(true);
                  if (e.target.value.length === 1) onUpdate({});
                }}
                onFocus={() => setShowVisitedDrop(true)}
                onBlur={() => setTimeout(() => setShowVisitedDrop(false), 200)}
                placeholder="ابحث عن معلم مزور..."
                className="w-full bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 shadow-sm"
              />
            )}
            {showVisitedDrop && !visit.visitedTeacherName && getStaffMatch(visitedSearch).length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {getStaffMatch(visitedSearch).map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => handleSelectVisited(s)}
                    className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-slate-700 border-b border-slate-50 font-semibold"
                  >
                    {s.name} <span className="text-xs text-slate-400">({s.jobTitles?.join('، ')})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المادة</label>
            <input 
              type="text" 
              value={visit.visitedSubject || ''}
              onChange={(e) => onUpdate({ visitedSubject: e.target.value })}
              className="w-full bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الصف</label>
            <input 
              type="text" 
              value={visit.visitedClass || ''}
              onChange={(e) => onUpdate({ visitedClass: e.target.value })}
              className="w-full bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700">حالة الزيارة:</label>
          <div className="relative group">
            <select
              value={visit.status}
              onChange={(e) => onUpdate({ status: e.target.value as any })}
              className={`appearance-none font-bold outline-none rounded-xl px-6 py-2 pr-10 cursor-pointer transition-colors border shadow-sm ${statusColors[visit.status]}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="pending" className="text-slate-800 bg-white">لم تتم الزيارة</option>
              <option value="in_progress" className="text-slate-800 bg-white">قيد التنفيذ</option>
              <option value="completed" className="text-slate-800 bg-white">تمت الزيارة</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
