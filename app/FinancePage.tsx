import React, { useState, useMemo, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Wallet,
  Search,
  X,
  CheckCircle,
  MessageSquare,
  Phone,
  MessageCircle,
  Save,
  Archive,
  Calendar,
  Briefcase,
  Users,
  AlertCircle,
  ChevronDown,
  Trash2,
  Share2
} from "lucide-react";
import { toast } from "sonner";
import { FinanceReport, FinanceStudentItem } from "../types";

export const FinancePage: React.FC = () => {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const today = new Date().toISOString().split("T")[0];

  const isAdminOrFull =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  // 1. Dropdown Options & Filters based on Permissions
  const schoolsToDisplay = useMemo(() => {
    if (isAdminOrFull) return (data.availableSchools || []).filter(Boolean);
    return (currentUser?.selectedSchool?.split(",") || [])
      .map((s) => s.trim())
      .filter(Boolean);
  }, [data.availableSchools, currentUser, isAdminOrFull]);

  const [selectedSchool, setSelectedSchool] = useState(schoolsToDisplay[0] || "");

  const branchesToDisplay = useMemo(() => {
    if (!selectedSchool) return [];
    const allBranches = data.schoolBranches?.[selectedSchool] || [];
    if (isAdminOrFull) return allBranches;
    const userBranches =
      currentUser?.permissions?.schoolsAndBranches?.[selectedSchool] || [];
    return userBranches.length > 0 ? userBranches : allBranches;
  }, [selectedSchool, data.schoolBranches, currentUser, isAdminOrFull]);

  const [selectedBranch, setSelectedBranch] = useState(branchesToDisplay[0] || "");

  useEffect(() => {
    if (branchesToDisplay.length > 0 && !branchesToDisplay.includes(selectedBranch)) {
      setSelectedBranch(branchesToDisplay[0]);
    }
  }, [branchesToDisplay, selectedBranch]);

  const gradesToDisplay = useMemo(() => {
    const allGrades = [
      "تمهيدي",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12"
    ];
    if (isAdminOrFull) return allGrades;
    return currentUser?.grades && currentUser.grades.length > 0
      ? currentUser.grades
      : allGrades;
  }, [currentUser, isAdminOrFull]);

  const [selectedGrade, setSelectedGrade] = useState("الجميع");

  const sectionsToDisplay = useMemo(() => {
    const allSections = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];
    if (isAdminOrFull) return allSections;
    return currentUser?.sections && currentUser.sections.length > 0
      ? currentUser.sections
      : allSections;
  }, [currentUser, isAdminOrFull]);

  const [selectedSection, setSelectedSection] = useState("الجميع");

  // 2. Student Search & Multiselect
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [selectedStudentsList, setSelectedStudentsList] = useState<any[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Filter available students from shou'un al-tullab based on selected school/branch
  const eligibleStudents = useMemo(() => {
    const allStudents = data.secretariatStudents || [];
    return allStudents.filter((s: any) => {
      const matchSchool = s.school === selectedSchool;
      const matchBranch = !selectedBranch || s.branch === selectedBranch;
      const matchGrade = selectedGrade === "الجميع" || s.grade === selectedGrade;
      const matchSection = selectedSection === "الجميع" || s.section === selectedSection;
      return matchSchool && matchBranch && matchGrade && matchSection;
    });
  }, [data.secretariatStudents, selectedSchool, selectedBranch, selectedGrade, selectedSection]);

  // Autocomplete Suggestions
  const searchSuggestions = useMemo(() => {
    if (!studentSearchInput.trim()) return [];
    const query = studentSearchInput.toLowerCase();
    return eligibleStudents.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(query) &&
        !selectedStudentsList.some((sel) => sel.id === s.id)
    );
  }, [studentSearchInput, eligibleStudents, selectedStudentsList]);

  const handleSelectStudentSuggestion = (student: any) => {
    setSelectedStudentsList((prev) => [...prev, student]);
    setStudentSearchInput("");
    setShowSearchSuggestions(false);
  };

  const handleRemoveSelectedStudent = (studentId: string) => {
    setSelectedStudentsList((prev) => prev.filter((s) => s.id !== studentId));
  };

  // 3. Message Template & Date
  const [messageText, setMessageText] = useState("");
  const [messageDate, setMessageDate] = useState(today);

  // 4. Main State for Prepared Table
  const [tableData, setTableData] = useState<any[]>([]);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Checkbox state for group messages
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  // 5. Preparation Submit Action
  const handlePrepareTable = () => {
    if (!selectedSchool) {
      toast.error("يرجى اختيار المدرسة أولاً");
      return;
    }

    // Determine target students
    let targetStudents = [];
    if (selectedStudentsList.length > 0) {
      targetStudents = [...selectedStudentsList];
    } else {
      targetStudents = [...eligibleStudents];
    }

    if (targetStudents.length === 0) {
      toast.warning("لا يوجد طلاب مطابقون للخيارات المحددة");
      setTableData([]);
      setIsTableVisible(false);
      return;
    }

    // Construct table items matching student schema
    const formattedItems = targetStudents.map((st: any) => {
      return {
        id: st.id,
        studentName: st.name || "",
        guardianName: st.guardianInfo || "",
        phone: st.guardianPhone || st.phone || "",
        paidAmount: "",
        requestedAmount: ""
      };
    });

    setTableData(formattedItems);
    setIsTableVisible(true);

    // Default select all rows for group message
    const initialSelected: Record<string, boolean> = {};
    formattedItems.forEach((item) => {
      initialSelected[item.id] = true;
    });
    setSelectedRowIds(initialSelected);
    setSelectedRowId(null);
  };

  // Select all checkbox handler
  const handleToggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    tableData.forEach((item) => {
      updated[item.id] = checked;
    });
    setSelectedRowIds(updated);
  };

  const isAllSelected =
    tableData.length > 0 && tableData.every((item) => selectedRowIds[item.id]);

  const handleToggleRowSelect = (id: string) => {
    setSelectedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Change amount values in table row
  const handleAmountChange = (
    id: string,
    field: "paidAmount" | "requestedAmount",
    value: string
  ) => {
    setTableData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // 6. Message Generators
  const buildSMSMessage = (item: any) => {
    let msg = messageText;
    if (item.paidAmount && item.paidAmount.trim()) {
      msg += ` والمبلغ المدفوع إلى الآن هو (${item.paidAmount.trim()})`;
    }
    if (item.requestedAmount && item.requestedAmount.trim()) {
      msg += ` والمبلغ المطلوب حاليا هو (${item.requestedAmount.trim()})`;
    }
    msg += ` مدارس ${selectedSchool}`;
    if (selectedBranch) {
      msg += ` ${selectedBranch.startsWith("فرع") ? selectedBranch : `فرع ${selectedBranch}`}`;
    }
    msg += ` - ${getReportMessageFooter(messageDate).split(" - ")[0]}`; // Append the day & date segment of footer
    return msg;
  };

  const buildWhatsAppMessage = (item: any) => {
    let msg = `*💵 إشعار مالي ومطالبة رسوم*\n\n`;
    msg += `👤 *اسم الطالب:* ${item.studentName}\n`;
    msg += `💬 *الرسالة:* ${messageText}\n`;
    if (item.paidAmount && item.paidAmount.trim()) {
      msg += `💵 *المبلغ المدفوع إلى الآن هو:* ${item.paidAmount.trim()}\n`;
    }
    if (item.requestedAmount && item.requestedAmount.trim()) {
      msg += `💰 *المبلغ المطلوب حاليا هو:* ${item.requestedAmount.trim()}\n`;
    }
    msg += `\n*━━━━━━━━━━━━━━━━━━━━━*\n`;
    msg += `🏫 ${getReportMessageFooter(messageDate)}`;
    return msg;
  };

  const buildGroupWhatsAppMessage = () => {
    const selectedItems = tableData.filter((item) => selectedRowIds[item.id]);
    if (selectedItems.length === 0) return "";

    const studentBlocks = selectedItems.map((item) => {
      let block = `👤 *اسم الطالب:* ${item.studentName}\n`;
      block += `💬 *الرسالة:* ${messageText}\n`;
      if (item.paidAmount && item.paidAmount.trim()) {
        block += `💵 *المبلغ المدفوع إلى الآن هو:* ${item.paidAmount.trim()}\n`;
      }
      if (item.requestedAmount && item.requestedAmount.trim()) {
        block += `💰 *المبلغ المطلوب حاليا هو:* ${item.requestedAmount.trim()}\n`;
      }
      block += `🏫 ${getReportMessageFooter(messageDate)}`;
      return block;
    });

    return studentBlocks.join("\n\n*━━━━━━━━━━━━━━━━━━━━━*\n\n");
  };

  // 7. Actions (Individual & Group)
  const handleSendSMS = (item: any) => {
    if (!item.phone) {
      toast.error("لا يوجد رقم هاتف مسجل لولي الأمر");
      return;
    }
    const body = buildSMSMessage(item);
    window.open(`sms:${item.phone}?body=${encodeURIComponent(body)}`, "_blank");
  };

  const handleSendWhatsAppSingle = (item: any) => {
    if (!item.phone) {
      toast.error("لا يوجد رقم هاتف مسجل لولي الأمر");
      return;
    }
    const body = buildWhatsAppMessage(item);
    shareViaWhatsApp(body, item.phone);
  };

  const handleCallPhone = (item: any) => {
    if (!item.phone) {
      toast.error("لا يوجد رقم هاتف مسجل لولي الأمر");
      return;
    }
    window.open(`tel:${item.phone}`, "_blank");
  };

  const handleSendWhatsAppGroup = () => {
    const body = buildGroupWhatsAppMessage();
    if (!body) {
      toast.error("يرجى تحديد طالب واحد على الأعل من الجدول");
      return;
    }
    shareViaWhatsApp(body);
  };

  // 8. Auto-Saving & Persistence
  const activeReportIdRef = React.useRef<string | null>(null);

  const saveWork = (itemsToSave: any[] = tableData, showToast: boolean = false) => {
    if (!selectedSchool || itemsToSave.length === 0) return;

    const existingReports = data.financeRecords || [];
    const reportId = activeReportIdRef.current || crypto.randomUUID();
    activeReportIdRef.current = reportId;

    const reportObj: FinanceReport = {
      id: reportId,
      userId: currentUser?.id || "",
      school: selectedSchool,
      branch: selectedBranch,
      grade: selectedGrade,
      section: selectedSection,
      dateStr: messageDate,
      messageText: messageText,
      items: itemsToSave.map((it) => ({
        id: it.id,
        studentId: it.id,
        studentName: it.studentName,
        guardianName: it.guardianName,
        phone: it.phone,
        paidAmount: it.paidAmount,
        requestedAmount: it.requestedAmount
      })),
      createdAt: new Date().toISOString()
    };

    let updatedList = [...existingReports];
    const idx = updatedList.findIndex((r) => r.id === reportId);
    if (idx >= 0) {
      updatedList[idx] = reportObj;
    } else {
      updatedList.push(reportObj);
    }

    updateData({ financeRecords: updatedList });
    if (showToast) {
      toast.success("تم حفظ كشف المطالبة المالية بنجاح");
    }
  };

  // Auto-save debouncer
  useEffect(() => {
    if (isTableVisible && tableData.length > 0) {
      const timer = setTimeout(() => {
        saveWork(tableData, false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tableData, messageText, messageDate, isTableVisible]);

  // 9. Archives View
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearchName, setArchiveSearchName] = useState("");
  const [archiveSearchDate, setArchiveSearchDate] = useState("");
  const [archiveResults, setArchiveResults] = useState<FinanceReport[] | null>(null);

  const handleSearchArchive = () => {
    const allRecords = data.financeRecords || [];
    let filtered = allRecords.filter((rec) => {
      const matchUser = rec.userId === currentUser?.id || isAdminOrFull;
      if (!matchUser) return false;

      const nameQuery = archiveSearchName.trim().toLowerCase();
      const dateQuery = archiveSearchDate.trim();

      const matchName =
        !nameQuery ||
        rec.items.some((it) => it.studentName.toLowerCase().includes(nameQuery)) ||
        rec.school.toLowerCase().includes(nameQuery) ||
        rec.branch.toLowerCase().includes(nameQuery);

      const matchDate = !dateQuery || rec.dateStr === dateQuery;

      return matchName && matchDate;
    });

    // Sort by created date descending
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setArchiveResults(filtered);
  };

  const handleOpenArchivedReport = (report: FinanceReport) => {
    activeReportIdRef.current = report.id;
    setSelectedSchool(report.school);
    setSelectedBranch(report.branch);
    setSelectedGrade(report.grade);
    setSelectedSection(report.section);
    setMessageDate(report.dateStr);
    setMessageText(report.messageText);

    // Parse items to table
    const tableItems = report.items.map((it) => ({
      id: it.studentId,
      studentName: it.studentName,
      guardianName: it.guardianName,
      phone: it.phone,
      paidAmount: it.paidAmount,
      requestedAmount: it.requestedAmount
    }));

    setTableData(tableItems);
    setIsTableVisible(true);

    // Default select all
    const initialSelected: Record<string, boolean> = {};
    tableItems.forEach((item) => {
      initialSelected[item.id] = true;
    });
    setSelectedRowIds(initialSelected);

    setShowArchive(false);
    setSelectedRowId(null);
    toast.success(`تم استيراد الكشف المالي المؤرشف بتاريخ ${report.dateStr}`);
  };

  return (
    <div className="space-y-6 font-arabic text-right max-w-7xl mx-auto p-2" dir="rtl">
      {/* Top Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top duration-300">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Wallet size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">إدارة المطالبات والرسوم المالية</h2>
            <p className="text-xs text-slate-500 mt-1">تحديد المبالغ المالية وإرسال إشعارات الدفع والرسائل للطلاب وأولياء أمورهم</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowArchive(true);
              setArchiveResults(data.financeRecords || []);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl font-bold hover:bg-orange-100 transition-all text-sm"
          >
            <Archive size={18} />
            أرشيف الرسائل الكشوفات
          </button>
        </div>
      </div>

      {showArchive ? (
        /* ARCHIVE SUB-VIEW */
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Archive className="text-orange-500" size={22} />
              أرشيف الرسائل المالية والكشوفات
            </h3>
            <button
              onClick={() => setShowArchive(false)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">اسم الطالب أو المدرسة</label>
              <div className="relative">
                <input
                  type="text"
                  value={archiveSearchName}
                  onChange={(e) => setArchiveSearchName(e.target.value)}
                  placeholder="ابحث بالاسم أو الفرع..."
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <Search size={18} className="absolute right-3 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ الكشف</label>
              <input
                type="date"
                value={archiveSearchDate}
                onChange={(e) => setArchiveSearchDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearchArchive}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all text-sm"
              >
                بحث وموافق
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archiveResults &&
              archiveResults.map((rec) => (
                <div
                  key={rec.id}
                  className="border-2 border-slate-100 rounded-2xl p-4 hover:border-blue-200 transition-colors flex flex-col bg-white shadow-sm"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-sm">
                      <Calendar size={16} className="text-blue-500" />
                      {rec.dateStr}
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">
                      {rec.items.length} طالب
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-base mb-1 truncate">
                    {rec.school}
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 font-semibold">
                    الفرع: {rec.branch || "--"} | الصف: {rec.grade} | الشعبة: {rec.section}
                  </p>
                  <div className="mt-auto border-t pt-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      تاريخ الإنشاء: {new Date(rec.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                    <button
                      onClick={() => handleOpenArchivedReport(rec)}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition-colors"
                    >
                      فتح الرسائل
                    </button>
                  </div>
                </div>
              ))}

            {(!archiveResults || archiveResults.length === 0) && (
              <div className="col-span-full py-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed">
                لا توجد سجلات مؤرشفة مطابقة للبحث
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MAIN FINANCE EDITOR VIEW */
        <div className="space-y-6">
          {/* 1. Basic Info Section */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <h3 className="font-black text-slate-700 flex items-center gap-2 mb-5 pb-3 border-b border-slate-50">
              <Briefcase size={20} className="text-blue-500" />
              البيانات الأساسية للمستلمين
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">اسم المدرسة</label>
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    setSelectedStudentsList([]);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  {schoolsToDisplay.map((sch) => (
                    <option key={sch} value={sch}>
                      {sch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">اسم الفرع</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedStudentsList([]);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  {branchesToDisplay.map((br) => (
                    <option key={br} value={br}>
                      {br}
                    </option>
                  ))}
                  {branchesToDisplay.length === 0 && <option value="">بدون فروع</option>}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">الصف</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setSelectedStudentsList([]);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="الجميع">الكل / الجميع</option>
                  {gradesToDisplay.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">الشعبة</label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setSelectedStudentsList([]);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="الجميع">الكل / الجميع</option>
                  {sectionsToDisplay.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
              {/* Multiselect Student Search */}
              <div className="md:col-span-6 space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 block">اسم الطالب (لتحديد طلاب معينين)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentSearchInput}
                    onChange={(e) => {
                      setStudentSearchInput(e.target.value);
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => setShowSearchSuggestions(true)}
                    placeholder="اكتب اسم الطالب للبحث والاختيار..."
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <Search size={18} className="absolute right-3 top-3 text-slate-400" />
                </div>

                {/* Suggestions Dropdown */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1">
                    {searchSuggestions.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleSelectStudentSuggestion(st)}
                        className="w-full text-right px-4 py-3 hover:bg-slate-50 text-sm font-semibold text-slate-700 border-b last:border-0 flex justify-between items-center"
                      >
                        <span>{st.name}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          {st.grade} - {st.section}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {showSearchSuggestions && studentSearchInput.trim() && searchSuggestions.length === 0 && (
                  <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 text-center text-xs text-slate-400 z-50">
                    لا يوجد طلاب مطابقون للبحث في شؤون طلاب هذه المدرسة/الفرع
                  </div>
                )}

                {/* Selected Students Badges */}
                {selectedStudentsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedStudentsList.map((st) => (
                      <span
                        key={st.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-black"
                      >
                        {st.name}
                        <button
                          onClick={() => handleRemoveSelectedStudent(st.id)}
                          className="hover:bg-blue-100 text-blue-500 rounded-full p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => setSelectedStudentsList([])}
                      className="text-xs text-red-500 font-bold hover:underline self-center"
                    >
                      حذف الكل
                    </button>
                  </div>
                )}
              </div>

              {/* Message Date Input */}
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ الرسالة</label>
                <input
                  type="date"
                  value={messageDate}
                  onChange={(e) => setMessageDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                />
              </div>

              {/* Submit Prepare Button */}
              <div className="md:col-span-3 flex items-end">
                <button
                  onClick={handlePrepareTable}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Users size={16} />
                  موافق (تحضير الجدول)
                </button>
              </div>
            </div>

            {/* Message Template textarea */}
            <div className="mt-5">
              <label className="text-xs font-bold text-slate-500 block mb-1">نص الرسالة الأساسي</label>
              <textarea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="اكتب نص الإشعار هنا... سيتم إرفاق قيم المبلغ المدفوع والمطلوب وتوقيع المدرسة تلقائياً في نهاية الرسالة لكل طالب"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* 2. Table Section */}
          {isTableVisible && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-700 flex items-center gap-2">
                    <Users size={20} className="text-blue-500" />
                    كشف المطالبة المالية المستهدف ({tableData.length} طالب)
                  </h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => saveWork(tableData, true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-xs shadow-md shadow-blue-100"
                  >
                    <Save size={16} />
                    حفظ الكشف يدوياً
                  </button>
                  <button
                    onClick={handleSendWhatsAppGroup}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-all text-xs"
                  >
                    <Share2 size={16} />
                    رسالة واتس جماعية
                  </button>
                </div>
              </div>

              {/* Main Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-100 text-xs font-bold">
                      <th className="p-4 text-center w-12">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4 w-12 text-center">الرقم</th>
                      <th className="p-4">اسم الطالب</th>
                      <th className="p-4">اسم ولي أمره</th>
                      <th className="p-4">رقم الهاتف</th>
                      <th className="p-4 w-40">المبلغ المدفوع (ريال)</th>
                      <th className="p-4 w-40">المبلغ المطلوب (ريال)</th>
                      <th className="p-4 text-center w-36">إرسال وإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, idx) => {
                      const isRowSelected = selectedRowIds[row.id] || false;
                      const isHighlighted = selectedRowId === row.id;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedRowId(row.id)}
                          style={{
                            backgroundColor: isHighlighted ? "#ffedd5" : "transparent"
                          }}
                          className={`border-b last:border-0 border-slate-100 hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer`}
                        >
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleRowSelect(row.id)}
                              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 text-center font-bold text-slate-500 text-xs">
                            {idx + 1}
                          </td>
                          <td className="p-4 font-black text-slate-700 text-sm">
                            {row.studentName}
                          </td>
                          <td className="p-4 text-slate-600 text-sm font-semibold">
                            {row.guardianName || "--"}
                          </td>
                          <td className="p-4 text-slate-600 text-sm font-bold tracking-wider">
                            {row.phone || "--"}
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={row.paidAmount}
                              onChange={(e) =>
                                handleAmountChange(row.id, "paidAmount", e.target.value)
                              }
                              placeholder="مثال: 50,000"
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-center bg-slate-50/30"
                            />
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={row.requestedAmount}
                              onChange={(e) =>
                                handleAmountChange(row.id, "requestedAmount", e.target.value)
                              }
                              placeholder="مثال: 25,000"
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-center bg-slate-50/30"
                            />
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              {/* SMS button */}
                              <button
                                onClick={() => handleSendSMS(row)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="إرسال رسالة SMS"
                              >
                                <MessageSquare size={18} />
                              </button>
                              {/* Phone Call button */}
                              <button
                                onClick={() => handleCallPhone(row)}
                                className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                title="اتصال مباشر هاتف"
                              >
                                <Phone size={18} />
                              </button>
                              {/* WhatsApp button */}
                              <button
                                onClick={() => handleSendWhatsAppSingle(row)}
                                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="إرسال عبر واتساب"
                              >
                                <MessageCircle size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

export default FinancePage;
