import React, { useState, useMemo, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Search,
  Calendar,
  Filter,
  FileText,
  Check,
  X,
  ChevronDown,
  Users,
  GraduationCap,
  Briefcase,
  Award,
  FileSpreadsheet,
  AlertCircle,
  FileBarChart,
  UserCheck,
  ClipboardList,
  BookOpen,
  HelpCircle,
  Printer,
  MessageCircle,
  Download,
  BarChart3,
  TrendingUp,
  Bus,
  TrendingDown,
  UserX
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { localDB } from "../src/lib/localDB";
import { saveAs } from "file-saver";
import {
  exportToStyledExcel,
  applyStyledHeaderAndFooter,
  applyStyledFooter,
  SchoolExportProfile,
} from "../src/lib/excelExport";
import { INDICATORS_DATA, ACTIVITIES_DATA } from "./evaluationData";
import { shortCriteriaBlocks, extCriteriaBlocks } from "./evaluationUtils";


// Subjects list for KG to Grade 9 Table (9 subjects)
const kg9TableSubjects = [
  "القرآن الكريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "المجتمع",
  "الجغرافيا",
  "التاريخ"
];

// Subjects list for Grades 10 to 12 Table (11 subjects)
const secondaryTableSubjects = [
  "القرآن الكريم",
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الأحياء",
  "الكيمياء",
  "الفيزياء",
  "المجتمع",
  "الجغرافيا",
  "التاريخ"
];

// Subject name normalizer helper
const normalizeSubjectName = (name: string) => {
  if (!name) return "";
  let s = name.trim();
  if (s === "القرآن كريم" || s === "القران الكريم" || s === "القرآن") return "القرآن الكريم";
  if (s === "التربية الاسلامية" || s === "التربية الإسلامية" || s === "إسلامية") return "التربية الإسلامية";
  if (s === "جغرافيا") return "الجغرافيا";
  if (s === "تاريخ") return "التاريخ";
  return s;
};

// Arabic name normalizer helper to ensure robust student name matching
const normalizeArabicName = (name: string) => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
};

const ALL_FIELDS_MAP: Record<string, string> = {
  academic_understanding: "الاستيعاب العلمي",
  homework_commitment: "الالتزام بالواجبات",
  participation: "المشاركة والتفاعل",
  classroom_behavior: "السلوك الصفي",
  strengths: "نقاط التميز",
  attendance: "الحضور والانصراف",
  appearance: "المظهر العام",
  yard_behavior: "السلوك العام في الساحات",
  property_respect: "احترام الممتلكات",
  admin_communication: "التواصل مع الإدارة",
  home_environment: "البيئة المنزلية",
  study_independence: "الاستقلالية في المذاكرة",
  social_life: "الحياة الاجتماعية",
  health_status: "الحالة الصحية",
  behavioral_notes: "الملاحظات السلوكية",
  school_feelings: "المشاعر تجاه المدرسة",
  favorite_hard_subjects: "المواد المفضلة / الصعبة",
  peer_relations: "العلاقات مع الزملاء / التنمر",
  preferred_learning_style: "طريقة التعلم المفضلة",
  leadership_skills: "المهارات القيادية",
  teamwork: "العمل الجماعي",
  talents: "المواهب",
  chronic_diseases: "الحالة الصحية والأمراض المزمنة",
  medication_used: "العلاج المستخدم",
  handling_procedures: "إجراءات وتعليمات التعامل مع الحالة",
  clinic_visits: "أوقات زيارة العيادة أو الطبيب المختص",
  physical_growth: "أدوية أو مأكولات أو مشربات وغيرها ممنوع منها",
  developmental_skills: "المهارات النمائية",
  academic_skills: "المهارات الأكاديمية الخاصة",
  iep_progress: "تقدم الخطة الفردية",
  initial_diagnosis: "التشخيص المبدئي (نوع الحالة)",
  swot_analysis: "مصفوفة SWOT",
  risk_level: "مؤشر الخطورة",
  sociogram: "العلاقات (الأصدقاء / حالة التنمر)",
  sessions_log: "سجل الجلسات والمقاييس",
  interventions: "التدخلات والإحالة",
};


// Helper to normalize and parse dates of different formats to YYYY-MM-DD
const parseDateToYYYYMMDD = (dStr: string | undefined): string => {
  if (!dStr) return "";
  const clean = dStr.split("T")[0].trim();
  // Check if it is dd/mm/yyyy (Arabic or en-GB format)
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      // In case it's yyyy/mm/dd (less likely, but check)
      if (day.length === 4) {
        return `${day}-${month}-${parts[2].padStart(2, "0")}`;
      }
      return `${year}-${month}-${day}`;
    }
  }
  return clean; // already yyyy-mm-dd
};

// Date utility to safely compare date ranges
const matchesDateRange = (dateVal: string | undefined, from: string, to: string) => {
  if (!dateVal) return true;
  const d = parseDateToYYYYMMDD(dateVal);
  if (!d) return true;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

// Clean name comparison helper to avoid mismatches due to whitespace/case/types
const cleanName = (n: string) => (n || "").trim().toLowerCase();

// Hijri months helper
const hijriMonths = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الثاني",
  "جمادى الأولى",
  "جمادى الثانية",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

const toHijri = (dateStr: string) => {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const monthNum = parseInt(parts.find((p) => p.type === "month")?.value || "1");
    const year = parts.find((p) => p.type === "year")?.value || "";
    return `${day} / ${hijriMonths[monthNum - 1]} / ${year}`;
  } catch {
    return "";
  }
};

const getDayNameAr = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(new Date(dateStr));
  } catch {
    return "";
  }
};

// Reusable Excel exporter to generate the beautiful Yemeni themed spreadsheet
const addStyledSheet = (
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  headers: string[],
  rowsData: any[][],
  colorHex: string,
  profile: any,
  currentUser: any
) => {
  // Create sheet with RTL
  const worksheet = workbook.addWorksheet(sheetName.substring(0, 31), {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 }
  });

  const colCount = Math.max(headers.length, 9);

  // Set default column widths
  for (let i = 1; i <= colCount; i++) {
    worksheet.getColumn(i).width = 18;
  }
  // Make first column (Name) slightly wider
  worksheet.getColumn(1).width = 25;

  // Set row heights for header area
  for (let i = 1; i <= 6; i++) {
    worksheet.getRow(i).height = 20;
  }
  worksheet.getRow(1).height = 25;
  worksheet.getRow(5).height = 25;

  // A. Right Side: Ministry Info
  worksheet.getCell(1, 1).value = "الجمهـورية اليمنية";
  worksheet.getCell(2, 1).value = profile?.ministry || "وزارة التربية والتعـليم والبحث العلمي";
  worksheet.getCell(3, 1).value = profile?.district || "مكتب التربية والتعليم بالأمانة";
  worksheet.getCell(4, 1).value = profile?.district?.includes("منطقة") ? profile.district : "مكتب التربية والتعليم بالمنطقة";
  worksheet.getCell(5, 1).value = profile?.schoolName || "اسم المدرسة";
  worksheet.getCell(6, 1).value = `فرع: ${profile?.branch || "الرئيسي"}`;

  for (let r = 1; r <= 6; r++) {
    const cell = worksheet.getCell(r, 1);
    cell.font = { name: "Arial", bold: true, size: 9 };
    cell.alignment = { horizontal: "right", vertical: "middle" };
  }

  // B. Center: Logo + Title
  const centerCol = Math.ceil(colCount / 2);

  // Merge cells for title
  worksheet.mergeCells(5, centerCol - 2, 5, centerCol + 2);
  const titleCell = worksheet.getCell(5, centerCol - 2);
  titleCell.value = title;
  titleCell.font = { name: "Arial", bold: true, size: 13, color: { argb: "FF" + colorHex } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  if (profile?.logoImg) {
    try {
      const logoBase64 = profile.logoImg;
      const base64Data = logoBase64.includes(";base64,") ? logoBase64.split(";base64,")[1] : logoBase64;
      const extension = logoBase64.includes("image/png") ? "png" : "jpeg";

      const imageId = workbook.addImage({
        base64: base64Data,
        extension: extension as "png" | "jpeg",
      });

      worksheet.addImage(imageId, {
        tl: { col: centerCol - 1, row: 0 },
        ext: { width: 70, height: 70 }
      });
    } catch (err) {
      console.error("Failed to embed logo", err);
    }
  }

  // C. Left Side: Dates
  const todayDate = new Date().toISOString().split("T")[0];
  const hijri = toHijri(todayDate);
  const dayName = getDayNameAr(todayDate);

  worksheet.getCell(1, colCount).value = `اليوم: ${dayName}`;
  worksheet.getCell(2, colCount).value = `التاريخ الهجري: ${hijri}`;
  worksheet.getCell(3, colCount).value = `التاريخ الميلادي: ${todayDate}`;

  for (let r = 1; r <= 3; r++) {
    const cell = worksheet.getCell(r, colCount);
    cell.font = { name: "Arial", bold: true, size: 9 };
    cell.alignment = { horizontal: "left", vertical: "middle" };
  }

  // --- 2. Data Table ---
  const startRowIndex = 8;
  const headerRow = worksheet.getRow(startRowIndex);
  headerRow.values = headers;
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + colorHex }
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };
  });

  // Populate data
  rowsData.forEach((rowData, idx) => {
    const excelRow = worksheet.addRow(rowData);
    excelRow.height = 25;
    const isEven = idx % 2 === 0;

    excelRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" }
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } }
      };
    });
  });

  // --- 3. Footer ---
  const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 10;
  const footerStart = lastRow + 2;
  worksheet.getRow(footerStart).height = 30;

  // Far Right (Col 1): Branch Manager
  const managerCell = worksheet.getCell(footerStart, 1);
  managerCell.value = `مدير الفرع: ${profile?.branchManager || "..."}`;
  managerCell.font = { name: "Arial", bold: true, size: 11 };
  managerCell.alignment = { horizontal: "right", vertical: "middle" };

  // Center: School Stamp
  const stampCell = worksheet.getCell(footerStart, centerCol);
  stampCell.value = "ختم المدرسة";
  stampCell.font = { name: "Arial", bold: true, size: 11 };
  stampCell.alignment = { horizontal: "center", vertical: "middle" };
  stampCell.border = {
    top: { style: "dashDot" }, bottom: { style: "dashDot" },
    left: { style: "dashDot" }, right: { style: "dashDot" }
  };

  // Far Left (Col colCount): Writer/Supervisor
  const writerCell = worksheet.getCell(footerStart, colCount);
  writerCell.value = `إعداد التقرير: ${currentUser?.name || "..."}`;
  writerCell.font = { name: "Arial", bold: true, size: 11 };
  writerCell.alignment = { horizontal: "left", vertical: "middle" };
};

export default function ComprehensiveReportsPage() {
  const { data, currentUser } = useGlobal();
  const [activeView, setActiveView] = useState<"landing" | "student" | "teacher" | "admin" | "statistical">("landing");

  const isSuperAdmin = currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const userSchools = currentUser?.selectedSchool?.split(",").map((s) => s.trim()) || [];

  const handleBack = () => {
    setActiveView("landing");
  };

  return (
    <div className="space-y-6 font-arabic max-w-7xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {activeView === "landing" && (
        <LandingView onViewChange={setActiveView} />
      )}

      {activeView === "student" && (
        <StudentReportsView
          data={data}
          isSuperAdmin={isSuperAdmin}
          userSchools={userSchools}
          onBack={handleBack}
          currentUser={currentUser}
        />
      )}

      {activeView === "teacher" && (
        <TeacherReportsView
          data={data}
          isSuperAdmin={isSuperAdmin}
          userSchools={userSchools}
          onBack={handleBack}
          currentUser={currentUser}
        />
      )}

      {activeView === "admin" && (
        <AdminReportsView
          data={data}
          isSuperAdmin={isSuperAdmin}
          userSchools={userSchools}
          onBack={handleBack}
          currentUser={currentUser}
        />
      )}

      {activeView === "statistical" && (
        <StatisticalReportsView
          data={data}
          isSuperAdmin={isSuperAdmin}
          userSchools={userSchools}
          onBack={handleBack}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. Landing View
// ==========================================
interface LandingViewProps {
  onViewChange: (view: "student" | "teacher" | "admin" | "statistical") => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onViewChange }) => {
  return (
    <div className="space-y-8 py-6">
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
          <FileBarChart size={40} />
        </div>
        <h1 className="text-3xl font-black text-slate-800">التقارير الشاملة</h1>
        <p className="text-slate-500 max-w-2xl mx-auto font-medium">
          مرحباً بك في وحدة التقارير الشاملة. يمكنك البحث واستخراج التقارير التجميعية والمفصلة للطلاب والمعلمين والكادر الإداري للفترة الزمنية المطلوبة.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Student Card */}
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewChange("student")}
          className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl p-6 shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 transition-all cursor-pointer relative overflow-hidden group border border-blue-500"
        >
          <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
            <Users size={160} />
          </div>
          <div className="relative space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">تقارير الطلاب</h2>
              <p className="text-blue-100 text-sm font-medium leading-relaxed leading-5">
                استعراض تقارير المشرف الإداري، تقييمات المعلمين، سجلات متابعة الدفاتر، دراسة الحالة للطلاب، التعهدات، ودرجات الاختبارات.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-sm font-bold">
              <span>ابدأ البحث والتحليل</span>
              <ArrowRight size={16} className="rotate-180" />
            </div>
          </div>
        </motion.div>

        {/* Teacher Card */}
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewChange("teacher")}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-xl shadow-emerald-100 hover:shadow-2xl hover:shadow-emerald-200 transition-all cursor-pointer relative overflow-hidden group border border-emerald-500"
        >
          <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
            <GraduationCap size={160} />
          </div>
          <div className="relative space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">تقارير المعلمين</h2>
              <p className="text-emerald-100 text-sm font-medium leading-relaxed leading-5">
                استعراض ومتابعة الأداء الإداري والتربوي، تقييمات الزيارات الإشرافية، سجلات استلام الدفاتر، جدول تغطية الحصص والتعهدات.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-sm font-bold">
              <span>ابدأ البحث والتحليل</span>
              <ArrowRight size={16} className="rotate-180" />
            </div>
          </div>
        </motion.div>

        {/* Admin Card */}
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewChange("admin")}
          className="bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white rounded-3xl p-6 shadow-xl shadow-purple-100 hover:shadow-2xl hover:shadow-purple-200 transition-all cursor-pointer relative overflow-hidden group border border-purple-500"
        >
          <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
            <Briefcase size={160} />
          </div>
          <div className="relative space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">تقارير الإداريين</h2>
              <p className="text-purple-100 text-sm font-medium leading-relaxed leading-5">
                استعراض تقارير الإدارة المختصة ومتابعة أداء الموظفين والعاملين ومستوى الإنجاز الإداري العام وتوثيق المهام.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-sm font-bold">
              <span>ابدأ البحث والتحليل</span>
              <ArrowRight size={16} className="rotate-180" />
            </div>
          </div>
        </motion.div>

        {/* Statistical Card */}
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewChange("statistical")}
          className="bg-gradient-to-br from-rose-600 to-pink-700 text-white rounded-3xl p-6 shadow-xl shadow-rose-100 hover:shadow-2xl hover:shadow-rose-200 transition-all cursor-pointer relative overflow-hidden group border border-rose-500"
        >
          <div className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-500">
            <BarChart3 size={160} />
          </div>
          <div className="relative space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">التقارير الإحصائية</h2>
              <p className="text-rose-100 text-sm font-medium leading-relaxed leading-5">
                استخراج وعرض التقارير والإحصائيات التجميعية والبيانات الدورية للمعلمين والإداريين والطلاب ومتابعة الأداء الميداني.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-sm font-bold">
              <span>عرض وتصفية الإحصائيات</span>
              <ArrowRight size={16} className="rotate-180" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ==========================================
// 2. Student Reports Sub-page
// ==========================================
interface SubPageProps {
  data: any;
  isSuperAdmin: boolean;
  userSchools: string[];
  onBack: () => void;
  currentUser: any;
}

