import React, { useState, useEffect, useMemo } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Award, ArrowRight, ChevronLeft, Plus, Save, Trash2, Edit3, TrendingUp,
  Calendar, Clock, DollarSign, Layers, FileSpreadsheet, Filter, Search,
  X, ChevronDown, Briefcase, Users, Check, BarChart3, AlertCircle, FileText,
  LayoutGrid, List, Landmark
} from "lucide-react";
import api from "../src/lib/api";
import { toast } from "sonner";

interface ActivityProgramItem {
  timeFrom: string;
  timeTo: string;
  title: string;
  executor: string;
  notes: string;
}

interface ActivityRevenueItem {
  label: string;
  unitPrice: number;
  quantity: number;
  frequency: number;
  total: number;
  notes: string;
}

interface ActivityRequirementItem {
  label: string;
  unitPrice: number;
  quantity: number;
  total: number;
  notes: string;
}

interface SchoolActivityReport {
  id?: string;
  schoolName: string;
  branch: string;
  grades: string[];
  sections: string[];
  // Basic info
  name: string;
  location: string;
  type: string;
  manager: string;
  date: string;
  day: string;
  targetAudience: string;
  timeFrom: string;
  timeTo: string;
  objectives: string;
  activityTypes: string;
  tools: string;
  // Detailed Program (9 items)
  programItems: ActivityProgramItem[];
  // Revenues
  revenues: ActivityRevenueItem[];
  // Requirements (10 items)
  requirements: ActivityRequirementItem[];
  // Metadata
  userId: string;
  timestamp: string;
}

interface SchoolActivitiesPageProps {
  onBack: () => void;
}

const getArabicDayName = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
  } catch (e) {
    return "";
  }
};

