import React, { useState, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import { IssueRecommendationReport, IssueRecommendationItem } from "../types";
import {
  Calendar,
  Save,
  Archive,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Trash2,
  Briefcase,
  FileSpreadsheet,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { exportToStyledExcel } from "../src/lib/excelExport";

interface Props {
  onClose?: () => void;
}

export const IssuesAndRecommendationsView: React.FC<Props> = ({ onClose }) => {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const today = new Date().toISOString().split("T")[0];

  const [dateStr, setDateStr] = useState(today);
  const [tasks, setTasks] = useState<IssueRecommendationItem[]>([
    {
      id: crypto.randomUUID(),
      type: "issue",
      content: "",
      dateFrom: today,
      dateTo: today,
      notes: "",
      status: "in_progress_issue",
    },
  ]);

  const existingTasks = data.issueRecommendations || [];

  const [showArchive, setShowArchive] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);
  const [filterTypes, setFilterTypes] = useState<Record<string, boolean>>({
    issue: true,
    recommendation: true,
    suggestion: true,
  });
  const [filterStatus, setFilterStatus] = useState<Record<string, boolean>>({
    solved: true,
    in_progress_issue: true,
    not_solved: true,
    adopted: true,
    under_review: true,
    implemented_differently: true,
  });
  const [filteredResults, setFilteredResults] = useState<
    | (IssueRecommendationItem & {
        _parent: IssueRecommendationReport;
        uniqueId: string;
      })[]
    | null
  >(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

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
                  type: "issue",
                  content: "",
                  dateFrom: dateStr,
                  dateTo: dateStr,
                  notes: "",
                  status: "in_progress_issue",
                },
              ],
        );
        setActiveTaskId(todaysEntry.id);
      } else {
        setTasks([
          {
            id: crypto.randomUUID(),
            type: "issue",
            content: "",
            dateFrom: dateStr,
            dateTo: dateStr,
            notes: "",
            status: "in_progress_issue",
          },
        ]);
        setActiveTaskId(null);
      }
    }
  }, [dateStr, existingTasks.length, showArchive, showFilter]);

  const saveWork = (currentTasks: IssueRecommendationItem[]) => {
    const validTasks = currentTasks.filter((t) => t.content.trim() !== "");
    if (validTasks.length === 0 && currentTasks.length > 0) {
      return;
    }

    const newObj: IssueRecommendationReport = {
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

    updateData({ issueRecommendations: updatedTasks });
    if (!activeTaskId) {
      setActiveTaskId(newObj.id);
    }
  };

  const addTaskRow = () => {
    const newTasks = [
      ...tasks,
      {
        id: crypto.randomUUID(),
        type: "issue" as const,
        content: "",
        dateFrom: dateStr,
        dateTo: dateStr,
        notes: "",
        status: "in_progress_issue" as const,
      },
    ];
    setTasks(newTasks);
  };

  const updateTask = (
    id: string,
    updates: Partial<IssueRecommendationItem>,
  ) => {
    const newTasks = [...tasks];
    const i = newTasks.findIndex((t) => t.id === id);
    if (i >= 0) {
      let updatedTask = { ...newTasks[i], ...updates };
      // Handle type change defaults
      if (updates.type) {
        if (updates.type === "issue") {
          updatedTask.status = "in_progress_issue";
        } else {
          updatedTask.status = "under_review";
        }
      }
      newTasks[i] = updatedTask;

      if (
        i === newTasks.length - 1 &&
        updates.content !== undefined &&
        updates.content.trim() !== ""
      ) {
        newTasks.push({
          id: crypto.randomUUID(),
          type: updatedTask.type,
          content: "",
          dateFrom: dateStr,
          dateTo: dateStr,
          notes: "",
          status: updatedTask.status,
        });
      }
    }
    setTasks(newTasks);
    // Auto-save on every change
    setTimeout(() => saveWork(newTasks), 500);
  };

  const removeTask = (id: string) => {
    const newTasks = tasks.filter((t) => t.id !== id);
    setTasks(newTasks);
    setTimeout(() => saveWork(newTasks), 500);
  };

  const handleApplyFilter = () => {
    let results: (IssueRecommendationItem & {
      _parent: IssueRecommendationReport;
      uniqueId: string;
    })[] = [];
    existingTasks.forEach((task) => {
      if (task.dateStr >= filterStartDate && task.dateStr <= filterEndDate) {
        task.items.forEach((t) => {
          if (filterTypes[t.type] && filterStatus[t.status]) {
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
      if (a._parent.dateStr !== b._parent.dateStr)
        return b._parent.dateStr.localeCompare(a._parent.dateStr);
      return 0;
    });

    setSelectedTaskIds([]);
    setFilteredResults(results);
    setShowFilter(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "solved":
        return "تم حلها";
      case "in_progress_issue":
        return "قيد المتابعة";
      case "not_solved":
        return "لم يتم الحل";
      case "adopted":
        return "تم الأخذ بها";
      case "under_review":
        return "قيد المراجعة";
      case "implemented_differently":
        return "نفذت بشكل مختلف";
      default:
        return "";
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "issue":
        return "مشكلة يومية";
      case "recommendation":
        return "توصية";
      case "suggestion":
        return "مقترح";
      default:
        return "";
    }
  };

  const handleExportExcel = async () => {
    if (!filteredResults || filteredResults.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = [
      "م",
      "النوع",
      "المحتوى",
      "من تاريخ",
      "إلى تاريخ",
      "المنفذ",
      "المدرسة والفرع",
      "الحالة",
      "الملاحظات",
    ];
    const exportData = filteredResults.map((t, idx) => [
      idx + 1,
      getTypeText(t.type),
      t.content,
      t.dateFrom,
      t.dateTo,
      t._parent.supervisorName,
      `${t._parent.school} - ${t._parent.branch}`,
      getStatusText(t.status),
      t.notes,
    ]);

    await exportToStyledExcel({
      title: "تقرير المشكلات والتوصيات والمقترحات",
      filename: "issues_recommendations_report",
      headers,
      data: exportData,
      columnWidths: [5, 15, 40, 15, 15, 20, 20, 15, 30],
      profile: data.profile || {},
      onRow: (row, rowData) => {
        const type = rowData[1];
        const typeCell = row.getCell(2);
        if (type === "مشكلة يومية") {
          typeCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF9F1239" },
          };
        } else if (type === "توصية") {
          typeCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF065F46" },
          };
        } else if (type === "مقترح") {
          typeCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF1E40AF" },
          };
        }

        const status = rowData[7];
        const statusCell = row.getCell(8);
        if (["تم حلها", "تم الأخذ بها"].includes(status)) {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD1FAE5" },
          };
          statusCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF065F46" },
          };
        } else if (
          ["قيد المتابعة", "قيد المراجعة", "نفذت بشكل مختلف"].includes(status)
        ) {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF3C7" },
          };
          statusCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF92400E" },
          };
        } else if (["لم يتم الحل"].includes(status)) {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFE4E6" },
          };
          statusCell.font = {
            name: "Arial",
            bold: true,
            color: { argb: "FF9F1239" },
          };
        }
      },
    });
  };

  const generateWhatsAppMessage = (
    tasksToExport: (IssueRecommendationItem & {
      _parent: IssueRecommendationReport;
    })[],
  ) => {
    let msg = `*📋 تقرير المشكلات والتوصيات والمقترحات*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;

    tasksToExport.forEach((t, idx) => {
      const typeIcon =
        t.type === "issue" ? "⚠️" : t.type === "recommendation" ? "💡" : "🌟";
      const statusIcon = ["solved", "adopted"].includes(t.status)
        ? "✅"
        : [
              "in_progress_issue",
              "under_review",
              "implemented_differently",
            ].includes(t.status)
          ? "⏳"
          : "❌";

      msg += `*${idx + 1}- ${typeIcon} ${getTypeText(t.type)}:*\n${t.content}\n`;
      msg += `👤 *المنفذ:* ${t._parent.supervisorName} (${t._parent.supervisorJob})\n`;
      msg += `📅 *الفترة:* من ${t.dateFrom} إلى ${t.dateTo}\n`;
      msg += `🏢 *المدرسة:* ${t._parent.school} - ${t._parent.branch}\n`;
      msg += `📊 *الحالة:* ${statusIcon} ${getStatusText(t.status)}\n`;
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
            مؤشرات المشكلات والتوصيات
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
              عودة للمشكلات والتوصيات
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
                <th className="p-4 border-b border-blue-900">النوع</th>
                <th className="p-4 border-b border-blue-900">المحتوى</th>
                <th className="p-4 border-b border-blue-900">من تاريخ</th>
                <th className="p-4 border-b border-blue-900">إلى تاريخ</th>
                <th className="p-4 border-b border-blue-900">المدرسة والفرع</th>
                <th className="p-4 border-b border-blue-900">حالة التنفيذ</th>
                <th className="p-4 border-b border-blue-900">ملاحظات عامة</th>
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
                    className={`border-b last:border-0 hover:bg-orange-50 cursor-pointer transition-colors ${isSelected ? "bg-orange-100" : ""}`}
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
                    <td className="p-4 font-bold border-e border-slate-100">
                      {getTypeText(t.type)}
                    </td>
                    <td className="p-4 whitespace-normal min-w-[200px] border-e border-slate-100">
                      {t.content}
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      {t.dateFrom}
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      {t.dateTo}
                    </td>
                    <td className="p-4 border-e border-slate-100">
                      {t._parent.school} - {t._parent.branch}
                    </td>
                    <td className="p-4 border-e border-slate-100 font-bold">
                      {["solved", "adopted"].includes(t.status) && (
                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg flex flex-row items-center gap-1.5 w-max">
                          <CheckCircle size={16} /> {getStatusText(t.status)}
                        </span>
                      )}
                      {[
                        "in_progress_issue",
                        "under_review",
                        "implemented_differently",
                      ].includes(t.status) && (
                        <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg flex flex-row items-center gap-1.5 w-max">
                          <Clock size={16} /> {getStatusText(t.status)}
                        </span>
                      )}
                      {["not_solved"].includes(t.status) && (
                        <span className="bg-rose-100 text-rose-800 px-3 py-1.5 rounded-lg flex flex-row items-center gap-1.5 w-max">
                          <XCircle size={16} /> {getStatusText(t.status)}
                        </span>
                      )}
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
                  <td colSpan={9} className="p-8 text-center text-slate-500">
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
                    {task.items.length} عنصر
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
          مؤشرات المشكلات والتوصيات
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
              تاريخ الصفحة
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                setDateStr(e.target.value);
                setActiveTaskId(null);
              }}
              className="input-field"
            />
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
                <select
                  className="bg-transparent border-0 font-bold text-blue-800 focus:ring-0 cursor-pointer w-max"
                  value={task.type}
                  onChange={(e) =>
                    updateTask(task.id, { type: e.target.value as any })
                  }
                >
                  <option value="issue">المشكلات اليومية</option>
                  <option value="recommendation">التوصيات</option>
                  <option value="suggestion">المقترحات</option>
                </select>
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
                <textarea
                  value={task.content}
                  onChange={(e) =>
                    updateTask(task.id, { content: e.target.value })
                  }
                  placeholder={`اكتب ${getTypeText(task.type)} هنا...`}
                  className="w-full min-h-[100px] p-4 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addTaskRow();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 block mb-1">
                        الفترة (من تاريخ)
                      </label>
                      <input
                        type="date"
                        value={task.dateFrom}
                        onChange={(e) =>
                          updateTask(task.id, { dateFrom: e.target.value })
                        }
                        className="input-field py-2 text-sm bg-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 block mb-1">
                        الفترة (إلى تاريخ)
                      </label>
                      <input
                        type="date"
                        value={task.dateTo}
                        onChange={(e) =>
                          updateTask(task.id, { dateTo: e.target.value })
                        }
                        className="input-field py-2 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {task.type === "issue" ? (
                      <>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "solved" })
                          }
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            task.status === "solved"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                              : "border-slate-100 hover:border-emerald-200 text-slate-500"
                          }`}
                        >
                          <CheckCircle className="mb-2" size={24} />
                          <span className="text-sm font-bold">تم حلها</span>
                        </button>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "in_progress_issue" })
                          }
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            task.status === "in_progress_issue"
                              ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                              : "border-slate-100 hover:border-amber-200 text-slate-500"
                          }`}
                        >
                          <Clock className="mb-2" size={24} />
                          <span className="text-sm font-bold text-center">
                            قيد المتابعة
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "not_solved" })
                          }
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            task.status === "not_solved"
                              ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                              : "border-slate-100 hover:border-rose-200 text-slate-500"
                          }`}
                        >
                          <XCircle className="mb-2" size={24} />
                          <span className="text-sm font-bold text-center">
                            لم يتم الحل
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "adopted" })
                          }
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            task.status === "adopted"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                              : "border-slate-100 hover:border-emerald-200 text-slate-500"
                          }`}
                        >
                          <CheckCircle className="mb-2" size={24} />
                          <span className="text-sm font-bold">
                            تم الأخذ بها
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "under_review" })
                          }
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            task.status === "under_review"
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                              : "border-slate-100 hover:border-indigo-200 text-slate-500"
                          }`}
                        >
                          <Clock className="mb-2" size={24} />
                          <span className="text-sm font-bold text-center">
                            قيد المراجعة
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            updateTask(task.id, {
                              status: "implemented_differently",
                            })
                          }
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            task.status === "implemented_differently"
                              ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                              : "border-slate-100 hover:border-amber-200 text-slate-500"
                          }`}
                        >
                          <CheckCircle className="mb-2" size={24} />
                          <span className="text-sm font-bold text-center">
                            نفذت بشكل مختلف
                          </span>
                        </button>
                      </>
                    )}
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
                    className="w-full h-[155px] p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all resize-none"
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
                مؤشرات المشكلات والتوصيات
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
                  اختيار المجالات
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterTypes.issue}
                      onChange={(e) =>
                        setFilterTypes((prev) => ({
                          ...prev,
                          issue: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">
                      المشكلات اليومية
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterTypes.recommendation}
                      onChange={(e) =>
                        setFilterTypes((prev) => ({
                          ...prev,
                          recommendation: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">التوصيات</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={filterTypes.suggestion}
                      onChange={(e) =>
                        setFilterTypes((prev) => ({
                          ...prev,
                          suggestion: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-slate-700">المقترحات</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-3 font-bold">
                  حالات المشكلات
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterStatus.solved}
                      onChange={(e) =>
                        setFilterStatus((prev) => ({
                          ...prev,
                          solved: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-emerald-800">تم حلها</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterStatus.in_progress_issue}
                      onChange={(e) =>
                        setFilterStatus((prev) => ({
                          ...prev,
                          in_progress_issue: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-amber-800">
                      قيد المتابعة
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={filterStatus.not_solved}
                      onChange={(e) =>
                        setFilterStatus((prev) => ({
                          ...prev,
                          not_solved: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-rose-800">لم يتم الحل</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600 block mb-3 font-bold">
                  حالات التوصيات والمقترحات
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterStatus.adopted}
                      onChange={(e) =>
                        setFilterStatus((prev) => ({
                          ...prev,
                          adopted: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-emerald-800">
                      تم الأخذ بها
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterStatus.under_review}
                      onChange={(e) =>
                        setFilterStatus((prev) => ({
                          ...prev,
                          under_review: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-amber-800">
                      قيد المراجعة
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={filterStatus.implemented_differently}
                      onChange={(e) =>
                        setFilterStatus((prev) => ({
                          ...prev,
                          implemented_differently: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                    />
                    <span className="font-bold text-indigo-800">
                      نفذت بشكل مختلف
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
