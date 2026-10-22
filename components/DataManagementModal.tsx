import React, { useState, useRef } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  FileJson,
  User,
  School,
  Database,
  FileText,
  Calendar,
  Layers,
  RefreshCcw,
  Save,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const DataManagementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { lang, data, currentUser, updateData } = useGlobal();
  const isReadOnly = currentUser?.permissions?.readOnly === true;
  const [exportMode, setExportMode] = useState<
    "full" | "teacher" | "school" | "type"
  >("full");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedType, setSelectedType] = useState<
    "students" | "teachers" | "violations" | "substitutions"
  >("students");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [pendingData, setPendingData] = useState<any>(null);
  const [showImportChoice, setShowImportChoice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showStatus = (type: "error" | "success", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleExport = () => {
    setIsLoading(true);
    try {
      let dataToExport = { ...data };

      // Selective Export Logic
      if (exportMode === "teacher") {
        dataToExport = {
          ...data,
          dailyReports: data.dailyReports
            .map((report) => ({
              ...report,
              teachersData: report.teachersData.filter(
                (t) => t.teacherName === selectedTeacher,
              ),
            }))
            .filter((r) => r.teachersData.length > 0),
        };
      } else if (exportMode === "type") {
        const reset: any = { profile: data.profile };
        if (selectedType === "students")
          reset.studentReports = data.studentReports;
        if (selectedType === "teachers") reset.dailyReports = data.dailyReports;
        if (selectedType === "violations") reset.violations = data.violations;
        if (selectedType === "substitutions")
          reset.substitutions = data.substitutions;
        dataToExport = reset;
      }

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rafiquk_backup_${exportMode}_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showStatus("success", "تم التصدير بنجاح");
    } catch (e) {
      showStatus("error", "فشل التصدير");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    if (isReadOnly) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic validation
        if (!parsed || typeof parsed !== "object")
          throw new Error("Invalid JSON");

        setPendingData(parsed);
        setShowImportChoice(true);
      } catch (err) {
        showStatus("error", "ملف غير صالح أو تالف");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = (merge: boolean) => {
    if (isReadOnly) return;
    if (!pendingData) return;
    setIsLoading(true);

    try {
      if (merge) {
        // MERGE LOGIC
        const merged = { ...data };
        const incoming = pendingData;

        const arrayKeys = [
          "substitutions",
          "dailyReports",
          "violations",
          "parentVisits",
          "teacherFollowUps",
          "studentReports",
          "absenceLogs",
          "latenessLogs",
          "studentViolationLogs",
          "exitLogs",
          "damageLogs",
          "parentVisitLogs",
          "examLogs",
          "genericSpecialReports",
        ];

        arrayKeys.forEach((key) => {
          if (incoming[key] && Array.isArray(incoming[key])) {
            const currentArray = (merged as any)[key] || [];
            const combined = [...currentArray, ...incoming[key]];

            const seen = new Set();
            (merged as any)[key] = combined.filter((item) => {
              const id = item.id || JSON.stringify(item);
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
          }
        });

        if (incoming.customViolationElements) {
          merged.customViolationElements = {
            behavior: Array.from(
              new Set([
                ...(merged.customViolationElements?.behavior || []),
                ...(incoming.customViolationElements.behavior || []),
              ]),
            ),
            duties: Array.from(
              new Set([
                ...(merged.customViolationElements?.duties || []),
                ...(incoming.customViolationElements.duties || []),
              ]),
            ),
            achievement: Array.from(
              new Set([
                ...(merged.customViolationElements?.achievement || []),
                ...(incoming.customViolationElements.achievement || []),
              ]),
            ),
            exams: Array.from(
              new Set([
                ...(merged.customViolationElements?.exams || []),
                ...(incoming.customViolationElements.exams || []),
              ]),
            ),
          };
        }

        updateData(merged);
        showStatus("success", "تم دمج البيانات بنجاح! جاري المزامنة مع الخادم...");
      } else {
        // OVERRIDE LOGIC
        updateData(pendingData);
        showStatus("success", "تم استبدال البيانات بنجاح! جاري المزامنة مع الخادم...");
      }

    } catch (e) {
      showStatus("error", "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setIsLoading(false);
      setShowImportChoice(false);
      setPendingData(null);
    }
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImport(e.dataTransfer.files[0]);
    }
  };

  const teachersList = Array.from(
    new Set(
      data.dailyReports.flatMap((r) =>
        r.teachersData.map((t) => t.teacherName),
      ),
    ),
  ).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-arabic">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-blue-50">
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                إدارة ونقل البيانات
              </h2>
              <p className="text-blue-500 text-xs font-bold">
                نظام الأرشفة الذكي والنسخ الاحتياطي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Status Messages */}
          {statusMsg && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${statusMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <span className="font-bold">{statusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Export Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-black flex items-center gap-2">
                <Download className="text-blue-600" size={20} /> خيارات التصدير
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    id: "full",
                    label: "تصدير شامل",
                    sub: "جميع بيانات البرنامج والإعدادات",
                    icon: <Database />,
                  },
                  {
                    id: "teacher",
                    label: "تصدير لمعلم",
                    sub: "بيانات وتقارير معلم محدد فقط",
                    icon: <User />,
                  },
                  {
                    id: "type",
                    label: "تصدير حسب النوع",
                    sub: "تصفية حسب نوع التقارير",
                    icon: <FileText />,
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setExportMode(mode.id as any)}
                    className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center gap-4 ${exportMode === mode.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-blue-200"}`}
                  >
                    <div
                      className={`p-2 rounded-xl ${exportMode === mode.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      {mode.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-black">{mode.label}</div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {mode.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {exportMode === "teacher" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 animate-in zoom-in-95">
                  <label className="text-xs font-bold text-black block">
                    اختر المعلم:
                  </label>
                  <select
                    className="w-full p-3 rounded-xl border-2 border-slate-200 text-black font-bold outline-none focus:border-blue-500"
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                  >
                    <option value="">-- اختر من القائمة --</option>
                    {teachersList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exportMode === "type" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 animate-in zoom-in-95">
                  <label className="text-xs font-bold text-black block">
                    نوع البيانات:
                  </label>
                  <select
                    className="w-full p-3 rounded-xl border-2 border-slate-200 text-black font-bold outline-none focus:border-blue-500"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                  >
                    <option value="students">تقارير الطلاب</option>
                    <option value="teachers">متابعة المعلمين</option>
                    <option value="violations">التعهدات والمخالفات</option>
                    <option value="substitutions">جدول التغطية</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full p-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                بدء التصدير
              </button>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-black flex items-center gap-2">
                <Upload className="text-red-600" size={20} /> استيراد البيانات
              </h3>

              {/* START OF CHANGE - Contextual Choice UI */}
              {!showImportChoice ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-4 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 transition-all ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="p-5 bg-white rounded-full shadow-inner text-slate-400">
                    <FileJson size={48} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-black">
                      اسحب ملف النسخة الاحتياطية هنا
                    </p>
                    <p className="text-xs text-slate-500 font-bold">
                      أو اضغط لاختيار ملف من جهازك
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm hover:border-blue-400 transition-all"
                  >
                    اختيار ملف
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={(e) =>
                      e.target.files?.[0] && handleImport(e.target.files[0])
                    }
                  />
                </div>
              ) : (
                <div className="bg-slate-50 border-4 border-blue-100 rounded-[2rem] p-6 space-y-4 animate-in zoom-in-95">
                  <div className="text-center mb-4">
                    <div className="inline-block p-3 bg-blue-600 text-white rounded-2xl mb-3 shadow-lg">
                      <RefreshCcw size={24} />
                    </div>
                    <h4 className="font-black text-slate-800 text-lg">
                      تم تحميل ملف البيانات
                    </h4>
                    <p className="text-xs text-slate-500 font-bold">
                      يرجى اختيار طريقة معالجة البيانات المستوردة:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => executeImport(false)}
                      className="p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-red-500 transition-all text-right group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-all">
                          <Trash2 size={18} />
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-sm">
                            استيراد مع إلغاء السابق
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            حذف البيانات الحالية واستبدالها كلياً بالجديدة
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => executeImport(true)}
                      className="p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-green-500 transition-all text-right group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-500 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all">
                          <Layers size={18} />
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-sm">
                            استيراد مع إضافة البيانات لما هو موجود
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            دمج الملف المستورد مع السجلات الحالية للمدرسة
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowImportChoice(false)}
                      className="w-full py-3 text-slate-400 font-black text-xs hover:text-slate-600"
                    >
                      إلغاء العملية
                    </button>
                  </div>
                </div>
              )}
              {/* END OF CHANGE */}

              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="text-red-600 flex-shrink-0"
                    size={18}
                  />
                  <p className="text-[10px] text-red-700 font-black leading-relaxed">
                    تحذير: سيتم أرشفة نسخة مؤرخة من بياناتك الحالية تلقائياً في
                    السجل أدناه قبل تنفيذ أي عملية استيراد لضمان سلامة بياناتك.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="bg-slate-50 p-4 text-center border-t">
          <p className="text-[10px] text-slate-400 font-bold">
            بإشراف المستشار الإداري والتربوي إبراهيم دخان
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};

export default DataManagementModal;
