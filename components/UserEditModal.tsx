import React, { useState, useEffect, useRef } from "react";
import { localDB } from "../src/lib/localDB";
import { stampRecord } from "../src/lib/recordStamping";
import { useGlobal } from "../context/GlobalState";
import {
  X,
  Wand2,
  Check,
  Shield,
  User,
  Calendar,
  School,
  Key,
  Trash2,
  Download,
  Upload,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserType, UserPermissions } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";

const jobsOptions = [
  "المشرف العام",
  "نائب المشرف العام",
  "مدير عام",
  "مدير فرع",
  "الإدارة المالية",
  "المحاسب",
  "أمين صندوق",
  "وكيل إداري",
  "وكيل أكاديمي",
  "مدير الموارد البشرية",
  "إدارة الجودة",
  "مدير العلاقات",
  "المشرف التربوي",
  "المشرف الأكاديمي",
  "المشرف الإداري",
  "السكرتارية",
  "المختص الاجتماعي",
  "مسؤول معمل العلوم",
  "مسؤول الوسائل",
  "مسؤول المكتبة",
  "مسؤول الأنشطة",
  "معلم فنية",
  "معلم الرياضة",
  "معلم مادة",
  "مربية",
  "مسؤول الحركة",
  "الحراسة",
  "مهندس البيئة",
  "مسؤول المقصف",
];

const subjectsOptions = [
  "مربية",
  "القرآن الكريم",
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
  "الإرشاد",
  "المهارات الحياتية",
];

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
const sectionsOptions = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

const commonSubPermissions = [
  { id: "view", label: "ظهور الزر" },
  { id: "disable", label: "عدم تفعيل الزر" },
  { id: "allowEdits", label: "السماح بتغيير البيانات" },
];

const permissionsList = [
  {
    id: "dashboard",
    label: "الرئيسية",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "dailyFollowUp",
    label: "متابعة المعلمين",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "adminFollowUp",
    label: "متابعة الموظفين والعاملين",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "studentAffairs",
    label: "شؤون الطلاب",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "substitutions",
    label: "جدول التغطية",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "schoolProfile",
    label: "ملف المدرسة",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "secretariat",
    label: "السكرتارية",
    subPermissions: [
      { id: "showButton", label: "ظهور الزر" },
      { id: "disable", label: "عدم التفعيل" },
      { id: "allowEdits", label: "السماح بتغيير البيانات" },
    ],
  },
  {
    id: "teacherPortal",
    label: "خاص بالمعلم",
    subPermissions: [
      { id: "view", label: "ظهور الزر" },
      { id: "disable", label: "عدم التفعيل" },
      { id: "hideButton", label: "عدم ظهور الزر" },
      { id: "archivePrep", label: "أرشيف التحضير" },
      { id: "newPrep", label: "التحضير اليومي الجديد" },
      { id: "studentEval", label: "تقييم الطلاب" },
      { id: "gradesSheet", label: "كشف الدرجات" },
      { id: "selfEval", label: "التقييم الذاتي" },
      { id: "editEvaluationTemplate", label: "تعديل أنشطة التقييم والمخطط" },
      { id: "allowEdits", label: "السماح بتغيير البيانات" },
      { id: "prepStats", label: "إحصائية التحضير" },
      { id: "viewTeachersPrep", label: "الاطلاع على تحضير المعلمين" },
      { id: "controlSupervisionPanel", label: "التحكم بمنصة المشرف التربوي" },
    ],
  },
  {
    id: "educationalSupervision",
    label: "الإشراف التربوي",
    subPermissions: [
      { id: "view", label: "ظهور الزر" },
      { id: "disable", label: "عدم تفعيل الزر" },
      { id: "allowEdits", label: "السماح بتغيير البيانات" },
    ],
  },
  {
    id: "specialCodes",
    label: "التحكم بالصلاحيات",
    subPermissions: [
      { id: "showButton", label: "ظهور الزر" },
      { id: "hideButton", label: "عدم ظهور الزر" },
      { id: "allowEdits", label: "السماح بتغيير البيانات" },
    ],
  },
  {
    id: "userManagement",
    label: "التحكم بالمستخدمين",
    subPermissions: [...commonSubPermissions],
  },
  { id: "readOnly", label: "عدم السماح بتغيير البيانات" },
  {
    id: "issuesModal",
    label: "المشكلات والحلول",
    subPermissions: [
      ...commonSubPermissions,
      { id: "viewAllIssues", label: "إظهار المشكلات والحلول" },
    ],
  },
  {
    id: "trainingCourses",
    label: "الدورات التدريبية",
    subPermissions: [
      ...commonSubPermissions,
      { id: "editSchema", label: "صلاحيات تعديل المعايير والإضافة والحذف" },
      { id: "viewIndicators", label: "مؤشرات الدروات التدريبية" },
    ],
  },
  {
    id: "caseStudyModal",
    label: "دراسة حالة",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "comprehensiveIndicators",
    label: "المؤشرات الشاملة",
    subPermissions: [
      ...commonSubPermissions,
      { id: "showButton", label: "ظهور الزر" },
      { id: "managePermissions", label: "الصلاحيات" },
    ],
  },
  {
    id: "gradeSheets",
    label: "كشف الدرجات",
    subPermissions: [
      { id: "view_button", label: "ظهور الزر" },
      { id: "disable_button", label: "عدم تفعيل الزر" },
      { id: "edit_data", label: "السماح بتعديل البيانات" },
    ],
  },
  {
    id: "transport",
    label: "مسؤول الحركة والمواصلات",
    isTransport: true,
    subPermissions: [
      { id: "dashboardTab", label: "لوحة المؤشرات والتحليل" },
      { id: "configTab", label: "التحكم بحركة المواصلات" },
      { id: "supervisorCheckTab", label: "متابعة مشرف الباص" },
      { id: "trafficManagerTab", label: "متابعة مسؤول الحركة" },
    ],
  },
  {
    id: "specialReports",
    label: "تقارير خاصة",
    subPermissions: [
      ...commonSubPermissions,
      { id: "absenceLog", label: "سجل الغياب" },
      { id: "latenessLog", label: "سجل التأخر" },
      { id: "violationLog", label: "سجل المخالفات" },
      { id: "exitLog", label: "سجل الخروج" },
      { id: "damageLog", label: "سجل الأضرار" },
      { id: "parentVisitLog", label: "سجل زيارة أولياء الأمور" },
      { id: "examLog", label: "سجل الاختبارات" },
      { id: "taskReports", label: "تقارير المهام" },
    ],
  },
  {
    id: "communicationDev",
    label: "التواصل والتطوير",
    subPermissions: [
      { id: "circulars", label: "التعاميم" },
      { id: "surveys", label: "الاستطلاعات" },
      { id: "homework", label: "الواجبات والتكاليف" },
      { id: "viewDetails", label: "الاطلاع على تفاصيل التعاميم والاستطلاع" },
    ],
  },
  {
    id: "schoolActivities",
    label: "الأنشطة المدرسية",
    subPermissions: [...commonSubPermissions],
  },
  {
    id: "finance",
    label: "المالية",
    subPermissions: [...commonSubPermissions],
  },
];

