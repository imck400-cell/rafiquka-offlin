import React, { useState, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import { DeliveryReceiptReport, DeliveryReceiptItem } from "../types";
import {
  Calendar,
  Save,
  Archive,
  Filter,
  CheckCircle,
  Plus,
  Trash2,
  Briefcase,
  FileSpreadsheet,
  MessageCircle,
  FileText,
  ArrowRight,
  Database,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { toHijri } from "../src/lib/excelExport";
import { saveAs } from "file-saver";

interface Props {
  onClose?: () => void;
  initialShowFilter?: boolean;
}

export const DeliveryReceiptView: React.FC<Props> = ({ onClose, initialShowFilter = false }) => {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const today = new Date().toISOString().split("T")[0];

  const school =
    currentUser?.selectedSchool?.split(",")[0] ||
    data.profile?.schoolName ||
    "";

  const allowedBranches = React.useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      const staff = data.secretariatStaff || [];
      const schoolBrs = staff
        .filter((s) => String(s.school || "").trim() === school.trim())
        .map((s) => String(s.branch || "").trim())
        .filter(Boolean);
      const unique = Array.from(new Set(schoolBrs));
      return unique.length > 0 ? unique : ["بنين", "بنات"];
    }
    return currentUser?.permissions?.schoolsAndBranches?.[school] || [];
  }, [currentUser, school, data.secretariatStaff]);

  const [activeBranch, setActiveBranch] = useState<string>("");

  useEffect(() => {
    if (!activeBranch && allowedBranches.length > 0) {
      if (allowedBranches.length > 1) {
        setActiveBranch("الجميع");
      } else {
        setActiveBranch(allowedBranches[0]);
      }
    }
  }, [allowedBranches, activeBranch]);

  const existingReports = data.deliveryReceiptRecords || [];

  const [reportName, setReportName] = useState("كشف استلام وتسليم جديد");
  const [reportDate, setReportDate] = useState(today);

  // Filter criteria for Quick Apply
  const [applyBranch, setApplyBranch] = useState<string>("الجميع");
  const [applyGrades, setApplyGrades] = useState<string[]>([]);
  const [applySections, setApplySections] = useState<string[]>([]);
  const [applyFormCount, setApplyFormCount] = useState<string>("");
  const [applyReceiveDate, setApplyReceiveDate] = useState<string>(today);
  const [applyDeliveryDate, setApplyDeliveryDate] = useState<string>(today);
  const [applyNotes, setApplyNotes] = useState<string>("");
  const [applyStatus, setApplyStatus] = useState<
    "delivered" | "in_progress" | "not_delivered"
  >("in_progress");
  const [applyAction, setApplyAction] = useState<string>("تنبيه شفوي");

  const [items, setItems] = useState<DeliveryReceiptItem[]>([]);

  const displayedItems = React.useMemo(() => {
    return items.filter(item => {
      // Filter by School
      if (school && String(item.school || "").trim() !== school.trim()) return false;

      // Filter by Active Branch Selector
      if (activeBranch && activeBranch !== "الجميع") {
        if (String(item.branch || "").trim() !== activeBranch.trim()) return false;
      } else {
        if (!allowedBranches.includes(String(item.branch || "").trim())) return false;
      }

      // Filter by Grade and Subject permissions if not admin
      const isAdmin = currentUser?.role === "admin" || currentUser?.permissions?.all === true;
      if (!isAdmin) {
        const staffInfo = (data.secretariatStaff || []).find(
          (s: any) => s.name === item.teacherName && String(s.school || "").trim() === school.trim()
        );
        if (staffInfo) {
          const supervisorGrades = currentUser?.grades || [];
          if (supervisorGrades.length > 0) {
            const teacherGrades = staffInfo.grades || [];
            const hasGradeOverlap = teacherGrades.some((g: any) => supervisorGrades.includes(String(g).trim()));
            if (!hasGradeOverlap) return false;
          }
          const supervisorSubjects = currentUser?.subjects || [];
          if (supervisorSubjects.length > 0) {
            const teacherSubjects = staffInfo.subjects || [];
            const hasSubjectOverlap = teacherSubjects.some((sub: any) => supervisorSubjects.includes(String(sub).trim()));
            if (!hasSubjectOverlap) return false;
          }
        }
      }
      return true;
    });
  }, [items, school, activeBranch, allowedBranches, currentUser, data.secretariatStaff]);

  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const [showArchive, setShowArchive] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [dbCounts, setDbCounts] = useState<Record<string, string>>({});
  const [generalizeCount, setGeneralizeCount] = useState("");
  const [showFilter, setShowFilter] = useState(initialShowFilter);

  // Custom Dropdowns for Quick Apply
  const [showGradeSelect, setShowGradeSelect] = useState(false);
  const [showSectionSelect, setShowSectionSelect] = useState(false);

  // Active Rows Selection
  const [selectedActiveRowIds, setSelectedActiveRowIds] = useState<string[]>([]);

  // Filter Form State
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);
  const [filterSelectedReports, setFilterSelectedReports] = useState<string[]>([]);
  const [filterSelectedStatus, setFilterSelectedStatus] = useState<string[]>([]);
  const [filterSelectedActions, setFilterSelectedActions] = useState<string[]>([]);
  const [filterNotes, setFilterNotes] = useState("");
  const [filteredResults, setFilteredResults] = useState<
    | (DeliveryReceiptItem & {
        _parent: DeliveryReceiptReport;
        uniqueId: string;
      })[]
    | null
  >(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const supervisorName = currentUser?.name || "بدون اسم";
  const supervisorJob =
    currentUser?.jobTitle ||
    (currentUser?.role === "admin" ? "مدير نظام" : "مشرف إداري");
  const branch = activeBranch || currentUser?.selectedBranch || "";
  const academicYear =
    localStorage.getItem("selected_year") ||
    currentUser?.selectedYear ||
    data.availableYears?.[0] ||
    data.profile?.year ||
    "2024-2025";
  const grade =
    currentUser?.grades && currentUser.grades.length > 0
      ? currentUser.grades.join(", ")
      : "الجميع";
  const section =
    currentUser?.sections && currentUser.sections.length > 0
      ? currentUser.sections.join(", ")
      : "الجميع";

  // Helper to fetch day name in Arabic
  const getDayNameAr = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date(dateStr));
    } catch {
      return '';
    }
  };

  // Available Staff for Current User Scope
  const availableStaff = React.useMemo(() => {
    let staff = data.secretariatStaff || [];
    
    // 1. Filter by School
    staff = staff.filter(
      (s: any) => String(s.school || "").trim() === school.trim()
    );

    // 2. Filter by Active Branch Selector
    if (activeBranch && activeBranch !== "الجميع") {
      staff = staff.filter(
        (s: any) => String(s.branch || "").trim() === activeBranch.trim()
      );
    } else {
      staff = staff.filter((s: any) =>
        allowedBranches.includes(String(s.branch || "").trim())
      );
    }

    // 3. Filter by Grade and Subject permissions
    const isAdmin =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    if (!isAdmin) {
      // Grade overlap check
      const supervisorGrades = currentUser?.grades || [];
      if (supervisorGrades.length > 0) {
        staff = staff.filter((s: any) => {
          const teacherGrades = s.grades || [];
          return teacherGrades.some((g: any) => supervisorGrades.includes(String(g).trim()));
        });
      }
      // Subject overlap check
      const supervisorSubjects = currentUser?.subjects || [];
      if (supervisorSubjects.length > 0) {
        staff = staff.filter((s: any) => {
          const teacherSubjects = s.subjects || [];
          return teacherSubjects.some((sub: any) => supervisorSubjects.includes(String(sub).trim()));
        });
      }
    }
    return staff;
  }, [data.secretariatStaff, school, activeBranch, allowedBranches, currentUser]);

  const uniqueBranches = Array.from(
    new Set(availableStaff.map((s: any) => s.branch).filter(Boolean)),
  ) as string[];
  const uniqueGrades = Array.from(
    new Set(availableStaff.map((s: any) => s.grade).filter(Boolean)),
  ) as string[];
  const uniqueSections = Array.from(
    new Set(availableStaff.map((s: any) => s.section).filter(Boolean)),
  ) as string[];

  // Build items when creating a new report
  useEffect(() => {
    if (!activeReportId && !showArchive && !showFilter && items.length === 0) {
      const initialItems = availableStaff.map((s: any) => ({
        id: crypto.randomUUID(),
        teacherName: s.name || "",
        school: s.school || "",
        branch: s.branch || "",
        grade: s.grade || "",
        section: s.section || "",
        formCount: "",
        receiveDateStr: reportDate,
        deliveryDateStr: reportDate,
        status: null as any,
        actionTaken: null as any,
        notes: "",
      }));
      setItems(initialItems);
      setSelectedActiveRowIds([]);
    }
  }, [
    activeReportId,
    showArchive,
    showFilter,
    items.length,
    availableStaff,
    reportDate,
  ]);

  // Initialize dbCounts when availableStaff changes or modal opens
  useEffect(() => {
    if (isDatabaseModalOpen) {
      const initialCounts: Record<string, string> = {};
      availableStaff.forEach((s: any) => {
        const existingItem = items.find((item) => item.teacherName === s.name);
        if (existingItem && existingItem.formCount) {
          initialCounts[s.name] = existingItem.formCount;
        } else {
          initialCounts[s.name] = String(Math.max(1, (s.grades || []).length));
        }
      });
      setDbCounts(initialCounts);
      setGeneralizeCount("");
    }
  }, [isDatabaseModalOpen, availableStaff, items]);

  const handleApplyGeneralize = () => {
    if (!generalizeCount.trim()) {
      toast.warning("يرجى إدخال عدد للتعميم");
      return;
    }
    const updated = { ...dbCounts };
    Object.keys(updated).forEach((name) => {
      updated[name] = generalizeCount;
    });
    setDbCounts(updated);
    toast.success(`تم تعميم العدد ${generalizeCount} على جميع المعلمين`);
  };

  const handleSaveDatabaseCounts = (counts: Record<string, string>) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (counts[item.teacherName] !== undefined) {
          return {
            ...item,
            formCount: counts[item.teacherName],
          };
        }
        return item;
      })
    );
    setIsDatabaseModalOpen(false);
    toast.success("تم تطبيق أعداد النماذج من قاعدة البيانات بنجاح");
  };

  const saveWork = (
    currentItems: DeliveryReceiptItem[] = items,
    hideToast: boolean = false,
  ) => {
    if (currentItems.length === 0) return;
    const newObj: DeliveryReceiptReport = {
      id: activeReportId || crypto.randomUUID(),
      userId: currentUser?.id,
      reportName,
      school,
      branch,
      academicYear,
      supervisorName,
      supervisorJob,
      grade,
      section,
      dateStr: reportDate,
      items: currentItems,
      createdAt: new Date().toISOString(),
    };

    let updatedRecords = [...existingReports];
    if (activeReportId) {
      const idx = updatedRecords.findIndex((t) => t.id === activeReportId);
      if (idx >= 0) updatedRecords[idx] = newObj;
      else updatedRecords.push(newObj);
    } else {
      updatedRecords.push(newObj);
      setActiveReportId(newObj.id);
    }

    updateData({ deliveryReceiptRecords: updatedRecords });
    if (!hideToast) toast.success("تم حفظ كشف الاستلام والتسليم بنجاح");
  };

  // Autosave when report details or items change
  useEffect(() => {
    if (items.length > 0 && !showArchive && !showFilter) {
      const delayDebounce = setTimeout(() => {
        saveWork(items, true);
      }, 1000); // debounce of 1 second to avoid state choking
      return () => clearTimeout(delayDebounce);
    }
  }, [reportName, reportDate, items, showArchive, showFilter, activeReportId]);

  const updateItem = (id: string, updates: Partial<DeliveryReceiptItem>) => {
    const newItems = items.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setItems(newItems);
  };

  const applyToSelected = (
    field: keyof DeliveryReceiptItem,
    value: any,
    condition?: (item: DeliveryReceiptItem) => boolean,
  ) => {
    const newItems = items.map((t) => {
      // Check if matches branch
      if (applyBranch !== "الجميع" && t.branch !== applyBranch) return t;
      // Check if matches grades
      if (applyGrades.length > 0 && !applyGrades.includes(t.grade)) return t;
      // Check if matches sections
      if (applySections.length > 0 && !applySections.includes(t.section))
        return t;

      if (condition && !condition(t)) return t;

      return { ...t, [field]: value };
    });
    setItems(newItems);
    toast.success(`تم تطبيق القيمة المحددة بنجاح`);
  };

  const handleApplyFilter = () => {
    let results: (DeliveryReceiptItem & {
      _parent: DeliveryReceiptReport;
      uniqueId: string;
    })[] = [];
    existingReports.forEach((report) => {
      if (
        report.dateStr >= filterStartDate &&
        report.dateStr <= filterEndDate
      ) {
        if (
          filterSelectedReports.length === 0 ||
          filterSelectedReports.includes(report.id)
        ) {
          report.items.forEach((t) => {
            const matchesStatus =
              filterSelectedStatus.length === 0 ||
              filterSelectedStatus.includes(t.status as string);
            const matchesAction =
              filterSelectedActions.length === 0 ||
              filterSelectedActions.includes(t.actionTaken as string);
            const matchesNotes = 
              !filterNotes || 
              (t.notes || "").toLowerCase().includes(filterNotes.toLowerCase());

            if (matchesStatus && matchesAction && matchesNotes) {
              results.push({
                ...t,
                _parent: report,
                uniqueId: `${report.id}-${t.id}`,
              });
            }
          });
        }
      }
    });

    results.sort((a, b) => {
      if (a._parent.dateStr !== b._parent.dateStr)
        return b._parent.dateStr.localeCompare(a._parent.dateStr);
      return 0;
    });

    setSelectedTaskIds([]);
    setFilteredResults(results);
    setShowFilter(false);
  };

  // Modern HTML-Based Excel Export
  const handleExportExcelHTML = (itemsToExport: DeliveryReceiptItem[]) => {
    if (itemsToExport.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const hijriDate = toHijri(todayDate);
    const dayName = getDayNameAr(todayDate);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>كشف الاستلام والتسليم</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-size: 10pt; font-weight: bold; }
          th { background-color: #1e3a8a; color: #ffffff; font-size: 11pt; border: 1px solid #1e3a8a; }
          .header-table { border: none; margin-bottom: 20px; width: 100%; }
          .header-table td { border: none; font-size: 10pt; font-weight: bold; text-align: right; }
          .title-cell { font-size: 16pt; color: #1e3a8a; background-color: #eff6ff; text-align: center; border: 2px solid #bfdbfe !important; font-weight: bold; }
          .footer-table { border: none; margin-top: 30px; width: 100%; }
          .footer-table td { border: none; font-size: 11pt; font-weight: bold; padding: 15px; }
          .stamp-box { border: 2px dashed #64748b !important; text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px; }
          
          /* Execution status styling */
          .status-delivered { background-color: #d1fae5; color: #065f46; }
          .status-in-progress { background-color: #fef3c7; color: #92400e; }
          .status-not-delivered { background-color: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <!-- Header Info -->
        <table class="header-table">
          <tr>
            <td style="text-align: right; width: 33%; line-height: 1.6;">
              <strong>${data.profile?.ministry || 'وزارة التربية والتعليم'}</strong><br/>
              <strong>${data.profile?.district || 'مكتب التربية والتعليم'}</strong><br/>
              <strong>${school || 'مدارسنا الأهلية'}</strong><br/>
              <span>الفرع: ${branch || 'الرئيسي'}</span>
            </td>
            <td class="title-cell" style="text-align: center; width: 34%; vertical-align: middle;" colspan="5">
              كشف الاستلام والتسليم للمهام الإشرافية
            </td>
            <td style="text-align: left; width: 33%; direction: ltr; line-height: 1.6;">
              اليوم: ${dayName}<br/>
              التاريخ الهجري: ${hijriDate}<br/>
              التاريخ الميلادي: ${todayDate}
            </td>
          </tr>
        </table>

        <!-- Main Data Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 5%">م</th>
              <th style="width: 15%">المدرسة والفرع</th>
              <th style="width: 15%">اسم المعلم</th>
              <th style="width: 10%">الصف</th>
              <th style="width: 10%">عدد النماذج</th>
              <th style="width: 10%">تاريخ الاستلام</th>
              <th style="width: 10%">تاريخ التسليم</th>
              <th style="width: 10%">الشعبة</th>
              <th style="width: 10%">حالة التنفيذ</th>
              <th style="width: 10%">الإجراء المتخذ</th>
              <th style="width: 15%">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
    `;

    itemsToExport.forEach((t, idx) => {
      let statusClass = '';
      let statusText = 'لم يحدد';
      if (t.status === 'delivered') {
        statusClass = ' class="status-delivered"';
        statusText = 'تم التسليم';
      } else if (t.status === 'in_progress') {
        statusClass = ' class="status-in-progress"';
        statusText = 'قيد المتابعة';
      } else if (t.status === 'not_delivered') {
        statusClass = ' class="status-not-delivered"';
        statusText = 'لم يتم التسليم';
      }

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td>${t.school || ''} - ${t.branch || ''}</td>
          <td style="text-align: right;">${t.teacherName || ''}</td>
          <td>${t.grade || ''}</td>
          <td>${t.formCount || '0'}</td>
          <td>${t.receiveDateStr || ''}</td>
          <td>${t.deliveryDateStr || ''}</td>
          <td>${t.section || ''}</td>
          <td${statusClass}>${statusText}</td>
          <td>${t.actionTaken || ''}</td>
          <td style="text-align: right;">${t.notes || ''}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <!-- Footer / Signatures -->
        <table class="footer-table">
          <tr>
            <td style="text-align: right; width: 33%;">
              ✍️ <strong>كتابة التقرير:</strong> ${supervisorName}
            </td>
            <td style="text-align: center; width: 34%; vertical-align: middle;">
              <div class="stamp-box">
                توقيع وختم الإدارة
              </div>
            </td>
            <td style="text-align: left; width: 33%; direction: ltr;">
              👤 <strong>مدير الفرع:</strong> ${data.profile?.branchManager || '...................'}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    saveAs(blob, `delivery_receipt_${todayDate}.xls`);
    toast.success("تم تصدير ملف إكسل المنسق بنجاح");
  };

  // WhatsApp Message Generator
  const getWhatsAppStatusEmoji = (status: string) => {
    if (status === "delivered") return "🟢 تم التسليم";
    if (status === "in_progress") return "🟡 قيد المتابعة";
    if (status === "not_delivered") return "🔴 لم يتم التسليم";
    return "⚪ لم يحدد";
  };

  const getWhatsAppActionEmoji = (action: string) => {
    if (!action) return "🔹 لا يوجد";
    return `⚠️ ${action}`;
  };

  const generateWhatsAppMessage = (
    tasksToExport: DeliveryReceiptItem[],
  ) => {
    let msg = `✨📜 *كشف الاستلام والتسليم للمهام الإشرافية* 📜✨\n\n`;
    msg += `🏫 *المدرسة:* ${school}\n`;
    msg += `🏢 *الفرع:* ${branch || "الرئيسي"}\n`;
    msg += `📅 *تاريخ اليوم:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `⏰ *العام الدراسي:* ${academicYear}\n`;
    msg += `👤 *المشرف التربوي:* ${supervisorName}\n`;
    msg += `💼 *الوظيفة:* ${supervisorJob}\n`;
    msg += `📚 *الصف/الشعبة:* ${grade} - ${section}\n`;
    msg += `────────────────────\n\n`;

    tasksToExport.forEach((t, idx) => {
      msg += `*${idx + 1}️⃣ المعلم:* 👤 _${t.teacherName}_\n`;
      msg += `   🏫 *المدرسة والفرع:* ${t.school} - ${t.branch}\n`;
      msg += `   🏢 *الصف والشعبة:* ${t.grade} - ${t.section}\n`;
      msg += `   📝 *عدد النماذج:* ${t.formCount || '0'}\n`;
      msg += `   📥 *من تاريخ (الاستلام):* ${t.receiveDateStr || '-'}\n`;
      msg += `   📤 *إلى تاريخ (التسليم):* ${t.deliveryDateStr || '-'}\n`;
      msg += `   📊 *حالة التنفيذ:* ${getWhatsAppStatusEmoji(t.status)}\n`;
      if (t.status === "not_delivered" || t.status === "in_progress") {
        msg += `   ⚙️ *الإجراء المتخذ:* ${getWhatsAppActionEmoji(t.actionTaken || "")}\n`;
      }
      if (t.notes) {
        msg += `   💬 *الملاحظات:* ${t.notes}\n`;
      }
      msg += `\n`;
    });

    msg += `────────────────────\n`;
    msg += `✍️ *معد الكشف:* ${supervisorName}\n`;
    msg += `📱 _تم الإرسال عبر رفيق المشرف التربوي_`;
    return msg;
  };

  // Selected row toggle in main editing view
  const toggleSelectActiveRow = (id: string) => {
    setSelectedActiveRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllActive = () => {
    const displayedIds = displayedItems.map((t) => t.id);
    const allDisplayedSelected = displayedIds.every(id => selectedActiveRowIds.includes(id));
    if (allDisplayedSelected) {
      setSelectedActiveRowIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedActiveRowIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleRowClick = (e: React.MouseEvent, itemId: string) => {
    const tagName = (e.target as HTMLElement).tagName.toLowerCase();
    if (["input", "select", "option", "button", "svg", "path"].includes(tagName)) {
      return;
    }
    toggleSelectActiveRow(itemId);
  };

  // Filtered Results row selection
  const handleToggleRowSelection = (uniqueId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(uniqueId)
        ? prev.filter((id) => id !== uniqueId)
        : [...prev, uniqueId]
    );
  };

  const handleToggleAllSelection = () => {
    if (!filteredResults) return;
    if (selectedTaskIds.length === filteredResults.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(
        filteredResults.map((t) => (t as Record<string, any>).uniqueId)
      );
    }
  };

  const handleExportWhatsAppAllFiltered = () => {
    if (!filteredResults || filteredResults.length === 0) return;
    const itemsToSend =
      selectedTaskIds.length > 0
        ? filteredResults.filter((t) =>
            selectedTaskIds.includes((t as Record<string, any>).uniqueId)
          )
        : filteredResults;

    if (itemsToSend.length === 0) {
      toast.error("لم يتم تحديد صفوف للإرسال");
      return;
    }

    const msg = generateWhatsAppMessage(itemsToSend);
    shareViaWhatsApp(msg);
  };

  if (filteredResults) {
    return (
      <div className="space-y-6 font-arabic p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Filter className="text-blue-500" />
            مؤشرات كشف الاستلام والتسليم
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleExportExcelHTML(filteredResults)}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-colors text-sm"
            >
              <FileSpreadsheet size={18} /> تصدير إكسل
            </button>
            <button
              onClick={handleExportWhatsAppAllFiltered}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-colors text-sm"
            >
              <MessageCircle size={18} /> إرسال واتساب
            </button>
            <button
              onClick={() => setFilteredResults(null)}
              className="btn-secondary bg-slate-100"
            >
              عودة إلى السجل
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
          <table className="w-full text-right whitespace-nowrap">
            <thead>
              <tr className="bg-gradient-to-l from-blue-600 to-blue-800 text-white font-bold">
                <th className="p-4 border-b border-blue-900 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredResults.length > 0 &&
                      selectedTaskIds.length === filteredResults.length
                    }
                    onChange={handleToggleAllSelection}
                    className="w-4 h-4 rounded text-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 border-b border-blue-900">المدرسة والفرع</th>
                <th className="p-4 border-b border-blue-900">اسم المعلم</th>
                <th className="p-4 border-b border-blue-900">الصف</th>
                <th className="p-4 border-b border-blue-900">عدد النماذج</th>
                <th className="p-4 border-b border-blue-900">من تاريخ / إلى تاريخ</th>
                <th className="p-4 border-b border-blue-900">الشعبة</th>
                <th className="p-4 border-b border-blue-900">حالة التنفيذ</th>
                <th className="p-4 border-b border-blue-900">الإجراء المتخذ</th>
                <th className="p-4 border-b border-blue-900">ملاحظات</th>
                <th className="p-4 border-b border-blue-900 text-center w-16">
                  <MessageCircle size={16} className="mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((t, idx) => {
                const uniqueId = (t as Record<string, any>).uniqueId;
                const isSelected = selectedTaskIds.includes(uniqueId);
                return (
                  <tr
                    key={idx}
                    className="border-b last:border-0 cursor-pointer transition-colors"
                    style={isSelected ? { backgroundColor: 'rgba(249, 115, 22, 0.08)' } : undefined}
                    onClick={() => handleToggleRowSelection(uniqueId)}
                  >
                    <td
                      className="p-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRowSelection(uniqueId)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      <strong>{t.school}</strong>
                      <div className="text-xs text-slate-500">{t.branch}</div>
                    </td>
                    <td className="p-4 border-e border-slate-100 font-bold">
                      {t.teacherName}
                    </td>
                    <td className="p-4 border-e border-slate-100 text-center">
                      {t.grade || "--"}
                    </td>
                    <td className="p-4 border-e border-slate-100 text-center">
                      {t.formCount}
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      <div className="text-sm">
                        <span className="text-slate-500">من تاريخ:</span>{" "}
                        {t.receiveDateStr}
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-500">إلى تاريخ:</span>{" "}
                        {t.deliveryDateStr}
                      </div>
                    </td>
                    <td className="p-4 border-e border-slate-100 text-center">
                      {t.section || "--"}
                    </td>
                    <td className="p-4 border-e border-slate-100 font-bold text-center">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                          t.status === "delivered"
                            ? "bg-emerald-100 text-emerald-700"
                            : t.status === "not_delivered"
                              ? "bg-red-100 text-red-700"
                              : t.status === "in_progress"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status === "delivered"
                          ? "تم التسليم"
                          : t.status === "not_delivered"
                            ? "لم يتم التسليم"
                            : t.status === "in_progress"
                              ? "قيد المتابعة"
                              : "لم يحدد"}
                      </span>
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      {t.actionTaken}
                    </td>
                    <td className="p-4 whitespace-normal min-w-[150px] border-e border-slate-100">
                      {t.notes}
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          const msg = generateWhatsAppMessage([t]);
                          shareViaWhatsApp(msg);
                        }}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="إرسال عبر واتساب"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    لا توجد نتائج مطابقة للفلترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (showArchive) {
    return (
      <div className="space-y-6 font-arabic p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Archive className="text-orange-500" />
            الأرشيف
          </h2>
          <button
            onClick={() => {
              setShowArchive(false);
              setReportDate(today);
              setActiveReportId(null);
              setItems([]);
              setSelectedActiveRowIds([]);
            }}
            className="btn-secondary"
          >
            عودة ومسح إدخال جديد
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {existingReports
            .filter(
              (t) =>
                t.userId === currentUser?.id || currentUser?.role === "admin",
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((report) => (
              <div
                key={report.id}
                className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Calendar size={18} />
                    {report.dateStr}
                  </div>
                  <div className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">
                    {report.items.length} عنصر
                  </div>
                </div>
                <h3 className="font-bold text-lg text-slate-800 truncate mb-1">
                  {report.reportName}
                </h3>
                <p className="text-slate-600 font-medium mb-1 truncate">
                  {report.supervisorName}
                </p>
                <p className="text-sm text-slate-500 mb-4 truncate">
                  {report.school} - {report.branch}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setReportName(report.reportName);
                      setReportDate(report.dateStr);
                      setActiveReportId(report.id);
                      setItems(report.items);
                      setSelectedActiveRowIds([]);
                      setShowArchive(false);
                      if (report.branch) {
                        setActiveBranch(report.branch);
                      }
                    }}
                    className="flex-1 btn-primary py-2 text-sm font-bold text-center"
                  >
                    فتح للتعديل
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذا الكشف نهائياً من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء.")) {
                        const updatedRecords = existingReports.filter((r) => r.id !== report.id);
                        updateData({ deliveryReceiptRecords: updatedRecords });
                        toast.success("تم حذف الكشف بنجاح");
                      }
                    }}
                    className="px-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-600 hover:text-white transition-colors"
                    title="حذف الكشف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          {existingReports.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-8 bg-white rounded-xl border border-dashed border-slate-300">
              لا يوجد أرشيف سابق
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-arabic max-w-7xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right" dir="rtl">
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={() => saveWork(items)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          <Save size={20} />
          حفظ العمل (تلقائي)
        </button>
        <button
          onClick={() => setShowArchive(true)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl font-bold hover:bg-orange-100 transition-colors"
        >
          <Archive size={20} />
          الأرشيف
        </button>
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-colors"
        >
          <Filter size={20} />
          مؤشرات كشف الاستلام والتسليم
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="mr-auto flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            <ArrowRight size={20} />
            العودة إلى الإشراف التربوي
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Briefcase size={20} className="text-blue-500" />
                بيانات المشرف
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  اسم المدرسة
                </label>
                <div className="font-bold text-slate-800 text-sm">
                  {school || "--"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-bold">
                    الفرع
                  </label>
                  <select
                    value={activeBranch}
                    onChange={(e) => setActiveBranch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none focus:border-blue-500 font-bold text-slate-800 text-xs"
                  >
                    {allowedBranches.length > 1 && (
                      <option value="الجميع">جميع الفروع</option>
                    )}
                    {allowedBranches.map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    العام الدراسي
                  </label>
                  <div className="font-bold text-slate-800 text-sm">
                    {academicYear || "--"}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  اسم المشرف
                </label>
                <div className="font-bold text-slate-800 text-sm">
                  {supervisorName}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  الوظيفة
                </label>
                <div className="font-bold text-slate-800 text-sm">
                  {supervisorJob}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    الصف
                  </label>
                  <div className="font-bold text-slate-800 text-sm">
                    {grade || "--"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    الشعبة
                  </label>
                  <div className="font-bold text-slate-800 text-sm">
                    {section || "--"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-blue-800 flex items-center gap-2">
                <FileText size={20} />
                الكشف الحالي
              </h3>
              <button
                onClick={() => {
                  setReportName("كشف استلام وتسليم جديد");
                  setReportDate(today);
                  setActiveReportId(null);
                  const initialItems = availableStaff.map((s: any) => ({
                    id: crypto.randomUUID(),
                    teacherName: s.name || "",
                    school: s.school || "",
                    branch: s.branch || "",
                    grade: s.grade || "",
                    section: s.section || "",
                    formCount: "",
                    receiveDateStr: today,
                    deliveryDateStr: today,
                    status: null as any,
                    actionTaken: null as any,
                    notes: "",
                  }));
                  setItems(initialItems);
                  setSelectedActiveRowIds([]);
                  toast.success("تم بدء كشف جديد بنجاح");
                }}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow"
              >
                <Plus size={12} /> كشف جديد
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-bold">
                  اسم الكشف
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-2 outline-none focus:border-blue-500"
                  placeholder="اسم الكشف..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1 font-bold">
                  تاريخ الكشف
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded p-2 outline-none focus:border-blue-500 text-slate-600 text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Quick Entry Card */}
          <div className="border border-dashed border-teal-600 rounded-2xl p-6 relative bg-white shadow-sm">
            <h3 className="absolute -top-3 right-6 bg-white px-3 font-bold text-teal-700">
              إدخال سريع للبيانات
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">تطبيق على فرع:</label>
                <select
                  value={applyBranch}
                  onChange={(e) => setApplyBranch(e.target.value)}
                  className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 bg-white"
                >
                  <option value="الجميع">الكل</option>
                  {uniqueBranches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Custom Grade Dropdown */}
              <div className="relative flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">تطبيق على الصف:</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowGradeSelect(!showGradeSelect);
                    setShowSectionSelect(false);
                  }}
                  className="border border-slate-200 rounded p-2 h-10 outline-none bg-white text-right w-full flex items-center justify-between"
                >
                  <span className="truncate">
                    {applyGrades.length === 0 ? "الجميع" : `${applyGrades.length} صفوف`}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>
                {showGradeSelect && (
                  <div className="absolute top-full right-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto p-2 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={applyGrades.length === 0}
                        onChange={() => setApplyGrades([])}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs font-bold">الجميع</span>
                    </label>
                    {uniqueGrades.map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                        <input
                          type="checkbox"
                          checked={applyGrades.includes(g)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setApplyGrades([...applyGrades, g]);
                            } else {
                              setApplyGrades(applyGrades.filter((x) => x !== g));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="text-xs font-bold">{g}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Section Dropdown */}
              <div className="relative flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">تطبيق على الشعبة:</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowSectionSelect(!showSectionSelect);
                    setShowGradeSelect(false);
                  }}
                  className="border border-slate-200 rounded p-2 h-10 outline-none bg-white text-right w-full flex items-center justify-between"
                >
                  <span className="truncate">
                    {applySections.length === 0 ? "الجميع" : `${applySections.length} شعب`}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>
                {showSectionSelect && (
                  <div className="absolute top-full right-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto p-2 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={applySections.length === 0}
                        onChange={() => setApplySections([])}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs font-bold">الجميع</span>
                    </label>
                    {uniqueSections.map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                        <input
                          type="checkbox"
                          checked={applySections.includes(s)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setApplySections([...applySections, s]);
                            } else {
                              setApplySections(applySections.filter((x) => x !== s));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="text-xs font-bold">{s}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Count Apply */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">عدد النماذج:</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={applyFormCount}
                    onChange={(e) => setApplyFormCount(e.target.value)}
                    className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 flex-1 text-center font-bold"
                    placeholder="العدد"
                  />
                  <button
                    onClick={() => applyToSelected("formCount", applyFormCount)}
                    className="bg-teal-600 text-white px-3 h-10 rounded font-bold hover:bg-teal-700 transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              </div>

              {/* Receive Date Apply */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">تاريخ الاستلام:</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={applyReceiveDate}
                    onChange={(e) => setApplyReceiveDate(e.target.value)}
                    className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 flex-1 text-center"
                  />
                  <button
                    onClick={() => applyToSelected("receiveDateStr", applyReceiveDate)}
                    className="bg-teal-600 text-white px-3 h-10 rounded font-bold hover:bg-teal-700 transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              </div>

              {/* Delivery Date Apply */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">تاريخ التسليم:</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={applyDeliveryDate}
                    onChange={(e) => setApplyDeliveryDate(e.target.value)}
                    className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 flex-1 text-center"
                  />
                  <button
                    onClick={() => applyToSelected("deliveryDateStr", applyDeliveryDate)}
                    className="bg-teal-600 text-white px-3 h-10 rounded font-bold hover:bg-teal-700 transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              </div>

              {/* Notes Apply */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-600">ملاحظات الكشف:</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 flex-1"
                    placeholder="اكتب ملاحظة لتعميمها..."
                  />
                  <button
                    onClick={() => applyToSelected("notes", applyNotes)}
                    className="bg-indigo-600 text-white px-4 h-10 rounded font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
                  >
                    تعميم على الجميع
                  </button>
                </div>
              </div>

              {/* Status Apply */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">حالة التنفيذ:</label>
                <div className="flex gap-1">
                  <select
                    value={applyStatus}
                    onChange={(e) => setApplyStatus(e.target.value as any)}
                    className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 flex-1 bg-white"
                  >
                    <option value="delivered">تم التسليم</option>
                    <option value="in_progress">قيد المتابعة</option>
                    <option value="not_delivered">لم يتم التسليم</option>
                  </select>
                  <button
                    onClick={() => applyToSelected("status", applyStatus)}
                    className="bg-teal-600 text-white px-3 h-10 rounded font-bold hover:bg-teal-700 transition-colors"
                  >
                    تطبيق
                  </button>
                </div>
              </div>

              {/* Action Taken Apply to Non-Delivered */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-600">الإجراء المتخذ لمن لم يسلم:</label>
                <div className="flex gap-1">
                  <select
                    value={applyAction}
                    onChange={(e) => setApplyAction(e.target.value)}
                    className="border border-slate-200 rounded p-2 h-10 outline-none focus:border-teal-600 flex-1 bg-white"
                  >
                    <option value="تنبيه شفوي">تنبيه شفوي</option>
                    <option value="تعهد خطي">تعهد خطي</option>
                    <option value="إنذار أخير">إنذار أخير</option>
                    <option value="خصم قسط">خصم قسط</option>
                    <option value="الرفع إلى الإدارة العليا">الرفع إلى الإدارة العليا</option>
                  </select>
                  <button
                    onClick={() =>
                      applyToSelected("actionTaken", applyAction, (t) => t.status === "not_delivered")
                    }
                    className="bg-red-600 text-white px-4 h-10 rounded font-bold hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    تعميم على الجميع
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Header Controls */}
          <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <FileText className="text-teal-600" />
              جدول المهام والمعلمين
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDatabaseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold hover:bg-purple-100 transition-colors text-sm shadow-sm"
              >
                <Database size={18} /> قاعدة البيانات
              </button>
              <button
                onClick={() => handleExportExcelHTML(items)}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-colors text-sm"
              >
                <FileSpreadsheet size={18} /> تصدير إكسل (HTML)
              </button>
              <button
                onClick={() => {
                  const selectedItems = selectedActiveRowIds.length > 0
                    ? items.filter((t) => selectedActiveRowIds.includes(t.id))
                    : items;
                  if (selectedItems.length === 0) {
                    toast.error("لم يتم تحديد صفوف للإرسال");
                    return;
                  }
                  const msg = generateWhatsAppMessage(selectedItems);
                  shareViaWhatsApp(msg);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-colors text-sm"
              >
                <MessageCircle size={18} /> إرسال واتساب للمختار
              </button>
            </div>
          </div>

          {/* Active Sheets Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar shadow-sm" dir="rtl">
            <table className="w-full text-right text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gradient-to-l from-teal-600 to-blue-700 text-white text-center font-bold">
                  <th className="p-3 border-x border-teal-700/30 w-12">
                    <input
                      type="checkbox"
                      checked={displayedItems.length > 0 && displayedItems.every(t => selectedActiveRowIds.includes(t.id))}
                      onChange={toggleSelectAllActive}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-3 border-x border-teal-700/30">المدرسة والفرع</th>
                  <th className="p-3 border-x border-teal-700/30">اسم المعلم</th>
                  <th className="p-3 border-x border-teal-700/30">الصف</th>
                  <th className="p-3 border-x border-teal-700/30 w-24">عدد النماذج</th>
                  <th className="p-3 border-x border-teal-700/30 w-40">تاريخ الاستلام</th>
                  <th className="p-3 border-x border-teal-700/30 w-40">تاريخ التسليم</th>
                  <th className="p-3 border-x border-teal-700/30">الشعبة</th>
                  <th className="p-3 border-x border-teal-700/30">حالة التنفيذ</th>
                  <th className="p-3 border-x border-teal-700/30">الإجراء المتخذ</th>
                  <th className="p-3 border-x border-teal-700/30">ملاحظات</th>
                  <th className="p-3 border-x border-teal-700/30 w-16">
                    <button
                      onClick={() => {
                        const selectedItems = items.filter((t) => selectedActiveRowIds.includes(t.id));
                        if (selectedItems.length === 0) {
                          toast.error("لم يتم تحديد معلمين للإرسال");
                          return;
                        }
                        const msg = generateWhatsAppMessage(selectedItems);
                        shareViaWhatsApp(msg);
                      }}
                      className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                      title="إرسال المختارين عبر واتساب"
                    >
                      <MessageCircle size={20} className="mx-auto" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedItems.map((item) => {
                  const isSelected = selectedActiveRowIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={(e) => handleRowClick(e, item.id)}
                      className="transition-colors border-b border-slate-100 hover:bg-slate-50/50"
                      style={isSelected ? { backgroundColor: "rgba(249, 115, 22, 0.08)" } : undefined}
                    >
                      <td className="p-2 border-x border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectActiveRow(item.id)}
                          className="w-4 h-4 rounded text-orange-600 cursor-pointer focus:ring-orange-500"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <strong>{item.school || school}</strong>
                        <div className="text-xs text-slate-500">{item.branch || branch}</div>
                      </td>
                      <td className="p-2 border-x border-slate-100 font-bold text-slate-800">
                        {item.teacherName || "بدون اسم"}
                      </td>
                      <td className="p-2 border-x border-slate-100 text-slate-700 font-semibold text-center">
                        {item.grade || "--"}
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <input
                          type="text"
                          value={item.formCount || ""}
                          onChange={(e) => updateItem(item.id, { formCount: e.target.value })}
                          className="w-full text-center border border-slate-200 rounded p-1.5 focus:border-teal-600 outline-none font-bold"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <input
                          type="date"
                          value={item.receiveDateStr || ""}
                          onChange={(e) => updateItem(item.id, { receiveDateStr: e.target.value })}
                          className="w-full text-center border border-slate-200 rounded p-1.5 focus:border-teal-600 outline-none text-slate-600"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <input
                          type="date"
                          value={item.deliveryDateStr || ""}
                          onChange={(e) => updateItem(item.id, { deliveryDateStr: e.target.value })}
                          className="w-full text-center border border-slate-200 rounded p-1.5 focus:border-teal-600 outline-none text-slate-600"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-100 text-center text-slate-700">
                        {item.section || "--"}
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <select
                          value={item.status || ""}
                          onChange={(e) => updateItem(item.id, { status: e.target.value as any })}
                          className={`w-full text-center border border-slate-200 rounded p-1.5 focus:border-teal-600 outline-none font-bold ${
                            item.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                            item.status === 'not_delivered' ? 'bg-red-50 text-red-700' :
                            item.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-white text-slate-600'
                          }`}
                        >
                          <option value="">لم يحدد</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="in_progress">قيد المتابعة</option>
                          <option value="not_delivered">لم يتم التسليم</option>
                        </select>
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <select
                          value={item.actionTaken || ""}
                          onChange={(e) => updateItem(item.id, { actionTaken: e.target.value })}
                          className="w-full text-center border border-slate-200 rounded p-1.5 focus:border-teal-600 outline-none font-bold bg-white text-slate-700"
                        >
                          <option value="">لم يحدد</option>
                          <option value="تنبيه شفوي">تنبيه شفوي</option>
                          <option value="تعهد خطي">تعهد خطي</option>
                          <option value="إنذار أخير">إنذار أخير</option>
                          <option value="خصم قسط">خصم قسط</option>
                          <option value="الرفع إلى الإدارة العليا">الرفع إلى الإدارة العليا</option>
                        </select>
                      </td>
                      <td className="p-2 border-x border-slate-100">
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                          className="w-full text-right border border-slate-200 rounded p-1.5 focus:border-teal-600 outline-none"
                          placeholder="..."
                        />
                      </td>
                      <td className="p-2 border-x border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const msg = generateWhatsAppMessage([item]);
                            shareViaWhatsApp(msg);
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-block"
                          title="إرسال عبر واتساب"
                        >
                          <MessageCircle size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      لم يتم العثور على معلمين متاحين. قد تحتاج إلى إضافة موظفين في شؤون الموظفين.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm rtl" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto text-right">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Filter className="text-blue-500" />
                مؤشرات الاستلام والتسليم
              </h3>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-2 font-bold">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    className="input-field border border-slate-200 rounded p-2 w-full outline-none focus:border-blue-500"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-2 font-bold">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    className="input-field border border-slate-200 rounded p-2 w-full outline-none focus:border-blue-500"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-2 font-bold">
                  أسماء الكشوفات المحفوظة
                </label>
                <div className="max-h-32 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                  {existingReports.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-100 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filterSelectedReports.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setFilterSelectedReports([
                              ...filterSelectedReports,
                              r.id,
                            ]);
                          else
                            setFilterSelectedReports(
                              filterSelectedReports.filter((id) => id !== r.id)
                            );
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-sm">
                        {r.reportName} - {r.dateStr}
                      </span>
                    </label>
                  ))}
                  {existingReports.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-2">لا توجد كشوفات محفوظة</div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-2 font-bold">
                  حالة التنفيذ
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSelectedStatus.includes("delivered")}
                      onChange={(e) => {
                        if (e.target.checked)
                          setFilterSelectedStatus([...filterSelectedStatus, "delivered"]);
                        else
                          setFilterSelectedStatus(
                            filterSelectedStatus.filter((x) => x !== "delivered")
                          );
                      }}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span className="text-sm text-emerald-800 font-bold">تم التسليم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSelectedStatus.includes("in_progress")}
                      onChange={(e) => {
                        if (e.target.checked)
                          setFilterSelectedStatus([...filterSelectedStatus, "in_progress"]);
                        else
                          setFilterSelectedStatus(
                            filterSelectedStatus.filter((x) => x !== "in_progress")
                          );
                      }}
                      className="w-4 h-4 rounded text-amber-600"
                    />
                    <span className="text-sm text-amber-800 font-bold">قيد المتابعة</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterSelectedStatus.includes("not_delivered")}
                      onChange={(e) => {
                        if (e.target.checked)
                          setFilterSelectedStatus([...filterSelectedStatus, "not_delivered"]);
                        else
                          setFilterSelectedStatus(
                            filterSelectedStatus.filter((x) => x !== "not_delivered")
                          );
                      }}
                      className="w-4 h-4 rounded text-red-600"
                    />
                    <span className="text-sm text-red-800 font-bold">لم يتم التسليم</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-2 font-bold">
                  الإجراء المتخذ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "تنبيه شفوي",
                    "تعهد خطي",
                    "إنذار أخير",
                    "خصم قسط",
                    "الرفع إلى الإدارة العليا",
                  ].map((act) => (
                    <label key={act} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterSelectedActions.includes(act)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setFilterSelectedActions([...filterSelectedActions, act]);
                          else
                            setFilterSelectedActions(
                              filterSelectedActions.filter((x) => x !== act)
                            );
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-700">{act}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-2 font-bold">
                  الملاحظات
                </label>
                <input
                  type="text"
                  value={filterNotes}
                  onChange={(e) => setFilterNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 outline-none focus:border-blue-500"
                  placeholder="ابحث بكلمة في الملاحظات..."
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleApplyFilter}
                className="flex-1 btn-primary py-3 font-bold"
              >
                موافق (عرض النتائج)
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 btn-secondary py-3 font-bold bg-slate-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {isDatabaseModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-100 flex flex-col text-right">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-purple-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 text-white p-2.5 rounded-2xl shadow-lg">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">أعداد النماذج من قاعدة البيانات</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">تحديد أعداد النماذج المستهدفة لكل معلم بناءً على الصفوف التي يدرسها</p>
                </div>
              </div>
              <button
                onClick={() => setIsDatabaseModalOpen(false)}
                className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Generalization bar */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-start">
              <span className="text-sm font-black text-slate-700">تعميم القيمة على الجميع:</span>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="number"
                  min="1"
                  value={generalizeCount}
                  onChange={(e) => setGeneralizeCount(e.target.value)}
                  placeholder="العدد الافتراضي"
                  className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-center font-bold"
                />
                <button
                  onClick={handleApplyGeneralize}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
                >
                  تطبيق التعميم
                </button>
              </div>
            </div>

            {/* Teachers list table */}
            <div className="flex-1 overflow-y-auto p-6 max-h-[50vh] custom-scrollbar">
              {availableStaff.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-bold">
                  لا يوجد معلمون متاحون في هذه المدرسة/الفرع
                </div>
              ) : (
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-150">
                        <th className="p-3">اسم المعلم</th>
                        <th className="p-3 w-1/3">الصفوف التي يدرسها</th>
                        <th className="p-3 w-1/4 text-center">العدد المطلوب تسليمه</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {availableStaff.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{s.name}</td>
                          <td className="p-3 text-slate-600 font-semibold">
                            {Array.isArray(s.grades) && s.grades.length > 0
                              ? s.grades.join(" / ")
                              : "غير محدد"}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={dbCounts[s.name] || "1"}
                              onChange={(e) =>
                                setDbCounts({
                                  ...dbCounts,
                                  [s.name]: e.target.value,
                                })
                              }
                              className="w-20 px-2 py-1 text-center border border-slate-200 rounded-lg focus:border-purple-500 outline-none font-bold"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-end gap-3">
              <button
                onClick={() => setIsDatabaseModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleSaveDatabaseCounts(dbCounts)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all text-sm shadow-md"
              >
                موافق (تطبيق الأعداد)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