const StudentReportsView: React.FC<SubPageProps> = ({ data, isSuperAdmin, userSchools, onBack, currentUser }) => {
  const { getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const reportOptions = [
    { id: "adminReports", label: "تقارير المشرف الإداري" },
    { id: "teacherEval", label: "تقارير المعلم (تقييم الطالب)" },
    { id: "notebooks", label: "تقارير الدفاتر والواجبات" },
    { id: "socialWorker", label: "تقارير المختص الاجتماعي" },
    { id: "violations", label: "التعهدات والمخالفات" },
    { id: "exams", label: "كشف درجات الاختبارات" }
  ];
  const [selectedReports, setSelectedReports] = useState<string[]>(reportOptions.map(r => r.id));
  const [showReportDropdown, setShowReportDropdown] = useState<boolean>(false);

  const [queryTriggered, setQueryTriggered] = useState<boolean>(false);
  const [caseStudyLogs, setCaseStudyLogs] = useState<any[]>([]);

  // States for student grades sheets
  const [displayMode, setDisplayMode] = useState<"total" | "exam_only">("total");
  const [selectedTerms, setSelectedTerms] = useState<string[]>(["الفصل الأول", "الفصل الثاني"]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(["الشهر الأول", "الشهر الثاني", "الشهر الثالث"]);
  const [gradeSheets, setGradeSheets] = useState<any[]>([]);
  const [studentSheets, setStudentSheets] = useState<any[]>([]);

  useEffect(() => {
    if (queryTriggered) {
      localDB.caseStudies
        .toArray()
        .then((rows) => setCaseStudyLogs(rows || []))
        .catch((err) => console.error("Error fetching case studies from localDB:", err));

      localDB.gradeSheets
        .toArray()
        .then((rows) => setGradeSheets(rows || []))
        .catch((err) => console.error("Error fetching grade sheets from localDB:", err));

      localDB.studentGradeSheets
        .toArray()
        .then((rows) => setStudentSheets(rows || []))
        .catch((err) => console.error("Error fetching student grade sheets from localDB:", err));
    }
  }, [queryTriggered]);

  // Grade sheets and student sheets synchronization helpers
  const findMonthIndex = (monthsList: string[], targetMonth: string) => {
    const clean = (s: string) => (s || "").replace(/\s+/g, "").replace(/ال/g, "");
    const cleanedTarget = clean(targetMonth);
    return (monthsList || []).findIndex((m) => clean(m) === cleanedTarget);
  };

  const getSubjectsForStudent = (grade: string) => {
    if (grade === "10") {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "الكيمياء",
        "الفيزياء",
        "الأحياء",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    } else if (grade === "11" || grade === "12") {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الجبر والهندسة",
        "التفاضل والتكامل",
        "الكيمياء",
        "الفيزياء",
        "الأحياء",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    } else {
      return [
        "القرآن الكريم",
        "التربية الإسلامية",
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "العلوم",
        "التاريخ",
        "الجغرافيا",
        "المجتمع",
        "الحاسوب"
      ];
    }
  };

  const getStudentSynchronizedScore = (studentId: string, studentGrade: string, studentSection: string, subjectName: string, field: string, term: string, sheetName: string) => {
    if (displayMode === "exam_only" && field !== "written") {
      return "";
    }
    
    const cleanSubject = (s: string) => s.replace(/\s+/g, "").replace(/ال/g, "");
    const targetSubClean = cleanSubject(subjectName);
    
    const matchedSheets = gradeSheets.filter(s => 
      s.schoolName === (selectedSchool || s.schoolName) &&
      s.branch === (selectedBranch || s.branch) &&
      s.grade === studentGrade &&
      s.section === studentSection &&
      cleanSubject(s.subject) === targetSubClean &&
      (s.sheetName === term || !s.sheetName) &&
      findMonthIndex(s.months || [], sheetName) !== -1
    );
    
    if (matchedSheets.length === 0) return null;
    
    const matchedSheet = matchedSheets.sort((a, b) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    )[0];

    const mIdx = findMonthIndex(matchedSheet.months || [], sheetName);
    const val = matchedSheet.cells[`${studentId}-m${mIdx}-${field}`];
    return val !== undefined && val.trim() !== "" ? val : null;
  };

  const getStudentCellDisplayValue = (studentId: string, studentGrade: string, studentSection: string, subName: string, colId: string, term: string, sheetName: string) => {
    const match = studentSheets.find(s => 
      s.studentId === studentId && 
      s.term === term && 
      s.sheetName === sheetName
    );
    const manualVal = match?.cells?.[`${subName}-${colId}`];
    if (manualVal !== undefined && manualVal !== "") {
      return manualVal;
    }
    return getStudentSynchronizedScore(studentId, studentGrade, studentSection, subName, colId, term, sheetName) ?? "";
  };

  const getStudentRowTotal = (studentId: string, studentGrade: string, studentSection: string, subName: string, term: string, sheetName: string) => {
    const wk = parseFloat(getStudentCellDisplayValue(studentId, studentGrade, studentSection, subName, "w_k", term, sheetName)) || 0;
    const oral = parseFloat(getStudentCellDisplayValue(studentId, studentGrade, studentSection, subName, "oral", term, sheetName)) || 0;
    const attend = parseFloat(getStudentCellDisplayValue(studentId, studentGrade, studentSection, subName, "attend", term, sheetName)) || 0;
    const written = parseFloat(getStudentCellDisplayValue(studentId, studentGrade, studentSection, subName, "written", term, sheetName)) || 0;
    return wk + oral + attend + written;
  };

  const getStudentRowPercentage = (studentId: string, studentGrade: string, studentSection: string, subName: string, term: string, sheetName: string) => {
    const total = getStudentRowTotal(studentId, studentGrade, studentSection, subName, term, sheetName);
    const maxVal = displayMode === "exam_only" ? 60 : 100;
    return Math.round((total / maxVal) * 100).toString() + "%";
  };

  const calculateStudentColTotal = (studentId: string, studentGrade: string, studentSection: string, subjectsList: string[], colId: string, term: string, sheetName: string) => {
    let tot = 0;
    subjectsList.forEach(sub => {
      if (colId === "total_m") {
        tot += getStudentRowTotal(studentId, studentGrade, studentSection, sub, term, sheetName);
      } else {
        tot += parseFloat(getStudentCellDisplayValue(studentId, studentGrade, studentSection, sub, colId, term, sheetName)) || 0;
      }
    });
    return tot;
  };

  const calculateStudentColAverage = (studentId: string, studentGrade: string, studentSection: string, subjectsList: string[], colId: string, term: string, sheetName: string) => {
    const total = calculateStudentColTotal(studentId, studentGrade, studentSection, subjectsList, colId, term, sheetName);
    if (subjectsList.length === 0) return "0";
    return (total / subjectsList.length).toFixed(1);
  };

  const hasGradesForMonth = (studentId: string, studentGrade: string, studentSection: string, term: string, sheetName: string) => {
    const studentSheetMatch = studentSheets.find(s => 
      s.studentId === studentId && 
      s.term === term && 
      s.sheetName === sheetName
    );
    if (studentSheetMatch && Object.keys(studentSheetMatch.cells || {}).length > 0) {
      return true;
    }

    const subjects = getSubjectsForStudent(studentGrade);
    for (const sub of subjects) {
      for (const field of ["w_k", "oral", "attend", "written"]) {
        const val = getStudentSynchronizedScore(studentId, studentGrade, studentSection, sub, field, term, sheetName);
        if (val !== null && val !== "") {
          return true;
        }
      }
    }
    return false;
  };

  // Dynamic filter lists
  const availableSchools = useMemo(() => {
    const list = isSuperAdmin ? data.availableSchools || [] : userSchools;
    if (list.length === 0) {
      const set = new Set<string>();
      (data.secretariatStudents || []).forEach((s: any) => s.school && set.add(s.school));
      return Array.from(set);
    }
    return list;
  }, [data.availableSchools, userSchools, data.secretariatStudents, isSuperAdmin]);

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    (data.secretariatStudents || []).forEach((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return;
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set);
  }, [data.secretariatStudents, selectedSchool]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    (data.secretariatStudents || []).forEach((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return;
      if (selectedBranch && s.branch !== selectedBranch) return;
      if (s.grade) set.add(s.grade);
    });
    return Array.from(set).sort();
  }, [data.secretariatStudents, selectedSchool, selectedBranch]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    (data.secretariatStudents || []).forEach((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return;
      if (selectedBranch && s.branch !== selectedBranch) return;
      if (selectedGrade && s.grade !== selectedGrade) return;
      if (s.section) set.add(s.section);
    });
    return Array.from(set).sort();
  }, [data.secretariatStudents, selectedSchool, selectedBranch, selectedGrade]);

  const filteredStudentsDirectory = useMemo(() => {
    return (data.secretariatStudents || []).filter((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return false;
      if (selectedBranch && s.branch !== selectedBranch) return false;
      if (selectedGrade && s.grade !== selectedGrade) return false;
      if (selectedSection && s.section !== selectedSection) return false;
      return true;
    });
  }, [data.secretariatStudents, selectedSchool, selectedBranch, selectedGrade, selectedSection]);

  const autocompleteSuggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    return filteredStudentsDirectory.filter((student: any) => {
      const alreadySelected = selectedStudents.some(s => s.id === student.id);
      return (student.name || "").toLowerCase().includes(searchInput.toLowerCase()) && !alreadySelected;
    }).slice(0, 15);
  }, [filteredStudentsDirectory, searchInput, selectedStudents]);

  const handleAddStudent = (student: any) => {
    setSelectedStudents([...selectedStudents, student]);
    setSearchInput("");
    setShowDropdown(false);
    setQueryTriggered(false);
  };

  const handleRemoveStudent = (id: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== id));
    setQueryTriggered(false);
  };

  const handleSelectAllStudents = () => {
    if (filteredStudentsDirectory.length === 0) {
      toast.warning("لا يوجد طلاب ضمن خيارات التصفية المحددة");
      return;
    }
    setSelectedStudents(filteredStudentsDirectory.slice(0, 50));
    if (filteredStudentsDirectory.length > 50) {
      toast.info("تم تحديد أول 50 طالباً لتجنب بطء الصفحة");
    }
    setQueryTriggered(false);
  };

  const handleClearStudents = () => {
    setSelectedStudents([]);
    setQueryTriggered(false);
  };

  const handleToggleReport = (reportId: string) => {
    if (selectedReports.includes(reportId)) {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    } else {
      setSelectedReports([...selectedReports, reportId]);
    }
  };

  // Compile datasets for selected students and filters
  const resultsData = useMemo(() => {
    if (!queryTriggered) return null;
    const studentNames = selectedStudents.map(s => s.name);
    const studentIds = selectedStudents.map(s => s.id);

    const matchStudent = (nameVal: string, idVal?: string, recordSchool?: string, recordGrade?: string, recordSection?: string) => {
      if (selectedStudents.length > 0) {
        return selectedStudents.some(s =>
          (idVal && String(s.id) === String(idVal)) ||
          (nameVal && normalizeArabicName(s.name) === normalizeArabicName(nameVal))
        );
      }

      const dirStudent = (data.secretariatStudents || []).find((s: any) =>
        (idVal && String(s.id) === String(idVal)) ||
        (nameVal && normalizeArabicName(s.name) === normalizeArabicName(nameVal))
      );
      
      const sSchool = dirStudent?.school || dirStudent?.schoolName || dirStudent?.schoolId || recordSchool || "";
      const sBranch = dirStudent?.branch || dirStudent?.branchName || "";
      const sGrade = dirStudent?.grade || dirStudent?.class || recordGrade || "";
      const sSection = dirStudent?.section || recordSection || "";

      if (selectedSchool && cleanName(sSchool) !== cleanName(selectedSchool)) return false;
      if (selectedBranch && cleanName(sBranch) !== cleanName(selectedBranch)) return false;
      if (selectedGrade && cleanName(sGrade) !== cleanName(selectedGrade)) return false;
      if (selectedSection && cleanName(sSection) !== cleanName(selectedSection)) return false;

      return true;
    };

    // 1. Student Reports (data.studentReports)
    const adminReports = (data.studentReports || []).filter((r: any) => {
      const matchName = selectedStudents.length === 0
        ? (!selectedSchool || r.school === selectedSchool) &&
        (!selectedBranch || r.branch === selectedBranch) &&
        (!selectedGrade || r.grade === selectedGrade) &&
        (!selectedSection || r.section === selectedSection)
        : matchStudent(r.name, r.id);
      const matchDate = matchesDateRange(r.createdAt, dateFrom, dateTo);
      return matchName && matchDate;
    });

    // 2. Teacher Evaluations (data.studentEvaluations)
    const rawTeacherEvaluations = (data.studentEvaluations || []).filter((e: any) => {
      const isSocial = e.evaluatorRole?.includes("اجتماعي") || e.evaluatorRole?.includes("اجتماعية") || e.evaluatorRole === "social_worker";
      const matchName = matchStudent(e.studentName, e.studentId, e.schoolId, e.grade, e.section);
      const matchDate = matchesDateRange(e.dateStr, dateFrom, dateTo);
      return !isSocial && matchName && matchDate;
    });

    const teacherEvaluations = rawTeacherEvaluations.flatMap((e: any) => {
      const subList = e.subjects
        ? e.subjects.split(/[,،]/).map((s: any) => s.trim()).filter(Boolean)
        : [];
      if (subList.length === 0) {
        return [{ ...e, displaySubject: "---" }];
      }
      return subList.map((sub: string) => ({
        ...e,
        displaySubject: sub
      }));
    });

    // 3. Notebooks & Assignments (data.notebookFollowUpLogs)
    const studentsToDisplay = selectedStudents.length > 0
      ? selectedStudents
      : filteredStudentsDirectory;

    const notebookLogs = (data.notebookFollowUpLogs || []).filter((log: any) => {
      const isStudentMatch = studentsToDisplay.some(s => String(s.id) === String(log.studentId));
      if (!isStudentMatch) return false;
      if (selectedSchool && cleanName(log.school) !== cleanName(selectedSchool)) return false;
      if (selectedBranch && cleanName(log.branch) !== cleanName(selectedBranch)) return false;
      const matchDate = matchesDateRange(log.date, dateFrom, dateTo);
      return matchDate;
    });

    const logsMap: Record<string, Record<string, any>> = {};
    notebookLogs.forEach((log: any) => {
      const sId = log.studentId;
      const sub = normalizeSubjectName(log.subject);
      if (!logsMap[sId]) logsMap[sId] = {};
      logsMap[sId][sub] = log;
    });

    const hasLogs = (stId: string) => {
      return notebookLogs.some((l: any) => String(l.studentId) === String(stId));
    };

    const studentsToInclude = selectedStudents.length > 0
      ? selectedStudents
      : filteredStudentsDirectory.filter((st: any) => hasLogs(st.id));

    const kg9Students = studentsToInclude.filter((s: any) => !["10", "11", "12"].includes(s.grade));
    const secondaryStudents = studentsToInclude.filter((s: any) => ["10", "11", "12"].includes(s.grade));

    const notebooksReports = {
      kg9Students,
      secondaryStudents,
      logsMap,
      totalLogsCount: notebookLogs.length
    };

    // 4. Case Study Reports (from caseStudyLogs standalone)
    const socialWorkerReports = caseStudyLogs.filter((log: any) => {
      const matchName = matchStudent(log.studentName, log.studentId, log.school, log.studentGrade, log.studentSection);
      const matchDate = matchesDateRange(log.timestamp?.split("T")[0], dateFrom, dateTo);
      if (selectedSchool && cleanName(log.school) !== cleanName(selectedSchool)) return false;
      return matchName && matchDate;
    });

    // 5. Commitments/Violations
    const studentViolations = (data.violations || []).filter((v: any) => {
      const isStudent = v.type === "students";
      const matchName = matchStudent(v.studentName, undefined, v.school || v.schoolId, v.grade || v.class, v.section);
      const matchDate = matchesDateRange(v.date, dateFrom, dateTo);
      return isStudent && matchName && matchDate;
    });

    // 6. Exams
    const TERMS_LIST = selectedTerms;
    const MONTHS_LIST = selectedMonths;
    
    const studentsToProcess = selectedStudents.length > 0
      ? selectedStudents
      : filteredStudentsDirectory;

    const examLogs: any[] = [];
    studentsToProcess.forEach((student: any) => {
      TERMS_LIST.forEach((term) => {
        MONTHS_LIST.forEach((sheetName) => {
          if (hasGradesForMonth(student.id, student.grade, student.section, term, sheetName)) {
            // Find timestamp if possible
            const studentSheetMatch = studentSheets.find(s => 
              s.studentId === student.id && 
              s.term === term && 
              s.sheetName === sheetName
            );
            const docTimestamp = studentSheetMatch?.timestamp || new Date().toISOString();
            const matchDate = matchesDateRange(docTimestamp, dateFrom, dateTo);
            
            if (matchDate) {
              examLogs.push({
                id: `${student.id}-${term}-${sheetName}`,
                studentId: student.id,
                studentName: student.name,
                grade: student.grade,
                section: student.section,
                school: student.school,
                branch: student.branch,
                term: term,
                sheetName: sheetName,
                date: docTimestamp.split("T")[0]
              });
            }
          }
        });
      });
    });

    return {
      adminReports,
      teacherEvaluations,
      notebooksReports,
      socialWorkerReports,
      studentViolations,
      examLogs
    };
  }, [queryTriggered, selectedStudents, data, selectedSchool, selectedBranch, selectedGrade, selectedSection, dateFrom, dateTo, caseStudyLogs, gradeSheets, studentSheets, displayMode, selectedTerms, selectedMonths]);

  // Excel Export Handler with Yemeni Theme
  const handleExportExcel = async () => {
    if (!resultsData) return;
    const profile = data.profile || {};
    const workbook = new ExcelJS.Workbook();
    let sheetsAdded = 0;

    // 1. Admin Reports Sheet
    if (selectedReports.includes("adminReports") && resultsData.adminReports.length > 0) {
      const headers = ["اسم الطالب", "الجنس", "الصف والشعبة", "العنوان", "ولي الأمر", "الهاتف", "مستوى القراءة", "مستوى الكتابة", "المشاركة والتفاعل", "مستوى السلوك", "سجل المتابعة الخاصة", "ملاحظات أخرى", "التاريخ"];
      const rows = resultsData.adminReports.map((r: any) => {
        const specialLog = [
          r.absenceSummary ? `غياب: ${r.absenceSummary}` : "",
          r.latenessSummary ? `تأخر: ${r.latenessSummary}` : "",
          r.exitSummary ? `خروج: ${r.exitSummary}` : "",
          r.violationSummary ? `مخالفات: ${r.violationSummary}` : "",
          r.damageSummary ? `إتلاف: ${r.damageSummary}` : ""
        ].filter(Boolean).join(" | ");

        return [
          r.name,
          r.gender || "---",
          `${r.grade} / ${r.section}`,
          r.address || "---",
          r.guardianName || "---",
          Array.isArray(r.guardianPhones) ? r.guardianPhones.join(" - ") : (r.guardianPhones || "---"),
          r.academicReading || "---",
          r.academicWriting || "---",
          r.academicParticipation || "---",
          r.behaviorLevel || "---",
          specialLog || "---",
          r.otherNotesText || r.notes || "---",
          r.createdAt?.split("T")[0]
        ];
      });
      addStyledSheet(workbook, "البيان الإداري", "تقارير المشرف الإداري للطلاب", headers, rows, "2563EB", profile, currentUser);
      sheetsAdded++;
    }

    // 2. Teacher Evaluations Sheet
    if (selectedReports.includes("teacherEval") && resultsData.teacherEvaluations.length > 0) {
      const headers = ["اسم الطالب", "المعلم المقيّم", "المادة", "الصف والشعبة", "الفصل الدراسي", "التحصيل والاستيعاب", "الدفاتر والواجبات", "المشاركة والتفاعل", "السلوك والمواظبة", "التميز", "الإجراء المتخذ", "التاريخ"];
      const rows = resultsData.teacherEvaluations.map((e: any) => [
        e.studentName,
        e.teacherName || "---",
        e.displaySubject || "---",
        `${e.grade} / ${e.section}`,
        e.semester || "---",
        `${e.criteria?.comprehension?.rating || ""} - ${e.criteria?.comprehension?.details || ""}`,
        `${e.criteria?.homework?.rating || ""} - ${e.criteria?.homework?.details || ""}`,
        `${e.criteria?.participation?.rating || ""} - ${e.criteria?.participation?.details || ""}`,
        `${e.criteria?.behavior?.rating || ""} - ${e.criteria?.behavior?.details || ""}`,
        `${e.criteria?.excellence?.rating || ""} - ${e.criteria?.excellence?.details || ""}`,
        e.criteria?.customAction?.text || "---",
        e.dateStr
      ]);
      addStyledSheet(workbook, "تقييمات المعلمين", "تقييمات الطالب (المعلم)", headers, rows, "4F46E5", profile, currentUser);
      sheetsAdded++;
    }

    // 3. Notebooks Sheet
    if (selectedReports.includes("notebooks") && resultsData.notebooksReports.totalLogsCount > 0) {
      const { kg9Students, secondaryStudents, logsMap } = resultsData.notebooksReports;
      
      const buildNotebookSheet = (sheetName: string, titleStr: string, studentsList: any[], subjectsList: string[]) => {
        const worksheet = workbook.addWorksheet(sheetName, {
          views: [{ rightToLeft: true }],
          pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 }
        });
        
        const totalCols = 2 + (subjectsList.length * 5) + 1;
        
        worksheet.getColumn(1).width = 6;
        worksheet.getColumn(2).width = 25;
        for (let c = 3; c < totalCols; c++) {
          worksheet.getColumn(c).width = 12;
        }
        worksheet.getColumn(totalCols).width = 25;
        
        worksheet.getCell(1, 1).value = "الجمهـورية اليمنية";
        worksheet.getCell(2, 1).value = profile?.ministry || "وزارة التربية والتعـليم والبحث العلمي";
        worksheet.getCell(3, 1).value = profile?.district || "مكتب التربية والتعليم بالأمانة";
        worksheet.getCell(4, 1).value = profile?.district?.includes("منطقة") ? profile.district : "مكتب التربية والتعليم بالمنطقة";
        worksheet.getCell(5, 1).value = profile?.schoolName || "اسم المدرسة";
        worksheet.getCell(6, 1).value = `فرع: ${profile?.branch || "الرئيسي"}`;
        
        for (let r = 1; r <= 6; r++) {
          const cell = worksheet.getCell(r, 1);
          cell.font = { name: "Arial", bold: true, size: 9 };
          cell.alignment = { horizontal: "right", vertical: "middle" };
        }
        
        const centerCol = Math.ceil(totalCols / 2);
        worksheet.mergeCells(5, centerCol - 2, 5, centerCol + 2);
        const titleCell = worksheet.getCell(5, centerCol - 2);
        titleCell.value = titleStr;
        titleCell.font = { name: "Arial", bold: true, size: 12, color: { argb: "FF0891B2" } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        
        if (profile?.logoImg) {
          try {
            const logoBase64 = profile.logoImg;
            const base64Data = logoBase64.includes(";base64,") ? logoBase64.split(";base64,")[1] : logoBase64;
            const extension = logoBase64.includes("image/png") ? "png" : "jpeg";
            const imageId = workbook.addImage({ base64: base64Data, extension: extension as any });
            worksheet.addImage(imageId, {
              tl: { col: centerCol - 1, row: 0 },
              ext: { width: 65, height: 65 }
            });
          } catch (err) {
            console.error("Failed to embed logo", err);
          }
        }
        
        worksheet.getCell(1, totalCols).value = `من تاريخ: ${dateFrom || "البداية"}`;
        worksheet.getCell(2, totalCols).value = `إلى تاريخ: ${dateTo || "النهاية"}`;
        
        for (let r = 1; r <= 2; r++) {
          const cell = worksheet.getCell(r, totalCols);
          cell.font = { name: "Arial", bold: true, size: 9 };
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
        
        worksheet.mergeCells(7, 1, 8, 1);
        const h1 = worksheet.getCell(7, 1);
        h1.value = "م";
        h1.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
        h1.alignment = { horizontal: "center", vertical: "middle" };
        h1.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        
        worksheet.mergeCells(7, 2, 8, 2);
        const h2 = worksheet.getCell(7, 2);
        h2.value = "بيانات الطالب";
        h2.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
        h2.alignment = { horizontal: "center", vertical: "middle" };
        h2.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        
        subjectsList.forEach((sub, idx) => {
          const colIndex = 3 + (idx * 5);
          worksheet.mergeCells(7, colIndex, 7, colIndex + 4);
          const cell = worksheet.getCell(7, colIndex);
          cell.value = sub;
          cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF0E7490" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F7FA" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          
          const subHeaders = ["النظافة والخط", "اكتمال الدروس", "تصويب الأخطاء", "تصحيح المعلم", "تاريخ التصحيح"];
          subHeaders.forEach((sh, shIdx) => {
            const shCell = worksheet.getCell(8, colIndex + shIdx);
            shCell.value = sh;
            shCell.font = { name: "Arial", bold: true, size: 9 };
            shCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
            shCell.alignment = { horizontal: "center", vertical: "middle" };
            shCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          });
        });
        
        worksheet.mergeCells(7, totalCols, 8, totalCols);
        const hNotes = worksheet.getCell(7, totalCols);
        hNotes.value = "ملاحظات مجمعة";
        hNotes.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        hNotes.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
        hNotes.alignment = { horizontal: "center", vertical: "middle" };
        hNotes.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        
        studentsList.forEach((st, idx) => {
          const rowNum = 9 + idx;
          worksheet.getRow(rowNum).height = 22;
          
          worksheet.getCell(rowNum, 1).value = idx + 1;
          worksheet.getCell(rowNum, 2).value = st.name;
          
          let notesAccumulated = "";
          subjectsList.forEach((sub, subIdx) => {
            const colIndex = 3 + (subIdx * 5);
            const normalized = normalizeSubjectName(sub);
            const log = logsMap[st.id]?.[normalized];
            
            worksheet.getCell(rowNum, colIndex).value = log?.cleanliness?.rating || "---";
            worksheet.getCell(rowNum, colIndex + 1).value = log?.completeness?.rating || "---";
            worksheet.getCell(rowNum, colIndex + 2).value = log?.spellingCorrection?.rating || "---";
            worksheet.getCell(rowNum, colIndex + 3).value = log?.teacherCorrection?.rating || "---";
            worksheet.getCell(rowNum, colIndex + 4).value = log?.correctionDate || "---";
            
            if (log && log.generalNotes?.trim()) {
              notesAccumulated += `[${sub}: ${log.generalNotes}] `;
            }
          });
          
          worksheet.getCell(rowNum, totalCols).value = notesAccumulated || "لا توجد ملاحظات";
          
          for (let col = 1; col <= totalCols; col++) {
            const cell = worksheet.getCell(rowNum, col);
            cell.font = { name: "Arial", size: 9 };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          }
          worksheet.getCell(rowNum, 2).alignment = { horizontal: "right", vertical: "middle" };
        });
      };
      
      if (kg9Students.length > 0) {
        buildNotebookSheet("متابعة الدفاتر أساسي", "سجل متابعة وتصحيح الدفاتر - الصفوف تمهيدي إلى 9", kg9Students, kg9TableSubjects);
        sheetsAdded++;
      }
      if (secondaryStudents.length > 0) {
        buildNotebookSheet("متابعة الدفاتر ثانوي", "سجل متابعة وتصحيح الدفاتر - الصفوف 10 إلى 12", secondaryStudents, secondaryTableSubjects);
        sheetsAdded++;
      }
    }

    // 4. Social Worker Sheet (Case Study Reports)
    if (selectedReports.includes("socialWorker") && resultsData.socialWorkerReports.length > 0) {
      const headers = ["تاريخ الإدخال", "اسم الطالب", "الصف", "الشعبة", "صفة المقيم", "المادة", "التقييمات والملاحظات", "ملاحظات إضافية", "المدخل"];
      const rows = resultsData.socialWorkerReports.map((log: any) => {
        const flat = log.formData || {};
        const evalTexts: string[] = [];
        Object.keys(flat).forEach((key) => {
          if (key.endsWith("_text")) {
            const mainKey = key.replace("_text", "");
            const label = ALL_FIELDS_MAP[mainKey] || mainKey;
            const rating = flat[mainKey + "_rating"];
            const text = flat[key];
            evalTexts.push(`${label}: ${rating ? `[${rating}] ` : ""}${text || "---"}`);
          }
        });
        return [
          log.timestamp ? new Date(log.timestamp).toLocaleDateString("ar-SA") : "---",
          log.studentName,
          log.studentGrade || "---",
          log.studentSection || "---",
          log.roleName,
          log.subject || "N/A",
          evalTexts.join(" | "),
          log.additionalDetails || "---",
          log.userName
        ];
      });
      addStyledSheet(workbook, "دراسات الحالة", "تقارير دراسة حالة الطالب التفصيلية", headers, rows, "7C3AED", profile, currentUser);
      sheetsAdded++;
    }

    // 5. Violations Sheet
    if (selectedReports.includes("violations") && resultsData.studentViolations.length > 0) {
      const headers = ["اسم الطالب", "الصف والشعبة", "اليوم والتاريخ", "بيان المخالفة", "المخالفات السابقة", "الإجراء المتخذ", "التزام الطالب وتوقيعه"];
      const rows = resultsData.studentViolations.map((v: any) => [
        v.studentName,
        `${v.grade || v.class} / ${v.section || "---"}`,
        `${v.date} (${v.day})`,
        v.violation,
        v.prevViolations || 0,
        v.procedure || "---",
        v.signature || "لم يتم التوقيع"
      ]);
      addStyledSheet(workbook, "التعهدات والمخالفات", "سجل تعهدات ومخالفات الطالب", headers, rows, "D97706", profile, currentUser);
      sheetsAdded++;
    }

    // 6. Exams Sheet
    if (selectedReports.includes("exams") && resultsData.examLogs.length > 0) {
      const worksheet = workbook.addWorksheet("نتائج الطلاب", {
        views: [{ rightToLeft: true }],
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 }
      });

      worksheet.getColumn(1).width = 8;  // م
      worksheet.getColumn(2).width = 25; // المادة / البيان
      worksheet.getColumn(3).width = 15; // واجب (20)
      worksheet.getColumn(4).width = 15; // شفوي (10)
      worksheet.getColumn(5).width = 15; // مواظبة (10)
      worksheet.getColumn(6).width = 15; // تحريري (60)
      worksheet.getColumn(7).width = 15; // المجموع
      worksheet.getColumn(8).width = 15; // النسبة

      let currentRow = 1;

      resultsData.examLogs.forEach((ex: any, exIdx: number) => {
        if (exIdx > 0) {
          currentRow += 2;
        }

        // Student header row
        worksheet.mergeCells(currentRow, 1, currentRow, 8);
        const headerCell = worksheet.getCell(currentRow, 1);
        headerCell.value = `كشف درجات الطالب: ${ex.studentName} | الصف: ${ex.grade} | الشعبة: ${ex.section} | الفصل: ${ex.term} | الشهر: ${ex.sheetName}`;
        headerCell.font = { name: "Arial", bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        headerCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE11D48" }
        };
        headerCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRow).height = 25;
        currentRow++;

        // Subtitle row
        worksheet.mergeCells(currentRow, 1, currentRow, 8);
        const subCell = worksheet.getCell(currentRow, 1);
        subCell.value = `المدرسة: ${ex.school || profile.schoolName || "---"} | الفرع: ${ex.branch || profile.branch || "الرئيسي"} | التاريخ: ${ex.date}`;
        subCell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF374151" } };
        subCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" }
        };
        subCell.alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getRow(currentRow).height = 20;
        currentRow++;

        // Headers
        const tableHeaders = ["م", "المادة", "الواجب (20)", "شفوي (10)", "مواظبة (10)", "تحريري (60)", `المجموع (${displayMode === "exam_only" ? "60" : "100"})`, "النسبة"];
        const headerRowObj = worksheet.getRow(currentRow);
        headerRowObj.values = tableHeaders;
        headerRowObj.height = 25;
        headerRowObj.eachCell((cell) => {
          cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF374151" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE5E7EB" }
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
          };
        });
        currentRow++;

        // Subjects list
        const subjects = getSubjectsForStudent(ex.grade);

        subjects.forEach((sub, subIdx) => {
          const serialNum = (ex.grade === "11" || ex.grade === "12") ? (subIdx + 13) : (subIdx + 1);
          const wk = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "w_k", ex.term, ex.sheetName);
          const oral = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "oral", ex.term, ex.sheetName);
          const attend = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "attend", ex.term, ex.sheetName);
          const written = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "written", ex.term, ex.sheetName);
          const totalVal = getStudentRowTotal(ex.studentId, ex.grade, ex.section, sub, ex.term, ex.sheetName);
          const ratioVal = getStudentRowPercentage(ex.studentId, ex.grade, ex.section, sub, ex.term, ex.sheetName);

          const rowData = [
            serialNum,
            sub,
            displayMode === "exam_only" ? "" : (wk || ""),
            displayMode === "exam_only" ? "" : (oral || ""),
            displayMode === "exam_only" ? "" : (attend || ""),
            written || "",
            totalVal > 0 ? totalVal : "",
            totalVal > 0 ? ratioVal : ""
          ];

          const dataRowObj = worksheet.addRow(rowData);
          dataRowObj.height = 20;
          dataRowObj.eachCell((cell, colNum) => {
            cell.font = { name: "Arial", size: 10, bold: colNum === 2 || colNum === 7 || colNum === 8 };
            cell.alignment = { horizontal: colNum === 2 ? "right" : "center", vertical: "middle" };
            cell.border = {
              top: { style: "thin", color: { argb: "FFD1D5DB" } },
              bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
              left: { style: "thin", color: { argb: "FFD1D5DB" } },
              right: { style: "thin", color: { argb: "FFD1D5DB" } }
            };
            if (colNum === 7) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
            }
            if (colNum === 8) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
              cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0369A1" } };
            }
          });
          currentRow++;
        });

        // Add total row
        const totWk = calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "w_k", ex.term, ex.sheetName);
        const totOral = calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "oral", ex.term, ex.sheetName);
        const totAttend = calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "attend", ex.term, ex.sheetName);
        const totWritten = calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "written", ex.term, ex.sheetName);
        const totTotal = calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "total_m", ex.term, ex.sheetName);
        
        const avgTotal = parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "total_m", ex.term, ex.sheetName)) || 0;
        const maxPossibleTotal = displayMode === "exam_only" ? 60 : 100;
        const avgPercentage = Math.round((avgTotal / maxPossibleTotal) * 100);

        const totalRowData = [
          "",
          "الإجمالي / النسبة",
          displayMode === "exam_only" ? "" : totWk,
          displayMode === "exam_only" ? "" : totOral,
          displayMode === "exam_only" ? "" : totAttend,
          totWritten,
          totTotal,
          `%${avgPercentage}`
        ];

        const totalRowObj = worksheet.addRow(totalRowData);
        totalRowObj.height = 22;
        totalRowObj.eachCell((cell, colNum) => {
          cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF1E3A8A" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" }
          };
          cell.alignment = { horizontal: colNum === 2 ? "right" : "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FF9CA3AF" } },
            bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
            left: { style: "thin", color: { argb: "FF9CA3AF" } },
            right: { style: "thin", color: { argb: "FF9CA3AF" } }
          };
        });
        currentRow++;
      });

      sheetsAdded++;
    }

    if (sheetsAdded === 0) {
      toast.error("لا توجد بيانات مطابقة لتصديرها إكسل");
      return;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Student_Comprehensive_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير ملف الإكسل الشامل بنجاح");
  };

  // WhatsApp Exporter with Visual Emojis
  const handleExportWhatsApp = () => {
    if (!resultsData) return;
    let msg = `*🔵 تقارير الطلاب المجمعة المخصصة 🔵*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;

    if (selectedReports.includes("adminReports") && resultsData.adminReports.length > 0) {
      msg += `*📁 [سجل الإشراف الإداري للطلاب] 📁*\n`;
      resultsData.adminReports.forEach((r: any, idx: number) => {
        msg += `👤 *${idx + 1}. الطالب:* ${r.name}\n`;
        msg += `🏫 *الصف والشعبة:* ${r.grade} / ${r.section}\n`;
        msg += `🏠 *العنوان:* ${r.address || "---"}\n`;
        msg += `👨‍👩‍👦 *ولي الأمر:* ${r.guardianName || "---"} (📞 ${Array.isArray(r.guardianPhones) ? r.guardianPhones.join(", ") : r.guardianPhones})\n`;
        msg += `📖 *القراءة:* ${r.academicReading || "---"} | ✍️ *الكتابة:* ${r.academicWriting || "---"} | 💬 *المشاركة:* ${r.academicParticipation || "---"}\n`;
        msg += `🚦 *مستوى السلوك:* ${r.behaviorLevel || "---"}\n`;

        const specSummary = [
          r.absenceSummary ? `غياب: ${r.absenceSummary}` : "",
          r.latenessSummary ? `تأخر: ${r.latenessSummary}` : "",
          r.exitSummary ? `خروج: ${r.exitSummary}` : "",
          r.violationSummary ? `مخالفات: ${r.violationSummary}` : "",
          r.damageSummary ? `إتلاف: ${r.damageSummary}` : ""
        ].filter(Boolean).join(" | ");

        if (specSummary) msg += `📊 *المتابعة الخاصة:* ${specSummary}\n`;
        if (r.otherNotesText || r.notes) msg += `📝 *ملاحظات أخرى:* ${r.otherNotesText || r.notes}\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    if (selectedReports.includes("teacherEval") && resultsData.teacherEvaluations.length > 0) {
      msg += `*📁 [تقييمات المعلمين للطلاب] 📁*\n`;
      resultsData.teacherEvaluations.forEach((e: any, idx: number) => {
        msg += `👤 *${idx + 1}. الطالب:* ${e.studentName}\n`;
        msg += `🧑‍🏫 *المعلم المقيّم:* ${e.teacherName || "---"}\n`;
        msg += `🏫 *المادة والصف:* ${e.displaySubject || "---"} (${e.grade}/${e.section})\n`;
        msg += `🧠 *التحصيل:* ${e.criteria?.comprehension?.rating || "---"}\n`;
        msg += `📚 *الدفاتر:* ${e.criteria?.homework?.rating || "---"}\n`;
        msg += `🙋 *المشاركة الصفية:* ${e.criteria?.participation?.rating || "---"}\n`;
        msg += `🚦 *السلوك الصفي:* ${e.criteria?.behavior?.rating || "---"}\n`;
        if (e.criteria?.excellence?.rating) msg += `🏆 *التميز:* ${e.criteria.excellence.rating}\n`;
        if (e.criteria?.customAction?.text) msg += `📌 *الإجراء المتخذ:* ${e.criteria.customAction.text}\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    if (selectedReports.includes("violations") && resultsData.studentViolations.length > 0) {
      msg += `*📁 [سجل التعهدات والمخالفات] 📁*\n`;
      resultsData.studentViolations.forEach((v: any, idx: number) => {
        msg += `👤 *${idx + 1}. الطالب:* ${v.studentName}\n`;
        msg += `🏫 *الصف والشعبة:* ${v.grade || v.class} / ${v.section}\n`;
        msg += `⚠️ *المخالفة:* ${v.violation}\n`;
        msg += `🛡️ *الإجراء:* ${v.procedure || "---"}\n`;
        msg += `✍️ *التوقيع:* _${v.signature || "لم يوقع"}_\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    if (selectedReports.includes("exams") && resultsData.examLogs.length > 0) {
      msg += `*📁 [سجل نتائج الدرجات والاختبارات التفصيلية للطلاب] 📁*\n`;
      resultsData.examLogs.forEach((ex: any, idx: number) => {
        msg += `👤 *${idx + 1}. الطالب:* ${ex.studentName}\n`;
        msg += `🏫 *الصف والشعبة:* ${ex.grade} / ${ex.section}\n`;
        msg += `🗓️ *الفصل والكشف:* ${ex.term} - ${ex.sheetName}\n`;
        msg += `----------------------------------\n`;
        
        const subjects = getSubjectsForStudent(ex.grade);
        subjects.forEach((sub) => {
          const wk = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "w_k", ex.term, ex.sheetName);
          const oral = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "oral", ex.term, ex.sheetName);
          const attend = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "attend", ex.term, ex.sheetName);
          const written = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, "written", ex.term, ex.sheetName);
          const totalVal = getStudentRowTotal(ex.studentId, ex.grade, ex.section, sub, ex.term, ex.sheetName);
          const ratioVal = getStudentRowPercentage(ex.studentId, ex.grade, ex.section, sub, ex.term, ex.sheetName);

          if (displayMode === "exam_only") {
            msg += `  🔹 *${sub}:* تحريري: ${written || "---"} | المجموع: ${totalVal} (${ratioVal})\n`;
          } else {
            msg += `  🔹 *${sub}:* واجب: ${wk || "0"} | شفوي: ${oral || "0"} | مواظبة: ${attend || "0"} | تحريري: ${written || "0"} | المجموع: *${totalVal}* (${ratioVal})\n`;
          }
        });

        const avgTotal = parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "total_m", ex.term, ex.sheetName)) || 0;
        const maxPossibleTotal = displayMode === "exam_only" ? 60 : 100;
        const avgPercentage = Math.round((avgTotal / maxPossibleTotal) * 100);
        const totTotal = calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "total_m", ex.term, ex.sheetName);

        msg += `📊 *المجموع الإجمالي للدرجات:* *${totTotal}* (بنسبة *%${avgPercentage}*)\n`;
        msg += `----------------------------------\n\n`;
      });
    }

    msg += `✍️ *إعداد التقرير:* ${currentUser?.name || "..."}\n`;
    msg += `🧑‍💼 *مدير الفرع:* ${data.profile?.branchManager || "..."}\n`;

    msg += `\n${getReportMessageFooter()}`;
    shareViaWhatsApp(msg);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600"
            title="رجوع"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              تقارير الطلاب الشاملة
            </h2>
            <p className="text-xs text-slate-500 font-bold">البحث والفلترة المجمعة لتقارير الطلاب</p>
          </div>
        </div>
        <div className="flex gap-2">
          {queryTriggered && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors print:hidden"
            >
              <Printer size={16} />
              طباعة التقرير
            </button>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 print:hidden">
        {/* Dynamic Class/Directory Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">المدرسة</label>
            <select
              value={selectedSchool}
              onChange={(e) => {
                setSelectedSchool(e.target.value);
                setSelectedBranch("");
                setSelectedGrade("");
                setSelectedSection("");
                setSelectedStudents([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع المدارس</option>
              {availableSchools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">الفرع</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedGrade("");
                setSelectedSection("");
                setSelectedStudents([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع الفروع</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">الصف</label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedSection("");
                setSelectedStudents([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع الصفوف</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">الشعبة</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedStudents([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع الشعب</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Name Search and Autocomplete */}
        <div className="relative space-y-3">
          <label className="text-xs font-bold text-slate-600 block">البحث عن الطلاب واختيارهم</label>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="اكتب اسم الطالب للبحث والاختيار..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11 text-right"
            />
            <Search className="absolute right-3.5 top-3.5 text-slate-400" size={16} />
            
            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showDropdown && (searchInput.trim() || autocompleteSuggestions.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-50"
                >
                  {autocompleteSuggestions.length > 0 ? (
                    autocompleteSuggestions.map((student: any) => (
                      <button
                        key={student.id}
                        onClick={() => handleAddStudent(student)}
                        className="w-full text-right px-4 py-3 hover:bg-blue-50 transition-colors text-sm font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>{student.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
                          {student.school} - {student.grade}/{student.section}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs font-semibold">
                      {searchInput.trim() ? "لا توجد نتائج مطابقة للبحث" : "اكتب اسم الطالب لعرض المقترحات"}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllStudents}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors whitespace-nowrap h-11"
            >
              تحديد الكل المصفى
            </button>
            <button
              onClick={handleClearStudents}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors whitespace-nowrap h-11"
            >
              إلغاء التحديد
            </button>
          </div>

          {/* Click outside to close helper */}
          {showDropdown && (
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          )}

          {/* Selected Chips */}
          {selectedStudents.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              {selectedStudents.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm"
                >
                  {s.name}
                  <button
                    onClick={() => handleRemoveStudent(s.id)}
                    className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter & Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">من تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setQueryTriggered(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">إلى تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setQueryTriggered(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-xs font-bold text-slate-600 block mb-2">نوع التقارير المطلوبة</label>
            <button
              onClick={() => setShowReportDropdown(!showReportDropdown)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none bg-slate-50 text-sm h-11 flex items-center justify-between text-slate-700 font-semibold text-right"
            >
              <span>المختارة ({selectedReports.length})</span>
              <ChevronDown size={16} />
            </button>

            <AnimatePresence>
              {showReportDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowReportDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 space-y-2.5"
                  >
                    {reportOptions.map((opt) => {
                      const active = selectedReports.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-right"
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => handleToggleReport(opt.id)}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer focus:ring-0"
                          />
                          <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                        </label>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* View Trigger and Export Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (selectedStudents.length === 0 && !selectedSchool && !selectedBranch && !selectedGrade && !selectedSection) {
                toast.error("يرجى تحديد طالب واحد على الأقل، أو تصفية مجموعة طلاب بالصف/الشعبة");
                return;
              }
              setQueryTriggered(true);
            }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5 text-sm"
          >
            🔍 عرض التقارير المجمعة
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!queryTriggered}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border shadow-sm ${queryTriggered
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer"
              : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
          >
            <FileSpreadsheet size={18} />
            تصدير إكسل الشامل
          </button>

          <button
            onClick={handleExportWhatsApp}
            disabled={!queryTriggered}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border shadow-sm ${queryTriggered
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
              : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
          >
            <MessageCircle size={18} />
            إرسال عبر واتساب
          </button>
        </div>
      </div>

      {/* Results Tables */}
      {queryTriggered && resultsData && (
        <div className="space-y-10">

          {/* Table 1: Administrative Supervisor Reports */}
          {selectedReports.includes("adminReports") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardList size={22} />
                  تقارير المشرف الإداري للطلاب
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.adminReports.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم الطالب</th>
                      <th className="p-4 font-bold text-sm">الجنس</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة</th>
                      <th className="p-4 font-bold text-sm">العنوان</th>
                      <th className="p-4 font-bold text-sm">اسم ولي الأمر وهاتفه</th>
                      <th className="p-4 font-bold text-sm">الصعوبات التعليمية (قراءة/كتابة)</th>
                      <th className="p-4 font-bold text-sm">المشاركة والتفاعل</th>
                      <th className="p-4 font-bold text-sm">السلوك</th>
                      <th className="p-4 font-bold text-sm">سجل المتابعة الخاصة</th>
                      <th className="p-4 font-bold text-sm">ملاحظات أخرى</th>
                      <th className="p-4 font-bold text-sm">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.adminReports.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{r.name}</td>
                        <td className="p-4 text-sm text-slate-600">{r.gender || "---"}</td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{r.grade} / {r.section}</td>
                        <td className="p-4 text-sm text-slate-600">{r.address || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>{r.guardianName || "---"}</div>
                          <div className="text-xs text-slate-400">{Array.isArray(r.guardianPhones) ? r.guardianPhones.join(" - ") : r.guardianPhones}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>قرائياً: {r.academicReading || "---"}</div>
                          <div>كتابياً: {r.academicWriting || "---"}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{r.academicParticipation || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${r.behaviorLevel === "ممتاز" || r.behaviorLevel === "جيد جداً" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            }`}>
                            {r.behaviorLevel || "---"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-600 whitespace-normal min-w-[150px]">
                          <div className="space-y-1">
                            {r.absenceSummary && <div>⚠️ غياب: {r.absenceSummary}</div>}
                            {r.latenessSummary && <div>🕒 تأخر: {r.latenessSummary}</div>}
                            {r.exitSummary && <div>🚪 خروج: {r.exitSummary}</div>}
                            {r.violationSummary && <div>🚫 مخالفات: {r.violationSummary}</div>}
                            {r.damageSummary && <div>💥 إتلاف: {r.damageSummary}</div>}
                            {!r.absenceSummary && !r.latenessSummary && !r.exitSummary && !r.violationSummary && !r.damageSummary && "---"}
                          </div>
                        </td>
                        <td className="p-4 text-sm whitespace-normal min-w-[150px] text-slate-600">
                          {r.otherNotesText || r.notes || "---"}
                        </td>
                        <td className="p-4 text-sm text-slate-500">{r.createdAt?.split("T")[0]}</td>
                      </tr>
                    ))}
                    {resultsData.adminReports.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد تقارير مشرف إداري مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 2: Teacher Evaluation View */}
          {selectedReports.includes("teacherEval") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <BookOpen size={22} />
                  تقييمات الطالب (المعلم)
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.teacherEvaluations.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم الطالب</th>
                      <th className="p-4 font-bold text-sm">المعلم المقيّم</th>
                      <th className="p-4 font-bold text-sm">المادة</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة</th>
                      <th className="p-4 font-bold text-sm">الفصل الدراسي</th>
                      <th className="p-4 font-bold text-sm">التحصيل والاستيعاب</th>
                      <th className="p-4 font-bold text-sm">الدفاتر والواجبات</th>
                      <th className="p-4 font-bold text-sm">المشاركة والتفاعل</th>
                      <th className="p-4 font-bold text-sm">السلوك والمواظبة</th>
                      <th className="p-4 font-bold text-sm">التميز</th>
                      <th className="p-4 font-bold text-sm">الإجراء المتخذ</th>
                      <th className="p-4 font-bold text-sm">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.teacherEvaluations.map((e: any, index: number) => (
                      <tr key={`${e.id}-${e.displaySubject}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{e.studentName}</td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{e.teacherName || "---"}</td>
                        <td className="p-4 text-sm font-bold text-indigo-600">{e.displaySubject || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">{e.grade} / {e.section}</td>
                        <td className="p-4 text-sm text-slate-600">{e.semester || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>التقييم: {e.criteria?.comprehension?.rating || "---"}</div>
                          <div className="text-xs text-slate-400">{e.criteria?.comprehension?.details}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>التقييم: {e.criteria?.homework?.rating || "---"}</div>
                          <div className="text-xs text-slate-400">{e.criteria?.homework?.details}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>التقييم: {e.criteria?.calligraphy?.rating || e.criteria?.participation?.rating || "---"}</div>
                          <div className="text-xs text-slate-400">{e.criteria?.calligraphy?.details || e.criteria?.participation?.details}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>التقييم: {e.criteria?.behavior?.rating || "---"}</div>
                          <div className="text-xs text-slate-400">{e.criteria?.behavior?.details}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>التقييم: {e.criteria?.excellence?.rating || "---"}</div>
                          <div className="text-xs text-slate-400">{e.criteria?.excellence?.details}</div>
                        </td>
                        <td className="p-4 text-sm whitespace-normal min-w-[150px] text-slate-600">{e.criteria?.customAction?.text || "---"}</td>
                        <td className="p-4 text-sm text-slate-500">{e.dateStr}</td>
                      </tr>
                    ))}
                    {resultsData.teacherEvaluations.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد تقييمات معلمين مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 3: Notebooks & Assignments Reports */}
          {selectedReports.includes("notebooks") && (() => {
            const { kg9Students, secondaryStudents, logsMap, totalLogsCount } = resultsData.notebooksReports;
            
            const renderTableMarkup = (titleStr: string, studentsList: any[], subjectsList: string[]) => {
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden space-y-2 pb-4">
                  <div className="bg-cyan-600 text-white px-6 py-4 flex items-center justify-between">
                    <h4 className="font-black text-md flex items-center gap-2">
                      <FileText size={18} />
                      {titleStr}
                    </h4>
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                      {studentsList.length} طالب
                    </span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse" style={{ minWidth: "1200px" }}>
                      <thead>
                        {/* First Row: Subjects */}
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-xs">
                          <th className="p-3 border-l border-slate-200 text-center w-12" rowSpan={2}>م</th>
                          <th className="p-3 border-l border-slate-200 text-center w-52" rowSpan={2}>اسم الطالب</th>
                          {subjectsList.map((sub, idx) => (
                            <th
                              key={idx}
                              colSpan={5}
                              className="p-3 border-l border-slate-200 text-center bg-cyan-50/50 text-cyan-900 border-b border-cyan-100 font-black"
                            >
                              {sub}
                            </th>
                          ))}
                          <th className="p-3 text-center" rowSpan={2}>ملاحظات مجمعة</th>
                        </tr>
                        {/* Second Row: Subheaders */}
                        <tr className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-200">
                          {subjectsList.map((sub) => (
                            <React.Fragment key={sub}>
                              <th className="p-2 border-l border-slate-200 text-center">النظافة والخط</th>
                              <th className="p-2 border-l border-slate-200 text-center">اكتمال الدروس</th>
                              <th className="p-2 border-l border-slate-200 text-center">تصويب الأخطاء</th>
                              <th className="p-2 border-l border-slate-200 text-center">تصحيح المعلم</th>
                              <th className="p-2 border-l border-slate-200 text-center w-24">آخر تصحيح</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                        {studentsList.map((st, idx) => {
                          let notesAccumulated = "";
                          return (
                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 border-l border-slate-100 text-center w-12">{idx + 1}</td>
                              <td className="p-3 border-l border-slate-100 font-black text-slate-800 w-52">{st.name}</td>
                              {subjectsList.map((sub) => {
                                const normalized = normalizeSubjectName(sub);
                                const log = logsMap[st.id]?.[normalized];
                                if (log && log.generalNotes?.trim()) {
                                  notesAccumulated += `[${sub}: ${log.generalNotes}] `;
                                }
                                return (
                                  <React.Fragment key={sub}>
                                    <td className="p-2 border-l border-slate-100 text-center">{log?.cleanliness?.rating || "---"}</td>
                                    <td className="p-2 border-l border-slate-100 text-center">{log?.completeness?.rating || "---"}</td>
                                    <td className="p-2 border-l border-slate-100 text-center">{log?.spellingCorrection?.rating || "---"}</td>
                                    <td className="p-2 border-l border-slate-100 text-center">{log?.teacherCorrection?.rating || "---"}</td>
                                    <td className="p-2 border-l border-slate-100 text-center text-[10px] w-24 text-slate-500">{log?.correctionDate || "---"}</td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="p-3 text-slate-400 font-medium text-[10px] text-right truncate max-w-[200px]" title={notesAccumulated}>
                                {notesAccumulated || "لا توجد ملاحظات"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-6">
                <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between rounded-2xl">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <FileText size={22} />
                    سجل متابعة الدفاتر للفصل الدراسي (مفصل ومطابق للتقارير الخاصة)
                  </h3>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                    إجمالي السجلات: {totalLogsCount}
                  </span>
                </div>
                {kg9Students.length > 0 && renderTableMarkup("سجل متابعة الدفاتر - صفوف التعليم الأساسي والتمهيدي (تمهيدي - 9)", kg9Students, kg9TableSubjects)}
                {secondaryStudents.length > 0 && renderTableMarkup("سجل متابعة الدفاتر - صفوف التعليم الثانوي (10 - 12)", secondaryStudents, secondaryTableSubjects)}
                {totalLogsCount === 0 && (
                  <div className="bg-white p-8 text-center text-slate-400 font-semibold text-sm rounded-2xl border border-slate-100">
                    لا توجد سجلات متابعة دفاتر مطابقة للبحث
                  </div>
                )}
              </div>
            );
          })()}

          {/* Table 4: Social Worker Reports (Case Study Reports) */}
          {selectedReports.includes("socialWorker") && (
            <div className="space-y-6">
              <div className="bg-violet-600 text-white px-6 py-4 flex items-center justify-between rounded-2xl">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <UserCheck size={22} />
                  سجل تقارير دراسة حالة الطالب التفصيلية (من كل المقيمين)
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.socialWorkerReports.length} دراسة حالة
                </span>
              </div>

              <div className="space-y-6">
                {resultsData.socialWorkerReports.map((log: any) => {
                  const flat = log.formData || {};
                  const fieldsKeys = Array.from(new Set(
                    Object.keys(flat).map(k => k.replace("_rating", "").replace("_text", ""))
                  ));

                  return (
                    <div key={log.id || log.timestamp} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                      {/* Header Info */}
                      <div className="flex flex-wrap justify-between items-center bg-slate-50 border border-slate-200/60 p-4 rounded-2xl gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 bg-violet-600 rounded-full"></span>
                          <span className="font-black text-slate-800 text-base">{log.studentName}</span>
                          <span className="text-xs bg-slate-200/60 px-2.5 py-1 rounded-lg font-bold text-slate-600">
                            الصف: {log.studentGrade || "---"} | الشعبة: {log.studentSection || "---"}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">
                          <span>المقيم: </span>
                          <span className="text-violet-600 font-extrabold bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">{log.roleName} {log.subject ? `(${log.subject})` : ""}</span>
                          <span className="mx-2">|</span>
                          <span>المدخل: {log.userName}</span>
                          <span className="mx-2">|</span>
                          <span>التاريخ: {log.timestamp ? new Date(log.timestamp).toLocaleDateString("ar-SA") : "---"}</span>
                        </div>
                      </div>

                      {/* Horizontal Table for evaluations */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse border border-slate-200 bg-white rounded-2xl overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-bold">
                              <th className="p-3 border-l border-slate-200 w-1/4">العنصر / المجال</th>
                              <th className="p-3 border-l border-slate-200 w-1/4">التقييم</th>
                              <th className="p-3">الملاحظات والتفاصيل</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {fieldsKeys.map((key) => {
                              const label = ALL_FIELDS_MAP[key] || key;
                              const rating = flat[key + "_rating"];
                              const text = flat[key + "_text"];
                              return (
                                <tr key={key} className="hover:bg-slate-50/50">
                                  <td className="p-3 border-l border-slate-200 font-bold text-slate-800">{label}</td>
                                  <td className="p-3 border-l border-slate-200">
                                    {rating ? (
                                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                                        rating.includes("ممتاز") || rating.includes("آمن") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                        rating.includes("جيد جداً") || rating.includes("جيد جدا") ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                        rating.includes("جيد") || rating.includes("متابعة") ? "bg-teal-50 text-teal-700 border border-teal-100" :
                                        rating.includes("ضعيف") || rating.includes("حرج") ? "bg-orange-50 text-orange-700 border border-orange-100" :
                                        "bg-red-50 text-red-700 border border-red-100"
                                      }`}>
                                        {rating}
                                      </span>
                                    ) : "---"}
                                  </td>
                                  <td className="p-3 whitespace-normal text-slate-600 font-medium leading-relaxed">{text || "---"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {log.additionalDetails && (
                        <div className="bg-amber-50/40 border border-amber-100/50 rounded-2xl p-4 text-xs font-medium text-slate-700">
                          <span className="font-black text-amber-800 block mb-1">ملاحظات إضافية:</span>
                          <p className="whitespace-normal leading-relaxed">{log.additionalDetails}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {resultsData.socialWorkerReports.length === 0 && (
                  <div className="bg-white p-8 text-center text-slate-400 font-semibold text-sm rounded-2xl border border-slate-100">
                    لا توجد تقارير دراسة حالة مسجلة للطلاب المحددين مطابقة للبحث
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table 5: Commitments & Violations */}
          {selectedReports.includes("violations") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <AlertCircle size={22} />
                  سجل تعهدات ومخالفات الطالب
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.studentViolations.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم الطالب</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة</th>
                      <th className="p-4 font-bold text-sm">اليوم والتاريخ</th>
                      <th className="p-4 font-bold text-sm">بيان المخالفة</th>
                      <th className="p-4 font-bold text-sm">المخالفات السابقة</th>
                      <th className="p-4 font-bold text-sm">الإجراء المتخذ</th>
                      <th className="p-4 font-bold text-sm">التزام الطالب وتوقيعه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.studentViolations.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{v.studentName}</td>
                        <td className="p-4 text-sm text-slate-600">{v.grade || v.class} / {v.section || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div className="font-semibold">{v.date}</div>
                          <div className="text-xs text-slate-400">{v.day}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-700 whitespace-normal min-w-[200px]">{v.violation}</td>
                        <td className="p-4 text-sm text-center font-bold text-slate-600">{v.prevViolations || 0}</td>
                        <td className="p-4 text-sm text-rose-600 font-semibold whitespace-normal min-w-[150px]">{v.procedure || "---"}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[250px] text-slate-500 italic bg-amber-50/20">{v.signature || "لم يتم التوقيع"}</td>
                      </tr>
                    ))}
                    {resultsData.studentViolations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد تعهدات أو مخالفات مسجلة على الطلاب المحددين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 6: Exams Grades */}
          {selectedReports.includes("exams") && (
            <div className="space-y-6">
              <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between rounded-2xl">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <FileSpreadsheet size={22} />
                  كشف درجات ونتائج الاختبارات التفصيلية للطلاب
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.examLogs.length} كشف
                </span>
              </div>

              {/* Display Mode Selection */}
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 print:hidden">
                {/* Mode Buttons */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setDisplayMode("total")}
                    className={`px-6 py-2 rounded-lg font-bold text-xs transition-all duration-200 ${
                      displayMode === "total"
                        ? "bg-white text-rose-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    مجموع الدرجات
                  </button>
                  <button
                    onClick={() => setDisplayMode("exam_only")}
                    className={`px-6 py-2 rounded-lg font-bold text-xs transition-all duration-200 ${
                      displayMode === "exam_only"
                        ? "bg-white text-rose-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    درجة الاختبار فقط
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                {/* Term Buttons */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                  {["الفصل الأول", "الفصل الثاني"].map((term) => {
                    const isSelected = selectedTerms.includes(term);
                    return (
                      <button
                        key={term}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedTerms.length > 1) {
                              setSelectedTerms(selectedTerms.filter(t => t !== term));
                            }
                          } else {
                            setSelectedTerms([...selectedTerms, term]);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-200 ${
                          isSelected
                            ? "bg-rose-600 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {term}
                      </button>
                    );
                  })}
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                {/* Month Buttons */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                  {["الشهر الأول", "الشهر الثاني", "الشهر الثالث"].map((month) => {
                    const isSelected = selectedMonths.includes(month);
                    return (
                      <button
                        key={month}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedMonths.length > 1) {
                              setSelectedMonths(selectedMonths.filter(m => m !== month));
                            }
                          } else {
                            setSelectedMonths([...selectedMonths, month]);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>

              {resultsData.examLogs.length > 0 ? (
                resultsData.examLogs.map((ex: any) => {
                  const subjects = getSubjectsForStudent(ex.grade);
                  return (
                    <div key={ex.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                      {/* Header Info */}
                      <div className="flex flex-wrap justify-between items-center bg-slate-50 border border-slate-200/60 p-4 rounded-2xl gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 bg-rose-600 rounded-full"></span>
                          <span className="font-black text-slate-800 text-base">{ex.studentName}</span>
                          <span className="text-xs bg-slate-200/60 px-2.5 py-1 rounded-lg font-bold text-slate-600">
                            الصف: {ex.grade} | الشعبة: {ex.section}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">
                          <span>الفصل: </span>
                          <span className="text-rose-600 font-extrabold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">{ex.term}</span>
                          <span className="mx-2">|</span>
                          <span>الكشف: </span>
                          <span className="text-blue-600 font-extrabold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">{ex.sheetName}</span>
                          {ex.school && (
                            <>
                              <span className="mx-2">|</span>
                              <span>المدرسة: {ex.school}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Grades Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                              <th className="border border-slate-200 p-3 w-16">م</th>
                              <th className="border border-slate-200 p-3 text-right">المادة</th>
                              <th className="border border-slate-200 p-3 w-32">واجب (20)</th>
                              <th className="border border-slate-200 p-3 w-32">شفوي (10)</th>
                              <th className="border border-slate-200 p-3 w-32">مواظبة (10)</th>
                              <th className="border border-slate-200 p-3 w-32">تحريري (60)</th>
                              <th className="border border-slate-200 p-3 w-32">المجموع ({displayMode === "exam_only" ? "60" : "100"})</th>
                              <th className="border border-slate-200 p-3 w-28">النسبة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjects.map((sub, idx) => {
                              const serialNum = (ex.grade === "11" || ex.grade === "12") ? (idx + 13) : (idx + 1);
                              
                              const totalVal = getStudentRowTotal(ex.studentId, ex.grade, ex.section, sub, ex.term, ex.sheetName);
                              const ratioVal = getStudentRowPercentage(ex.studentId, ex.grade, ex.section, sub, ex.term, ex.sheetName);

                              const fields = ["w_k", "oral", "attend", "written"];
                              const maxRowVal = displayMode === "exam_only" ? 60 : 100;
                              const isRowFailing = totalVal < maxRowVal / 2 && totalVal > 0;

                              return (
                                <tr key={sub} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                                  <td className="border border-slate-200 p-3 font-bold bg-slate-50/50">{serialNum}</td>
                                  <td className="border border-slate-200 p-3 text-right font-black">{sub}</td>
                                  
                                  {fields.map((f) => {
                                    const val = getStudentCellDisplayValue(ex.studentId, ex.grade, ex.section, sub, f, ex.term, ex.sheetName);
                                    const isEmpty = val.trim() === "";
                                    const numVal = parseFloat(val);
                                    const maxVal = f === "w_k" ? 20 : f === "written" ? 60 : 10;
                                    const isFailing = !isEmpty && !isNaN(numVal) && numVal < maxVal / 2;
                                    const isFieldReadOnly = displayMode === "exam_only" && f !== "written";

                                    return (
                                      <td key={f} className={`border border-slate-200 p-3 font-bold transition-colors ${isFailing ? "bg-orange-500/20 text-orange-700" : ""} ${isEmpty ? "bg-yellow-500/10 text-slate-400" : ""} ${isFieldReadOnly ? "bg-slate-100 opacity-60 text-slate-300" : ""}`}>
                                        {isFieldReadOnly ? "---" : (val || "---")}
                                      </td>
                                    );
                                  })}

                                  {/* Total cell */}
                                  <td className={`border border-slate-200 p-3 font-black bg-slate-50/80 ${isRowFailing ? "bg-orange-500/20 text-orange-700" : ""}`}>{totalVal > 0 ? totalVal : "---"}</td>
                                  
                                  {/* Ratio cell */}
                                  <td className="border border-slate-200 p-3 font-black bg-slate-50/80 text-emerald-700">{totalVal > 0 ? ratioVal : "---"}</td>
                                </tr>
                              );
                            })}

                            {/* Summary Totals Row */}
                            <tr className="bg-slate-100 font-black text-slate-700">
                              <td colSpan={2} className="border border-slate-200 p-3 text-left">الإجمالي / النسبة</td>
                              
                              {/* واجب */}
                              <td className={`border border-slate-200 p-3 text-center ${displayMode === "exam_only" ? "bg-slate-100 opacity-60" : ""}`}>
                                {displayMode !== "exam_only" && (
                                  <>
                                    <div className="text-blue-700">{calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "w_k", ex.term, ex.sheetName)}</div>
                                    <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "w_k", ex.term, ex.sheetName)) / 20 * 100).toFixed(0)}</div>
                                  </>
                                )}
                                {displayMode === "exam_only" && "---"}
                              </td>
                              
                              {/* شفوي */}
                              <td className={`border border-slate-200 p-3 text-center ${displayMode === "exam_only" ? "bg-slate-100 opacity-60" : ""}`}>
                                {displayMode !== "exam_only" && (
                                  <>
                                    <div className="text-blue-700">{calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "oral", ex.term, ex.sheetName)}</div>
                                    <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "oral", ex.term, ex.sheetName)) / 10 * 100).toFixed(0)}</div>
                                  </>
                                )}
                                {displayMode === "exam_only" && "---"}
                              </td>
                              
                              {/* مواظبة */}
                              <td className={`border border-slate-200 p-3 text-center ${displayMode === "exam_only" ? "bg-slate-100 opacity-60" : ""}`}>
                                {displayMode !== "exam_only" && (
                                  <>
                                    <div className="text-blue-700">{calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "attend", ex.term, ex.sheetName)}</div>
                                    <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "attend", ex.term, ex.sheetName)) / 10 * 100).toFixed(0)}</div>
                                  </>
                                )}
                                {displayMode === "exam_only" && "---"}
                              </td>
                              
                              {/* تحريري */}
                              <td className="border border-slate-200 p-3 text-center">
                                <div className="text-blue-700">{calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "written", ex.term, ex.sheetName)}</div>
                                <div className="text-emerald-700 text-xs mt-0.5">%{(parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "written", ex.term, ex.sheetName)) / 60 * 100).toFixed(0)}</div>
                              </td>
                              
                              {/* المجموع */}
                              <td className="border border-slate-200 p-3 text-center bg-slate-200/80 text-blue-700">{calculateStudentColTotal(ex.studentId, ex.grade, ex.section, subjects, "total_m", ex.term, ex.sheetName)}</td>
                              
                              {/* النسبة */}
                              <td className="border border-slate-200 p-3 text-center bg-slate-200/80 text-emerald-700">
                                %{(() => {
                                  const totalAvg = parseFloat(calculateStudentColAverage(ex.studentId, ex.grade, ex.section, subjects, "total_m", ex.term, ex.sheetName)) || 0;
                                  const maxPossibleTotal = displayMode === "exam_only" ? 60 : 100;
                                  return Math.round((totalAvg / maxPossibleTotal) * 100);
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white p-8 text-center text-slate-400 font-semibold text-sm rounded-2xl border border-slate-100">
                  لا توجد كشوف درجات اختبارات مطابقة للبحث
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. Teacher Reports Sub-page
// ==========================================
const TEACHER_METRICS = [
  { key: "attendance", label: "الحضور اليومي" },
  { key: "appearance", label: "المظهر الشخصي" },
  { key: "preparation", label: "اكتمال التحضير" },
  { key: "supervision_queue", label: "إشراف الطابور" },
  { key: "supervision_rest", label: "إشراف الراحة" },
  { key: "supervision_end", label: "إشراف نهاية الدوام" },
  { key: "correction_notebooks", label: "تصحيح الدفاتر" },
  { key: "correction_books", label: "تصحيح الكتب" },
  { key: "correction_followup", label: "تصحيح المتابعة" },
  { key: "teaching_aids", label: "توفر وسيلة تعلمية" },
  { key: "extra_activities", label: "أنشطة لا صفية" },
  { key: "radio", label: "إقامة إذاعة" },
  { key: "creativity", label: "إبداع" },
  { key: "zero_period", label: "إقامة حصة صفرية" }
];

const TeacherReportsView: React.FC<SubPageProps> = ({ data, isSuperAdmin, userSchools, onBack, currentUser }) => {
  const { getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedTeachers, setSelectedTeachers] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const reportOptions = [
    { id: "adminDaily", label: "متابعة المعلمين الإدارية (التقرير اليومي)" },
    { id: "eduSupervision", label: "الإشراف التربوي والزيارات الصفية" },
    { id: "notebooks", label: "سجل تصحيح الدفاتر" },
    { id: "substitutions", label: "جدول تغطية الحصص والاحتياط" },
    { id: "violations", label: "التعهدات والمخالفات" },
    { id: "creativityRecords", label: "سجل الإبداع والتميز" },
    { id: "deliveryReceipt", label: "كشف الاستلام والتسليم" }
  ];
  const [selectedReports, setSelectedReports] = useState<string[]>(reportOptions.map(r => r.id));
  const [showReportDropdown, setShowReportDropdown] = useState<boolean>(false);

  const [queryTriggered, setQueryTriggered] = useState<boolean>(false);

  const availableSchools = useMemo(() => {
    const list = isSuperAdmin ? data.availableSchools || [] : userSchools;
    if (list.length === 0) {
      const set = new Set<string>();
      (data.secretariatStaff || []).forEach((s: any) => s.school && set.add(s.school));
      return Array.from(set);
    }
    return list;
  }, [data.availableSchools, userSchools, data.secretariatStaff, isSuperAdmin]);

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    (data.secretariatStaff || []).forEach((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return;
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set);
  }, [data.secretariatStaff, selectedSchool]);

  const filteredTeachersDirectory = useMemo(() => {
    return (data.secretariatStaff || []).filter((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return false;
      if (selectedBranch && s.branch !== selectedBranch) return false;

      const jobTitles = s.jobTitles || [];
      const hasTeacherRole = jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس");
      return hasTeacherRole;
    });
  }, [data.secretariatStaff, selectedSchool, selectedBranch]);

  const autocompleteSuggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    return filteredTeachersDirectory.filter((teacher: any) => {
      const alreadySelected = selectedTeachers.some(t => t.id === teacher.id);
      return (teacher.name || "").toLowerCase().includes(searchInput.toLowerCase()) && !alreadySelected;
    }).slice(0, 15);
  }, [filteredTeachersDirectory, searchInput, selectedTeachers]);

  const handleAddTeacher = (teacher: any) => {
    setSelectedTeachers([...selectedTeachers, teacher]);
    setSearchInput("");
    setShowDropdown(false);
    setQueryTriggered(false);
  };

  const handleRemoveTeacher = (id: string) => {
    setSelectedTeachers(selectedTeachers.filter(t => t.id !== id));
    setQueryTriggered(false);
  };

  const handleSelectAllTeachers = () => {
    if (filteredTeachersDirectory.length === 0) {
      toast.warning("لا يوجد معلمون ضمن خيارات التصفية المحددة");
      return;
    }
    setSelectedTeachers(filteredTeachersDirectory.slice(0, 50));
    if (filteredTeachersDirectory.length > 50) {
      toast.info("تم تحديد أول 50 معلماً لتجنب بطء الصفحة");
    }
    setQueryTriggered(false);
  };

  const handleClearTeachers = () => {
    setSelectedTeachers([]);
    setQueryTriggered(false);
  };

  const handleToggleReport = (reportId: string) => {
    if (selectedReports.includes(reportId)) {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    } else {
      setSelectedReports([...selectedReports, reportId]);
    }
  };

  // Compile datasets for selected teachers and filters
  const resultsData = useMemo(() => {
    if (!queryTriggered) return null;
    const teacherNames = selectedTeachers.map(t => t.name);
    const teacherIds = selectedTeachers.map(t => t.id);

    const matchTeacher = (nameVal: string, idVal?: string, recordSchool?: string) => {
      if (selectedTeachers.length > 0) {
        return selectedTeachers.some(t =>
          (idVal && String(t.id) === String(idVal)) ||
          (nameVal && cleanName(t.name) === cleanName(nameVal))
        );
      }

      const dirStaff = (data.secretariatStaff || []).find((s: any) =>
        (idVal && String(s.id) === String(idVal)) ||
        (nameVal && cleanName(s.name) === cleanName(nameVal))
      );

      const sSchool = dirStaff?.school || recordSchool || "";
      const sBranch = dirStaff?.branch || "";

      if (selectedSchool && cleanName(sSchool) !== cleanName(selectedSchool)) return false;
      if (selectedBranch && cleanName(sBranch) !== cleanName(selectedBranch)) return false;

      return true;
    };

    // 1. Administrative Daily Reports (data.dailyReports -> teachersData)
    const adminDailyReports: any[] = [];
    (data.dailyReports || []).forEach((container: any) => {
      const matchDate = matchesDateRange(container.dateStr, dateFrom, dateTo);
      if (matchDate && container.teachersData) {
        container.teachersData.forEach((tData: any) => {
          const matchName = matchTeacher(tData.teacherName, undefined, container.schoolId);
          if (matchName) {
            adminDailyReports.push({
              dateStr: container.dateStr,
              dayName: container.dayName,
              writer: container.writer,
              ...tData
            });
          }
        });
      }
    });

    // 2. Educational Supervision (data.teacherEvaluations)
    const educationalEvaluations = (data.teacherEvaluations || []).filter((e: any) => {
      const matchName = matchTeacher(e.teacherName, e.teacherId, e.school);
      const matchDate = matchesDateRange(e.date, dateFrom, dateTo);
      return matchName && matchDate;
    });

    // 3. Notebooks correction
    const notebooksReports: any[] = [];
    (data.deliveryReceiptRecords || []).forEach((report: any) => {
      const matchDate = matchesDateRange(report.dateStr, dateFrom, dateTo);
      if (matchDate && report.items) {
        report.items.forEach((item: any) => {
          const matchName = matchTeacher(item.teacherName, undefined, item.school);
          if (matchName) {
            notebooksReports.push({
              reportName: report.reportName,
              dateStr: report.dateStr,
              supervisorName: report.supervisorName,
              ...item
            });
          }
        });
      }
    });

    // 4. Substitutions/Coverage (data.substitutions)
    const substitutions = (data.substitutions || []).filter((sub: any) => {
      if (selectedTeachers.length === 0) {
        const matchAbsent = matchTeacher(sub.absentTeacher);
        const matchReplacement = sub.replacementTeacher ? matchTeacher(sub.replacementTeacher) : false;
        const matchDate = matchesDateRange(sub.date, dateFrom, dateTo);
        return (matchAbsent || matchReplacement) && matchDate;
      }
      const isAbsent = selectedTeachers.some(t => cleanName(t.name) === cleanName(sub.absentTeacher));
      const isReplacement = selectedTeachers.some(t => cleanName(t.name) === cleanName(sub.replacementTeacher));
      const matchDate = matchesDateRange(sub.date, dateFrom, dateTo);
      return (isAbsent || isReplacement) && matchDate;
    });

    // 5. Commitments/Violations
    const teacherViolations = (data.violations || []).filter((v: any) => {
      const isTeacher = v.type === "teachers";
      const matchName = matchTeacher(v.teacherName, undefined, v.school);
      const matchDate = matchesDateRange(v.date, dateFrom, dateTo);
      return isTeacher && matchName && matchDate;
    });

    // 6. Creativity Records (data.creativityRecords)
    const creativityReports: any[] = [];
    (data.creativityRecords || []).forEach((report: any) => {
      const matchDate = matchesDateRange(report.dateStr, dateFrom, dateTo);
      if (matchDate && report.items) {
        report.items.forEach((item: any) => {
          const hasTeacherMatch = item.teacherNames?.some((tName: string) => matchTeacher(tName, undefined, report.school));
          const matchReportScope = selectedTeachers.length === 0
            ? (!selectedSchool || cleanName(report.school) === cleanName(selectedSchool)) &&
              (!selectedBranch || cleanName(report.branch) === cleanName(selectedBranch))
            : hasTeacherMatch;
          
          if (matchReportScope) {
            creativityReports.push({
              supervisorName: report.supervisorName,
              supervisorJob: report.supervisorJob,
              school: report.school,
              branch: report.branch,
              ...item
            });
          }
        });
      }
    });

    // 7. Delivery & Receipt Records (alias of notebooksReports)
    const deliveryReceiptReports = notebooksReports;

    return {
      adminDailyReports,
      educationalEvaluations,
      notebooksReports,
      substitutions,
      teacherViolations,
      creativityReports,
      deliveryReceiptReports
    };
  }, [queryTriggered, selectedTeachers, data, dateFrom, dateTo, selectedSchool, selectedBranch]);

  // Excel Exporter with Yemeni Theme for Teachers
  const handleExportExcel = async () => {
    if (!resultsData) return;
    const profile = data.profile || {};
    const workbook = new ExcelJS.Workbook();
    let sheetsAdded = 0;

    // 1. Admin Daily Follow-up Sheet (ALL CRITERIA INCLUDED AS SEPARATE COLUMNS)
    if (selectedReports.includes("adminDaily") && resultsData.adminDailyReports.length > 0) {
      const headers = [
        "اسم المعلم", "المادة والصف",
        ...TEACHER_METRICS.map(m => m.label),
        "درجة المخالفات", "ملحوظات المخالفة", "ملاحظات إضافية", "اليوم والتاريخ"
      ];

      const rows = resultsData.adminDailyReports.map((r: any) => [
        r.teacherName,
        `${r.subjectCode || ""} (${r.className || ""})`,
        ...TEACHER_METRICS.map(m => r[m.key] !== undefined ? r[m.key] : "---"),
        r.violations_score || 0,
        Array.isArray(r.violations_notes) ? r.violations_notes.join(" | ") : (r.violations_notes || "---"),
        r.additional_violation_notes || "---",
        `${r.dateStr} (${r.dayName || ""})`
      ]);
      addStyledSheet(workbook, "المتابعة الإدارية", "سجل متابعة المعلمين الإداري (التقرير اليومي)", headers, rows, "059669", profile, currentUser);
      sheetsAdded++;
    }

    // 2. Educational Supervision Sheet (RECOMMENDATIONS SEPARATED)
    if (selectedReports.includes("eduSupervision") && resultsData.educationalEvaluations.length > 0) {
      const headers = ["اسم المعلم", "المشرف المقيّم", "المادة والصف", "نوع الزيارة", "النسبة والدرجة", "نقاط القوة", "نقاط التحسين", "التوصيات", "التاريخ"];
      const rows = resultsData.educationalEvaluations.map((e: any) => [
        e.teacherName,
        e.evaluatorName || "---",
        `${e.subject} (صف: ${e.className})`,
        e.evaluationType === "short" ? "قصيرة" : e.evaluationType === "ext" ? "موسعة" : "تخصصية",
        `${e.percentage}% (درجة: ${e.totalScore})`,
        e.strengths || "---",
        e.improvements || "---",
        e.recommendations || "---",
        e.date
      ]);
      addStyledSheet(workbook, "الزيارات الإشرافية", "سجل الزيارات الإشرافية والتقويم التربوي", headers, rows, "0D9488", profile, currentUser);
      sheetsAdded++;
    }

    // 3. Notebooks Correction Sheet
    if (selectedReports.includes("notebooks") && resultsData.notebooksReports.length > 0) {
      const headers = ["اسم المعلم", "الصف والشعبة المتابعة", "تاريخ الاستلام والرد", "عدد النماذج المتابعة", "حالة المتابعة والتنفيذ", "الإجراء المتخذ", "ملاحظات المشرف", "الكشف"];
      const rows = resultsData.notebooksReports.map((n: any) => [
        n.teacherName,
        `${n.grade} / ${n.section}`,
        `استلام: ${n.receiveDateStr} / تسليم: ${n.deliveryDateStr}`,
        n.formCount || "---",
        n.status === "delivered" ? "تم التسليم" : n.status === "not_delivered" ? "لم يسلم" : "قيد المتابعة",
        n.actionTaken || "---",
        n.notes || "---",
        `${n.reportName} (بواسطة: ${n.supervisorName} | ${n.dateStr})`
      ]);
      addStyledSheet(workbook, "تصحيح الدفاتر", "سجل تصحيح ومتابعة الدفاتر اليومية والواجبات", headers, rows, "0891B2", profile, currentUser);
      sheetsAdded++;
    }

    // 4. Substitutions Sheet
    if (selectedReports.includes("substitutions") && resultsData.substitutions.length > 0) {
      const headers = ["المعلم الغائب", "المعلم البديل والتغطية", "الحصة", "الصف والشعبة", "الحالة المادية للبديل", "التاريخ"];
      const rows = resultsData.substitutions.map((sub: any) => [
        sub.absentTeacher,
        sub.replacementTeacher || "---",
        sub.period || "---",
        sub.class || "---",
        sub.paymentStatus === "paid" ? "مدفوع للتغطية" : "مستحق وغير مدفوع",
        sub.date
      ]);
      addStyledSheet(workbook, "جدول التغطية", "جدول تغطية الحصص والاحتياط", headers, rows, "2563EB", profile, currentUser);
      sheetsAdded++;
    }

    // 5. Teacher Violations Sheet
    if (selectedReports.includes("violations") && resultsData.teacherViolations.length > 0) {
      const headers = ["اسم المعلم", "المادة والصف", "اليوم والتاريخ", "بيان المخالفة", "المخالفات السابقة", "الإجراء المتخذ", "التزام المعلم وتوقيعه"];
      const rows = resultsData.teacherViolations.map((v: any) => [
        v.teacherName,
        `${v.subject || "---"} (صف: ${v.grade || v.class || "---"})`,
        `${v.date} (${v.day})`,
        v.violation,
        v.prevViolations || 0,
        v.procedure || "---",
        v.signature || "لم يتم التوقيع"
      ]);
      addStyledSheet(workbook, "التعهدات والمخالفات", "سجل تعهدات ومخالفات المعلمين", headers, rows, "D97706", profile, currentUser);
      sheetsAdded++;
    }

    // 6. Creativity Records Sheet
    if (selectedReports.includes("creativityRecords") && resultsData.creativityReports && resultsData.creativityReports.length > 0) {
      const headers = ["أسماء المعلمين", "الفئة/المجال", "التقييم", "التفاصيل والملاحظات", "المشرف المرشح", "تاريخ الإقرار"];
      const rows = resultsData.creativityReports.map((r: any) => [
        r.teacherNames && r.teacherNames.length > 0 ? r.teacherNames.join(" - ") : "---",
        r.category || "---",
        r.evaluation || "---",
        r.notes || "---",
        `${r.supervisorName} (${r.supervisorJob})`,
        r.dateStr
      ]);
      addStyledSheet(workbook, "الإبداع والتميز", "سجل التميز والإبداع لمعلمي المدرسة", headers, rows, "7C3AED", profile, currentUser);
      sheetsAdded++;
    }

    // 7. Delivery Receipt Sheet
    if (selectedReports.includes("deliveryReceipt") && resultsData.deliveryReceiptReports && resultsData.deliveryReceiptReports.length > 0) {
      const headers = ["اسم المعلم", "الصف والشعبة المتابعة", "تاريخ الاستلام والرد", "عدد النماذج المتابعة", "حالة المتابعة والتنفيذ", "الإجراء المتخذ", "ملاحظات المشرف", "الكشف"];
      const rows = resultsData.deliveryReceiptReports.map((n: any) => [
        n.teacherName,
        `${n.grade} / ${n.section}`,
        `استلام: ${n.receiveDateStr} / تسليم: ${n.deliveryDateStr}`,
        n.formCount || "---",
        n.status === "delivered" ? "تم التسليم" : n.status === "not_delivered" ? "لم يسلم" : "قيد المتابعة",
        n.actionTaken || "---",
        n.notes || "---",
        `${n.reportName} (بواسطة: ${n.supervisorName} | ${n.dateStr})`
      ]);
      addStyledSheet(workbook, "كشف الاستلام والتسليم", "كشف استلام وتسليم دفاتر المعلمين", headers, rows, "0E7490", profile, currentUser);
      sheetsAdded++;
    }

    if (sheetsAdded === 0) {
      toast.error("لا توجد بيانات مطابقة لتصديرها إكسل");
      return;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Teacher_Comprehensive_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير ملف الإكسل الشامل للمعلمين بنجاح");
  };

  // WhatsApp Exporter for Teachers with Visual Emojis
  const handleExportWhatsApp = () => {
    if (!resultsData) return;
    let msg = `*🟢 تقارير المعلمين المجمعة المخصصة 🟢*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;

    if (selectedReports.includes("adminDaily") && resultsData.adminDailyReports.length > 0) {
      msg += `*📁 [المتابعة الإدارية اليومية للمعلمين] 📁*\n`;
      resultsData.adminDailyReports.forEach((r: any, idx: number) => {
        msg += `🧑‍🏫 *${idx + 1}. المعلم:* ${r.teacherName}\n`;
        msg += `🏫 *المادة والصف:* ${r.subjectCode || "---"} (${r.className || "---"})\n`;
        msg += `⏱️ *الحضور:* ${r.attendance ?? "---"} | 👔 *المظهر:* ${r.appearance ?? "---"} | 📚 *التحضير:* ${r.preparation ?? "---"}\n`;
        msg += `🚶 *إشراف الطابور:* ${r.supervision_queue ?? "---"} | ☕ *إشراف الراحة:* ${r.supervision_rest ?? "---"} | 🔚 *إشراف الانصراف:* ${r.supervision_end ?? "---"}\n`;
        msg += `📖 *تصحيح كراسات:* ${r.correction_notebooks ?? "---"} | 📚 *تصحيح كتب:* ${r.correction_books ?? "---"} | 🖊️ *متابعة تصحيح:* ${r.correction_followup ?? "---"}\n`;
        msg += `🎨 *وسيلة تعليمية:* ${r.teaching_aids ?? "---"} | 🎭 *نشاط لا صفي:* ${r.extra_activities ?? "---"} | 📢 *الإذاعة:* ${r.radio ?? "---"}\n`;
        msg += `💡 *الإبداع:* ${r.creativity ?? "---"} | 🕐 *الحصة الصفرية:* ${r.zero_period ?? "---"}\n`;
        msg += `⚠️ *درجة المخالفات:* ${r.violations_score || 0}\n`;
        if (r.violations_notes && r.violations_notes.length > 0) {
          msg += `📝 *ملاحظات المخالفة:* ${Array.isArray(r.violations_notes) ? r.violations_notes.join(", ") : r.violations_notes}\n`;
        }
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    if (selectedReports.includes("eduSupervision") && resultsData.educationalEvaluations.length > 0) {
      msg += `*📁 [تقارير الزيارات الإشرافية والتقويم] 📁*\n`;
      resultsData.educationalEvaluations.forEach((e: any, idx: number) => {
        msg += `🧑‍🏫 *${idx + 1}. المعلم:* ${e.teacherName}\n`;
        msg += `👤 *المشرف المقيّم:* ${e.evaluatorName || "---"}\n`;
        msg += `🏫 *المادة والصف:* ${e.subject} (صف: ${e.className})\n`;
        msg += `📊 *النسبة والدرجة:* ${e.percentage}% (المجموع: ${e.totalScore})\n`;
        msg += `👍 *نقاط القوة:* ${e.strengths || "---"}\n`;
        msg += `👎 *نقاط التحسين:* ${e.improvements || "---"}\n`;
        msg += `📌 *التوصيات:* ${e.recommendations || "---"}\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    if (selectedReports.includes("substitutions") && resultsData.substitutions.length > 0) {
      msg += `*📁 [سجل التغطية والاحتياط] 📁*\n`;
      resultsData.substitutions.forEach((sub: any, idx: number) => {
        msg += `🧑‍🏫 *${idx + 1}. البديل:* ${sub.replacementTeacher || "---"} (الغائب: ${sub.absentTeacher})\n`;
        msg += `🏫 *الحصة والصف:* الحصة ${sub.period} (${sub.class})\n`;
        msg += `💰 *الحالة المالية:* ${sub.paymentStatus === "paid" ? "✅ مدفوع" : "⏳ مستحق"}\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    // Creativity Records
    if (selectedReports.includes("creativityRecords") && resultsData.creativityReports && resultsData.creativityReports.length > 0) {
      msg += `*📁 [سجل الإبداع والتميز للمعلمين] 📁*\n`;
      resultsData.creativityReports.forEach((r: any, idx: number) => {
        msg += `🧑‍🏫 *${idx + 1}. المعلم:* ${r.teacherNames && r.teacherNames.length > 0 ? r.teacherNames.join(", ") : "---"}\n`;
        msg += `🌟 *المجال:* ${r.category || "---"}\n`;
        msg += `⭐ *التقييم:* ${r.evaluation ? `${r.evaluation} / 4` : "---"}\n`;
        if (r.notes) msg += `📝 *ملاحظات:* ${r.notes}\n`;
        msg += `✍️ *المشرف:* ${r.supervisorName}\n`;
        msg += `📅 *التاريخ:* ${r.dateStr}\n\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    // Delivery Receipt Records
    if (selectedReports.includes("deliveryReceipt") && resultsData.deliveryReceiptReports && resultsData.deliveryReceiptReports.length > 0) {
      msg += `*📁 [كشف استلام وتسليم دفاتر المعلمين] 📁*\n`;
      resultsData.deliveryReceiptReports.forEach((n: any, idx: number) => {
        msg += `🧑‍🏫 *${idx + 1}. المعلم:* ${n.teacherName}\n`;
        msg += `🏫 *الصف والشعبة:* ${n.grade} / ${n.section}\n`;
        msg += `📦 *النماذج:* ${n.formCount || "---"} نموذج\n`;
        msg += `📅 *تاريخ الاستلام والرد:* استلام ${n.receiveDateStr} | رد ${n.deliveryDateStr}\n`;
        msg += `🚦 *حالة المتابعة:* ${n.status === "delivered" ? "✅ تم التسليم" : n.status === "not_delivered" ? "❌ لم يسلم" : "⏳ قيد المتابعة"}\n`;
        if (n.notes) msg += `📝 *ملاحظات المشرف:* ${n.notes}\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    msg += `✍️ *إعداد التقرير:* ${currentUser?.name || "..."}\n`;
    msg += `🧑‍💼 *مدير الفرع:* ${data.profile?.branchManager || "..."}\n`;

    msg += `\n${getReportMessageFooter()}`;
    shareViaWhatsApp(msg);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600"
            title="رجوع"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <GraduationCap className="text-emerald-600" size={24} />
              تقارير المعلمين الشاملة
            </h2>
            <p className="text-xs text-slate-500 font-bold">البحث والفلترة المجمعة لتقارير أداء المعلمين اليومي والتربوي</p>
          </div>
        </div>
        <div className="flex gap-2">
          {queryTriggered && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors print:hidden"
            >
              <Printer size={16} />
              طباعة التقرير
            </button>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 print:hidden">
        {/* Dynamic School/Branch Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">المدرسة</label>
            <select
              value={selectedSchool}
              onChange={(e) => {
                setSelectedSchool(e.target.value);
                setSelectedBranch("");
                setSelectedTeachers([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع المدارس</option>
              {availableSchools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">الفرع</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedTeachers([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع الفروع</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Name Search and Autocomplete */}
        <div className="relative space-y-3">
          <label className="text-xs font-bold text-slate-600 block">البحث عن المعلمين واختيارهم</label>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="اكتب اسم المعلم للبحث والاختيار..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-emerald-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11 text-right"
            />
            <Search className="absolute right-3.5 top-3.5 text-slate-400" size={16} />
            
            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showDropdown && (searchInput.trim() || autocompleteSuggestions.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-50"
                >
                  {autocompleteSuggestions.length > 0 ? (
                    autocompleteSuggestions.map((teacher: any) => (
                      <button
                        key={teacher.id}
                        onClick={() => handleAddTeacher(teacher)}
                        className="w-full text-right px-4 py-3 hover:bg-emerald-50 transition-colors text-sm font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>{teacher.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
                          {teacher.school} - {teacher.branch}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs font-semibold">
                      {searchInput.trim() ? "لا توجد نتائج مطابقة للبحث" : "اكتب اسم المعلم لعرض المقترحات"}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllTeachers}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors whitespace-nowrap h-11"
            >
              تحديد الكل المصفى
            </button>
            <button
              onClick={handleClearTeachers}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors whitespace-nowrap h-11"
            >
              إلغاء التحديد
            </button>
          </div>

          {/* Click outside to close helper */}
          {showDropdown && (
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          )}

          {/* Selected Chips */}
          {selectedTeachers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              {selectedTeachers.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm"
                >
                  {t.name}
                  <button
                    onClick={() => handleRemoveTeacher(t.id)}
                    className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter & Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">من تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setQueryTriggered(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">إلى تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setQueryTriggered(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-xs font-bold text-slate-600 block mb-2">نوع التقارير المطلوبة</label>
            <button
              onClick={() => setShowReportDropdown(!showReportDropdown)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none bg-slate-50 text-sm h-11 flex items-center justify-between text-slate-700 font-semibold text-right"
            >
              <span>المختارة ({selectedReports.length})</span>
              <ChevronDown size={16} />
            </button>

            <AnimatePresence>
              {showReportDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowReportDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 space-y-2.5"
                  >
                    {reportOptions.map((opt) => {
                      const active = selectedReports.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-right"
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => handleToggleReport(opt.id)}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer focus:ring-0"
                          />
                          <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                        </label>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* View Trigger and Export Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (selectedTeachers.length === 0 && !selectedSchool && !selectedBranch) {
                toast.error("يرجى تحديد معلم واحد على الأقل، أو تصفية المعلمين بالمدرسة/الفرع");
                return;
              }
              setQueryTriggered(true);
            }}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:shadow-xl hover:shadow-emerald-200 transition-all hover:-translate-y-0.5 text-sm"
          >
            🔍 عرض التقارير المجمعة
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!queryTriggered}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border shadow-sm ${queryTriggered
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer"
              : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
          >
            <FileSpreadsheet size={18} />
            تصدير إكسل الشامل
          </button>

          <button
            onClick={handleExportWhatsApp}
            disabled={!queryTriggered}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border shadow-sm ${queryTriggered
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
              : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
          >
            <MessageCircle size={18} />
            إرسال عبر واتساب
          </button>
        </div>
      </div>

      {/* Results Tables */}
      {queryTriggered && resultsData && (
        <div className="space-y-10">

          {/* Table 1: Administrative Daily Reports */}
          {selectedReports.includes("adminDaily") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardList size={22} />
                  سجل متابعة المعلمين الإداري (المشرف الإداري)
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.adminDailyReports.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المعلم</th>
                      <th className="p-4 font-bold text-sm">المادة والصف</th>
                      {TEACHER_METRICS.map(m => (
                        <th key={m.key} className="p-4 font-bold text-sm">{m.label}</th>
                      ))}
                      <th className="p-4 font-bold text-sm">درجة المخالفات</th>
                      <th className="p-4 font-bold text-sm">ملحوظات المخالفة</th>
                      <th className="p-4 font-bold text-sm">ملاحظات إضافية</th>
                      <th className="p-4 font-bold text-sm">اليوم والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.adminDailyReports.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{r.teacherName}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div className="font-semibold text-slate-700">{r.subjectCode}</div>
                          <div className="text-xs text-slate-400">{r.className}</div>
                        </td>
                        {TEACHER_METRICS.map(m => (
                          <td key={m.key} className="p-4 text-sm text-center font-bold text-slate-700">
                            {r[m.key] !== undefined ? r[m.key] : "---"}
                          </td>
                        ))}
                        <td className="p-4 text-sm text-center font-bold text-rose-600">{r.violations_score || 0}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-500">
                          {Array.isArray(r.violations_notes) ? r.violations_notes.join(" | ") : (r.violations_notes || "---")}
                        </td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-500">{r.additional_violation_notes || "---"}</td>
                        <td className="p-4 text-sm text-slate-500">
                          <div className="font-semibold">{r.dateStr}</div>
                          <div className="text-[10px] text-slate-400">{r.dayName}</div>
                        </td>
                      </tr>
                    ))}
                    {resultsData.adminDailyReports.length === 0 && (
                      <tr>
                        <td colSpan={19} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد تقارير متابعة يومية مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 2: Educational Supervision Visits */}
          {selectedReports.includes("eduSupervision") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <BookOpen size={22} />
                  سجل الزيارات الإشرافية والتقويم التربوي
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.educationalEvaluations.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المعلم</th>
                      <th className="p-4 font-bold text-sm">المشرف المقيّم</th>
                      <th className="p-4 font-bold text-sm">المادة والصف</th>
                      <th className="p-4 font-bold text-sm">نوع الزيارة</th>
                      <th className="p-4 font-bold text-sm">النسبة والدرجة</th>
                      <th className="p-4 font-bold text-sm">نقاط القوة</th>
                      <th className="p-4 font-bold text-sm">نقاط التحسين</th>
                      <th className="p-4 font-bold text-sm">التوصيات</th>
                      <th className="p-4 font-bold text-sm">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.educationalEvaluations.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{e.teacherName}</td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{e.evaluatorName || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>{e.subject}</div>
                          <div className="text-xs text-slate-400">صف: {e.className}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {e.evaluationType === "short" ? "قصيرة" : e.evaluationType === "ext" ? "موسعة" : "تخصصية"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div className="font-bold text-emerald-600">{e.percentage}%</div>
                          <div className="text-[10px] text-slate-400 font-semibold">مجموع: {e.totalScore}</div>
                        </td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-600 font-medium">{e.strengths || "---"}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-600 font-medium text-amber-700">{e.improvements || "---"}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-600 font-medium text-blue-700">{e.recommendations || "---"}</td>
                        <td className="p-4 text-sm text-slate-500">{e.date}</td>
                      </tr>
                    ))}
                    {resultsData.educationalEvaluations.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد سجلات تقييم تربوي مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 3: Notebooks Correction */}
          {selectedReports.includes("notebooks") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-cyan-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <FileText size={22} />
                  سجل تصحيح ومتابعة الدفاتر اليومية والواجبات
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.notebooksReports.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المعلم</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة المتابعة</th>
                      <th className="p-4 font-bold text-sm">تاريخ الاستلام والرد</th>
                      <th className="p-4 font-bold text-sm">عدد النماذج المتابعة</th>
                      <th className="p-4 font-bold text-sm">حالة المتابعة والتنفيذ</th>
                      <th className="p-4 font-bold text-sm">الإجراء المتخذ</th>
                      <th className="p-4 font-bold text-sm">ملاحظات المشرف</th>
                      <th className="p-4 font-bold text-sm">الكشف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.notebooksReports.map((n: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{n.teacherName}</td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{n.grade} / {n.section}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>استلام: {n.receiveDateStr}</div>
                          <div>رد وتسليم: {n.deliveryDateStr}</div>
                        </td>
                        <td className="p-4 text-sm text-center text-slate-600">{n.formCount || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${n.status === "delivered" ? "bg-green-50 text-green-700" : n.status === "not_delivered" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                            }`}>
                            {n.status === "delivered" ? "تم التسليم" : n.status === "not_delivered" ? "لم يسلم" : "قيد المتابعة"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{n.actionTaken || "---"}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-600">{n.notes || "---"}</td>
                        <td className="p-4 text-sm text-slate-500">
                          <div className="font-semibold text-slate-700 text-xs">{n.reportName}</div>
                          <div className="text-[10px] text-slate-400">معد التقرير: {n.supervisorName} | {n.dateStr}</div>
                        </td>
                      </tr>
                    ))}
                    {resultsData.notebooksReports.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد سجلات استلام دفاتر للمعلمين المحددين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 4: Substitutions & Coverage */}
          {selectedReports.includes("substitutions") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardList size={22} />
                  جدول تغطية الحصص والاحتياط
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.substitutions.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">المعلم الغائب</th>
                      <th className="p-4 font-bold text-sm">المعلم البديل والتغطية</th>
                      <th className="p-4 font-bold text-sm">الحصة</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة</th>
                      <th className="p-4 font-bold text-sm">الحالة المادية للبديل</th>
                      <th className="p-4 font-bold text-sm">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.substitutions.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{sub.absentTeacher}</td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{sub.replacementTeacher || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">{sub.period || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">{sub.class || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${sub.paymentStatus === "paid" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                            }`}>
                            {sub.paymentStatus === "paid" ? "مدفوع للتغطية" : "مستحق وغير مدفوع"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{sub.date}</td>
                      </tr>
                    ))}
                    {resultsData.substitutions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد سجلات تغطية حصص للمعلمين المحددين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 5: Commitments & Violations */}
          {selectedReports.includes("violations") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <AlertCircle size={22} />
                  سجل تعهدات ومخالفات المعلمين
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.teacherViolations.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المعلم</th>
                      <th className="p-4 font-bold text-sm">المادة والصف</th>
                      <th className="p-4 font-bold text-sm">اليوم والتاريخ</th>
                      <th className="p-4 font-bold text-sm">بيان المخالفة</th>
                      <th className="p-4 font-bold text-sm">المخالفات السابقة</th>
                      <th className="p-4 font-bold text-sm">الإجراء المتخذ</th>
                      <th className="p-4 font-bold text-sm">التزام المعلم وتوقيعه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.teacherViolations.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{v.teacherName}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>{v.subject || "---"}</div>
                          <div className="text-xs text-slate-400">صف: {v.grade || v.class || "---"}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          <div className="font-semibold">{v.date}</div>
                          <div className="text-xs text-slate-400">{v.day}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-700 whitespace-normal min-w-[200px]">{v.violation}</td>
                        <td className="p-4 text-sm text-center font-bold text-slate-600">{v.prevViolations || 0}</td>
                        <td className="p-4 text-sm text-rose-600 font-semibold whitespace-normal min-w-[150px]">{v.procedure || "---"}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[250px] text-slate-500 italic bg-amber-50/20">{v.signature || "لم يتم التوقيع"}</td>
                      </tr>
                    ))}
                    {resultsData.teacherViolations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد تعهدات أو مخالفات مسجلة على المعلمين المحددين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 6: Creativity Records */}
          {selectedReports.includes("creativityRecords") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <UserCheck size={22} />
                  سجل الإبداع والتميز للمعلمين
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.creativityReports.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المعلم</th>
                      <th className="p-4 font-bold text-sm">مجال الإبداع والتميز</th>
                      <th className="p-4 font-bold text-sm">التقييم</th>
                      <th className="p-4 font-bold text-sm">التفاصيل والملاحظات</th>
                      <th className="p-4 font-bold text-sm">المشرف المرشح</th>
                      <th className="p-4 font-bold text-sm">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.creativityReports.map((r: any, idx: number) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          {r.teacherNames && r.teacherNames.length > 0 ? r.teacherNames.join(" - ") : "---"}
                        </td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{r.category || "---"}</td>
                        <td className="p-4 text-sm font-bold text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                            r.evaluation === 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            r.evaluation === 3 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            r.evaluation === 2 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {r.evaluation ? `${r.evaluation} / 4` : "---"}
                          </span>
                        </td>
                        <td className="p-4 text-xs whitespace-normal max-w-[300px] text-slate-600 font-medium">{r.notes || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div className="font-semibold">{r.supervisorName}</div>
                          <div className="text-[10px] text-slate-400">{r.supervisorJob}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{r.dateStr || "---"}</td>
                      </tr>
                    ))}
                    {resultsData.creativityReports.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد سجلات إبداع وتميز للمعلمين المحددين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table 7: Delivery & Receipt Records */}
          {selectedReports.includes("deliveryReceipt") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <FileText size={22} />
                  كشف استلام وتسليم دفاتر الطلاب (المعلم)
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.deliveryReceiptReports.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المعلم</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة المتابعة</th>
                      <th className="p-4 font-bold text-sm">تاريخ الاستلام والرد</th>
                      <th className="p-4 font-bold text-sm">عدد النماذج المتابعة</th>
                      <th className="p-4 font-bold text-sm">حالة المتابعة والتنفيذ</th>
                      <th className="p-4 font-bold text-sm">الإجراء المتخذ</th>
                      <th className="p-4 font-bold text-sm">ملاحظات المشرف</th>
                      <th className="p-4 font-bold text-sm">الكشف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.deliveryReceiptReports.map((n: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{n.teacherName}</td>
                        <td className="p-4 text-sm font-semibold text-slate-700">{n.grade} / {n.section}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <div>استلام: {n.receiveDateStr}</div>
                          <div>رد وتسليم: {n.deliveryDateStr}</div>
                        </td>
                        <td className="p-4 text-sm text-center text-slate-600">{n.formCount || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            n.status === "delivered" ? "bg-green-50 text-green-700" : n.status === "not_delivered" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {n.status === "delivered" ? "تم التسليم" : n.status === "not_delivered" ? "لم يسلم" : "قيد المتابعة"}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{n.actionTaken || "---"}</td>
                        <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-600">{n.notes || "---"}</td>
                        <td className="p-4 text-sm text-slate-500">
                          <div className="font-semibold text-slate-700 text-xs">{n.reportName}</div>
                          <div className="text-[10px] text-slate-400">معد التقرير: {n.supervisorName} | {n.dateStr}</div>
                        </td>
                      </tr>
                    ))}
                    {resultsData.deliveryReceiptReports.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد سجلات استلام دفاتر للمعلمين المحددين
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

// ==========================================
// 4. Admin Reports Sub-page
// ==========================================
const AdminReportsView: React.FC<SubPageProps> = ({ data, isSuperAdmin, userSchools, onBack, currentUser }) => {
  const { getReportMessageFooter, shareViaWhatsApp } = useGlobal();
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const reportOptions = [
    { id: "adminReports", label: "تقارير متابعة الموظفين والعاملين (الإشراف اليومي)" },
    { id: "tasks", label: "المهام" },
    { id: "addedTasks", label: "المهام المضافة" },
    { id: "postponedTasks", label: "المهام المرحلة" },
    { id: "issues", label: "المشكلات" },
    { id: "recommendations", label: "التوصيات" },
    { id: "suggestions", label: "المقترحات" },
    { id: "notebookFollowUp", label: "سجل متابعة الدفاتر والتصحيح" }
  ];
  const [selectedReports, setSelectedReports] = useState<string[]>(reportOptions.map(r => r.id));
  const [showReportDropdown, setShowReportDropdown] = useState<boolean>(false);

  const [queryTriggered, setQueryTriggered] = useState<boolean>(false);

  const availableSchools = useMemo(() => {
    const list = isSuperAdmin ? data.availableSchools || [] : userSchools;
    if (list.length === 0) {
      const set = new Set<string>();
      (data.secretariatStaff || []).forEach((s: any) => s.school && set.add(s.school));
      return Array.from(set);
    }
    return list;
  }, [data.availableSchools, userSchools, data.secretariatStaff, isSuperAdmin]);

  const availableBranches = useMemo(() => {
    const set = new Set<string>();
    (data.secretariatStaff || []).forEach((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return;
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set);
  }, [data.secretariatStaff, selectedSchool]);

  const filteredAdminDirectory = useMemo(() => {
    return (data.secretariatStaff || []).filter((s: any) => {
      if (selectedSchool && s.school !== selectedSchool) return false;
      if (selectedBranch && s.branch !== selectedBranch) return false;

      const jobTitles = s.jobTitles || [];
      const hasTeacherRole = jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس");
      return !hasTeacherRole;
    });
  }, [data.secretariatStaff, selectedSchool, selectedBranch]);

  const autocompleteSuggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    return filteredAdminDirectory.filter((emp: any) => {
      const alreadySelected = selectedEmployees.some(e => e.id === emp.id);
      return (emp.name || "").toLowerCase().includes(searchInput.toLowerCase()) && !alreadySelected;
    }).slice(0, 15);
  }, [filteredAdminDirectory, searchInput, selectedEmployees]);

  const handleAddEmployee = (emp: any) => {
    setSelectedEmployees([...selectedEmployees, emp]);
    setSearchInput("");
    setShowDropdown(false);
    setQueryTriggered(false);
  };

  const handleRemoveEmployee = (id: string) => {
    setSelectedEmployees(selectedEmployees.filter(e => e.id !== id));
    setQueryTriggered(false);
  };

  const handleSelectAllEmployees = () => {
    if (filteredAdminDirectory.length === 0) {
      toast.warning("لا يوجد موظفون إداريون ضمن خيارات التصفية المحددة");
      return;
    }
    setSelectedEmployees(filteredAdminDirectory.slice(0, 50));
    if (filteredAdminDirectory.length > 50) {
      toast.info("تم تحديد أول 50 موظفاً لتجنب بطء الصفحة");
    }
    setQueryTriggered(false);
  };

  const handleClearEmployees = () => {
    setSelectedEmployees([]);
    setQueryTriggered(false);
  };

  const handleToggleReport = (reportId: string) => {
    if (selectedReports.includes(reportId)) {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
    } else {
      setSelectedReports([...selectedReports, reportId]);
    }
  };

  // Compile datasets for selected employees and filters
  const resultsData = useMemo(() => {
    if (!queryTriggered) return null;
    const employeeNames = selectedEmployees.map(e => e.name);

    const matchAdmin = (nameVal: string, idVal?: string, recordSchool?: string) => {
      if (selectedEmployees.length > 0) {
        return selectedEmployees.some(e =>
          (idVal && String(e.id) === String(idVal)) ||
          (nameVal && cleanName(e.name) === cleanName(nameVal))
        );
      }

      const dirStaff = (data.secretariatStaff || []).find((s: any) =>
        (idVal && String(s.id) === String(idVal)) ||
        (nameVal && cleanName(s.name) === cleanName(nameVal))
      );

      const sSchool = dirStaff?.school || recordSchool || "";
      const sBranch = dirStaff?.branch || "";

      if (selectedSchool && cleanName(sSchool) !== cleanName(selectedSchool)) return false;
      if (selectedBranch && cleanName(sBranch) !== cleanName(selectedBranch)) return false;

      return true;
    };

    // 1. Staff Follow-Up Page (data.adminReports -> employeesData)
    const adminFollowUpReports: any[] = [];
    (data.adminReports || []).forEach((container: any) => {
      const matchDate = matchesDateRange(container.dateStr, dateFrom, dateTo);
      if (matchDate && container.employeesData) {
        container.employeesData.forEach((empData: any) => {
          const matchName = matchAdmin(empData.employeeName, undefined, container.schoolId);
          if (matchName) {
            adminFollowUpReports.push({
              dateStr: container.dateStr,
              followUpType: container.followUpType,
              writer: container.writer,
              school: container.schoolId || data.profile?.schoolName || "",
              branch: empData.branch || container.branch || "",
              ...empData
            });
          }
        });
      }
    });

    const matchUser = (userIdVal?: string, supervisorNameVal?: string, recordSchool?: string, recordBranch?: string) => {
      if (selectedEmployees.length > 0) {
        return selectedEmployees.some(e => 
          (userIdVal && (String(e.id) === String(userIdVal) || String(e.userId) === String(userIdVal))) ||
          (supervisorNameVal && cleanName(e.name) === cleanName(supervisorNameVal))
        );
      }
      
      if (userIdVal) {
        const dirStaff = (data.secretariatStaff || []).find((s: any) => 
          String(s.id) === String(userIdVal) || String(s.userId) === String(userIdVal)
        );
        if (dirStaff) {
          const sSchool = dirStaff.school || recordSchool || "";
          const sBranch = dirStaff.branch || recordBranch || "";
          if (selectedSchool && cleanName(sSchool) !== cleanName(selectedSchool)) return false;
          if (selectedBranch && cleanName(sBranch) !== cleanName(selectedBranch)) return false;
          return true;
        }
      }
      
      if (supervisorNameVal) {
        const dirStaff = (data.secretariatStaff || []).find((s: any) => 
          cleanName(s.name) === cleanName(supervisorNameVal)
        );
        if (dirStaff) {
          const sSchool = dirStaff.school || recordSchool || "";
          const sBranch = dirStaff.branch || recordBranch || "";
          if (selectedSchool && cleanName(sSchool) !== cleanName(selectedSchool)) return false;
          if (selectedBranch && cleanName(sBranch) !== cleanName(selectedBranch)) return false;
          return true;
        }
      }

      if (selectedSchool && recordSchool && cleanName(recordSchool) !== cleanName(selectedSchool)) return false;
      if (selectedBranch && recordBranch && cleanName(recordBranch) !== cleanName(selectedBranch)) return false;
      
      return true;
    };

    // 2. Tasks (data.taskReports)
    const taskReports = (data.taskReports || []).filter((r: any) => {
      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
      return matchDate && matchUser(r.userId, undefined);
    });

    // 3. Added Tasks (data.addedTasks)
    const addedTasks = (data.addedTasks || []).filter((r: any) => {
      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
      return matchDate && matchUser(r.userId, r.supervisorName, r.school, r.branch);
    });

    // 4. Postponed Tasks (data.postponedTasks)
    const postponedTasks = (data.postponedTasks || []).filter((r: any) => {
      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
      return matchDate && matchUser(r.userId, r.supervisorName, r.school, r.branch);
    });

    // 5-7. Issues, Recommendations, Suggestions (data.issueRecommendations)
    const rawIssueRecs = (data.issueRecommendations || []).filter((r: any) => {
      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
      return matchDate && matchUser(r.userId, r.supervisorName, r.school, r.branch);
    });

    // 8. Notebook follow-up logs (data.notebookFollowUpLogs)
    const notebookFollowUpLogs = (data.notebookFollowUpLogs || []).filter((log: any) => {
      const matchDate = matchesDateRange(log.date, dateFrom, dateTo);
      return matchDate && matchUser(log.userId, undefined, log.school, log.branch);
    });

    return {
      adminFollowUpReports,
      taskReports,
      addedTasks,
      postponedTasks,
      rawIssueRecs,
      notebookFollowUpLogs
    };
  }, [queryTriggered, selectedEmployees, data, dateFrom, dateTo, selectedSchool, selectedBranch]);

  // Helper to extract criteria list for a given report
  const getAdminMetricsForReport = (report: any) => {
    const followUpType = report?.followUpType || "";
    const isIndicators = followUpType === "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس";
    if (isIndicators) {
      const metrics: { key: string; label: string }[] = [];
      INDICATORS_DATA.forEach(domain => {
        domain.items.forEach((item, idx) => {
          metrics.push({
            key: `${domain.label}_${idx}`,
            label: item
          });
        });
      });
      return metrics;
    } else {
      const activeSchool = report.school || data.profile?.schoolName || "";
      const activeBranch = report.branch || data.profile?.branch || "";
      const activeBranchKey = activeBranch ? `${activeSchool}_${activeBranch}` : `${activeSchool}_بدون فرع مخصص`;

      let activities = [];
      if (data.adminBranchActivities?.[activeBranchKey]?.[followUpType]) {
        activities = data.adminBranchActivities[activeBranchKey][followUpType];
      } else if (data.adminActivitiesList?.[followUpType]) {
        activities = data.adminActivitiesList[followUpType];
      } else {
        activities = ACTIVITIES_DATA[followUpType] || [];
      }

      return activities.map((act: any, idx: number) => ({
        key: `${followUpType}_${idx}`,
        label: act.text
      }));
    }
  };

  // Grouped reports by followUpType for individual dynamic tables
  const groupedReports = useMemo(() => {
    if (!resultsData || !resultsData.adminFollowUpReports) return {};
    const groups: Record<string, any[]> = {};
    resultsData.adminFollowUpReports.forEach(r => {
      const type = r.followUpType || "متابعة عامة";
      if (!groups[type]) groups[type] = [];
      groups[type].push(r);
    });
    return groups;
  }, [resultsData]);

  // Excel Exporter with Yemeni Theme for Admin
  const handleExportExcel = async () => {
    if (!resultsData) return;
    const profile = data.profile || {};
    const workbook = new ExcelJS.Workbook();
    let sheetsAdded = 0;

    // 1. adminReports
    if (selectedReports.includes("adminReports") && Object.keys(groupedReports).length > 0) {
      Object.entries(groupedReports).forEach(([followUpType, reportsList]) => {
        if (reportsList.length === 0) return;
        const metrics = getAdminMetricsForReport(reportsList[0]);
        
        const headers = [
          "اسم الموظف", "الدور والفرع", "نوع المتابعة",
          ...metrics.map(m => m.label),
          "درجة المخالفات", "ملحوظات المخالفات", "اليوم والتاريخ"
        ];

        const rows = reportsList.map((r: any) => [
          r.employeeName,
          `${r.role || ""} (فرع: ${r.branch || ""})`,
          r.followUpType || "---",
          ...metrics.map(m => r[m.key] !== undefined ? r[m.key] : "---"),
          r.violations_score || 0,
          Array.isArray(r.violations_notes) ? r.violations_notes.join(" | ") : (r.violations_notes || "---"),
          r.dateStr
        ]);

        const sheetName = followUpType.replace("متابعة ", "").substring(0, 30);
        addStyledSheet(workbook, sheetName, `تقرير ${followUpType}`, headers, rows, "9333EA", profile, currentUser);
        sheetsAdded++;
      });
    }

    // 2. tasks
    if (selectedReports.includes("tasks") && resultsData.taskReports && resultsData.taskReports.length > 0) {
      const headers = ["اسم المشرف", "التاريخ", "التاريخ الهجري", "اليوم", "المهام والدرجات وحالة التنفيذ"];
      const rows = resultsData.taskReports.map((r: any) => {
        const staff = (data.secretariatStaff || []).find((s: any) => String(s.id) === String(r.userId) || String(s.userId) === String(r.userId));
        const tasksSummary = (r.tasks || []).map((t: any) => 
          `[${t.taskText} - الحالة: ${t.status === 'done' ? 'تم التنفيذ' : t.status === 'failed' ? 'تعذر التنفيذ' : 'قيد الانتظار'} - الدرجة: ${t.degree}/${t.maxDegree}${t.notes ? ` - ملاحظة: ${t.notes}` : ''}]`
        ).join(" \n");
        return [
          staff?.name || "---",
          r.dateStr,
          r.dateHijri,
          r.dayName,
          tasksSummary
        ];
      });
      addStyledSheet(workbook, "سجل المهام", "سجل تقارير مهام الإداريين والمشرفين", headers, rows, "4F46E5", profile, currentUser);
      sheetsAdded++;
    }

    // 3. addedTasks
    if (selectedReports.includes("addedTasks") && resultsData.addedTasks && resultsData.addedTasks.length > 0) {
      const headers = ["اسم المشرف", "المسمى الوظيفي", "المدرسة/الفرع", "الصف/الشعبة", "نص المهمة", "الحالة", "الفترة", "ملاحظات", "تاريخ الإضافة"];
      const rows: any[][] = [];
      resultsData.addedTasks.forEach((r: any) => {
        (r.tasks || []).forEach((t: any) => {
          rows.push([
            r.supervisorName,
            r.supervisorJob || "---",
            `${r.school} / ${r.branch}`,
            `${r.grade} / ${r.section}`,
            t.taskText,
            t.status === 'done' ? 'منجزة' : t.status === 'in_progress' ? 'قيد التنفيذ' : 'غير منجزة',
            `من ${t.dateFrom} إلى ${t.dateTo}`,
            t.notes || "---",
            r.dateStr
          ]);
        });
      });
      addStyledSheet(workbook, "المهام المضافة", "سجل المهام الإضافية المضافة للمشرفين", headers, rows, "2563EB", profile, currentUser);
      sheetsAdded++;
    }

    // 4. postponedTasks
    if (selectedReports.includes("postponedTasks") && resultsData.postponedTasks && resultsData.postponedTasks.length > 0) {
      const headers = ["اسم المشرف", "المسمى الوظيفي", "المدرسة/الفرع", "الصف/الشعبة", "نص المهمة", "الحالة", "الفترة", "ملاحظات", "تاريخ الإضافة"];
      const rows: any[][] = [];
      resultsData.postponedTasks.forEach((r: any) => {
        (r.tasks || []).forEach((t: any) => {
          rows.push([
            r.supervisorName,
            r.supervisorJob || "---",
            `${r.school} / ${r.branch}`,
            `${r.grade} / ${r.section}`,
            t.taskText,
            t.status === 'done' ? 'منجزة' : t.status === 'in_progress' ? 'قيد التنفيذ' : 'غير منجزة',
            `من ${t.dateFrom} إلى ${t.dateTo}`,
            t.notes || "---",
            r.dateStr
          ]);
        });
      });
      addStyledSheet(workbook, "المهام المرحلة", "سجل المهام المرحلة للمشرفين", headers, rows, "D97706", profile, currentUser);
      sheetsAdded++;
    }

    // 5. issues
    if (selectedReports.includes("issues") && resultsData.rawIssueRecs) {
      const headers = ["اسم المشرف", "المدرسة/الفرع", "المشكلة", "الحالة", "الفترة", "ملاحظات", "تاريخ الرصد"];
      const rows: any[][] = [];
      resultsData.rawIssueRecs.forEach((r: any) => {
        r.items.filter((i: any) => i.type === 'issue').forEach((item: any) => {
          rows.push([
            r.supervisorName,
            `${r.school} / ${r.branch}`,
            item.content,
            item.status === 'solved' ? 'تم الحل' : item.status === 'in_progress_issue' ? 'قيد المعالجة' : 'لم تحل',
            `من ${item.dateFrom} إلى ${item.dateTo}`,
            item.notes || "---",
            r.dateStr
          ]);
        });
      });
      if (rows.length > 0) {
        addStyledSheet(workbook, "المشكلات المرصودة", "سجل المشكلات المرصودة من المشرفين", headers, rows, "DC2626", profile, currentUser);
        sheetsAdded++;
      }
    }

    // 6. recommendations
    if (selectedReports.includes("recommendations") && resultsData.rawIssueRecs) {
      const headers = ["اسم المشرف", "المدرسة/الفرع", "التوصية", "الحالة", "الفترة", "ملاحظات", "تاريخ الرصد"];
      const rows: any[][] = [];
      resultsData.rawIssueRecs.forEach((r: any) => {
        r.items.filter((i: any) => i.type === 'recommendation').forEach((item: any) => {
          rows.push([
            r.supervisorName,
            `${r.school} / ${r.branch}`,
            item.content,
            item.status === 'adopted' ? 'معتمدة' : item.status === 'under_review' ? 'قيد الدراسة' : 'غير معتمدة',
            `من ${item.dateFrom} إلى ${item.dateTo}`,
            item.notes || "---",
            r.dateStr
          ]);
        });
      });
      if (rows.length > 0) {
        addStyledSheet(workbook, "التوصيات الإشرافية", "سجل التوصيات الإشرافية المرصودة", headers, rows, "059669", profile, currentUser);
        sheetsAdded++;
      }
    }

    // 7. suggestions
    if (selectedReports.includes("suggestions") && resultsData.rawIssueRecs) {
      const headers = ["اسم المشرف", "المدرسة/الفرع", "المقترح", "الحالة", "الفترة", "ملاحظات", "تاريخ الرصد"];
      const rows: any[][] = [];
      resultsData.rawIssueRecs.forEach((r: any) => {
        r.items.filter((i: any) => i.type === 'suggestion').forEach((item: any) => {
          rows.push([
            r.supervisorName,
            `${r.school} / ${r.branch}`,
            item.content,
            item.status === 'adopted' ? 'تم الاعتماد' : item.status === 'implemented_differently' ? 'نفذ بطريقة أخرى' : item.status === 'under_review' ? 'قيد الدراسة' : 'غير معتمد',
            `من ${item.dateFrom} إلى ${item.dateTo}`,
            item.notes || "---",
            r.dateStr
          ]);
        });
      });
      if (rows.length > 0) {
        addStyledSheet(workbook, "المقترحات التطويرية", "سجل المقترحات التطويرية من المشرفين", headers, rows, "0D9488", profile, currentUser);
        sheetsAdded++;
      }
    }

    // 8. notebookFollowUp
    if (selectedReports.includes("notebookFollowUp") && resultsData.notebookFollowUpLogs && resultsData.notebookFollowUpLogs.length > 0) {
      const headers = ["اسم المشرف المتابع", "اسم الطالب", "الصف والشعبة", "المادة", "النظافة والخط", "اكتمال الدروس", "تصويب الأخطاء", "تصحيح المعلم", "آخر تصحيح", "ملاحظات"];
      const rows = resultsData.notebookFollowUpLogs.map((log: any) => {
        const staff = (data.secretariatStaff || []).find((s: any) => String(s.id) === String(log.userId) || String(s.userId) === String(log.userId));
        return [
          staff?.name || log.userId || "---",
          log.studentName,
          `${log.grade} / ${log.section}`,
          log.subject,
          log.cleanliness?.rating || "---",
          log.completeness?.rating || "---",
          log.spellingCorrection?.rating || "---",
          log.teacherCorrection?.rating || "---",
          log.correctionDate || "---",
          log.generalNotes || "---"
        ];
      });
      addStyledSheet(workbook, "متابعة كراسات الطلاب", "سجل متابعة وتصحيح كراسات الطلاب الإداري", headers, rows, "0891B2", profile, currentUser);
      sheetsAdded++;
    }

    if (sheetsAdded === 0) {
      toast.error("لا توجد بيانات مطابقة لتصديرها إكسل");
      return;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Admin_Comprehensive_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير ملف الإكسل الشامل للإداريين بنجاح");
  };

  // WhatsApp Exporter for Admins with Visual Emojis
  const handleExportWhatsApp = () => {
    if (!resultsData) return;
    let msg = `*📋 تقارير الكادر الإداري والمشرفين المجمعة 📋*\n`;
    msg += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    msg += `----------------------------------\n\n`;

    // 1. adminReports
    if (selectedReports.includes("adminReports") && Object.keys(groupedReports).length > 0) {
      Object.entries(groupedReports).forEach(([followUpType, reportsList]) => {
        msg += `*📁 [${followUpType}] 📁*\n`;
        reportsList.forEach((r: any, idx: number) => {
          const metrics = getAdminMetricsForReport(r);
          msg += `👤 *${idx + 1}. الموظف:* ${r.employeeName}\n`;
          msg += `💼 *الدور:* ${r.role} (فرع: ${r.branch})\n`;
          msg += `📅 *التاريخ:* ${r.dateStr}\n`;
          msg += `⚙️ *معايير الأداء والمهام:* \n`;
          
          metrics.forEach(m => {
            const val = r[m.key];
            if (val === undefined) return;
            let ratingEmoji = "🟢";
            if (val <= 1) ratingEmoji = "🔴";
            else if (val === 2) ratingEmoji = "🟡";
            else if (val === 3) ratingEmoji = "🔵";
            
            msg += `  ${ratingEmoji} *${m.label}:* ${val} / 4\n`;
          });
          
          msg += `⚠️ *المخالفات:* ${r.violations_score || 0}\n`;
          if (r.violations_notes && r.violations_notes.length > 0) {
            msg += `📝 *ملحوظات المخالفات:* ${Array.isArray(r.violations_notes) ? r.violations_notes.join(", ") : r.violations_notes}\n`;
          }
          msg += `\n`;
        });
        msg += `----------------------------------\n\n`;
      });
    }

    // 2. tasks
    if (selectedReports.includes("tasks") && resultsData.taskReports && resultsData.taskReports.length > 0) {
      msg += `*📁 [تقارير المهام المسندة للمشرفين] 📁*\n`;
      resultsData.taskReports.forEach((r: any, idx: number) => {
        const staff = (data.secretariatStaff || []).find((s: any) => String(s.id) === String(r.userId) || String(s.userId) === String(r.userId));
        msg += `👤 *${idx + 1}. المشرف:* ${staff?.name || "---"} (${r.dateStr})\n`;
        (r.tasks || []).forEach((t: any) => {
          const statusChar = t.status === 'done' ? '✔️' : t.status === 'failed' ? '❌' : '⏳';
          msg += `  ${statusChar} *المهمة:* ${t.taskText} [الدرجة: ${t.degree}/${t.maxDegree}]\n`;
          if (t.notes) msg += `     _ملاحظة:_ ${t.notes}\n`;
        });
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    // 3. addedTasks
    if (selectedReports.includes("addedTasks") && resultsData.addedTasks && resultsData.addedTasks.length > 0) {
      msg += `*📁 [المهام الإضافية المضافة] 📁*\n`;
      resultsData.addedTasks.forEach((r: any, idx: number) => {
        msg += `👤 *${idx + 1}. المشرف:* ${r.supervisorName} (${r.school}/${r.branch})\n`;
        (r.tasks || []).forEach((t: any) => {
          const statusChar = t.status === 'done' ? '✔️' : t.status === 'in_progress' ? '⏳' : '❌';
          msg += `  ${statusChar} *المهمة:* ${t.taskText} (من ${t.dateFrom} إلى ${t.dateTo})\n`;
        });
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    // 4. postponedTasks
    if (selectedReports.includes("postponedTasks") && resultsData.postponedTasks && resultsData.postponedTasks.length > 0) {
      msg += `*📁 [المهام المرحلة] 📁*\n`;
      resultsData.postponedTasks.forEach((r: any, idx: number) => {
        msg += `👤 *${idx + 1}. المشرف:* ${r.supervisorName} (${r.school}/${r.branch})\n`;
        (r.tasks || []).forEach((t: any) => {
          const statusChar = t.status === 'done' ? '✔️' : t.status === 'in_progress' ? '⏳' : '❌';
          msg += `  ${statusChar} *المهمة:* ${t.taskText} (من ${t.dateFrom} إلى ${t.dateTo})\n`;
        });
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    // 5. issues
    const issuesList = resultsData.rawIssueRecs.filter((r: any) => r.items.some((i: any) => i.type === 'issue'));
    if (selectedReports.includes("issues") && issuesList.length > 0) {
      msg += `*📁 [المشكلات المرصودة] 📁*\n`;
      let count = 1;
      issuesList.forEach((r: any) => {
        r.items.filter((i: any) => i.type === 'issue').forEach((item: any) => {
          const statusChar = item.status === 'solved' ? '✔️ حلّت' : item.status === 'in_progress_issue' ? '⏳ قيد الحل' : '❌ لم تحل';
          msg += `👤 *${count++}. المشرف:* ${r.supervisorName}\n`;
          msg += `⚠️ *المشكلة:* ${item.content} (${statusChar})\n`;
          msg += `📅 *تاريخ الرصد:* ${r.dateStr}\n\n`;
        });
      });
      msg += `----------------------------------\n\n`;
    }

    // 6. recommendations
    const recsList = resultsData.rawIssueRecs.filter((r: any) => r.items.some((i: any) => i.type === 'recommendation'));
    if (selectedReports.includes("recommendations") && recsList.length > 0) {
      msg += `*📁 [التوصيات الإشرافية] 📁*\n`;
      let count = 1;
      recsList.forEach((r: any) => {
        r.items.filter((i: any) => i.type === 'recommendation').forEach((item: any) => {
          const statusChar = item.status === 'adopted' ? '✔️ معتمدة' : item.status === 'under_review' ? '⏳ قيد الدراسة' : '❌ مرفوضة';
          msg += `👤 *${count++}. المشرف:* ${r.supervisorName}\n`;
          msg += `📌 *التوصية:* ${item.content} (${statusChar})\n`;
          msg += `📅 *تاريخ الرصد:* ${r.dateStr}\n\n`;
        });
      });
      msg += `----------------------------------\n\n`;
    }

    // 7. suggestions
    const suggestionsList = resultsData.rawIssueRecs.filter((r: any) => r.items.some((i: any) => i.type === 'suggestion'));
    if (selectedReports.includes("suggestions") && suggestionsList.length > 0) {
      msg += `*📁 [المقترحات التطويرية] 📁*\n`;
      let count = 1;
      suggestionsList.forEach((r: any) => {
        r.items.filter((i: any) => i.type === 'suggestion').forEach((item: any) => {
          const statusChar = item.status === 'adopted' ? '✔️ معتمد' : item.status === 'implemented_differently' ? '🔵 نفذ بطريقة أخرى' : item.status === 'under_review' ? '⏳ قيد الدراسة' : '❌ مرفوض';
          msg += `👤 *${count++}. المشرف:* ${r.supervisorName}\n`;
          msg += `💡 *المقترح:* ${item.content} (${statusChar})\n`;
          msg += `📅 *تاريخ الرصد:* ${r.dateStr}\n\n`;
        });
      });
      msg += `----------------------------------\n\n`;
    }

    // 8. notebookFollowUp
    if (selectedReports.includes("notebookFollowUp") && resultsData.notebookFollowUpLogs && resultsData.notebookFollowUpLogs.length > 0) {
      msg += `*📁 [سجل متابعة كراسات الطلاب إدارياً] 📁*\n`;
      resultsData.notebookFollowUpLogs.forEach((log: any, idx: number) => {
        const staff = (data.secretariatStaff || []).find((s: any) => String(s.id) === String(log.userId) || String(s.userId) === String(log.userId));
        msg += `👤 *${idx + 1}. الطالب:* ${log.studentName} (${log.grade}/${log.section})\n`;
        msg += `📚 *المادة:* ${log.subject} | ✍️ *المشرف المتابع:* ${staff?.name || log.userId}\n`;
        msg += `✨ *خط ونظافة:* ${log.cleanliness?.rating || "---"} | 📖 *اكتمال:* ${log.completeness?.rating || "---"} | 📝 *تصحيح المعلم:* ${log.teacherCorrection?.rating || "---"}\n`;
        if (log.generalNotes) msg += `   _ملاحظة:_ ${log.generalNotes}\n`;
        msg += `\n`;
      });
      msg += `----------------------------------\n\n`;
    }

    msg += `✍️ *إعداد التقرير:* ${currentUser?.name || "..."}\n`;
    msg += `🧑‍💼 *مدير الفرع:* ${data.profile?.branchManager || "..."}\n`;

    msg += `\n${getReportMessageFooter()}`;
    shareViaWhatsApp(msg);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600"
            title="رجوع"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Briefcase className="text-purple-600" size={24} />
              تقارير الإداريين والموظفين الشاملة
            </h2>
            <p className="text-xs text-slate-500 font-bold">البحث والفلترة المجمعة لتقارير أداء الكادر الإداري والخدمي والعمالي</p>
          </div>
        </div>
        <div className="flex gap-2">
          {queryTriggered && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors print:hidden"
            >
              <Printer size={16} />
              طباعة التقرير
            </button>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 print:hidden">
        {/* Dynamic School/Branch Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">المدرسة</label>
            <select
              value={selectedSchool}
              onChange={(e) => {
                setSelectedSchool(e.target.value);
                setSelectedBranch("");
                setSelectedEmployees([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-purple-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع المدارس</option>
              {availableSchools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">الفرع</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedEmployees([]);
                setQueryTriggered(false);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-purple-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
            >
              <option value="">جميع الفروع</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Name Search and Autocomplete */}
        <div className="relative space-y-3">
          <label className="text-xs font-bold text-slate-600 block">البحث عن الموظفين واختيارهم</label>
          <div className="relative w-full">
            <input
              type="text"
              placeholder="اكتب اسم الموظف للبحث والاختيار..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-purple-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11 text-right"
            />
            <Search className="absolute right-3.5 top-3.5 text-slate-400" size={16} />
            
            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showDropdown && (searchInput.trim() || autocompleteSuggestions.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-50"
                >
                  {autocompleteSuggestions.length > 0 ? (
                    autocompleteSuggestions.map((emp: any) => (
                      <button
                        key={emp.id}
                        onClick={() => handleAddEmployee(emp)}
                        className="w-full text-right px-4 py-3 hover:bg-purple-50 transition-colors text-sm font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>{emp.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
                          {emp.school} - {emp.branch}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs font-semibold">
                      {searchInput.trim() ? "لا توجد نتائج مطابقة للبحث" : "اكتب اسم الموظف لعرض المقترحات"}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllEmployees}
              className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl font-bold text-sm hover:bg-purple-100 transition-colors whitespace-nowrap h-11"
            >
              تحديد الكل المصفى
            </button>
            <button
              onClick={handleClearEmployees}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors whitespace-nowrap h-11"
            >
              إلغاء التحديد
            </button>
          </div>

          {/* Click outside to close helper */}
          {showDropdown && (
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          )}

          {/* Selected Chips */}
          {selectedEmployees.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              {selectedEmployees.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm"
                >
                  {e.name}
                  <button
                    onClick={() => handleRemoveEmployee(e.id)}
                    className="p-0.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter & Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">من تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setQueryTriggered(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-2">إلى تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setQueryTriggered(false);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 font-semibold text-slate-700 bg-slate-50 text-sm h-11"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-xs font-bold text-slate-600 block mb-2">نوع التقارير المطلوبة</label>
            <button
              onClick={() => setShowReportDropdown(!showReportDropdown)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none bg-slate-50 text-sm h-11 flex items-center justify-between text-slate-700 font-semibold text-right"
            >
              <span>المختارة ({selectedReports.length})</span>
              <ChevronDown size={16} />
            </button>

            <AnimatePresence>
              {showReportDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowReportDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 space-y-2.5"
                  >
                    {reportOptions.map((opt) => {
                      const active = selectedReports.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-right"
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => handleToggleReport(opt.id)}
                            className="w-4 h-4 rounded text-purple-600 cursor-pointer focus:ring-0"
                          />
                          <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                        </label>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* View Trigger and Export Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (selectedEmployees.length === 0 && !selectedSchool && !selectedBranch) {
                toast.error("يرجى تحديد موظف واحد على الأقل، أو تصفية الموظفين بالمدرسة/الفرع");
                return;
              }
              setQueryTriggered(true);
            }}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-purple-100 hover:shadow-xl hover:shadow-purple-200 transition-all hover:-translate-y-0.5 text-sm"
          >
            🔍 عرض التقارير المجمعة
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!queryTriggered || Object.keys(groupedReports).length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border shadow-sm ${queryTriggered && Object.keys(groupedReports).length > 0
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer"
              : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
          >
            <FileSpreadsheet size={18} />
            تصدير إكسل الشامل
          </button>

          <button
            onClick={handleExportWhatsApp}
            disabled={!queryTriggered || Object.keys(groupedReports).length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border shadow-sm ${queryTriggered && Object.keys(groupedReports).length > 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
              : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
          >
            <MessageCircle size={18} />
            إرسال عبر واتساب
          </button>
        </div>
      </div>

      {/* Results Tables Grouped dynamically by followUpType */}
      {queryTriggered && resultsData && (
        <div className="space-y-10">
          
          {selectedReports.includes("adminReports") && (
            <>
              {Object.entries(groupedReports).map(([followUpType, reportsList]) => {
                if (reportsList.length === 0) return null;
                const metrics = getAdminMetricsForReport(reportsList[0]);

                return (
                  <div key={followUpType} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
                      <h3 className="font-black text-lg flex items-center gap-2">
                        <ClipboardList size={22} />
                        {followUpType}
                      </h3>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                        {reportsList.length} سجل
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                            <th className="p-4 font-bold text-sm">اسم الموظف</th>
                            <th className="p-4 font-bold text-sm">الدور والفرع</th>
                            <th className="p-4 font-bold text-sm">نوع المتابعة</th>
                            {metrics.map(m => (
                              <th key={m.key} className="p-4 font-bold text-sm">{m.label}</th>
                            ))}
                            <th className="p-4 font-bold text-sm">درجة المخالفات</th>
                            <th className="p-4 font-bold text-sm">ملحوظات المخالفات والإجراءات</th>
                            <th className="p-4 font-bold text-sm">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportsList.map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-800">{r.employeeName}</td>
                              <td className="p-4 text-sm text-slate-600">
                                <div className="font-semibold text-slate-700">{r.role}</div>
                                <div className="text-xs text-slate-400">فرع: {r.branch}</div>
                              </td>
                              <td className="p-4 text-sm font-semibold text-slate-600">{r.followUpType || "---"}</td>
                              {metrics.map(m => (
                                <td key={m.key} className="p-4 text-sm text-center font-bold text-slate-700">
                                  {r[m.key] !== undefined ? r[m.key] : "---"}
                                </td>
                              ))}
                              <td className="p-4 text-sm text-center font-bold text-rose-600">{r.violations_score || 0}</td>
                              <td className="p-4 text-xs whitespace-normal max-w-[250px] text-slate-500">
                                {Array.isArray(r.violations_notes) ? r.violations_notes.join(" | ") : (r.violations_notes || "---")}
                                {r.additional_violation_notes && <div className="mt-1 font-bold text-slate-700">تنبيه: {r.additional_violation_notes}</div>}
                              </td>
                              <td className="p-4 text-sm text-slate-500">
                                <div className="font-semibold">{r.dateStr}</div>
                                <div className="text-[10px] text-slate-400">الكاتب: {r.writer || "---"}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {resultsData.adminFollowUpReports.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 font-semibold text-sm">
                  لا توجد تقارير متابعة إدارية مطابقة للبحث
                </div>
              )}
            </>
          )}

          {/* Table: Tasks */}
          {selectedReports.includes("tasks") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardList size={22} />
                  سجل تقارير المهام
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.taskReports.length} تقرير
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المشرف</th>
                      <th className="p-4 font-bold text-sm">التاريخ</th>
                      <th className="p-4 font-bold text-sm">التاريخ الهجري / اليوم</th>
                      <th className="p-4 font-bold text-sm">المهام المسندة وحالتها</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.taskReports.map((r: any) => {
                      const staff = (data.secretariatStaff || []).find((s: any) => String(s.id) === String(r.userId) || String(s.userId) === String(r.userId));
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{staff?.name || "---"}</td>
                          <td className="p-4 text-sm font-semibold text-slate-700">{r.dateStr}</td>
                          <td className="p-4 text-sm text-slate-600">
                            <div>{r.dateHijri}</div>
                            <div className="text-xs text-slate-400">{r.dayName}</div>
                          </td>
                          <td className="p-4 text-sm text-slate-600 whitespace-normal min-w-[300px]">
                            <div className="space-y-2">
                              {(r.tasks || []).map((t: any, tIdx: number) => (
                                <div key={t.id || tIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="font-bold text-xs text-slate-700">{t.taskText}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                                      t.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                      t.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                      {t.status === 'done' ? 'تم التنفيذ' : t.status === 'failed' ? 'تعذر التنفيذ' : 'قيد الانتظار'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                    <span>الدرجة: {t.degree} / {t.maxDegree}</span>
                                    {t.failReason && <span className="text-rose-600 font-bold">السبب: {t.failReason === 'other' ? t.failOtherReason : t.failReason}</span>}
                                  </div>
                                  {t.notes && <div className="text-[10px] text-slate-400 italic">ملاحظات: {t.notes}</div>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {resultsData.taskReports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد تقارير مهام مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table: Added Tasks */}
          {selectedReports.includes("addedTasks") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardList size={22} />
                  سجل المهام المضافة
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.addedTasks.length} تقرير
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المشرف</th>
                      <th className="p-4 font-bold text-sm">المسمى الوظيفي</th>
                      <th className="p-4 font-bold text-sm">المدرسة / الفرع</th>
                      <th className="p-4 font-bold text-sm">الصف / الشعبة</th>
                      <th className="p-4 font-bold text-sm">المهمة وتفاصيلها</th>
                      <th className="p-4 font-bold text-sm">تاريخ الإضافة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.addedTasks.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{r.supervisorName}</td>
                        <td className="p-4 text-sm text-slate-600">{r.supervisorJob || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">{r.school} / {r.branch}</td>
                        <td className="p-4 text-sm text-slate-600">{r.grade} / {r.section}</td>
                        <td className="p-4 text-sm text-slate-600 whitespace-normal min-w-[300px]">
                          <div className="space-y-2">
                            {(r.tasks || []).map((t: any, tIdx: number) => (
                              <div key={t.id || tIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-xs text-slate-700">{t.taskText}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                                    t.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    t.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>
                                    {t.status === 'done' ? 'منجزة' : t.status === 'in_progress' ? 'قيد التنفيذ' : 'غير منجزة'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  الفترة: من {t.dateFrom} إلى {t.dateTo}
                                </div>
                                {t.notes && <div className="text-[10px] text-slate-500">ملاحظات: {t.notes}</div>}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{r.dateStr}</td>
                      </tr>
                    ))}
                    {resultsData.addedTasks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد مهام مضافة مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table: Postponed Tasks */}
          {selectedReports.includes("postponedTasks") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardList size={22} />
                  سجل المهام المرحلة
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.postponedTasks.length} تقرير
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المشرف</th>
                      <th className="p-4 font-bold text-sm">المسمى الوظيفي</th>
                      <th className="p-4 font-bold text-sm">المدرسة / الفرع</th>
                      <th className="p-4 font-bold text-sm">الصف / الشعبة</th>
                      <th className="p-4 font-bold text-sm">المهمة وتفاصيلها</th>
                      <th className="p-4 font-bold text-sm">تاريخ الإضافة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.postponedTasks.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{r.supervisorName}</td>
                        <td className="p-4 text-sm text-slate-600">{r.supervisorJob || "---"}</td>
                        <td className="p-4 text-sm text-slate-600">{r.school} / {r.branch}</td>
                        <td className="p-4 text-sm text-slate-600">{r.grade} / {r.section}</td>
                        <td className="p-4 text-sm text-slate-600 whitespace-normal min-w-[300px]">
                          <div className="space-y-2">
                            {(r.tasks || []).map((t: any, tIdx: number) => (
                              <div key={t.id || tIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-xs text-slate-700">{t.taskText}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                                    t.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    t.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>
                                    {t.status === 'done' ? 'منجزة' : t.status === 'in_progress' ? 'قيد التنفيذ' : 'غير منجزة'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  الفترة: من {t.dateFrom} إلى {t.dateTo}
                                </div>
                                {t.notes && <div className="text-[10px] text-slate-500">ملاحظات: {t.notes}</div>}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{r.dateStr}</td>
                      </tr>
                    ))}
                    {resultsData.postponedTasks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد مهام مرحلة مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table: Issues */}
          {selectedReports.includes("issues") && (() => {
            const list = resultsData.rawIssueRecs.filter((r: any) => r.items.some((i: any) => i.type === 'issue'));
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <AlertCircle size={22} />
                    سجل المشكلات المرصودة
                  </h3>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                    {list.reduce((acc, r) => acc + r.items.filter((i: any) => i.type === 'issue').length, 0)} مشكلة
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                        <th className="p-4 font-bold text-sm">اسم المشرف</th>
                        <th className="p-4 font-bold text-sm">المدرسة / الفرع</th>
                        <th className="p-4 font-bold text-sm">المشكلة</th>
                        <th className="p-4 font-bold text-sm">الحالة</th>
                        <th className="p-4 font-bold text-sm">الفترة</th>
                        <th className="p-4 font-bold text-sm">ملاحظات</th>
                        <th className="p-4 font-bold text-sm">تاريخ الرصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((r: any) => 
                        r.items.filter((i: any) => i.type === 'issue').map((item: any, idx: number) => (
                          <tr key={`${r.id}-${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{r.supervisorName}</td>
                            <td className="p-4 text-sm text-slate-600">{r.school} / {r.branch}</td>
                            <td className="p-4 text-sm text-slate-800 font-bold whitespace-normal min-w-[200px]">{item.content}</td>
                            <td className="p-4 text-sm text-slate-600">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                                item.status === 'solved' ? 'bg-green-50 text-green-700 border-green-100' :
                                item.status === 'in_progress_issue' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {item.status === 'solved' ? 'تم الحل' : item.status === 'in_progress_issue' ? 'قيد المعالجة' : 'لم تحل'}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500">من {item.dateFrom} إلى {item.dateTo}</td>
                            <td className="p-4 text-sm text-slate-600 whitespace-normal min-w-[150px]">{item.notes || "---"}</td>
                            <td className="p-4 text-sm text-slate-500">{r.dateStr}</td>
                          </tr>
                        ))
                      )}
                      {list.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-sm">
                            لا توجد مشكلات مرصودة مطابقة للبحث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Table: Recommendations */}
          {selectedReports.includes("recommendations") && (() => {
            const list = resultsData.rawIssueRecs.filter((r: any) => r.items.some((i: any) => i.type === 'recommendation'));
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <UserCheck size={22} />
                    سجل التوصيات الإشرافية
                  </h3>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                    {list.reduce((acc, r) => acc + r.items.filter((i: any) => i.type === 'recommendation').length, 0)} توصية
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                        <th className="p-4 font-bold text-sm">اسم المشرف</th>
                        <th className="p-4 font-bold text-sm">المدرسة / الفرع</th>
                        <th className="p-4 font-bold text-sm">التوصية</th>
                        <th className="p-4 font-bold text-sm">الحالة</th>
                        <th className="p-4 font-bold text-sm">الفترة</th>
                        <th className="p-4 font-bold text-sm">ملاحظات</th>
                        <th className="p-4 font-bold text-sm">تاريخ الرصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((r: any) => 
                        r.items.filter((i: any) => i.type === 'recommendation').map((item: any, idx: number) => (
                          <tr key={`${r.id}-${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{r.supervisorName}</td>
                            <td className="p-4 text-sm text-slate-600">{r.school} / {r.branch}</td>
                            <td className="p-4 text-sm text-slate-800 font-bold whitespace-normal min-w-[200px]">{item.content}</td>
                            <td className="p-4 text-sm text-slate-600">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                                item.status === 'adopted' ? 'bg-green-50 text-green-700 border-green-100' :
                                item.status === 'under_review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {item.status === 'adopted' ? 'معتمدة' : item.status === 'under_review' ? 'قيد الدراسة' : 'غير معتمدة'}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500">من {item.dateFrom} إلى {item.dateTo}</td>
                            <td className="p-4 text-sm text-slate-600 whitespace-normal min-w-[150px]">{item.notes || "---"}</td>
                            <td className="p-4 text-sm text-slate-500">{r.dateStr}</td>
                          </tr>
                        ))
                      )}
                      {list.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-sm">
                            لا توجد توصيات إشرافية مطابقة للبحث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Table: Suggestions */}
          {selectedReports.includes("suggestions") && (() => {
            const list = resultsData.rawIssueRecs.filter((r: any) => r.items.some((i: any) => i.type === 'suggestion'));
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <UserCheck size={22} />
                    سجل المقترحات التطويرية
                  </h3>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                    {list.reduce((acc, r) => acc + r.items.filter((i: any) => i.type === 'suggestion').length, 0)} مقترح
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                        <th className="p-4 font-bold text-sm">اسم المشرف</th>
                        <th className="p-4 font-bold text-sm">المدرسة / الفرع</th>
                        <th className="p-4 font-bold text-sm">المقترح</th>
                        <th className="p-4 font-bold text-sm">الحالة</th>
                        <th className="p-4 font-bold text-sm">الفترة</th>
                        <th className="p-4 font-bold text-sm">ملاحظات</th>
                        <th className="p-4 font-bold text-sm">تاريخ الرصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((r: any) => 
                        r.items.filter((i: any) => i.type === 'suggestion').map((item: any, idx: number) => (
                          <tr key={`${r.id}-${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{r.supervisorName}</td>
                            <td className="p-4 text-sm text-slate-600">{r.school} / {r.branch}</td>
                            <td className="p-4 text-sm text-slate-800 font-bold whitespace-normal min-w-[200px]">{item.content}</td>
                            <td className="p-4 text-sm text-slate-600">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                                item.status === 'adopted' ? 'bg-green-50 text-green-700 border-green-100' :
                                item.status === 'implemented_differently' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                item.status === 'under_review' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {item.status === 'adopted' ? 'تم الاعتماد' : item.status === 'implemented_differently' ? 'نفذ بطريقة أخرى' : item.status === 'under_review' ? 'قيد الدراسة' : 'غير معتمد'}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500">من {item.dateFrom} إلى {item.dateTo}</td>
                            <td className="p-4 text-sm text-slate-600 whitespace-normal min-w-[150px]">{item.notes || "---"}</td>
                            <td className="p-4 text-sm text-slate-500">{r.dateStr}</td>
                          </tr>
                        ))
                      )}
                      {list.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-sm">
                            لا توجد مقترحات تطويرية مطابقة للبحث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Table: Notebook Follow-up */}
          {selectedReports.includes("notebookFollowUp") && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-cyan-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <FileText size={22} />
                  سجل متابعة وتصحيح كراسات الطلاب (التقرير الإداري)
                </h3>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {resultsData.notebookFollowUpLogs.length} سجل
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                      <th className="p-4 font-bold text-sm">اسم المشرف المتابع</th>
                      <th className="p-4 font-bold text-sm">اسم الطالب</th>
                      <th className="p-4 font-bold text-sm">الصف والشعبة</th>
                      <th className="p-4 font-bold text-sm">المادة</th>
                      <th className="p-4 font-bold text-sm">النظافة والخط</th>
                      <th className="p-4 font-bold text-sm">اكتمال الدروس</th>
                      <th className="p-4 font-bold text-sm">تصويب الأخطاء</th>
                      <th className="p-4 font-bold text-sm">تصحيح المعلم</th>
                      <th className="p-4 font-bold text-sm">آخر تصحيح</th>
                      <th className="p-4 font-bold text-sm">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.notebookFollowUpLogs.map((log: any) => {
                      const staff = (data.secretariatStaff || []).find((s: any) => String(s.id) === String(log.userId) || String(s.userId) === String(log.userId));
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{staff?.name || log.userId || "---"}</td>
                          <td className="p-4 font-bold text-slate-700">{log.studentName}</td>
                          <td className="p-4 text-sm text-slate-600">{log.grade} / {log.section}</td>
                          <td className="p-4 text-sm font-bold text-cyan-600">{log.subject}</td>
                          <td className="p-4 text-sm text-center font-semibold text-slate-600">{log.cleanliness?.rating || "---"}</td>
                          <td className="p-4 text-sm text-center font-semibold text-slate-600">{log.completeness?.rating || "---"}</td>
                          <td className="p-4 text-sm text-center font-semibold text-slate-600">{log.spellingCorrection?.rating || "---"}</td>
                          <td className="p-4 text-sm text-center font-semibold text-slate-600">{log.teacherCorrection?.rating || "---"}</td>
                          <td className="p-4 text-sm text-slate-500">{log.correctionDate || "---"}</td>
                          <td className="p-4 text-xs whitespace-normal max-w-[200px] text-slate-500">{log.generalNotes || "---"}</td>
                        </tr>
                      );
                    })}
                    {resultsData.notebookFollowUpLogs.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold text-sm">
                          لا توجد سجلات متابعة كراسات مطابقة للبحث
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
}

// ==========================================
// 5. Statistical Reports View
// ==========================================
interface StatisticalReportsViewProps {
  data: any;
  isSuperAdmin: boolean;
  userSchools: string[];
  onBack: () => void;
  currentUser: any;
}

const statisticalReportCategories = [
  {
    label: "تقارير المعلم",
    color: "text-blue-600 border-blue-200 bg-blue-50/30",
    iconColor: "text-blue-500",
    items: [
      { id: "teacher_attendance", label: "الانضباط الوظيفي في الحضور" },
      { id: "teacher_coverages", label: "خلاصة التغطيات" },
      { id: "teacher_notebooks", label: "خلاصة تصحيح الدفاتر والواجبات" },
      { id: "teacher_daily_prep", label: "تقارير التحضير اليومي" }
    ]
  },
  {
    label: "تقارير الإداري",
    color: "text-purple-600 border-purple-200 bg-purple-50/30",
    iconColor: "text-purple-500",
    items: [
      { id: "admin_problems", label: "تقارير المشكلات" },
      { id: "admin_recommendations", label: "تقارير التوصيات" },
      { id: "admin_suggestions", label: "تقارير المقترحات" },
      { id: "admin_circulars", label: "خلاصة التعميمات" },
      { id: "admin_surveys", label: "خلاصة الاستطلاعات" },
      { id: "admin_training", label: "تقارير الدورات التدريبية" }
    ]
  },
  {
    label: "تقارير الطلاب",
    color: "text-amber-600 border-amber-200 bg-amber-50/30",
    iconColor: "text-amber-500",
    items: [
      { id: "student_health", label: "الحالات الصحية الخاصة" },
      { id: "student_absence", label: "تقارير الغياب الطلابي" },
      { id: "student_violations", label: "خلاصة المخالفات المتكررة" },
      { id: "student_grades", label: "نتائج درجات الطلاب" },
      { id: "student_blacklist", label: "القائمة السوداء" },
      { id: "student_honors", label: "قائمة المتميزين" }
    ]
  },
  {
    label: "تقارير الإتلاف والصيانة",
    color: "text-rose-600 border-rose-200 bg-rose-50/30",
    iconColor: "text-rose-500",
    items: [
      { id: "maintenance_damage", label: "تقارير الإتلاف" },
      { id: "maintenance_repair", label: "تقارير الصيانة" }
    ]
  },
  {
    label: "المشرف التربوي",
    color: "text-emerald-600 border-emerald-200 bg-emerald-50/30",
    iconColor: "text-emerald-500",
    items: [
      { id: "supervisor_visits", label: "خلاصة الزيارات الصفية" },
      { id: "supervisor_final_visits", label: "التقارير الختامية للزيارات" },
      { id: "supervisor_strategies", label: "تقارير الاستراتيجيات المنفذة" },
      { id: "supervisor_teaching_aids", label: "تقارير الوسائل التعليمية المنفذة" },
      { id: "supervisor_programs", label: "تقارير البرامج المنفذة" }
    ]
  }
];

const StatisticalReportsView: React.FC<StatisticalReportsViewProps> = ({
  data,
  isSuperAdmin,
  userSchools,
  onBack,
  currentUser,
}) => {
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const checkBranchMatch = (itemBranch: string) => {
    if (!selectedBranch || selectedBranch === "الكل" || selectedBranch === "all") {
      return true;
    }
    const cleanItemBranch = cleanName(itemBranch || "");
    const selectedBranches = selectedBranch.split(/[،,]/).map(b => cleanName(b.trim())).filter(Boolean);
    if (selectedBranches.length === 0) return true;
    return selectedBranches.includes(cleanItemBranch);
  };
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [periodicity, setPeriodicity] = useState("monthly");
  const [queryTriggered, setQueryTriggered] = useState(false);

  // States for dynamic grades statistics
  const [gradeSheets, setGradeSheets] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradesDisplayMode, setGradesDisplayMode] = useState<"total" | "exam_only">("total");
  const [healthSortBy, setHealthSortBy] = useState<"grade" | "disease">("grade");

  // States for Teacher Statistical Reports
  const [showTeachersReport, setShowTeachersReport] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [customMaxGrades, setCustomMaxGrades] = useState<Record<string, number>>(() => {
    const defaults = {
      attendance: 5,
      appearance: 5,
      preparation: 10,
      supervision_queue: 5,
      supervision_rest: 5,
      supervision_end: 5,
      correction_notebooks: 10,
      correction_books: 10,
      correction_followup: 10,
      teaching_aids: 10,
      extra_activities: 10,
      radio: 5,
      creativity: 5,
      zero_period: 5,
    };
    if (data && data.maxGrades) {
      return {
        attendance: data.maxGrades.attendance ?? defaults.attendance,
        appearance: data.maxGrades.appearance ?? defaults.appearance,
        preparation: data.maxGrades.preparation ?? defaults.preparation,
        supervision_queue: data.maxGrades.supervision_queue ?? defaults.supervision_queue,
        supervision_rest: data.maxGrades.supervision_rest ?? defaults.supervision_rest,
        supervision_end: data.maxGrades.supervision_end ?? defaults.supervision_end,
        correction_notebooks: data.maxGrades.correction_notebooks ?? defaults.correction_notebooks,
        correction_books: data.maxGrades.correction_books ?? defaults.correction_books,
        correction_followup: data.maxGrades.correction_followup ?? defaults.correction_followup,
        teaching_aids: data.maxGrades.teaching_aids ?? defaults.teaching_aids,
        extra_activities: data.maxGrades.extra_activities ?? defaults.extra_activities,
        radio: data.maxGrades.radio ?? defaults.radio,
        creativity: data.maxGrades.creativity ?? defaults.creativity,
        zero_period: data.maxGrades.zero_period ?? defaults.zero_period,
      };
    }
    return defaults;
  });

  // Calculate calendar days in selected range
  const calendarDaysRange = useMemo(() => {
    let fromDate = dateFrom;
    let toDate = dateTo;
    
    if (!fromDate || !toDate) {
      const dates = (data.dailyReports || [])
        .map((r: any) => r.dateStr)
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        if (!fromDate) fromDate = dates[0];
        if (!toDate) toDate = dates[dates.length - 1];
      }
    }
    
    if (!fromDate || !toDate) {
      return { diffDays: 30, fromDate, toDate };
    }
    
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return { diffDays, fromDate, toDate };
  }, [dateFrom, dateTo, data.dailyReports]);

  // Compute divisor days based on daysPerWeek and weeks
  const divisorDays = useMemo(() => {
    const { diffDays } = calendarDaysRange;
    const weeks = Math.floor(diffDays / 7);
    return weeks > 0 ? (weeks * daysPerWeek) : Math.max(1, diffDays);
  }, [calendarDaysRange, daysPerWeek]);

  // Filter teachers for current selection
  const teachersListForReport = useMemo(() => {
    return (data.secretariatStaff || []).filter((s: any) => {
      const matchSchool = !selectedSchool || s.school === selectedSchool;
      const matchBranch = checkBranchMatch(s.branch);
      const jobTitles = s.jobTitles || [];
      const hasTeacherRole = jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس");
      return matchSchool && matchBranch && hasTeacherRole;
    });
  }, [data.secretariatStaff, selectedSchool, selectedBranch]);

  // Filter dailyReports for selected school and dates
  const filteredDailyReports = useMemo(() => {
    return (data.dailyReports || []).filter((r: any) => {
      const activeSch = selectedSchool ? String(selectedSchool).trim() : "";
      const rSchools = [r.schoolId, r.schoolName, r.school]
        .filter(Boolean)
        .flatMap((s: string) => String(s).split(",").map((x: string) => x.trim()));
      if (activeSch && activeSch !== "all" && rSchools.length > 0) {
        const match = rSchools.includes(activeSch) || activeSch.split(",").map((x: string) => x.trim()).some((s) => rSchools.includes(s));
        if (!match) return false;
      }
      return matchesDateRange(r.dateStr, dateFrom, dateTo);
    });
  }, [data.dailyReports, selectedSchool, dateFrom, dateTo]);

  // Aggregate teacher daily metrics
  const teacherPerformanceData = useMemo(() => {
    const criteriaKeys = [
      "attendance",
      "appearance",
      "preparation",
      "supervision_queue",
      "supervision_rest",
      "supervision_end",
      "correction_notebooks",
      "correction_books",
      "correction_followup",
      "teaching_aids",
      "extra_activities",
      "radio",
      "creativity",
      "zero_period",
    ];

    return teachersListForReport.map((teacher: any) => {
      const scoresSum: Record<string, number> = {};
      criteriaKeys.forEach(k => { scoresSum[k] = 0; });
      let activeDaysCount = 0;

      filteredDailyReports.forEach((r: any) => {
        const tData = r.teachersData?.find(
          (td: any) => cleanName(td.teacherName) === cleanName(teacher.name)
        );
        if (tData) {
          activeDaysCount++;
          criteriaKeys.forEach(k => {
            if (typeof tData[k] === "number") {
              scoresSum[k] += tData[k];
            } else if (typeof tData[k] === "string" && !isNaN(Number(tData[k]))) {
              scoresSum[k] += Number(tData[k]);
            }
          });
        }
      });

      const criterionPcts: Record<string, number> = {};
      let totalEarnedScore = 0;
      let totalMaxScore = 0;

      criteriaKeys.forEach(k => {
        const maxScoreOfCriterion = customMaxGrades[k] ?? 5;
        const totalMaxForPeriod = divisorDays * maxScoreOfCriterion;
        const sumOfScore = scoresSum[k];
        
        criterionPcts[k] = totalMaxForPeriod > 0
          ? Math.round((sumOfScore / totalMaxForPeriod) * 100)
          : 0;

        totalEarnedScore += sumOfScore;
        totalMaxScore += totalMaxForPeriod;
      });

      const overallPct = totalMaxScore > 0
        ? Math.round((totalEarnedScore / totalMaxScore) * 100)
        : 0;

      return {
        id: teacher.id || Math.random().toString(),
        name: teacher.name,
        branch: teacher.branch,
        gender: teacher.gender,
        scoresSum,
        criterionPcts,
        overallPct,
        activeDaysCount,
        totalEarnedScore,
        totalMaxScore,
      };
    });
  }, [teachersListForReport, filteredDailyReports, customMaxGrades, divisorDays]);

  // Compute highest/lowest criteria and teachers
  const statsSummary = useMemo(() => {
    const criteriaKeys = [
      { key: "attendance", label: "الحضور اليومي" },
      { key: "appearance", label: "المظهر الشخصي" },
      { key: "preparation", label: "اكتمال التحضير" },
      { key: "supervision_queue", label: "إشراف الطابور" },
      { key: "supervision_rest", label: "إشراف الراحة" },
      { key: "supervision_end", label: "إشراف نهاية الدوام" },
      { key: "correction_notebooks", label: "تصحيح الدفاتر" },
      { key: "correction_books", label: "تصحيح الكتب" },
      { key: "correction_followup", label: "تصحيح المتابعة" },
      { key: "teaching_aids", label: "توفر وسيلة تعلمية" },
      { key: "extra_activities", label: "أنشطة لا صفية" },
      { key: "radio", label: "إقامة إذاعة" },
      { key: "creativity", label: "إبداع" },
      { key: "zero_period", label: "إقامة حصة صفرية" },
    ];

    if (teacherPerformanceData.length === 0) {
      return {
        highestCriterion: { name: "لا يوجد", pct: 0 },
        lowestCriterion: { name: "لا يوجد", pct: 0 },
        highestTeacher: { name: "لا يوجد", pct: 0 },
        lowestTeacher: { name: "لا يوجد", pct: 0 },
      };
    }

    const criterionStats = criteriaKeys.map(c => {
      let earnedSum = 0;
      let maxSum = 0;
      teacherPerformanceData.forEach(t => {
        earnedSum += t.scoresSum[c.key] || 0;
        maxSum += divisorDays * (customMaxGrades[c.key] ?? 5);
      });
      const pct = maxSum > 0 ? Math.round((earnedSum / maxSum) * 100) : 0;
      return { name: c.label, pct };
    });

    let highestCriterion = criterionStats[0];
    let lowestCriterion = criterionStats[0];
    criterionStats.forEach(stat => {
      if (stat.pct > highestCriterion.pct) highestCriterion = stat;
      if (stat.pct < lowestCriterion.pct) lowestCriterion = stat;
    });

    let highestTeacher = teacherPerformanceData[0];
    let lowestTeacher = teacherPerformanceData[0];
    teacherPerformanceData.forEach(t => {
      if (t.overallPct > highestTeacher.overallPct) highestTeacher = t;
      if (t.overallPct < lowestTeacher.overallPct) lowestTeacher = t;
    });

    return {
      highestCriterion,
      lowestCriterion,
      highestTeacher: { name: highestTeacher?.name || "لا يوجد", pct: highestTeacher?.overallPct || 0 },
      lowestTeacher: { name: lowestTeacher?.name || "لا يوجد", pct: lowestTeacher?.overallPct || 0 },
    };
  }, [teacherPerformanceData, divisorDays, customMaxGrades]);

  // Effect to load grade sheets dynamically
  useEffect(() => {
    if (queryTriggered) {
      setLoadingGrades(true);
      localDB.gradeSheets
        .toArray()
        .then((rows) => {
          setGradeSheets(rows || []);
        })
        .catch((err) => {
          console.error("Error fetching grade sheets in stats view from localDB:", err);
        })
        .finally(() => {
          setLoadingGrades(false);
        });
    }
  }, [queryTriggered]);


  // 1. Schools filter matching supervisor scope
  const schoolsList = useMemo(() => {
    const list = new Set<string>();
    if (isSuperAdmin) {
      if (Array.isArray(data.availableSchools)) {
        data.availableSchools.forEach((s: any) => list.add(s));
      }
      if (Array.isArray(data.secretariatStaff)) {
        data.secretariatStaff.forEach((s: any) => s.school && list.add(s.school));
      }
    } else {
      const perms = currentUser?.permissions?.schoolsAndBranches || {};
      Object.keys(perms).forEach(s => list.add(s));
      if (Array.isArray(currentUser?.schools)) {
        currentUser.schools.forEach((s) => s && list.add(s.trim()));
      }
      if (currentUser?.selectedSchool) {
        currentUser.selectedSchool.split(",").forEach(s => list.add(s.trim()));
      }
    }
    if (list.size === 0 && data.profile?.schoolName) {
      list.add(data.profile.schoolName);
    }
    return Array.from(list);
  }, [data.availableSchools, data.secretariatStaff, currentUser, isSuperAdmin, data.profile]);

  useEffect(() => {
    if (schoolsList.length > 0) {
      setSelectedSchool(prev => {
        if (prev && schoolsList.includes(prev.trim())) return prev.trim();
        const firstUserSchool = currentUser?.selectedSchool?.split(",")[0]?.trim();
        return (firstUserSchool && schoolsList.includes(firstUserSchool)) ? firstUserSchool : schoolsList[0];
      });
    }
  }, [schoolsList, currentUser]);

  // 2. Branches filter matching selected school & scope
  const branchesList = useMemo(() => {
    if (!selectedSchool) return [];
    const list = new Set<string>();
    if (isSuperAdmin) {
      if (data.schoolBranches?.[selectedSchool]) {
        data.schoolBranches[selectedSchool].forEach((b: any) => list.add(b));
      }
      if (Array.isArray(data.secretariatStaff)) {
        data.secretariatStaff.forEach((s: any) => {
          if (s.school === selectedSchool && s.branch) {
            list.add(s.branch);
          }
        });
      }
    } else {
      const perms = currentUser?.permissions?.schoolsAndBranches || {};
      const branches = perms[selectedSchool] || [];
      branches.forEach((b: string) => list.add(b));
      if (currentUser?.selectedBranch) {
        list.add(currentUser.selectedBranch);
      }
    }
    if (list.size === 0 && data.profile?.schoolName === selectedSchool && data.profile?.branch) {
      list.add(data.profile.branch);
    }
    return Array.from(list);
  }, [selectedSchool, data.schoolBranches, data.secretariatStaff, currentUser, isSuperAdmin, data.profile]);

  useEffect(() => {
    if (branchesList.length > 0) {
      setSelectedBranch(prev => {
        if (prev && (branchesList.includes(prev) || prev.includes(",") || prev === "الكل" || prev === "all")) return prev;
        return currentUser?.selectedBranch || (branchesList.length > 1 ? branchesList.join(", ") : branchesList[0]);
      });
    } else {
      setSelectedBranch("");
    }
  }, [branchesList, currentUser]);

  const handleToggleReport = (id: string) => {
    setSelectedReports(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectCategory = (cat: typeof statisticalReportCategories[0], checked: boolean) => {
    const itemIds = cat.items.map(x => x.id);
    if (checked) {
      setSelectedReports(prev => Array.from(new Set([...prev, ...itemIds])));
    } else {
      setSelectedReports(prev => prev.filter(x => !itemIds.includes(x)));
    }
  };

  const selectedTitles = useMemo(() => {
    const flat = statisticalReportCategories.flatMap(c => c.items);
    return selectedReports.map(id => flat.find(i => i.id === id)?.label).filter(Boolean);
  }, [selectedReports]);

  // Handler for Interactive Excel Export
  const handleExportStatisticalExcel = async () => {
    try {
      // 1. Resolve Active School Profile
      const schoolProfiles = (data.profiles?.[selectedSchool] || {}) as any;
      let resolvedProfile: any = { ...(data.profile || {}) };
      if (selectedBranch && schoolProfiles[selectedBranch]) {
        resolvedProfile = { ...resolvedProfile, ...schoolProfiles[selectedBranch] };
      } else if (schoolProfiles.ministry !== undefined) {
        resolvedProfile = { ...resolvedProfile, ...schoolProfiles };
      } else {
        const firstBranchKey = Object.keys(schoolProfiles).find(
          (k) => k !== "lastUpdated" && typeof schoolProfiles[k] === "object"
        );
        if (firstBranchKey) {
          resolvedProfile = { ...resolvedProfile, ...schoolProfiles[firstBranchKey] };
        }
      }

      const activeProfile: SchoolExportProfile = {
        ministry: resolvedProfile.ministry || "وزارة التربية والتعـليم والبحث العلمي",
        governorate: resolvedProfile.governorate || resolvedProfile.districtOffice || "مكتب التربية والتعليم بالأمانة",
        district: resolvedProfile.district || "مكتب التربية والتعليم بمنطقة ...",
        schoolName: selectedSchool || resolvedProfile.schoolName || "المدرسة",
        branch: selectedBranch || resolvedProfile.branch || "الفرع الرئيسي",
        branchManager: resolvedProfile.branchManager || "",
        writerName: currentUser?.name || resolvedProfile.writerName || "المشرف الإداري",
        logoImg: resolvedProfile.logoImg || data.profile?.logoImg || "",
        logo: resolvedProfile.logo || data.profile?.logo || "",
      };

      const dateStrRange = dateFrom && dateTo ? `من ${dateFrom} إلى ${dateTo}` : (dateFrom ? `من ${dateFrom}` : (dateTo ? `إلى ${dateTo}` : "كامل الفترة"));

      // 2. Case A: Teachers Evaluation & Performance Report
      if (showTeachersReport) {
        const headers = [
          "#",
          "اسم المعلم والبيانات",
          "الفرع",
          ...TEACHER_METRICS.map((c) => c.label),
          "مجموع الدرجات المكتسبة",
          "الدرجة القصوى الكلية",
          "النسبة الكلية %",
        ];

        const startDataRow = 9; // Header is at row 8, data starts at row 9
        const dataRows = teacherPerformanceData.map((t: any, idx: number) => {
          const rowNum = startDataRow + idx;
          const scores = TEACHER_METRICS.map((c) => t.scoresSum[c.key] || 0);

          return [
            idx + 1,
            t.name,
            t.branch || selectedBranch || "---",
            ...scores,
            {
              formula: `SUM(D${rowNum}:Q${rowNum})`,
              result: t.totalEarnedScore,
            },
            t.totalMaxScore,
            {
              formula: `IF(S${rowNum}>0, ROUND((R${rowNum}/S${rowNum})*100, 1), 0)`,
              result: t.overallPct,
            },
          ];
        });

        const lastDataRow = startDataRow + dataRows.length - 1;
        const summaryRow = [
          "",
          "المتوسط العام للأداء",
          "",
          ...TEACHER_METRICS.map((_, i) => {
            const colLetter = String.fromCharCode(68 + i); // D is 68
            return {
              formula: dataRows.length > 0 ? `ROUND(AVERAGE(${colLetter}${startDataRow}:${colLetter}${lastDataRow}), 1)` : "0",
              result: 0,
            };
          }),
          {
            formula: dataRows.length > 0 ? `ROUND(AVERAGE(R${startDataRow}:R${lastDataRow}), 1)` : "0",
            result: 0,
          },
          {
            formula: dataRows.length > 0 ? `ROUND(AVERAGE(S${startDataRow}:S${lastDataRow}), 1)` : "0",
            result: 0,
          },
          {
            formula: dataRows.length > 0 ? `ROUND(AVERAGE(T${startDataRow}:T${lastDataRow}), 1)` : "0",
            result: 0,
          },
        ];

        await exportToStyledExcel({
          title: "خلاصة تقارير متابعة المعلمين",
          subTitle: "خلاصة تقارير متابعة المعلمين خلال الفترة من",
          periodText: `الفترة من: ${dateFrom || "..."} إلى: ${dateTo || "..."}`,
          filename: `خلاصة_متابعة_المعلمين_${selectedSchool}_${dateFrom || "start"}_${dateTo || "end"}`,
          headers,
          data: dataRows,
          summaryRow: dataRows.length > 0 ? summaryRow : undefined,
          columnWidths: [6, 26, 14, ...TEACHER_METRICS.map(() => 14), 18, 16, 15],
          profile: activeProfile,
          managerLabel: "مدير الفرع",
        });

        toast.success("تم تصدير هيكل إكسل التفاعلي لمتابعة المعلمين بنجاح");
        return;
      }

      // 3. Case B: General Statistical Reports
      if (selectedReports.length === 0) {
        toast.error("الرجاء تحديد نوع واحد على الأقل من التقارير الإحصائية للتصدير");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      
      for (const reportId of selectedReports) {
        const flat = statisticalReportCategories.flatMap((c) => c.items);
        const report = flat.find((r) => r.id === reportId);
        const reportTitle = report?.label || "تقرير إحصائي";
        const sheetName = reportTitle.replace(/[\*\?:\/\\\[\]]/g, "").substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName, {
          views: [{ rightToLeft: true }],
          pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
        });

        let headers: string[] = [];
        let rows: any[][] = [];
        let colWidths: number[] = [];

        if (reportId === "teacher_attendance") {
          headers = ["#", "اسم المعلم", "الفرع", "أيام الرصد", "نسبة الحضور اليومي %"];
          colWidths = [6, 28, 16, 14, 18];
          const teachers = (data.secretariatStaff || []).filter((s: any) => {
            const matchSchool = !selectedSchool || s.school === selectedSchool;
            const matchBranch = checkBranchMatch(s.branch);
            const jobTitles = s.jobTitles || [];
            return matchSchool && matchBranch && (jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس"));
          });

          const attData = teachers.map((teacher: any) => {
            let totalScore = 0;
            let totalMax = 0;
            let count = 0;
            (data.dailyReports || []).forEach((r: any) => {
              if (!matchesDateRange(r.dateStr, dateFrom, dateTo)) return;
              const rSchool = r.schoolId || r.schoolName;
              if (selectedSchool && rSchool && rSchool !== selectedSchool) return;
              const tData = r.teachersData?.find((td: any) => cleanName(td.teacherName) === cleanName(teacher.name));
              if (tData && typeof tData.attendance === "number") {
                totalScore += tData.attendance;
                totalMax += (data.maxGrades?.attendance ?? 5);
                count++;
              }
            });
            const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
            return { name: teacher.name, branch: teacher.branch, pct, count };
          }).filter((t) => t.pct !== null);

          rows = attData.map((t, idx) => [idx + 1, t.name, t.branch || "---", t.count, t.pct]);
        } else if (reportId === "teacher_coverages") {
          headers = ["#", "اسم المعلم", "الفرع", "عدد حصص التغطية (الاحتياط)"];
          colWidths = [6, 28, 16, 22];
          const teachers = (data.secretariatStaff || []).filter((s: any) => {
            const matchSchool = !selectedSchool || s.school === selectedSchool;
            const matchBranch = checkBranchMatch(s.branch);
            const jobTitles = s.jobTitles || [];
            return matchSchool && matchBranch && (jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس"));
          });

          const covData = teachers.map((teacher: any) => {
            let count = 0;
            (data.substitutions || []).forEach((sub: any) => {
              if (!matchesDateRange(sub.date, dateFrom, dateTo)) return;
              for (let i = 1; i <= 7; i++) {
                if (sub[`p${i}`] && cleanName(sub[`p${i}`]) === cleanName(teacher.name)) {
                  count++;
                }
              }
            });
            return { name: teacher.name, branch: teacher.branch, count };
          }).sort((a, b) => b.count - a.count);

          rows = covData.map((t, idx) => [idx + 1, t.name, t.branch || "---", t.count]);
        } else if (reportId === "teacher_notebooks") {
          headers = ["#", "الصف", "الشعبة", "المادة", "تصحيح دقيق", "تصحيح متوسط", "دون ملاحظات", "قصور بسيط", "قصور كبير", "لم يصحح", "الإجمالي"];
          colWidths = [6, 14, 14, 20, 14, 14, 14, 14, 14, 14, 14];
          const filteredLogs = (data.notebookFollowUpLogs || []).filter((log: any) => {
            const matchSchool = !selectedSchool || log.school === selectedSchool;
            const matchBranch = checkBranchMatch(log.branch);
            const matchDate = matchesDateRange(log.date, dateFrom, dateTo);
            return matchSchool && matchBranch && matchDate;
          });

          const generalStats: Record<string, any> = {};
          filteredLogs.forEach((log: any) => {
            const key = `${log.grade}-${log.section}-${log.subject}`;
            const rating = log.teacherCorrection?.rating || "لم يتم التصحيح";
            if (!generalStats[key]) {
              generalStats[key] = {
                grade: log.grade,
                section: log.section,
                subject: log.subject,
                ratings: {
                  "تصحيح دقيق": 0,
                  "تصحيح متوسط": 0,
                  "تصحيح دون كتابة الملاحظات": 0,
                  "قصور في التصحيح": 0,
                  "قصور كبير جداً في التصحيح": 0,
                  "لم يتم التصحيح": 0,
                },
              };
            }
            if (generalStats[key].ratings[rating] !== undefined) {
              generalStats[key].ratings[rating]++;
            } else {
              generalStats[key].ratings["لم يتم التصحيح"]++;
            }
          });

          let rowIdx = 0;
          Object.values(generalStats).forEach((item: any) => {
            rowIdx++;
            const r = item.ratings;
            rows.push([
              rowIdx,
              item.grade,
              item.section,
              item.subject,
              r["تصحيح دقيق"] || 0,
              r["تصحيح متوسط"] || 0,
              r["تصحيح دون كتابة الملاحظات"] || 0,
              r["قصور في التصحيح"] || 0,
              r["قصور كبير جداً في التصحيح"] || 0,
              r["لم يتم التصحيح"] || 0,
              {
                formula: `SUM(E${8 + rowIdx}:J${8 + rowIdx})`,
                result: Object.values(r).reduce((a: any, b: any) => Number(a) + Number(b), 0),
              },
            ]);
          });
        } else if (reportId === "teacher_daily_prep") {
          headers = ["#", "اسم المعلم", "الفرع", "التحاضير المرصودة", "نسبة اكتمال التحضير %"];
          colWidths = [6, 28, 16, 16, 18];
          const teachers = (data.secretariatStaff || []).filter((s: any) => {
            const matchSchool = !selectedSchool || s.school === selectedSchool;
            const matchBranch = checkBranchMatch(s.branch);
            const jobTitles = s.jobTitles || [];
            return matchSchool && matchBranch && (jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس"));
          });

          const prepData = teachers.map((teacher: any) => {
            let totalScore = 0;
            let totalMax = 0;
            let count = 0;
            (data.dailyReports || []).forEach((r: any) => {
              if (!matchesDateRange(r.dateStr, dateFrom, dateTo)) return;
              const rSchool = r.schoolId || r.schoolName;
              if (selectedSchool && rSchool && rSchool !== selectedSchool) return;
              const tData = r.teachersData?.find((td: any) => cleanName(td.teacherName) === cleanName(teacher.name));
              if (tData && typeof tData.preparation === "number") {
                totalScore += tData.preparation;
                totalMax += (data.maxGrades?.preparation ?? 10);
                count++;
              }
            });
            const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
            return { name: teacher.name, branch: teacher.branch, pct, count };
          }).filter((t) => t.pct !== null);

          rows = prepData.map((t, idx) => [idx + 1, t.name, t.branch || "---", t.count, t.pct]);
        } else if (reportId === "admin_problems") {
          headers = ["#", "اسم الموظف / المشرف", "المدرسة", "الفرع", "المشكلة", "الحالة", "تاريخ الرصد"];
          colWidths = [6, 24, 18, 14, 34, 14, 14];
          const matchedReports = (data.issueRecommendations || []).filter((r: any) => {
            const matchSchool = !selectedSchool || r.school === selectedSchool;
            const matchBranch = checkBranchMatch(r.branch);
            const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
            return matchSchool && matchBranch && matchDate;
          });

          let pIdx = 0;
          matchedReports.forEach((r: any) => {
            if (r.items) {
              r.items.forEach((item: any) => {
                if (item.type === "issue") {
                  pIdx++;
                  const stLabel = item.status === "solved" ? "تم حلها" : item.status === "in_progress_issue" ? "قيد المتابعة" : "لم يتم الحل";
                  rows.push([pIdx, r.supervisorName || "---", r.school || selectedSchool, r.branch || selectedBranch, item.content || "---", stLabel, r.dateStr || "---"]);
                }
              });
            }
          });
        } else if (reportId === "admin_recommendations") {
          headers = ["#", "اسم المشرف", "المدرسة", "الفرع", "التوصية", "الحالة", "تاريخ الرصد"];
          colWidths = [6, 24, 18, 14, 34, 14, 14];
          const matchedReports = (data.issueRecommendations || []).filter((r: any) => {
            const matchSchool = !selectedSchool || r.school === selectedSchool;
            const matchBranch = checkBranchMatch(r.branch);
            const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
            return matchSchool && matchBranch && matchDate;
          });

          let rIdx = 0;
          matchedReports.forEach((r: any) => {
            if (r.items) {
              r.items.forEach((item: any) => {
                if (item.type === "recommendation") {
                  rIdx++;
                  const stLabel = item.status === "adopted" ? "تم الأخذ بها" : item.status === "under_review" ? "قيد المراجعة" : "نفذت بشكل مختلف";
                  rows.push([rIdx, r.supervisorName || "---", r.school || selectedSchool, r.branch || selectedBranch, item.content || "---", stLabel, r.dateStr || "---"]);
                }
              });
            }
          });
        } else {
          headers = ["#", "البيان", "المدرسة", "الفرع", "الفترة"];
          colWidths = [6, 30, 20, 16, 20];
          rows = [[1, reportTitle, selectedSchool || "---", selectedBranch || "---", dateStrRange]];
        }

        const colCount = Math.max(headers.length, 9);
        colWidths.forEach((w, i) => {
          worksheet.getColumn(i + 1).width = w;
        });

        // Apply Top Header
        applyStyledHeaderAndFooter(worksheet, workbook, {
          title: reportTitle,
          subTitle: `التقرير الإحصائي: ${reportTitle}`,
          periodText: `الفترة من: ${dateFrom || "..."} إلى: ${dateTo || "..."}`,
          colCount,
          profile: activeProfile,
          managerLabel: "مدير الفرع",
        });

        // Add Header Row
        const headerRow = worksheet.getRow(8);
        headerRow.values = headers;
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1E40AF" },
          };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });

        // Add Data Rows
        rows.forEach((rowData, idx) => {
          const excelRow = worksheet.addRow(rowData.map((v) => (v && typeof v === "object" && v.formula ? v : v)));
          excelRow.height = 24;
          const isEven = idx % 2 === 0;

          excelRow.eachCell((cell, colNumber) => {
            const rawVal = rowData[colNumber - 1];
            if (rawVal && typeof rawVal === "object" && rawVal.formula) {
              cell.value = {
                formula: rawVal.formula,
                result: rawVal.result,
              };
            }
            cell.font = { name: "Arial", size: 10, bold: true };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
            };
            cell.border = {
              top: { style: "thin", color: { argb: "FFD1D5DB" } },
              left: { style: "thin", color: { argb: "FFD1D5DB" } },
              bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
              right: { style: "thin", color: { argb: "FFD1D5DB" } },
            };
          });
        });

        // Apply Footer
        applyStyledFooter(worksheet, {
          colCount,
          profile: activeProfile,
          managerLabel: "مدير الفرع",
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `التقارير_الإحصائية_${selectedSchool}_${dateFrom || "start"}_${dateTo || "end"}.xlsx`);
      toast.success("تم تصدير ملف إكسل التفاعلي للتقارير الإحصائية بنجاح");
    } catch (err) {
      console.error("Error exporting statistical Excel:", err);
      toast.error("حدث خطأ أثناء تصدير ملف الإكسل");
    }
  };

  return (
    <div className="space-y-6 text-right font-arabic" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">التقارير الإحصائية</h2>
            <p className="text-xs text-slate-400 font-bold">إعداد وتصفية الإحصائيات العامة للمؤسسة</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
        >
          <ArrowRight size={16} />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Right Column: Configuration Form (2/5 size) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-lg font-black text-slate-800 border-b pb-3 flex items-center gap-2">
              <Filter size={20} className="text-rose-500" />
              <span>تصفية واختيار البيانات</span>
            </h3>

            {/* School Select */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">اسم المدرسة</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                disabled={schoolsList.length <= 1}
                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-500 outline-none transition-all"
              >
                {schoolsList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Branch Select */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">الفرع</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={branchesList.length <= 1}
                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-500 outline-none transition-all"
              >
                {branchesList.length > 1 && (
                  <option value={branchesList.join(", ")}>جميع الفروع</option>
                )}
                {branchesList.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">الفترة الزمنية</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block pr-1 mb-1">من تاريخ</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block pr-1 mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-rose-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Report Types Multiselect */}
            <div className="space-y-2 relative">
              <label className="text-xs font-black text-slate-500 pr-2">نوع التقارير الإحصائية</label>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 font-bold hover:bg-slate-100/70 transition-colors flex justify-between items-center text-slate-700 text-xs shadow-sm"
              >
                <span className="truncate max-w-[200px]">
                  {selectedReports.length > 0
                    ? `تم اختيار ${selectedReports.length} نوع`
                    : "انقر لاختيار نوع أو أكثر..."}
                </span>
                <ChevronDown size={16} className="text-slate-400 shrink-0" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 left-0 bg-white border border-slate-200 mt-2 rounded-2xl shadow-xl z-50 p-4 max-h-[50vh] overflow-y-auto space-y-4">
                  {statisticalReportCategories.map((cat, idx) => {
                    const itemIds = cat.items.map(x => x.id);
                    const allSelected = itemIds.every(id => selectedReports.includes(id));
                    return (
                      <div key={idx} className="space-y-2 border-b last:border-b-0 pb-3 last:pb-0 text-right">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-black ${cat.iconColor}`}>{cat.label}</span>
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(cat, !allSelected)}
                            className="text-[10px] text-blue-500 font-bold hover:underline"
                          >
                            {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {cat.items.map((item) => {
                            const isChecked = selectedReports.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-600 transition-colors ${isChecked ? "bg-slate-50/50 text-slate-800" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleReport(item.id)}
                                  className="w-3.5 h-3.5 rounded text-rose-500 cursor-pointer"
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="bg-slate-800 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg hover:bg-slate-700 transition-all"
                    >
                      إغلاق القائمة
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Badges */}
              {selectedTitles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 justify-end">
                  {selectedReports.map((id) => {
                    const flat = statisticalReportCategories.flatMap(c => c.items);
                    const item = flat.find(i => i.id === id);
                    if (!item) return null;
                    return (
                      <span
                        key={id}
                        className="bg-rose-50 text-rose-800 border border-rose-100 rounded-lg px-2 py-0.5 text-[10px] flex items-center gap-1 font-bold animate-in fade-in zoom-in-95 duration-200"
                      >
                        {item.label}
                        <X
                          size={10}
                          className="hover:text-red-500 cursor-pointer"
                          onClick={() => handleToggleReport(id)}
                        />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Periodicity Select */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 pr-2">تكرار التقرير</label>
              <select
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-rose-500 outline-none transition-all animate-in fade-in"
              >
                <option value="weekly">التقارير الأسبوعية</option>
                <option value="monthly">التقارير الشهرية</option>
                <option value="quarterly">التقارير الفصلية</option>
                <option value="final">التقارير الختامية</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                if (selectedReports.length === 0) {
                  toast.error("الرجاء تحديد نوع واحد على الأقل من التقارير الإحصائية");
                  return;
                }
                setQueryTriggered(true);
                setShowTeachersReport(false);
                toast.success("تم توليد هيكل التقارير الإحصائية بنجاح");
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <TrendingUp size={18} />
              <span>عرض ومعاينة التقارير الإحصائية</span>
            </button>

            {/* Show Teachers Report Button */}
            <button
              onClick={() => {
                setQueryTriggered(true);
                setShowTeachersReport(true);
                toast.success("تم توليد تقارير المعلمين بنجاح");
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              <Users size={18} />
              <span>إظهار تقارير المعلمين</span>
            </button>
          </div>
        </div>

        {/* Left Column: Preview Dashboard (3/5 size) */}
        <div className="lg:col-span-3 space-y-6">


          {!queryTriggered ? (
            /* Empty State */
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                <BarChart3 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-700 text-base">بانتظار تصفية البيانات</h4>
                <p className="text-xs text-slate-400 max-w-sm font-bold leading-5">
                  الرجاء تحديد المدرسة والفرع ونوع التقارير الإحصائية المطلوبة من العمود الأيمن ثم الضغط على "عرض ومعاينة" لمشاهدة الهيكل.
                </p>
              </div>
            </div>
          ) : (
            /* Mock Report Structure Cards */
            <div className="space-y-6">
              {/* Metadata chosen */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
                <div>🏫 المدرسة: <span className="text-slate-800 font-black">{selectedSchool || "---"}</span></div>
                <div>📍 الفرع: <span className="text-slate-800 font-black">{selectedBranch || "---"}</span></div>
                <div>📅 الفترة: <span className="text-slate-800 font-black">{dateFrom || "..."} إلى {dateTo || "..."}</span></div>
                <div>⏱️ الدورية: <span className="text-slate-800 font-black">
                  {periodicity === "weekly" && "أسبوعية"}
                  {periodicity === "monthly" && "شهرية"}
                  {periodicity === "quarterly" && "فصلية"}
                  {periodicity === "final" && "ختامية"}
                </span></div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleExportStatisticalExcel}
                  className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-bold hover:bg-green-100 transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <FileSpreadsheet size={16} />
                  تصدير هيكل Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl font-bold hover:bg-blue-100 transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer size={16} />
                  طباعة الهيكل
                </button>
                <button
                  onClick={() => toast.info("سيتم تفعيل المشاركة للمرحلة القادمة")}
                  className="flex-1 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-bold hover:bg-emerald-100 transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageCircle size={16} />
                  إرسال النموذج واتساب
                </button>
              </div>

              {showTeachersReport ? (
                <div className="space-y-6">
                  {/* خطة الجودة المطلوبة */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex flex-wrap items-center justify-between border-b pb-3 mb-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Award className="text-amber-500" size={20} />
                        <h4 className="font-black text-slate-800 text-sm">خطة الجودة المطلوبة (الدرجات القصوى للمعايير)</h4>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs">
                        <Calendar size={14} className="text-blue-500" />
                        <span className="font-bold text-slate-500">عدد أيام الأسبوع (أيام العمل):</span>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={daysPerWeek}
                          onChange={(e) => setDaysPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value) || 5)))}
                          className="w-12 bg-white border border-slate-200 rounded-md text-center font-black py-0.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-right">
                      {TEACHER_METRICS.map((m) => (
                        <div key={m.key} className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between gap-1.5">
                          <span className="text-[10px] font-black text-slate-600 line-clamp-2 min-h-[30px]">{m.label}</span>
                          <div className="flex items-center gap-1 justify-between">
                            <span className="text-[9px] text-slate-400 font-bold">الدرجة القصوى:</span>
                            <input
                              type="number"
                              min={1}
                              value={customMaxGrades[m.key] ?? 5}
                              onChange={(e) => setCustomMaxGrades(prev => ({
                                ...prev,
                                [m.key]: Math.max(1, parseInt(e.target.value) || 1)
                              }))}
                              className="w-10 bg-white border border-slate-200 rounded-lg text-center font-black text-xs py-0.5"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* لوحة إحصائيات الأداء */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">أعلى معيار نسبة</span>
                        <span className="text-xs font-black text-slate-700 block truncate max-w-[150px]" title={statsSummary.highestCriterion.name}>
                          {statsSummary.highestCriterion.name}
                        </span>
                        <span className="text-sm font-black text-emerald-600">{statsSummary.highestCriterion.pct}%</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <TrendingDown size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">أدنى معيار نسبة</span>
                        <span className="text-xs font-black text-slate-700 block truncate max-w-[150px]" title={statsSummary.lowestCriterion.name}>
                          {statsSummary.lowestCriterion.name}
                        </span>
                        <span className="text-sm font-black text-rose-600">{statsSummary.lowestCriterion.pct}%</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <UserCheck size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">أعلى معلم نسبة</span>
                        <span className="text-xs font-black text-slate-700 block truncate max-w-[150px]" title={statsSummary.highestTeacher.name}>
                          {statsSummary.highestTeacher.name}
                        </span>
                        <span className="text-sm font-black text-blue-600">{statsSummary.highestTeacher.pct}%</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <UserX size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">أدنى معلم نسبة</span>
                        <span className="text-xs font-black text-slate-700 block truncate max-w-[150px]" title={statsSummary.lowestTeacher.name}>
                          {statsSummary.lowestTeacher.name}
                        </span>
                        <span className="text-sm font-black text-amber-600">{statsSummary.lowestTeacher.pct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* جدول المعلمين */}
                  <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-5 bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 text-white text-center border-b border-blue-950 flex flex-col items-center justify-center gap-1 shadow-inner">
                      <h3 className="text-xl md:text-2xl font-black text-amber-300 drop-shadow-sm flex items-center gap-2">
                        <Award size={24} className="text-amber-400" />
                        <span>خلاصة تقارير متابعة المعلمين</span>
                      </h3>
                      <p className="text-xs md:text-sm font-bold text-blue-100 flex items-center gap-1">
                        <span>خلال الفترة من:</span>
                        <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">{dateFrom || "بداية الفصل"}</span>
                        <span>إلى:</span>
                        <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">{dateTo || "نهاية الفصل"}</span>
                      </p>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
                      <table className="w-full border-collapse text-right select-none text-xs">
                        <thead className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                          <tr className="bg-slate-100/80">
                            <th className="p-3 font-bold border-e text-center w-12">#</th>
                            <th className="p-3 font-bold border-e min-w-[160px]">اسم المعلم والبيانات</th>
                            {TEACHER_METRICS.map(m => (
                              <th key={m.key} className="p-2 border-e text-center font-bold min-w-[90px]">
                                {m.label}
                              </th>
                            ))}
                            <th className="p-3 font-bold text-center bg-blue-50 text-blue-900 w-24">النسبة الكلية %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {teacherPerformanceData.length === 0 ? (
                            <tr>
                              <td colSpan={17} className="p-12 text-center text-slate-400 font-bold">
                                لا توجد بيانات مطابقة للمعلمين في التواريخ المحددة
                              </td>
                            </tr>
                          ) : (
                            teacherPerformanceData.map((teacher, idx) => (
                              <tr key={teacher.id || idx} className="hover:bg-slate-50/30">
                                <td className="p-3 border-e text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-3 border-e font-black text-slate-800">
                                  <div className="flex flex-col">
                                    <span>{teacher.name}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">📍 {teacher.branch || "فرع غير محدد"}</span>
                                  </div>
                                </td>
                                {TEACHER_METRICS.map(m => (
                                  <td key={m.key} className="p-2 border-e text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="font-black text-slate-800">{teacher.criterionPcts[m.key]}%</span>
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        ({teacher.scoresSum[m.key]} / {divisorDays * (customMaxGrades[m.key] ?? 5)})
                                      </span>
                                    </div>
                                  </td>
                                ))}
                                <td className="p-3 text-center font-black text-blue-800 bg-blue-50/40">
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm">{teacher.overallPct}%</span>
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      ({teacher.totalEarnedScore} / {teacher.totalMaxScore})
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedReports.map((reportId) => {
                  const flat = statisticalReportCategories.flatMap(c => c.items);
                  const report = flat.find(r => r.id === reportId);
                  const category = statisticalReportCategories.find(c => c.items.some(i => i.id === reportId));
                  if (!report) return null;

                  const getStatusColor = (pct: number) => {
                    if (pct >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-100";
                    if (pct >= 75) return "bg-amber-50 text-amber-700 border-amber-100";
                    return "bg-rose-50 text-rose-700 border-rose-100";
                  };

                  // 1. teacher_attendance
                  if (reportId === "teacher_attendance") {
                    const teachers = (data.secretariatStaff || []).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      const jobTitles = s.jobTitles || [];
                      const hasTeacherRole = jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس");
                      return matchSchool && matchBranch && hasTeacherRole;
                    });

                    const attendanceData = teachers.map((teacher: any) => {
                      let totalScore = 0;
                      let totalMax = 0;
                      let count = 0;
                      (data.dailyReports || []).forEach((r: any) => {
                        if (!matchesDateRange(r.dateStr, dateFrom, dateTo)) return;
                        const rSchool = r.schoolId || r.schoolName;
                        if (selectedSchool && rSchool && rSchool !== selectedSchool) return;

                        const tData = r.teachersData?.find((td: any) => cleanName(td.teacherName) === cleanName(teacher.name));
                        if (tData && typeof tData.attendance === "number") {
                          totalScore += tData.attendance;
                          totalMax += (data.maxGrades?.attendance ?? 5);
                          count++;
                        }
                      });
                      const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
                      return { name: teacher.name, pct, count };
                    }).filter(t => t.pct !== null);

                    const avgPct = attendanceData.length > 0
                      ? Math.round(attendanceData.reduce((sum, t) => sum + (t.pct || 0), 0) / attendanceData.length)
                      : 0;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="text-blue-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">النسبة العامة للانضباط الوظيفي</span>
                              <span className="text-2xl font-black text-blue-900">{avgPct}%</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusColor(avgPct)}`}>
                              {avgPct >= 90 ? "ممتاز" : avgPct >= 75 ? "جيد" : "يحتاج متابعة"}
                            </span>
                          </div>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم المعلم</th>
                                  <th className="p-3 font-bold text-center">أيام الرصد</th>
                                  <th className="p-3 font-bold text-left">نسبة الحضور اليومي</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {attendanceData.map((t, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{t.name}</td>
                                    <td className="p-3 text-slate-600 text-center font-bold">{t.count} أيام</td>
                                    <td className="p-3 text-left">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full font-black border ${getStatusColor(t.pct || 0)}`}>
                                        {t.pct}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {attendanceData.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد بيانات حضور معلمين للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. teacher_coverages
                  if (reportId === "teacher_coverages") {
                    const teachers = (data.secretariatStaff || []).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      const jobTitles = s.jobTitles || [];
                      const hasTeacherRole = jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس");
                      return matchSchool && matchBranch && hasTeacherRole;
                    });

                    const coveragesData = teachers.map((teacher: any) => {
                      let coveragesCount = 0;
                      (data.substitutions || []).forEach((sub: any) => {
                        if (!matchesDateRange(sub.date, dateFrom, dateTo)) return;
                        for (let i = 1; i <= 7; i++) {
                          if (sub[`p${i}`] && cleanName(sub[`p${i}`]) === cleanName(teacher.name)) {
                            coveragesCount++;
                          }
                        }
                      });
                      return { name: teacher.name, count: coveragesCount };
                    }).sort((a, b) => b.count - a.count);

                    const totalCoverages = coveragesData.reduce((sum, t) => sum + t.count, 0);

                    const getCoverageBadge = (count: number) => {
                      if (count >= 5) return "bg-green-50 text-green-700 border-green-100";
                      if (count >= 1) return "bg-amber-50 text-amber-700 border-amber-100";
                      return "bg-slate-50 text-slate-400 border-slate-100";
                    };

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="text-blue-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">العدد الكلي لخلاصة التغطيات</span>
                              <span className="text-2xl font-black text-emerald-900">{totalCoverages} حصة احتياط</span>
                            </div>
                            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black shadow-sm">إجمالي النشاط</span>
                          </div>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم المعلم</th>
                                  <th className="p-3 font-bold text-center">عدد حصص التغطية</th>
                                  <th className="p-3 font-bold text-left">مؤشر المشاركة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {coveragesData.map((t, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{t.name}</td>
                                    <td className="p-3 text-slate-700 text-center font-black">{t.count} حصة</td>
                                    <td className="p-3 text-left">
                                      <span className={`inline-flex px-2.5 py-0.5 rounded-full font-black border ${getCoverageBadge(t.count)}`}>
                                        {t.count >= 5 ? "مساهم متميز" : t.count >= 1 ? "متعاون" : "لا يوجد تغطيات"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {coveragesData.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد تغطيات مسجلة للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 3. teacher_notebooks
                  if (reportId === "teacher_notebooks") {
                    const filteredLogs = (data.notebookFollowUpLogs || []).filter((log: any) => {
                      const matchSchool = !selectedSchool || log.school === selectedSchool;
                      const matchBranch = checkBranchMatch(log.branch);
                      const matchDate = matchesDateRange(log.date, dateFrom, dateTo);
                      return matchSchool && matchBranch && matchDate;
                    });

                    // Helper to resolve teacher name for a log
                    const findTeacherForLog = (log: any) => {
                      const cleanSub = cleanName(log.subject);
                      const cleanGrade = cleanName(log.grade);
                      const cleanSection = cleanName(log.section);
                      
                      let match = (data.timetable || []).find((t: any) => {
                        if (cleanName(t.subject) !== cleanSub) return false;
                        let hasClass = false;
                        if (t.days) {
                          Object.values(t.days).forEach((dayPeriods: any) => {
                            if (dayPeriods) {
                              Object.values(dayPeriods).forEach((val: any) => {
                                if (typeof val === "string") {
                                  const cleanVal = cleanName(val);
                                  if (cleanVal.includes(cleanGrade) && cleanVal.includes(cleanSection)) {
                                    hasClass = true;
                                  }
                                }
                              });
                            }
                          });
                        }
                        return hasClass;
                      });

                      if (match) return match.teacherName;

                      const staffMatch = (data.secretariatStaff || []).find((s: any) => {
                        const subjects = s.subjects || [];
                        const grades = s.grades || [];
                        const sections = s.sections || [];
                        const matchSub = subjects.some((sub: string) => cleanName(sub) === cleanSub);
                        const matchGrade = grades.some((g: string) => cleanName(g) === cleanGrade);
                        const matchSec = sections.some((sec: string) => cleanName(sec) === cleanSection);
                        return matchSub && matchGrade && matchSec && log.school === s.school && log.branch === s.branch;
                      });

                      return staffMatch ? staffMatch.name : "معلم غير محدد";
                    };

                    // Compile Teacher rows
                    const teacherCorrectionCounts: Record<string, Record<string, number>> = {};
                    filteredLogs.forEach((log) => {
                      const tName = findTeacherForLog(log);
                      const rating = log.teacherCorrection?.rating || "لم يتم التصحيح";
                      if (!teacherCorrectionCounts[tName]) {
                        teacherCorrectionCounts[tName] = {
                          "تصحيح دقيق": 0,
                          "تصحيح متوسط": 0,
                          "تصحيح دون كتابة الملاحظات": 0,
                          "قصور في التصحيح": 0,
                          "قصور كبير جداً في التصحيح": 0,
                          "لم يتم التصحيح": 0,
                        };
                      }
                      if (teacherCorrectionCounts[tName][rating] !== undefined) {
                        teacherCorrectionCounts[tName][rating]++;
                      } else {
                        teacherCorrectionCounts[tName]["لم يتم التصحيح"]++;
                      }
                    });

                    // Compile Class/Section/Subject general statistics
                    const generalStats: Record<string, { grade: string, section: string, subject: string, ratings: Record<string, number> }> = {};
                    filteredLogs.forEach((log) => {
                      const key = `${log.grade}-${log.section}-${log.subject}`;
                      const rating = log.teacherCorrection?.rating || "لم يتم التصحيح";
                      if (!generalStats[key]) {
                        generalStats[key] = {
                          grade: log.grade,
                          section: log.section,
                          subject: log.subject,
                          ratings: {
                            "تصحيح دقيق": 0,
                            "تصحيح متوسط": 0,
                            "تصحيح دون كتابة الملاحظات": 0,
                            "قصور في التصحيح": 0,
                            "قصور كبير جداً في التصحيح": 0,
                            "لم يتم التصحيح": 0,
                          }
                        };
                      }
                      if (generalStats[key].ratings[rating] !== undefined) {
                        generalStats[key].ratings[rating]++;
                      } else {
                        generalStats[key].ratings["لم يتم التصحيح"]++;
                      }
                    });

                    const generalStatsList = Object.values(generalStats);

                    // Totals for the general table
                    const grandTotals = {
                      "تصحيح دقيق": 0,
                      "تصحيح متوسط": 0,
                      "تصحيح دون كتابة الملاحظات": 0,
                      "قصور في التصحيح": 0,
                      "قصور كبير جداً في التصحيح": 0,
                      "لم يتم التصحيح": 0,
                      all: 0
                    };
                    generalStatsList.forEach((item) => {
                      Object.entries(item.ratings).forEach(([rating, count]) => {
                        grandTotals[rating as keyof typeof grandTotals] += count;
                        grandTotals.all += count;
                      });
                    });

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="text-blue-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {/* Upper General Stats Table */}
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">الإحصائية العامة لتصحيح الدفاتر (حسب الصف والمادة)</h4>
                            <div className="overflow-x-auto border border-cyan-100 rounded-xl shadow-sm">
                              <table className="w-full text-right text-xs whitespace-nowrap">
                                <thead>
                                  <tr className="bg-cyan-600 text-white border-b border-cyan-700 font-bold">
                                    <th className="p-3 font-bold">الصف</th>
                                    <th className="p-3 font-bold">الشعبة</th>
                                    <th className="p-3 font-bold">المادة</th>
                                    <th className="p-2 font-bold text-center bg-cyan-700">تصحيح دقيق</th>
                                    <th className="p-2 font-bold text-center">تصحيح متوسط</th>
                                    <th className="p-2 font-bold text-center bg-cyan-700">دون ملاحظات</th>
                                    <th className="p-2 font-bold text-center">قصور بسيط</th>
                                    <th className="p-2 font-bold text-center bg-cyan-700">قصور كبير</th>
                                    <th className="p-2 font-bold text-center">لم يصحح</th>
                                    <th className="p-3 font-bold text-center">الإجمالي</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-cyan-50/10">
                                  {generalStatsList.map((item, idx) => {
                                    const rowTotal = Object.values(item.ratings).reduce((a, b) => a + b, 0);
                                    return (
                                      <tr key={idx} className="hover:bg-cyan-50/20">
                                        <td className="p-3 font-bold text-slate-800">{item.grade}</td>
                                        <td className="p-3 font-bold text-slate-600">{item.section}</td>
                                        <td className="p-3 font-black text-cyan-800">{item.subject}</td>
                                        <td className="p-2 text-center font-bold bg-cyan-50/30 text-green-700">{item.ratings["تصحيح دقيق"] || "-"}</td>
                                        <td className="p-2 text-center font-bold text-blue-700">{item.ratings["تصحيح متوسط"] || "-"}</td>
                                        <td className="p-2 text-center font-bold bg-cyan-50/30 text-purple-700">{item.ratings["تصحيح دون كتابة الملاحظات"] || "-"}</td>
                                        <td className="p-2 text-center font-bold text-amber-700">{item.ratings["قصور في التصحيح"] || "-"}</td>
                                        <td className="p-2 text-center font-bold bg-cyan-50/30 text-orange-700">{item.ratings["قصور كبير جداً في التصحيح"] || "-"}</td>
                                        <td className="p-2 text-center font-bold text-red-700">{item.ratings["لم يتم التصحيح"] || "-"}</td>
                                        <td className="p-3 text-center font-black text-slate-700">{rowTotal}</td>
                                      </tr>
                                    );
                                  })}
                                  {generalStatsList.length === 0 ? (
                                    <tr>
                                      <td colSpan={10} className="p-6 text-center text-slate-400 font-bold">لا توجد بيانات لمتابعة الكراسات والدفاتر للفترة المحددة</td>
                                    </tr>
                                  ) : (
                                    <tr className="bg-cyan-100/50 font-black border-t-2 border-cyan-200">
                                      <td colSpan={3} className="p-3 text-right text-cyan-900">المجموع الكلي للمواد</td>
                                      <td className="p-2 text-center text-green-800">{grandTotals["تصحيح دقيق"]}</td>
                                      <td className="p-2 text-center text-blue-800">{grandTotals["تصحيح متوسط"]}</td>
                                      <td className="p-2 text-center text-purple-800">{grandTotals["تصحيح دون كتابة الملاحظات"]}</td>
                                      <td className="p-2 text-center text-amber-800">{grandTotals["قصور في التصحيح"]}</td>
                                      <td className="p-2 text-center text-orange-800">{grandTotals["قصور كبير جداً في التصحيح"]}</td>
                                      <td className="p-2 text-center text-red-800">{grandTotals["لم يتم التصحيح"]}</td>
                                      <td className="p-3 text-center text-cyan-950 text-sm">{grandTotals.all}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Lower Detail Teacher Table */}
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">خلاصة المعلمين التفصيلية (عدد الشعب حسب مستوى التصحيح)</h4>
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                    <th className="p-3 font-bold">اسم المعلم</th>
                                    <th className="p-2 font-bold text-center text-green-700">دقيق</th>
                                    <th className="p-2 font-bold text-center text-blue-700">متوسط</th>
                                    <th className="p-2 font-bold text-center text-purple-700">بلا ملاحظات</th>
                                    <th className="p-2 font-bold text-center text-amber-700">قصور بسيط</th>
                                    <th className="p-2 font-bold text-center text-orange-700">قصور كبير</th>
                                    <th className="p-2 font-bold text-center text-red-700">لم يصحح</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {Object.entries(teacherCorrectionCounts).map(([tName, counts], idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="p-3 font-bold text-slate-800">{tName}</td>
                                      <td className="p-2 text-center font-bold text-green-600">{counts["تصحيح دقيق"] || "-"}</td>
                                      <td className="p-2 text-center font-bold text-blue-600">{counts["تصحيح متوسط"] || "-"}</td>
                                      <td className="p-2 text-center font-bold text-purple-600">{counts["تصحيح دون كتابة الملاحظات"] || "-"}</td>
                                      <td className="p-2 text-center font-bold text-amber-600">{counts["قصور في التصحيح"] || "-"}</td>
                                      <td className="p-2 text-center font-bold text-orange-600">{counts["قصور كبير جداً في التصحيح"] || "-"}</td>
                                      <td className="p-2 text-center font-bold text-red-600">{counts["لم يتم التصحيح"] || "-"}</td>
                                    </tr>
                                  ))}
                                  {Object.keys(teacherCorrectionCounts).length === 0 && (
                                    <tr>
                                      <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">لا توجد بيانات معلمين مسجلة</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 4. teacher_daily_prep
                  if (reportId === "teacher_daily_prep") {
                    const teachers = (data.secretariatStaff || []).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      const jobTitles = s.jobTitles || [];
                      const hasTeacherRole = jobTitles.includes("معلم مادة") || jobTitles.includes("مربية") || s.jobTitle?.includes("معلم") || s.jobTitle?.includes("مدرس");
                      return matchSchool && matchBranch && hasTeacherRole;
                    });

                    const prepData = teachers.map((teacher: any) => {
                      let totalScore = 0;
                      let totalMax = 0;
                      let count = 0;
                      (data.dailyReports || []).forEach((r: any) => {
                        if (!matchesDateRange(r.dateStr, dateFrom, dateTo)) return;
                        const rSchool = r.schoolId || r.schoolName;
                        if (selectedSchool && rSchool && rSchool !== selectedSchool) return;

                        const tData = r.teachersData?.find((td: any) => cleanName(td.teacherName) === cleanName(teacher.name));
                        if (tData && typeof tData.preparation === "number") {
                          totalScore += tData.preparation;
                          totalMax += (data.maxGrades?.preparation ?? 10);
                          count++;
                        }
                      });
                      const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
                      return { name: teacher.name, pct, count };
                    }).filter(t => t.pct !== null);

                    const avgPrepPct = prepData.length > 0
                      ? Math.round(prepData.reduce((sum, t) => sum + (t.pct || 0), 0) / prepData.length)
                      : 0;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="text-blue-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-teal-50 to-emerald-50/50 p-4 rounded-2xl border border-teal-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">النسبة العامة لاكتمال التحضير اليومي</span>
                              <span className="text-2xl font-black text-teal-900">{avgPrepPct}%</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusColor(avgPrepPct)}`}>
                              {avgPrepPct >= 90 ? "ممتاز" : avgPrepPct >= 75 ? "جيد" : "يحتاج متابعة"}
                            </span>
                          </div>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم المعلم</th>
                                  <th className="p-3 font-bold text-center">التحاضير المرصودة</th>
                                  <th className="p-3 font-bold text-left">نسبة اكتمال التحضير</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {prepData.map((t, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{t.name}</td>
                                    <td className="p-3 text-slate-600 text-center font-bold">{t.count} تحضير</td>
                                    <td className="p-3 text-left">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full font-black border ${getStatusColor(t.pct || 0)}`}>
                                        {t.pct}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {prepData.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد سجلات تحضير يومي مسجلة للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 5. admin_problems
                  if (reportId === "admin_problems") {
                    const matchedReports = (data.issueRecommendations || []).filter((r: any) => {
                      const matchSchool = !selectedSchool || r.school === selectedSchool;
                      const matchBranch = checkBranchMatch(r.branch);
                      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
                      return matchSchool && matchBranch && matchDate;
                    });

                    const problems: any[] = [];
                    matchedReports.forEach((r: any) => {
                      if (r.items) {
                        r.items.forEach((item: any) => {
                          if (item.type === "issue") {
                            problems.push({
                              supervisorName: r.supervisorName,
                              school: r.school,
                              branch: r.branch,
                              date: r.dateStr,
                              ...item
                            });
                          }
                        });
                      }
                    });

                    const solvedCount = problems.filter(p => p.status === "solved").length;
                    const progressCount = problems.filter(p => p.status === "in_progress_issue").length;
                    const notSolvedCount = problems.filter(p => p.status !== "solved" && p.status !== "in_progress_issue").length;

                    const getProblemStatusColor = (status: string) => {
                      if (status === "solved") return "bg-green-50 text-green-700 border-green-100";
                      if (status === "in_progress_issue") return "bg-amber-50 text-amber-700 border-amber-100";
                      return "bg-rose-50 text-rose-700 border-rose-100";
                    };

                    const getProblemStatusLabel = (status: string) => {
                      if (status === "solved") return "تم حلها";
                      if (status === "in_progress_issue") return "قيد المتابعة";
                      return "لم يتم الحل";
                    };

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-purple-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">الإحصائية العامة للمشكلات</h4>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100">
                                <span className="text-[10px] text-green-600 font-bold block mb-1">تم حلها</span>
                                <span className="text-xl font-black text-green-800">{solvedCount}</span>
                              </div>
                              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                                <span className="text-[10px] text-amber-600 font-bold block mb-1">قيد المتابعة</span>
                                <span className="text-xl font-black text-amber-800">{progressCount}</span>
                              </div>
                              <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100">
                                <span className="text-[10px] text-rose-600 font-bold block mb-1">لم يتم الحل</span>
                                <span className="text-xl font-black text-rose-800">{notSolvedCount}</span>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                                <span className="text-[10px] text-purple-600 font-bold block mb-1">العدد الكلي</span>
                                <span className="text-xl font-black text-purple-900">{problems.length}</span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم الموظف</th>
                                  <th className="p-3 font-bold">المشكلة</th>
                                  <th className="p-3 font-bold text-center">الحالة</th>
                                  <th className="p-3 font-bold text-left">تاريخ الرصد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {problems.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{p.supervisorName}</td>
                                    <td className="p-3 text-slate-600 font-medium whitespace-normal max-w-[250px]">{p.content}</td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full font-black border ${getProblemStatusColor(p.status)}`}>
                                        {getProblemStatusLabel(p.status)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-400 text-left font-bold">{p.date}</td>
                                  </tr>
                                ))}
                                {problems.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">لا توجد مشكلات مسجلة للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 6. admin_recommendations
                  if (reportId === "admin_recommendations") {
                    const matchedReports = (data.issueRecommendations || []).filter((r: any) => {
                      const matchSchool = !selectedSchool || r.school === selectedSchool;
                      const matchBranch = checkBranchMatch(r.branch);
                      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
                      return matchSchool && matchBranch && matchDate;
                    });

                    const recommendations: any[] = [];
                    matchedReports.forEach((r: any) => {
                      if (r.items) {
                        r.items.forEach((item: any) => {
                          if (item.type === "recommendation") {
                            recommendations.push({
                              supervisorName: r.supervisorName,
                              school: r.school,
                              branch: r.branch,
                              date: r.dateStr,
                              ...item
                            });
                          }
                        });
                      }
                    });

                    const adoptedCount = recommendations.filter(p => p.status === "adopted").length;
                    const reviewCount = recommendations.filter(p => p.status === "under_review").length;
                    const diffCount = recommendations.filter(p => p.status !== "adopted" && p.status !== "under_review").length;

                    const getRecStatusColor = (status: string) => {
                      if (status === "adopted") return "bg-green-50 text-green-700 border-green-100";
                      if (status === "under_review") return "bg-amber-50 text-amber-700 border-amber-100";
                      return "bg-blue-50 text-blue-700 border-blue-100";
                    };

                    const getRecStatusLabel = (status: string) => {
                      if (status === "adopted") return "تم الأخذ بها";
                      if (status === "under_review") return "قيد المراجعة";
                      return "نفذت بشكل مختلف";
                    };

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-purple-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">الإحصائية العامة للتوصيات</h4>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100">
                                <span className="text-[10px] text-green-600 font-bold block mb-1">تم الأخذ بها</span>
                                <span className="text-xl font-black text-green-800">{adoptedCount}</span>
                              </div>
                              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                                <span className="text-[10px] text-amber-600 font-bold block mb-1">قيد المراجعة</span>
                                <span className="text-xl font-black text-amber-800">{reviewCount}</span>
                              </div>
                              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                <span className="text-[10px] text-blue-600 font-bold block mb-1">نفذت بشكل مختلف</span>
                                <span className="text-xl font-black text-blue-800">{diffCount}</span>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                                <span className="text-[10px] text-purple-600 font-bold block mb-1">العدد الكلي</span>
                                <span className="text-xl font-black text-purple-900">{recommendations.length}</span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم الموظف</th>
                                  <th className="p-3 font-bold">التوصية</th>
                                  <th className="p-3 font-bold text-center">الحالة</th>
                                  <th className="p-3 font-bold text-left">تاريخ الرصد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {recommendations.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{p.supervisorName}</td>
                                    <td className="p-3 text-slate-600 font-medium whitespace-normal max-w-[250px]">{p.content}</td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full font-black border ${getRecStatusColor(p.status)}`}>
                                        {getRecStatusLabel(p.status)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-400 text-left font-bold">{p.date}</td>
                                  </tr>
                                ))}
                                {recommendations.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">لا توجد توصيات مسجلة للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 7. admin_suggestions
                  if (reportId === "admin_suggestions") {
                    const matchedReports = (data.issueRecommendations || []).filter((r: any) => {
                      const matchSchool = !selectedSchool || r.school === selectedSchool;
                      const matchBranch = checkBranchMatch(r.branch);
                      const matchDate = matchesDateRange(r.dateStr, dateFrom, dateTo);
                      return matchSchool && matchBranch && matchDate;
                    });

                    const suggestions: any[] = [];
                    matchedReports.forEach((r: any) => {
                      if (r.items) {
                        r.items.forEach((item: any) => {
                          if (item.type === "suggestion") {
                            suggestions.push({
                              supervisorName: r.supervisorName,
                              school: r.school,
                              branch: r.branch,
                              date: r.dateStr,
                              ...item
                            });
                          }
                        });
                      }
                    });

                    const adoptedCount = suggestions.filter(p => p.status === "adopted").length;
                    const reviewCount = suggestions.filter(p => p.status === "under_review").length;
                    const diffCount = suggestions.filter(p => p.status !== "adopted" && p.status !== "under_review").length;

                    const getSugStatusColor = (status: string) => {
                      if (status === "adopted") return "bg-green-50 text-green-700 border-green-100";
                      if (status === "under_review") return "bg-amber-50 text-amber-700 border-amber-100";
                      return "bg-blue-50 text-blue-700 border-blue-100";
                    };

                    const getSugStatusLabel = (status: string) => {
                      if (status === "adopted") return "تم الأخذ بها";
                      if (status === "under_review") return "قيد المراجعة";
                      return "نفذت بشكل مختلف";
                    };

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-purple-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">الإحصائية العامة للمقترحات</h4>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100">
                                <span className="text-[10px] text-green-600 font-bold block mb-1">تم الأخذ بها</span>
                                <span className="text-xl font-black text-green-800">{adoptedCount}</span>
                              </div>
                              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                                <span className="text-[10px] text-amber-600 font-bold block mb-1">قيد المراجعة</span>
                                <span className="text-xl font-black text-amber-800">{reviewCount}</span>
                              </div>
                              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                <span className="text-[10px] text-blue-600 font-bold block mb-1">نفذت بشكل مختلف</span>
                                <span className="text-xl font-black text-blue-800">{diffCount}</span>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                                <span className="text-[10px] text-purple-600 font-bold block mb-1">العدد الكلي</span>
                                <span className="text-xl font-black text-purple-900">{suggestions.length}</span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم الموظف</th>
                                  <th className="p-3 font-bold">المقترح</th>
                                  <th className="p-3 font-bold text-center">الحالة</th>
                                  <th className="p-3 font-bold text-left">تاريخ الرصد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {suggestions.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{p.supervisorName}</td>
                                    <td className="p-3 text-slate-600 font-medium whitespace-normal max-w-[250px]">{p.content}</td>
                                    <td className="p-3 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full font-black border ${getSugStatusColor(p.status)}`}>
                                        {getSugStatusLabel(p.status)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-400 text-left font-bold">{p.date}</td>
                                  </tr>
                                ))}
                                {suggestions.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="p-6 text-center text-slate-400 font-bold">لا توجد مقترحات مسجلة للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 8. admin_circulars
                  if (reportId === "admin_circulars") {
                    const circulars = (data.communicationPosts || []).filter((post: any) => {
                      const matchType = post.type === "circular";
                      const matchDate = matchesDateRange(post.createdAt, dateFrom, dateTo);
                      const matchSchool = !selectedSchool || post.schoolNames?.includes(selectedSchool) || post.schoolNames?.includes("all");
                      return matchType && matchDate && matchSchool;
                    });

                    const staffList = (data.secretariatStaff || []).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      return matchSchool && matchBranch;
                    });

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-purple-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {circulars.map((post: any) => {
                            const ackUsers = post.acknowledgments || [];
                            const viewUsers = post.views || [];
                            
                            const ackNames = ackUsers.map((a: any) => a.userName);
                            const viewedOnlyNames = viewUsers.filter((v: any) => !ackUsers.some((a: any) => a.userId === v.userId || cleanName(a.userName) === cleanName(v.userName))).map((v: any) => v.userName);
                            const unreadNames = staffList.filter((s: any) => {
                              const hasAck = ackUsers.some((a: any) => a.userId === s.id || cleanName(a.userName) === cleanName(s.name));
                              const hasView = viewUsers.some((v: any) => v.userId === s.id || cleanName(v.userName) === cleanName(s.name));
                              return !hasAck && !hasView;
                            }).map((s: any) => s.name);

                            return (
                              <div key={post.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-black text-sm text-slate-800">{post.title}</h4>
                                  <span className="text-[10px] text-slate-400 font-bold">{post.createdAt?.substring(0,10)}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white p-3 rounded-xl border border-green-100 space-y-2">
                                    <span className="text-xs font-black text-green-700 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                      تم الاطلاع ({ackNames.length})
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-bold leading-5 max-h-[100px] overflow-y-auto">
                                      {ackNames.join("، ") || "---"}
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                                    <span className="text-xs font-black text-amber-700 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                      شاهدوه فقط ({viewedOnlyNames.length})
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-bold leading-5 max-h-[100px] overflow-y-auto">
                                      {viewedOnlyNames.join("، ") || "---"}
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                      لم يطّلعوا أو يشاهدوا ({unreadNames.length})
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-bold leading-5 max-h-[100px] overflow-y-auto">
                                      {unreadNames.join("، ") || "---"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {circulars.length === 0 && (
                            <div className="p-6 text-center text-slate-400 font-bold">لا توجد تعميمات منشورة للفترة المحددة</div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 9. admin_surveys
                  if (reportId === "admin_surveys") {
                    const polls = (data.communicationPosts || []).filter((post: any) => {
                      const matchType = post.type === "poll";
                      const matchDate = matchesDateRange(post.createdAt, dateFrom, dateTo);
                      const matchSchool = !selectedSchool || post.schoolNames?.includes(selectedSchool) || post.schoolNames?.includes("all");
                      return matchType && matchDate && matchSchool;
                    });

                    const staffList = (data.secretariatStaff || []).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      return matchSchool && matchBranch;
                    });

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-purple-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {polls.map((post: any) => {
                            const ackUsers = post.acknowledgments || [];
                            const viewUsers = post.views || [];
                            
                            const ackNames = ackUsers.map((a: any) => a.userName);
                            const viewedOnlyNames = viewUsers.filter((v: any) => !ackUsers.some((a: any) => a.userId === v.userId || cleanName(a.userName) === cleanName(v.userName))).map((v: any) => v.userName);
                            const unreadNames = staffList.filter((s: any) => {
                              const hasAck = ackUsers.some((a: any) => a.userId === s.id || cleanName(a.userName) === cleanName(s.name));
                              const hasView = viewUsers.some((v: any) => v.userId === s.id || cleanName(v.userName) === cleanName(s.name));
                              return !hasAck && !hasView;
                            }).map((s: any) => s.name);

                            return (
                              <div key={post.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-black text-sm text-slate-800">{post.title}</h4>
                                  <span className="text-[10px] text-slate-400 font-bold">{post.createdAt?.substring(0,10)}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white p-3 rounded-xl border border-green-100 space-y-2">
                                    <span className="text-xs font-black text-green-700 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                      شاركوا بالاستطلاع ({ackNames.length})
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-bold leading-5 max-h-[100px] overflow-y-auto">
                                      {ackNames.join("، ") || "---"}
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-2">
                                    <span className="text-xs font-black text-amber-700 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                      شاهدوه فقط ({viewedOnlyNames.length})
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-bold leading-5 max-h-[100px] overflow-y-auto">
                                      {viewedOnlyNames.join("، ") || "---"}
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                      لم يشاركوا أو يشاهدوا ({unreadNames.length})
                                    </span>
                                    <div className="text-[10px] text-slate-500 font-bold leading-5 max-h-[100px] overflow-y-auto">
                                      {unreadNames.join("، ") || "---"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {polls.length === 0 && (
                            <div className="p-6 text-center text-slate-400 font-bold">لا توجد استطلاعات منشورة للفترة المحددة</div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 10. admin_training
                  if (reportId === "admin_training") {
                    const evals = (data.trainingEvaluations || []).filter((e: any) => {
                      const matchDate = matchesDateRange(e.evaluationDate || e.courseDate, dateFrom, dateTo);
                      const traineeStaff = (data.secretariatStaff || []).find((s: any) => cleanName(s.name) === cleanName(e.traineeName));
                      const matchSchool = !selectedSchool || !traineeStaff || traineeStaff.school === selectedSchool;
                      const matchBranch = !traineeStaff || checkBranchMatch(traineeStaff.branch);
                      return matchDate && matchSchool && matchBranch;
                    });

                    const courseGroups: Record<string, any[]> = {};
                    evals.forEach((e: any) => {
                      const name = e.courseName || "أخرى / غير محدد";
                      if (!courseGroups[name]) courseGroups[name] = [];
                      courseGroups[name].push(e);
                    });

                    const coursesData = Object.entries(courseGroups).map(([cName, list]) => {
                      const ratings = list.map((e: any) => {
                        if (typeof e.overallRating === "number") return e.overallRating;
                        return Number(e.answers?.overall_rating || 0);
                      }).filter(r => r > 0);
                      const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "---";
                      
                      const strengthsList: string[] = [];
                      const suggestionsList: string[] = [];
                      list.forEach((e: any) => {
                        const str = e.answers?.strengths || e.answers?.continuous_improvement?.strengths;
                        if (str && str.trim()) strengthsList.push(str.trim());
                        const sug = e.answers?.improvement_suggestions || e.answers?.continuous_improvement?.improvement_suggestions;
                        if (sug && sug.trim()) suggestionsList.push(sug.trim());
                      });

                      return { name: cName, avg, strengthsList, suggestionsList, count: list.length };
                    });

                    const futureTopics: { traineeName: string, jobTitle: string, suggested: string, date: string }[] = [];
                    evals.forEach((e: any) => {
                      const topic = e.answers?.future_topics || e.answers?.continuous_improvement?.future_topics;
                      if (topic && topic.trim()) {
                        futureTopics.push({
                          traineeName: e.traineeName || "مجهول",
                          jobTitle: e.jobTitle || "موظف",
                          suggested: topic.trim(),
                          date: e.evaluationDate || e.courseDate || "---"
                        });
                      }
                    });

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-purple-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">البرامج التدريبية المقترح إقامتها من قبل المتدربين</h4>
                            <div className="overflow-x-auto border border-purple-100 rounded-xl shadow-sm">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-purple-600 text-white border-b border-purple-700">
                                    <th className="p-3 font-bold">اسم المتدرب / الوظيفة</th>
                                    <th className="p-3 font-bold">الموضوع المقترح إدراجه مستقبلاً</th>
                                    <th className="p-3 font-bold text-left">تاريخ الاقتراح</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-purple-50/10">
                                  {futureTopics.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-purple-50/20">
                                      <td className="p-3 font-bold text-slate-800">{item.traineeName} <span className="text-slate-400 font-normal">({item.jobTitle})</span></td>
                                      <td className="p-3 font-black text-purple-900 whitespace-normal max-w-[300px]">{item.suggested}</td>
                                      <td className="p-3 text-left text-slate-400 font-bold">{item.date}</td>
                                    </tr>
                                  ))}
                                  {futureTopics.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد مقترحات برامج تدريبية مسجلة للفترة المحددة</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700">تقييم البرامج الحالية المنفذة</h4>
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-100 font-bold">
                                    <th className="p-3 font-bold">اسم الدورة</th>
                                    <th className="p-3 font-bold text-center">عدد التقييمات</th>
                                    <th className="p-3 font-bold text-center">التقييم العام</th>
                                    <th className="p-3 font-bold">أبرز نقاط القوة</th>
                                    <th className="p-3 font-bold">أبرز مقترحات التطوير</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {coursesData.map((course, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="p-3 font-bold text-slate-800">{course.name}</td>
                                      <td className="p-3 text-center text-slate-500 font-bold">{course.count} متدربين</td>
                                      <td className="p-3 text-center">
                                        <span className="inline-flex px-2 py-0.5 rounded-full font-black bg-blue-50 text-blue-700 border border-blue-100">
                                          {course.avg} / 5
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-600 font-medium whitespace-normal max-w-[200px]">
                                        <ul className="list-disc list-inside space-y-1">
                                          {course.strengthsList.slice(0, 3).map((s, sIdx) => <li key={sIdx}>{s}</li>)}
                                          {course.strengthsList.length === 0 && <span className="text-slate-400">---</span>}
                                        </ul>
                                      </td>
                                      <td className="p-3 text-slate-600 font-medium whitespace-normal max-w-[200px]">
                                        <ul className="list-disc list-inside space-y-1">
                                          {course.suggestionsList.slice(0, 3).map((s, sIdx) => <li key={sIdx}>{s}</li>)}
                                          {course.suggestionsList.length === 0 && <span className="text-slate-400">---</span>}
                                        </ul>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 1. student_health
                  if (reportId === "student_health") {
                    const healthStudents = (data.secretariatStudents || []).map((s: any) => {
                      const report = (data.studentReports || []).find((r: any) => String(r.id) === String(s.id));
                      return {
                        ...s,
                        healthStatus: report ? report.healthStatus : s.healthStatus,
                        healthDetails: report ? report.healthDetails : s.healthDetails,
                      };
                    }).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      
                      const status = (s.healthStatus || "").trim();
                      const isSick = status === "مريض" || status.includes("مريض");
                      
                      return matchSchool && matchBranch && isSick;
                    });

                    const sortedHealthStudents = [...healthStudents].sort((a: any, b: any) => {
                      if (healthSortBy === "grade") {
                        const gradeA = a.grade || "";
                        const gradeB = b.grade || "";
                        const gradeComp = gradeA.localeCompare(gradeB, "ar", { numeric: true });
                        if (gradeComp !== 0) return gradeComp;
                        
                        const secA = a.section || "";
                        const secB = b.section || "";
                        const secComp = secA.localeCompare(secB, "ar");
                        if (secComp !== 0) return secComp;
                        
                        const nameA = a.name || "";
                        const nameB = b.name || "";
                        return nameA.localeCompare(nameB, "ar");
                      } else {
                        const disA = a.healthDetails || "";
                        const disB = b.healthDetails || "";
                        const disComp = disA.localeCompare(disB, "ar");
                        if (disComp !== 0) return disComp;
                        
                        const gradeA = a.grade || "";
                        const gradeB = b.grade || "";
                        const gradeComp = gradeA.localeCompare(gradeB, "ar", { numeric: true });
                        if (gradeComp !== 0) return gradeComp;
                        
                        const nameA = a.name || "";
                        const nameB = b.name || "";
                        return nameA.localeCompare(nameB, "ar");
                      }
                    });

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-red-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="bg-gradient-to-r from-red-50 to-rose-50/50 p-4 rounded-2xl border border-red-100 flex items-center justify-between flex-1 w-full">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي الحالات الصحية الخاصة</span>
                                <span className="text-2xl font-black text-red-900">{healthStudents.length} حالة</span>
                              </div>
                              <span className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">🏥</span>
                            </div>
                            
                            {/* Sorting Buttons */}
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => setHealthSortBy("grade")}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                  healthSortBy === "grade"
                                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                ترتيب حسب الصف
                              </button>
                              <button
                                onClick={() => setHealthSortBy("disease")}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                  healthSortBy === "disease"
                                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                ترتيب حسب المرض
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم الطالب</th>
                                  <th className="p-3 font-bold">الصف والشعبة</th>
                                  <th className="p-3 font-bold">نوع المرض / الحالة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sortedHealthStudents.map((s: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{s.name}</td>
                                    <td className="p-3 text-slate-600 font-bold">{s.grade} / {s.section}</td>
                                    <td className="p-3 text-red-600 font-bold whitespace-normal">
                                      {s.healthDetails ? `مريض (${s.healthDetails})` : (s.healthStatus || "مريض")}
                                    </td>
                                  </tr>
                                ))}
                                {sortedHealthStudents.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد حالات صحية خاصة مسجلة حالياً</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. student_absence
                  if (reportId === "student_absence") {
                    const schoolStudents = (data.secretariatStudents || []).filter((s: any) => {
                      const matchSchool = !selectedSchool || s.school === selectedSchool;
                      const matchBranch = checkBranchMatch(s.branch);
                      return matchSchool && matchBranch;
                    });

                    const filteredAbsenceLogs = (data.absenceLogs || []).filter((l: any) => {
                      const isStudentMatch = schoolStudents.some((s: any) => String(s.id) === String(l.studentId));
                      if (!isStudentMatch) return false;
                      return matchesDateRange(l.date, dateFrom, dateTo);
                    });

                    const getWeekId = (dateStr: string) => {
                      const date = new Date(dateStr);
                      if (isNaN(date.getTime())) return "";
                      const target = new Date(date.valueOf());
                      const dayNr = (date.getDay() + 6) % 7;
                      target.setDate(target.getDate() - dayNr + 3);
                      const firstThursday = target.valueOf();
                      target.setMonth(0, 1);
                      if (target.getDay() !== 4) {
                        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                      }
                      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
                      return `${target.getFullYear()}-W${weekNum}`;
                    };
                    const getMonthId = (dateStr: string) => dateStr.substring(0, 7);

                    const studentLogsMap: Record<string, any[]> = {};
                    filteredAbsenceLogs.forEach(l => {
                      if (!studentLogsMap[l.studentId]) studentLogsMap[l.studentId] = [];
                      studentLogsMap[l.studentId].push(l);
                    });

                    let rareCount = 0;
                    let freqCount = 0;
                    let muchCount = 0;
                    let mostCount = 0;
                    let disconnectedCount = 0;

                    schoolStudents.forEach((student: any) => {
                      const logs = studentLogsMap[student.id] || [];
                      if (logs.length === 0) return;

                      const weeklyMap: Record<string, number> = {};
                      const monthlyMap: Record<string, number> = {};
                      logs.forEach(l => {
                        const weekId = getWeekId(l.date);
                        const monthId = getMonthId(l.date);
                        weeklyMap[weekId] = (weeklyMap[weekId] || 0) + 1;
                        monthlyMap[monthId] = (monthlyMap[monthId] || 0) + 1;
                      });

                      const maxWeekly = Math.max(0, ...Object.values(weeklyMap));
                      const maxMonthly = Math.max(0, ...Object.values(monthlyMap));

                      if (maxMonthly >= 30) {
                        disconnectedCount++;
                      } else if (maxMonthly >= 15) {
                        mostCount++;
                      } else if (maxWeekly >= 3) {
                        muchCount++;
                      } else if (maxWeekly === 2) {
                        freqCount++;
                      } else if (maxWeekly === 1) {
                        rareCount++;
                      }
                    });

                    const categoriesList = [
                      { id: "rare", label: "نادر (غياب يوم/أسبوع)", count: rareCount, color: "bg-blue-50 text-blue-700 border-blue-100" },
                      { id: "freq", label: "متكرر (غياب يومين/أسبوع)", count: freqCount, color: "bg-orange-50 text-orange-700 border-orange-100" },
                      { id: "much", label: "كثير (غياب 3 أيام/أسبوع)", count: muchCount, color: "bg-red-50 text-red-700 border-red-100" },
                      { id: "most", label: "الأكثر غياباً (15 يوم/شهر)", count: mostCount, color: "bg-rose-50 text-rose-700 border-rose-100" },
                      { id: "disconnected", label: "المنقطع (30 يوم/شهر)", count: disconnectedCount, color: "bg-purple-50 text-purple-700 border-purple-100" }
                    ];
                    const highestCategory = categoriesList.reduce((max, c) => c.count > max.count ? c : max, categoriesList[0]);

                    const classAbsences: Record<string, { grade: string, section: string, count: number }> = {};
                    filteredAbsenceLogs.forEach(l => {
                      const key = `${l.grade || "غير محدد"}-${l.section || "غير محدد"}`;
                      if (!classAbsences[key]) {
                        classAbsences[key] = { grade: l.grade || "غير محدد", section: l.section || "غير محدد", count: 0 };
                      }
                      classAbsences[key].count++;
                    });
                    const classAbsencesList = Object.values(classAbsences).sort((a, b) => b.count - a.count);
                    const highestAbsentSection = classAbsencesList[0] || null;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-amber-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="space-y-3">
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الفئة الأكثر عدداً في الغياب</span>
                                <span className="text-base font-black text-amber-950">
                                  {highestCategory.count > 0 ? highestCategory.label : "لا توجد غيابات مسجلة"}
                                </span>
                              </div>
                              <span className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm">
                                {highestCategory.count} طلاب
                              </span>
                            </div>

                            <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                              {categoriesList.map((cat, idx) => (
                                <div key={idx} className={`p-2 rounded-xl border ${cat.color} flex flex-col justify-between`}>
                                  <span className="font-bold text-slate-500 block truncate" title={cat.label}>{cat.label.split(" ")[0]}</span>
                                  <span className="text-sm font-black mt-1">{cat.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 pt-2 border-t">
                            {highestAbsentSection && (
                              <div className="bg-gradient-to-r from-red-50 to-rose-50/50 p-3 rounded-2xl border border-red-100 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-slate-500 font-bold block mb-0.5">الشعبة الأكثر غياباً في الفترة المحددة</span>
                                  <span className="font-black text-red-950">الصف {highestAbsentSection.grade} / الشعبة {highestAbsentSection.section}</span>
                                </div>
                                <span className="px-3 py-1 bg-red-600 text-white rounded-full font-black">
                                  {highestAbsentSection.count} غياب
                                </span>
                              </div>
                            )}

                            <h4 className="font-black text-xs text-slate-700">عدد الغياب التراكمي حسب الصف والشعبة</h4>
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                    <th className="p-3 font-bold">الصف</th>
                                    <th className="p-3 font-bold">الشعبة</th>
                                    <th className="p-3 font-bold text-left">مجموع أيام الغياب</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {classAbsencesList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="p-3 font-bold text-slate-800">{item.grade}</td>
                                      <td className="p-3 text-slate-600 font-bold">{item.section}</td>
                                      <td className="p-3 text-left font-black text-amber-600">{item.count} يوم</td>
                                    </tr>
                                  ))}
                                  {classAbsencesList.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد سجلات غياب للمدرسة والفرع في الفترة المحددة</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 3. student_violations
                  if (reportId === "student_violations") {
                    const filteredViolationLogs = (data.studentViolationLogs || []).filter((l: any) => {
                      const student = (data.secretariatStudents || []).find((s: any) => 
                        String(s.id) === String(l.studentId) || 
                        normalizeArabicName(s.name) === normalizeArabicName(l.studentName)
                      );
                      if (!student) return false;
                      if (selectedSchool && student.school !== selectedSchool) return false;
                      if (!checkBranchMatch(student.branch)) return false;
                      return matchesDateRange(l.date, dateFrom, dateTo);
                    });

                    const classViolations: Record<string, { grade: string, section: string, count: number }> = {};
                    filteredViolationLogs.forEach(l => {
                      const key = `${l.grade || "غير محدد"}-${l.section || "غير محدد"}`;
                      if (!classViolations[key]) {
                        classViolations[key] = { grade: l.grade || "غير محدد", section: l.section || "غير محدد", count: 0 };
                      }
                      classViolations[key].count++;
                    });
                    const classViolationsList = Object.values(classViolations).sort((a, b) => b.count - a.count);
                    const highestViolatingSection = classViolationsList[0] || null;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-rose-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {highestViolatingSection && (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50/50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر مخالفات سلوكية</span>
                                <span className="text-base font-black text-red-950">الصف {highestViolatingSection.grade} / الشعبة {highestViolatingSection.section}</span>
                              </div>
                              <span className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm">
                                {highestViolatingSection.count} مخالفة
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">الصف</th>
                                  <th className="p-3 font-bold">الشعبة</th>
                                  <th className="p-3 font-bold text-left">عدد المخالفات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {classViolationsList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.grade}</td>
                                    <td className="p-3 text-slate-600 font-bold">{item.section}</td>
                                    <td className="p-3 text-left font-black text-rose-600">{item.count} مخالفة</td>
                                  </tr>
                                ))}
                                {classViolationsList.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد مخالفات مسجلة للمدرسة والفرع في الفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 4. student_blacklist
                  if (reportId === "student_blacklist") {
                    const blacklistedStudents = (data.secretariatStudents || []).filter((ss: any) => {
                      const report = (data.studentReports || []).find((r: any) => r.id === ss.id);
                      if (!report || !report.isBlacklisted) return false;
                      
                      const matchSchool = !selectedSchool || ss.school === selectedSchool;
                      const matchBranch = checkBranchMatch(ss.branch);
                      return matchSchool && matchBranch;
                    });

                    const classBlacklist: Record<string, { grade: string, section: string, count: number }> = {};
                    blacklistedStudents.forEach(s => {
                      const key = `${s.grade || "غير محدد"}-${s.section || "غير محدد"}`;
                      if (!classBlacklist[key]) {
                        classBlacklist[key] = { grade: s.grade || "غير محدد", section: s.section || "غير محدد", count: 0 };
                      }
                      classBlacklist[key].count++;
                    });
                    const classBlacklistList = Object.values(classBlacklist).sort((a, b) => b.count - a.count);
                    const highestBlacklistSection = classBlacklistList[0] || null;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Users className="text-slate-800" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {highestBlacklistSection && (
                            <div className="bg-gradient-to-r from-slate-100 to-slate-200/50 p-4 rounded-2xl border border-slate-300 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر تسجيلاً بالقائمة السوداء</span>
                                <span className="text-base font-black text-slate-900">الصف {highestBlacklistSection.grade} / الشعبة {highestBlacklistSection.section}</span>
                              </div>
                              <span className="px-3.5 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm">
                                {highestBlacklistSection.count} طلاب
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">الصف</th>
                                  <th className="p-3 font-bold">الشعبة</th>
                                  <th className="p-3 font-bold text-left">عدد الطلاب بالقائمة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {classBlacklistList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.grade}</td>
                                    <td className="p-3 text-slate-600 font-bold">{item.section}</td>
                                    <td className="p-3 text-left font-black text-slate-700">{item.count} طلاب</td>
                                  </tr>
                                ))}
                                {classBlacklistList.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا يوجد طلاب ضمن القائمة السوداء في الفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 5. student_honors
                  if (reportId === "student_honors") {
                    const excellentStudents = (data.secretariatStudents || []).filter((ss: any) => {
                      const report = (data.studentReports || []).find((r: any) => r.id === ss.id);
                      if (!report || !report.isExcellent) return false;
                      
                      const matchSchool = !selectedSchool || ss.school === selectedSchool;
                      const matchBranch = checkBranchMatch(ss.branch);
                      return matchSchool && matchBranch;
                    });

                    const classHonors: Record<string, { grade: string, section: string, count: number }> = {};
                    excellentStudents.forEach(s => {
                      const key = `${s.grade || "غير محدد"}-${s.section || "غير محدد"}`;
                      if (!classHonors[key]) {
                        classHonors[key] = { grade: s.grade || "غير محدد", section: s.section || "غير محدد", count: 0 };
                      }
                      classHonors[key].count++;
                    });
                    const classHonorsList = Object.values(classHonors).sort((a, b) => b.count - a.count);
                    const highestHonorsSection = classHonorsList[0] || null;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Award className="text-green-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {highestHonorsSection && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50/50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر تسجيلاً بقائمة التميز</span>
                                <span className="text-base font-black text-green-950">الصف {highestHonorsSection.grade} / الشعبة {highestHonorsSection.section}</span>
                              </div>
                              <span className="px-3.5 py-1.5 bg-green-600 text-white rounded-xl text-xs font-black shadow-sm">
                                {highestHonorsSection.count} متميزين
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">الصف</th>
                                  <th className="p-3 font-bold">الشعبة</th>
                                  <th className="p-3 font-bold text-left">عدد الطلاب المتميزين</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {classHonorsList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.grade}</td>
                                    <td className="p-3 text-slate-600 font-bold">{item.section}</td>
                                    <td className="p-3 text-left font-black text-green-600">{item.count} طلاب</td>
                                  </tr>
                                ))}
                                {classHonorsList.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا يوجد طلاب ضمن قائمة التميز في الفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 6. maintenance_damage
                  if (reportId === "maintenance_damage") {
                    const filteredDamageLogs = (data.damageLogs || []).filter((l: any) => {
                      const student = (data.secretariatStudents || []).find((s: any) => 
                        String(s.id) === String(l.studentId) || 
                        normalizeArabicName(s.name) === normalizeArabicName(l.studentName)
                      );
                      if (!student) return false;
                      if (selectedSchool && student.school !== selectedSchool) return false;
                      if (!checkBranchMatch(student.branch)) return false;
                      return matchesDateRange(l.date, dateFrom, dateTo);
                    });

                    const classDamage: Record<string, { grade: string, section: string, count: number }> = {};
                    filteredDamageLogs.forEach(l => {
                      const key = `${l.grade || "غير حد"}-${l.section || "غير حد"}`;
                      if (!classDamage[key]) {
                        classDamage[key] = { grade: l.grade || "غير حد", section: l.section || "غير حد", count: 0 };
                      }
                      classDamage[key].count++;
                    });
                    const classDamageList = Object.values(classDamage).sort((a, b) => b.count - a.count);
                    const highestDamageSection = classDamageList[0] || null;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-rose-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {highestDamageSection && (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50/50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر إتلافاً للممتلكات</span>
                                <span className="text-base font-black text-red-950">الصف {highestDamageSection.grade} / الشعبة {highestDamageSection.section}</span>
                              </div>
                              <span className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm">
                                {highestDamageSection.count} إتلاف
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">الصف</th>
                                  <th className="p-3 font-bold">الشعبة</th>
                                  <th className="p-3 font-bold text-left">عدد الإتلافات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {classDamageList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.grade}</td>
                                    <td className="p-3 text-slate-600 font-bold">{item.section}</td>
                                    <td className="p-3 text-left font-black text-rose-600">{item.count} إتلاف</td>
                                  </tr>
                                ))}
                                {classDamageList.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد إتلافات مسجلة للمدرسة والفرع في الفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 7. maintenance_repair
                  if (reportId === "maintenance_repair") {
                    const filteredMaintenanceLogs = (data.damageLogs || []).filter((l: any) => {
                      const student = (data.secretariatStudents || []).find((s: any) => 
                        String(s.id) === String(l.studentId) || 
                        normalizeArabicName(s.name) === normalizeArabicName(l.studentName)
                      );
                      if (!student) return false;
                      if (selectedSchool && student.school !== selectedSchool) return false;
                      if (!checkBranchMatch(student.branch)) return false;
                      return matchesDateRange(l.date, dateFrom, dateTo);
                    });

                    const sectionCount: Record<string, { grade: string, section: string, count: number }> = {};
                    filteredMaintenanceLogs.forEach(l => {
                      const key = `${l.grade || "غير حد"}-${l.section || "غير حد"}`;
                      if (!sectionCount[key]) {
                        sectionCount[key] = { grade: l.grade || "غير حد", section: l.section || "غير حد", count: 0 };
                      }
                      sectionCount[key].count++;
                    });
                    const sortedSections = Object.values(sectionCount).sort((a, b) => b.count - a.count);
                    const highestMaintenanceSection = sortedSections[0] || null;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-rose-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {highestMaintenanceSection && (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50/50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر طلباً للصيانة وإصلاح التلفيات</span>
                                <span className="text-base font-black text-red-950">الصف {highestMaintenanceSection.grade} / الشعبة {highestMaintenanceSection.section}</span>
                              </div>
                              <span className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm">
                                {highestMaintenanceSection.count} صيانة
                              </span>
                            </div>
                          )}

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">الصف</th>
                                  <th className="p-3 font-bold">الشعبة</th>
                                  <th className="p-3 font-bold">حالة الإتلاف / الصيانة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredMaintenanceLogs.map((l: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{l.grade}</td>
                                    <td className="p-3 text-slate-600 font-bold">{l.section}</td>
                                    <td className="p-3 font-bold text-right">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        l.followUpStatus?.includes("تم") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                      }`}>
                                        {l.followUpStatus || "قيد المتابعة"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {filteredMaintenanceLogs.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد سجلات صيانة مسجلة للفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 8. supervisor_visits
                  if (reportId === "supervisor_visits") {
                    const filteredVisits = (data.teacherEvaluations || []).filter((ev: any) => {
                      if (selectedSchool && ev.school !== selectedSchool) return false;
                      if (!checkBranchMatch(ev.branch)) return false;
                      return matchesDateRange(ev.date, dateFrom, dateTo);
                    });

                    const shortCount = filteredVisits.filter(e => e.evaluationType === 'short').length;
                    const extCount = filteredVisits.filter(e => e.evaluationType === 'ext').length;
                    const subjectCount = filteredVisits.filter(e => e.evaluationType === 'subject').length;
                    const totalCount = shortCount + extCount + subjectCount;

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="text-emerald-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">العدد الكلي للزيارات الصفية المنفذة</span>
                              <span className="text-2xl font-black text-emerald-900">{totalCount} زيارة</span>
                            </div>
                            <span className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">📋</span>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold text-center">التقييم المختصر</th>
                                  <th className="p-3 font-bold text-center">التقييم الموسع</th>
                                  <th className="p-3 font-bold text-center">التقييم حسب المادة</th>
                                  <th className="p-3 font-bold text-center bg-emerald-50 text-emerald-900">المجموع الكلي</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="hover:bg-slate-50/30 font-black text-slate-800 text-center">
                                  <td className="p-4 text-center text-sm font-semibold">{shortCount} زيارة</td>
                                  <td className="p-4 text-center text-sm font-semibold">{extCount} زيارة</td>
                                  <td className="p-4 text-center text-sm font-semibold">{subjectCount} زيارة</td>
                                  <td className="p-4 text-center text-sm font-extrabold bg-emerald-50 text-emerald-900">{totalCount} زيارات</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 9. supervisor_final_visits
                  if (reportId === "supervisor_final_visits") {
                    const finalEvals = (data.teacherEvaluations || []).filter((ev: any) => {
                      if (selectedSchool && ev.school !== selectedSchool) return false;
                      if (!checkBranchMatch(ev.branch)) return false;
                      return matchesDateRange(ev.date, dateFrom, dateTo);
                    });

                    const criteriaList = Array.from(new Set([
                      ...shortCriteriaBlocks.flatMap(b => b.items),
                      ...extCriteriaBlocks.flatMap(b => b.items)
                    ]));

                    let grandSum = 0;
                    let grandCount = 0;

                    const criterionAggregations = criteriaList.map(crit => {
                      let sum = 0;
                      let count = 0;
                      finalEvals.forEach(e => {
                        if (e.scores && e.scores[crit] !== undefined) {
                          sum += e.scores[crit];
                          count++;
                        }
                      });
                      grandSum += sum;
                      grandCount += count;
                      const percentage = count > 0 ? Math.round((sum / (count * 4)) * 100) : 0;
                      return { criterion: crit, sum, count, percentage };
                    }).filter(item => item.count > 0);

                    const overallPercentage = grandCount > 0 ? Math.round((grandSum / (grandCount * 4)) * 100) : 0;

                    const getPercentageColor = (pct: number) => {
                      if (pct >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-100";
                      if (pct >= 75) return "bg-blue-50 text-blue-700 border-blue-100";
                      if (pct >= 50) return "bg-amber-50 text-amber-700 border-amber-100";
                      return "bg-rose-50 text-rose-700 border-rose-100";
                    };

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="text-emerald-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className={`p-4 rounded-2xl border flex items-center justify-between ${getPercentageColor(overallPercentage)}`}>
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">النسبة العامة لجميع المعايير في المدرسة والفرع</span>
                              <span className="text-2xl font-black">{overallPercentage}%</span>
                            </div>
                            <span className="text-xl">📊</span>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">المعيار الإشرافي</th>
                                  <th className="p-3 font-bold text-center">المجموع</th>
                                  <th className="p-3 font-bold text-left">النسبة النهائية للمعيار</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {criterionAggregations.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800 whitespace-normal max-w-[250px]">{item.criterion}</td>
                                    <td className="p-3 text-slate-600 font-black text-center">{item.sum} نقطة</td>
                                    <td className="p-3 text-left">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full font-black border ${getPercentageColor(item.percentage)}`}>
                                        {item.percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {criterionAggregations.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 font-bold">لا توجد زيارات مقيمة للمدرسة والفرع في الفترة المحددة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 10. student_grades
                  if (reportId === "student_grades") {
                    if (loadingGrades) {
                      return (
                        <div key={reportId} className="bg-white rounded-2xl border border-slate-100 p-8 text-center animate-in fade-in duration-300">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
                          <p className="text-xs text-slate-400 font-bold">جاري تحميل وتحليل كشوف الدرجات...</p>
                        </div>
                      );
                    }

                    const matchedSheets = gradeSheets.filter((s: any) => {
                      if (selectedSchool && s.schoolName !== selectedSchool) return false;
                      if (!checkBranchMatch(s.branch)) return false;
                      return matchesDateRange(s.date || s.timestamp?.split("T")[0], dateFrom, dateTo);
                    });

                    const classSectionsMap: Record<string, { grade: string, section: string, subjects: Record<string, { pass: number, fail: number }> }> = {};
                    const allSubjectsSet = new Set<string>();

                    matchedSheets.forEach((sheet: any) => {
                      const key = `${sheet.grade}-${sheet.section}`;
                      if (!classSectionsMap[key]) {
                        classSectionsMap[key] = {
                          grade: sheet.grade,
                          section: sheet.section,
                          subjects: {}
                        };
                      }
                      
                      const subj = sheet.subject;
                      allSubjectsSet.add(subj);

                      if (!classSectionsMap[key].subjects[subj]) {
                        classSectionsMap[key].subjects[subj] = { pass: 0, fail: 0 };
                      }

                      const sheetMonths = sheet.months || ["شهر الأول", "شهر الثاني", "شهر الثالث"];
                      sheetMonths.forEach((month: string, mIdx: number) => {
                        const studentIds = Array.from(new Set(
                          Object.keys(sheet.cells || {})
                            .filter(k => k.includes(`-m${mIdx}-`))
                            .map(k => k.split("-")[0])
                        ));

                        const maxTotal = (sheet.maxScores?.w_k || 20) + (sheet.maxScores?.oral || 10) + (sheet.maxScores?.attend || 10) + (sheet.maxScores?.written || 60);
                        const maxExam = sheet.maxScores?.written || 60;
                        const totalThreshold = maxTotal / 2;
                        const examThreshold = maxExam / 2;

                        studentIds.forEach((studentId) => {
                          if (gradesDisplayMode === "total") {
                            const totalVal = sheet.cells[`${studentId}-m${mIdx}-total_m`];
                            let score: number | null = null;
                            if (totalVal !== undefined && totalVal !== "") {
                              score = parseFloat(totalVal);
                            } else {
                              let sum = 0;
                              let hasVal = false;
                              ["w_k", "oral", "attend", "written"].forEach(field => {
                                const v = sheet.cells[`${studentId}-m${mIdx}-${field}`];
                                if (v !== undefined && v !== "") {
                                  sum += parseFloat(v) || 0;
                                  hasVal = true;
                                }
                              });
                              if (hasVal) score = sum;
                            }

                            if (score !== null && !isNaN(score)) {
                              if (score >= totalThreshold) {
                                classSectionsMap[key].subjects[subj].pass++;
                              } else {
                                classSectionsMap[key].subjects[subj].fail++;
                              }
                            }
                          } else {
                            const examVal = sheet.cells[`${studentId}-m${mIdx}-written`];
                            if (examVal !== undefined && examVal !== "") {
                              const score = parseFloat(examVal);
                              if (!isNaN(score)) {
                                if (score >= examThreshold) {
                                  classSectionsMap[key].subjects[subj].pass++;
                                } else {
                                  classSectionsMap[key].subjects[subj].fail++;
                                }
                              }
                            }
                          }
                        });
                      });
                    });

                    const subjectsList = Array.from(allSubjectsSet);
                    const classSectionsList = Object.values(classSectionsMap).sort((a, b) => {
                      const gradeCompare = a.grade.localeCompare(b.grade, undefined, { numeric: true });
                      if (gradeCompare !== 0) return gradeCompare;
                      return a.section.localeCompare(b.section);
                    });

                    let bestSection = "---";
                    let bestRate = -1;
                    let bestCount = 0;
                    
                    let worstSection = "---";
                    let worstRate = -1;
                    let worstCount = 0;

                    classSectionsList.forEach((cs) => {
                      let totalPass = 0;
                      let totalFail = 0;
                      Object.values(cs.subjects).forEach((sub) => {
                        totalPass += sub.pass;
                        totalFail += sub.fail;
                      });
                      const total = totalPass + totalFail;
                      if (total > 0) {
                        const passRate = (totalPass / total) * 100;
                        const failRate = (totalFail / total) * 100;
                        if (passRate > bestRate) {
                          bestRate = passRate;
                          bestSection = `الصف ${cs.grade} / ${cs.section}`;
                          bestCount = totalPass;
                        }
                        if (failRate > worstRate && totalFail > 0) {
                          worstRate = failRate;
                          worstSection = `الصف ${cs.grade} / ${cs.section}`;
                          worstCount = totalFail;
                        }
                      }
                    });

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Users className="text-amber-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          {/* Mode Toggle Buttons */}
                          <div className="flex justify-start items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
                            <button
                              onClick={() => setGradesDisplayMode("total")}
                              className={`px-6 py-2 rounded-xl font-bold text-[11px] transition-all duration-200 ${
                                gradesDisplayMode === "total"
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              مجموع الدرجات
                            </button>
                            <button
                              onClick={() => setGradesDisplayMode("exam_only")}
                              className={`px-6 py-2 rounded-xl font-bold text-[11px] transition-all duration-200 ${
                                gradesDisplayMode === "exam_only"
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              درجة الاختبار فقط
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر نجاحاً 🏆</span>
                                <span className="text-base font-black text-emerald-900">{bestSection}</span>
                                {bestRate >= 0 && (
                                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">نسبة النجاح: {Math.round(bestRate)}% ({bestCount} طالب)</span>
                                )}
                              </div>
                              <span className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">📈</span>
                            </div>

                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-bold block mb-1">الشعبة الأكثر رسوباً ⚠️</span>
                                <span className="text-base font-black text-rose-900">{worstSection}</span>
                                {worstRate >= 0 ? (
                                  <span className="text-[10px] text-rose-700 font-bold block mt-1">نسبة الرسوب: {Math.round(worstRate)}% ({worstCount} طالب)</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold block mt-1">لا توجد حالات رسوب</span>
                                )}
                              </div>
                              <span className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">📉</span>
                            </div>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs border-collapse min-w-[500px]">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold border-l border-slate-100 w-20">الصف</th>
                                  <th className="p-3 font-bold border-l border-slate-100 w-20">الشعبة</th>
                                  {subjectsList.map((subj) => (
                                    <th key={subj} className="p-3 font-bold text-center border-l border-slate-100 whitespace-nowrap">{subj}</th>
                                  ))}
                                  {subjectsList.length === 0 && (
                                    <th className="p-3 font-bold text-center">لا توجد مواد دراسية مرصودة</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {classSectionsList.map((cs, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800 border-l border-slate-100">{cs.grade}</td>
                                    <td className="p-3 font-bold text-slate-800 border-l border-slate-100">{cs.section}</td>
                                    {subjectsList.map((subj) => {
                                      const dataSub = cs.subjects[subj];
                                      if (!dataSub || (dataSub.pass === 0 && dataSub.fail === 0)) {
                                        return <td key={subj} className="p-3 text-slate-400 text-center border-l border-slate-100">-</td>;
                                      }
                                      return (
                                        <td key={subj} className="p-3 text-center border-l border-slate-100">
                                          <div className="flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-emerald-600 font-black">ناجح: {dataSub.pass}</span>
                                            <span className="text-rose-600 font-black">راسب: {dataSub.fail}</span>
                                          </div>
                                        </td>
                                      );
                                    })}
                                    {subjectsList.length === 0 && (
                                      <td className="p-6 text-center text-slate-400 font-bold">لا توجد تفاصيل مواد مرصودة</td>
                                    )}
                                  </tr>
                                ))}
                                {classSectionsList.length === 0 && (
                                  <tr>
                                    <td colSpan={subjectsList.length + 2} className="p-6 text-center text-slate-400 font-bold">لا توجد كشوفات درجات متوافقة مع الفلاتر في هذه الفترة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 11. supervisor_strategies
                  if (reportId === "supervisor_strategies") {
                    const matchedEvals = (data.teacherEvaluations || []).filter((r: any) => {
                      if (selectedSchool && r.school !== selectedSchool) return false;
                      if (!checkBranchMatch(r.branch)) return false;
                      return matchesDateRange(r.date, dateFrom, dateTo);
                    });

                    const counts: Record<string, number> = {};
                    let totalUses = 0;

                    matchedEvals.forEach((r: any) => {
                      let list: string[] = [];
                      if (r.customOptions && Array.isArray(r.customOptions.strategies)) {
                        list = r.customOptions.strategies;
                      } else {
                        const rawVal = r.strategies || '';
                        if (typeof rawVal === 'string') {
                          list = rawVal.split(/[،,]/).map((s: string) => s.trim()).filter(Boolean);
                        }
                      }

                      list.forEach(item => {
                        if (item) {
                          const parts = item.split(/[،,]/).map(p => p.trim()).filter(Boolean);
                          parts.forEach(p => {
                            counts[p] = (counts[p] || 0) + 1;
                            totalUses++;
                          });
                        }
                      });
                    });

                    const sortedList = Object.entries(counts)
                      .map(([name, count]) => ({ name, count }))
                      .sort((a, b) => b.count - a.count);

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="text-emerald-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">العدد الكلي للاستراتيجيات المنفذة</span>
                              <span className="text-2xl font-black text-emerald-900">{totalUses} استخدام</span>
                            </div>
                            <span className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">💡</span>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم الاستراتيجية</th>
                                  <th className="p-3 font-bold text-left">عدد مرات الاستخدام من قبل المعلمين</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sortedList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                    <td className="p-3 text-left font-black text-emerald-600">{item.count} مرة</td>
                                  </tr>
                                ))}
                                {sortedList.length === 0 && (
                                  <tr>
                                    <td colSpan={2} className="p-6 text-center text-slate-400 font-bold">لا توجد استراتيجيات منفذة في هذه الفترة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 12. supervisor_teaching_aids
                  if (reportId === "supervisor_teaching_aids") {
                    const matchedEvals = (data.teacherEvaluations || []).filter((r: any) => {
                      if (selectedSchool && r.school !== selectedSchool) return false;
                      if (!checkBranchMatch(r.branch)) return false;
                      return matchesDateRange(r.date, dateFrom, dateTo);
                    });

                    const counts: Record<string, number> = {};
                    let totalUses = 0;

                    matchedEvals.forEach((r: any) => {
                      let list: string[] = [];
                      if (r.customOptions && Array.isArray(r.customOptions.tools)) {
                        list = r.customOptions.tools;
                      } else {
                        const rawVal = r.tools || '';
                        if (typeof rawVal === 'string') {
                          list = rawVal.split(/[،,]/).map((s: string) => s.trim()).filter(Boolean);
                        }
                      }

                      list.forEach(item => {
                        if (item) {
                          const parts = item.split(/[،,]/).map(p => p.trim()).filter(Boolean);
                          parts.forEach(p => {
                            counts[p] = (counts[p] || 0) + 1;
                            totalUses++;
                          });
                        }
                      });
                    });

                    const sortedList = Object.entries(counts)
                      .map(([name, count]) => ({ name, count }))
                      .sort((a, b) => b.count - a.count);

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="text-emerald-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">العدد الكلي للوسائل التعليمية المستخدمة</span>
                              <span className="text-2xl font-black text-emerald-900">{totalUses} استخدام</span>
                            </div>
                            <span className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">🔧</span>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم الوسيلة</th>
                                  <th className="p-3 font-bold text-left">عدد مرات الاستخدام من قبل المعلمين</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sortedList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                    <td className="p-3 text-left font-black text-emerald-600">{item.count} مرة</td>
                                  </tr>
                                ))}
                                {sortedList.length === 0 && (
                                  <tr>
                                    <td colSpan={2} className="p-6 text-center text-slate-400 font-bold">لا توجد وسائل مستخدمة في هذه الفترة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 13. supervisor_programs
                  if (reportId === "supervisor_programs") {
                    const matchedEvals = (data.teacherEvaluations || []).filter((r: any) => {
                      if (selectedSchool && r.school !== selectedSchool) return false;
                      if (!checkBranchMatch(r.branch)) return false;
                      return matchesDateRange(r.date, dateFrom, dateTo);
                    });

                    const counts: Record<string, number> = {};
                    let totalUses = 0;

                    matchedEvals.forEach((r: any) => {
                      let list: string[] = [];
                      if (r.customOptions && Array.isArray(r.customOptions.programs)) {
                        list = r.customOptions.programs;
                      } else {
                        const rawVal = r.programs || '';
                        if (typeof rawVal === 'string') {
                          list = rawVal.split(/[،,]/).map((s: string) => s.trim()).filter(Boolean);
                        }
                      }

                      list.forEach(item => {
                        if (item) {
                          const parts = item.split(/[،,]/).map(p => p.trim()).filter(Boolean);
                          parts.forEach(p => {
                            counts[p] = (counts[p] || 0) + 1;
                            totalUses++;
                          });
                        }
                      });
                    });

                    const sortedList = Object.entries(counts)
                      .map(([name, count]) => ({ name, count }))
                      .sort((a, b) => b.count - a.count);

                    return (
                      <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="text-emerald-500" size={18} />
                            <span className="font-black text-slate-800 text-sm">{report.label}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                            {category?.label}
                          </span>
                        </div>
                        <div className="p-5 space-y-6">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-500 font-bold block mb-1">العدد الكلي للبرامج المنفذة</span>
                              <span className="text-2xl font-black text-emerald-900">{totalUses} برنامج</span>
                            </div>
                            <span className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">💻</span>
                          </div>

                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 border-b border-slate-100">
                                  <th className="p-3 font-bold">اسم البرنامج المنفذ</th>
                                  <th className="p-3 font-bold text-left">عدد مرات الاستخدام من قبل المعلمين</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sortedList.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                                    <td className="p-3 text-left font-black text-emerald-600">{item.count} مرة</td>
                                  </tr>
                                ))}
                                {sortedList.length === 0 && (
                                  <tr>
                                    <td colSpan={2} className="p-6 text-center text-slate-400 font-bold">لا توجد برامج منفذة في هذه الفترة</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default Fallback Mock Card for other unlinked reports
                  // Simple mock data for styling and demonstration
                  const mockVal1 = Math.floor(Math.random() * 30) + 70;
                  const mockVal2 = Math.floor(Math.random() * 40) + 10;
                  const mockVal3 = Math.floor(Math.random() * 10) + 1;

                  return (
                    <div key={reportId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow text-right animate-in slide-in-from-bottom-2 duration-300">
                      {/* Card Header */}
                      <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {category?.label === "قسم الحركة والمواصلات" && <Bus className="text-cyan-500" size={18} />}
                          {category?.label === "المشرف التربوي" && <ClipboardList className="text-emerald-500" size={18} />}
                          {category?.label === "تقارير الطلاب" && <Users className="text-amber-500" size={18} />}
                          {category?.label === "تقارير المعلم" && <GraduationCap className="text-blue-500" size={18} />}
                          {category?.label === "تقارير الإداري" && <Briefcase className="text-purple-500" size={18} />}
                          {category?.label === "تقارير الإتلاف والصيانة" && <AlertCircle className="text-rose-500" size={18} />}
                          <span className="font-black text-slate-800 text-sm">{report.label}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${category?.color}`}>
                          {category?.label}
                        </span>
                      </div>

                      {/* Card Content & Graphs Mockups */}
                      <div className="p-5 space-y-4">
                        {/* Mock Progress Bars / Charts */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                              <span>نسبة الإنجاز المتوقعة للتقارير</span>
                              <span>{mockVal1}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-50 rounded-full transition-all duration-500" style={{ width: `${mockVal1}%` }}></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block">إجمالي السجلات المفترضة</span>
                              <span className="text-base font-black text-slate-700">{mockVal2} سجل</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block">معدل التكرار الإحصائي</span>
                              <span className="text-base font-black text-slate-700">{mockVal3} مرات / أسبوعياً</span>
                            </div>
                          </div>
                        </div>

                        {/* Mock Visual Graph constructed with HTML/CSS */}
                        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[9px] text-slate-400 font-black block text-right">مخطط بياني توضيحي لهيكل البيانات (مخطط أعمدة أفقي)</span>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400 w-16 text-left truncate">الالتزام الكامل</span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-md overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-md" style={{ width: "85%" }}></div>
                              </div>
                              <span className="text-[9px] font-black text-slate-500">85%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400 w-16 text-left truncate">الالتزام الجزئي</span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-md overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-md" style={{ width: "45%" }}></div>
                              </div>
                              <span className="text-[9px] font-black text-slate-500">45%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400 w-16 text-left truncate">التجاوزات والغياب</span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-md overflow-hidden">
                                <div className="h-full bg-rose-50 rounded-md" style={{ width: "12%" }}></div>
                              </div>
                              <span className="text-[9px] font-black text-slate-500">12%</span>
                            </div>
                          </div>
                        </div>

                        {/* Status skeleton */}
                        <div className="text-[10px] text-slate-400 font-bold flex justify-between items-center border-t pt-3">
                          <span>الربط البرمجي بقاعدة البيانات:</span>
                          <span className="text-amber-500 font-black animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            قيد الإعداد والربط للمرحلة القادمة
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