export const getPermissionsForJobs = (
  newJobs: string[],
  currentPerms: UserPermissions = {},
  isImport = false
): UserPermissions => {
  const managedUserIds = currentPerms.managedUserIds;
  const schoolsAndBranches = currentPerms.schoolsAndBranches;
  const comprehensiveIndicatorsUsers = currentPerms.comprehensiveIndicatorsUsers;

  let newPerms: UserPermissions = {
    managedUserIds,
    schoolsAndBranches,
    comprehensiveIndicatorsUsers,
    all: false,
    readOnly: false,
    specialCodes: ["hideButton"], // Default is hide
  };

  // Helper to merge sub-permissions without duplication
  const addSubPerms = (key: keyof UserPermissions, subPerms: string[]) => {
    const current = Array.isArray(newPerms[key]) ? (newPerms[key] as string[]) : [];
    newPerms[key] = Array.from(new Set([...current, ...subPerms])) as any;
  };

  // 1. Check if they are Super Admin ("المشرف العام" or "نائب المشرف العام")
  const isSuperAdmin = newJobs.includes("المشرف العام") || newJobs.includes("نائب المشرف العام");

  if (isSuperAdmin) {
    newPerms.all = true;
    newPerms.dashboard = ["view", "allowEdits"];
    newPerms.dailyFollowUp = ["view", "allowEdits"];
    newPerms.adminFollowUp = ["view", "allowEdits"];
    newPerms.studentAffairs = ["view", "allowEdits"];
    newPerms.substitutions = ["view", "allowEdits"];
    newPerms.schoolProfile = ["view", "allowEdits"];
    newPerms.secretariat = ["showButton", "allowEdits"];
    newPerms.userManagement = ["view", "allowEdits"];
    newPerms.issuesModal = ["view", "allowEdits", "useIssuesButton", "viewAllIssues"];
    newPerms.trainingCourses = ["view", "allowEdits", "editSchema", "viewIndicators"];
    newPerms.caseStudyModal = ["view", "allowEdits"];
    newPerms.comprehensiveIndicators = ["view", "allowEdits", "showButton", "managePermissions"];
    newPerms.specialReports = ["view", "allowEdits", "absenceLog", "latenessLog", "violationLog", "exitLog", "damageLog", "parentVisitLog", "examLog", "taskReports"];
    newPerms.specialCodes = ["showButton", "allowEdits"];
    newPerms.teacherPortal = [
      "view",
      "archivePrep",
      "newPrep",
      "studentEval",
      "gradesSheet",
      "selfEval",
      "allowEdits",
      "editEvaluationTemplate",
      "prepStats",
      "viewTeachersPrep",
      "controlSupervisionPanel"
    ];
    newPerms.educationalSupervision = ["view", "allowEdits"];
    newPerms.transport = ["dashboardTab", "configTab", "supervisorCheckTab", "trafficManagerTab"];
    newPerms.communicationDev = ["circulars", "surveys", "homework", "viewDetails"];
    newPerms.gradeSheets = ["view_button", "edit_data"];
    newPerms.schoolActivities = ["view", "allowEdits"];
    newPerms.finance = ["view", "allowEdits"];
    newPerms.readOnly = false;
    return newPerms;
  }

  // 2. Regular Job Mappings
  newJobs.forEach((j) => {
    // Add "view" for trainingCourses to all users by default
    addSubPerms("trainingCourses", ["view"]);

    // Group A: مدير عام & مدير فرع
    if (j === "مدير عام" || j === "مدير فرع" || j === "مدير عام المدارس") {
      addSubPerms("dashboard", ["view", "allowEdits"]);
      addSubPerms("dailyFollowUp", ["view", "allowEdits"]);
      addSubPerms("adminFollowUp", ["view", "allowEdits"]);
      addSubPerms("studentAffairs", ["view", "allowEdits"]);
      addSubPerms("substitutions", ["view", "allowEdits"]);
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("teacherPortal", ["view", "allowEdits", "archivePrep", "newPrep", "studentEval", "gradesSheet", "selfEval", "editEvaluationTemplate", "prepStats", "viewTeachersPrep"]);
      addSubPerms("educationalSupervision", ["view", "allowEdits"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("caseStudyModal", ["view", "allowEdits"]);
      addSubPerms("gradeSheets", ["view_button", "edit_data"]);
      addSubPerms("transport", ["dashboardTab", "configTab", "supervisorCheckTab", "trafficManagerTab"]);
      addSubPerms("specialReports", ["view", "allowEdits", "absenceLog", "latenessLog", "violationLog", "exitLog", "damageLog", "parentVisitLog", "examLog", "taskReports"]);
      addSubPerms("communicationDev", ["circulars", "surveys", "homework", "viewDetails"]);
      addSubPerms("schoolActivities", ["view", "allowEdits"]);
      addSubPerms("finance", ["view", "allowEdits"]);
      newPerms.readOnly = true;
    }
    // Group B: إدارة الجودة & السكرتارية
    else if (j === "إدارة الجودة" || j === "السكرتارية") {
      addSubPerms("dashboard", ["view", "allowEdits"]);
      addSubPerms("dailyFollowUp", ["view", "allowEdits"]);
      addSubPerms("adminFollowUp", ["view", "allowEdits"]);
      addSubPerms("studentAffairs", ["view", "allowEdits"]);
      addSubPerms("substitutions", ["view", "allowEdits"]);
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("secretariat", ["showButton", "allowEdits"]);
      addSubPerms("teacherPortal", ["view", "allowEdits", "archivePrep", "newPrep", "studentEval", "gradesSheet", "selfEval", "editEvaluationTemplate", "prepStats", "viewTeachersPrep"]);
      addSubPerms("educationalSupervision", ["view", "allowEdits"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("caseStudyModal", ["view", "allowEdits"]);
      addSubPerms("gradeSheets", ["view_button", "edit_data"]);
      addSubPerms("transport", ["dashboardTab", "configTab", "supervisorCheckTab", "trafficManagerTab"]);
      addSubPerms("specialReports", ["view", "allowEdits", "absenceLog", "latenessLog", "violationLog", "exitLog", "damageLog", "parentVisitLog", "examLog", "taskReports"]);
      addSubPerms("communicationDev", ["circulars", "surveys", "homework", "viewDetails"]);
      addSubPerms("schoolActivities", ["view", "allowEdits"]);
      addSubPerms("finance", ["view", "allowEdits"]);
      newPerms.readOnly = true;
    }
    // Group C: الإدارة المالية & المحاسب & أمين صندوق
    else if (j === "إدارة المالية" || j === "الإدارة المالية" || j === "المحاسب" || j === "أمين صندوق") {
      addSubPerms("dashboard", ["view", "allowEdits"]);
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("communicationDev", ["circulars", "surveys"]);
      addSubPerms("finance", ["view", "allowEdits"]);
    }
    // Group D: وكيل إداري & مدير الموارد البشرية & مدير العلاقات
    else if (j === "وكيل إداري" || j === "مدير الموارد البشرية" || j === "مدير العلاقات") {
      addSubPerms("dashboard", ["view", "allowEdits"]);
      addSubPerms("dailyFollowUp", ["view", "allowEdits"]);
      addSubPerms("adminFollowUp", ["view", "allowEdits"]);
      addSubPerms("studentAffairs", ["view", "allowEdits"]);
      addSubPerms("substitutions", ["view", "allowEdits"]);
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("teacherPortal", ["view", "archivePrep"]);
      if (j === "مدير الموارد البشرية") {
        addSubPerms("teacherPortal", ["prepStats", "viewTeachersPrep"]);
      }
      addSubPerms("educationalSupervision", ["view", "allowEdits"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("caseStudyModal", ["view", "allowEdits"]);
      addSubPerms("gradeSheets", ["view_button", "edit_data"]);
      addSubPerms("specialReports", ["view", "allowEdits", "taskReports"]);
      addSubPerms("communicationDev", ["circulars", "surveys", "homework", "viewDetails"]);
      newPerms.readOnly = true;
    }
    // Group E: وكيل أكاديمي & المشرف التربوي & المشرف الأكاديمي
    else if (j === "وكيل أكاديمي" || j === "المشرف التربوي" || j === "المشرف الأكاديمي") {
      addSubPerms("dashboard", ["view", "allowEdits"]);
      addSubPerms("dailyFollowUp", ["view", "allowEdits"]);
      addSubPerms("studentAffairs", ["view", "allowEdits"]);
      addSubPerms("substitutions", ["view", "allowEdits"]);
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("teacherPortal", ["view", "archivePrep"]);
      if (j === "وكيل أكاديمي" || j === "المشرف التربوي") {
        addSubPerms("teacherPortal", ["prepStats", "viewTeachersPrep"]);
      }
      if (j === "المشرف التربوي") {
        addSubPerms("teacherPortal", ["controlSupervisionPanel"]);
      }
      addSubPerms("educationalSupervision", ["view", "allowEdits"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("communicationDev", ["circulars", "surveys"]);
      if (j === "وكيل أكاديمي") {
        addSubPerms("schoolActivities", ["view", "allowEdits"]);
        addSubPerms("finance", ["view", "allowEdits"]);
      }
      newPerms.readOnly = true;
    }
    // Group F: المشرف الإداري
    else if (j === "المشرف الإداري") {
      addSubPerms("dashboard", ["view", "allowEdits"]);
      addSubPerms("dailyFollowUp", ["view", "allowEdits"]);
      addSubPerms("studentAffairs", ["view", "allowEdits"]);
      addSubPerms("substitutions", ["view", "allowEdits"]);
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("teacherPortal", ["view", "archivePrep", "prepStats", "viewTeachersPrep"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("caseStudyModal", ["view", "allowEdits"]);
      addSubPerms("specialReports", ["view", "allowEdits", "absenceLog", "latenessLog", "violationLog", "exitLog", "damageLog", "parentVisitLog", "examLog", "taskReports"]);
      addSubPerms("communicationDev", ["circulars", "surveys", "homework", "viewDetails"]);
    }
    // Group G: المختص الاجتماعي & مسؤول معمل العلوم & مسؤول الوسائل & مسؤول المكتبة & مسؤول الأنشطة & معلم فنية & معلم الرياضة
    else if (
      j === "المختص الاجتماعي" ||
      j === "مسؤول معمل العلوم" ||
      j === "مسؤول الوسائل" ||
      j === "مسؤول المكتبة" ||
      j === "مسؤول الأنشطة" ||
      j === "معلم فنية" ||
      j === "معلم الرياضة"
    ) {
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("specialReports", ["view", "allowEdits", "taskReports"]);
      addSubPerms("issuesModal", ["view", "allowEdits", "viewAllIssues"]);
      addSubPerms("trainingCourses", ["view", "allowEdits", "editSchema", "viewIndicators"]);
      addSubPerms("communicationDev", ["circulars", "surveys"]);
      if (j === "المختص الاجتماعي") {
        addSubPerms("caseStudyModal", ["view", "allowEdits"]);
      }
      if (j === "مسؤول الأنشطة") {
        addSubPerms("schoolActivities", ["view", "allowEdits"]);
      }
    }
    // Group H: معلم مادة & مربية
    else if (j === "معلم مادة" || j === "معلم" || j === "مربية") {
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("teacherPortal", ["view", "allowEdits", "archivePrep", "newPrep", "studentEval", "gradesSheet", "selfEval", "editEvaluationTemplate"]);
      addSubPerms("gradeSheets", ["view_button", "edit_data"]);
      addSubPerms("communicationDev", ["circulars", "surveys", "homework"]);
    }
    // Group I: مسؤول الحركة
    else if (j === "مسؤول الحركة" || j === "سائق") {
      addSubPerms("schoolProfile", ["view", "allowEdits"]);
      addSubPerms("specialReports", ["view", "allowEdits", "taskReports"]);
      addSubPerms("transport", ["dashboardTab", "configTab", "supervisorCheckTab", "trafficManagerTab"]);
    }
    // Default fallback for any other jobs
    else {
      addSubPerms("dashboard", ["view"]);
    }
  });

  if (isImport && !isSuperAdmin) {
    newPerms.all = false;
    newPerms.specialCodes = ["hideButton"];
    newPerms.userManagement = ["disable"];
  }

  return newPerms;
};

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { data, updateData, currentUser } = useGlobal();
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isExplicitlyDisabled =
    Array.isArray(currentUser?.permissions?.userManagement) &&
    currentUser.permissions.userManagement.includes("disable");
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isReadOnly =
    !isGeneralSupervisor && (isReadOnlyFlag || isExplicitlyDisabled);
  const [formData, setFormData] = useState<UserType | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<
    "job" | "subjects" | "grades" | "sections" | null
  >(null);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownsWrapperRef = useRef<HTMLDivElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownsWrapperRef.current &&
        !dropdownsWrapperRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const halfLength = Math.ceil(permissionsList.length / 2);
  const column1Permissions = permissionsList.slice(0, halfLength);
  const column2Permissions = permissionsList.slice(halfLength);

  const renderPermissionCard = (perm: typeof permissionsList[0]) => {
    const permVal = formData?.permissions?.[perm.id as keyof UserPermissions];
    const isChecked = perm.subPermissions
      ? Array.isArray(permVal) &&
        permVal.some(
          (id) =>
            id !== "disable" && id !== "hideButton" && id !== "disable_button"
        )
      : !!permVal;

    return (
      <div
        key={perm.id}
        className="bg-white p-4 rounded-2xl border-2 border-slate-100 space-y-3"
      >
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-black text-slate-700">
            {perm.label}
          </span>
          <input
            type="checkbox"
            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
            checked={isChecked}
            onChange={() =>
              handleTogglePermission(perm.id as keyof UserPermissions)
            }
          />
        </label>

        {perm.id === "userManagement" &&
          !!formData?.permissions?.userManagement && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="text-xs font-black text-blue-600 block mb-2">
                تحديد المستخدمين المسموح إدارتهم:
              </label>
              <div className="space-y-3 pl-2">
                {(formData.schools || []).filter(Boolean).map((school, sIdx) => {
                  const validBranches =
                    formData.permissions?.schoolsAndBranches?.[school] || [];

                  // Let's find all users in this school
                  const usersInSchool = data.users.filter(
                    (u) =>
                      u.schools.includes(school) &&
                      u.id !== formData.id &&
                      !(
                        u.role === "admin" ||
                        u.permissions?.all === true
                      ),
                  );

                  if (usersInSchool.length === 0) return null;

                  const branchesToDisplay =
                    validBranches.length > 0
                      ? validBranches
                      : ["بدون فرع مخصص"];

                  const isSchoolFullyManaged = usersInSchool.every(
                    (u) =>
                      (
                        formData.permissions?.managedUserIds || []
                      ).includes(u.id),
                  );

                  const toggleAllInSchool = () => {
                    setFormData((prev) => {
                      if (!prev) return null;
                      const currentManaged =
                        prev.permissions?.managedUserIds || [];
                      const schoolUserIds = usersInSchool.map(
                        (u) => u.id,
                      );
                      let next: string[];
                      if (isSchoolFullyManaged) {
                        next = currentManaged.filter(
                          (id) => !schoolUserIds.includes(id),
                        );
                      } else {
                        next = Array.from(
                          new Set([
                            ...currentManaged,
                            ...schoolUserIds,
                          ]),
                        );
                      }
                      return {
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          managedUserIds: next,
                        },
                      };
                    });
                  };

                  return (
                    <div
                      key={school ? `manage-${school}` : `manage-${sIdx}`}
                      className="bg-slate-50/50 p-2 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-2 p-1">
                        <span className="font-bold text-sm text-slate-700 flex items-center gap-1">
                          <School size={14} /> {school}
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded"
                          checked={isSchoolFullyManaged}
                          onChange={toggleAllInSchool}
                        />
                      </div>
                      <div className="space-y-2 pr-3 border-r-2 border-slate-200">
                        {branchesToDisplay.filter(Boolean).map((branch, bIdx) => {
                          const usersInBranch =
                            usersInSchool.filter((u) => {
                              const uBranches =
                                u.permissions?.schoolsAndBranches?.[
                                  school
                                ] || [];
                              if (branch === "بدون فرع مخصص")
                                return uBranches.length === 0;
                              return uBranches.includes(branch);
                            });

                          if (usersInBranch.length === 0)
                            return null;

                          const isBranchFullyManaged =
                            usersInBranch.every((u) =>
                              (
                                formData.permissions
                                  ?.managedUserIds || []
                              ).includes(u.id),
                            );

                          const toggleAllInBranch = () => {
                            setFormData((prev) => {
                              if (!prev) return null;
                              const currentManaged =
                                prev.permissions?.managedUserIds ||
                                [];
                              const branchUserIds =
                                usersInBranch.map((u) => u.id);
                              let next: string[];
                              if (isBranchFullyManaged) {
                                next = currentManaged.filter(
                                  (id) =>
                                    !branchUserIds.includes(id),
                                );
                              } else {
                                next = Array.from(
                                  new Set([
                                    ...currentManaged,
                                    ...branchUserIds,
                                  ]),
                                );
                              }
                              return {
                                ...prev,
                                permissions: {
                                  ...prev.permissions,
                                  managedUserIds: next,
                                },
                              };
                            });
                          };

                          return (
                            <div
                              key={school && branch ? `manage-${school}-${branch}` : `manage-${sIdx}-${bIdx}`}
                              className="space-y-1"
                            >
                              <div className="flex items-center justify-between bg-blue-50/50 p-1 rounded-lg">
                                <span className="text-xs font-bold text-blue-700">
                                  {branch}
                                </span>
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 text-blue-500 rounded"
                                  checked={isBranchFullyManaged}
                                  onChange={toggleAllInBranch}
                                />
                              </div>
                              <div className="pr-2 space-y-1">
                                {usersInBranch.filter(u => u && u.id).map((u, uIdx) => (
                                  <label
                                    key={u.id ? `manage-${u.id}` : `manage-${uIdx}`}
                                    className="flex items-center justify-between cursor-pointer hover:bg-white p-1 rounded transition-colors group"
                                  >
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">
                                      {u.name}
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"
                                      checked={(
                                        formData.permissions
                                          ?.managedUserIds || []
                                      ).includes(u.id)}
                                      onChange={() => {
                                        setFormData((prev) => {
                                          if (!prev) return null;
                                          const currentManaged =
                                            prev.permissions
                                              ?.managedUserIds ||
                                            [];
                                          const next =
                                            currentManaged.includes(
                                              u.id,
                                            )
                                              ? currentManaged.filter(
                                                  (id) =>
                                                    id !== u.id,
                                                )
                                              : [
                                                  ...currentManaged,
                                                  u.id,
                                                ];
                                          return {
                                            ...prev,
                                            permissions: {
                                              ...prev.permissions,
                                              managedUserIds: next,
                                            },
                                          };
                                        });
                                      }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {perm.id === "comprehensiveIndicators" &&
          Array.isArray(
            formData.permissions?.comprehensiveIndicators,
          ) &&
          formData.permissions.comprehensiveIndicators.includes(
            "managePermissions",
          ) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="text-xs font-black text-indigo-600 block mb-2">
                تحديد صلاحيات المؤشرات الشاملة (المستخدمين ضمن
                المدارس/الفروع):
              </label>
              <div className="space-y-3 pl-2">
                {(formData.schools || []).filter(Boolean).map((school, sIdx) => {
                  const validBranches =
                    formData.permissions?.schoolsAndBranches?.[
                      school
                    ] || [];
                  const usersInSchool = data.users.filter(
                    (u) =>
                      u.schools.includes(school) &&
                      u.id !== formData.id &&
                      !(
                        u.role === "admin" ||
                        u.permissions?.all === true
                      ),
                  );

                  if (usersInSchool.length === 0) return null;

                  const branchesToDisplay =
                    validBranches.length > 0
                      ? validBranches
                      : ["بدون فرع مخصص"];
                  const isSchoolFullyManaged = usersInSchool.every(
                    (u) =>
                      (
                        formData.permissions
                          ?.comprehensiveIndicatorsUsers || []
                      ).includes(u.id),
                  );

                  const toggleAllInSchool = () => {
                    setFormData((prev) => {
                      if (!prev) return null;
                      const currentManaged =
                        prev.permissions
                          ?.comprehensiveIndicatorsUsers || [];
                      const schoolUserIds = usersInSchool.map(
                        (u) => u.id,
                      );
                      let next: string[];
                      if (isSchoolFullyManaged) {
                        next = currentManaged.filter(
                          (id) => !schoolUserIds.includes(id),
                        );
                      } else {
                        next = Array.from(
                          new Set([
                            ...currentManaged,
                            ...schoolUserIds,
                          ]),
                        );
                      }
                      return {
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          comprehensiveIndicatorsUsers: next,
                        },
                      };
                    });
                  };

                  return (
                    <div
                      key={school ? `ci-${school}` : `ci-${sIdx}`}
                      className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100"
                    >
                      <div className="flex items-center justify-between mb-2 p-1">
                        <span className="font-bold text-sm text-indigo-800 flex items-center gap-1">
                          <School size={14} /> {school}
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded"
                          checked={isSchoolFullyManaged}
                          onChange={toggleAllInSchool}
                        />
                      </div>
                      <div className="space-y-2 pr-3 border-r-2 border-indigo-200">
                        {branchesToDisplay.filter(Boolean).map((branch, bIdx) => {
                          const usersInBranch =
                            usersInSchool.filter((u) => {
                              const uBranches =
                                u.permissions?.schoolsAndBranches?.[
                                  school
                                ] || [];
                              if (branch === "بدون فرع مخصص")
                                return uBranches.length === 0;
                              return uBranches.includes(branch);
                            });

                          if (usersInBranch.length === 0)
                            return null;

                          const isBranchFullyManaged =
                            usersInBranch.every((u) =>
                              (
                                formData.permissions
                                  ?.comprehensiveIndicatorsUsers ||
                                []
                              ).includes(u.id),
                            );

                          const toggleAllInBranch = () => {
                            setFormData((prev) => {
                              if (!prev) return null;
                              const currentManaged =
                                prev.permissions
                                  ?.comprehensiveIndicatorsUsers ||
                                [];
                              const branchUserIds =
                                usersInBranch.map((u) => u.id);
                              let next: string[];
                              if (isBranchFullyManaged) {
                                next = currentManaged.filter(
                                  (id) =>
                                    !branchUserIds.includes(id),
                                );
                              } else {
                                next = Array.from(
                                  new Set([
                                    ...currentManaged,
                                    ...branchUserIds,
                                  ]),
                                );
                              }
                              return {
                                ...prev,
                                permissions: {
                                  ...prev.permissions,
                                  comprehensiveIndicatorsUsers:
                                    next,
                                },
                              };
                            });
                          };

                          return (
                            <div
                              key={school && branch ? `ci-${school}-${branch}` : `ci-${sIdx}-${bIdx}`}
                              className="space-y-1"
                            >
                              <div className="flex items-center justify-between bg-white p-1 rounded-lg">
                                <span className="text-xs font-bold text-indigo-700">
                                  {branch}
                                </span>
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 text-indigo-500 rounded"
                                  checked={isBranchFullyManaged}
                                  onChange={toggleAllInBranch}
                                />
                              </div>
                              <div className="pr-2 space-y-1">
                                {usersInBranch.filter(u => u && u.id).map((u, uIdx) => (
                                  <label
                                    key={u.id ? `ci-${u.id}` : `ci-${uIdx}`}
                                    className="flex items-center justify-between cursor-pointer hover:bg-white p-1 rounded transition-colors group"
                                  >
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600">
                                      {u.name}
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
                                      checked={(
                                        formData.permissions
                                          ?.comprehensiveIndicatorsUsers ||
                                        []
                                      ).includes(u.id)}
                                      onChange={() => {
                                        setFormData((prev) => {
                                          if (!prev) return null;
                                          const currentManaged =
                                            prev.permissions
                                              ?.comprehensiveIndicatorsUsers ||
                                            [];
                                          const next =
                                            currentManaged.includes(
                                              u.id,
                                            )
                                              ? currentManaged.filter(
                                                  (id) =>
                                                    id !== u.id,
                                                )
                                              : [
                                                  ...currentManaged,
                                                  u.id,
                                                ];
                                          return {
                                            ...prev,
                                            permissions: {
                                              ...prev.permissions,
                                              comprehensiveIndicatorsUsers:
                                                next,
                                            },
                                          };
                                        });
                                      }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {perm.subPermissions && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
            {perm.subPermissions.map((sub) => (
              <label
                key={sub.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-200 text-blue-500"
                  checked={
                    Array.isArray(
                      formData.permissions?.[
                        perm.id as keyof UserPermissions
                      ],
                    ) &&
                    (
                      formData.permissions?.[
                        perm.id as keyof UserPermissions
                      ] as string[]
                    ).includes(sub.id)
                  }
                  onChange={() =>
                    handleTogglePermission(
                      perm.id as keyof UserPermissions,
                      sub.id,
                    )
                  }
                />
                <span className="text-xs font-bold text-slate-500">
                  {sub.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        schools: user.schools || [],
        academicYears: user.academicYears || [],
        subjects: user.subjects || [],
        grades: user.grades || [],
        sections: user.sections || [],
        permissions: {
          ...user.permissions,
          schoolsAndBranches: user.permissions?.schoolsAndBranches || {},
          managedUserIds: user.permissions?.managedUserIds || [],
        },
      });
      setSelectAll(user.permissions?.all || false);
      setOpenDropdown(null);
      setDropdownSearch("");
    }
  }, [user, isOpen]);

  if (!isOpen || !formData) return null;

  const generateUniqueCode = () => {
    const existingCodes = data.users.map((u) => u.code || "");
    let newCode = "";
    let isUnique = false;

    while (!isUnique) {
      // Generate 4 digit non-sequential random code
      newCode = Math.floor(1000 + Math.random() * 9000).toString();

      // Check if unique and not sequential (simple check for 1234, 4321 etc)
      const isSequential =
        /0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210/.test(
          newCode,
        );

      if (!existingCodes.includes(newCode) && !isSequential) {
        isUnique = true;
      }
    }

    setFormData((prev) => (prev ? { ...prev, code: newCode } : null));
  };

  const handleTogglePermission = (
    key: keyof UserPermissions,
    subId?: string,
  ) => {
    setFormData((prev) => {
      if (!prev) return null;
      const newPermissions = { ...prev.permissions };

      if (subId) {
        // Child toggled
        const currentSubs = Array.isArray(newPermissions[key])
          ? [...(newPermissions[key] as string[])]
          : [];
        if (currentSubs.includes(subId)) {
          // Uncheck child
          newPermissions[key] = currentSubs.filter((id) => id !== subId) as any;
          // Uncheck parent
          newPermissions.all = false;
        } else {
          // Check child
          let nextSubs = [...currentSubs, subId];

          if (key === "specialCodes") {
            if (subId === "showButton")
              nextSubs = nextSubs.filter((id) => id !== "hideButton");
            if (subId === "hideButton")
              nextSubs = nextSubs.filter((id) => id !== "showButton");
          }
          newPermissions[key] = nextSubs as any;
        }
      } else {
        // Parent toggled
        const parent = permissionsList.find((p) => p.id === key);
        const currentVal = newPermissions[key];
        const isCurrentlyChecked = parent?.subPermissions
          ? Array.isArray(currentVal) &&
            currentVal.some(
              (id) =>
                id !== "disable" &&
                id !== "hideButton" &&
                id !== "disable_button"
            )
          : !!currentVal;
        const isChecking = !isCurrentlyChecked;

        if (parent && parent.subPermissions) {
          if (isChecking) {
            newPermissions[key] = parent.subPermissions
              .filter(
                (s) =>
                  s.id !== "disable" &&
                  s.id !== "hideButton" &&
                  s.id !== "disable_button"
              )
              .map((s) => s.id) as any;
          } else {
            newPermissions[key] = (
              key === "specialCodes" ? ["hideButton"] : []
            ) as any;
          }
        } else {
          newPermissions[key] = isChecking as any;
        }

        if (!isChecking) {
          newPermissions.all = false;
        }
      }

      // Update selectAll state based on whether all positive permissions are checked
      const isAllChecked = permissionsList
        .filter((p) => p.id !== "readOnly")
        .every((p) => {
          const val = newPermissions[p.id as keyof UserPermissions];
          if (p.subPermissions) {
            return (
              Array.isArray(val) &&
              val.some(
                (id) =>
                  id !== "disable" &&
                  id !== "hideButton" &&
                  id !== "disable_button"
              )
            );
          }
          return !!val;
        });
      setSelectAll(isAllChecked);
      newPermissions.all = isAllChecked;

      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setFormData((prev) => {
      if (!prev) return null;
      const newPermissions: UserPermissions = {
        all: checked,
        schoolsAndBranches: prev.permissions?.schoolsAndBranches,
        managedUserIds: prev.permissions?.managedUserIds,
        comprehensiveIndicatorsUsers:
          prev.permissions?.comprehensiveIndicatorsUsers,
      };
      permissionsList.forEach((p) => {
        if (checked) {
          if (p.subPermissions) {
            newPermissions[p.id as keyof UserPermissions] = p.subPermissions
              .filter(
                (s) =>
                  s.id !== "disable" &&
                  s.id !== "hideButton" &&
                  s.id !== "disable_button"
              )
              .map((s) => s.id) as any;
          } else {
            newPermissions[p.id as keyof UserPermissions] = (
              p.id === "readOnly" ? false : true
            ) as any;
          }
        } else {
          if (p.subPermissions) {
            newPermissions[p.id as keyof UserPermissions] = (
              p.id === "specialCodes" ? ["hideButton"] : []
            ) as any;
          } else {
            newPermissions[p.id as keyof UserPermissions] = false as any;
          }
        }
      });
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleExportAllUsersExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const saveAs = (await import("file-saver")).default;
      const workbook = new ExcelJS.Workbook();
      
      const mainSheet = workbook.addWorksheet("المستخدمين", {
        views: [{ rightToLeft: true }]
      });
      const listsSheet = workbook.addWorksheet("ListsData");
      listsSheet.state = "hidden"; // إخفاء ورقة البيانات المرجعية

      const headers = [
        "الاسم الكامل",
        "المسمى الوظيفي",
        "المادة",
        "الصلاحية",
        "كود الدخول",
        "المدارس المصرح بها",
        "الأعوام الدراسية",
        "الصفوف",
        "الشعب",
        "تاريخ البدء",
        "تاريخ الانتهاء",
        "فروع المدارس",
        "صلاحيات كاملة",
        "تفاصيل صلاحيات الوصول"
      ];

      mainSheet.addRow(headers);

      // تعريف القوائم المرجعية الأساسية
      const jobsList = [
        "المشرف العام", "نائب المشرف العام", "مدير عام", "مدير فرع", "الإدارة المالية", 
        "المحاسب", "أمين صندوق", "وكيل إداري", "وكيل أكاديمي", "مدير الموارد البشرية", 
        "إدارة الجودة", "مدير العلاقات", "المشرف التربوي", "المشرف الأكاديمي", "المشرف الإداري", 
        "السكرتارية", "المختص الاجتماعي", "مسؤول معمل العلوم", "مسؤول الوسائل", "مسؤول المكتبة", 
        "مسؤول الأنشطة", "معلم فنية", "معلم الرياضة", "معلم مادة", "مربية", 
        "مسؤول الحركة", "الحراسة", "مهندس البيئة", "مسؤول المقصف"
      ];
      const rolesList = ["مدير", "مستخدم"];
      const subjectsList = [
        "مربية", "القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", 
        "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب",
        "الإرشاد", "المهارات الحياتية"
      ];
      const schoolsList = data.availableSchools || [];
      const yearsList = data.availableYears || [];
      const gradesList = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
      const sectionsList = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];
      const fullPermList = ["نعم", "لا"];

      const branchesSet = new Set<string>();
      data.users.forEach((u) => {
        const sab = u.permissions?.schoolsAndBranches;
        if (sab && typeof sab === "object") {
          Object.values(sab).forEach((brList) => {
            if (Array.isArray(brList)) {
              brList.forEach((b) => { if (b) branchesSet.add(b); });
            }
          });
        }
      });
      const branchesList = Array.from(branchesSet);
      if (branchesList.length === 0) {
        branchesList.push("المركز الرئيسي", "فرع الطلاب", "فرع الطالبات", "بدون فرع");
      }

      const permsList = permissionsList.map(p => p.label);

      const getColLetter = (colIdx: number): string => {
        let temp = colIdx;
        let letter = "";
        while (temp > 0) {
          let modulo = (temp - 1) % 26;
          letter = String.fromCharCode(65 + modulo) + letter;
          temp = Math.floor((temp - modulo) / 26);
        }
        return letter;
      };

      const formatActiveValue = (allOpts: string[], activeList: string[]): string => {
        return allOpts
          .filter(opt => activeList.includes(opt))
          .map(opt => `✓ ${opt}`)
          .join("، ");
      };

      const getPermsFormula = (rNum: number): any => {
        const cellRef = `B${rNum}`;
        const jobPerms = [
          { job: "مدير عام", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، السماح بتغيير البيانات، أرشيف التحضير، التحضير اليومي الجديد، تقييم الطلاب، كشف الدرجات، التقييم الذاتي، تعديل أنشطة التقييم والمخطط)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ مسؤول الحركة والمواصلات (لوحة المؤشرات والتحليل، التحكم بحركة المواصلات، متابعة مشرف الباص، متابعة مسؤول الحركة)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات، سجل متابعة الدفاتر والتصحيح، سجل الغياب، سجل التأخر، سجل المخالفات، سجل الخروج، سجل زيارة أولياء الأمور، سجل الاختبارات، سجل الإتلاف المدرسي، التعزيزات والمكافآت، سجل التميز والإبداع، كشف استلام وتسليم الكشوفات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "مدير فرع", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، السماح بتغيير البيانات، أرشيف التحضير، التحضير اليومي الجديد، تقييم الطلاب، كشف الدرجات، التقييم الذاتي، تعديل أنشطة التقييم والمخطط)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ مسؤول الحركة والمواصلات (لوحة المؤشرات والتحليل، التحكم بحركة المواصلات، متابعة مشرف الباص، متابعة مسؤول الحركة)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات، سجل متابعة الدفاتر والتصحيح، سجل الغياب، سجل التأخر، سجل المخالفات، سجل الخروج، سجل زيارة أولياء الأمور، سجل الاختبارات، سجل الإتلاف المدرسي، التعزيزات والمكافآت، سجل التميز والإبداع، كشف استلام وتسليم الكشوفات), ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "الإدارة المالية", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "المحاسب", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "أمين صندوق", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "وكيل إداري", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، أرشيف التحضير)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "وكيل أكاديمي", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، أرشيف التحضير)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "مدير الموارد البشرية", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، أرشيف التحضير)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "إدارة الجودة", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ السكرتارية (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، السماح بتغيير البيانات)، ✓ أرشيف التحضير، ✓ التحضير اليومي الجديد، ✓ تقييم الطلاب، ✓ كشف الدرجات، ✓ التقييم الذاتي، ✓ تعديل أنشطة التقييم والمخطط، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ مسؤول الحركة والمواصلات (لوحة المؤشرات والتحليل، التحكم بحركة المواصلات، متابعة مشرف الباص، متابعة مسؤول الحركة)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات، سجل متابعة الدفاتر والتصحيح، سجل الغياب، سجل التأخر، سجل المخالفات، سجل الخروج، سجل زيارة أولياء الأمور، سجل الاختبارات، سجل الإتلاف المدرسي، التعزيزات والمكافآت، سجل التميز والإبداع، كشف استلام وتسليم الكشوفات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "مدير العلاقات", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، أرشيف التحضير)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "المشرف التربوي", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، أرشيف التحضير)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "المشرف الأكاديمي", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، أرشيف التحضير)، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "المشرف الإداري", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات، سجل متابعة الدفاتر والتصحيح، سجل الغياب، سجل التأخر، سجل المخالفات، سجل الخروج، سجل زيارة أولياء الأمور، سجل الاختبارات، سجل الإتلاف المدرسي، التعزيزات والمكافآت، سجل التميز والإبداع، كشف استلام وتسليم الكشوفات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "السكرتارية", perms: "✓ الرئيسية (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة المعلمين (ظهور الزر، السماح بتغيير البيانات)، ✓ متابعة الموظفين والعاملين (ظهور الزر، السماح بتغيير البيانات)، ✓ شؤون الطلاب (ظهور الزر، السماح بتغيير البيانات)، ✓ جدول التغطية (ظهور الزر، السماح بتغيير البيانات)، ✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ السكرتارية (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، السماح بتغيير البيانات)، ✓ أرشيف التحضير، ✓ التحضير اليومي الجديد، ✓ تقييم الطلاب، ✓ كشف الدرجات، ✓ التقييم الذاتي، ✓ تعديل أنشطة التقييم والمخطط، ✓ الإشراف التربوي (ظهور الزر، السماح بتغيير البيانات)، ✓ عدم السماح بتغيير البيانات، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ المؤشرات الشاملة (ظهور الزر، السماح بتغيير البيانات)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ مسؤول الحركة والمواصلات (لوحة المؤشرات والتحليل، التحكم بحركة المواصلات، متابعة مشرف الباص، متابعة مسؤول الحركة)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات، سجل متابعة الدفاتر والتصحيح، سجل الغياب، سجل التأخر، سجل المخالفات، سجل الخروج، سجل زيارة أولياء الأمور، سجل الاختبارات، سجل الإتلاف المدرسي، التعزيزات والمكافآت، سجل التميز والإبداع، كشف استلام وتسليم الكشوفات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف، الاطلاع على تفاصيل التعاميم)" },
          { job: "المختص الاجتماعي", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ دراسة حالة (ظهور الزر، السماح بتغيير البيانات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "مسؤول معمل العلوم", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "مسؤول الوسائل", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "مسؤول المكتبة", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "مسؤول الأنشطة", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف, مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "معلم فنية", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "معلم الرياضة", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام، المهام المضافة، المهام المرحلة، المشكلات والتوصيات والمقترحات)، ✓ المشكلات والحلول (ظهور الزر، السماح بتغيير البيانات، إظهار المشكلات والحلول)، ✓ الدورات التدريبية (ظهور الزر، السماح بتغيير البيانات، صلاحيات تعديل المعايير والإضافة والحذف، مؤشرات الدورات التدريبية)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات)" },
          { job: "معلم مادة", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، السماح بتغيير البيانات، أرشيف التحضير، التحضير اليومي الجديد، تقييم الطلاب، كشف الدرجات، التقييم الذاتي، تعديل أنشطة التقييم والمخطط)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف)" },
          { job: "مربية", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ خاص بالمعلم (ظهور الزر، السماح بتغيير البيانات، أرشيف التحضير، التحضير اليومي الجديد، تقييم الطلاب، كشف الدرجات، التقييم الذاتي، تعديل أنشطة التقييم والمخطط)، ✓ كشف الدرجات (ظهور الزر، السماح بتغيير البيانات)، ✓ التواصل والتطوير (التعاميم، الاستطلاعات، الواجبات والتكاليف)" },
          { job: "مسؤول الحركة", perms: "✓ ملف المدرسة (ظهور الزر، السماح بتغيير البيانات)، ✓ تقارير خاصة (ظهور الزر، السماح بتغيير البيانات، المهام), ✓ مسؤول الحركة والمواصلات (لوحة المؤشرات والتحليل، التحكم بحركة المواصلات، متابعة مشرف الباص، متابعة مسؤول الحركة)" }
        ];

        const ifParts = jobPerms.map(jp => `IF(ISNUMBER(SEARCH("${jp.job}", ${cellRef})), "${jp.perms}", "")`).join(",\n      ");
        return {
          formula: `IF(OR(ISNUMBER(SEARCH("المشرف العام", ${cellRef})), ISNUMBER(SEARCH("نائب المشرف العام", ${cellRef}))), "صلاحيات كاملة",\n  TEXTJOIN("، ", TRUE,\n      ${ifParts}\n  )\n)`
        };
      };

      data.users.forEach((u, idx) => {
        const rowNum = idx + 2; // Row numbers start at 2 in main sheet
        const listsRow = listsSheet.getRow(rowNum);

        // كتابة القوائم التفاعلية لصف المستخدم الحالي في الورقة المخفية وتحديد نطاقها
        let cIdx = 1;

        // 1. الوظائف
        const userJobs = u.jobTitle ? u.jobTitle.split(",").map(j => j.trim()).filter(Boolean) : [];
        jobsList.map(j => userJobs.includes(j) ? `✓ ${j}` : j).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const jobsRange = { start: 1, end: cIdx - 1 };

        // 2. المواد
        const userSubjects = u.subjects || [];
        subjectsList.map(s => userSubjects.includes(s) ? `✓ ${s}` : s).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const subjectsRange = { start: jobsRange.end + 1, end: cIdx - 1 };

        // 3. الصلاحية
        const userRole = u.role === "admin" ? "مدير" : "مستخدم";
        rolesList.map(r => r === userRole ? `✓ ${r}` : r).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const rolesRange = { start: subjectsRange.end + 1, end: cIdx - 1 };

        // 4. المدارس
        const userSchools = u.schools || [];
        schoolsList.map(s => userSchools.includes(s) ? `✓ ${s}` : s).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const schoolsRange = { start: rolesRange.end + 1, end: cIdx - 1 };

        // 5. الأعوام الدراسية
        const userYears = u.academicYears || [];
        yearsList.map(y => userYears.includes(y) ? `✓ ${y}` : y).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const yearsRange = { start: schoolsRange.end + 1, end: cIdx - 1 };

        // 6. الصفوف
        const userGrades = u.grades || [];
        gradesList.map(g => userGrades.includes(g) ? `✓ ${g}` : g).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const gradesRange = { start: yearsRange.end + 1, end: cIdx - 1 };

        // 7. الشعب
        const userSections = u.sections || [];
        sectionsList.map(s => userSections.includes(s) ? `✓ ${s}` : s).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const sectionsRange = { start: gradesRange.end + 1, end: cIdx - 1 };

        // 8. صلاحيات كاملة
        const userFull = u.permissions?.all ? "نعم" : "لا";
        fullPermList.map(f => f === userFull ? `✓ ${f}` : f).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const fullRange = { start: sectionsRange.end + 1, end: cIdx - 1 };

        // 9. فروع المدارس
        const userBranches: string[] = [];
        const sab = u.permissions?.schoolsAndBranches;
        if (sab && typeof sab === "object") {
          Object.values(sab).forEach(brList => {
            if (Array.isArray(brList)) {
              brList.forEach(b => { if (b) userBranches.push(b); });
            }
          });
        }
        branchesList.map(b => userBranches.includes(b) ? `✓ ${b}` : b).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const branchesRange = { start: fullRange.end + 1, end: cIdx - 1 };

        // 10. تفاصيل صلاحيات الوصول
        const activePermLabels = permissionsList
          .filter(p => {
            if (u.permissions?.all) return true;
            if (p.id === "readOnly") return !!u.permissions?.readOnly;
            const val = u.permissions?.[p.id as keyof UserPermissions];
            return !!(val && (val === true || (Array.isArray(val) && val.length > 0)));
          })
          .map(p => p.label);
        
        permsList.map(p => activePermLabels.includes(p) ? `✓ ${p}` : p).forEach(v => { listsRow.getCell(cIdx++).value = v; });
        const permsRange = { start: branchesRange.end + 1, end: cIdx - 1 };

        listsRow.commit();

        // كتابة البيانات للخلية في الصفحة الرئيسية
        const mainRow = mainSheet.addRow([
          u.name || "",
          formatActiveValue(jobsList, userJobs),
          formatActiveValue(subjectsList, userSubjects),
          `✓ ${userRole}`,
          u.code || "",
          formatActiveValue(schoolsList, userSchools),
          formatActiveValue(yearsList, userYears),
          formatActiveValue(gradesList, userGrades),
          formatActiveValue(sectionsList, userSections),
          u.startDate || "",
          u.expiryDate || "",
          formatActiveValue(branchesList, userBranches),
          `✓ ${userFull}`,
          "" // Placeholder for column N
        ]);

        // تعيين الصيغة الديناميكية لربط الوظيفة بالصلاحيات
        mainRow.getCell(14).value = getPermsFormula(rowNum);

        // ربط خلايا الحقول بالقوائم التفاعلية
        const createValidation = (cell: any, start: number, end: number) => {
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`ListsData!$${getColLetter(start)}$${rowNum}:$${getColLetter(end)}$${rowNum}`]
          };
        };

        createValidation(mainRow.getCell(2), jobsRange.start, jobsRange.end); // الوظيفة
        createValidation(mainRow.getCell(3), subjectsRange.start, subjectsRange.end); // المادة
        createValidation(mainRow.getCell(4), rolesRange.start, rolesRange.end); // الصلاحية
        createValidation(mainRow.getCell(6), schoolsRange.start, schoolsRange.end); // المدارس
        createValidation(mainRow.getCell(7), yearsRange.start, yearsRange.end); // الأعوام
        createValidation(mainRow.getCell(8), gradesRange.start, gradesRange.end); // الصفوف
        createValidation(mainRow.getCell(9), sectionsRange.start, sectionsRange.end); // الشعب
        createValidation(mainRow.getCell(12), branchesRange.start, branchesRange.end); // الفروع
        createValidation(mainRow.getCell(13), fullRange.start, fullRange.end); // صلاحية كاملة
        createValidation(mainRow.getCell(14), permsRange.start, permsRange.end); // تفاصيل الصلاحيات
      });

      // تنسيقات الصفحة الرئيسية
      mainSheet.columns = [
        { width: 25 }, // الاسم
        { width: 25 }, // الوظيفة
        { width: 20 }, // المادة
        { width: 12 }, // الصلاحية
        { width: 12 }, // الكود
        { width: 30 }, // المدارس
        { width: 20 }, // الأعوام
        { width: 15 }, // الصفوف
        { width: 15 }, // الشعب
        { width: 15 }, // البدء
        { width: 15 }, // الانتهاء
        { width: 30 }, // الفروع
        { width: 15 }, // صلاحية كاملة
        { width: 45 }  // تفاصيل الصلاحيات
      ];

      // تنسيق الترويسة والخلايا
      mainSheet.getRow(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" }, name: "Arial" };
      mainSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E40AF" }
      };

      mainSheet.eachRow((row, rowNumber) => {
        row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        if (rowNumber > 1) {
          row.font = { name: "Arial", size: 11 };
        }
      });

      // إدراج ورقة التعليمات الخاصة بالماكرو وتفعيل القوائم المتعددة
      const instrSheet = workbook.addWorksheet("تعليمات تشغيل القوائم المتعددة", {
        views: [{ rightToLeft: true }]
      });

      instrSheet.columns = [
        { width: 80 }
      ];

      instrSheet.addRow(["دليل تفعيل ميزة الاختيار المتعدد في القوائم المنسدلة (VBA)"]).font = { bold: true, size: 16, color: { argb: "FF1E40AF" }, name: "Arial" };
      instrSheet.addRow([]);
      instrSheet.addRow(["لتتمكن من اختيار أكثر من خيار في نفس القائمة المنسدلة وتحديث إشارات الصح (✓) تلقائياً داخل برنامج Excel، يرجى اتباع الخطوات البسيطة التالية:"]).font = { bold: true, size: 12, name: "Arial" };
      instrSheet.addRow([]);
      instrSheet.addRow(["1. افتح ملف Excel الذي قمت بتصديره حالياً."]).font = { size: 11, name: "Arial" };
      instrSheet.addRow(["2. قم بحفظ الملف بصيغة كود ماكرو مفعّل: اذهب إلى (ملف > حفظ باسم) ثم اختر نوع الملف: Excel Macro-Enabled Workbook (*.xlsm)."]).font = { size: 11, name: "Arial" };
      instrSheet.addRow(["3. اضغط على مفتاحي ALT + F11 معاً لفتح نافذة محرر الأكواد (VBA)."]).font = { size: 11, name: "Arial" };
      instrSheet.addRow(["4. من القائمة اليسرى، ابحث عن اسم الورقة \"المستخدمين\" (Sheet1) واضغط عليها مرتين (Double Click)."]).font = { size: 11, name: "Arial" };
      instrSheet.addRow(["5. سيتم فتح نافذة بيضاء كبيرة في المنتصف؛ قم بنسخ كود الـ VBA أدناه بالكامل والصقه داخل هذه النافذة:"]).font = { size: 11, name: "Arial" };
      instrSheet.addRow([]);

      const vbaCode = `Private Sub Worksheet_Change(ByVal Target As Range)
    Dim Oldvalue As String, Newvalue As String, Item As String, Result As String
    Dim Parts() As String, i As Long, Found As Boolean
    
    On Error GoTo Exitsub
    If Target.Count > 1 Then Exit Sub
    
    ' تشغيل الكود للأعمدة التي تحتوي على قوائم منسدلة (الوظيفة، المادة، الصلاحية، المدارس، الأعوام، الصفوف، الشعب، الفروع، صلاحية كاملة، تفاصيل الصلاحيات)
    If Target.Column <> 2 And Target.Column <> 3 And Target.Column <> 4 And Target.Column <> 6 And Target.Column <> 7 And Target.Column <> 8 And Target.Column <> 9 And Target.Column <> 12 And Target.Column <> 13 And Target.Column <> 14 Then
        Exit Sub
    End If
    
    If Target.Validation.Type <> 3 Then Exit Sub
    
    Application.EnableEvents = False
    Newvalue = Target.Value
    Application.Undo
    Oldvalue = Target.Value
    Target.Value = Newvalue
    
    Item = Trim(Newvalue)
    If Left(Item, 2) = "✓ " Then Item = Mid(Item, 3)
    Item = Trim(Item)
    
    If Oldvalue = "" Then
        Target.Value = "✓ " & Item
    Else
        Parts = Split(Oldvalue, "، ")
        Found = False
        Result = ""
        
        For i = LBound(Parts) To UBound(Parts)
            Dim Part As String
            Part = Trim(Parts(i))
            If Left(Part, 2) = "✓ " Then Part = Mid(Part, 3)
            Part = Trim(Part)
            
            If Part = Item Then
                Found = True ' تم إلغاء التحديد
            ElseIf Part <> "" Then
                If Result = "" Then
                    Result = "✓ " & Part
                Else
                    Result = Result & "، ✓ " & Part
                End If
            End If
        Next i
        
        If Not Found Then
            If Result = "" Then
                Result = "✓ " & Item
            Else
                Result = Result & "، ✓ " & Item
            End If
        End If
        
        Target.Value = Result
    End If
    
    ' تحديث علامة الصح تلقائياً في ورقة البيانات المرجعية ListsData لتتغير في القائمة المنسدلة
    Dim FormulaStr As String, RefRange As Range, Cell As Range
    FormulaStr = Target.Validation.Formula1
    If Left(FormulaStr, 1) = "=" Then FormulaStr = Mid(FormulaStr, 2)
    
    On Error Resume Next
    If InStr(FormulaStr, "!") > 0 Then
        Set RefRange = Range(FormulaStr)
    Else
        Set RefRange = Sheets("ListsData").Range(FormulaStr)
    End If
    On Error GoTo Exitsub
    
    If Not RefRange Is Nothing Then
        For Each Cell In RefRange
            Dim Val As String
            Val = Trim(Cell.Value)
            If Left(Val, 2) = "✓ " Then Val = Mid(Val, 3)
            Val = Trim(Val)
            
            If Val = Item Then
                If Left(Cell.Value, 2) = "✓ " Then
                    Cell.Value = Val
                Else
                    Cell.Value = "✓ " & Val
                End If
            End If
        Next Cell
    End If

Exitsub:
    Application.EnableEvents = True
End Sub`;

      const codeRow = instrSheet.addRow([vbaCode]);
      codeRow.font = { name: "Courier New", size: 10, color: { argb: "FF0F172A" } };
      codeRow.alignment = { vertical: "top", horizontal: "left", wrapText: true };
      instrSheet.getRow(instrSheet.rowCount).height = 400; // ارتفاع كافٍ لمشاهدة الكود البرمجي بوضوح

      instrSheet.addRow([]);
      instrSheet.addRow(["6. بعد اللصق، قم بإغلاق نافذة محرر الأكواد (VBA) وحفظ ملف الـ Excel."]).font = { size: 11, name: "Arial" };
      instrSheet.addRow(["7. انتهى! الآن بمجرد فتح القائمة المنسدلة في ورقة \"المستخدمين\" والضغط على أي خيار، سيتم وضعه/تعديله تلقائياً مع وضع علامة صح تفاعلية."]).font = { bold: true, size: 11, name: "Arial", color: { argb: "FF047857" } };

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `بيانات_المستخدمين_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("تم تصدير كشوفات المستخدمين التفاعلية بنجاح!");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تصدير البيانات.");
    }
  };

  const applyJobsSelection = (newJobs: string[]) => {
    if (!formData) return;
    const jobTitleStr = newJobs.join(", ");

    const isSuperAdminJob =
      newJobs.includes("المشرف العام") ||
      newJobs.includes("نائب المشرف العام");
    const isMgmtJob = newJobs.some((j) =>
      ["مدير عام", "مدير فرع", "مدير عام المدارس"].includes(j)
    );
    const isSecOrQuality = newJobs.some((j) =>
      ["السكرتارية", "إدارة الجودة", "الجودة"].includes(j)
    );

    let newGrades = formData.grades || [];
    let newSections = formData.sections || [];
    let newSchools = formData.schools || [];
    const nextRole: "admin" | "user" =
      isSuperAdminJob || isMgmtJob ? "admin" : "user";

    const sab: Record<string, string[]> = {
      ...(formData.permissions?.schoolsAndBranches || {}),
    };

    if (isSuperAdminJob || isMgmtJob || isSecOrQuality) {
      newGrades = [...gradesOptions];
      newSections = [...sectionsOptions];
      if (newSchools.length === 0) {
        newSchools = (data.availableSchools || []).filter(Boolean);
      }
      newSchools.forEach((school) => {
        if (!sab[school] || sab[school].length === 0) {
          sab[school] = data.schoolBranches?.[school] || ["المركز الرئيسي"];
        }
      });
    }

    const newPerms = getPermissionsForJobs(
      newJobs,
      {
        ...(formData.permissions || {}),
        schoolsAndBranches: sab,
      },
      false
    );

    setSelectAll(!!newPerms.all);
    setFormData({
      ...formData,
      jobTitle: jobTitleStr,
      role: nextRole,
      permissions: {
        ...newPerms,
        schoolsAndBranches: sab,
      },
      schools: newSchools,
      grades: newGrades,
      sections: newSections,
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) {
      toast.error("صلاحياتك الحالية قراءة فقط ولا تسمح باستيراد مستخدمين جدد.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bbytes = event.target?.result;
        if (!bbytes) return;
        const workbook = XLSX.read(bbytes, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        if (!rows || rows.length === 0) {
          toast.error("الملف المستورد فارغ أو غير صالح");
          return;
        }

        const cleanString = (str: string) => {
          return String(str)
            .replace(/✓/g, "")
            .replace(/مدارس|مدرسة/g, "")
            .replace(/[\s,،:;.\-_()]/g, "")
            .toLowerCase();
        };

        const matchSchoolFlexibly = (rawName: string, schoolsList: string[]): string | null => {
          const cleanedRaw = cleanString(rawName);
          if (!cleanedRaw) return null;
          
          let found = schoolsList.find(s => cleanString(s) === cleanedRaw);
          if (found) return found;

          found = schoolsList.find(s => {
            const cleanS = cleanString(s);
            return cleanS.includes(cleanedRaw) || cleanedRaw.includes(cleanS);
          });
          return found || null;
        };

        const matchBranchFlexibly = (rawBranch: string, branchesList: string[]): string | null => {
          const cleanedRaw = cleanString(rawBranch);
          if (!cleanedRaw) return null;
          
          let found = branchesList.find(b => cleanString(b) === cleanedRaw);
          if (found) return found;

          found = branchesList.find(b => {
            const cleanB = cleanString(b);
            return cleanB.includes(cleanedRaw) || cleanedRaw.includes(cleanB);
          });
          return found || null;
        };

        const existingUsers = [...data.users];

        // Identify duplicate rows in the imported file
        const duplicateUsersInFile = rows.filter((row: any) => {
          const name = row["الاسم الكامل"] || row["اسم المستخدم"] || row["Name"] || row["name"];
          if (!name) return false;
          const jobTitle = String(row["المسمى الوظيفي"] || row["Job Title"] || row["jobTitle"] || "").replace(/✓/g, "").trim();
          const rawSchools = row["المدارس المصرح بها"] || row["المدارس"] || row["Schools"] || "";
          const schools = String(rawSchools).split(/[,،]/).map(s => s.replace(/✓/g, "").trim()).filter(Boolean);

          return existingUsers.some((u) => {
            const sameName = u.name?.trim().toLowerCase() === String(name).trim().toLowerCase();
            const sameJob = (u.jobTitle || "").replace(/✓/g, "").trim() === jobTitle;
            const sameSchool = (u.schools || []).some((s) => schools.includes(s));
            return sameName && sameJob && sameSchool;
          });
        });

        const executeImport = async (rowsToImport: any[]) => {
          const finishedUsers = [...data.users];
          const newUsersToSave: UserType[] = [];
          const existingCodes = finishedUsers.map(u => (u.code || '').trim().toLowerCase());

          const generateImportCode = (customCode?: string) => {
            if (customCode && customCode.trim() !== "") {
              const cleanCode = customCode.trim().toLowerCase();
              if (!existingCodes.includes(cleanCode)) {
                existingCodes.push(cleanCode);
                return customCode.trim();
              }
            }
            let isUnique = false;
            let newCode = "";
            while (!isUnique) {
              newCode = Math.floor(1000 + Math.random() * 9000).toString();
              if (!existingCodes.includes(newCode.toLowerCase())) {
                isUnique = true;
              }
            }
            existingCodes.push(newCode.toLowerCase());
            return newCode;
          };

          rowsToImport.forEach((row: any) => {
            const name = row["الاسم الكامل"] || row["اسم المستخدم"] || row["Name"] || row["name"];
            if (!name) return;

            const jobTitle = row["المسمى الوظيفي"] || row["Job Title"] || row["jobTitle"] || "";
            const newJobs = jobTitle
              ? String(jobTitle).split(/[,،]/).map(s => s.replace(/✓/g, "").trim()).filter(Boolean)
              : [];
            const cleanJobTitle = newJobs.join(", ");

            const isSuperAdminJob = newJobs.includes("المشرف العام") || newJobs.includes("نائب المشرف العام");
            const rawRole = row["الصلاحية"] || row["Role"] || row["role"] || "مستخدم";
            const cleanRole = String(rawRole).replace(/✓/g, "").trim();
            const role = isSuperAdminJob ? "admin" : ((cleanRole === "مدير" || cleanRole === "admin") ? "admin" : "user");

            const rawCode = row["كود الدخول"] || row["كود"] || row["Code"] || row["code"] || "";
            const code = generateImportCode(rawCode ? String(rawCode) : undefined);

            const rawSchools = row["المدارس المصرح بها"] || row["المدارس"] || row["Schools"] || "";
            const schools = String(rawSchools).split(/[,،]/).map(s => s.replace(/✓/g, "").trim()).filter(Boolean);

            const rawSubjects = row["المادة"] || row["المواد"] || row["Subject"] || row["subject"] || row["Subjects"] || row["subjects"] || "";
            const subjects = String(rawSubjects).split(/[,،]/).map(s => s.replace(/✓/g, "").trim()).filter(Boolean);

            const rawYears = row["الأعوام الدراسية"] || row["Academic Years"] || "";
            const academicYears = String(rawYears).split(/[,،]/).map(y => y.replace(/✓/g, "").trim()).filter(Boolean);

            const rawGrades = row["الصفوف"] || row["Grades"] || "";
            const grades = String(rawGrades).split(/[,،]/).map(g => g.replace(/✓/g, "").trim()).filter(Boolean);

            const rawSections = row["الشعب"] || row["Sections"] || "";
            const sections = String(rawSections).split(/[,،]/).map(s => s.replace(/✓/g, "").trim()).filter(Boolean);

            const rawStartDate = row["تاريخ البدء"] || row["Start Date"] || "";
            const startDate = rawStartDate ? String(rawStartDate).trim() : new Date().toISOString().split("T")[0];

            const rawExpiryDate = row["تاريخ الانتهاء"] || row["Expiry Date"] || "";
            const expiryDate = rawExpiryDate ? String(rawExpiryDate).trim() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const rawBranchesStr = row["فروع المدارس"] || row["School Branches"] || "";
            const schoolsAndBranches: Record<string, string[]> = {};
            if (rawBranchesStr) {
              const parts = String(rawBranchesStr).split(";");
              parts.forEach(p => {
                if (p.includes(":")) {
                  const subparts = p.split(":");
                  const rawSchName = subparts[0];
                  const rawBrsStr = subparts[1];
                  const matchedSchool = matchSchoolFlexibly(rawSchName, data.availableSchools || []);
                  if (matchedSchool) {
                    const rawBrs = rawBrsStr.split(/[,،]/).map(b => b.trim()).filter(Boolean);
                    const availableBrs = data.schoolBranches?.[matchedSchool] || [];
                    const matchedBrs: string[] = [];
                    rawBrs.forEach(rawB => {
                      const foundB = matchBranchFlexibly(rawB, availableBrs);
                      if (foundB) matchedBrs.push(foundB);
                    });
                    if (matchedBrs.length > 0) {
                      schoolsAndBranches[matchedSchool] = Array.from(new Set(matchedBrs));
                    }
                  }
                } else {
                  const rawBrs = p.split(/[,،]/).map(b => b.trim()).filter(Boolean);
                  schools.forEach(schoolName => {
                    const availableBrs = data.schoolBranches?.[schoolName] || [];
                    const matchedBrs: string[] = [];
                    rawBrs.forEach(rawB => {
                      const foundB = matchBranchFlexibly(rawB, availableBrs);
                      if (foundB) matchedBrs.push(foundB);
                    });
                    if (matchedBrs.length > 0) {
                      schoolsAndBranches[schoolName] = Array.from(new Set([
                        ...(schoolsAndBranches[schoolName] || []),
                        ...matchedBrs
                      ]));
                    }
                  });
                }
              });
            }

            // Set permissions based on job title (Rule 1 & Rule 3)
            const importPermissions = getPermissionsForJobs(newJobs, {}, true);

            const newUser: UserType = {
              id: "u" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
              name: String(name).trim(),
              jobTitle: cleanJobTitle ? cleanJobTitle : undefined,
              code,
              role,
              schools,
              academicYears,
              grades,
              sections,
              subjects,
              startDate,
              expiryDate,
              permissions: {
                ...importPermissions,
                schoolsAndBranches: Object.keys(schoolsAndBranches).length > 0 ? schoolsAndBranches : undefined,
              }
            };

            newUsersToSave.push(newUser);
          });

          if (newUsersToSave.length > 0) {
            const toastId = toast.loading("جاري حفظ المستخدمين المستوردين في النظام...");
            try {
              const results = await Promise.allSettled(
                newUsersToSave.map(async (u) => {
                  const existing = u.id ? await localDB.users.get(u.id) : null;
                  const stamped = stampRecord(
                    u,
                    { id: currentUser?.id, name: currentUser?.name },
                    existing
                  );
                  await localDB.users.put(stamped);
                  return stamped;
                })
              );

              const succeededUsers: UserType[] = [];
              const failedUsers: { name: string; error: string }[] = [];

              results.forEach((res, index) => {
                const u = newUsersToSave[index];
                if (res.status === 'fulfilled') {
                  succeededUsers.push(res.value);
                } else {
                  const err: any = res.reason;
                  const errMsg = err?.response?.data?.message || err?.response?.data?.error || err.message || "خطأ غير معروف";
                  failedUsers.push({ name: u.name, error: errMsg });
                }
              });

              if (succeededUsers.length > 0) {
                const updatedUsersList = [...data.users, ...succeededUsers];
                const allTargetSchools = data.availableSchools || [];
                updateData({ users: updatedUsersList }, allTargetSchools);
              }

              if (failedUsers.length === 0) {
                toast.success(`تم استيراد وحفظ عدد ${succeededUsers.length} مستخدم(ين) بنجاح!`, { id: toastId });
              } else if (succeededUsers.length > 0) {
                toast.warning(
                  `تم حفظ ${succeededUsers.length} مستخدم(ين) بنجاح، وفشل حفظ ${failedUsers.length} مستخدم(ين): ${failedUsers.map(f => `${f.name} (${f.error})`).join("، ")}`,
                  { id: toastId, duration: 8000 }
                );
              } else {
                toast.error(`فشل حفظ جميع المستخدمين: ${failedUsers.map(f => `${f.name} (${f.error})`).join("، ")}`, { id: toastId, duration: 8000 });
              }
            } catch (err: any) {
              console.error("Unexpected error during import save:", err);
              toast.error("حدث خطأ غير متوقع أثناء حفظ البيانات.", { id: toastId });
            }
          } else {
            toast.warning("لم يتم إضافة أي مستخدم من الملف.");
          }
        };

        if (duplicateUsersInFile.length > 0) {
          const duplicateNames = duplicateUsersInFile.map((u: any) => {
            const n = u["الاسم الكامل"] || u["اسم المستخدم"] || u["Name"] || u["name"];
            const j = u["المسمى الوظيفي"] || u["Job Title"] || u["jobTitle"] || "";
            return `${n} (${j})`;
          }).slice(0, 5).join("، ") + (duplicateUsersInFile.length > 5 ? "..." : "");

          setConfirmDialog({
            isOpen: true,
            title: "تنبيه: مكررات في ملف الاستيراد",
            message: `تم العثور على ${duplicateUsersInFile.length} مستخدم(ين) مكررين موجودين مسبقاً في النظام (نفس الاسم والوظيفة والمدرسة): ${duplicateNames}. هل ترغب في تجاهل/تخطي المكررات واستيراد الأسماء غير المكررة فقط؟ (اضغط "موافق" لتجاوز المكررات، أو "إلغاء واضافة" لاستيراد الكل على أي حال).`,
            type: "warning",
            confirmText: "تخطي وتجاوز المكررات",
            cancelText: "استيراد الجميع على أي حال",
            onConfirm: () => {
              const nonDuplicateRows = rows.filter((row: any) => {
                const name = row["الاسم الكامل"] || row["اسم المستخدم"] || row["Name"] || row["name"];
                if (!name) return false;
                const jobTitle = row["المسمى الوظيفي"] || row["Job Title"] || row["jobTitle"] || "";
                const rawSchools = row["المدارس المصرح بها"] || row["المدارس"] || row["Schools"] || "";
                const schools = String(rawSchools).split(/[,،]/).map(s => s.replace(/✓/g, "").trim()).filter(Boolean);

                return !existingUsers.some((u) => {
                  const sameName = u.name?.trim().toLowerCase() === String(name).trim().toLowerCase();
                  const sameJob = (u.jobTitle || "").trim() === String(jobTitle).trim();
                  const sameSchool = (u.schools || []).some((s) => schools.includes(s));
                  return sameName && sameJob && sameSchool;
                });
              });
              executeImport(nonDuplicateRows);
            },
            onCancel: () => {
              executeImport(rows);
            }
          });
        } else {
          executeImport(rows);
        }
      } catch (err) {
        console.error(err);
        toast.error("حدث خطأ أثناء قراءة ملف الاكسل، يرجى التثبت من صحة الصياغة.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!formData) return;
    if (isSaving) return;
    
    if (
      formData.role !== "admin" &&
      !formData.permissions?.all &&
      (!formData.schools || formData.schools.length === 0)
    ) {
      toast.error("الرجاء اختيار مدرسة واحدة على الأقل لهذا المستخدم");
      const schoolSection = document.getElementById("schools-section");
      if (schoolSection) {
        schoolSection.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const enteredCode = formData.code ? formData.code.trim() : "";
    if (enteredCode === "") {
      toast.error("يرجى إدخال كود الدخول للمستخدم.");
      return;
    }

    const hasDuplicateCode = data.users.some(
      (u) => (u.code || '').trim().toLowerCase() === enteredCode.toLowerCase() && u.id !== formData.id
    );
    if (hasDuplicateCode) {
      toast.error("تنبيه: كود الدخول هذا مستخدم مسبقاً لحساب آخر، يرجى تغييره!");
      return;
    }

    // ── Server-First Save ──────────────────────────────────────────────────
    // Saves to the server first, then updates local state only on success.
    // Any server-side validation errors are shown to the user immediately.
    // ───────────────────────────────────────────────────────────────────────
    const performSave = async () => {
      setIsSaving(true);
      try {
        // 1. Stamp and save to localDB first
        const existing = formData.id ? await localDB.users.get(formData.id) : null;
        const stampedUser = stampRecord(
          formData,
          { id: currentUser?.id, name: currentUser?.name },
          existing
        );
        await localDB.users.put(stampedUser);

        // 2. Update local state
        const existingUserIndex = data.users.findIndex((u) => u.id === stampedUser.id);
        let newUsers = [...data.users];

        if (existingUserIndex > -1) {
          newUsers[existingUserIndex] = stampedUser;
        } else {
          newUsers.push(stampedUser);
        }

        const cleanUsers = newUsers.map((u) => {
          const uAny = u as any;
          const schools = Array.isArray(u.schools) ? u.schools : [];
          const academicYears = Array.isArray(u.academicYears)
            ? u.academicYears
            : (Array.isArray(uAny.academic_years) ? uAny.academic_years : []);
          const jobTitle = u.jobTitle || uAny.job_title || "";
          const startDate = u.startDate || uAny.start_date || "";
          const expiryDate = u.expiryDate || uAny.expiry_date || "";
          return { ...u, schools, academicYears, jobTitle, startDate, expiryDate };
        });

        const existingUser = data.users.find((u) => u.id === formData.id);

        let targetSchools = Array.from(
          new Set([...(existingUser?.schools || []), ...(formData.schools || [])])
        ).filter(Boolean);
        if (
          existingUser?.role === "admin" ||
          existingUser?.permissions?.all ||
          formData.role === "admin" ||
          formData.permissions?.all
        ) {
          targetSchools = data.availableSchools || [];
        }

        // Update local state (skipServerSync=true since we already saved above)
        updateData({ users: cleanUsers }, targetSchools);

        const isNew = existingUserIndex === -1;
        toast.success(isNew ? `✅ تم إضافة المستخدم "${formData.name}" بنجاح!` : `✅ تم حفظ بيانات "${formData.name}" بنجاح!`);
        onClose();
      } catch (err: any) {
        // Show the server error clearly to the user
        const status = err?.response?.status;
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (err?.response?.data?.errors
            ? Object.values(err.response.data.errors as Record<string, string[]>).flat().join(" | ")
            : null);

        if (status === 403) {
          toast.error("🚫 ليس لديك صلاحية حفظ بيانات المستخدمين.");
        } else if (status === 400 && serverMsg) {
          toast.error(`⚠️ خطأ في البيانات: ${serverMsg}`);
        } else if (serverMsg) {
          toast.error(`❌ فشل الحفظ: ${serverMsg}`);
        } else if (!navigator.onLine || err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
          toast.error("📡 لا يوجد اتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مجدداً.");
        } else {
          toast.error("❌ حدث خطأ غير متوقع أثناء الحفظ. يرجى المحاولة مجدداً.");
        }
        console.error("[handleSave] Server save failed:", err?.response?.data || err);
      } finally {
        setIsSaving(false);
      }
    };

    // Check for duplicate before saving
    const duplicateExists = data.users.some((u) => {
      if (u.id === formData.id) return false;
      const sameName = u.name?.trim().toLowerCase() === formData.name?.trim().toLowerCase();
      const sameJob = (u.jobTitle || "").trim() === (formData.jobTitle || "").trim();
      const schoolOverlap = (u.schools || []).some((s) => (formData.schools || []).includes(s));
      return sameName && sameJob && schoolOverlap;
    });

    if (duplicateExists) {
      setConfirmDialog({
        isOpen: true,
        title: "تنبيه: حساب مكرر محتمل",
        message: `يوجد بالفعل مستخدم بنفس الاسم الكامل (${formData.name}) والوظيفة (${formData.jobTitle || "غير محدد"}) في نفس المدرسة. هل ترغب في المتابعة وإضافة هذا المستخدم على أي حال؟`,
        type: "warning",
        confirmText: "إضافة على أي حال",
        cancelText: "تعديل البيانات",
        onConfirm: () => {
          performSave();
        },
      });
    } else {
      performSave();
    }
  };

  const handleDelete = () => {
    if (isReadOnly) return;
    if (!formData) return;
    setConfirmDialog({
      isOpen: true,
      title: "حذف المستخدم",
      message: "هل أنت متأكد من حذف هذا المستخدم؟",
      type: "danger",
      onConfirm: () => {
        const existingUser = data.users.find((u) => u.id === formData.id);
        let targetSchools = Array.from(new Set(existingUser?.schools || [])).filter(Boolean);
        
        if (existingUser?.role === "admin" || existingUser?.permissions?.all) {
           targetSchools = data.availableSchools || [];
        }
        
        updateData(
          { users: data.users.filter((u) => u.id !== formData.id) },
          targetSchools,
        );
        onClose();
      },
    });
  };

  const toggleSchool = (school: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      const current = prev.schools || [];
      const next = current.includes(school)
        ? current.filter((s) => s !== school)
        : [...current, school];

      // Clean up branches if school is removed
      let nextPermissions = { ...prev.permissions };
      if (!next.includes(school) && nextPermissions.schoolsAndBranches) {
        const newBranches = { ...nextPermissions.schoolsAndBranches };
        delete newBranches[school];
        nextPermissions.schoolsAndBranches = newBranches;
      }

      return { ...prev, schools: next, permissions: nextPermissions };
    });
  };

  const toggleBranch = (school: string, branch: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      const currentPermissions = prev.permissions || {};
      const schoolsAndBranches = {
        ...(currentPermissions.schoolsAndBranches || {}),
      };
      const currentBranches = schoolsAndBranches[school] || [];

      let nextSchools = prev.schools || [];
      if (currentBranches.includes(branch)) {
        schoolsAndBranches[school] = currentBranches.filter(
          (b) => b !== branch,
        );
      } else {
        schoolsAndBranches[school] = [...currentBranches, branch];
        // Ensure the school is also in the schools array
        if (!nextSchools.includes(school)) {
          nextSchools = [...nextSchools, school];
        }
      }

      return {
        ...prev,
        schools: nextSchools,
        permissions: {
          ...currentPermissions,
          schoolsAndBranches,
        },
      };
    });
  };

  const toggleYear = (year: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      const current = prev.academicYears || [];
      const next = current.includes(year)
        ? current.filter((y) => y !== year)
        : [...current, year];
      return { ...prev, academicYears: next };
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] bg-slate-50 font-arabic overflow-y-auto flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="bg-white min-h-screen w-full flex flex-col relative"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <User size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800">
                  تعديل بيانات المستخدم
                </h2>
                <p className="text-slate-500 font-bold">
                  إدارة البيانات الشخصية والصلاحيات والوصول
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAllUsersExcel}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-100 transition-all border border-emerald-500"
                title="تصدير كافة المستخدمين بالتفصيل"
              >
                <Download size={14} />
                <span>تصدير Excel</span>
              </button>
              
              <label
                htmlFor="import-users-excel-input"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer transition-all border border-indigo-500"
                title="استيراد كشافة المستخدمين"
              >
                <Upload size={14} />
                <span>استيراد Excel</span>
              </label>
              <input
                type="file"
                id="import-users-excel-input"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleImportExcel}
              />

              <button
                onClick={onClose}
                className="p-4 hover:bg-white hover:shadow-lg rounded-2xl transition-all text-slate-400 hover:text-red-500"
              >
                <X size={28} />
              </button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info */}
            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <Key size={20} />
                  <h3 className="font-black text-xl">البيانات الأساسية</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-black text-lg transition-all"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="أدخل اسم المستخدم..."
                  />
                </div>

                <div ref={dropdownsWrapperRef} className="space-y-4">
                  {/* حقل الوظيفة */}
                  <div className="space-y-2 relative">
                    <label className="text-sm font-black text-slate-500 mr-2">
                      الوظيفة (يمكن اختيار أكثر من صفة)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownSearch("");
                        setOpenDropdown(openDropdown === "job" ? null : "job");
                      }}
                      className={`w-full min-h-[58px] px-6 py-4 bg-slate-50 border-2 ${
                        openDropdown === "job"
                          ? "border-blue-500 bg-white shadow-md"
                          : "border-transparent hover:border-blue-200"
                      } rounded-2xl outline-none font-black text-lg transition-all cursor-pointer flex items-center justify-between gap-2 text-right`}
                    >
                      <span className="flex-1 truncate">
                        {formData.jobTitle
                          ? formData.jobTitle
                              .split(",")
                              .map((j) => j.trim())
                              .filter(Boolean)
                              .join("، ")
                          : "اختر الصفة / الوظيفة..."}
                      </span>
                      <ChevronDown
                        size={20}
                        className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                          openDropdown === "job" ? "rotate-180 text-blue-600" : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "job" && (
                      <div className="absolute top-full right-0 mt-1 w-full bg-white border-2 border-blue-100 rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="بحث في الوظائف..."
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold"
                        />
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              const currentJobs = formData.jobTitle
                                ? formData.jobTitle
                                    .split(",")
                                    .map((j) => j.trim())
                                    .filter(Boolean)
                                : [];
                              if (currentJobs.length === jobsOptions.length) {
                                applyJobsSelection([]);
                              } else {
                                applyJobsSelection([...jobsOptions]);
                              }
                            }}
                            className="text-blue-600 hover:underline font-black"
                          >
                            {(formData.jobTitle
                              ? formData.jobTitle
                                  .split(",")
                                  .map((j) => j.trim())
                                  .filter(Boolean).length
                              : 0) === jobsOptions.length
                              ? "إلغاء تحديد الكل"
                              : "تحديد الكل"}
                          </button>
                          <span className="text-slate-400">
                            المحدد:{" "}
                            {
                              (formData.jobTitle
                                ? formData.jobTitle
                                    .split(",")
                                    .map((j) => j.trim())
                                    .filter(Boolean)
                                : []
                              ).length
                            }
                          </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-1 p-1">
                          {jobsOptions
                            .filter((job) =>
                              job
                                .toLowerCase()
                                .includes(dropdownSearch.toLowerCase())
                            )
                            .map((job) => {
                              const currentJobs = formData.jobTitle
                                ? formData.jobTitle
                                    .split(",")
                                    .map((j) => j.trim())
                                    .filter(Boolean)
                                : [];
                              const isSelected = currentJobs.includes(job);
                              return (
                                <label
                                  key={job}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-colors ${
                                    isSelected
                                      ? "bg-blue-50 text-blue-700"
                                      : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      let newJobs = [...currentJobs];
                                      if (e.target.checked) {
                                        newJobs.push(job);
                                      } else {
                                        newJobs = newJobs.filter((j) => j !== job);
                                      }
                                      applyJobsSelection(newJobs);
                                    }}
                                    className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                                  />
                                  <span className="truncate">{job}</span>
                                </label>
                              );
                            })}
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(null)}
                            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all"
                          >
                            تم
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* حقل المادة */}
                  {formData.jobTitle &&
                    (formData.jobTitle
                      .split(",")
                      .map((j) => j.trim())
                      .includes("معلم مادة") ||
                      formData.jobTitle
                        .split(",")
                        .map((j) => j.trim())
                        .includes("مربية") ||
                      formData.jobTitle
                        .split(",")
                        .map((j) => j.trim())
                        .includes("المشرف التربوي")) && (
                      <div className="space-y-2 relative">
                        <label className="text-sm font-black text-slate-500 mr-2">
                          المادة
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownSearch("");
                            setOpenDropdown(
                              openDropdown === "subjects" ? null : "subjects"
                            );
                          }}
                          className={`w-full min-h-[58px] px-6 py-4 bg-slate-50 border-2 ${
                            openDropdown === "subjects"
                              ? "border-blue-500 bg-white shadow-md"
                              : "border-transparent hover:border-blue-200"
                          } rounded-2xl outline-none font-black text-lg transition-all cursor-pointer flex items-center justify-between gap-2 text-right`}
                        >
                          <span className="flex-1 truncate">
                            {formData.subjects && formData.subjects.length > 0
                              ? formData.subjects.length ===
                                subjectsOptions.length
                                ? "الجميع"
                                : formData.subjects.join("، ")
                              : "اختر المادة..."}
                          </span>
                          <ChevronDown
                            size={20}
                            className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                              openDropdown === "subjects"
                                ? "rotate-180 text-blue-600"
                                : ""
                            }`}
                          />
                        </button>

                        {openDropdown === "subjects" && (
                          <div className="absolute top-full right-0 mt-1 w-full bg-white border-2 border-blue-100 rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2">
                            <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer text-sm font-black border-b border-slate-100 rounded-xl transition-colors text-blue-600">
                              <input
                                type="checkbox"
                                checked={
                                  formData.subjects?.length ===
                                  subjectsOptions.length
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    subjects: e.target.checked
                                      ? [...subjectsOptions]
                                      : [],
                                  })
                                }
                                className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                              />
                              الجميع
                            </label>
                            <div className="max-h-56 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-1 p-1">
                              {subjectsOptions.map((subj) => {
                                const isChecked =
                                  formData.subjects?.includes(subj) || false;
                                return (
                                  <label
                                    key={subj}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-colors ${
                                      isChecked
                                        ? "bg-blue-50 text-blue-700"
                                        : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const newArr = isChecked
                                          ? (formData.subjects || []).filter(
                                              (x) => x !== subj
                                            )
                                          : [...(formData.subjects || []), subj];
                                        setFormData({
                                          ...formData,
                                          subjects: newArr,
                                        });
                                      }}
                                      className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="truncate">{subj}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <div className="border-t border-slate-100 pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setOpenDropdown(null)}
                                className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all"
                              >
                                تم
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {/* حقل الصف */}
                  <div className="space-y-2 relative">
                    <label className="text-sm font-black text-slate-500 mr-2">
                      الصف
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownSearch("");
                        setOpenDropdown(
                          openDropdown === "grades" ? null : "grades"
                        );
                      }}
                      className={`w-full min-h-[58px] px-6 py-4 bg-slate-50 border-2 ${
                        openDropdown === "grades"
                          ? "border-blue-500 bg-white shadow-md"
                          : "border-transparent hover:border-blue-200"
                      } rounded-2xl outline-none font-black text-lg transition-all cursor-pointer flex items-center justify-between gap-2 text-right`}
                    >
                      <span className="flex-1 truncate">
                        {formData.grades && formData.grades.length > 0
                          ? formData.grades.length === gradesOptions.length
                            ? "الجميع"
                            : formData.grades.join("، ")
                          : "اختر الصف..."}
                      </span>
                      <ChevronDown
                        size={20}
                        className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                          openDropdown === "grades"
                            ? "rotate-180 text-blue-600"
                            : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "grades" && (
                      <div className="absolute top-full right-0 mt-1 w-full bg-white border-2 border-blue-100 rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2">
                        <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer text-sm font-black border-b border-slate-100 rounded-xl transition-colors text-blue-600">
                          <input
                            type="checkbox"
                            checked={
                              formData.grades?.length === gradesOptions.length
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                grades: e.target.checked
                                  ? [...gradesOptions]
                                  : [],
                              })
                            }
                            className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                          />
                          الجميع
                        </label>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-1 p-1">
                          {gradesOptions.map((gr, i) => {
                            const isChecked =
                              formData.grades?.includes(gr) || false;
                            return (
                              <label
                                key={`grade-${gr}-${i}`}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-colors ${
                                  isChecked
                                    ? "bg-blue-50 text-blue-700"
                                    : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const newArr = isChecked
                                      ? (formData.grades || []).filter(
                                          (x) => x !== gr
                                        )
                                      : [...(formData.grades || []), gr];
                                    setFormData({
                                      ...formData,
                                      grades: newArr,
                                    });
                                  }}
                                  className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                                />
                                <span>{gr}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(null)}
                            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all"
                          >
                            تم
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* حقل الشعب */}
                  <div className="space-y-2 relative">
                    <label className="text-sm font-black text-slate-500 mr-2">
                      الشعب
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownSearch("");
                        setOpenDropdown(
                          openDropdown === "sections" ? null : "sections"
                        );
                      }}
                      className={`w-full min-h-[58px] px-6 py-4 bg-slate-50 border-2 ${
                        openDropdown === "sections"
                          ? "border-blue-500 bg-white shadow-md"
                          : "border-transparent hover:border-blue-200"
                      } rounded-2xl outline-none font-black text-lg transition-all cursor-pointer flex items-center justify-between gap-2 text-right`}
                    >
                      <span className="flex-1 truncate">
                        {formData.sections && formData.sections.length > 0
                          ? formData.sections.length === sectionsOptions.length
                            ? "الجميع"
                            : formData.sections.join("، ")
                          : "اختر الشعبة..."}
                      </span>
                      <ChevronDown
                        size={20}
                        className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                          openDropdown === "sections"
                            ? "rotate-180 text-blue-600"
                            : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "sections" && (
                      <div className="absolute top-full right-0 mt-1 w-full bg-white border-2 border-blue-100 rounded-2xl shadow-2xl z-50 p-3 flex flex-col gap-2">
                        <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer text-sm font-black border-b border-slate-100 rounded-xl transition-colors text-blue-600">
                          <input
                            type="checkbox"
                            checked={
                              formData.sections?.length ===
                              sectionsOptions.length
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sections: e.target.checked
                                  ? [...sectionsOptions]
                                  : [],
                              })
                            }
                            className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                          />
                          الجميع
                        </label>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-1 p-1">
                          {sectionsOptions.map((sec, i) => {
                            const isChecked =
                              formData.sections?.includes(sec) || false;
                            return (
                              <label
                                key={`section-${sec}-${i}`}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer text-sm font-bold transition-colors ${
                                  isChecked
                                    ? "bg-blue-50 text-blue-700"
                                    : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const newArr = isChecked
                                      ? (formData.sections || []).filter(
                                          (x) => x !== sec
                                        )
                                      : [...(formData.sections || []), sec];
                                    setFormData({
                                      ...formData,
                                      sections: newArr,
                                    });
                                  }}
                                  className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                                />
                                <span>{sec}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(null)}
                            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all"
                          >
                            تم
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">
                    كود الدخول (أرقام، حروف، ورموز)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      maxLength={12}
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-center text-lg transition-all"
                      placeholder="أدخل كود الدخول"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value,
                        })
                      }
                    />
                    <button
                      onClick={generateUniqueCode}
                      className="px-6 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                      title="إنشاء كود ذكي"
                    >
                      <Wand2 size={20} /> توليد
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 mr-2">
                      تاريخ البدء
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 mr-2">
                      تاريخ الانتهاء
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </section>

              <section id="schools-section" className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 mb-4">
                  <School size={20} />
                  <h3 className="font-black text-xl">
                    المدارس والأعوام المصرح بها
                  </h3>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 mr-2">
                    المدارس والفروع
                  </label>
                  <div className="flex flex-col gap-3">
                    {data.availableSchools?.filter(Boolean).map((school, idx) => {
                      const isSchoolSelected =
                        formData.schools?.includes(school);
                      const schoolBranches =
                        data.schoolBranches?.[school] || [];
                      const isBranchesEmpty = schoolBranches.length === 0;

                      return (
                        <div
                          key={`school-${school}-${idx}`}
                          className={`p-4 rounded-2xl border-2 transition-all ${isSchoolSelected ? "bg-purple-50/50 border-purple-200" : "bg-white border-slate-100 hover:border-purple-100"}`}
                        >
                          <button
                            onClick={() => toggleSchool(school)}
                            className={`w-full flex items-center justify-between text-right px-4 py-2 rounded-xl font-bold transition-all ${
                              isSchoolSelected
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-100"
                                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <span>{school}</span>
                            {isSchoolSelected && <Check size={18} />}
                          </button>

                          {/* Branches mapping if school is selected */}
                          {isSchoolSelected && !isBranchesEmpty && (
                            <div className="mt-3 flex flex-wrap gap-2 px-2">
                              {schoolBranches.filter(Boolean).map((branch, brIdx) => {
                                const isBranchSelected =
                                  formData.permissions?.schoolsAndBranches?.[
                                    school
                                  ]?.includes(branch);
                                return (
                                  <button
                                    key={`branch-${branch}-${brIdx}`}
                                    onClick={() => toggleBranch(school, branch)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                      isBranchSelected
                                        ? "bg-purple-100 border-purple-300 text-purple-700 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-purple-200 hover:bg-purple-50"
                                    }`}
                                  >
                                    {branch}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 mr-2">
                    الأعوام الدراسية
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {data.availableYears?.filter(Boolean).map((year, idx) => (
                      <button
                        key={`year-${year || idx}-${idx}`}
                        onClick={() => toggleYear(year)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                          formData.academicYears?.includes(year)
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Middle Column: Permissions (First Half) */}
            <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield size={20} />
                  <h3 className="font-black text-xl">صلاحيات الوصول 1</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-sm font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                    تحديد الكل
                  </span>
                  <div
                    onClick={() => handleSelectAll(!selectAll)}
                    className={`w-12 h-6 rounded-full transition-all relative ${selectAll ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectAll ? "right-7" : "right-1"}`}
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                {column1Permissions.map((perm) => renderPermissionCard(perm))}
              </div>
            </div>

            {/* Right Column: Permissions (Second Half) */}
            <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield size={20} />
                  <h3 className="font-black text-xl">صلاحيات الوصول 2</h3>
                </div>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                {column2Permissions.map((perm) => renderPermissionCard(perm))}
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleDelete}
              className="px-6 py-4 bg-white border-2 border-red-100 text-red-500 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <Trash2 size={20} /> حذف المستخدم
            </button>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-12 py-4 text-white font-black rounded-2xl transition-all shadow-xl flex items-center gap-2 ${
                  isSaving
                    ? "bg-blue-400 cursor-not-allowed shadow-blue-50"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check size={20} /> حفظ البيانات
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
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
    </AnimatePresence>
  );
};

export default UserEditModal;
