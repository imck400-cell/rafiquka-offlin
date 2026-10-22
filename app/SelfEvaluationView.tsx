import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  Calendar,
  User,
  BookOpen,
  Layers,
  School,
  MapPin,
  Archive,
  X,
  Eye,
  Calculator,
  List,
  Edit2,
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";
import { toast } from "sonner";
import { SelfEvaluation, SelfEvaluationRow } from "../types";
import * as XLSX from "xlsx-js-style";

const MultiSelectDropdown = ({
  value,
  options,
  onChange,
  placeholder,
  icon: Icon,
  colorClass,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = value
    ? value
        .split("،")
        .map((v: string) => v.trim())
        .filter(Boolean)
    : [];

  const toggleOption = (opt: string) => {
    let newVals;
    if (selectedValues.includes(opt)) {
      newVals = selectedValues.filter((v: string) => v !== opt);
    } else {
      newVals = [...selectedValues, opt];
    }
    onChange(newVals.join("، "));
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon className={colorClass} />
        <div className="font-bold text-slate-700 w-full truncate">
          {selectedValues.length > 0 ? selectedValues.join("، ") : placeholder}
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-[60] max-h-60 overflow-y-auto p-2">
          {options.map((opt: string) => (
            <label
              key={opt}
              className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-slate-700">{opt}</span>
            </label>
          ))}
          <div className="sticky bottom-0 bg-white pt-2 border-t mt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-1 text-sm bg-slate-100 font-bold rounded-lg hover:bg-slate-200"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const gradesOptions = [
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
  "12",
];
const subjectsOptions = [
  "القرآن كريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "الكيمياء",
  "الفيزياء",
  "الأحياء",
  "الاجتماعيات",
  "الحاسوب",
];

export const SelfEvaluationView = ({ onBack }: { onBack: () => void }) => {
  const { lang, currentUser, updateData, data } = useGlobal();

  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser.permissions.secretariat.includes("allowEdits");
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isReadOnly = !isGeneralSupervisor && isReadOnlyFlag && !isAllowEdits;
  const canEditStructure =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const canEditTemplate =
    canEditStructure ||
    (Array.isArray(currentUser?.permissions?.teacherPortal) &&
      currentUser?.permissions?.teacherPortal?.includes(
        "editEvaluationTemplate",
      ));

  const getFullFormattedDate = (d: Date = new Date()) => {
    try {
      const day = d.toLocaleDateString("ar-EG", { weekday: "long" });
      const gregorian = d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
      return `${day}، ${gregorian} م الموافق ${hijri} هـ`;
    } catch (e) {
      return d.toLocaleDateString("ar-EG");
    }
  };

  const userStaffProfile = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return null;
    }
    return data.secretariatStaff?.find(
      (s: any) => s.name?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase()
    );
  }, [data.secretariatStaff, currentUser]);

  const allowedSchools = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return data.availableSchools || [];
    }
    if (userStaffProfile?.school) {
      return [userStaffProfile.school];
    }
    return currentUser?.schools || [];
  }, [data.availableSchools, currentUser, userStaffProfile]);

  const allowedTeachers = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return (data.secretariatStaff || []).map((s: any) => ({ id: s.id || s.name, name: s.name }));
    }
    return [{ id: currentUser?.id || "id", name: currentUser?.name || "" }];
  }, [currentUser, data.secretariatStaff]);

  const [dateStr, setDateStr] = useState(getFullFormattedDate());
  const [reportName, setReportName] = useState("تقرير الأنشطة الفصلية");
  const [subject, setSubject] = useState("");
  const [teacherName, setTeacherName] = useState(currentUser?.name || "");
  const [grades, setGrades] = useState(currentUser?.grades?.join("، ") || "");
  const [schoolName, setSchoolName] = useState(
    currentUser?.selectedSchool || allowedSchools[0] || "",
  );

  const allowedBranches = useMemo(() => {
    const schoolBranchesMap = data.schoolBranches || {};
    const branchesOfSchool = schoolBranchesMap[schoolName] || [];
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return branchesOfSchool;
    }
    if (userStaffProfile?.branch) {
      return [userStaffProfile.branch];
    }
    const authBranches = currentUser?.permissions?.schoolsAndBranches?.[schoolName] || [];
    if (authBranches.length > 0) {
      return branchesOfSchool.filter((b) => authBranches.includes(b));
    }
    return branchesOfSchool;
  }, [data.schoolBranches, schoolName, currentUser, userStaffProfile]);

  const allowedSubjects = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return subjectsOptions;
    }
    if (userStaffProfile?.subjects && userStaffProfile.subjects.length > 0) {
      return userStaffProfile.subjects;
    }
    if (currentUser?.subjects && currentUser.subjects.length > 0) {
      return currentUser.subjects;
    }
    return subjectsOptions;
  }, [currentUser, userStaffProfile, subjectsOptions]);

  const allowedGrades = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) {
      return gradesOptions;
    }
    if (userStaffProfile?.grades && userStaffProfile.grades.length > 0) {
      return userStaffProfile.grades;
    }
    if (currentUser?.grades && currentUser.grades.length > 0) {
      return currentUser.grades;
    }
    return gradesOptions;
  }, [currentUser, userStaffProfile, gradesOptions]);

  const [branchName, setBranchName] = useState(
    currentUser?.selectedBranch || allowedBranches[0] || "",
  );

  useEffect(() => {
    if (allowedSchools.length > 0 && !allowedSchools.includes(schoolName)) {
      setSchoolName(allowedSchools[0]);
    }
  }, [allowedSchools]);

  useEffect(() => {
    if (allowedBranches.length > 0 && !allowedBranches.includes(branchName)) {
      setBranchName(allowedBranches[0]);
    }
  }, [allowedBranches]);

  useEffect(() => {
    if (allowedTeachers.length > 0 && !allowedTeachers.some(t => t.name === teacherName)) {
      setTeacherName(allowedTeachers[0].name);
    }
  }, [allowedTeachers]);
  const [maxScores, setMaxScores] = useState({ planned: 2, executed: 2 });
  const [currentEvalId, setCurrentEvalId] = useState(Date.now().toString());

  const defaultColumns = [
    { id: "no", label: "م" },
    { id: "activity", label: "الأنشطة المقامة" },
    { id: "planned", label: "المخطط" },
    { id: "executed", label: "المنفذ" },
    { id: "total", label: "مجموع" },
    { id: "percentage", label: "نسبة" },
    { id: "note", label: "ملاحظة" },
  ];

  const defaultRows: SelfEvaluationRow[] = [
    {
      id: "h1",
      category: "header",
      no: "",
      activity: "الأنشطة التربوية",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r1",
      category: "الأنشطة التربوية",
      no: "1",
      activity: "تنوع الاستراتيجيات المستخدمة",
      planned: "12",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r2",
      category: "الأنشطة التربوية",
      no: "2",
      activity: "تنفيذ برنامج التقوية والتأهيل",
      planned: "3",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r3",
      category: "الأنشطة التربوية",
      no: "3",
      activity: "الزيارة التبادلية",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r4",
      category: "الأنشطة التربوية",
      no: "4",
      activity: "الأنشطة اللاصفية",
      planned: "3",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r5",
      category: "الأنشطة التربوية",
      no: "5",
      activity: "تسليم الامتحانات في الوقت المطلوب بعد التعديل",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r6",
      category: "الأنشطة التربوية",
      no: "6",
      activity: "التأخر عن الخطة الشهرية في الدروس",
      planned: "0",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r7",
      category: "الأنشطة التربوية",
      no: "7",
      activity: "المشاركة في الدورات واللقاءات بفاعلية",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "h2",
      category: "header",
      no: "",
      activity: "الأنشطة الإدارية",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r8",
      category: "الأنشطة الإدارية",
      no: "8",
      activity: "الإشراف بفاعلية في الطابور",
      planned: "22",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r8a",
      category: "الأنشطة الإدارية",
      no: "",
      activity: "في الراحة",
      planned: "8",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r8b",
      category: "الأنشطة الإدارية",
      no: "",
      activity: "نهاية الدوام",
      planned: "8",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r9",
      category: "الأنشطة الإدارية",
      no: "9",
      activity: "التحضير اليومي عدد الأيام",
      planned: "22",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r10",
      category: "الأنشطة الإدارية",
      no: "10",
      activity: "تفعيل الريادة حسب الجدول",
      planned: "4",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r11",
      category: "الأنشطة الإدارية",
      no: "11",
      activity: "تصحيح دفاتر الطلاب مرتين في الأسبوع",
      planned: "8",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r12",
      category: "الأنشطة الإدارية",
      no: "12",
      activity: "كتابة ملاحظات على دفاتر المتابعة ثلاث مرات أسبوعياً",
      planned: "12",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r13",
      category: "الأنشطة الإدارية",
      no: "13",
      activity: "تسليم كشوف الدرجات في الوقت المطلوب",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r14",
      category: "الأنشطة الإدارية",
      no: "14",
      activity: "تفعيل الإذاعة",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r15",
      category: "الأنشطة الإدارية",
      no: "15",
      activity: "المشاركة في الأنشطة مع مسؤول الأنشطة",
      planned: "2",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r16",
      category: "الأنشطة الإدارية",
      no: "16",
      activity: "عدد المخالفات",
      planned: "0",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "h3",
      category: "header",
      no: "",
      activity: "الوسائل والمصادر",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r17",
      category: "الوسائل والمصادر",
      no: "17",
      activity: "عدد الوسائل المستخدمة (قصاصات وكروت)",
      planned: "4",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r17a",
      category: "الوسائل والمصادر",
      no: "",
      activity: "لوحات جدارية",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r17b",
      category: "الوسائل والمصادر",
      no: "",
      activity: "نماذج من الطبيعة",
      planned: "2",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r17c",
      category: "الوسائل والمصادر",
      no: "",
      activity: "صوتيات ومرئيات",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r17d",
      category: "الوسائل والمصادر",
      no: "",
      activity: "غير ذلك ـــــــ",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r18",
      category: "الوسائل والمصادر",
      no: "18",
      activity: "عدد المصادر المستخدمة (معمل الحاسوب)",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r18a",
      category: "الوسائل والمصادر",
      no: "",
      activity: "معمل العلوم",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r18b",
      category: "الوسائل والمصادر",
      no: "",
      activity: "شاشة العرض",
      planned: "1",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r18c",
      category: "الوسائل والمصادر",
      no: "",
      activity: "أخرى ـــــــ",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "h4",
      category: "header",
      no: "",
      activity: "الغياب والتأخر",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r19",
      category: "الغياب والتأخر",
      no: "19",
      activity: "عدد أيام الغياب",
      planned: "0",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "r20",
      category: "الغياب والتأخر",
      no: "20",
      activity: "عدد أيام التأخر",
      planned: "0",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
    {
      id: "hf",
      category: "footer",
      no: "",
      activity: "الإجمالي",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    },
  ];


  const schoolKey = schoolName + "_" + branchName;
  const initialCols =
    data.selfEvaluationTemplates?.[schoolKey]?.columns || defaultColumns;
  const initialRows =
    data.selfEvaluationTemplates?.[schoolKey]?.rows || defaultRows;

  const [columns, setColumns] = useState(initialCols);
  const [rows, setRows] = useState<SelfEvaluationRow[]>(initialRows);
  const [searchQuery, setSearchQuery] = useState("");

  const [showArchive, setShowArchive] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  const prevTmplRef = useRef(data.selfEvaluationTemplates?.[schoolKey]);

  const calculateRowSums = (currentRowList: SelfEvaluationRow[]) => {
    return currentRowList.map((row) => {
      if (row.category === "header" || row.category === "footer") return row;
      const pStr = (row.planned || "").toString().trim();
      const p = parseFloat(pStr);

      let sumE = 0;
      Object.keys(row).forEach((k) => {
        if (k === "executed" || k.startsWith("exec_")) {
          sumE += parseFloat((row as any)[k]) || 0;
        }
      });

      let total;
      let percentage;

      if (pStr !== "" && p === 0) {
        total = -sumE;
        percentage = sumE > 0 ? `-${sumE * 100}%` : "0%";
      } else {
        const plannedVal = p || 0;
        total = sumE;
        percentage =
          plannedVal > 0 ? ((sumE / plannedVal) * 100).toFixed(1) + "%" : "";
      }
      return { ...row, total: total.toString(), percentage };
    });
  };

  useEffect(() => {
    const currentTmpl = data.selfEvaluationTemplates?.[schoolKey];
    if (
      currentTmpl &&
      JSON.stringify(currentTmpl) !== JSON.stringify(prevTmplRef.current)
    ) {
      prevTmplRef.current = currentTmpl;

      setRows((prevRows) => {
        const newRows = JSON.parse(JSON.stringify(currentTmpl.rows));
        newRows.forEach((nr: any) => {
          const existing = prevRows.find(
            (pr: any) => pr.id === nr.id || pr.activity === nr.activity,
          );
          if (existing) {
            Object.keys(existing).forEach((k) => {
              if (k === "executed" || k.startsWith("exec_")) {
                nr[k] = existing[k];
              }
            });
          }
        });
        return calculateRowSums(newRows);
      });

      setColumns((prevCols) => {
        const newCols = JSON.parse(JSON.stringify(currentTmpl.columns));
        const planColsIds = newCols.map((c: any) => c.id);
        const execCols = prevCols.filter(
          (c: any) =>
            !planColsIds.includes(c.id) &&
            (c.id === "executed" || c.id.startsWith("exec_")),
        );
        return [...newCols, ...execCols];
      });
    }
  }, [data.selfEvaluationTemplates, schoolKey]);

  const handleUpdateDate = () => {
    setDateStr(getFullFormattedDate(new Date()));
  };

  const handleSave = () => {
    if (isReadOnly) {
      toast.error("للقراءة فقط");
      return;
    }

    if (
      !window.confirm(
        "تأكيد حفظ التقرير؟ سيتم تحديث التقرير إذا كان بنفس التاريخ، أو إنشاء جديد.",
      )
    )
      return;

    const evals = data.selfEvaluations || [];

    const existingIndex = evals.findIndex(
      (e: any) => e.dateStr === dateStr && e.teacherName === teacherName,
    );
    const evalId = existingIndex >= 0 ? evals[existingIndex].id : currentEvalId;

    const newEval: SelfEvaluation = {
      id: evalId,
      userId: currentUser?.id,
      schoolId: schoolName,
      dateStr,
      reportName,
      teacherName,
      subject,
      grades,
      schoolName,
      branchName,
      rows,
      maxScores,
    };

    let newEvals;
    if (existingIndex >= 0) {
      newEvals = [...evals];
      newEvals[existingIndex] = newEval;
    } else {
      newEvals = [...evals, newEval];
    }

    updateData({ selfEvaluations: newEvals });
    toast.success("تم الحفظ بنجاح");
  };

  const loadEvaluation = (ev: SelfEvaluation) => {
    setReportName(ev.reportName || "تقرير الأنشطة الفصلية");
    setDateStr(ev.dateStr);
    setTeacherName(ev.teacherName);
    setSubject(ev.subject);
    setGrades(ev.grades);
    setSchoolName(ev.schoolName);
    setBranchName(ev.branchName);
    setRows(ev.rows);
    setMaxScores(ev.maxScores || { planned: 2, executed: 2 });
    setCurrentEvalId(ev.id);
    setShowArchive(false);
  };

  const deleteEvaluation = (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التقرير؟")) return;
    const newEvals = (data.selfEvaluations || []).filter((e) => e.id !== id);
    updateData({ selfEvaluations: newEvals });
  };

  const handleExportExcel = () => {
    const wsData: any[][] = [];
    wsData.push([reportName]);
    wsData.push([
      "المدرسة",
      schoolName,
      "الفرع",
      branchName,
      "تاريخ التقييم",
      dateStr,
    ]);
    wsData.push(["المعلم", teacherName, "المادة", subject, "الصفوف", grades]);
    wsData.push([]);

    wsData.push(columns.map((c) => c.label));

    rows.forEach((r) => {
      wsData.push(columns.map((c) => (r as any)[c.id] || ""));
    });

    const sumP = rows.reduce(
      (acc, r) =>
        acc +
        (r.category !== "header" && r.category !== "footer"
          ? parseFloat(r.planned as string) || 0
          : 0),
      0,
    );
    const sumE = rows.reduce((acc, r) => {
      if (r.category !== "header" && r.category !== "footer") {
        const pStr = (r.planned || "").toString().trim();
        const p = parseFloat(pStr);
        let cellSumE = 0;
        Object.keys(r).forEach((k) => {
          if (k === "executed" || k.startsWith("exec_")) {
            cellSumE += parseFloat((r as any)[k]) || 0;
          }
        });
        return acc + (pStr !== "" && p === 0 ? -cellSumE : cellSumE);
      }
      return acc;
    }, 0);
    const overallRatio = sumP > 0 ? ((sumE / sumP) * 100).toFixed(1) + "%" : "";

    const finalRow: string[] = columns.map(() => "");
    const actIndex = columns.findIndex((c) => c.id === "activity");
    if (actIndex !== -1) finalRow[actIndex] = "النسبة العامة";
    const planIndex = columns.findIndex((c) => c.id === "planned");
    if (planIndex !== -1) finalRow[planIndex] = sumP.toString();
    const execIndex = columns.findIndex((c) => c.id === "executed");
    if (execIndex !== -1) finalRow[execIndex] = sumE.toString();
    const totalIndex = columns.findIndex((c) => c.id === "total");
    if (totalIndex !== -1) finalRow[totalIndex] = sumE.toString();
    const percIndex = columns.findIndex((c) => c.id === "percentage");
    if (percIndex !== -1) finalRow[percIndex] = overallRatio;

    wsData.push(finalRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = columns.map((c) => {
      if (c.id === "no") return { wch: 5 };
      if (c.id === "activity") return { wch: 50 };
      return { wch: 15 };
    });

    ws["!dir"] = "rtl";

    const getCellStr = (R: number, C: number) =>
      XLSX.utils.encode_cell({ c: C, r: R });

    const borderStyle = {
      top: { style: "thin", color: { auto: 1 } },
      bottom: { style: "thin", color: { auto: 1 } },
      left: { style: "thin", color: { auto: 1 } },
      right: { style: "thin", color: { auto: 1 } },
    };

    const headerFill = { fgColor: { rgb: "4a85c8" } };
    const summaryFillRed = { fgColor: { rgb: "f4cccc" } };
    const summaryFillGreen = { fgColor: { rgb: "d9ead3" } };

    for (let R = 0; R < wsData.length; ++R) {
      for (let C = 0; C < wsData[R].length; ++C) {
        const cellAddress = getCellStr(R, C);
        if (!ws[cellAddress]) continue;

        let cellStyle: any = {
          font: { name: "Arial", sz: 12, bold: false },
          alignment: { vertical: "center", horizontal: "center" },
        };

        if (R === 0) {
          cellStyle.font.bold = true;
          cellStyle.font.sz = 16;
        } else if (R === 1 || R === 2) {
          cellStyle.font.bold = true;
          if (C === 0 || C === 2 || C === 4) {
            cellStyle.fill = headerFill;
            cellStyle.font.color = { rgb: "FFFFFF" };
          }
        } else if (R === 4) {
          cellStyle.fill = headerFill;
          cellStyle.font.color = { rgb: "FFFFFF" };
          cellStyle.font.bold = true;
          cellStyle.border = borderStyle;
        } else if (R > 4 && R < wsData.length - 1) {
          cellStyle.border = borderStyle;
          const rowObj = rows[R - 5];
          if (rowObj) {
            if (rowObj.category === "header") {
              cellStyle.fill = summaryFillRed;
              cellStyle.font.bold = true;
            } else if (rowObj.category === "footer") {
              cellStyle.fill = summaryFillGreen;
              cellStyle.font.bold = true;
            } else {
              if ((R - 5) % 2 === 0) {
                cellStyle.fill = { fgColor: { rgb: "FFFFFF" } };
              } else {
                cellStyle.fill = { fgColor: { rgb: "f8fafc" } };
              }
            }
          }
        } else if (R === wsData.length - 1) {
          cellStyle.border = borderStyle;
          cellStyle.font.bold = true;
          cellStyle.fill = { fgColor: { rgb: "fff2cc" } };
        }

        ws[cellAddress].s = cellStyle;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقييم الذاتي");
    XLSX.writeFile(
      wb,
      `التقييم_الذاتي_${teacherName.replace(/\s+/g, "_")}_${dateStr.replace(/\//g, "-")}.xlsx`,
    );
  };

  const handleRowChange = (
    index: number,
    key: keyof SelfEvaluationRow | string,
    val: string,
  ) => {
    const newRows = [...rows];
    (newRows[index] as any)[key] = val;
    setRows(calculateRowSums(newRows));
  };

  const handleMaxScoreChange = (type: "planned" | "executed", val: string) => {
    setMaxScores((prev) => ({ ...prev, [type]: parseFloat(val) || 0 }));
  };

  const addRow = (index: number) => {
    if (!canEditStructure) return;
    const newRows = [...rows];
    newRows.splice(index + 1, 0, {
      id: Date.now().toString(),
      category: "",
      no: "",
      activity: "",
      planned: "",
      executed: "",
      total: "",
      percentage: "",
      note: "",
    });
    setRows(newRows);
  };

  const deleteRow = (index: number) => {
    if (!canEditStructure) return;
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const addColumn = () => {
    if (!canEditStructure) return;
    const newColId = "col_" + Date.now();
    const newLabel = prompt("اسم العمود الجديد:");
    if (!newLabel) return;
    setColumns([...columns, { id: newColId, label: newLabel }]);
  };

  const deleteColumn = (colId: string) => {
    if (!canEditStructure) return;
    if (columns.length <= 2) return;
    setColumns(columns.filter((c) => c.id !== colId));
  };

  const filteredRows = rows.filter((r) =>
    searchQuery === ""
      ? true
      : Object.values(r).some((v) => v?.toString().includes(searchQuery)),
  );

  const prevEvals = (data.selfEvaluations || []).filter(
    (e) => e.userId === currentUser?.id || currentUser?.role === "admin",
  );

  // Calculation for Overall Ratio
  const sumPlanned = rows.reduce(
    (acc, r) =>
      acc +
      (r.category !== "header" && r.category !== "footer"
        ? parseFloat(r.planned as string) || 0
        : 0),
    0,
  );
  const sumExecuted = rows.reduce((acc, r) => {
    if (r.category !== "header" && r.category !== "footer") {
      const pStr = (r.planned || "").toString().trim();
      const p = parseFloat(pStr);
      let cellSumE = 0;
      Object.keys(r).forEach((k) => {
        if (k === "executed" || k.startsWith("exec_")) {
          cellSumE += parseFloat((r as any)[k]) || 0;
        }
      });
      return acc + (pStr !== "" && p === 0 ? -cellSumE : cellSumE);
    }
    return acc;
  }, 0);
  const overallPercentage =
    sumPlanned > 0 ? ((sumExecuted / sumPlanned) * 100).toFixed(1) + "%" : "";

  const generateCombinedIndicators = () => {
    if (selectedIndicators.length === 0) {
      toast.error("الرجاء اختيار التقارير أولاً");
      return;
    }

    const selectedEvalsList = prevEvals
      .filter((e) => selectedIndicators.includes(e.id))
      .sort(
        (a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime(),
      );
    if (selectedEvalsList.length === 0) return;

    // Merge tables
    const baseEval = selectedEvalsList[0];
    const firstDate = selectedEvalsList[0].dateStr;
    const lastDate = selectedEvalsList[selectedEvalsList.length - 1].dateStr;

    toast.success(
      `تم دمج ${selectedEvalsList.length} تقارير، جاري عرض الجدول المدمج`,
    );

    let newCols = [
      ...defaultColumns.filter(
        (c) => c.id !== "executed" && c.id !== "total" && c.id !== "percentage",
      ),
    ];
    newCols.push({ id: "executed", label: "المنفذ" });
    newCols.push({ id: "total", label: "المجموع الكلي" });
    newCols.push({ id: "percentage", label: "النسبة الكلية" });

    let newRows = [...baseEval.rows].map((row) => {
      if (row.category === "header" || row.category === "footer") return row;

      const newRowObj: any = { ...row };

      let sumP = 0;
      let sumE = 0;
      let pParts: string[] = [];
      let eParts: string[] = [];

      selectedEvalsList.forEach((ev) => {
        const matchingRow = ev.rows.find(
          (r) => r.id === row.id || r.activity === row.activity,
        );
        const pVal = matchingRow
          ? parseFloat(matchingRow.planned as string) || 0
          : 0;
        let eVal = 0;
        if (matchingRow) {
          Object.keys(matchingRow).forEach((k) => {
            if (k === "executed" || k.startsWith("exec_")) {
              eVal += parseFloat(matchingRow[k]) || 0;
            }
          });
        }
        pParts.push(pVal.toString());
        eParts.push(eVal.toString());
        sumP += pVal;
        sumE += eVal;
      });

      newRowObj.planned = `${pParts.join(" + ")} = ${sumP}`;
      newRowObj.executed = `${eParts.join(" + ")} = ${sumE}`;

      if (sumP === 0) {
        newRowObj.total = -sumE;
        newRowObj.percentage = sumE > 0 ? `-${sumE * 100}%` : "0%";
      } else {
        newRowObj.total = sumE;
        newRowObj.percentage = ((sumE / sumP) * 100).toFixed(1) + "%";
      }
      return newRowObj;
    });

    setColumns(newCols);
    setRows(newRows);
    setReportName(`تقييم شامل من تاريخ ${firstDate} إلى تاريخ ${lastDate}`);
    setShowIndicators(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-arabic animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="text-2xl font-black text-slate-800 bg-transparent border-none outline-none focus:bg-slate-50 px-2 py-1 rounded w-full"
            />
            <div
              className="text-sm font-bold text-slate-500 cursor-pointer hover:text-blue-600 px-2 flex items-center gap-1"
              onClick={handleUpdateDate}
              title="اضغط لتحديث التاريخ"
            >
              <Calendar size={14} /> {dateStr}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowArchive(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
          >
            <Archive size={18} /> التقييمات السابقة
          </button>
          <button
            onClick={() => setShowIndicators(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition"
          >
            <Calculator size={18} /> المؤشرات الفصلية
          </button>
          <button
            onClick={handleSave}
            disabled={isReadOnly}
            className={`flex items-center gap-2 px-4 py-2 ${isReadOnly ? "bg-slate-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"} text-white rounded-xl font-bold transition`}
          >
            <Save size={18} /> حفظ الجدول
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
          >
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button
            onClick={() => {
              const todayDate = getFullFormattedDate(new Date());
              const existingEval = prevEvals.find(
                (e) => e.dateStr === todayDate && e.userId === currentUser?.id,
              );
              if (existingEval) {
                toast.error(
                  "التقييم الخاص بهذا اليوم موجود بالفعل، يرجى فتحه من التقييمات السابقة.",
                );
                return;
              }

              if (
                window.confirm("هل أنت متأكد من بدء تقييم جديد بنسخة فارغة؟")
              ) {
                const tmplRows =
                  data.selfEvaluationTemplates?.[schoolName + "_" + branchName]
                    ?.rows || defaultRows;
                const tmplCols =
                  data.selfEvaluationTemplates?.[schoolName + "_" + branchName]
                    ?.columns || defaultColumns;
                setRows(JSON.parse(JSON.stringify(tmplRows)));
                setColumns(JSON.parse(JSON.stringify(tmplCols)));
                setReportName("تقييم جديد");
                setCurrentEvalId(Date.now().toString());
                setDateStr(todayDate);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            <Plus size={18} /> تقييم جديد
          </button>
          {canEditTemplate && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "هل تريد حفظ الأنشطة والمخطط كقالب افتراضي لجميع المستخدمين في هذا الفرع؟",
                  )
                ) {
                  const newTemplates = { ...data.selfEvaluationTemplates };
                  newTemplates[schoolName + "_" + branchName] = {
                    rows: JSON.parse(JSON.stringify(rows)),
                    columns: JSON.parse(JSON.stringify(columns)),
                  };
                  updateData({ selfEvaluationTemplates: newTemplates });
                  toast.success("تم حفظ القالب بنجاح لجميع المستخدمين");
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition"
            >
              <Edit2 size={18} /> تغيير الأنشطة والمخطط
            </button>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <User className="text-blue-500" />
            <select
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full focus:ring-0"
            >
              <option value="">اسم المعلم</option>
              {allowedTeachers.map((t: any) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <MultiSelectDropdown
            value={subject}
            options={allowedSubjects}
            onChange={setSubject}
            placeholder="المادة"
            icon={BookOpen}
            colorClass="text-indigo-500"
          />
        </div>

        <div className="space-y-4">
          <MultiSelectDropdown
            value={grades}
            options={allowedGrades}
            onChange={setGrades}
            placeholder="الصفوف التي يدرسها"
            icon={Layers}
            colorClass="text-purple-500"
          />
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <School className="text-emerald-500" />
            <select
              value={schoolName}
              onChange={(e) => {
                setSchoolName(e.target.value);
                const branches = data.schoolBranches?.[e.target.value] || [];
                const allowedB = (currentUser?.role === "admin" || currentUser?.permissions?.all === true)
                  ? branches
                  : (userStaffProfile?.branch ? [userStaffProfile.branch] : (currentUser?.permissions?.schoolsAndBranches?.[e.target.value] || []));
                if (allowedB.length > 0) {
                  setBranchName(allowedB[0]);
                } else {
                  setBranchName("");
                }
              }}
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full focus:ring-0"
            >
              <option value="">المدرسة</option>
              {allowedSchools.map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
            <MapPin className="text-red-500" />
            <select
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-700 w-full focus:ring-0"
            >
              <option value="">الفرع</option>
              {allowedBranches.map((b: string) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
              <Calendar className="text-amber-500" />
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                placeholder="يوم، ٢٠ أكتوبر..."
                className="bg-transparent border-none outline-none font-bold text-slate-700 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-64">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في التقرير..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-bold"
          />
        </div>
        {canEditStructure && (
          <button
            onClick={addColumn}
            className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition"
          >
            <Plus size={16} /> إضافة عمود
          </button>
        )}
      </div>

      <div className="overflow-x-auto w-full bg-white rounded-3xl shadow-sm border border-slate-200 pb-4">
        <table className="w-full min-w-max text-right text-sm mx-auto">
          <thead className="bg-[#4a85c8] text-white">
            <tr>
              {columns.map((col) => {
                const isExecutedCol =
                  col.id === "executed" || col.id.startsWith("exec_");
                let shortDateText = "";
                if (isExecutedCol) {
                  if (col.id === "executed") {
                    const dStrParts = dateStr.match(/\d{4}/)
                      ? dateStr.match(
                          /(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/,
                        )
                      : null;
                    if (dStrParts) {
                      shortDateText = `${dStrParts[1]}/${dStrParts[2]}/${dStrParts[3]}`;
                    } else {
                      const d = new Date();
                      shortDateText =
                        d.getDate() +
                        "/" +
                        (d.getMonth() + 1) +
                        "/" +
                        d.getFullYear();
                    }
                  } else {
                    const match = col.label.match(/\(([^)]+)\)/);
                    if (match) {
                      const dStrParts = match[1].match(/\d{4}/)
                        ? match[1].match(
                            /(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/,
                          )
                        : null;
                      if (dStrParts)
                        shortDateText = `${dStrParts[1]}/${dStrParts[2]}/${dStrParts[3]}`;
                      else shortDateText = match[1];
                    }
                  }
                }

                let thClass =
                  "p-3 font-bold border border-[#3768a3] whitespace-nowrap text-center relative group";
                if (col.id === "no") thClass += " w-10 min-w-[40px] px-1";
                else if (col.id === "activity")
                  thClass += " w-max min-w-max px-2";
                else thClass += " w-fit min-w-[60px] px-1";

                return (
                  <th key={col.id} className={thClass}>
                    <div>{isExecutedCol ? "المنفذ" : col.label}</div>

                    {isExecutedCol && (
                      <div className="text-xs text-blue-200 mt-1 font-normal opacity-90">
                        {shortDateText}
                      </div>
                    )}

                    {col.id === "executed" && (
                      <button
                        onClick={() => {
                          const newRows = [...rows].map((r) =>
                            r.category === "header" || r.category === "footer"
                              ? r
                              : { ...r, executed: r.planned },
                          );
                          setRows(calculateRowSums(newRows));
                        }}
                        className="mt-2 text-xs bg-white/20 hover:bg-white/30 border-white/40 border rounded px-2 py-1 text-white outline-none transition-colors w-full"
                      >
                        مطابقة المخطط
                      </button>
                    )}

                    {canEditStructure &&
                      col.id !== "no" &&
                      col.id !== "activity" && (
                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => deleteColumn(col.id)}
                            title="حذف العمود"
                            className="bg-red-500/80 hover:bg-red-600 p-1 rounded text-white z-10"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                  </th>
                );
              })}
              <th className="p-3 w-10 border border-[#3768a3]"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const isHeader = row.category === "header";
              const isFooter = row.category === "footer";

              const trClass = isHeader
                ? "bg-[#cfe2f3] font-black border-b-2 border-slate-300"
                : isFooter
                  ? "bg-[#d9ead3] font-black border-t-2 border-slate-300"
                  : highlightedRowId === row.id
                    ? "bg-orange-100"
                    : index % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50";

              return (
                <tr
                  key={index}
                  className={`${trClass} hover:bg-orange-50 cursor-pointer transition-colors`}
                  onClick={() => setHighlightedRowId(row.id)}
                >
                  {columns.map((col) => {
                    if (isHeader && col.id !== "activity") {
                      return (
                        <td
                          key={col.id}
                          className="border border-slate-200 px-2 py-1"
                        ></td>
                      );
                    }

                    if (isHeader && col.id === "activity") {
                      return (
                        <td
                          key={col.id}
                          className="border border-slate-200 px-2 py-2"
                        >
                          <input
                            type="text"
                            value={(row as any)[col.id] || ""}
                            onChange={(e) =>
                              handleRowChange(index, col.id, e.target.value)
                            }
                            readOnly={!canEditTemplate}
                            size={Math.max(
                              10,
                              ((row as any)[col.id] || "").length + 2,
                            )}
                            className="bg-transparent border-none outline-none text-center font-black text-blue-900 w-full"
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.id}
                        className={`border border-slate-200 p-1 relative ${col.id === "activity" ? "whitespace-nowrap px-2" : ""}`}
                      >
                        <input
                          type="text"
                          inputMode={
                            col.id !== "activity" ? "decimal" : undefined
                          }
                          dir={col.id !== "activity" ? "ltr" : "rtl"}
                          value={(row as any)[col.id] || ""}
                          onChange={(e) =>
                            handleRowChange(index, col.id, e.target.value)
                          }
                          readOnly={
                            ((col.id === "activity" || col.id === "planned") &&
                              !canEditTemplate) ||
                            col.id === "total" ||
                            col.id === "percentage"
                          }
                          size={
                            col.id === "activity"
                              ? Math.max(
                                  10,
                                  ((row as any)[col.id] || "").length + 2,
                                )
                              : undefined
                          }
                          className={`${col.id === "activity" ? "" : "w-full min-w-[40px]"} bg-transparent border-none outline-none p-1 rounded ${
                            col.id === "no"
                              ? "min-w-[20px] text-center"
                              : col.id === "activity"
                                ? "font-bold"
                                : "text-center"
                          } ${col.id === "total" || col.id === "percentage" ? "opacity-70 cursor-not-allowed" : ""}`}
                        />
                      </td>
                    );
                  })}
                  <td className="border border-slate-200 p-1 text-center">
                    {canEditStructure && (
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => addRow(index)}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => deleteRow(index)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* General Percentage Row */}
            <tr className="bg-blue-600 text-white font-black text-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-10">
              {columns.map((col) => {
                if (col.id === "activity")
                  return (
                    <td
                      key={col.id}
                      className="border border-blue-500 p-3 text-center"
                    >
                      النسبة العامة
                    </td>
                  );
                if (col.id === "planned")
                  return (
                    <td
                      key={col.id}
                      className="border border-blue-500 p-3 text-center"
                    >
                      {sumPlanned}
                    </td>
                  );
                if (col.id === "executed")
                  return (
                    <td
                      key={col.id}
                      className="border border-blue-500 p-3 text-center"
                    >
                      {sumExecuted}
                    </td>
                  );
                if (col.id === "total")
                  return (
                    <td
                      key={col.id}
                      className="border border-blue-500 p-3 text-center"
                    >
                      {sumPlanned + sumExecuted}
                    </td>
                  );
                if (col.id === "percentage")
                  return (
                    <td
                      key={col.id}
                      className="border border-blue-500 p-3 text-center text-amber-200 text-xl"
                    >
                      {overallPercentage}
                    </td>
                  );
                return (
                  <td
                    key={col.id}
                    className="border border-blue-500 p-3 text-center"
                  ></td>
                );
              })}
              <td className="border border-blue-500 p-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Archive Modal */}
      <AnimatePresence>
        {showArchive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowArchive(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-50 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Archive size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      أرشيف التقييمات السابقة
                    </h2>
                    <p className="text-slate-500 font-bold">
                      عرض وتعديل التقارير المحفوظة ({prevEvals.length})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowArchive(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto w-full">
                {prevEvals.length === 0 ? (
                  <div className="text-center py-10 font-bold text-slate-400">
                    لا يوجد تقييمات محفوظة
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prevEvals.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-black text-slate-800">
                              {ev.reportName || "تقرير الأنشطة الفصلية"}
                            </div>
                            <div className="text-sm border bg-slate-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 mt-2 font-bold text-slate-600">
                              <Calendar size={12} /> {ev.dateStr}
                            </div>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => deleteEvaluation(ev.id)}
                              className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors"
                              title="حذف التقرير"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-500 space-y-1 mb-4">
                          <div className="flex items-center gap-1">
                            <BookOpen size={12} /> المادة:{" "}
                            {ev.subject || "غير محدد"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Layers size={12} /> الصفوف:{" "}
                            {ev.grades || "غير محدد"}
                          </div>
                        </div>
                        <button
                          onClick={() => loadEvaluation(ev)}
                          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit2 size={16} /> فتح وتعديل
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Term Indicators Modal */}
        {showIndicators && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowIndicators(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                    <Calculator size={24} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">
                    حساب المؤشرات الفصلية
                  </h2>
                </div>
                <button
                  onClick={() => setShowIndicators(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-slate-500 font-bold mb-4 text-sm">
                حدد التقارير المحفوظة لدمجها ومقارنتها وحساب المؤشر الخاص بها:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2">
                {prevEvals.map((ev) => (
                  <label
                    key={ev.id}
                    className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndicators.includes(ev.id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedIndicators([...selectedIndicators, ev.id]);
                        else
                          setSelectedIndicators(
                            selectedIndicators.filter((id) => id !== ev.id),
                          );
                      }}
                      className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                    <div>
                      <div className="font-bold text-slate-700 text-sm">
                        {ev.reportName || "تقرير"}
                      </div>
                      <div className="text-xs text-slate-400 font-bold mt-1">
                        {ev.dateStr}
                      </div>
                    </div>
                  </label>
                ))}
                {prevEvals.length === 0 && (
                  <div className="text-center py-4 text-slate-400 font-bold text-sm">
                    لا يوجد تقارير محفوظة لدمجها
                  </div>
                )}
              </div>

              <button
                onClick={generateCombinedIndicators}
                disabled={selectedIndicators.length === 0}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Calculator size={18} /> دمج وعرض الجدول
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
