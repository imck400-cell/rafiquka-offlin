import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useGlobal } from "../context/GlobalState";
import { StudentReinforcementLog } from "../types";
import {
  Calendar,
  Save,
  Archive,
  Filter,
  CheckCircle,
  Plus,
  Trash2,
  FileSpreadsheet,
  MessageCircle,
  X,
  ChevronDown,
  Database,
  Search,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { exportToStyledExcel, toHijri } from "../src/lib/excelExport";

interface Props {
  onClose?: () => void;
}

const moralItems = [
  "الابتسامة والربت على الكتف",
  "المديح اللفظي العلني أمام الزملاء في الممر",
  "تسليمه بطاقة \"الطالب المنظم\" الفورية",
  "تسجيل اسمه في \"قائمة الشرف اليومية\" للمشرف",
  "النداء على اسمه في الإذاعة المدرسية",
  "منحه رتبة وشارة \"مساعد مشرف الدور\"",
  "إرسال رسالة فخر نصية لولي أمره",
  "توجيه الطلاب للتصفيق الجماعي له في الطابور",
  "تعليق صورته في جدارية السلوك الإيجابي بالمدرسة",
  "التنسيق لرفع درجاته في سجل السلوك والمواظبة",
  "السماح له بقيادة طابور فصله أثناء الدخول والخروج",
  "زيارة فصله والثناء عليه خصيصًا أمام معلم الصف وزملائه",
  "ترشيحه لجلسة تناول إفطار مع مدير المدرسة",
  "كتابة وتوقيع عبارة شكر في دفتر واجباته المدرسية",
  "الإعفاء من بعض المهام الروتينية التنظيمية مكافأة له"
];

const materialItems = [
  "منحه ملصقًا تشجيعيًا يضعه على حقيبته أو صدره",
  "إهداؤه أداة مكتبية رمزية (قلم، ممحاة مميزة، مسطرة)",
  "كوبون وجبة أو عصير مجاني من المقصف المدرسي",
  "إهداؤه لعبة ذكاء أو أحجية ورقية صغيرة",
  "تسليمه ميدالية \"نجم النظام\" ليرتديه أسبوعًا"
];

const getArabicDayName = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", { weekday: "long" });
  } catch {
    return "";
  }
};

