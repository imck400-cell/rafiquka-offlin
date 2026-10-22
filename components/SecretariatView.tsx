import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Briefcase,
  Users,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  School,
  ListChecks
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobal } from "../context/GlobalState";
import * as XLSX from "xlsx";

type TabType = "students" | "staff" | null;

interface StudentData {
  id: string;
  serialNumber: number;
  schoolBranch?: string;
  school: string;
  branch: string;
  name: string;
  grade: string;
  section: string;
  gender: string;
  residenceWork: string;
  healthStatus: string;
  guardianInfo: string;
  guardianPhone?: string;
  date?: string;
}

interface StaffData {
  id: string;
  serialNumber: number;
  schoolBranch?: string;
  school: string;
  branch: string;
  name: string;
  gender: string;
  jobTitles: string[];
  subjects?: string[];
  phone: string;
  grades: string[];
  date?: string;
}

import ConfirmDialog from "./ConfirmDialog";
import { TeacherCriteriaModal } from "./TeacherCriteriaModal";
import { AdminCriteriaModal } from "./AdminCriteriaModal";
import { SchoolProfileModal } from "./SchoolProfileModal";
import { SupervisionCriteriaControl } from "../app/SupervisionCriteriaControl";

export const SecretariatView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(null);
  const [isTeacherCriteriaOpen, setIsTeacherCriteriaOpen] = useState(false);
  const [isAdminCriteriaOpen, setIsAdminCriteriaOpen] = useState(false);
  const [isSchoolProfileOpen, setIsSchoolProfileOpen] = useState(false);
  const [isSupervisionCriteriaOpen, setIsSupervisionCriteriaOpen] = useState(false);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Briefcase className="text-amber-500" size={32} />
          السكرتارية
        </h2>
      </div>

      {!activeTab ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("students")}
              className="p-8 bg-blue-500 rounded-3xl text-white shadow-lg hover:shadow-blue-500/30 transition-all text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center">
                <Users size={48} className="mb-4" />
                <h3 className="text-2xl font-black">التحكم بشؤون الطلاب</h3>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("staff")}
              className="p-8 bg-emerald-500 rounded-3xl text-white shadow-lg hover:shadow-emerald-500/30 transition-all text-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center">
                <Briefcase size={48} className="mb-4" />
                <h3 className="text-2xl font-black">التحكم بشؤون الموظفين</h3>
              </div>
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTeacherCriteriaOpen(true)}
              className="p-6 bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl text-slate-800 shadow-xl shadow-blue-500/10 hover:bg-white/90 transition-all text-center group relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-4 rounded-2xl mb-4 shadow-lg text-white group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={32} />
                </div>
                <h3 className="text-lg font-black">التحكم بمعايير المعلمين</h3>
                <p className="text-xs text-slate-500 mt-2">
                  إضافة، تعديل، وحذف المعايير الافتراضية
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsSupervisionCriteriaOpen(true)}
              className="p-6 bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl text-slate-800 shadow-xl shadow-indigo-500/10 hover:bg-white/90 transition-all text-center group relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl mb-4 shadow-lg text-white group-hover:scale-110 transition-transform">
                  <ListChecks size={32} />
                </div>
                <h3 className="text-lg font-black">التحكم بمعايير الإشراف التربوي</h3>
                <p className="text-xs text-slate-500 mt-2">
                  تعديل مجالات الإشراف وتعميمها
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAdminCriteriaOpen(true)}
              className="p-6 bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl text-slate-800 shadow-xl shadow-emerald-500/10 hover:bg-white/90 transition-all text-center group relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-4 rounded-2xl mb-4 shadow-lg text-white group-hover:scale-110 transition-transform">
                  <Briefcase size={32} />
                </div>
                <h3 className="text-lg font-black">التحكم بمعايير الموظفين</h3>
                <p className="text-xs text-slate-500 mt-2">
                  تخصيص مجالات التقارير ومعايير التقييم
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsSchoolProfileOpen(true)}
              className="p-6 bg-white/70 backdrop-blur-md border border-white/80 rounded-3xl text-slate-800 shadow-xl shadow-violet-500/10 hover:bg-white/90 transition-all text-center group relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-4 rounded-2xl mb-4 shadow-lg text-white group-hover:scale-110 transition-transform">
                  <School size={32} />
                </div>
                <h3 className="text-lg font-black">التحكم بملف المدرسة</h3>
                <p className="text-xs text-slate-500 mt-2">
                  تعديل وتعميم البيانات والشعار
                </p>
              </div>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-800">
              {activeTab === "students" ? "التحكم بشؤون الطلاب" : "التحكم بشؤون الموظفين"}
            </h3>
            <button
              onClick={() => setActiveTab(null)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
            >
              العودة للخيارات
            </button>
          </div>

          {activeTab === "students" ? <StudentsManager /> : <StaffManager />}
        </div>
      )}

      <TeacherCriteriaModal
        isOpen={isTeacherCriteriaOpen}
        onClose={() => setIsTeacherCriteriaOpen(false)}
      />

      <AdminCriteriaModal
        isOpen={isAdminCriteriaOpen}
        onClose={() => setIsAdminCriteriaOpen(false)}
      />

      <SchoolProfileModal
        isOpen={isSchoolProfileOpen}
        onClose={() => setIsSchoolProfileOpen(false)}
      />

      {isSupervisionCriteriaOpen && (
        <SupervisionCriteriaControl onClose={() => setIsSupervisionCriteriaOpen(false)} />
      )}
    </div>
  );
};

const parseStudentAndGuardian = (fullName: string): { studentName: string; guardianName: string } => {
  if (!fullName) return { studentName: "", guardianName: "" };
  
  // 1. Clean and normalize spaces
  let nameStr = fullName.trim().replace(/\s+/g, " ");
  let words = nameStr.split(" ");
  
  // 2. Normalize compound names written as single word (e.g. عبدالله -> عبد الله)
  const normalizedWords: string[] = [];
  words.forEach(word => {
    if (word.startsWith("عبد") && word.length > 3 && word !== "عبده" && word !== "عبيد") {
      normalizedWords.push("عبد");
      normalizedWords.push(word.substring(3));
    } else if (word.startsWith("عبيد") && word.length > 4 && word !== "عبيد") {
      normalizedWords.push("عبيد");
      normalizedWords.push(word.substring(4));
    } else if (word.startsWith("أمة") && word.length > 3) {
      normalizedWords.push("أمة");
      normalizedWords.push(word.substring(3));
    } else if (word.startsWith("أبو") && word.length > 3) {
      normalizedWords.push("أبو");
      normalizedWords.push(word.substring(3));
    } else if (word.startsWith("ابن") && word.length > 3 && word !== "ابنه") {
      normalizedWords.push("ابن");
      normalizedWords.push(word.substring(3));
    } else if (word.startsWith("ابنة") && word.length > 4) {
      normalizedWords.push("ابنة");
      normalizedWords.push(word.substring(4));
    } else {
      normalizedWords.push(word);
    }
  });

  const studentName = normalizedWords.join(" ");
  
  // 3. Determine first name word count
  let firstNameWordsCount = 1;
  if (normalizedWords.length > 1) {
    const first = normalizedWords[0];
    const second = normalizedWords[1];
    
    const compoundPrefixes = ["عبد", "أمة", "أبو", "أبي", "أم", "ابن", "ابنة", "عبيد"];
    if (compoundPrefixes.includes(first)) {
      firstNameWordsCount = 2;
    } else if (second === "الدين" || second === "الإسلام" || second === "الاسلام") {
      firstNameWordsCount = 2;
    } else if (first === "محمد" && ["أمين", "صالح", "نجيب", "أحمد", "علي", "محمود", "طه", "مصطفى", "بشير", "منير"].includes(second)) {
      firstNameWordsCount = 2;
    } else if (first === "علي" && second === "رضا") {
      firstNameWordsCount = 2;
    } else if (first === "فاطمة" && second === "الزهراء") {
      firstNameWordsCount = 2;
    }
  }

  const guardianName = normalizedWords.slice(firstNameWordsCount).join(" ");
  
  return { studentName, guardianName };
};

