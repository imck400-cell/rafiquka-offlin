import React, { useState, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import { CreativityRecordReport, CreativityRecordItem } from "../types";
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
  Star,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToStyledExcel } from "../src/lib/excelExport";

interface Props {
  onClose?: () => void;
}

const CATEGORIES = [
  "دمج الذكاء الاصطناعي تعليمياً.",
  "تصميم بيئات تعلم افتراضية.",
  "ابتكار تطبيقات تعليمية ذكية.",
  "إنتاج محتوى رقمي تفاعلي.",
  "نشر بحوث إجرائية محكمة.",
  "تأليف أدلة تربوية رائدة.",
  "الحصول على براءات اختراع.",
  "تقديم أوراق عمل دولية.",
  "حصد جوائز طلابية عالمية.",
  "رعاية الموهوبين ببرامج ابتكارية.",
  "تأسيس نوادي ابتكار مدرسية.",
  "تصميم ألعاب تعليمية محفزة.",
  "إطلاق مبادرات تطوعية مؤثرة.",
  "تعزيز الاستدامة البيئية المدرسية.",
  "بناء شراكات مجتمعية فاعلة.",
  "قيادة مشاريع ريادة أعمال.",
];

export const CreativityAndExcellenceView: React.FC<Props> = ({ onClose }) => {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const today = new Date().toISOString().split("T")[0];

  const [dateStr, setDateStr] = useState(today);
  const [tasks, setTasks] = useState<CreativityRecordItem[]>([
    {
      id: crypto.randomUUID(),
      category: "",
      notes: "",
      evaluation: null,
      dateStr: today,
    },
  ]);

  const existingTasks = data.creativityRecords || [];

  const [showArchive, setShowArchive] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);
  const [filterEvaluation, setFilterEvaluation] = useState<
    Record<string, boolean>
  >({
    "1": true,
    "2": true,
    "3": true,
    "4": true,
  });
  const [filteredResults, setFilteredResults] = useState<
    | (CreativityRecordItem & {
        _parent: CreativityRecordReport;
        uniqueId: string;
      })[]
    | null
  >(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [openTeacherDropdown, setOpenTeacherDropdown] = useState<string | null>(
    null,
  );

  const supervisorName = currentUser?.name || "بدون اسم";
  const supervisorJob =
    currentUser?.jobTitle ||
    (currentUser?.role === "admin" ? "مدير نظام" : "مشرف إداري");
  const school =
    currentUser?.selectedSchool?.split(",")[0] ||
    data.profile?.schoolName ||
    "";
  const branch = currentUser?.selectedBranch || "";
  const academicYear =
    localStorage.getItem("selected_year") ||
    currentUser?.selectedYear ||
    data.availableYears?.[0] ||
    data.profile?.year ||
    "2024-2025";
  const grade =
    currentUser?.grades && currentUser.grades.length > 0
      ? currentUser.grades.join(", ")
      : "بدون صف";
  const section =
    currentUser?.sections && currentUser.sections.length > 0
      ? currentUser.sections.join(", ")
      : "بدون شعبة";

  // Available Staff for Current User Scope
  const availableStaff = React.useMemo(() => {
    let staff = data.secretariatStaff || [];
    const isAdmin =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    if (!isAdmin) {
      if (currentUser?.selectedSchool) {
        const userSchools = currentUser.selectedSchool
          .split(",")
          .map((s) => s.trim());
        staff = staff.filter((s: any) =>
          userSchools.includes(String(s.school || "").trim()),
        );
      }
      if (currentUser?.selectedBranch) {
        staff = staff.filter(
          (s: any) => s.branch === currentUser.selectedBranch,
        );
      }
      if (currentUser?.grades && currentUser.grades.length > 0) {
        staff = staff.filter(
          (s: any) =>
            !s.grade || currentUser.grades!.includes(String(s.grade).trim()),
        );
      }
    }
    return staff;
  }, [data.secretariatStaff, currentUser]);

  const uniqueTeachers = Array.from(
    new Set(availableStaff.map((s: any) => s.name).filter(Boolean)),
  ) as string[];

  useEffect(() => {
    if (!showArchive && !showFilter && !activeTaskId) {
      const todaysEntry = existingTasks.find(
        (t) => t.dateStr === dateStr && t.userId === currentUser?.id,
      );
      if (todaysEntry) {
        setTasks(
          todaysEntry.items.length > 0
            ? todaysEntry.items
            : [
                {
                  id: crypto.randomUUID(),
                  category: "",
                  notes: "",
                  evaluation: null,
                  dateStr: dateStr,
                },
              ],
        );
        setActiveTaskId(todaysEntry.id);
      } else {
        setTasks([
          {
            id: crypto.randomUUID(),
            category: "",
            notes: "",
            evaluation: null,
            dateStr: dateStr,
          },
        ]);
        setActiveTaskId(null);
      }
    }
  }, [dateStr, existingTasks.length, showArchive, showFilter]);

  const saveWork = (
    currentTasks: CreativityRecordItem[] = tasks,
    showMessage: boolean = true,
  ) => {
    const validTasks = currentTasks.filter((t) => t.category.trim() !== "");
    if (validTasks.length === 0 && currentTasks.length > 0) {
      if (showMessage) toast.error("الرجاء كتابة الأعمال قبل الحفظ");
      return;
    }

    const newObj: CreativityRecordReport = {
      id: activeTaskId || crypto.randomUUID(),
      userId: currentUser?.id,
      school,
      branch,
      academicYear,
      supervisorName,
      supervisorJob,
      grade,
      section,
      dateStr,
      items: validTasks,
      createdAt: new Date().toISOString(),
    };

    let updatedTasks = [...existingTasks];
    if (activeTaskId) {
      const idx = updatedTasks.findIndex((t) => t.id === activeTaskId);
      if (idx >= 0) updatedTasks[idx] = newObj;
      else updatedTasks.push(newObj);
    } else {
      updatedTasks.push(newObj);
    }

    updateData({ creativityRecords: updatedTasks });
    if (!activeTaskId) {
      setActiveTaskId(newObj.id);
    }
    if (showMessage) toast.success("تم حفظ الأعمال بنجاح");
  };

  const addTaskRow = () => {
    const newTasks = [
      ...tasks,
      {
        id: crypto.randomUUID(),
        category: "",
        notes: "",
        evaluation: null as any,
        dateStr: dateStr,
      },
    ];
    setTasks(newTasks);
  };

  const updateTask = (id: string, updates: Partial<CreativityRecordItem>) => {
    const newTasks = [...tasks];
    const i = newTasks.findIndex((t) => t.id === id);
    if (i >= 0) {
      newTasks[i] = { ...newTasks[i], ...updates };
      if (
        i === newTasks.length - 1 &&
        updates.category !== undefined &&
        updates.category.trim() !== ""
      ) {
        newTasks.push({
          id: crypto.randomUUID(),
          category: "",
          notes: "",
          evaluation: null,
          dateStr: dateStr,
        });
      }
    }
    setTasks(newTasks);
    setTimeout(() => saveWork(newTasks, false), 500);
  };

  const removeTask = (id: string) => {
    const newTasks = tasks.filter((t) => t.id !== id);
    setTasks(newTasks);
    setTimeout(() => saveWork(newTasks, false), 500);
  };

  const handleApplyFilter = () => {
    let results: (CreativityRecordItem & {
      _parent: CreativityRecordReport;
      uniqueId: string;
    })[] = [];
    existingTasks.forEach((task) => {
      if (task.dateStr >= filterStartDate && task.dateStr <= filterEndDate) {
        task.items.forEach((t) => {
          if (t.evaluation !== null && filterEvaluation[String(t.evaluation)]) {
            results.push({
              ...t,
              _parent: task,
              uniqueId: `${task.id}-${t.id}`,
            });
          }
        });
      }
    });

    results.sort((a, b) => {
      if (a.dateStr !== b.dateStr) return b.dateStr.localeCompare(a.dateStr);
      return 0;
    });

    setSelectedTaskIds([]);
    setFilteredResults(results);
    setShowFilter(false);
  };

  const handleExportExcel = async () => {
    if (!filteredResults || filteredResults.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = [
      "م",
      "مجال التميز",
      "تاريخ العمل",
      "المنفذ",
      "المدرسة والفرع",
      "المعلمين",
      "تقييم الإبداع",
      "ملاحظات عامة",
    ];
    const exportData = filteredResults.map((t, idx) => [
      idx + 1,
      t.category,
      t.dateStr,
      t._parent.supervisorName,
      `${t._parent.school} - ${t._parent.branch}`,
      t.teacherNames ? t.teacherNames.join("، ") : "",
      t.evaluation ? String(t.evaluation) : "",
      t.notes,
    ]);

    await exportToStyledExcel({
      title: "تقرير الإبداع والتميز",
      filename: "creativity_excellence_report",
      headers,
      data: exportData,
      columnWidths: [5, 40, 15, 20, 20, 25, 15, 30],
      profile: data.profile || {},
      onRow: (row, rowData) => {
        const evalValue = rowData[6];
        const evalCell = row.getCell(7);
        if (evalValue === "4") {
          evalCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD1FAE5" },
          };
          evalCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF065F46" },
          };
        } else if (evalValue === "3") {
          evalCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0F2FE" },
          };
          evalCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF075985" },
          };
        } else if (evalValue === "2") {
          evalCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFEDD5" },
          };
          evalCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF9A3412" },
          };
        } else if (evalValue === "1") {
          evalCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
          };
          evalCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF991B1B" },
          };
        }
      },
    });
  };

  const generateWhatsAppMessage = (
    tasksToExport: (CreativityRecordItem & {
      _parent: CreativityRecordReport;
    })[],
  ) => {
    let msg = `*🌟 سجل الإبداع والتميز*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;

    tasksToExport.forEach((t, idx) => {
      msg += `*${idx + 1}- 💡 مجال التميز:*\n${t.category}\n`;
      msg += `👤 *المنفذ:* ${t._parent.supervisorName} (${t._parent.supervisorJob})\n`;
      if (t.teacherNames && t.teacherNames.length > 0) {
        msg += `🧑‍🏫 *المعلمين:* ${t.teacherNames.join("، ")}\n`;
      }
      msg += `📅 *تاريخ العمل:* ${t.dateStr}\n`;
      msg += `🏢 *المدرسة:* ${t._parent.school} - ${t._parent.branch}\n`;
      if (t.evaluation) msg += `⭐ *تقييم الإبداع:* ${t.evaluation}\n`;
      if (t.notes) msg += `📝 *ملاحظات:* ${t.notes}\n`;
      msg += `\n`;
    });

    msg += `----------------------------------\n`;
    msg += `✍️ *إعداد التقرير:* ${currentUser?.name || "..."}\n`;
    msg += `🧑‍💼 *المدير المباشر:* ${data.profile?.branchManager || "..."}\n\n`;
    msg += `${getReportMessageFooter(tasksToExport[0]?._parent?.dateStr || dateStr)}`;

    return msg;
  };

  const handleExportWhatsAppAll = () => {
    if (!filteredResults || filteredResults.length === 0) return;
    const itemsToSend =
      selectedTaskIds.length > 0
        ? filteredResults.filter((t) =>
            selectedTaskIds.includes((t as Record<string, any>).uniqueId),
          )
        : filteredResults;

    if (itemsToSend.length === 0) {
      toast.error("لم يتم تحديد صفوف للإرسال");
      return;
    }

    const msg = generateWhatsAppMessage(itemsToSend);
    shareViaWhatsApp(msg);
  };

  const handleToggleRowSelection = (uniqueId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(uniqueId)
        ? prev.filter((id) => id !== uniqueId)
        : [...prev, uniqueId],
    );
  };

  const handleToggleAllSelection = () => {
    if (!filteredResults) return;
    if (selectedTaskIds.length === filteredResults.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(
        filteredResults.map((t) => (t as Record<string, any>).uniqueId),
      );
    }
  };

  if (filteredResults) {
    return (
      <div className="space-y-6 font-arabic p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Filter className="text-blue-500" />
            مؤشرات الإبداع والتميز
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="btn-secondary flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              <FileSpreadsheet size={18} /> تصدير إكسل
            </button>
            <button
              onClick={handleExportWhatsAppAll}
              className="btn-secondary flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead>
              <tr className="bg-gradient-to-l from-blue-600 to-blue-800 text-white">
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
                <th className="p-4 border-b border-blue-900 border-e border-blue-800">
                  مجال التميز
                </th>
                <th className="p-4 border-b border-blue-900 border-e border-blue-800">
                  تاريخ العمل
                </th>
                <th className="p-4 border-b border-blue-900 border-e border-blue-800">
                  المدرسة والفرع
                </th>
                <th className="p-4 border-b border-blue-900 border-e border-blue-800">
                  المعلمين
                </th>
                <th className="p-4 border-b border-blue-900 border-e border-blue-800 text-center">
                  التقييم
                </th>
                <th className="p-4 border-b border-blue-900 border-e border-blue-800">
                  ملاحظات عامة
                </th>
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
                    className={`border-b border-slate-100 last:border-0 hover:bg-orange-50 cursor-pointer transition-colors ${isSelected ? "bg-orange-100" : ""}`}
                    onClick={() => handleToggleRowSelection(uniqueId)}
                  >
                    <td
                      className="p-4 text-center border-e border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRowSelection(uniqueId)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 whitespace-normal min-w-[200px] border-e border-slate-100">
                      {t.category}
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      {t.dateStr}
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      {t._parent.school} - {t._parent.branch}
                    </td>
                    <td className="p-4 border-e border-slate-100 whitespace-normal min-w-[150px]">
                      {t.teacherNames ? t.teacherNames.join("، ") : "--"}
                    </td>
                    <td className="p-4 border-e border-slate-100 font-bold text-center">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          t.evaluation === 4
                            ? "bg-emerald-100 text-emerald-700"
                            : t.evaluation === 3
                              ? "bg-sky-100 text-sky-700"
                              : t.evaluation === 2
                                ? "bg-orange-100 text-orange-700"
                                : t.evaluation === 1
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.evaluation}
                      </span>
                    </td>
                    <td className="p-4 whitespace-normal min-w-[200px] border-e border-slate-100">
                      {t.notes}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                  <td colSpan={7} className="p-8 text-center text-slate-500">
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
              setDateStr(today);
              setActiveTaskId(null);
            }}
            className="btn-secondary"
          >
            عودة
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {existingTasks
            .filter(
              (t) =>
                t.userId === currentUser?.id || currentUser?.role === "admin",
            )
            .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
            .map((task) => (
              <div
                key={task.id}
                className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Calendar size={18} />
                    {task.dateStr}
                  </div>
                  <div className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">
                    {task.items.length} عمل
                  </div>
                </div>
                <p className="text-slate-600 font-medium mb-1 truncate">
                  {task.supervisorName}
                </p>
                <p className="text-sm text-slate-500 mb-4 truncate">
                  {task.school} - {task.branch}
                </p>
                <button
                  onClick={() => {
                    setDateStr(task.dateStr);
                    setActiveTaskId(task.id);
                    setTasks(task.items);
                    setShowArchive(false);
                  }}
                  className="w-full btn-primary py-2 text-sm"
                >
                  فتح للتعديل
                </button>
              </div>
            ))}
          {existingTasks.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-8 bg-white rounded-xl border border-dashed border-slate-300">
              لا يوجد أرشيف سابق
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-arabic max-w-6xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={() => saveWork(tasks)}
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
          مؤشرات التميز والإبداع
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="mr-auto btn-secondary bg-slate-100"
          >
            العودة إلى التقارير الخاصة
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Briefcase size={20} className="text-blue-500" />
            بيانات المشرف الإداري
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className="text-sm text-slate-500 block mb-1">
              اسم المدرسة
            </label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {school || "--"}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">الفرع</label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {branch || "--"}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">
              العام الدراسي
            </label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {academicYear || "--"}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">
              اسم المشرف
            </label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {supervisorName}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">الوظيفة</label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {supervisorJob}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">الصف</label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {grade || "--"}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">الشعبة</label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {section || "--"}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 block mb-1">
              تاريخ اليوم
            </label>
            <div className="font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {dateStr}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-20">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className="bg-white rounded-2xl shadow-sm border-2 border-slate-100 overflow-hidden group"
          >
            <div className="bg-blue-50/50 border-b border-slate-100 p-4 flex justify-between items-center pr-6">
              <h4 className="font-bold text-blue-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </span>
                سجل الإبداع والتميز
              </h4>
              <button
                onClick={() => removeTask(task.id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="حذف"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <select
                  className="w-full p-3 mb-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-slate-700"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const newCat = task.category
                        ? `${task.category}\n- ${e.target.value}`
                        : `- ${e.target.value}`;
                      updateTask(task.id, { category: newCat });
                    }
                  }}
                >
                  <option value="" disabled>
                    اختر من مجالات التميز (يمكن اختيار أكثر من مجال)...
                  </option>
                  <optgroup label="المجال التقني والابتكاري:">
                    <option value="دمج الذكاء الاصطناعي تعليمياً.">
                      دمج الذكاء الاصطناعي تعليمياً.
                    </option>
                    <option value="تصميم بيئات تعلم افتراضية.">
                      تصميم بيئات تعلم افتراضية.
                    </option>
                    <option value="ابتكار تطبيقات تعليمية ذكية.">
                      ابتكار تطبيقات تعليمية ذكية.
                    </option>
                    <option value="إنتاج محتوى رقمي تفاعلي.">
                      إنتاج محتوى رقمي تفاعلي.
                    </option>
                  </optgroup>
                  <optgroup label="المجال المهني والبحثي:">
                    <option value="نشر بحوث إجرائية محكمة.">
                      نشر بحوث إجرائية محكمة.
                    </option>
                    <option value="تأليف أدلة تربوية رائدة.">
                      تأليف أدلة تربوية رائدة.
                    </option>
                    <option value="الحصول على براءات اختراع.">
                      الحصول على براءات اختراع.
                    </option>
                    <option value="تقديم أوراق عمل دولية.">
                      تقديم أوراق عمل دولية.
                    </option>
                  </optgroup>
                  <optgroup label="مجال الأثر الطلابي:">
                    <option value="حصد جوائز طلابية عالمية.">
                      حصد جوائز طلابية عالمية.
                    </option>
                    <option value="رعاية الموهوبين ببرامج ابتكارية.">
                      رعاية الموهوبين ببرامج ابتكارية.
                    </option>
                    <option value="تأسيس نوادي ابتكار مدرسية.">
                      تأسيس نوادي ابتكار مدرسية.
                    </option>
                    <option value="تصميم ألعاب تعليمية محفزة.">
                      تصميم ألعاب تعليمية محفزة.
                    </option>
                  </optgroup>
                  <optgroup label="المجال المجتمعي والمستدام:">
                    <option value="إطلاق مبادرات تطوعية مؤثرة.">
                      إطلاق مبادرات تطوعية مؤثرة.
                    </option>
                    <option value="تعزيز الاستدامة البيئية المدرسية.">
                      تعزيز الاستدامة البيئية المدرسية.
                    </option>
                    <option value="بناء شراكات مجتمعية فاعلة.">
                      بناء شراكات مجتمعية فاعلة.
                    </option>
                    <option value="قيادة مشاريع ريادة أعمال.">
                      قيادة مشاريع ريادة أعمال.
                    </option>
                  </optgroup>
                </select>
                <textarea
                  value={task.category}
                  onChange={(e) =>
                    updateTask(task.id, { category: e.target.value })
                  }
                  placeholder={`اكتب الإبداع والتميز هنا...`}
                  className="w-full min-h-[120px] p-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="space-y-4 relative">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                      أسماء المعلمين المشتركين في العمل
                    </label>
                    <button
                      onClick={() =>
                        setOpenTeacherDropdown(
                          openTeacherDropdown === task.id ? null : task.id,
                        )
                      }
                      className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <span className="text-sm text-slate-600 truncate flex-1 text-right">
                        {task.teacherNames && task.teacherNames.length > 0
                          ? `${task.teacherNames.length} معلمين محددين`
                          : "اختر المعلمين..."}
                      </span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {openTeacherDropdown === task.id && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-56 overflow-y-auto">
                        {uniqueTeachers.map((teacher) => (
                          <label
                            key={teacher}
                            className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={
                                task.teacherNames?.includes(teacher) || false
                              }
                              onChange={(e) => {
                                const currentNames = task.teacherNames || [];
                                if (e.target.checked) {
                                  updateTask(task.id, {
                                    teacherNames: [...currentNames, teacher],
                                  });
                                } else {
                                  updateTask(task.id, {
                                    teacherNames: currentNames.filter(
                                      (n) => n !== teacher,
                                    ),
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {teacher}
                            </span>
                          </label>
                        ))}
                        {uniqueTeachers.length === 0 && (
                          <div className="text-xs text-slate-500 text-center py-4">
                            لا يوجد معلمين مسجلين
                          </div>
                        )}
                        <button
                          onClick={() => setOpenTeacherDropdown(null)}
                          className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                          موافق
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-500 block mb-1 font-bold">
                      تاريخ العمل
                    </label>
                    <input
                      type="date"
                      value={task.dateStr}
                      onChange={(e) =>
                        updateTask(task.id, { dateStr: e.target.value })
                      }
                      className="input-field py-2 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <div className="text-center font-bold text-slate-600 mb-3 text-sm">
                      — تقييم الإبداع —
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((num) => {
                        let activeColor = "";
                        let hoverColor = "";
                        if (num === 4) {
                          activeColor =
                            "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm";
                          hoverColor = "hover:border-emerald-200";
                        } else if (num === 3) {
                          activeColor =
                            "bg-sky-50 border-sky-500 text-sky-700 shadow-sm";
                          hoverColor = "hover:border-sky-200";
                        } else if (num === 2) {
                          activeColor =
                            "bg-orange-50 border-orange-500 text-orange-700 shadow-sm";
                          hoverColor = "hover:border-orange-200";
                        } else if (num === 1) {
                          activeColor =
                            "bg-red-50 border-red-500 text-red-700 shadow-sm";
                          hoverColor = "hover:border-red-200";
                        }

                        return (
                          <button
                            key={num}
                            onClick={() =>
                              updateTask(task.id, { evaluation: num as any })
                            }
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                              task.evaluation === num
                                ? activeColor
                                : `border-slate-100 hover:bg-slate-50 text-slate-500 ${hoverColor}`
                            }`}
                          >
                            <span className="text-2xl font-black mb-1">
                              {num}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="h-full">
                  <label className="text-sm font-bold text-slate-700 block mb-2">
                    ملاحظات عامة
                  </label>
                  <textarea
                    value={task.notes}
                    onChange={(e) =>
                      updateTask(task.id, { notes: e.target.value })
                    }
                    placeholder="ملاحظات..."
                    className="w-full h-[225px] p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-center mt-8">
          <button
            onClick={addTaskRow}
            className="flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
          >
            <Plus size={24} />
            إضافة عنصر جديد
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Filter className="text-blue-500" />
                مؤشرات التميز والإبداع
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-2 font-bold">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    className="input-field"
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
                    className="input-field"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-3 font-bold">
                  حسب تقييم الإبداع
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterEvaluation["1"]}
                      onChange={(e) =>
                        setFilterEvaluation((prev) => ({
                          ...prev,
                          "1": e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">
                      الإبداع والتميز الحاصل على رقم 1
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterEvaluation["2"]}
                      onChange={(e) =>
                        setFilterEvaluation((prev) => ({
                          ...prev,
                          "2": e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">
                      الإبداع والتميز الحاصل على رقم 2
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={filterEvaluation["3"]}
                      onChange={(e) =>
                        setFilterEvaluation((prev) => ({
                          ...prev,
                          "3": e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">
                      الإبداع والتميز الحاصل على رقم 3
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={filterEvaluation["4"]}
                      onChange={(e) =>
                        setFilterEvaluation((prev) => ({
                          ...prev,
                          "4": e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">
                      الإبداع والتميز الحاصل على رقم 4
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleApplyFilter}
                className="flex-1 btn-primary py-3"
              >
                موافق (عرض النتائج)
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="flex-1 btn-secondary py-3"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