export const StudentReinforcementsView: React.FC<Props> = ({ onClose }) => {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const today = new Date().toISOString().split("T")[0];

  // Allowed Schools & Branches based on permissions
  const allowedSchools = useMemo(() => {
    if (isGeneralSupervisor) {
      const list = new Set<string>();
      if (data.profile?.schoolName) list.add(data.profile.schoolName);
      if (Array.isArray(data.availableSchools)) {
        data.availableSchools.forEach((s) => list.add(s));
      }
      if (Array.isArray(data.secretariatStudents)) {
        data.secretariatStudents.forEach((s: any) => {
          if (s.school) list.add(s.school);
        });
      }
      return Array.from(list);
    } else {
      const userSchools = Object.keys(currentUser?.permissions?.schoolsAndBranches || {});
      if (userSchools.length > 0) return userSchools;
      if (currentUser?.selectedSchool) return [currentUser.selectedSchool];
      if (data.profile?.schoolName) return [data.profile.schoolName];
      return [];
    }
  }, [data.availableSchools, data.profile?.schoolName, data.secretariatStudents, currentUser, isGeneralSupervisor]);

  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  useEffect(() => {
    if (allowedSchools.length > 0) {
      const initialSchool = currentUser?.selectedSchool || allowedSchools[0];
      setSelectedSchool(allowedSchools.includes(initialSchool) ? initialSchool : allowedSchools[0]);
    }
  }, [allowedSchools, currentUser]);

  const allowedBranches = useMemo(() => {
    if (!selectedSchool) return [];
    if (isGeneralSupervisor) {
      const list = new Set<string>();
      if (data.profile?.schoolName === selectedSchool && data.profile?.branch) {
        list.add(data.profile.branch);
      }
      if (data.schoolBranches?.[selectedSchool]) {
        data.schoolBranches[selectedSchool].forEach((b) => list.add(b));
      }
      if (Array.isArray(data.secretariatStudents)) {
        data.secretariatStudents.forEach((s: any) => {
          if (s.school === selectedSchool && s.branch) list.add(s.branch);
        });
      }
      return Array.from(list);
    } else {
      const permsMap = currentUser?.permissions?.schoolsAndBranches || {};
      const branches = permsMap[selectedSchool] || [];
      if (branches.length > 0) return branches;
      if (currentUser?.selectedSchool === selectedSchool && currentUser?.selectedBranch) {
        return [currentUser.selectedBranch];
      }
      if (data.profile?.schoolName === selectedSchool && data.profile?.branch) {
        return [data.profile.branch];
      }
      return [];
    }
  }, [selectedSchool, data.schoolBranches, data.profile, data.secretariatStudents, currentUser, isGeneralSupervisor]);

  useEffect(() => {
    if (allowedBranches.length > 0) {
      const initialBranch = currentUser?.selectedBranch || allowedBranches[0];
      setSelectedBranch(allowedBranches.includes(initialBranch) ? initialBranch : allowedBranches[0]);
    } else {
      setSelectedBranch("");
    }
  }, [allowedBranches, currentUser]);

  // Form Fields State
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [dateStr, setDateStr] = useState(today);
  const [selectedReinforcements, setSelectedReinforcements] = useState<string[]>([]);
  const [otherReinforcement, setOtherReinforcement] = useState("");
  const [reason, setReason] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);

  // Archive States
  const [showArchive, setShowArchive] = useState(false);
  const [archiveFilterFrom, setArchiveFilterFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [archiveFilterTo, setArchiveFilterTo] = useState(today);
  const [archiveFilterStudent, setArchiveFilterStudent] = useState("");
  const [archiveFilterType, setArchiveFilterType] = useState("");
  const [archiveResults, setArchiveResults] = useState<StudentReinforcementLog[] | null>(null);
  const [selectedArchiveRowIds, setSelectedArchiveRowIds] = useState<string[]>([]);
  const [showArchiveSuggestions, setShowArchiveSuggestions] = useState(false);

  const existingLogs: StudentReinforcementLog[] = data.studentReinforcements || [];

  // Unique students already reinforced (for Archive autocomplete)
  const reinforcedStudentsList = useMemo(() => {
    const list = new Set<string>();
    existingLogs.forEach((log) => {
      if (log.studentName && log.studentName.trim()) {
        if (selectedSchool && log.school !== selectedSchool) return;
        if (selectedBranch && log.branch !== selectedBranch) return;
        list.add(log.studentName.trim());
      }
    });
    return Array.from(list);
  }, [existingLogs, selectedSchool, selectedBranch]);

  const archiveStudentSuggestions = useMemo(() => {
    const q = archiveFilterStudent.trim().toLowerCase();
    if (!q) return reinforcedStudentsList;
    return reinforcedStudentsList.filter((name) =>
      name.toLowerCase().includes(q)
    );
  }, [archiveFilterStudent, reinforcedStudentsList]);

  // Autocomplete Students
  const availableStudents = useMemo(() => {
    let list = data.secretariatStudents || [];
    if (selectedSchool) {
      list = list.filter((s: any) => String(s.school || "").trim() === selectedSchool.trim());
    }
    if (selectedBranch) {
      list = list.filter((s: any) => String(s.branch || "").trim() === selectedBranch.trim());
    }
    return list;
  }, [data.secretariatStudents, selectedSchool, selectedBranch]);

  const studentSuggestions = useMemo(() => {
    const q = studentSearch.trim();
    if (!q) return [];
    return availableStudents.filter((s: any) =>
      s.name && String(s.name).toLowerCase().includes(q.toLowerCase())
    );
  }, [studentSearch, availableStudents]);

  // Dynamic Recorded Reinforcement Types for Filter Dropdown
  const recordedTypes = useMemo(() => {
    const types = new Set<string>();
    existingLogs.forEach((log) => {
      if (Array.isArray(log.reinforcements)) {
        log.reinforcements.forEach((r) => types.add(r));
      }
      if (log.otherReinforcement && log.otherReinforcement.trim()) {
        types.add(log.otherReinforcement.trim());
      }
    });
    return Array.from(types);
  }, [existingLogs]);

  // Auto-load draft for the day if editing and draft exists
  useEffect(() => {
    if (!showArchive && !currentDraftId) {
      // Find any unsaved/draft entry for today by this supervisor
      const draft = existingLogs.find(
        (log) =>
          log.dateStr === dateStr &&
          log.userId === currentUser?.id &&
          log.school === selectedSchool &&
          log.branch === selectedBranch &&
          !log.studentName
      );
      if (draft) {
        setCurrentDraftId(draft.id);
        setStudentSearch("");
        setSelectedStudent(null);
        setSelectedReinforcements(draft.reinforcements || []);
        setOtherReinforcement(draft.otherReinforcement || "");
        setReason(draft.reason || "");
      }
    }
  }, [dateStr, selectedSchool, selectedBranch, showArchive]);

  // Debounced/Auto-Save function
  const saveDraft = (fields: Partial<StudentReinforcementLog>) => {
    const activeId = currentDraftId || crypto.randomUUID();
    if (!currentDraftId) {
      setCurrentDraftId(activeId);
    }

    const newObj: StudentReinforcementLog = {
      id: activeId,
      userId: currentUser?.id || "",
      school: selectedSchool,
      branch: selectedBranch,
      studentId: selectedStudent?.id || "",
      studentName: selectedStudent?.name || studentSearch,
      grade: selectedStudent?.grade || "",
      section: selectedStudent?.section || "",
      dateStr,
      dayName: getArabicDayName(dateStr),
      reinforcements: selectedReinforcements,
      otherReinforcement,
      reason,
      createdAt: new Date().toISOString(),
      ...fields
    };

    let updated = [...existingLogs];
    const idx = updated.findIndex((x) => x.id === activeId);
    if (idx >= 0) {
      updated[idx] = newObj;
    } else {
      updated.push(newObj);
    }

    updateData({ studentReinforcements: updated });
  };

  const handleFieldChange = (updates: Partial<StudentReinforcementLog>) => {
    if (updates.studentName !== undefined) setStudentSearch(updates.studentName);
    if (updates.reinforcements !== undefined) setSelectedReinforcements(updates.reinforcements);
    if (updates.otherReinforcement !== undefined) setOtherReinforcement(updates.otherReinforcement);
    if (updates.reason !== undefined) setReason(updates.reason);

    // Persist
    saveDraft(updates);
  };

  const handleStudentSearchChange = (val: string) => {
    setStudentSearch(val);
    setSelectedStudent(null);
    setShowSuggestions(true);
  };

  // Confirm and Save to Archive (Submit form)
  const handleSubmitSave = () => {
    const studentName = selectedStudent?.name || studentSearch.trim();
    if (!studentName) {
      toast.error("الرجاء تحديد أو كتابة اسم الطالب أولاً");
      return;
    }
    if (selectedReinforcements.length === 0 && !otherReinforcement.trim()) {
      toast.error("الرجاء اختيار تعزيز واحد على الأقل أو كتابة تعزيز آخر");
      return;
    }
    if (!reason.trim()) {
      toast.error("الرجاء كتابة سبب التعزيز");
      return;
    }

    // Save final version
    const finalId = currentDraftId || crypto.randomUUID();
    const finalObj: StudentReinforcementLog = {
      id: finalId,
      userId: currentUser?.id || "",
      school: selectedSchool,
      branch: selectedBranch,
      studentId: selectedStudent?.id || "",
      studentName,
      grade: selectedStudent?.grade || "",
      section: selectedStudent?.section || "",
      dateStr,
      dayName: getArabicDayName(dateStr),
      reinforcements: selectedReinforcements,
      otherReinforcement,
      reason,
      createdAt: new Date().toISOString()
    };

    let updated = [...existingLogs];
    const idx = updated.findIndex((x) => x.id === finalId);
    if (idx >= 0) {
      updated[idx] = finalObj;
    } else {
      updated.push(finalObj);
    }

    updateData({ studentReinforcements: updated });

    toast.success("تم حفظ التعزيز في الأرشيف بنجاح");

    // Reset Form for next entry
    setCurrentDraftId(null);
    setStudentSearch("");
    setSelectedStudent(null);
    setSelectedReinforcements([]);
    setOtherReinforcement("");
    setReason("");
  };

  const handleApplyFilters = useCallback(() => {
    let results = existingLogs.filter((log) => {
      // Date Range Filter
      if (log.dateStr < archiveFilterFrom || log.dateStr > archiveFilterTo) return false;
      // Student Name Filter
      if (archiveFilterStudent.trim() && !log.studentName.includes(archiveFilterStudent.trim())) return false;
      // Reinforcement Type Filter
      if (archiveFilterType) {
        const hasStandard = log.reinforcements.includes(archiveFilterType);
        const hasOther = log.otherReinforcement === archiveFilterType;
        if (!hasStandard && !hasOther) return false;
      }
      // Must have studentName (exclude raw today drafts with empty studentName)
      if (!log.studentName) return false;

      // School & Branch filter according to active user scope
      if (selectedSchool && log.school !== selectedSchool) return false;
      if (selectedBranch && log.branch !== selectedBranch) return false;

      return true;
    });

    // Sort by date descending
    results.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    setArchiveResults(results);
    setSelectedArchiveRowIds([]);
  }, [
    existingLogs,
    archiveFilterFrom,
    archiveFilterTo,
    archiveFilterStudent,
    archiveFilterType,
    selectedSchool,
    selectedBranch
  ]);

  useEffect(() => {
    if (showArchive) {
      handleApplyFilters();
    }
  }, [showArchive, existingLogs, handleApplyFilters]);

  const handleDeleteRecord = (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل من الأرشيف؟")) return;
    const updated = existingLogs.filter((x) => x.id !== id);
    updateData({ studentReinforcements: updated });
    toast.success("تم حذف السجل بنجاح");
    if (archiveResults) {
      setArchiveResults(archiveResults.filter((x) => x.id !== id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedArchiveRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!archiveResults) return;
    if (selectedArchiveRowIds.length === archiveResults.length) {
      setSelectedArchiveRowIds([]);
    } else {
      setSelectedArchiveRowIds(archiveResults.map((x) => x.id));
    }
  };

  // Styled Excel Export
  const handleExportExcel = async () => {
    if (!archiveResults || archiveResults.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const listToExport =
      selectedArchiveRowIds.length > 0
        ? archiveResults.filter((r) => selectedArchiveRowIds.includes(r.id))
        : archiveResults;

    const headers = [
      "م",
      "اسم الطالب",
      "الصف",
      "الشعبة",
      "تاريخ التعزيز",
      "اليوم",
      "التعزيزات المحددة",
      "تعزيزات أخرى",
      "سبب التعزيز"
    ];

    const exportData = listToExport.map((r, idx) => [
      idx + 1,
      r.studentName,
      r.grade || "---",
      r.section || "---",
      r.dateStr,
      r.dayName || "---",
      r.reinforcements.join("، ") || "---",
      r.otherReinforcement || "---",
      r.reason
    ]);

    await exportToStyledExcel({
      title: "سجل التعزيزات والمكافآت للطلاب",
      filename: `Student_Reinforcements_Report_${today}`,
      headers,
      data: exportData,
      columnWidths: [6, 25, 12, 12, 16, 12, 40, 25, 40],
      profile: {
        ministry: data.profile?.ministry,
        district: data.profile?.district,
        schoolName: selectedSchool || data.profile?.schoolName,
        branch: selectedBranch || data.profile?.branch,
        branchManager: data.profile?.branchManager,
        writerName: currentUser?.name
      },
      date: today,
      swapFooterSides: true,
      managerLabel: "مدير الفرع"
    });
  };

  // WhatsApp Message Generation
  const handleExportWhatsApp = () => {
    if (!archiveResults || archiveResults.length === 0) {
      toast.error("لا توجد بيانات للإرسال");
      return;
    }

    const itemsToSend =
      selectedArchiveRowIds.length > 0
        ? archiveResults.filter((r) => selectedArchiveRowIds.includes(r.id))
        : archiveResults;

    let msg = `*📋 سجل التعزيزات والمكافآت للطلاب 📋*\n\n`;
    msg += `📅 *تاريخ التقرير:* ${today} (${getArabicDayName(today)})\n`;
    msg += `🏢 *المدرسة:* ${selectedSchool || "---"}\n`;
    msg += `📍 *الفرع:* ${selectedBranch || "---"}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

    itemsToSend.forEach((item, idx) => {
      msg += `*👤 الطالب (${idx + 1}):* ${item.studentName}\n`;
      msg += `🎓 *الصف والشعبة:* ${item.grade || "---"} / ${item.section || "---"}\n`;
      msg += `📅 *تاريخ التعزيز:* ${item.dateStr} (${item.dayName || "---"})\n`;
      if (item.reinforcements && item.reinforcements.length > 0) {
        msg += `🌟 *التعزيزات:* ${item.reinforcements.join("، ")}\n`;
      }
      if (item.otherReinforcement && item.otherReinforcement.trim()) {
        msg += `✨ *تعزيزات أخرى:* ${item.otherReinforcement}\n`;
      }
      msg += `📝 *سبب التعزيز:* ${item.reason}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━\n`;
    });

    // Add Signature Footer
    msg += `\n✍️ *كاتب التقرير:* ${currentUser?.name || "..."}\n`;
    msg += `🧑‍💼 *مدير الفرع:* ${data.profile?.branchManager || "..."}\n`;
    msg += `----------------------------------\n`;
    msg += `${getReportMessageFooter(today)}\n`;

    shareViaWhatsApp(msg);
  };

  return (
    <div className="space-y-6 font-arabic max-w-6xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right">
      {/* Top Buttons Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        {!showArchive ? (
          <>
            <button
              onClick={handleSubmitSave}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Save size={18} />
              حفظ العمل في أرشيف التعزيزات
            </button>
            <button
              onClick={() => {
                setShowArchive(true);
                setArchiveResults(null);
                setSelectedArchiveRowIds([]);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition-colors"
            >
              <Archive size={18} />
              أرشيف التعزيزات
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowArchive(false)}
            className="btn-secondary bg-slate-100 font-bold px-6 py-3 rounded-xl"
          >
            العودة لنموذج الإدخال
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="mr-auto btn-secondary bg-slate-100 text-slate-600 font-bold px-6 py-3 rounded-xl hover:bg-slate-200"
          >
            العودة للتقارير الخاصة
          </button>
        )}
      </div>

      {!showArchive ? (
        // FORM VIEW
        <div className="space-y-6">
          {/* General Data Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Calendar size={20} className="text-emerald-600" />
                البيانات العامة للتعزيز
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {/* School Select */}
              <div>
                <label className="text-sm text-slate-500 block mb-1">اسم المدرسة</label>
                <select
                  className="input-field w-full p-2 border rounded-lg font-bold"
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    handleFieldChange({ school: e.target.value });
                  }}
                  disabled={allowedSchools.length <= 1}
                >
                  {allowedSchools.map((s, idx) => (
                    <option key={`school-${s}-${idx}`} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Select */}
              <div>
                <label className="text-sm text-slate-500 block mb-1">الفرع</label>
                <select
                  className="input-field w-full p-2 border rounded-lg font-bold"
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    handleFieldChange({ branch: e.target.value });
                  }}
                  disabled={allowedBranches.length <= 1}
                >
                  {allowedBranches.map((b, idx) => (
                    <option key={`branch-${b}-${idx}`} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Name Input (Autocomplete) */}
              <div className="relative">
                <label className="text-sm text-slate-500 block mb-1">اسم الطالب</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field w-full p-2 border rounded-lg font-bold pl-8 text-right"
                    placeholder="اكتب اسم أو جزء من اسم الطالب..."
                    value={studentSearch}
                    onChange={(e) => {
                      handleStudentSearchChange(e.target.value);
                      handleFieldChange({ studentName: e.target.value });
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>

                {/* Suggestions List */}
                {showSuggestions && studentSuggestions.length > 0 && (
                  <div className="absolute right-0 left-0 bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                    {studentSuggestions.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStudent(s);
                          setStudentSearch(s.name);
                          setShowSuggestions(false);
                          // Auto-persist chosen student details
                          saveDraft({
                            studentId: s.id,
                            studentName: s.name,
                            grade: s.grade,
                            section: s.section
                          });
                        }}
                        className="w-full text-right p-3 hover:bg-slate-50 font-bold border-b last:border-0 text-sm flex justify-between"
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-slate-400">
                          {s.grade} / {s.section}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date & Arabic Day Name */}
              <div>
                <label className="text-sm text-slate-500 block mb-1">تاريخ التعزيز</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => {
                      setDateStr(e.target.value);
                      handleFieldChange({ dateStr: e.target.value, dayName: getArabicDayName(e.target.value) });
                    }}
                    className="input-field p-2 border rounded-lg font-bold flex-1"
                  />
                  <span className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-black text-xs min-w-[70px] text-center border">
                    {getArabicDayName(dateStr) || "..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Read-only Grade/Section Area */}
            {selectedStudent && (
              <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-6 bg-slate-50/50 border-t border-slate-100">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">الصف الدراسي</label>
                  <div className="font-bold text-slate-700 bg-slate-100 border rounded-lg px-3 py-2 text-sm">
                    {selectedStudent.grade || "---"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">الشعبة الدراسية</label>
                  <div className="font-bold text-slate-700 bg-slate-100 border rounded-lg px-3 py-2 text-sm">
                    {selectedStudent.section || "---"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reinforcements Dropdown & Custom Inputs Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Custom Multi-select Dropdown Selector */}
            <div className="relative">
              <label className="text-sm font-bold text-slate-700 block mb-2">
                اختر التعزيزات والمكافآت للبرنامج الميداني
              </label>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full p-4 border rounded-xl bg-slate-50 font-bold hover:bg-slate-100 transition-colors flex justify-between items-center text-slate-700 text-sm shadow-sm"
              >
                <div className="flex flex-wrap gap-1 text-right">
                  {selectedReinforcements.length > 0 ? (
                    selectedReinforcements.map((item) => (
                      <span
                        key={item}
                        className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1 font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newList = selectedReinforcements.filter((x) => x !== item);
                          handleFieldChange({ reinforcements: newList });
                        }}
                      >
                        {item}
                        <X size={12} className="hover:text-red-500 cursor-pointer" />
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 font-bold">انقر هنا لعرض واختيار قائمة التعزيزات والمكافآت...</span>
                  )}
                </div>
                <ChevronDown size={18} className="text-slate-500 shrink-0" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 left-0 bg-white border border-slate-200 mt-2 rounded-2xl shadow-xl z-50 p-4 max-h-[60vh] overflow-y-auto space-y-6">
                  {/* Category 1: Moral */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-blue-600 border-b pb-1 text-right">
                      التعزيزات المعنوية
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {moralItems.map((item) => {
                        const exists = selectedReinforcements.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              const newList = exists
                                ? selectedReinforcements.filter((x) => x !== item)
                                : [...selectedReinforcements, item];
                              handleFieldChange({ reinforcements: newList });
                            }}
                            className={`p-3 rounded-xl text-right font-bold border transition-all flex justify-between items-center text-xs ${
                              exists
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span>{item}</span>
                            {exists && <Check size={16} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 2: Material */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-amber-600 border-b pb-1 text-right">
                      التعزيزات المادية
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {materialItems.map((item) => {
                        const exists = selectedReinforcements.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              const newList = exists
                                ? selectedReinforcements.filter((x) => x !== item)
                                : [...selectedReinforcements, item];
                              handleFieldChange({ reinforcements: newList });
                            }}
                            className={`p-3 rounded-xl text-right font-bold border transition-all flex justify-between items-center text-xs ${
                              exists
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span>{item}</span>
                            {exists && <Check size={16} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg"
                    >
                      إغلاق القائمة
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Other Reinforcements Custom Input */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">
                تعزيزات أخرى غير ما سبق
              </label>
              <textarea
                value={otherReinforcement}
                onChange={(e) => handleFieldChange({ otherReinforcement: e.target.value })}
                placeholder="اكتب هنا أي تعزيزات أخرى من خارج المنسدلة..."
                className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white transition-all text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            {/* Reason for Reinforcement */}
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-2">
                سبب التعزيز
              </label>
              <textarea
                value={reason}
                onChange={(e) => handleFieldChange({ reason: e.target.value })}
                placeholder="اكتب تفاصيل سبب التعزيز والسلوك الإيجابي المرصود للطالب..."
                className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white transition-all text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>
      ) : (
        // ARCHIVE VIEW
        <div className="space-y-6">
          {/* Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-6 border-b pb-3">
              <Filter className="text-blue-500" />
              مرشحات البحث والتصفية في الأرشيف
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={archiveFilterFrom}
                  onChange={(e) => setArchiveFilterFrom(e.target.value)}
                  className="input-field p-2 border rounded-lg font-bold w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={archiveFilterTo}
                  onChange={(e) => setArchiveFilterTo(e.target.value)}
                  className="input-field p-2 border rounded-lg font-bold w-full"
                />
              </div>
              <div className="relative">
                <label className="text-xs text-slate-500 block mb-1">اسم الطالب</label>
                <input
                  type="text"
                  placeholder="ابحث باسم الطالب..."
                  value={archiveFilterStudent}
                  onChange={(e) => {
                    setArchiveFilterStudent(e.target.value);
                    setShowArchiveSuggestions(true);
                  }}
                  onFocus={() => setShowArchiveSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowArchiveSuggestions(false), 200)}
                  className="input-field p-2 border rounded-lg font-bold w-full text-right"
                />
                {showArchiveSuggestions && archiveStudentSuggestions.length > 0 && (
                  <div className="absolute right-0 left-0 bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 text-right">
                    {archiveStudentSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setArchiveFilterStudent(name);
                          setShowArchiveSuggestions(false);
                        }}
                        className="w-full text-right p-3 hover:bg-slate-50 font-bold border-b last:border-0 text-sm"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">نوع التعزيز</label>
                <select
                  value={archiveFilterType}
                  onChange={(e) => setArchiveFilterType(e.target.value)}
                  className="input-field p-2 border rounded-lg font-bold w-full"
                >
                  <option value="">كل أنواع التعزيزات</option>
                  {recordedTypes.map((type, idx) => (
                    <option key={`type-${type}-${idx}`} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={handleApplyFilters}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black transition-all shadow-md active:scale-95 text-sm"
                >
                  موافق
                </button>
              </div>
            </div>
          </div>

          {/* Results Table Card */}
          {archiveResults !== null && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Database className="text-blue-500" />
                  النتائج المطابقة ({archiveResults.length} سجل)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-colors text-xs"
                  >
                    <FileSpreadsheet size={16} />
                    تصدير إكسل
                  </button>
                  <button
                    onClick={handleExportWhatsApp}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-colors text-xs"
                  >
                    <MessageCircle size={16} />
                    إرسال واتساب
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-black text-sm border-b">
                      <th className="p-4 w-12 text-center border-e">
                        <input
                          type="checkbox"
                          checked={
                            archiveResults.length > 0 &&
                            selectedArchiveRowIds.length === archiveResults.length
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded text-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4 border-e">#</th>
                      <th className="p-4 border-e">اسم الطالب</th>
                      <th className="p-4 border-e">الصف والشعبة</th>
                      <th className="p-4 border-e">تاريخ اليوم</th>
                      <th className="p-4 border-e">التعزيزات المحددة</th>
                      <th className="p-4 border-e">تعزيزات أخرى</th>
                      <th className="p-4 border-e">سبب التعزيز</th>
                      <th className="p-4 text-center w-16">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600 font-bold text-xs">
                    {archiveResults.map((row, idx) => {
                      const isSelected = selectedArchiveRowIds.includes(row.id);
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                            isSelected ? "bg-orange-50/50" : ""
                          }`}
                          onClick={() => toggleSelectRow(row.id)}
                        >
                          <td
                            className="p-4 text-center border-e"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(row.id)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 border-e">{idx + 1}</td>
                          <td className="p-4 border-e font-black text-slate-800">
                            {row.studentName}
                          </td>
                          <td className="p-4 border-e">
                            {row.grade || "---"} / {row.section || "---"}
                          </td>
                          <td className="p-4 border-e">
                            {row.dateStr} ({row.dayName || "---"})
                          </td>
                          <td className="p-4 border-e whitespace-normal max-w-xs leading-relaxed">
                            {row.reinforcements.join("، ") || "---"}
                          </td>
                          <td className="p-4 border-e whitespace-normal max-w-xs">
                            {row.otherReinforcement || "---"}
                          </td>
                          <td className="p-4 border-e whitespace-normal max-w-sm leading-relaxed">
                            {row.reason}
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteRecord(row.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف من الأرشيف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {archiveResults.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500 font-black">
                          لا توجد نتائج مطابقة لمرشحات البحث الحالية.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