export default function SchoolActivitiesPage({ onBack }: SchoolActivitiesPageProps) {
  const { data, currentUser } = useGlobal();
  const [activeSection, setActiveSection] = useState<"menu" | "reports" | "statistics">("menu");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filtering states
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  
  // Dropdown UI states
  const [showGradesDropdown, setShowGradesDropdown] = useState(false);
  const [showSectionsDropdown, setShowSectionsDropdown] = useState(false);

  // Statistics additional filters
  const [statsDateFrom, setStatsDateFrom] = useState("");
  const [statsDateTo, setStatsDateTo] = useState("");
  const [statsActivityType, setStatsActivityType] = useState("");

  // Data state
  const [activities, setActivities] = useState<SchoolActivityReport[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formType, setFormType] = useState("");
  const [formManager, setFormManager] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formTimeFrom, setFormTimeFrom] = useState("");
  const [formTimeTo, setFormTimeTo] = useState("");
  const [formObjectives, setFormObjectives] = useState("");
  const [formActivityTypes, setFormActivityTypes] = useState("");
  const [formTools, setFormTools] = useState("");

  // Table items states
  const [programItems, setProgramItems] = useState<ActivityProgramItem[]>(
    Array.from({ length: 9 }, () => ({ timeFrom: "", timeTo: "", title: "", executor: "", notes: "" }))
  );
  const [revenueItems, setRevenueItems] = useState<ActivityRevenueItem[]>([
    { label: "رسوم الاشتراك", unitPrice: 0, quantity: 0, frequency: 1, total: 0, notes: "" }
  ]);
  const [requirementItems, setRequirementItems] = useState<ActivityRequirementItem[]>(
    Array.from({ length: 10 }, () => ({ label: "", unitPrice: 0, quantity: 0, total: 0, notes: "" }))
  );

  // Permissions calculation
  const isGeneralSupervisor = currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const allowedSchools = useMemo(() => {
    if (isGeneralSupervisor) {
      return Object.keys(data.profile?.schoolsAndBranches || {});
    }
    const staff = data.secretariatStaff?.find(
      (s: any) => s.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
    );
    if (staff?.school) {
      return [staff.school];
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    return userRecord?.schools || [];
  }, [currentUser, data.profile?.schoolsAndBranches, data.users, data.secretariatStaff]);

  useEffect(() => {
    if (allowedSchools.length > 0 && !allowedSchools.includes(selectedSchool)) {
      setSelectedSchool(allowedSchools[0]);
    }
  }, [allowedSchools]);

  const allowedBranches = useMemo(() => {
    if (!selectedSchool) return [];
    if (isGeneralSupervisor) {
      const branchesDict = data.profile?.schoolsAndBranches || {};
      return branchesDict[selectedSchool] || [];
    }
    const staff = data.secretariatStaff?.find(
      (s: any) => s.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
    );
    if (staff?.branch) {
      return [staff.branch];
    }
    const userPerms = data.users?.find((u) => u.id === currentUser?.id)
      ?.permissions?.schoolsAndBranches;
    return userPerms?.[selectedSchool] || [];
  }, [selectedSchool, currentUser, data.users, data.profile?.schoolsAndBranches, data.secretariatStaff]);

  useEffect(() => {
    if (allowedBranches.length > 0 && !allowedBranches.includes(selectedBranch)) {
      setSelectedBranch(allowedBranches[0]);
    }
  }, [allowedBranches]);

  const allowedGrades = useMemo(() => {
    const GRADES = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    if (isGeneralSupervisor) {
      return GRADES;
    }
    const staff = data.secretariatStaff?.find(
      (s: any) => s.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
    );
    if (staff?.grades && staff.grades.length > 0) {
      return staff.grades;
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    if (userRecord?.grades && userRecord.grades.length > 0) {
      return userRecord.grades;
    }
    return GRADES;
  }, [currentUser, data.users, data.secretariatStaff]);

  const allowedSections = useMemo(() => {
    const SECTIONS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];
    if (isGeneralSupervisor) {
      return SECTIONS;
    }
    const userRecord = data.users?.find((u) => u.id === currentUser?.id);
    if (userRecord?.sections && userRecord.sections.length > 0) {
      return userRecord.sections;
    }
    return SECTIONS;
  }, [currentUser, data.users]);

  // Load Day Name automatically when Date changes
  useEffect(() => {
    if (formDate) {
      setFormDay(getArabicDayName(formDate));
    }
  }, [formDate]);

  // Sync data fetcher
  const fetchActivities = async () => {
    setLoading(true);
    const filterFn = (item: any) => {
      if (isGeneralSupervisor) return true;
      if (item.userId === currentUser?.id) return true;
      return item.schoolName && allowedSchools.includes(item.schoolName);
    };

    try {
      const res = await api.get("/sync/standalone/SchoolActivities");
      const list = (res.data || []) as SchoolActivityReport[];
      localStorage.setItem('cached_SchoolActivities', JSON.stringify(list));
      setActivities(list.filter(filterFn));
    } catch (err) {
      console.error("Error fetching activities, falling back to cache:", err);
      const cached = localStorage.getItem('cached_SchoolActivities');
      if (cached) {
        try {
          setActivities((JSON.parse(cached) as SchoolActivityReport[]).filter(filterFn));
        } catch (e) {
          console.error(e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection !== "menu") {
      fetchActivities();
      const interval = setInterval(fetchActivities, 15000);
      return () => clearInterval(interval);
    }
  }, [activeSection, selectedSchool]);

  // Form helpers
  const handleAddClick = () => {
    setEditingId(null);
    setFormName("");
    setFormLocation("");
    setFormType("");
    setFormManager("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDay("");
    setFormTarget("");
    setFormTimeFrom("");
    setFormTimeTo("");
    setFormObjectives("");
    setFormActivityTypes("");
    setFormTools("");
    setProgramItems(Array.from({ length: 9 }, () => ({ timeFrom: "", timeTo: "", title: "", executor: "", notes: "" })));
    setRevenueItems([{ label: "رسوم الاشتراك", unitPrice: 0, quantity: 0, frequency: 1, total: 0, notes: "" }]);
    setRequirementItems(Array.from({ length: 10 }, () => ({ label: "", unitPrice: 0, quantity: 0, total: 0, notes: "" })));
    setShowForm(true);
  };

  const handleEditClick = (act: SchoolActivityReport) => {
    setEditingId(act.id || null);
    setFormName(act.name);
    setFormLocation(act.location);
    setFormType(act.type);
    setFormManager(act.manager);
    setFormDate(act.date);
    setFormDay(act.day);
    setFormTarget(act.targetAudience);
    setFormTimeFrom(act.timeFrom);
    setFormTimeTo(act.timeTo);
    setFormObjectives(act.objectives || "");
    setFormActivityTypes(act.activityTypes || "");
    setFormTools(act.tools || "");
    
    // Fallbacks to keep rows structured correctly
    const pItems = [...(act.programItems || [])];
    while (pItems.length < 9) pItems.push({ timeFrom: "", timeTo: "", title: "", executor: "", notes: "" });
    setProgramItems(pItems.slice(0, 9));

    const rRevenues = [...(act.revenues || [])];
    if (rRevenues.length === 0) rRevenues.push({ label: "رسوم الاشتراك", unitPrice: 0, quantity: 0, frequency: 1, total: 0, notes: "" });
    setRevenueItems(rRevenues);

    const reqItems = [...(act.requirements || [])];
    while (reqItems.length < 10) reqItems.push({ label: "", unitPrice: 0, quantity: 0, total: 0, notes: "" });
    setRequirementItems(reqItems.slice(0, 10));

    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("الرجاء إدخال اسم النشاط");
      return;
    }
    if (!selectedSchool) {
      toast.error("الرجاء تحديد المدرسة");
      return;
    }
    if (!selectedBranch) {
      toast.error("الرجاء تحديد الفرع");
      return;
    }

    const payload: SchoolActivityReport = {
      id: editingId || undefined,
      schoolName: selectedSchool,
      branch: selectedBranch,
      grades: selectedGrades.length > 0 ? selectedGrades : allowedGrades,
      sections: selectedSections.length > 0 ? selectedSections : allowedSections,
      name: formName,
      location: formLocation,
      type: formType,
      manager: formManager,
      date: formDate,
      day: formDay,
      targetAudience: formTarget,
      timeFrom: formTimeFrom,
      timeTo: formTimeTo,
      objectives: formObjectives,
      activityTypes: formActivityTypes,
      tools: formTools,
      programItems: programItems.filter(i => i.title.trim() || i.timeFrom || i.timeTo),
      revenues: revenueItems,
      requirements: requirementItems.filter(i => i.label.trim())
    } as any;

    payload.userId = currentUser?.id || "unknown";
    payload.timestamp = new Date().toISOString();

    const cached = localStorage.getItem('cached_SchoolActivities');
    let localList: SchoolActivityReport[] = cached ? JSON.parse(cached) : [];

    try {
      const res = await api.post("/sync/standalone/SchoolActivities", payload);
      const savedDoc = res.data;
      
      // Update local storage
      if (editingId) {
        localList = localList.map(x => x.id === editingId ? savedDoc : x);
      } else {
        localList.push(savedDoc);
      }
      localStorage.setItem('cached_SchoolActivities', JSON.stringify(localList));
      
      toast.success("تم حفظ تقرير النشاط بنجاح");
      setShowForm(false);
      fetchActivities();
    } catch (err) {
      console.error("Save activity failed, fallback to local storage:", err);
      // Offline fallback
      const offlineDoc = { ...payload, id: editingId || "local_" + Math.random().toString(36).substring(2, 9) };
      if (editingId) {
        localList = localList.map(x => x.id === editingId ? offlineDoc : x);
      } else {
        localList.push(offlineDoc);
      }
      localStorage.setItem('cached_SchoolActivities', JSON.stringify(localList));
      
      // Queue background sync
      api.post("/sync/standalone/SchoolActivities", offlineDoc).catch(() => {});
      
      toast.success("تم حفظ التقرير محلياً، وسيتم مزامنته عند العودة للاتصال بالإنترنت.");
      setShowForm(false);
      fetchActivities();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا النشاط بالكامل؟")) return;

    const cached = localStorage.getItem('cached_SchoolActivities');
    let localList: SchoolActivityReport[] = cached ? JSON.parse(cached) : [];
    localList = localList.filter(x => x.id !== id);
    localStorage.setItem('cached_SchoolActivities', JSON.stringify(localList));

    try {
      await api.delete(`/sync/standalone/SchoolActivities/${id}`);
      toast.success("تم حذف النشاط بنجاح");
      fetchActivities();
    } catch (err) {
      console.error("Error deleting activity:", err);
      toast.success("تم الحذف محلياً، وسيتم المزامنة لاحقاً.");
      fetchActivities();
    }
  };

  // Filtered list based on active sidebar and header selections
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. School & Branch match
      if (selectedSchool && act.schoolName !== selectedSchool) return false;
      if (selectedBranch && act.branch !== selectedBranch) return false;
      
      // 2. Multi-select Grade matching
      if (selectedGrades.length > 0) {
        const matchesGrade = act.grades?.some(g => selectedGrades.includes(g));
        if (!matchesGrade) return false;
      }

      // 3. Multi-select Section matching
      if (selectedSections.length > 0) {
        const matchesSection = act.sections?.some(s => selectedSections.includes(s));
        if (!matchesSection) return false;
      }

      // 4. Statistics additional filters
      if (activeSection === "statistics") {
        if (statsDateFrom && act.date < statsDateFrom) return false;
        if (statsDateTo && act.date > statsDateTo) return false;
        if (statsActivityType && !act.type?.toLowerCase().includes(statsActivityType.toLowerCase())) return false;
      }

      return true;
    });
  }, [activities, selectedSchool, selectedBranch, selectedGrades, selectedSections, activeSection, statsDateFrom, statsDateTo, statsActivityType]);

  // Financial aggregates
  const financials = useMemo(() => {
    let totalRevenues = 0;
    let totalCosts = 0;

    filteredActivities.forEach((act) => {
      // Revenues calculation
      (act.revenues || []).forEach((r) => {
        totalRevenues += (r.unitPrice || 0) * (r.quantity || 0) * (r.frequency || 1);
      });
      // Requirements calculation
      (act.requirements || []).forEach((r) => {
        totalCosts += (r.unitPrice || 0) * (r.quantity || 0);
      });
    });

    return {
      revenues: totalRevenues,
      costs: totalCosts,
      net: totalRevenues - totalCosts
    };
  }, [filteredActivities]);

  // Keep track of which table row is expanded in Table View
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 font-arabic text-right animate-in fade-in duration-300" dir="rtl">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
            <Award className="text-rose-600 animate-pulse" size={28} />
            الأنشطة المدرسية والفعاليات
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-500 mt-2">📊 تدوين تقارير الأنشطة والبرامج التفصيلية والمؤشرات المالية المصاحبة</p>
        </div>
        
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else if (activeSection !== "menu") {
              setActiveSection("menu");
            } else {
              onBack();
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
        >
          <ArrowRight size={18} />
          {showForm ? "إلغاء وتراجع" : activeSection !== "menu" ? "العودة للأنشطة" : "العودة للرئيسية"}
        </button>
      </div>

      {/* Main Landing Menu */}
      {activeSection === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-12">
          <button
            onClick={() => {
              setActiveSection("reports");
              setViewMode("cards");
            }}
            className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-right text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[220px]"
          >
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
              <FileText size={200} />
            </div>
            <div>
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4">
                <FileText size={28} />
              </div>
              <h2 className="text-xl md:text-2xl font-black mb-2">تقارير الأنشطة</h2>
              <p className="text-white/80 text-xs md:text-sm leading-relaxed font-bold">
                إدخال وإدارة تفاصيل الأنشطة المدرسية، صياغة الأهداف والبرامج والفقرات، بالإضافة للإيرادات والاحتياجات.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-6 text-xs font-black bg-white/20 px-3.5 py-1.5 rounded-xl w-fit">
              <span>انقر للدخول</span>
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => {
              setActiveSection("statistics");
              setViewMode("table");
            }}
            className="group relative bg-gradient-to-br from-purple-600 to-pink-700 p-8 rounded-3xl text-right text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[220px]"
          >
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 size={200} />
            </div>
            <div>
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4">
                <BarChart3 size={28} />
              </div>
              <h2 className="text-xl md:text-2xl font-black mb-2">التقارير الإحصائية للأنشطة</h2>
              <p className="text-white/80 text-xs md:text-sm leading-relaxed font-bold">
                لوحات تحليلية ذكية وإحصائية تشمل التكاليف، الأرباح، الإيرادات المجمعة، مع مقارنة بصرية للميزانية.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-6 text-xs font-black bg-white/20 px-3.5 py-1.5 rounded-xl w-fit">
              <span>انقر للدخول</span>
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* Activities Workspaces */}
      {activeSection !== "menu" && !showForm && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 text-right relative z-30">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">اسم المدرسة</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
              >
                {allowedSchools.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">الفرع</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={allowedBranches.length <= 1}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
              >
                {allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Multi-select Grade Checkbox Dropdown */}
            <div className="relative">
              <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">الصف الدراسي</label>
              <button
                type="button"
                onClick={() => {
                  setShowGradesDropdown(!showGradesDropdown);
                  setShowSectionsDropdown(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold flex justify-between items-center outline-none text-slate-700 hover:bg-slate-100/50"
              >
                <span className="truncate">
                  {selectedGrades.length === 0 ? "جميع الصفوف المتاحة" : `محدد (${selectedGrades.length} صف)`}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showGradesDropdown && (
                <div className="absolute right-0 left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 max-h-56 overflow-y-auto z-50 text-right space-y-2">
                  <div className="flex justify-between border-b pb-2 mb-2 items-center">
                    <span className="text-[10px] text-slate-400 font-bold">تحديد الصفوف</span>
                    <button
                      type="button"
                      onClick={() => setSelectedGrades([])}
                      className="text-[9px] text-rose-600 font-bold hover:underline"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {allowedGrades.map((g) => {
                      const isChecked = selectedGrades.includes(g);
                      return (
                        <label key={g} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedGrades(prev => 
                                isChecked ? prev.filter(x => x !== g) : [...prev, g]
                              );
                            }}
                            className="w-3.5 h-3.5 rounded text-rose-500 cursor-pointer"
                          />
                          <span>{g}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Multi-select Section Checkbox Dropdown */}
            <div className="relative">
              <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">الشعبة</label>
              <button
                type="button"
                onClick={() => {
                  setShowSectionsDropdown(!showSectionsDropdown);
                  setShowGradesDropdown(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold flex justify-between items-center outline-none text-slate-700 hover:bg-slate-100/50"
              >
                <span className="truncate">
                  {selectedSections.length === 0 ? "جميع الشعب المتاحة" : `محدد (${selectedSections.length} شعبة)`}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showSectionsDropdown && (
                <div className="absolute right-0 left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 max-h-56 overflow-y-auto z-50 text-right space-y-2">
                  <div className="flex justify-between border-b pb-2 mb-2 items-center">
                    <span className="text-[10px] text-slate-400 font-bold">تحديد الشعب</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSections([])}
                      className="text-[9px] text-rose-600 font-bold hover:underline"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {allowedSections.map((s) => {
                      const isChecked = selectedSections.includes(s);
                      return (
                        <label key={s} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSections(prev => 
                                isChecked ? prev.filter(x => x !== s) : [...prev, s]
                              );
                            }}
                            className="w-3.5 h-3.5 rounded text-rose-500 cursor-pointer"
                          />
                          <span>شعبة {s}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Extra Date / Type filters for Statistics section */}
            {activeSection === "statistics" && (
              <>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">من تاريخ</label>
                  <input
                    type="date"
                    value={statsDateFrom}
                    onChange={(e) => setStatsDateFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={statsDateTo}
                    onChange={(e) => setStatsDateTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-1.5 pr-1">نوع النشاط</label>
                  <input
                    type="text"
                    value={statsActivityType}
                    onChange={(e) => setStatsActivityType(e.target.value)}
                    placeholder="مثال: ثقافي، رياضي، علمي..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Financial Aggregates Dashboard for Statistics view */}
          {activeSection === "statistics" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom duration-300">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الأنشطة المسجلة</span>
                  <span className="text-xl font-black text-slate-700">{filteredActivities.length} نشاط</span>
                </div>
                <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg">🎭</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">إجمالي الإيرادات</span>
                  <span className="text-xl font-black text-emerald-600">{financials.revenues.toLocaleString()} ر.س</span>
                </div>
                <span className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-lg">💰</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">إجمالي التكاليف</span>
                  <span className="text-xl font-black text-rose-600">{financials.costs.toLocaleString()} ر.س</span>
                </div>
                <span className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 text-lg">💸</span>
              </div>

              <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between ${financials.net >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">صافي الميزانية</span>
                  <span className={`text-xl font-black ${financials.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {financials.net.toLocaleString()} ر.س
                  </span>
                </div>
                <span className="text-2xl">{financials.net >= 0 ? '📈' : '📉'}</span>
              </div>
            </div>
          )}

          {/* Action Row & Views Toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-2 rounded-lg transition-all ${viewMode === "cards" ? "bg-rose-50 text-rose-600" : "bg-transparent text-slate-400 hover:text-slate-600"}`}
                title="عرض كبطاقات"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-rose-50 text-rose-600" : "bg-transparent text-slate-400 hover:text-slate-600"}`}
                title="عرض كجدول"
              >
                <List size={20} />
              </button>
              <span className="text-xs text-slate-400 font-bold mr-2">
                عرض التقارير الحالية كـ {viewMode === "cards" ? "بطاقات" : "جدول"}
              </span>
            </div>

            {activeSection === "reports" && (
              <button
                onClick={handleAddClick}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <Plus size={16} /> إضافة نشاط جديد
              </button>
            )}
          </div>

          {/* LOADING STATE */}
          {loading && activities.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-4"></div>
              <p className="text-xs text-slate-400 font-bold">جاري تحميل وتدقيق تقارير الأنشطة المدرسية...</p>
            </div>
          )}

          {/* EMPTY STATE */}
          {filteredActivities.length === 0 && !loading && (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
              <div className="w-14 h-14 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center">
                <Award size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-700 text-sm">لا توجد أنشطة مطابقة</h4>
                <p className="text-xs text-slate-400 max-w-sm font-bold leading-relaxed">
                  لم يتم العثور على أي أنشطة مدرسية مسجلة لهذه الفلاتر المحددة. انقر فوق زر "إضافة نشاط جديد" لتسجيل تقرير نشاط.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVITIES CARDS VIEW */}
          {viewMode === "cards" && filteredActivities.length > 0 && (
            <div className="grid grid-cols-1 gap-8">
              {filteredActivities.map((act) => {
                // Calculate item aggregates
                const revTotal = (act.revenues || []).reduce((sum, r) => sum + (r.unitPrice || 0) * (r.quantity || 0) * (r.frequency || 1), 0);
                const reqTotal = (act.requirements || []).reduce((sum, r) => sum + (r.unitPrice || 0) * (r.quantity || 0), 0);
                
                return (
                  <div key={act.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-right hover:shadow-md transition-shadow animate-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Card Header */}
                    <div className="bg-slate-50/50 p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[9px] font-black">{act.type || "عام"}</span>
                        <h3 className="text-lg font-black text-slate-800">{act.name}</h3>
                      </div>
                      
                      {activeSection === "reports" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(act)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100/70 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                          >
                            <Edit3 size={14} /> تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(act.id || "")}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100/70 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 size={14} /> حذف
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-6 space-y-6 text-xs md:text-sm">
                      
                      {/* Part A: Basic Details Grid */}
                      <div className="space-y-4">
                        <h4 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs">
                          <FileText size={14} className="text-rose-500" /> البيانات الأساسية للنشاط
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/60">
                          <div><span className="text-slate-400 font-bold">مسؤول النشاط:</span> <span className="text-slate-700 font-black">{act.manager || "غير محدد"}</span></div>
                          <div><span className="text-slate-400 font-bold">المكان:</span> <span className="text-slate-700 font-black">{act.location || "غير محدد"}</span></div>
                          <div><span className="text-slate-400 font-bold">المستهدف:</span> <span className="text-slate-700 font-black">{act.targetAudience || "غير محدد"}</span></div>
                          
                          <div><span className="text-slate-400 font-bold">التاريخ:</span> <span className="text-slate-700 font-black">{act.date || "---"}</span></div>
                          <div><span className="text-slate-400 font-bold">اليوم:</span> <span className="text-slate-700 font-black">{act.day || "---"}</span></div>
                          <div><span className="text-slate-400 font-bold">الوقت:</span> <span className="text-slate-700 font-black">من {act.timeFrom || "..."} إلى {act.timeTo || "..."}</span></div>
                          
                          <div className="md:col-span-3 border-t border-slate-100 pt-2"><span className="text-slate-400 font-bold">الأهداف:</span> <span className="text-slate-700 font-bold">{act.objectives || "لا توجد أهداف مدونة"}</span></div>
                          <div className="md:col-span-3"><span className="text-slate-400 font-bold">نوع الأنشطة:</span> <span className="text-slate-700 font-bold">{act.activityTypes || "لا يوجد تفصيل"}</span></div>
                          <div className="md:col-span-3"><span className="text-slate-400 font-bold">الوسائل:</span> <span className="text-slate-700 font-bold">{act.tools || "لا يوجد تفصيل"}</span></div>
                        </div>
                      </div>

                      {/* Part B: Detailed Program */}
                      {(act.programItems || []).length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs">
                            <Clock size={14} className="text-rose-500" /> البرنامج التفصيلي للنشاط
                          </h4>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-2.5 font-bold w-12 text-center">م</th>
                                  <th className="p-2.5 font-bold w-32">الزمن (من - إلى)</th>
                                  <th className="p-2.5 font-bold">البرنامج / الفقرة</th>
                                  <th className="p-2.5 font-bold w-40">المنفذ</th>
                                  <th className="p-2.5 font-bold">ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {act.programItems.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="p-2.5 font-semibold text-slate-600">{item.timeFrom} - {item.timeTo}</td>
                                    <td className="p-2.5 font-bold text-slate-800">{item.title}</td>
                                    <td className="p-2.5 font-semibold text-slate-700">{item.executor}</td>
                                    <td className="p-2.5 text-slate-500 font-semibold">{item.notes}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Financial Blocks Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Part C: Revenues */}
                        <div className="space-y-3">
                          <h4 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs justify-between">
                            <span className="flex items-center gap-1">
                              <Landmark size={14} className="text-emerald-500" /> إيرادات النشاط
                            </span>
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100">
                              إجمالي الإيرادات: {revTotal.toLocaleString()} ر.س
                            </span>
                          </h4>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-[11px]">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-2.5 font-bold">البيان</th>
                                  <th className="p-2.5 font-bold text-center">سعر الوحدة</th>
                                  <th className="p-2.5 font-bold text-center">العدد</th>
                                  <th className="p-2.5 font-bold text-center">التكرار</th>
                                  <th className="p-2.5 font-bold text-left bg-emerald-50 text-emerald-900">المجموع</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(act.revenues || []).map((rev, idx) => {
                                  const total = (rev.unitPrice || 0) * (rev.quantity || 0) * (rev.frequency || 1);
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="p-2.5 font-bold text-slate-800">{rev.label}</td>
                                      <td className="p-2.5 text-center text-slate-600 font-semibold">{rev.unitPrice} ر.س</td>
                                      <td className="p-2.5 text-center text-slate-600 font-semibold">{rev.quantity}</td>
                                      <td className="p-2.5 text-center text-slate-600 font-semibold">{rev.frequency}</td>
                                      <td className="p-2.5 text-left font-black bg-emerald-50/50 text-emerald-700">{total.toLocaleString()} ر.س</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Part D: Requirements / Costs */}
                        <div className="space-y-3">
                          <h4 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs justify-between">
                            <span className="flex items-center gap-1">
                              <DollarSign size={14} className="text-rose-500" /> احتياجات ومصروفات النشاط
                            </span>
                            <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-100">
                              إجمالي التكلفة: {reqTotal.toLocaleString()} ر.س
                            </span>
                          </h4>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-[11px]">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-2.5 font-bold">البيان</th>
                                  <th className="p-2.5 font-bold text-center">سعر الوحدة</th>
                                  <th className="p-2.5 font-bold text-center">العدد</th>
                                  <th className="p-2.5 font-bold text-left bg-rose-50 text-rose-900">المجموع</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(act.requirements || []).map((req, idx) => {
                                  const total = (req.unitPrice || 0) * (req.quantity || 0);
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="p-2.5 font-bold text-slate-800">{req.label}</td>
                                      <td className="p-2.5 text-center text-slate-600 font-semibold">{req.unitPrice} ر.س</td>
                                      <td className="p-2.5 text-center text-slate-600 font-semibold">{req.quantity}</td>
                                      <td className="p-2.5 text-left font-black bg-rose-50/50 text-rose-700">{total.toLocaleString()} ر.س</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ACTIVITIES TABLES VIEW WITH EXPANDABLE DRAWER */}
          {viewMode === "table" && filteredActivities.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-4 w-12 text-center"></th>
                    <th className="p-4">اسم النشاط</th>
                    <th className="p-4">نوع النشاط</th>
                    <th className="p-4">المكان</th>
                    <th className="p-4">المسؤول</th>
                    <th className="p-4">التاريخ واليوم</th>
                    <th className="p-4 text-center">إجمالي الإيرادات</th>
                    <th className="p-4 text-center">إجمالي التكلفة</th>
                    <th className="p-4 text-center">صافي الميزانية</th>
                    {activeSection === "reports" && <th className="p-4 text-center w-32">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.map((act) => {
                    const isExpanded = expandedRowId === act.id;
                    const revTotal = (act.revenues || []).reduce((sum, r) => sum + (r.unitPrice || 0) * (r.quantity || 0) * (r.frequency || 1), 0);
                    const reqTotal = (act.requirements || []).reduce((sum, r) => sum + (r.unitPrice || 0) * (r.quantity || 0), 0);
                    const netVal = revTotal - reqTotal;

                    return (
                      <React.Fragment key={act.id}>
                        {/* Master Row */}
                        <tr
                          onClick={() => setExpandedRowId(isExpanded ? null : (act.id || null))}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="p-4 text-center font-bold text-slate-400">
                            <ChevronDown size={16} className={`transform transition-transform ${isExpanded ? 'rotate-180 text-rose-500' : ''}`} />
                          </td>
                          <td className="p-4 font-bold text-slate-800">{act.name}</td>
                          <td className="p-4 font-bold text-slate-600">{act.type || "عام"}</td>
                          <td className="p-4 font-semibold text-slate-600">{act.location}</td>
                          <td className="p-4 font-semibold text-slate-600">{act.manager}</td>
                          <td className="p-4 font-semibold text-slate-500">{act.date} ({act.day})</td>
                          <td className="p-4 text-center font-extrabold text-emerald-600">{revTotal.toLocaleString()} ر.س</td>
                          <td className="p-4 text-center font-extrabold text-rose-600">{reqTotal.toLocaleString()} ر.س</td>
                          <td className={`p-4 text-center font-black ${netVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {netVal.toLocaleString()} ر.س
                          </td>
                          
                          {activeSection === "reports" && (
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleEditClick(act)}
                                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100/50"
                                  title="تعديل"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(act.id || "")}
                                  className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100/50"
                                  title="حذف"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Expandable Accordion Drawer */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="p-6 bg-slate-50/50 border-t border-b border-slate-100">
                              <div className="space-y-6 text-xs md:text-sm animate-in slide-in-from-top-1 duration-200">
                                
                                {/* Program Items Table */}
                                {(act.programItems || []).length > 0 && (
                                  <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <h5 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs">
                                      <Clock size={12} className="text-rose-500" /> البرنامج التفصيلي للنشاط
                                    </h5>
                                    <table className="w-full text-right text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                                          <th className="p-2 w-12 text-center">م</th>
                                          <th className="p-2 w-28">الزمن</th>
                                          <th className="p-2">البرنامج / الفقرة</th>
                                          <th className="p-2 w-40">المنفذ</th>
                                          <th className="p-2">ملاحظات</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {act.programItems.map((item, idx) => (
                                          <tr key={idx} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/20">
                                            <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                                            <td className="p-2 font-semibold text-slate-500">{item.timeFrom} - {item.timeTo}</td>
                                            <td className="p-2 font-bold text-slate-700">{item.title}</td>
                                            <td className="p-2 font-semibold text-slate-600">{item.executor}</td>
                                            <td className="p-2 text-slate-400">{item.notes}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Financial Sub-tables Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Revenues */}
                                  <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <h5 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs">
                                      <Landmark size={12} className="text-emerald-500" /> إيرادات النشاط
                                    </h5>
                                    <table className="w-full text-right text-[11px]">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                                          <th className="p-2">البيان</th>
                                          <th className="p-2 text-center">سعر الوحدة</th>
                                          <th className="p-2 text-center">العدد</th>
                                          <th className="p-2 text-center">التكرار</th>
                                          <th className="p-2 text-left bg-emerald-50 text-emerald-900">المجموع</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(act.revenues || []).map((rev, idx) => {
                                          const total = (rev.unitPrice || 0) * (rev.quantity || 0) * (rev.frequency || 1);
                                          return (
                                            <tr key={idx} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/20">
                                              <td className="p-2 font-bold text-slate-700">{rev.label}</td>
                                              <td className="p-2 text-center text-slate-500 font-semibold">{rev.unitPrice} ر.س</td>
                                              <td className="p-2 text-center text-slate-500">{rev.quantity}</td>
                                              <td className="p-2 text-center text-slate-500">{rev.frequency}</td>
                                              <td className="p-2 text-left font-black bg-emerald-50/40 text-emerald-700">{total.toLocaleString()} ر.س</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Costs */}
                                  <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <h5 className="font-black text-slate-700 flex items-center gap-1 border-b pb-2 border-slate-100 text-xs">
                                      <DollarSign size={12} className="text-rose-500" /> احتياجات ومصروفات النشاط
                                    </h5>
                                    <table className="w-full text-right text-[11px]">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-100">
                                          <th className="p-2">البيان</th>
                                          <th className="p-2 text-center">سعر الوحدة</th>
                                          <th className="p-2 text-center">العدد</th>
                                          <th className="p-2 text-left bg-rose-50 text-rose-900">المجموع</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(act.requirements || []).map((req, idx) => {
                                          const total = (req.unitPrice || 0) * (req.quantity || 0);
                                          return (
                                            <tr key={idx} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/20">
                                              <td className="p-2 font-bold text-slate-700">{req.label}</td>
                                              <td className="p-2 text-center text-slate-500 font-semibold">{req.unitPrice} ر.س</td>
                                              <td className="p-2 text-center text-slate-500">{req.quantity}</td>
                                              <td className="p-2 text-left font-black bg-rose-50/40 text-rose-700">{total.toLocaleString()} ر.س</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Part A Objectives */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2 text-xs">
                                  <div><span className="text-slate-400 font-bold block mb-1">الأهداف والوسائل المنفذة بالفعالية:</span></div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/30 p-3 rounded-xl">
                                    <div><span className="text-slate-500 font-black block">الأهداف:</span> <p className="text-slate-700 font-bold mt-1 leading-5">{act.objectives || "---"}</p></div>
                                    <div><span className="text-slate-500 font-black block">نوع الأنشطة:</span> <p className="text-slate-700 font-bold mt-1 leading-5">{act.activityTypes || "---"}</p></div>
                                    <div><span className="text-slate-500 font-black block">الوسائل:</span> <p className="text-slate-700 font-bold mt-1 leading-5">{act.tools || "---"}</p></div>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* DETAILED ADD / EDIT FORM PANEL */}
      {showForm && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-lg space-y-8 animate-in slide-in-from-bottom duration-300">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {editingId ? "تعديل تقرير النشاط المدرسي" : "تسجيل تقرير نشاط مدرسي جديد"}
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1">تعبئة نموذج البيانات الأساسية والمالية التفصيلية للنشاط</p>
          </div>

          {/* Part A: Basic Info inputs */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-rose-600 border-b pb-2 border-rose-100 flex items-center gap-1">
              <FileText size={14} /> البيانات الأساسية للنشاط (أ)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم النشاط *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: رحلة علمية للطلاب"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المكان</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="مثال: الساحة الرياضية / المعمل"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label>
                <input
                  type="text"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  placeholder="مثال: ثقافي، رياضي، علمي"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مسؤول النشاط</label>
                <input
                  type="text"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  placeholder="مثال: أ. محمد أحمد"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اليوم</label>
                <input
                  type="text"
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value)}
                  placeholder="يتم ملئه تلقائياً عند اختيار التاريخ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المستهدف</label>
                <input
                  type="text"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="مثال: طلاب الصفوف العليا"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">من الساعة</label>
                <input
                  type="time"
                  value={formTimeFrom}
                  onChange={(e) => setFormTimeFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">إلى الساعة</label>
                <input
                  type="time"
                  value={formTimeTo}
                  onChange={(e) => setFormTimeTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">الأهداف</label>
                <textarea
                  value={formObjectives}
                  onChange={(e) => setFormObjectives(e.target.value)}
                  placeholder="مثال: تنمية المهارات القيادية للطلاب، تعزيز روح العمل الجماعي..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none h-20"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الأنشطة</label>
                <textarea
                  value={formActivityTypes}
                  onChange={(e) => setFormActivityTypes(e.target.value)}
                  placeholder="مثال: إلقاء، مسابقات حركية، ورش عمل تطبيقية..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none h-20"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">الوسائل</label>
                <textarea
                  value={formTools}
                  onChange={(e) => setFormTools(e.target.value)}
                  placeholder="مثال: شاشات عرض، أجهزة حاسوب المحمولة، أدوات المعمل..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none h-20"
                />
              </div>
            </div>
          </div>

          {/* Part B: Detailed Program Table (9 items) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-rose-600 border-b pb-2 border-rose-100 flex items-center gap-1">
              <Clock size={14} /> البرنامج التفصيلي للنشاط (ب)
            </h3>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                    <th className="p-2.5 font-bold w-12 text-center">م</th>
                    <th className="p-2.5 font-bold w-32">من الوقت</th>
                    <th className="p-2.5 font-bold w-32">إلى الوقت</th>
                    <th className="p-2.5 font-bold">البرنامج / الفقرة</th>
                    <th className="p-2.5 font-bold w-44">المنفذ</th>
                    <th className="p-2.5 font-bold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {programItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-1">
                        <input
                          type="time"
                          value={item.timeFrom}
                          onChange={(e) => {
                            const newItems = [...programItems];
                            newItems[idx].timeFrom = e.target.value;
                            setProgramItems(newItems);
                          }}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-xs"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="time"
                          value={item.timeTo}
                          onChange={(e) => {
                            const newItems = [...programItems];
                            newItems[idx].timeTo = e.target.value;
                            setProgramItems(newItems);
                          }}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-xs"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...programItems];
                            newItems[idx].title = e.target.value;
                            setProgramItems(newItems);
                          }}
                          placeholder="اسم الفقرة..."
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-xs font-bold text-slate-700"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={item.executor}
                          onChange={(e) => {
                            const newItems = [...programItems];
                            newItems[idx].executor = e.target.value;
                            setProgramItems(newItems);
                          }}
                          placeholder="اسم المنفذ..."
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-xs"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => {
                            const newItems = [...programItems];
                            newItems[idx].notes = e.target.value;
                            setProgramItems(newItems);
                          }}
                          placeholder="أي ملاحظات..."
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financials Form Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Part C: Revenues Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-rose-600 border-b pb-2 border-rose-100 flex items-center gap-1 justify-between">
                <span className="flex items-center gap-1">
                  <Landmark size={14} /> الإيرادات الخاصة بالنشاط (ج)
                </span>
                <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                  المجموع: {revenueItems.reduce((sum, r) => sum + (r.unitPrice * r.quantity * r.frequency), 0).toLocaleString()} ر.س
                </span>
              </h3>
              
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-right text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-2.5 font-bold">البيان</th>
                      <th className="p-2.5 font-bold text-center w-20">سعر الوحدة</th>
                      <th className="p-2.5 font-bold text-center w-16">العدد</th>
                      <th className="p-2.5 font-bold text-center w-16">التكرار</th>
                      <th className="p-2.5 font-bold text-left bg-emerald-50 text-emerald-950">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueItems.map((rev, idx) => {
                      const total = (rev.unitPrice || 0) * (rev.quantity || 0) * (rev.frequency || 1);
                      return (
                        <tr key={idx}>
                          <td className="p-1 font-bold text-slate-700">{rev.label}</td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="0"
                              value={rev.unitPrice || ""}
                              onChange={(e) => {
                                const newItems = [...revenueItems];
                                newItems[idx].unitPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                setRevenueItems(newItems);
                              }}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="0"
                              value={rev.quantity || ""}
                              onChange={(e) => {
                                const newItems = [...revenueItems];
                                newItems[idx].quantity = Math.max(0, parseInt(e.target.value) || 0);
                                setRevenueItems(newItems);
                              }}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="1"
                              value={rev.frequency || ""}
                              onChange={(e) => {
                                const newItems = [...revenueItems];
                                newItems[idx].frequency = Math.max(1, parseInt(e.target.value) || 1);
                                setRevenueItems(newItems);
                              }}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-left font-black bg-emerald-50/40 text-emerald-700">
                            {total.toLocaleString()} ر.س
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part D: Requirements Form (10 items) */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-rose-600 border-b pb-2 border-rose-100 flex items-center gap-1 justify-between">
                <span className="flex items-center gap-1">
                  <DollarSign size={14} /> احتياجات ومصروفات النشاط (د)
                </span>
                <span className="text-xs font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100">
                  المجموع: {requirementItems.reduce((sum, r) => sum + (r.unitPrice * r.quantity), 0).toLocaleString()} ر.س
                </span>
              </h3>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-right text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-2.5 font-bold w-12 text-center">م</th>
                      <th className="p-2.5 font-bold">البيان</th>
                      <th className="p-2.5 font-bold text-center w-24">سعر الوحدة</th>
                      <th className="p-2.5 font-bold text-center w-20">العدد</th>
                      <th className="p-2.5 font-bold text-left bg-rose-50 text-rose-950">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirementItems.map((req, idx) => {
                      const total = (req.unitPrice || 0) * (req.quantity || 0);
                      return (
                        <tr key={idx}>
                          <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-1">
                            <input
                              type="text"
                              value={req.label}
                              onChange={(e) => {
                                const newItems = [...requirementItems];
                                newItems[idx].label = e.target.value;
                                setRequirementItems(newItems);
                              }}
                              placeholder="اسم البند..."
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-xs font-bold text-slate-700"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="0"
                              value={req.unitPrice || ""}
                              onChange={(e) => {
                                const newItems = [...requirementItems];
                                newItems[idx].unitPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                setRequirementItems(newItems);
                              }}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="0"
                              value={req.quantity || ""}
                              onChange={(e) => {
                                const newItems = [...requirementItems];
                                newItems[idx].quantity = Math.max(0, parseInt(e.target.value) || 0);
                                setRequirementItems(newItems);
                              }}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-rose-500 rounded p-1 text-center text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-left font-black bg-rose-50/40 text-rose-700">
                            {total.toLocaleString()} ر.s
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              إلغاء التعديلات
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={16} /> حفظ التقرير والمزامنة
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