const StudentsManager = () => {
  const { currentUser, data, updateData } = useGlobal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<StudentData[]>([]);

  const studentsRef = useRef(students);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const [localNames, setLocalNames] = useState<Record<string, string>>({});
  const [localResidence, setLocalResidence] = useState<Record<string, string>>({});
  const [localHealth, setLocalHealth] = useState<Record<string, string>>({});
  const [localGuardian, setLocalGuardian] = useState<Record<string, string>>({});
  const [localGuardianPhone, setLocalGuardianPhone] = useState<Record<string, string>>({});

  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const schoolOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.school).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const branchOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.branch).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const genderOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.gender).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const gradeOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const sectionOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.section).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const healthOptions = useMemo(() => {
    return Array.from(new Set(students.map(s => s.healthStatus).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const getAvailableBranches = (school: string) => {
    if (!school) return [];
    const _allBranches = data.schoolBranches?.[school];
    const allBranches = Array.isArray(_allBranches) ? _allBranches : [];
    if (isGeneralSupervisor) return allBranches;
    const _userBranches = currentUser?.permissions?.schoolsAndBranches?.[school];
    const userBranches = Array.isArray(_userBranches) ? _userBranches : [];
    if (userBranches.length > 0) return userBranches;
    return allBranches;
  };

  useEffect(() => {
    const cloudData = data.secretariatStudents || [];
    
    // Convert schoolBranch descriptors to proper fields if necessary
    const newStudents = cloudData.map((s: any) => ({
      ...s,
      school:
        s.school ||
        (s.schoolBranch
          ? s.schoolBranch.split("-")[0]?.trim() || s.schoolBranch
          : ""),
      branch:
        s.branch ||
        (s.schoolBranch ? s.schoolBranch.split("-")[1]?.trim() || "" : ""),
    }));
    
    // Sort all combined students alphabetically by Arabic name strictly
    const sortedStudents = [...newStudents].sort((a, b) => {
      const nameA = a.name ? a.name.trim() : "";
      const nameB = b.name ? b.name.trim() : "";
      if (!nameA && nameB) return 1;
      if (nameA && !nameB) return -1;
      return nameA.localeCompare(nameB, "ar");
    });
    
    // Deep compare to prevent flickering from frequent refetches
    if (JSON.stringify(studentsRef.current) !== JSON.stringify(sortedStudents)) {
      setStudents(sortedStudents);
    }
  }, [data.secretariatStudents]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(50);
  const [studentFilterGrade, setStudentFilterGrade] = useState("");
  const [studentFilterSection, setStudentFilterSection] = useState("");
  const [studentFilterDate, setStudentFilterDate] = useState("");
  const [studentFilterName, setStudentFilterName] = useState("");
  const [studentFilterField, setStudentFilterField] = useState("");
  const [studentFilterFieldValue, setStudentFilterFieldValue] = useState("");

  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [hasPromptedMissing, setHasPromptedMissing] = useState(false);
  const [showMissingAlert, setShowMissingAlert] = useState(false);

  const getMissingFields = (s: StudentData) => {
    const missing = [];
    if (!s.school) missing.push("school");
    if (!s.branch) missing.push("branch");
    if (!s.name) missing.push("name");
    if (!s.grade) missing.push("grade");
    if (!s.section) missing.push("section");
    if (!s.gender) missing.push("gender");
    return missing;
  };

  useEffect(() => {
    if (students.length > 0 && !hasPromptedMissing) {
      const hasMissing = students.some((s) => getMissingFields(s).length > 0);
      if (hasMissing) {
        setShowMissingAlert(true);
        setHasPromptedMissing(true);
      }
    }
  }, [students, hasPromptedMissing]);

  const bulkUpdateField = (field: string, value: any) => {
    if (!value) return;
    const filteredIds = new Set(filteredStudents.map((fs) => fs.id));
    const newStudents = students.map((s) => {
      if (filteredIds.has(s.id)) {
        return { ...s, [field]: value };
      }
      return s;
    });
    saveStudents(newStudents);
  };

  const getContextSchoolAndBranch = () => {
    let school = "";
    let branch = "";
    const rawSchool = currentUser?.selectedSchool?.split(",")[0]?.trim();
    const defaultAvailable = data.availableSchools && data.availableSchools.length > 0 ? data.availableSchools[0] : "";
    school = rawSchool && rawSchool !== "all" ? rawSchool : (data.profile?.schoolName || defaultAvailable || "المدرسة");
    
    const rawBranch = currentUser?.selectedBranch?.split(",")[0]?.trim();
    const availableBranches = getAvailableBranches(school);
    const defaultBranch = availableBranches.length > 0 ? availableBranches[0] : "";
    branch = rawBranch && rawBranch !== "all" ? rawBranch : (defaultBranch || "بنين");
    
    return { school, branch };
  };

  const saveStudents = (newStudents: StudentData[]) => {
    // Alphabetical Arabic sort & proper dynamic re-numbering
    const sortedStudents = [...newStudents]
      .sort((a, b) => {
        const nameA = a.name ? a.name.trim() : "";
        const nameB = b.name ? b.name.trim() : "";
        if (!nameA && nameB) return 1;
        if (nameA && !nameB) return -1;
        return nameA.localeCompare(nameB, "ar");
      })
      .map((s, idx) => ({ ...s, serialNumber: idx + 1 }));

    setStudents(sortedStudents);

    // Sync to studentReports to ensure imported students are globally available
    const existingReports = data.studentReports || [];
    const mergedReports = [...existingReports];
    
    // Quick lookup maps to avoid O(N^2) freezes
    const idMap = new Map();
    const compoundMap = new Map();
    mergedReports.forEach((r, i) => {
      idMap.set(r.id, i);
      if (r.name && r.grade && r.section) {
        compoundMap.set(`${r.name}-${r.grade}-${r.section}`, i);
      }
    });

    let reportsChanged = false;

    sortedStudents.forEach((s) => {
      let existsIdx = idMap.has(s.id) ? idMap.get(s.id) : -1;
      if (existsIdx === -1 && s.name && s.grade && s.section) {
        existsIdx = compoundMap.has(`${s.name}-${s.grade}-${s.section}`) 
          ? compoundMap.get(`${s.name}-${s.grade}-${s.section}`) 
          : -1;
      }

      if (existsIdx === -1) {
        mergedReports.push({
          id: s.id,
          userId: currentUser?.id || "",
          createdAt: new Date().toISOString(),
          name: s.name || "",
          gender: s.gender || "",
          grade: s.grade || "",
          section: s.section || "",
          address: s.residenceWork || "",
          workOutside: "",
          healthStatus: s.healthStatus || "ممتاز",
          healthDetails: "",
          guardianName: s.guardianInfo || "",
          guardianPhones: [],
          academicReading: "متوسط",
          academicWriting: "متوسط",
          academicParticipation: "متوسط",
          behaviorLevel: "متوسط",
          mainNotes: [],
          otherNotesText: "",
          guardianEducation: "متعلم",
          guardianFollowUp: "متوسط",
          guardianCooperation: "متوسط",
          notes: "",
        } as any);
        reportsChanged = true;
      } else {
        // Sync immutable details so that editing in secretariat reflects globally
        const exists = mergedReports[existsIdx];
        if (
          exists.name !== (s.name || exists.name) ||
          exists.gender !== (s.gender || exists.gender) ||
          exists.address !== (s.residenceWork || exists.address) ||
          exists.healthStatus !== (s.healthStatus || exists.healthStatus) ||
          exists.guardianName !== (s.guardianInfo || exists.guardianName) ||
          exists.grade !== (s.grade || exists.grade) ||
          exists.section !== (s.section || exists.section)
        ) {
          mergedReports[existsIdx] = {
            ...exists,
            name: s.name || exists.name,
            gender: s.gender || exists.gender,
            address: s.residenceWork || exists.address,
            healthStatus: s.healthStatus || exists.healthStatus,
            guardianName: s.guardianInfo || exists.guardianName,
            grade: s.grade || exists.grade,
            section: s.section || exists.section,
          };
          reportsChanged = true;
        }
      }
    });

    const updates: any = { secretariatStudents: sortedStudents };
    if (reportsChanged) updates.studentReports = mergedReports;
    updateData(updates);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const parseExcel = () => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const ab = evt.target?.result;
          if (!ab) throw new Error("Could not read file data");
          const wb = XLSX.read(ab, { type: "array" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          // Get 2D grid of values instead of default key-value objects
          const sheetData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          if (!sheetData || sheetData.length === 0) {
            throw new Error("Empty sheet");
          }

          let headerRowIdx = -1;
          let nameColIdx = -1;
          let schoolColIdx = -1;
          let branchColIdx = -1;
          let gradeColIdx = -1;
          let sectionColIdx = -1;
          let genderColIdx = -1;
          let resColIdx = -1;
          let healthColIdx = -1;
          let guardianColIdx = -1;
          let phoneColIdx = -1;

          const studentNameKeys = [
            "اسم الطالب",
            "الاسم ثلاثي",
            "الاسم رباعي",
            "الاسم الكامل",
            "اسم",
            "الاسم",
            "الاسم/الهاتف",
            "ألاسم/الهاتف",
            "ألاسم",
            "student_name",
            "name"
          ];

          for (let r = 0; r < sheetData.length; r++) {
            const row = sheetData[r];
            if (!row || !Array.isArray(row)) continue;
            
            let foundNameKey = false;
            for (let c = 0; c < row.length; c++) {
              const val = row[c] ? String(row[c]).trim().replace(/\s+/g, " ") : "";
              if (studentNameKeys.includes(val)) {
                foundNameKey = true;
                break;
              }
            }

            if (foundNameKey) {
              headerRowIdx = r;
              // Map all columns based on header row names
              for (let c = 0; c < row.length; c++) {
                const val = row[c] ? String(row[c]).trim().replace(/\s+/g, " ") : "";
                if (studentNameKeys.includes(val) && nameColIdx === -1) {
                  nameColIdx = c;
                } else if (["الصف", "الدرجة", "grade"].includes(val)) {
                  gradeColIdx = c;
                } else if (["الشعبة", "الفصل", "section"].includes(val)) {
                  sectionColIdx = c;
                } else if (["اسم المدرسة", "المدرسة", "school"].includes(val)) {
                  schoolColIdx = c;
                } else if (["اسم الفرع", "الفرع", "branch"].includes(val)) {
                  branchColIdx = c;
                } else if (["النوع", "الجنس", "gender"].includes(val)) {
                  genderColIdx = c;
                } else if (["السكن/العمل", "السكن / العمل", "العنوان", "السكن", "residenceWork"].includes(val)) {
                  resColIdx = c;
                } else if (["الحالة الصحية", "حالة صحية", "healthStatus"].includes(val)) {
                  healthColIdx = c;
                } else if (["اسم ولي الأمر", "اسم ولي الامر", "اسم ولي الامر/الهاتف", "اسم ولي الأمر/الهاتف", "ولي الأمر", "ولي الامر", "guardianInfo"].includes(val)) {
                  guardianColIdx = c;
                } else if (["رقم الهاتف", "الهاتف", "تلفون ولي الأمر", "تلفون", "تلفون ولي الامر", "رقم تليفون", "التلفون", "الجوال", "رقم الجوال", "guardianPhone", "phone"].includes(val)) {
                  phoneColIdx = c;
                }
              }
              break;
            }
          }

          if (headerRowIdx === -1 || nameColIdx === -1) {
            alert("لم يتم العثور على رأس الجدول (العمود الذي يحتوي على 'الاسم' أو 'اسم الطالب') في ملف الاكسل المستورد. يرجى مراجعة عناوين الأعمدة.");
            return;
          }

          // Get active school and branch context to align imported records and prevent filtering them out
          const { school: activeSchool, branch: activeBranch } = getContextSchoolAndBranch();

          const userSch = currentUser?.selectedSchool?.split(",")[0];
          const defaultAvail = data.availableSchools && data.availableSchools.length > 0 ? data.availableSchools[0] : "";
          
          const fallbackSchool = userSch && userSch !== "all" ? userSch : (data.profile?.schoolName || defaultAvail || activeSchool);
          const fallbackBranch = currentUser?.selectedBranch || activeBranch;

          let newStudents: StudentData[] = [...studentsRef.current];
          let maxSerial = newStudents.reduce(
            (max, s) => Math.max(max, s.serialNumber),
            0,
          );

          let importedCount = 0;

          const getValAt = (row: any[], idx: number): string => {
            if (idx === -1 || !row || row[idx] === undefined || row[idx] === null) return "";
            return String(row[idx]).trim();
          };

          for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
            const row = sheetData[r];
            if (!row || !Array.isArray(row)) continue;

            const nameVal = getValAt(row, nameColIdx);
            if (!nameVal) continue; // Skip rows where name cell is empty

            const cleanName = (val: string): string => {
              let s = val.trim();
              s = s.replace(/^(الاسم\s*[:\/\\-]*\s*|اسم\s*[:\/\\-]*\s*|الاسم\s+الكامل\s*[:\/\\-]*\s*|ألاسم\s*[:\/\\-]*\s*)/i, "");
              s = s.replace(/\s+/g, " ").trim();
              return s;
            };

            const processedName = cleanName(nameVal);
            if (!processedName || ["الاسم", "اسم الطالب", "تم التصدير"].includes(processedName)) {
              continue; // Skip title headers or helper info rows re-appeared
            }

            // Detect row school & branch if present, otherwise fall back to context
            let rowSchoolName = schoolColIdx !== -1 ? getValAt(row, schoolColIdx) : "";
            let rowBranchName = branchColIdx !== -1 ? getValAt(row, branchColIdx) : "";

            let studentSchool = rowSchoolName || fallbackSchool;
            let studentBranch = rowBranchName || fallbackBranch;

            if (!isGeneralSupervisor) {
              // Non-admin MUST strictly be forced into active context school & branch they are authorized to see
              studentSchool = activeSchool;
              studentBranch = activeBranch;
            }

            const parsedNames = parseStudentAndGuardian(processedName);
            maxSerial++;
            newStudents.push({
              id:
                Date.now().toString() +
                Math.random().toString(36).substring(2, 9),
              serialNumber: maxSerial,
              school: studentSchool,
              branch: studentBranch,
              name: parsedNames.studentName,
              grade: getValAt(row, gradeColIdx),
              section: getValAt(row, sectionColIdx),
              gender: getValAt(row, genderColIdx),
              residenceWork: getValAt(row, resColIdx),
              healthStatus: getValAt(row, healthColIdx),
              guardianInfo: parsedNames.guardianName,
              guardianPhone: getValAt(row, phoneColIdx),
            });
            importedCount++;
          }

          if (importedCount === 0) {
            alert("لم يتم العثور على أي صفوف بأسماء صالحة للاستيراد تحت رأس الجدول.");
            return;
          }

          const cleanStudents = JSON.parse(JSON.stringify(newStudents));
          saveStudents(cleanStudents);
          alert(`تم استيراد ${importedCount} من الطلاب بنجاح!`);
        } catch (err) {
          console.error(err);
          alert("حدث خطأ أثناء قراءة الملف. تأكد من صحة تنسيق ملف Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (isGeneralSupervisor) {
      setConfirmDialog({
        isOpen: true,
        title: "تحذير: استيراد بيانات",
        message: "أنت تقوم باستيراد بيانات طلاب بصلاحيات المشرف العام مباشرة. هل أنت متأكد من الاستمرار؟",
        type: "danger",
        onConfirm: () => {
          parseExcel();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      parseExcel();
    }
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const saveAs = (await import("file-saver")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("كشف الطلاب", {
        views: [{ rightToLeft: true }]
      });

      // Get profile info
      const { school: schoolName, branch: branchName } = getContextSchoolAndBranch();
      const profileInfo = data.profiles?.[schoolName] || data.profile || {};
      const resolvedProfile = branchName && profileInfo[branchName] ? profileInfo[branchName] : profileInfo;

      const totalCols = 11; // 11 columns for student table

      // Setup Header rows
      sheet.addRow([]); // Row 1 (empty spacer)

      // Right Header Info
      sheet.mergeCells("A2:C5");
      sheet.getCell("A2").value = `الجمهورية اليمنية\n${resolvedProfile?.ministry || "وزارة التربية والتعليم والبحث العلمي"}\nالمنطقة التعليمية: ${resolvedProfile?.district || ""}\nمدرسة: ${schoolName}\n${branchName ? "فرع: " + branchName : ""}`;
      sheet.getCell("A2").alignment = { wrapText: true, horizontal: "right", vertical: "middle" };
      sheet.getCell("A2").font = { bold: true, size: 10, name: "Arial" };

      // Left Header Info
      const today = new Date();
      const daysOfWeekAr = ["الأحد", "الأثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dayName = daysOfWeekAr[today.getDay()];
      
      const hijriFormatter = new Intl.DateTimeFormat('ar-FR-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const hijriDate = hijriFormatter.format(today);
      
      const gregorianFormatter = new Intl.DateTimeFormat('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const gregorianDate = gregorianFormatter.format(today);

      sheet.mergeCells(2, totalCols - 1, 5, totalCols);
      sheet.getCell(2, totalCols - 1).value = `اليوم: ${dayName}\nالتاريخ الهجري: ${hijriDate}\nالتاريخ الميلادي: ${gregorianDate}`;
      sheet.getCell(2, totalCols - 1).alignment = { wrapText: true, horizontal: "left", vertical: "middle" };
      sheet.getCell(2, totalCols - 1).font = { bold: true, size: 10, name: "Arial" };

      // Center (Logo)
      if (resolvedProfile?.logoImg && resolvedProfile.logoImg.startsWith("data:image")) {
        try {
          const imageId = workbook.addImage({
            base64: resolvedProfile.logoImg.split(",")[1],
            extension: "png",
          });
          sheet.addImage(imageId, {
            tl: { col: 4, row: 1 },
            ext: { width: 70, height: 70 }
          });
        } catch (e) {}
      } else {
        sheet.mergeCells("E2:G5");
        sheet.getCell("E2").value = "شعار المدرسة";
        sheet.getCell("E2").alignment = { horizontal: "center", vertical: "middle" };
        sheet.getCell("E2").font = { bold: true, size: 12, name: "Arial" };
      }

      sheet.getRow(2).height = 20;
      sheet.getRow(3).height = 20;
      sheet.getRow(4).height = 20;
      sheet.getRow(5).height = 20;

      sheet.addRow([]); // Row 6 (Spacer)
      sheet.addRow([]); // Row 7 (Spacer)

      // Title Row
      sheet.mergeCells("A8:K8");
      sheet.getCell("A8").value = "كشف ببيانات شؤون الطلاب";
      sheet.getCell("A8").alignment = { horizontal: "center", vertical: "middle" };
      sheet.getCell("A8").font = { bold: true, size: 14, name: "Arial" };
      sheet.getRow(8).height = 30;

      sheet.addRow([]); // Row 9

      // Table Header row (Row 10)
      const headers = [
        "الرقم",
        "المدرسة",
        "الفرع",
        "الاسم",
        "الصف",
        "الشعبة",
        "النوع",
        "السكن/العمل",
        "الحالة الصحية",
        "اسم ولي الأمر",
        "رقم الهاتف"
      ];
      
      const headerRowVals = sheet.addRow(headers);
      headerRowVals.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A8A" } // Dark Blue
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
      sheet.getRow(10).height = 25;

      // Add Data
      filteredStudents.forEach((student, idx) => {
        const studentRow = sheet.addRow([
          idx + 1,
          student.school || "",
          student.branch || "",
          student.name || "",
          student.grade || "",
          student.section || "",
          student.gender || "",
          student.residenceWork || "",
          student.healthStatus || "",
          student.guardianInfo || "",
          student.guardianPhone || ""
        ]);
        
        studentRow.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { name: "Arial", size: 10 };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        });
        sheet.getRow(11 + idx).height = 20;
      });

      // Autofit columns
      sheet.columns.forEach((col, colIdx) => {
        if (colIdx === 0) { col.width = 6; return; }
        let maxLen = 12;
        col.eachCell?.((cell, rIdx) => {
          if (rIdx > 9 && cell.value) {
            const valStr = String(cell.value);
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        });
        col.width = Math.min(maxLen + 4, 30);
      });

      // Generate workbook and save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      saveAs(blob, `كشف_الطلاب_${schoolName || "شؤون_الطلاب"}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تصدير كشف الطلاب");
    }
  };

  const addEmptyRow = () => {
    const executeAdd = () => {
      const maxSerial = students.reduce(
        (max, s) => Math.max(max, s.serialNumber || 0),
        0,
      );
      
      const rawSchool = currentUser?.selectedSchool?.split(",")[0];
      const defaultAvailable = data.availableSchools && data.availableSchools.length > 0 ? data.availableSchools[0] : "";
      
      let fallbackSchoolDefault = rawSchool && rawSchool !== "all" 
        ? rawSchool 
        : (data.profile?.schoolName || defaultAvailable);

      let fallbackSchool = "";
      if (studentFilterGrade && filteredStudents.length > 0) {
        fallbackSchool = filteredStudents[0].school;
      } else {
        fallbackSchool = fallbackSchoolDefault;
      }

      let fallbackBranch = "";
      if (fallbackSchool) {
        const branches = getAvailableBranches(fallbackSchool);
        const currentSelectedBranches = (currentUser?.selectedBranch || "").split(',').map(b => b.trim());
        if (currentSelectedBranches.length > 0 && !currentSelectedBranches.includes('all')) {
          fallbackBranch = branches.find(b => currentSelectedBranches.includes(b)) || branches[0] || "";
        } else {
          fallbackBranch = branches[0] || "";
        }
      }

      const newStudent: StudentData = {
        id: "std-" + Date.now().toString() + Math.random().toString(36).substring(2, 7),
        serialNumber: maxSerial + 1,
        school: fallbackSchool,
        branch: fallbackBranch,
        name: "",
        grade: studentFilterGrade || "",
        section: studentFilterSection || "",
        gender: "",
        residenceWork: "",
        healthStatus: "",
        guardianInfo: "",
        guardianPhone: "",
      };

      saveStudents([...students, newStudent]);
      
      setSearchQuery("");
      
      const newTotal = filteredStudents.length + 1;
      const newPage = Math.ceil(newTotal / studentPageSize);
      setStudentPage(newPage > 0 ? newPage : 1);
    };

    if (isGeneralSupervisor) {
      setConfirmDialog({
        isOpen: true,
        title: "تحذير: إضافة طالب جديد",
        message: "أنت تقوم بإضافة طالب بصلاحيات المشرف العام مباشرة في السكرتارية. هل أنت متأكد من الاستمرار؟",
        type: "danger",
        onConfirm: () => {
          executeAdd();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      executeAdd();
    }
  };

  const updateRow = (id: string, field: string, value: any) => {
    const newStudents = students.map((s) => {
      if (s.id !== id) return s;
      let updated = { ...s, [field]: value };
      if (field === "name") {
        const parsed = parseStudentAndGuardian(value);
        updated.name = parsed.studentName;
        updated.guardianInfo = parsed.guardianName;
      }
      // Security: if school changes, reset branch to first available or empty
      if (field === "school") {
        const branches = getAvailableBranches(value);
        updated.branch = branches.length === 1 ? branches[0] : "";
      }
      return updated;
    });
    saveStudents(newStudents);
  };

  const deleteRow = (id: string) => {
    const executeDelete = () => {
      saveStudents(students.filter((s) => s.id !== id));
      setSelectedIds(selectedIds.filter((sel) => sel !== id));
    };

    if (isGeneralSupervisor) {
      setConfirmDialog({
        isOpen: true,
        title: "تحذير: حذف طالب",
        message: "أنت تقوم بحذف طالب بصلاحيات المشرف العام من السكرتارية. هذا سيؤثر على المدرسة التابع لها الطالب. هل أنت متأكد من الاستمرار؟",
        type: "danger",
        onConfirm: () => {
          executeDelete();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      executeDelete();
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: "حذف متعدد",
      message: `هل أنت متأكد من حذف ${selectedIds.length} طالب؟`,
      type: "danger",
      onConfirm: () => {
        saveStudents(students.filter((s) => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const isExplicitlyDisabled =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser!.permissions!.secretariat.includes("disable");
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser!.permissions!.secretariat.includes("allowEdits");
  const hasSecretariatAccess =
    currentUser?.permissions?.secretariat === true ||
    (Array.isArray(currentUser?.permissions?.secretariat) &&
      (currentUser!.permissions!.secretariat.includes("view") ||
       currentUser!.permissions!.secretariat.includes("showButton")));
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;

  const isReadOnly =
    !isGeneralSupervisor &&
    (isExplicitlyDisabled ||
     (!isAllowEdits) ||
     (isReadOnlyFlag && !isAllowEdits));

  const availableSchoolsKeys = data.availableSchools || [];
  const userSchools = isGeneralSupervisor
    ? availableSchoolsKeys
    : (currentUser?.selectedSchool || "").split(",").map((s) => s.trim()).filter(Boolean);

  const filteredStudents = useMemo(() => {
    let result = students;
    const isNameFilterActive = !!studentFilterName;

    if (!isGeneralSupervisor && !isNameFilterActive) {
      // 1. School Isolation with robust splitting
      const userSchools = (currentUser?.selectedSchool || "")
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
        
      if (userSchools.length > 0 && !userSchools.includes('all')) {
        result = result.filter(s => {
          if (!s.school) return true; // Show empty school to allow assignment
          return userSchools.includes(s.school);
        });
      }

      // 2. Branch Isolation with robust multi-branch matching fallback
      const currentSelectedBranches = (currentUser?.selectedBranch || "")
        .split(',')
        .map(b => b.trim())
        .filter(Boolean);
      
      const permsMap = currentUser?.permissions?.schoolsAndBranches || {};
      
      if (currentSelectedBranches.length > 0 && !currentSelectedBranches.includes('all')) {
        result = result.filter(s => {
          if (!s.branch) return true; // Show empty branches to allow assignment
          const studentBranches = s.branch.split(',').map(b => b.trim()).filter(Boolean);
          if (studentBranches.includes('all')) return true;
          return studentBranches.some(sb => currentSelectedBranches.includes(sb));
        });
      } else {
        result = result.filter(s => {
          if (!s.branch || !s.school) return true;
          const allowedInThisSchool = Array.isArray(permsMap[s.school]) ? permsMap[s.school] : [];
          if (allowedInThisSchool.length > 0 && !allowedInThisSchool.includes('all')) {
            const studentBranches = s.branch.split(',').map(b => b.trim()).filter(Boolean);
            if (studentBranches.includes('all')) return true;
            return studentBranches.some(sb => allowedInThisSchool.includes(sb));
          }
          return true;
        });
      }

      // 3. Grade/Section isolation with robust splitting
      const userGrades = currentUser?.grades || [];
      const userSections = currentUser?.sections || [];
      if (userGrades.length > 0 && !userGrades.includes("all")) {
        result = result.filter(s => !s.grade || userGrades.includes(s.grade));
      }
      if (userSections.length > 0 && !userSections.includes("all")) {
        result = result.filter(s => !s.section || userSections.includes(s.section));
      }
    }

    if (showMissingOnly) {
      result = result.filter((s) => getMissingFields(s).length > 0);
    }
    if (studentFilterGrade) {
      result = result.filter((s) => s.grade === studentFilterGrade);
    }
    if (studentFilterSection) {
      result = result.filter((s) => s.section === studentFilterSection);
    }
    if (studentFilterDate) {
      result = result.filter((s) => s.date === studentFilterDate);
    }
    if (studentFilterName) {
      result = result.filter((s) => s.name === studentFilterName);
    }
    if (studentFilterField && studentFilterFieldValue) {
      const lowerVal = studentFilterFieldValue.toLowerCase();
      result = result.filter((s) => {
        const fieldVal = (s as any)[studentFilterField];
        return String(fieldVal || "").toLowerCase().includes(lowerVal);
      });
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          String(s.name || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.school || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.branch || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.grade || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.guardianInfo || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.residenceWork || "")
            .toLowerCase()
            .includes(lowerQ),
      );
    }
    return result;
  }, [
    students,
    searchQuery,
    studentFilterGrade,
    studentFilterSection,
    studentFilterDate,
    studentFilterName,
    studentFilterField,
    studentFilterFieldValue,
    showMissingOnly,
    isGeneralSupervisor,
    currentUser,
  ]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(startIndex, startIndex + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);

  // Reset page when filters change
  useEffect(() => {
    setStudentPage(1);
  }, [studentFilterGrade, studentFilterSection, studentPageSize]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map((s) => s.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showMissingAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  تنبيه: حقول غير مكتملة
                </h3>
                <p className="text-slate-600 font-medium text-sm leading-relaxed">
                  بقيت هناك حقول لم تتم تعبئتها في مجموعة من الأسماء، هل تود أن
                  أظهر لك جدول الطلاب الذين بقيت عليهم حقول تحتاج إلى تعبئة؟
                </p>
                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() => {
                      setShowMissingAlert(false);
                      setShowMissingOnly(true);
                    }}
                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
                  >
                    موافق
                  </button>
                  <button
                    onClick={() => {
                      setShowMissingAlert(false);
                      setShowMissingOnly(false);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition"
                  >
                    الرجوع للجدول
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="بحث عن طالب، صف، فرع، ولي أمر..."
              className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-blue-500 transition-colors font-bold text-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setStudentPage(1);
              }}
            />
          </div>
          <select
            value={studentFilterGrade}
            onChange={(e) => setStudentFilterGrade(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-bold text-sm min-w-[120px]"
          >
            <option value="">كل الصفوف</option>
            {[
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
            ].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={studentFilterSection}
            onChange={(e) => setStudentFilterSection(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-bold text-sm min-w-[120px]"
          >
            <option value="">كل الشعب</option>
            {["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 bg-orange-50 border-2 border-orange-200 text-orange-700 px-4 py-3 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={(e) => setShowMissingOnly(e.target.checked)}
              className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="font-bold text-sm whitespace-nowrap">
              عرض النواقص فقط
            </span>
          </label>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-3 bg-[#1e3a8a] text-white rounded-xl font-bold hover:bg-[#172554] transition-colors border-2 border-transparent"
          >
            <FileSpreadsheet size={20} />
            تصدير الجدول
          </button>
          {!isReadOnly && (
            <>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold border-2 border-red-100 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={20} />
                  حذف المحددين ({selectedIds.length})
                </button>
              )}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
              >
                <FileSpreadsheet size={20} />
                استيراد
              </button>
              <button
                onClick={addEmptyRow}
                className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border-2 border-blue-100 hover:bg-blue-100 transition-colors"
              >
                <Plus size={20} />
                إضافة
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Filters Grid */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Dynamic Column Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">الفلترة بعمود مخصص</label>
          <div className="flex gap-1">
            <select
              value={studentFilterField}
              onChange={(e) => {
                setStudentFilterField(e.target.value);
                setStudentFilterFieldValue("");
              }}
              className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm flex-1"
            >
              <option value="">كل العناوين...</option>
              <option value="school">المدرسة</option>
              <option value="branch">الفرع</option>
              <option value="name">اسم الطالب</option>
              <option value="grade">الصف</option>
              <option value="section">الشعبة</option>
              <option value="gender">النوع</option>
              <option value="residenceWork">السكن/العمل</option>
              <option value="healthStatus">الحالة الصحية</option>
              <option value="guardianInfo">اسم ولي الأمر</option>
              <option value="guardianPhone">رقم الهاتف</option>
              <option value="date">التاريخ</option>
            </select>
            {studentFilterField && (
              <input
                type="text"
                placeholder="بحث بقيمة..."
                value={studentFilterFieldValue}
                onChange={(e) => setStudentFilterFieldValue(e.target.value)}
                className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm w-32"
              />
            )}
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">البحث بالتاريخ</label>
          <input
            type="date"
            value={studentFilterDate}
            onChange={(e) => setStudentFilterDate(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm"
          />
        </div>

        {/* Name Selection Filter */}
        <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
          <label className="text-xs font-bold text-slate-500">اختيار اسم محدد</label>
          <select
            value={studentFilterName}
            onChange={(e) => setStudentFilterName(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm w-full"
          >
            <option value="">كل الأسماء</option>
            {Array.from(new Set(students.map(s => s.name).filter(Boolean)))
              .sort((a, b) => a.localeCompare(b, 'ar'))
              .map(n => (
                <option key={n} value={n}>{n}</option>
              ))
            }
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200">
        <table className="w-full text-right whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-bold text-sm">
            <tr>
              <th className="p-3 w-12 text-center">
                {!isReadOnly && (
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      filteredStudents.length > 0 &&
                      selectedIds.length === filteredStudents.length
                    }
                    className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                )}
              </th>
              <th className="p-3 w-16 text-center">الرقم</th>
              <th className="p-3 w-32">المدرسة</th>
              <th className="p-3 w-32">الفرع</th>
              <th className="p-3 min-w-[200px]">الاسم</th>
              <th className="p-3 w-32">الصف</th>
              <th className="p-3 w-24">الشعبة</th>
              <th className="p-3 w-24">النوع</th>
              <th className="p-3 w-40">السكن/العمل</th>
              <th className="p-3 w-40">الحالة الصحية</th>
              <th className="p-3 w-48">اسم ولي الأمر</th>
              <th className="p-3 w-48">رقم الهاتف</th>
              <th className="p-3 w-40">التاريخ</th>
              <th className="p-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {!isReadOnly && filteredStudents.length > 0 && (
              <tr className="bg-orange-100/60 border-b border-orange-200">
                <td className="p-2 text-center" colSpan={2}>
                  <span className="font-bold text-xs text-orange-800">
                    تعميم للكل:
                  </span>
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-white border border-orange-300 rounded-lg p-2 outline-none focus:border-orange-500 text-sm"
                    onChange={(e) => {
                      bulkUpdateField("school", e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">تطبيق مدرسة...</option>
                    {schoolOptions.map((s, idx) => (
                      <option key={`bulk-school-${s}-${idx}`} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-white border border-orange-300 rounded-lg p-2 outline-none focus:border-orange-500 text-sm"
                    onChange={(e) => {
                      bulkUpdateField("branch", e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">تطبيق فرع...</option>
                    {branchOptions.map((b, idx) => (
                      <option key={`bulk-branch-${b}-${idx}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-center text-orange-700 text-xs font-bold">
                  لا يمكن تعميم الاسم
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-white border border-orange-300 rounded-lg p-2 outline-none focus:border-orange-500 text-sm"
                    onChange={(e) => {
                      bulkUpdateField("grade", e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">تطبيق صف...</option>
                    {gradeOptions.map((g, idx) => (
                      <option key={`bulk-grade-${g}-${idx}`} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-white border border-orange-300 rounded-lg p-2 outline-none focus:border-orange-500 text-sm"
                    onChange={(e) => {
                      bulkUpdateField("section", e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">تطبيق شعبة...</option>
                    {sectionOptions.map((v, idx) => (
                      <option key={`bulk-section-${v}-${idx}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-white border border-orange-300 rounded-lg p-2 outline-none focus:border-orange-500 text-sm"
                    onChange={(e) => {
                      bulkUpdateField("gender", e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">تطبيق نوع...</option>
                    {genderOptions.map((g, idx) => (
                      <option key={`bulk-gender-${g}-${idx}`} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2"></td>
                <td className="p-2">
                  <select
                    className="w-full bg-white border border-orange-300 rounded-lg p-2 outline-none focus:border-orange-500 text-sm"
                    onChange={(e) => {
                      bulkUpdateField("healthStatus", e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">تطبيق حالة...</option>
                    {healthOptions.map((h, idx) => (
                      <option key={`bulk-health-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </td>
                <td colSpan={4}></td>
              </tr>
            )}
            {paginatedStudents.map((student, index) => {
              const missingFields = getMissingFields(student);
              const isMissingRow = showMissingOnly || missingFields.length > 0;
              return (
                <tr
                  key={student.id}
                  className={`border-b border-slate-200 transition-colors ${selectedIds.includes(student.id) ? "bg-blue-50" : isMissingRow ? "bg-orange-50/30 hover:bg-orange-50" : "hover:bg-white"}`}
                >
                  <td className="p-2 text-center">
                    {!isReadOnly && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(student.id)}
                        onChange={() => toggleSelect(student.id)}
                        className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                  </td>
                  <td className="p-2 text-center font-bold text-slate-500">
                    {student.serialNumber}
                  </td>
                  <td className="p-2">
                    <select
                      className={`w-full bg-transparent border rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 ${missingFields.includes("school") ? "border-orange-400 bg-orange-100/50" : "border-slate-200"}`}
                      value={student.school}
                      onChange={(e) =>
                        updateRow(student.id, "school", e.target.value)
                      }
                      disabled={isReadOnly}
                    >
                      <option value="">اختر المدرسة</option>
                      {userSchools.map((s, idx) => (
                        <option key={`school-${s}-${idx}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      className={`w-full bg-transparent border rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 ${missingFields.includes("branch") ? "border-orange-400 bg-orange-100/50" : "border-slate-200"}`}
                      value={student.branch}
                      onChange={(e) =>
                        updateRow(student.id, "branch", e.target.value)
                      }
                      disabled={isReadOnly || !student.school}
                    >
                      <option value="">اختر الفرع</option>
                      {getAvailableBranches(student.school).map((b: string, idx) => (
                        <option key={`branch-${b}-${idx}`} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      disabled={isReadOnly}
                      type="text"
                      className={`w-full bg-transparent border rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 ${missingFields.includes("name") ? "border-orange-400 bg-orange-100/50" : "border-slate-200"}`}
                      value={localNames[student.id] ?? student.name}
                      onChange={(e) =>
                        setLocalNames(prev => ({ ...prev, [student.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== student.name) {
                          setLocalNames((prev) => {
                            const copy = { ...prev };
                            delete copy[student.id];
                            return copy;
                          });
                          setLocalGuardian((prev) => {
                            const copy = { ...prev };
                            delete copy[student.id];
                            return copy;
                          });
                          updateRow(student.id, "name", e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <select
                      disabled={isReadOnly}
                      className={`w-full bg-transparent border rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 ${missingFields.includes("grade") ? "border-orange-400 bg-orange-100/50" : "border-slate-200"}`}
                      value={student.grade}
                      onChange={(e) =>
                        updateRow(student.id, "grade", e.target.value)
                      }
                    >
                      <option value="">اختر...</option>
                      {[
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
                      ].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      disabled={isReadOnly}
                      className={`w-full bg-transparent border rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 ${missingFields.includes("section") ? "border-orange-400 bg-orange-100/50" : "border-slate-200"}`}
                      value={student.section}
                      onChange={(e) =>
                        updateRow(student.id, "section", e.target.value)
                      }
                    >
                      <option value="">اختر...</option>
                      {["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"].map(
                        (v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      disabled={isReadOnly}
                      className={`w-full bg-transparent border rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 ${missingFields.includes("gender") ? "border-orange-400 bg-orange-100/50" : "border-slate-200"}`}
                      value={student.gender}
                      onChange={(e) =>
                        updateRow(student.id, "gender", e.target.value)
                      }
                    >
                      <option value="">اختر...</option>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      disabled={isReadOnly}
                      type="text"
                      className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                      value={localResidence[student.id] ?? student.residenceWork}
                      onChange={(e) =>
                        setLocalResidence(prev => ({ ...prev, [student.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== student.residenceWork) {
                          updateRow(student.id, "residenceWork", e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      disabled={false}
                      type="text"
                      className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                      value={localHealth[student.id] ?? student.healthStatus}
                      onChange={(e) =>
                        setLocalHealth(prev => ({ ...prev, [student.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== student.healthStatus) {
                          updateRow(student.id, "healthStatus", e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      disabled={isReadOnly}
                      type="text"
                      className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                      value={localGuardian[student.id] ?? student.guardianInfo}
                      onChange={(e) =>
                        setLocalGuardian(prev => ({ ...prev, [student.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== student.guardianInfo) {
                          updateRow(student.id, "guardianInfo", e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      disabled={isReadOnly}
                      type="text"
                      className="w-full text-center bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                      value={localGuardianPhone[student.id] ?? student.guardianPhone ?? ""}
                      onChange={(e) =>
                        setLocalGuardianPhone(prev => ({ ...prev, [student.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        if (e.target.value !== student.guardianPhone) {
                          updateRow(student.id, "guardianPhone", e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      disabled={isReadOnly}
                      type="date"
                      className="w-full text-center bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 text-sm font-bold text-slate-600"
                      value={student.date || ""}
                      onChange={(e) =>
                        updateRow(student.id, "date", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    {!isReadOnly && (
                      <button
                        onClick={() => deleteRow(student.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {paginatedStudents.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  className="p-8 text-center text-slate-500 font-bold"
                >
                  لا يوجد طلاب مطابقين، قم بالإضافة أو الاستيراد من إكسل
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm font-bold text-slate-600">
            إجمالي الطلاب: {filteredStudents.length} (عرض{" "}
            {(studentPage - 1) * studentPageSize + 1} إلى{" "}
            {Math.min(studentPage * studentPageSize, filteredStudents.length)})
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={studentPage === 1}
              onClick={() => setStudentPage((p) => p - 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-bold transition-colors"
            >
              السابق
            </button>
            <div className="flex gap-1">
              {Array.from({
                length: Math.ceil(filteredStudents.length / studentPageSize),
              }).map((_, i) => {
                // Show a limited number of page buttons
                const totalPages = Math.ceil(
                  filteredStudents.length / studentPageSize,
                );
                if (totalPages > 7) {
                  if (
                    i !== 0 &&
                    i !== totalPages - 1 &&
                    Math.abs(i + 1 - studentPage) > 2
                  ) {
                    if (Math.abs(i + 1 - studentPage) === 3)
                      return (
                        <span key={i} className="px-2 text-slate-400">
                          ...
                        </span>
                      );
                    return null;
                  }
                }
                return (
                  <button
                    key={i}
                    onClick={() => setStudentPage(i + 1)}
                    className={`w-10 h-10 rounded-lg font-bold transition-colors ${studentPage === i + 1 ? "bg-blue-600 text-white shadow-md" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button
              disabled={
                studentPage * studentPageSize >= filteredStudents.length
              }
              onClick={() => setStudentPage((p) => p + 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-bold transition-colors"
            >
              التالي
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-bold">العرض:</span>
            <select
              value={studentPageSize}
              onChange={(e) => setStudentPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none text-sm font-bold"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};

const JOB_TITLES = [
  "مدير عام",
  "مدير فرع",
  "الإدارة المالية",
  "المحاسب",
  "أمين صندوق",
  "وكيل إداري",
  "وكيل أكاديمي",
  "مدير الموادر البشرية",
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

const TEACHER_JOB_TITLES = [
  "معلم مادة",
  "معلم فنية",
  "مربية",
  "معلم رياضة",
  "مسؤول الأنشطة",
];

const StaffManager = () => {
  const { currentUser, data, updateData } = useGlobal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staff, setStaff] = useState<StaffData[]>([]);

  const staffRef = useRef(staff);
  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

  // Performance optimizing local weights for text inputs
  const [localNames, setLocalNames] = useState<Record<string, string>>({});
  const [localPhones, setLocalPhones] = useState<Record<string, string>>({});

  useEffect(() => {
    const cloudData = data.secretariatStaff || [];
    
    const newStaff = cloudData.map((s: any) => ({
      ...s,
      school:
        s.school ||
        (s.schoolBranch
          ? s.schoolBranch.split("-")[0]?.trim() || s.schoolBranch
          : ""),
      branch:
        s.branch ||
        (s.schoolBranch ? s.schoolBranch.split("-")[1]?.trim() || "" : ""),
      jobTitles: s.jobTitles || s.subjects || [],
      grades: s.grades || [],
      phone: s.phone || "",
    }));

    // Sort all combined staff alphabetically by Arabic name strictly
    const sortedStaff = [...newStaff].sort((a, b) => {
      const nameA = a.name ? a.name.trim() : "";
      const nameB = b.name ? b.name.trim() : "";
      if (!nameA && nameB) return 1;
      if (nameA && !nameB) return -1;
      return nameA.localeCompare(nameB, "ar");
    });

    if (JSON.stringify(staffRef.current) !== JSON.stringify(sortedStaff)) {
      setStaff(sortedStaff);
    }
  }, [data.secretariatStaff]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [staffFilterGrade, setStaffFilterGrade] = useState("");
  const [staffFilterSection, setStaffFilterSection] = useState("");
  const [staffFilterDate, setStaffFilterDate] = useState("");
  const [staffFilterName, setStaffFilterName] = useState("");
  const [staffFilterField, setStaffFilterField] = useState("");
  const [staffFilterFieldValue, setStaffFilterFieldValue] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Memoized unique lists for generalization dropdowns
  const uniqueSchoolsForGen = useMemo(() => {
    return Array.from(new Set(staff.map(s => s.school).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [staff]);

  const uniqueBranchesForGen = useMemo(() => {
    return Array.from(new Set(staff.map(s => s.branch).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [staff]);

  const uniqueJobsForGen = useMemo(() => {
    return Array.from(new Set(staff.flatMap(s => s.jobTitles || []).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [staff]);

  const uniqueSubjectsForGen = useMemo(() => {
    return Array.from(new Set(staff.flatMap(s => s.subjects || []).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [staff]);

  const uniqueGradesForGen = useMemo(() => {
    const gradesOrder = ["تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    return Array.from(new Set(staff.flatMap(s => s.grades || []).filter(Boolean)))
      .sort((a, b) => {
        const idxA = gradesOrder.indexOf(a);
        const idxB = gradesOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.localeCompare(b, 'ar');
      });
  }, [staff]);

  const handleGeneralizeField = (field: string, selectedValue: string) => {
    if (!selectedValue) return;
    const count = filteredStaff.length;
    if (count === 0) {
      alert("لا يوجد موظفون ظاهرون حالياً لتعميم القيمة عليهم.");
      return;
    }

    const fieldNamesAr: Record<string, string> = {
      school: "المدرسة",
      branch: "الفرع",
      gender: "النوع",
      jobTitles: "الصفة",
      subjects: "المادة",
      grades: "الصف",
    };

    const displayName = fieldNamesAr[field] || field;

    setConfirmDialog({
      isOpen: true,
      title: "تأكيد تعميم القيمة",
      message: `هل أنت متأكد من تعميم القيمة "${selectedValue}" على عمود (${displayName}) لجميع الموظفين الظاهرين في الجدول حالياً بعد التصفية وعددهم (${count}) موظف؟`,
      type: "danger",
      onConfirm: () => {
        const visibleIds = filteredStaff.map(s => s.id);
        const newStaff = staff.map(s => {
          if (visibleIds.includes(s.id)) {
            if (field === "jobTitles" || field === "subjects" || field === "grades") {
              return { ...s, [field]: [selectedValue] };
            }
            return { ...s, [field]: selectedValue };
          }
          return s;
        });
        saveStaff(newStaff);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        alert(`تم تعميم ${displayName} بنجاح!`);
      }
    });
  };

  const saveStaff = (newStaff: StaffData[]) => {
    // 0. Sort alphabetically by name and correctly re-number
    const sortedStaff = [...newStaff]
      .sort((a, b) => {
        const nameA = a.name ? a.name.trim() : "";
        const nameB = b.name ? b.name.trim() : "";
        if (!nameA && nameB) return 1;
        if (nameA && !nameB) return -1;
        return nameA.localeCompare(nameB, "ar");
      })
      .map((s, idx) => ({ ...s, serialNumber: idx + 1 }));

    setStaff(sortedStaff);

    // 1. Daily Reports Sync
    const today = new Date().toISOString().split("T")[0];
    const dailyReports = [...(data.dailyReports || [])];
    let updatedReports = false;

    dailyReports.forEach((r) => {
      if (r.dateStr === today) {
        let changed = false;
        sortedStaff.forEach((s) => {
          // Only sync if they have teacher-like job title
          const isTeacher = (s.jobTitles || []).some((title) =>
            TEACHER_JOB_TITLES.includes(title),
          );
          if (!isTeacher) return;

          if (!r.teachersData) r.teachersData = [];

          if (!r.teachersData.some((t: any) => t.teacherName === s.name)) {
            r.teachersData.push({
              id: crypto.randomUUID(),
              teacherName: s.name || "",
              subjectCode:
                s.jobTitles && s.jobTitles.length > 0
                  ? s.jobTitles.join(" / ")
                  : "",
              className:
                s.grades && s.grades.length > 0 ? s.grades.join(" / ") : "",
              gender: s.gender || "ذكر",
              violations_score: 0,
              violations_notes: [],
              attendance: 0,
              appearance: 0,
              preparation: 0,
              supervision_queue: 0,
              supervision_rest: 0,
              supervision_prayer: 0,
              supervision_end: 0,
              class_management: 0,
              teaching_strategies: 0,
              technology_usage: 0,
              active_learning: 0,
              student_evaluation: 0,
              correction: 0,
              weak_students: 0,
              excellence_students: 0,
              enrichment: 0,
              correction_books: 0,
              correction_notebooks: 0,
              correction_followup: 0,
              teaching_aids: 0,
              extra_activities: 0,
              radio: 0,
              creativity: 0,
              zero_period: 0,
              follow_up: 0,
              admin_directives: 0,
              order: r.teachersData.length + 1,
            } as any);
            changed = true;
          }
        });
        if (changed) updatedReports = true;
      }
    });

    // 2. Global teacherFollowUps Sync (جدول متابعة المعلمين)
    const teacherFollowUps = [...(data.teacherFollowUps || [])];
    let updatedFollowUps = false;

    sortedStaff.forEach((s) => {
      const isTeacher = (s.jobTitles || []).some((title) =>
        TEACHER_JOB_TITLES.includes(title),
      );
      if (!isTeacher) return;

      const existingIndex = teacherFollowUps.findIndex(
        (t) => t.teacherName === s.name,
      );
      if (existingIndex === -1) {
        teacherFollowUps.push({
          id: s.id,
          teacherName: s.name || "",
          subjectCode: (s.jobTitles || []).join(" / "),
          className: (s.grades || []).join(" / "),
          gender: s.gender || "",
          attendance: 0,
          appearance: 0,
          preparation: 0,
          supervision_queue: 0,
          supervision_rest: 0,
          supervision_end: 0,
          correction_books: 0,
          correction_notebooks: 0,
          correction_followup: 0,
          teaching_aids: 0,
          extra_activities: 0,
          radio: 0,
          creativity: 0,
          zero_period: 0,
          violations_score: 0,
          violations_notes: [],
        } as any);
        updatedFollowUps = true;
      } else {
        // Update existing entry if needed
        const t = teacherFollowUps[existingIndex];
        const newSubjectCode = (s.jobTitles || []).join(" / ");
        const newClassName = (s.grades || []).join(" / ");
        if (
          t.subjectCode !== newSubjectCode ||
          t.className !== newClassName ||
          t.gender !== s.gender
        ) {
          teacherFollowUps[existingIndex] = {
            ...t,
            subjectCode: newSubjectCode,
            className: newClassName,
            gender: s.gender || "",
          };
          updatedFollowUps = true;
        }
      }
    });

    const updates: any = { secretariatStaff: sortedStaff };
    if (updatedReports) updates.dailyReports = dailyReports;
    if (updatedFollowUps) updates.teacherFollowUps = teacherFollowUps;

    updateData(updates);
  };

  const getContextSchoolAndBranch = () => {
    let school = "";
    let branch = "";
    if (filteredStaff.length > 0) {
      school = filteredStaff[0].school || "";
      branch = filteredStaff[0].branch || "";
    } else {
      const rawSchool = currentUser?.selectedSchool?.split(",")[0];
      const defaultAvailable = data.availableSchools && data.availableSchools.length > 0 ? data.availableSchools[0] : "";
      school = rawSchool && rawSchool !== "all" ? rawSchool : (data.profile?.schoolName || defaultAvailable || "المدرسة");
      branch = currentUser?.selectedBranch || "";
    }
    return { school, branch };
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const saveAs = (await import("file-saver")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("كشف الموظفين", {
        views: [{ rightToLeft: true }]
      });

      // Get profile info
      const { school: schoolName, branch: branchName } = getContextSchoolAndBranch();
      const profileInfo = data.profiles?.[schoolName] || data.profile || {};
      const resolvedProfile = branchName && profileInfo[branchName] ? profileInfo[branchName] : profileInfo;

      const totalCols = 8; // 8 columns for staff table

      // Setup Header rows
      sheet.addRow([]);

      // Right Header Info
      sheet.mergeCells("A2:C5");
      sheet.getCell("A2").value = `الجمهورية اليمنية\n${resolvedProfile?.ministry || "وزارة التربية والتعليم والبحث العلمي"}\nالمنطقة التعليمية: ${resolvedProfile?.district || ""}\nمدرسة: ${schoolName}\n${branchName ? "فرع: " + branchName : ""}`;
      sheet.getCell("A2").alignment = { wrapText: true, horizontal: "right", vertical: "middle" };
      sheet.getCell("A2").font = { bold: true, size: 10, name: "Arial" };

      // Left Header Info
      const today = new Date();
      const daysOfWeekAr = ["الأحد", "الأثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const dayName = daysOfWeekAr[today.getDay()];
      
      const hijriFormatter = new Intl.DateTimeFormat('ar-FR-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const hijriDate = hijriFormatter.format(today);
      
      const gregorianFormatter = new Intl.DateTimeFormat('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const gregorianDate = gregorianFormatter.format(today);

      sheet.mergeCells(2, totalCols - 1, 5, totalCols);
      sheet.getCell(2, totalCols - 1).value = `اليوم: ${dayName}\nالتاريخ الهجري: ${hijriDate}\nالتاريخ الميلادي: ${gregorianDate}`;
      sheet.getCell(2, totalCols - 1).alignment = { wrapText: true, horizontal: "left", vertical: "middle" };
      sheet.getCell(2, totalCols - 1).font = { bold: true, size: 10, name: "Arial" };

      // Center (Logo)
      if (resolvedProfile?.logoImg && resolvedProfile.logoImg.startsWith("data:image")) {
        try {
          const imageId = workbook.addImage({
            base64: resolvedProfile.logoImg.split(",")[1],
            extension: "png",
          });
          sheet.addImage(imageId, {
            tl: { col: 3.5, row: 1 },
            ext: { width: 70, height: 70 }
          });
        } catch (e) {}
      } else {
        sheet.mergeCells("D2:F5");
        sheet.getCell("D2").value = "شعار المدرسة";
        sheet.getCell("D2").alignment = { horizontal: "center", vertical: "middle" };
        sheet.getCell("D2").font = { bold: true, size: 12, name: "Arial" };
      }

      sheet.getRow(2).height = 20;
      sheet.getRow(3).height = 20;
      sheet.getRow(4).height = 20;
      sheet.getRow(5).height = 20;

      sheet.addRow([]); // Row 6
      sheet.addRow([]); // Row 7

      // Title Row
      sheet.mergeCells("A8:H8");
      sheet.getCell("A8").value = "كشف ببيانات شؤون الموظفين";
      sheet.getCell("A8").alignment = { horizontal: "center", vertical: "middle" };
      sheet.getCell("A8").font = { bold: true, size: 14, name: "Arial" };
      sheet.getRow(8).height = 30;

      sheet.addRow([]);

      // Table Header row (Row 10)
      const headers = [
        "الرقم",
        "المدرسة",
        "الفرع",
        "الاسم الموظف",
        "النوع",
        "الصفة / الوظيفة",
        "الصفوف الموكلة",
        "رقم الهاتف"
      ];
      
      const headerRowVals = sheet.addRow(headers);
      headerRowVals.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A8A" } // Dark Blue
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
      sheet.getRow(10).height = 25;

      // Add Data
      filteredStaff.forEach((employee, idx) => {
        const staffRow = sheet.addRow([
          idx + 1,
          employee.school || "",
          employee.branch || "",
          employee.name || "",
          employee.gender || "",
          (employee.jobTitles || []).join(" / "),
          (employee.grades || []).join(" / "),
          employee.phone || ""
        ]);
        
        staffRow.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { name: "Arial", size: 10 };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        });
        sheet.getRow(11 + idx).height = 20;
      });

      // Autofit columns
      sheet.columns.forEach((col, colIdx) => {
        if (colIdx === 0) { col.width = 6; return; }
        let maxLen = 12;
        col.eachCell?.((cell, rIdx) => {
          if (rIdx > 9 && cell.value) {
            const valStr = String(cell.value);
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        });
        col.width = Math.min(maxLen + 4, 30);
      });

      // Generate workbook and save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      saveAs(blob, `كشف_الموظفين_${schoolName || "شؤون_الموظفين"}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تصدير كشف الموظفين");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const parseExcel = () => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const ab = evt.target?.result;
          if (!ab) throw new Error("Could not read file data");
          const wb = XLSX.read(ab, { type: "array" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          // Get 2D grid of values instead of default key-value objects
          const sheetData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          if (!sheetData || sheetData.length === 0) {
            throw new Error("Empty sheet");
          }

          let headerRowIdx = -1;
          let nameColIdx = -1;
          let schoolColIdx = -1;
          let branchColIdx = -1;
          let genderColIdx = -1;
          let jobColIdx = -1;
          let gradeColIdx = -1;
          let phoneColIdx = -1;

          const staffNameKeys = [
            "اسم الموظف",
            "اسم المعلم",
            "الاسم الموظف",
            "الاسم",
            "الاسم ثلاثي",
            "الاسم رباعي",
            "الاسم الكامل",
            "اسم",
            "ألاسم",
            "اسم الموظف / الهاتف",
            "employee_name",
            "teacher_name",
            "name"
          ];

          for (let r = 0; r < sheetData.length; r++) {
            const row = sheetData[r];
            if (!row || !Array.isArray(row)) continue;
            
            let foundNameKey = false;
            for (let c = 0; c < row.length; c++) {
              const val = row[c] ? String(row[c]).trim().replace(/\s+/g, " ") : "";
              if (staffNameKeys.includes(val)) {
                foundNameKey = true;
                break;
              }
            }

            if (foundNameKey) {
              headerRowIdx = r;
              // Map all columns based on header row names
              for (let c = 0; c < row.length; c++) {
                const val = row[c] ? String(row[c]).trim().replace(/\s+/g, " ") : "";
                if (staffNameKeys.includes(val) && nameColIdx === -1) {
                  nameColIdx = c;
                } else if (["الصفة", "الوظيفة", "الصفة / الوظيفة", "المواد", "المادة", "jobTitles"].includes(val)) {
                  jobColIdx = c;
                } else if (["الصفوف", "الصفوف الموكلة", "الصف", "grades"].includes(val)) {
                  gradeColIdx = c;
                } else if (["اسم المدرسة", "المدرسة", "school"].includes(val)) {
                  schoolColIdx = c;
                } else if (["اسم الفرع", "الفرع", "branch"].includes(val)) {
                  branchColIdx = c;
                } else if (["النوع", "الجنس", "gender"].includes(val)) {
                  genderColIdx = c;
                } else if (["رقم الهاتف", "الهاتف", "تلفون", "phone"].includes(val)) {
                  phoneColIdx = c;
                }
              }
              break;
            }
          }

          if (headerRowIdx === -1 || nameColIdx === -1) {
            alert("لم يتم العثور على رأس الجدول (العمود الذي يحتوي على 'الاسم' أو 'اسم الموظف') في ملف الاكسل المستورد. يرجى مراجعة عناوين الأعمدة.");
            return;
          }

          // Get active school and branch context to align imported records and prevent filtering them out
          const { school: activeSchool, branch: activeBranch } = getContextSchoolAndBranch();

          const userSch = currentUser?.selectedSchool?.split(",")[0];
          const defaultAvail = data.availableSchools && data.availableSchools.length > 0 ? data.availableSchools[0] : "";
          
          const fallbackSchool = userSch && userSch !== "all" ? userSch : (data.profile?.schoolName || defaultAvail || activeSchool);
          const fallbackBranch = currentUser?.selectedBranch || activeBranch;

          let newStaff: StaffData[] = [...staffRef.current];
          let maxSerial = newStaff.reduce(
            (max, s) => Math.max(max, s.serialNumber),
            0,
          );

          let importedCount = 0;

          const getValAt = (row: any[], idx: number): string => {
            if (idx === -1 || !row || row[idx] === undefined || row[idx] === null) return "";
            return String(row[idx]).trim();
          };

          for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
            const row = sheetData[r];
            if (!row || !Array.isArray(row)) continue;

            const nameVal = getValAt(row, nameColIdx);
            if (!nameVal) continue; // Skip rows where name is empty

            const cleanName = (val: string): string => {
              let s = val.trim();
              s = s.replace(/^(الاسم\s*[:\/\\-]*\s*|اسم\s*[:\/\\-]*\s*|الاسم\s+الكامل\s*[:\/\\-]*\s*|ألاسم\s*[:\/\\-]*\s*|اسم\s+الموظف\s*[:\/\\-]*\s*|اسم\s+المعلم\s*[:\/\\-]*\s*)/i, "");
              s = s.replace(/\s+/g, " ").trim();
              return s;
            };

            const processedName = cleanName(nameVal);
            if (!processedName || ["الاسم", "اسم الموظف", "اسم المعلم", "تم التصدير"].includes(processedName)) {
              continue; // Skip title headers or helper info rows re-appeared
            }

            // Detect row school & branch if present, otherwise fall back to context
            let rowSchoolName = schoolColIdx !== -1 ? getValAt(row, schoolColIdx) : "";
            let rowBranchName = branchColIdx !== -1 ? getValAt(row, branchColIdx) : "";

            let employeeSchool = rowSchoolName || fallbackSchool;
            let employeeBranch = rowBranchName || fallbackBranch;

            if (!isGeneralSupervisor) {
              // Non-admin MUST strictly be forced into active context school & branch they are authorized to see
              employeeSchool = activeSchool;
              employeeBranch = activeBranch;
            }

            maxSerial++;

            const cleanStringArray = (fieldVal: string): string[] => {
              if (!fieldVal) return [];
              return fieldVal.split(/[،,/\\]+/).map((s: string) => s.trim()).filter(Boolean);
            };

            newStaff.push({
              id:
                Date.now().toString() +
                Math.random().toString(36).substring(2, 9),
              serialNumber: maxSerial,
              school: employeeSchool,
              branch: employeeBranch,
              name: processedName,
              gender: getValAt(row, genderColIdx),
              jobTitles: cleanStringArray(getValAt(row, jobColIdx)),
              phone: getValAt(row, phoneColIdx),
              grades: cleanStringArray(getValAt(row, gradeColIdx)),
              date: new Date().toISOString().split("T")[0],
            });
            importedCount++;
          }

          if (importedCount === 0) {
            alert("لم يتم العثور على أي صفوف بأسماء صالحة للاستيراد تحت رأس الجدول.");
            return;
          }

          const cleanStaff = JSON.parse(JSON.stringify(newStaff));
          saveStaff(cleanStaff);
          alert(`تم استيراد ${importedCount} من الموظفين بنجاح!`);
        } catch (err) {
          console.error(err);
          alert("حدث خطأ أثناء قراءة الملف. تأكد من صحة تنسيق ملف Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (isGeneralSupervisor) {
      setConfirmDialog({
        isOpen: true,
        title: "تحذير: استيراد موظفين",
        message: "أنت تقوم باستيراد بيانات موظفين بصلاحيات المشرف العام مباشرة. هل أنت متأكد من الاستمرار؟",
        type: "danger",
        onConfirm: () => {
          parseExcel();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      parseExcel();
    }
  };

  const addEmptyRow = () => {
    const executeAdd = () => {
      const maxSerial = staff.reduce(
        (max, s) => Math.max(max, s.serialNumber || 0),
        0,
      );

      const rawSchool = currentUser?.selectedSchool?.split(",")[0];
      const defaultAvailable = data.availableSchools && data.availableSchools.length > 0 ? data.availableSchools[0] : "";
      
      let fallbackSchool = rawSchool && rawSchool !== "all" 
        ? rawSchool 
        : (data.profile?.schoolName || defaultAvailable);

      let fallbackBranch = "";
      if (fallbackSchool) {
        const branches = getAvailableBranches(fallbackSchool);
        const currentSelectedBranches = (currentUser?.selectedBranch || "").split(',').map(b => b.trim());
        if (currentSelectedBranches.length > 0 && !currentSelectedBranches.includes('all')) {
          fallbackBranch = branches.find(b => currentSelectedBranches.includes(b)) || branches[0] || "";
        } else {
          fallbackBranch = branches[0] || "";
        }
      }

      const newEmployee: StaffData = {
        id: "staff-" + Date.now().toString() + Math.random().toString(36).substring(2, 7),
        serialNumber: maxSerial + 1,
        school: fallbackSchool,
        branch: fallbackBranch,
        name: "",
        gender: "",
        jobTitles: [],
        phone: "",
        grades: [],
        date: new Date().toISOString().split("T")[0],
      };

      saveStaff([...staff, newEmployee]);
      setSearchQuery(""); // Make sure we can see the empty row
    };

    if (isGeneralSupervisor) {
      setConfirmDialog({
        isOpen: true,
        title: "تحذير: إضافة موظف جديد",
        message: "أنت تقوم بإضافة موظف بصلاحيات المشرف العام مباشرة في السكرتارية. هل أنت متأكد من الاستمرار؟",
        type: "danger",
        onConfirm: () => {
          executeAdd();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      executeAdd();
    }
  };

  const updateRow = (id: string, field: string, value: any) => {
    const newStaff = staff.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if (field === "school") {
        const branches = getAvailableBranches(value);
        updated.branch = branches.length === 1 ? branches[0] : "";
      }
      return updated;
    });
    saveStaff(newStaff);
  };

  const deleteRow = (id: string) => {
    const executeDelete = () => {
      saveStaff(staff.filter((s) => s.id !== id));
      setSelectedIds(selectedIds.filter((sel) => sel !== id));
    };

    if (isGeneralSupervisor) {
      setConfirmDialog({
        isOpen: true,
        title: "تحذير: حذف موظف",
        message: "أنت تقوم بحذف موظف بصلاحيات المشرف العام من السكرتارية. هذا سيؤثر على المدرسة التابع لها الموظف. هل أنت متأكد من الاستمرار؟",
        type: "danger",
        onConfirm: () => {
          executeDelete();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      executeDelete();
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: "حذف متعدد",
      message: `هل أنت متأكد من حذف ${selectedIds.length} موظف؟`,
      type: "danger",
      onConfirm: () => {
        saveStaff(staff.filter((s) => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const toggleArrayItem = (
    id: string,
    field: "jobTitles" | "grades" | "subjects",
    item: string,
  ) => {
    saveStaff(
      staff.map((s) => {
        if (s.id !== id) return s;
        const arr = (s[field] as string[]) || [];
        const newArr = arr.includes(item)
          ? arr.filter((x) => x !== item)
          : [...arr, item];
        return { ...s, [field]: newArr };
      }),
    );
  };

  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isExplicitlyDisabled =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser!.permissions!.secretariat.includes("disable");
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser!.permissions!.secretariat.includes("allowEdits");
  const hasSecretariatAccess =
    currentUser?.permissions?.secretariat === true ||
    (Array.isArray(currentUser?.permissions?.secretariat) &&
      (currentUser!.permissions!.secretariat.includes("view") ||
       currentUser!.permissions!.secretariat.includes("showButton")));
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;

  const isReadOnly =
    !isGeneralSupervisor &&
    (isExplicitlyDisabled ||
     (!isAllowEdits) ||
     (isReadOnlyFlag && !isAllowEdits));

  const availableSchoolsKeys = data.availableSchools || [];
  const userSchools = isGeneralSupervisor
    ? availableSchoolsKeys
    : (currentUser?.selectedSchool || "").split(",").map((s) => s.trim()).filter(Boolean);

  const getAvailableBranches = (school: string) => {
    if (!school) return [];
    const _allBranches = data.schoolBranches?.[school];
    const allBranches = Array.isArray(_allBranches) ? _allBranches : [];
    if (isGeneralSupervisor) return allBranches;
    const _userBranches = currentUser?.permissions?.schoolsAndBranches?.[school];
    const userBranches = Array.isArray(_userBranches) ? _userBranches : [];
    if (userBranches.length > 0) return userBranches;
    return allBranches;
  };

  const getMissingStaffFields = (s: StaffData) => {
    const missing = [];
    if (!s.school) missing.push("school");
    if (!s.branch) missing.push("branch");
    if (!s.name) missing.push("name");
    if (!s.gender) missing.push("gender");
    if (!s.jobTitles || s.jobTitles.length === 0) missing.push("jobTitles");
    if (!s.phone) missing.push("phone");
    return missing;
  };

  const filteredStaff = useMemo(() => {
    let result = staff;
    
    if (!isGeneralSupervisor) {
      // 1. Mandatory School Filtering
      const userSchools = (currentUser?.selectedSchool || "").split(',').map(s => s.trim());
      if (!userSchools.includes('all')) {
        result = result.filter(s => !s.school || userSchools.includes(s.school));
      }

      // 2. Branch Filtering
      const currentSelectedBranches = (currentUser?.selectedBranch || "").split(',').map(b => b.trim()).filter(Boolean);
      const permsMap = currentUser?.permissions?.schoolsAndBranches || {};
      
      result = result.filter(s => {
        if (!s.branch) return true; // Show empty branch for editing
        
        // If no branch was selected at login, fall back to permissions map
        if (currentSelectedBranches.length === 0 || (currentSelectedBranches.length === 1 && currentSelectedBranches[0] === '')) {
           const allowedInThisSchool = Array.isArray(permsMap[s.school]) ? permsMap[s.school] : [];
           if (allowedInThisSchool.length > 0) {
             return allowedInThisSchool.includes(s.branch);
           }
           return true; // No branch restriction
        }
        
        // If "all" branches selected in UI, still limit by permissions for that school
        if (currentSelectedBranches.includes('all')) {
           const allowedInThisSchool = Array.isArray(permsMap[s.school]) ? permsMap[s.school] : [];
           if (allowedInThisSchool.length > 0) {
             return allowedInThisSchool.includes(s.branch);
           }
           return true; 
        }
        return currentSelectedBranches.includes(s.branch);
      });

    }

    if (showMissingOnly) {
      result = result.filter((s) => getMissingStaffFields(s).length > 0);
    }
    if (staffFilterGrade) {
      result = result.filter((s) => s.grades && s.grades.includes(staffFilterGrade));
    }
    if (staffFilterDate) {
      result = result.filter((s) => s.date === staffFilterDate);
    }
    if (staffFilterName) {
      result = result.filter((s) => s.name === staffFilterName);
    }
    if (staffFilterField && staffFilterFieldValue) {
      const lowerVal = staffFilterFieldValue.toLowerCase();
      result = result.filter((s) => {
        const fieldVal = (s as any)[staffFilterField];
        if (Array.isArray(fieldVal)) {
          return fieldVal.some(v => String(v).toLowerCase().includes(lowerVal));
        }
        return String(fieldVal || "").toLowerCase().includes(lowerVal);
      });
    }

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          String(s.name || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.school || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.branch || "")
            .toLowerCase()
            .includes(lowerQ) ||
          String((s.jobTitles || []).join(" "))
            .toLowerCase()
            .includes(lowerQ) ||
          String((s.grades || []).join(" "))
            .toLowerCase()
            .includes(lowerQ) ||
          String(s.phone || "")
            .toLowerCase()
            .includes(lowerQ),
      );
    }
    return result;
  }, [
    staff,
    searchQuery,
    staffFilterGrade,
    staffFilterSection,
    staffFilterDate,
    staffFilterName,
    staffFilterField,
    staffFilterFieldValue,
    showMissingOnly,
    currentUser,
    isGeneralSupervisor,
  ]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStaff.map((s) => s.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 font-sans">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
          <div className="relative w-full md:w-64">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="بحث عن معلم، مادة، صف، مدرسة..."
              className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-blue-500 transition-colors font-bold text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={staffFilterGrade}
            onChange={(e) => setStaffFilterGrade(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-bold text-sm min-w-[125px]"
          >
            <option value="">كل الصفوف</option>
            {[
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
            ].map((v) => (
              <option key={v} value={v}>
                صف {v}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 bg-orange-50 border-2 border-orange-200 text-orange-700 px-4 py-3 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={(e) => setShowMissingOnly(e.target.checked)}
              className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="font-bold text-sm whitespace-nowrap">
              عرض النواقص فقط
            </span>
          </label>
        </div>

        <div className="flex gap-2 flex-wrap justify-end w-full md:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-3 bg-[#1e3a8a] text-white rounded-xl font-bold hover:bg-[#172554] transition-colors border-2 border-transparent"
          >
            <FileSpreadsheet size={20} />
            تصدير الجدول
          </button>
          {!isReadOnly && (
            <>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold border-2 border-red-100 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={20} />
                  حذف المحددين ({selectedIds.length})
                </button>
              )}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
              >
                <FileSpreadsheet size={20} />
                استيراد
              </button>
              <button
                onClick={addEmptyRow}
                className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border-2 border-blue-100 hover:bg-blue-100 transition-colors"
              >
                <Plus size={20} />
                إضافة
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Filters Grid */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Dynamic Column Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">الفلترة بعمود مخصص</label>
          <div className="flex gap-1">
            <select
              value={staffFilterField}
              onChange={(e) => {
                setStaffFilterField(e.target.value);
                setStaffFilterFieldValue("");
              }}
              className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm flex-1"
            >
              <option value="">كل العناوين...</option>
              <option value="school">المدرسة</option>
              <option value="branch">الفرع</option>
              <option value="name">اسم الموظف</option>
              <option value="gender">النوع</option>
              <option value="phone">الهاتف</option>
              <option value="date">التاريخ</option>
            </select>
            {staffFilterField && (
              <input
                type="text"
                placeholder="بحث بقيمة..."
                value={staffFilterFieldValue}
                onChange={(e) => setStaffFilterFieldValue(e.target.value)}
                className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm w-32"
              />
            )}
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">البحث بالتاريخ</label>
          <input
            type="date"
            value={staffFilterDate}
            onChange={(e) => setStaffFilterDate(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm"
          />
        </div>

        {/* Name Selection Filter */}
        <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
          <label className="text-xs font-bold text-slate-500">اختيار اسم محدد</label>
          <select
            value={staffFilterName}
            onChange={(e) => setStaffFilterName(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 font-bold text-sm w-full"
          >
            <option value="">كل الأسماء</option>
            {Array.from(new Set(staff.map(s => s.name).filter(Boolean)))
              .sort((a, b) => a.localeCompare(b, 'ar'))
              .map(n => (
                <option key={n} value={n}>{n}</option>
              ))
            }
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 pb-[100px]">
        <table className="w-full text-right whitespace-nowrap min-h-[200px]">
          <thead className="bg-slate-100 text-slate-600 font-bold text-sm">
            <tr>
              <th className="p-3 w-12 text-center">
                {!isReadOnly && (
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      filteredStaff.length > 0 &&
                      selectedIds.length === filteredStaff.length
                    }
                    className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                )}
              </th>
              <th className="p-3 w-16 text-center">الرقم</th>
              <th className="p-3 w-32">المدرسة</th>
              <th className="p-3 w-32">الفرع</th>
              <th className="p-3 min-w-[200px]">اسم الموظف</th>
              <th className="p-3 w-32">النوع</th>
              <th className="p-3 w-40">رقم الهاتف</th>
              <th className="p-3 w-36">التاريخ</th>
              <th className="p-3 w-64">الصفة (يمكن اختيار أكثر من واحدة)</th>
              <th className="p-3 w-64">المادة (يمكن اختيار مادة أو أكثر)</th>
              <th className="p-3 w-64">الصف (يمكن اختيار أكثر من واحد)</th>
              <th className="p-3 w-16"></th>
            </tr>
            <tr className="bg-slate-50 border-t border-slate-200 text-xs">
              <th className="p-2 text-center text-[10px] text-slate-400 font-bold">تعميم</th>
              <th className="p-2"></th>
              
              {/* المدرسة */}
              <th className="p-2">
                <select
                  className="w-full bg-white border border-slate-250 rounded-lg p-1 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGeneralizeField("school", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">تعميم...</option>
                  {uniqueSchoolsForGen.map(s => (
                    <option key={`gen-sch-${s}`} value={s}>{s}</option>
                  ))}
                </select>
              </th>
              
              {/* الفرع */}
              <th className="p-2">
                <select
                  className="w-full bg-white border border-slate-250 rounded-lg p-1 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGeneralizeField("branch", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">تعميم...</option>
                  {uniqueBranchesForGen.map(b => (
                    <option key={`gen-br-${b}`} value={b}>{b}</option>
                  ))}
                </select>
              </th>
              
              {/* اسم الموظف */}
              <th className="p-2"></th>
              
              {/* النوع */}
              <th className="p-2">
                <select
                  className="w-full bg-white border border-slate-250 rounded-lg p-1 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGeneralizeField("gender", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">تعميم...</option>
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                </select>
              </th>
              
              {/* رقم الهاتف */}
              <th className="p-2"></th>
              
              {/* التاريخ */}
              <th className="p-2"></th>
              
              {/* الصفة */}
              <th className="p-2">
                <select
                  className="w-full bg-white border border-slate-250 rounded-lg p-1 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGeneralizeField("jobTitles", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">تعميم...</option>
                  {uniqueJobsForGen.map(j => (
                    <option key={`gen-job-${j}`} value={j}>{j}</option>
                  ))}
                </select>
              </th>
              
              {/* المادة */}
              <th className="p-2">
                <select
                  className="w-full bg-white border border-slate-250 rounded-lg p-1 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGeneralizeField("subjects", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">تعميم...</option>
                  {uniqueSubjectsForGen.map(sub => (
                    <option key={`gen-sub-${sub}`} value={sub}>{sub}</option>
                  ))}
                </select>
              </th>
              
              {/* الصف */}
              <th className="p-2">
                <select
                  className="w-full bg-white border border-slate-250 rounded-lg p-1 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleGeneralizeField("grades", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={isReadOnly}
                >
                  <option value="">تعميم...</option>
                  {uniqueGradesForGen.map(g => (
                    <option key={`gen-grade-${g}`} value={g}>{g}</option>
                  ))}
                </select>
              </th>
              
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((employee, index) => (
              <tr
                key={employee.id}
                className={`border-b border-slate-200 transition-colors ${selectedIds.includes(employee.id) ? "bg-blue-50" : "hover:bg-white"}`}
              >
                <td className="p-2 text-center">
                  {!isReadOnly && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(employee.id)}
                      onChange={() => toggleSelect(employee.id)}
                      className="rounded border-slate-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                </td>
                <td className="p-2 text-center font-bold text-slate-500">
                  {employee.serialNumber}
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                    value={employee.school}
                    onChange={(e) =>
                      updateRow(employee.id, "school", e.target.value)
                    }
                    disabled={isReadOnly}
                  >
                    <option value="">اختر المدرسة</option>
                    {userSchools.map((s, idx) => (
                      <option key={`school-${s}-${idx}`} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                    value={employee.branch}
                    onChange={(e) =>
                      updateRow(employee.id, "branch", e.target.value)
                    }
                    disabled={isReadOnly || !employee.school}
                  >
                    <option value="">اختر الفرع</option>
                    {getAvailableBranches(employee.school).map((b: string, idx) => (
                      <option key={`branch-${b}-${idx}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    disabled={isReadOnly}
                    type="text"
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                    value={localNames[employee.id] ?? employee.name}
                    onChange={(e) => {
                      setLocalNames(prev => ({ ...prev, [employee.id]: e.target.value }));
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== employee.name) {
                        updateRow(employee.id, "name", e.target.value);
                      }
                    }}
                  />
                </td>
                <td className="p-2">
                  <select
                    disabled={isReadOnly}
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50"
                    value={employee.gender}
                    onChange={(e) =>
                      updateRow(employee.id, "gender", e.target.value)
                    }
                  >
                    <option value="">اختر...</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    disabled={isReadOnly}
                    type="text"
                    dir="ltr"
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 text-right"
                    placeholder="0xxx..."
                    value={localPhones[employee.id] ?? employee.phone}
                    onChange={(e) => {
                      setLocalPhones(prev => ({ ...prev, [employee.id]: e.target.value }));
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== employee.phone) {
                        updateRow(employee.id, "phone", e.target.value);
                      }
                    }}
                  />
                </td>
                <td className="p-2">
                  <input
                    disabled={isReadOnly}
                    type="date"
                    className="w-full bg-transparent border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 disabled:opacity-50 text-right font-bold text-sm"
                    value={employee.date || ""}
                    onChange={(e) => updateRow(employee.id, "date", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <div
                      className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]"
                      title={(employee.jobTitles || []).join("، ")}
                    >
                      {(employee.jobTitles || []).join("، ") || "اختر الصفة..."}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl hidden group-hover:block z-[100]">
                        <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500">
                          اختر صفة أو أكثر:
                        </div>
                        {JOB_TITLES.map((title) => (
                          <label
                            key={title}
                            className="flex items-center gap-2 p-3 hover:bg-blue-50 cursor-pointer text-sm transition-colors border-b border-slate-50 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={(employee.jobTitles || []).includes(title)}
                              onChange={() =>
                                toggleArrayItem(employee.id, "jobTitles", title)
                              }
                              className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                            />
                            <span className={(employee.jobTitles || []).includes(title) ? "font-bold text-blue-700" : "text-slate-700"}>
                              {title}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <div
                      className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]"
                      title={(employee.subjects || []).join("، ")}
                    >
                      {(employee.subjects || []).join("، ") || "اختر المادة..."}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl hidden group-hover:block z-[100]">
                        <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500">
                          اختر مادة أو أكثر:
                        </div>
                        {[
                          "مربية", "القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", 
                          "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب",
                          "الإرشاد", "المهارات الحياتية"
                        ].map((subj) => (
                          <label
                            key={subj}
                            className="flex items-center gap-2 p-3 hover:bg-blue-50 cursor-pointer text-sm transition-colors border-b border-slate-50 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={(employee.subjects || []).includes(subj)}
                              onChange={() =>
                                toggleArrayItem(employee.id, "subjects", subj)
                              }
                              className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                            />
                            <span className={(employee.subjects || []).includes(subj) ? "font-bold text-blue-700" : "text-slate-700"}>
                              {subj}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="relative group">
                    <div
                      className="min-h-[38px] p-2 border border-slate-200 rounded-lg bg-transparent truncate max-w-[200px]"
                      title={(employee.grades || []).join("، ")}
                    >
                      {(employee.grades || []).join("، ") || "اختر..."}
                    </div>
                    {!isReadOnly && (
                      <div className="absolute top-full right-0 mt-1 w-32 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-50">
                        {[
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
                        ].map((gr) => (
                          <label
                            key={gr}
                            className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={(employee.grades || []).includes(gr)}
                              onChange={() =>
                                toggleArrayItem(employee.id, "grades", gr)
                              }
                              className="rounded border-slate-300 text-blue-500 w-4 h-4 cursor-pointer"
                            />
                            {gr}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 text-center">
                  {!isReadOnly && (
                    <button
                      onClick={() => deleteRow(employee.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="p-8 text-center text-slate-500 font-bold"
                >
                  لا يوجد موظفون مطابقون للبحث، قم بالإضافة أو الاستيراد من إكسل
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};
