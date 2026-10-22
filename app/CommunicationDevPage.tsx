import React, { useState, useMemo, useEffect } from "react";
import { useGlobal } from "../context/GlobalState";
import { 
  Plus, 
  Search, 
  Share2, 
  FileSpreadsheet, 
  Trash2, 
  Archive, 
  CheckSquare, 
  User, 
  Calendar, 
  Filter, 
  AlertCircle, 
  MessageCircle, 
  Check, 
  Send, 
  Pin, 
  ExternalLink, 
  BookOpen, 
  Layers, 
  Clock, 
  X, 
  Info, 
  HelpCircle,
  FileText,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CommunicationPost, SchoolHomework } from "../types";
import { exportToStyledExcel, toHijri } from "../src/lib/excelExport";
import { toast } from "sonner";
import api from "../src/lib/api";

// دالة تفتيش ومطابقة الأسماء العربية بمرونة لتلافي الأخطاء الإملائية الشائعة
const normalizeArabicText = (text: string): string => {
  if (!text) return "";
  return text
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .toLowerCase();
};

export default function CommunicationDevPage() {
  const { data, updateData, currentUser, getReportMessageFooter, shareViaWhatsApp } = useGlobal();

  // Active collection states
  const posts = useMemo(() => {
    const rawPosts = data.communicationPosts || [];
    return [...rawPosts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [data.communicationPosts]);
  const homeworks = useMemo(() => data.schoolHomeworks || [], [data.schoolHomeworks]);

  // System State Management
  const [activeTab, setActiveTab] = useState<"circulars" | "polls" | "homework">("circulars");
  const [activeViewMode, setActiveViewMode] = useState<"card" | "table">("card");
  const [isCreating, setIsCreating] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  
  // WhatsApp Share Dialog State
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappMessageContent, setWhatsappMessageContent] = useState("");
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState("");

  // Search and Advanced Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // دالة مزامنة متزامنة لضمان الحفظ في السيرفر أولاً
  const syncWithServer = async (key: "communicationPosts" | "schoolHomeworks", updatedDataArray: any[]) => {
    const school = currentUser?.selectedSchool?.split(",")[0]?.trim() || data.profile?.schoolName || "الكل";
    try {
      await api.post(`/sync/school/${encodeURIComponent(school)}`, {
        key,
        data: updatedDataArray
      });
      // تحديث الحالة المحلية والكاش فقط بعد نجاح الحفظ على السيرفر
      updateData({ [key]: updatedDataArray });
      return true;
    } catch (error: any) {
      console.error("Failed to sync shared data with server:", error);
      const serverMessage = error.response?.data?.message;
      if (serverMessage) {
        toast.error(`⚠️ ${serverMessage}`);
      } else {
        toast.error("⚠️ حدث خطأ أثناء حفظ البيانات في السيرفر. لم يتم الحفظ محلياً.");
      }
      throw error;
    }
  };

  // تصفير الفلاتر عند تغيير التبويبات لتجنب تداخل الفلاتر وتصفية البيانات بشكل غير مقصود
  useEffect(() => {
    setSearchQuery("");
    setFilterDay("");
    setFilterGrade("");
    setFilterSection("");
    setFilterSubject("");
    setFilterPeriod("");
    setShowArchivedOnly(false);
  }, [activeTab]);

  // User Authority Checkers
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  
  const isSupervisor =
    currentUser?.jobTitle?.includes("مشرف") || 
    currentUser?.jobTitle?.includes("موجه") || 
    currentUser?.permissions?.educationalSupervision === true;

  const hasFullCommunicationViewAccess = useMemo(() => {
    if (currentUser?.role === "admin" || currentUser?.permissions?.all === true) return true;
    const title = currentUser?.jobTitle || "";
    const allowedTitles = [
      "مشرف عام",
      "المشرف العام",
      "نائب مشرف عام",
      "نائب المشرف العام",
      "مدير عام",
      "المدير العام",
      "مدير فرع",
      "مدير الفرع",
      "سكرتارية",
      "سكرتير",
      "سكرتيرة",
      "إدارة الجودة",
      "الجودة"
    ];
    return allowedTitles.some(t => title.includes(t));
  }, [currentUser]);

  const isTeacher =
    currentUser?.jobTitle?.includes("معلم") || 
    currentUser?.jobTitle?.includes("أستاذ") ||
    !(isGeneralSupervisor || isSupervisor || hasFullCommunicationViewAccess);

  const isSubjectTeacherOrNanny = useMemo(() => {
    if (isGeneralSupervisor || isSupervisor || hasFullCommunicationViewAccess) return false;
    const title = currentUser?.jobTitle || "";
    return title.includes("معلم") || title.includes("مربية") || title.includes("أستاذ") || title.includes("أستاذة");
  }, [currentUser, isGeneralSupervisor, isSupervisor, hasFullCommunicationViewAccess]);

  // --- صلاحية الاطلاع على تفاصيل التعاميم والاستطلاعات ---
  const canViewDetails = useMemo(() => {
    if (isGeneralSupervisor) return true;
    const commPerms = currentUser?.permissions?.communicationDev;
    if (Array.isArray(commPerms) && commPerms.includes("viewDetails")) return true;
    if (currentUser?.permissions?.viewCommunicationDetails === true) return true;
    return false;
  }, [currentUser, isGeneralSupervisor]);

  // --- حالة طي/فتح تفاصيل الاطلاع لكل منشور ---
  const [expandedDetailPosts, setExpandedDetailPosts] = useState<Record<string, boolean>>({});

  const togglePostDetails = (postId: string) => {
    setExpandedDetailPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // --- تسجيل المشاهدة التلقائية عند فتح صفحة التعاميم/الاستطلاعات ---
  useEffect(() => {
    if (!currentUser?.id || !currentUser?.name) return;
    if (activeTab === "homework") return;

    const currentPosts = data.communicationPosts || [];
    const relevantPosts = currentPosts.filter(p => {
      if (activeTab === "circulars" && p.type !== "circular") return false;
      if (activeTab === "polls" && p.type !== "poll") return false;
      if (p.isArchived) return false;
      // Check if already viewed
      const alreadyViewed = p.views?.some(v => v.userId === currentUser.id);
      if (alreadyViewed) return false;
      return true;
    });

    if (relevantPosts.length === 0) return;

    const updatedPosts = currentPosts.map(p => {
      const shouldTrack = relevantPosts.some(rp => rp.id === p.id);
      if (!shouldTrack) return p;
      return {
        ...p,
        views: [
          ...(p.views || []),
          { userId: currentUser.id, userName: currentUser.name, viewedAt: new Date().toISOString() }
        ]
      };
    });

    syncWithServer("communicationPosts", updatedPosts).catch(() => {});
  }, [activeTab, currentUser?.id]);

  // --- دالة تأكيد الاطلاع (زر "تم الاطلاع") ---
  const handleAcknowledgePost = async (postId: string) => {
    if (!currentUser?.id || !currentUser?.name) return;
    const updatedPosts = posts.map(p => {
      if (p.id !== postId) return p;
      const alreadyAcknowledged = p.acknowledgments?.some(a => a.userId === currentUser.id);
      if (alreadyAcknowledged) {
        toast.info("لقد قمت بتأكيد اطلاعك مسبقاً على هذا المنشور");
        return p;
      }
      return {
        ...p,
        acknowledgments: [
          ...(p.acknowledgments || []),
          { userId: currentUser.id, userName: currentUser.name, acknowledgedAt: new Date().toISOString() }
        ]
      };
    });
    try {
      await syncWithServer("communicationPosts", updatedPosts);
      toast.success("✅ تم تسجيل تأكيد اطلاعك بنجاح");
    } catch (e) {
      // Handled in syncWithServer
    }
  };

  // --- قوائم الصفوف والشعب والمواد من السكرتارية بناءً على صلاحيات المستخدم ---
  const userSecretariatData = useMemo(() => {
    const staffData = data.secretariatStaff || [];
    const currentName = currentUser?.name?.trim().toLowerCase() || "";
    
    // البحث عن الموظف الحالي في بيانات السكرتارية
    const matchedStaff = staffData.find((s: any) => 
      s.name?.trim().toLowerCase() === currentName
    );

    if (matchedStaff) {
      return {
        grades: Array.isArray(matchedStaff.grades) ? matchedStaff.grades : 
                (matchedStaff.grade ? [matchedStaff.grade] : []),
        sections: Array.isArray(matchedStaff.sections) ? matchedStaff.sections :
                  (matchedStaff.section ? [matchedStaff.section] : []),
        subjects: Array.isArray(matchedStaff.subjects) ? matchedStaff.subjects :
                  (matchedStaff.subject ? [matchedStaff.subject] : []),
      };
    }

    // إذا لم يوجد في السكرتارية، استخدم بيانات حساب المستخدم
    return {
      grades: currentUser?.grades || [],
      sections: currentUser?.sections || [],
      subjects: currentUser?.subjects || [],
    };
  }, [data.secretariatStaff, currentUser]);

  // --- مسميات الحصص الوصفية ---
  const periodLabels: Record<number, string> = {
    1: "الحصة الأولى",
    2: "الحصة الثانية",
    3: "الحصة الثالثة",
    4: "الحصة الرابعة",
    5: "الحصة الخامسة",
    6: "الحصة السادسة",
    7: "الحصة السابعة",
  };

  // Permissions based tabs filtering
  const permittedTabs = useMemo(() => {
    if (isGeneralSupervisor) {
      return ["circulars", "polls", "homework"];
    }
    const commPerms = currentUser?.permissions?.communicationDev;
    if (commPerms === true) {
      return ["circulars", "polls", "homework"];
    }
    if (Array.isArray(commPerms)) {
      const tabs = [];
      if (commPerms.includes("circulars")) tabs.push("circulars");
      if (commPerms.includes("surveys")) tabs.push("polls");
      if (commPerms.includes("homework")) tabs.push("homework");
      return tabs;
    }
    // For backwards compatibility when permission is not explicitly set in the Firestore document
    return ["circulars", "polls", "homework"];
  }, [currentUser, isGeneralSupervisor]);

  // Sync activeTab if current tab becomes unpermitted
  React.useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.includes(activeTab)) {
      setActiveTab(permittedTabs[0] as any);
    }
  }, [permittedTabs, activeTab]);

  // Form State For New Communication Post (Circulars & Polls)
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<"circular" | "poll">("circular");
  const [importance, setImportance] = useState<"normal" | "urgent" | "critical">("normal");
  const [targetAudience, setTargetAudience] = useState<"all" | "specific" | "draft">("all");
  const [isAdministrativeTask, setIsAdministrativeTask] = useState(false);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [allowMultipleChoice, setAllowMultipleChoice] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [externalLink, setExternalLink] = useState("");

  // Targeted audience states (dynamic roles/users selections)
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(["all"]);
  const [selectedStaffNames, setSelectedStaffNames] = useState<string[]>([]);

  // Form State For New Homework
  const [homeworkSubject, setHomeworkSubject] = useState("");
  const [homeworkGrade, setHomeworkGrade] = useState("");
  const [homeworkSection, setHomeworkSection] = useState("");
  const [homeworkPeriod, setHomeworkPeriod] = useState(1);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkDescription, setHomeworkDescription] = useState("");
  const [homeworkDueDate, setHomeworkDueDate] = useState("");

  // تحديث الحصة المحددة تلقائياً لأول حصة شاغرة ومتاحة لتلافي التكرار والتعارض
  useEffect(() => {
    if (activeTab === "homework" && isCreating) {
      const availablePeriods = [1, 2, 3, 4, 5, 6, 7].filter(num => {
        return !homeworks.some(hw => 
          !hw.isArchived &&
          hw.id !== editingHomeworkId &&
          hw.targetGrade === homeworkGrade &&
          hw.targetSection === homeworkSection &&
          hw.date === selectedDate &&
          hw.periodNumber === num
        );
      });
      if (availablePeriods.length > 0) {
        if (!availablePeriods.includes(homeworkPeriod)) {
          setHomeworkPeriod(availablePeriods[0]);
        }
      }
    }
  }, [homeworkGrade, homeworkSection, selectedDate, homeworks, isCreating, activeTab, editingHomeworkId]);

  // Populate dynamic filter criteria options
  const schoolProfile = data.profile;
  const schoolNameStr = schoolProfile?.schoolName || currentUser?.selectedSchool || "مدرستنا الغالية";
  const branchNameStr = schoolProfile?.branch || "...";
  const branchManagerStr = schoolProfile?.branchManager || "مدير المدرسة";
  
  // Available drop-downs gathered from profile / global state
  const availableGrades = useMemo(() => {
    const rawGrades = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "الأول ثانوي", "الثاني ثانوي", "الثالث ثانوي"];
    const gradeMapping: Record<string, string> = {
      "1": "الأول",
      "2": "الثاني",
      "3": "الثالث",
      "4": "الرابع",
      "5": "الخامس",
      "6": "السادس",
      "7": "السابع",
      "8": "الثامن",
      "9": "التاسع",
      "10": "الأول ثانوي",
      "11": "الثاني ثانوي",
      "12": "الثالث ثانوي",
      "تمهيدي": "تمهيدي"
    };
    if (currentUser?.grades && currentUser.grades.length > 0) {
      const cleanUserGrades = currentUser.grades.map(g => String(g).trim());
      return rawGrades.filter(g => {
        return cleanUserGrades.includes(g) || cleanUserGrades.some(cg => gradeMapping[cg] === g);
      });
    }
    return rawGrades;
  }, [currentUser]);

  const availableSections = useMemo(() => {
    const rawSections = ["أ", "ب", "ج", "د", "هـ", "الشعبة الأولى", "الشعبة الثانية"];
    if (currentUser?.sections && currentUser.sections.length > 0) {
      const cleanUserSections = currentUser.sections.map(sec => String(sec).trim());
      return rawSections.filter(sec => {
        return cleanUserSections.includes(sec) || 
               (sec.includes("الأولى") && cleanUserSections.includes("أ")) || 
               (sec.includes("الثانية") && cleanUserSections.includes("ب"));
      });
    }
    return rawSections;
  }, [currentUser]);

  const availableSubjects = useMemo(() => {
    return ["القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "الرياضيات", "العلوم", "الاجتماعيات", "اللغة الإنجليزية", "الحاسوب", "الكيمياء", "الفيزياء", "الأحياء"];
  }, []);

  // --- محاسبة الموظفين المشتركين في نفس المدرسة والفرع لتوجيه التعميمات ---
  const sameSchoolStaff = useMemo(() => {
    const staffList: Array<{ id: string; name: string; jobTitles: string[] }> = [];
    const currentSchools = (currentUser?.selectedSchool || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const currentBranches = (currentUser?.selectedBranch || "")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    const userGrades = (currentUser?.grades || []).map(g => g.trim()).filter(Boolean);
    const userSections = (currentUser?.sections || []).map(s => s.trim()).filter(Boolean);

    const isGeneralAdminOrSupervisor = 
      currentUser?.role === "admin" || 
      currentUser?.permissions?.all === true;

    // دالة تحقق ذكية لمطابقة الصلاحيات والتوافق في الصف والشعبة
    const checkGradeSectionCompatibility = (targetItem: any) => {
      if (isGeneralAdminOrSupervisor) return true;

      // استخراج الصفوف للشخص المستهدف
      let targetGrades: string[] = [];
      if (Array.isArray(targetItem.grades)) {
        targetGrades = targetItem.grades.map((g: any) => String(g).trim()).filter(Boolean);
      } else if (typeof targetItem.grade === "string" && targetItem.grade.trim()) {
        targetGrades = [targetItem.grade.trim()];
      }

      // استخراج الشعب للشخص المستهدف
      let targetSections: string[] = [];
      if (Array.isArray(targetItem.sections)) {
        targetSections = targetItem.sections.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (Array.isArray(targetItem.classes)) {
        targetSections = targetItem.classes.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (typeof targetItem.section === "string" && targetItem.section.trim()) {
        targetSections = [targetItem.section.trim()];
      }

      // توحيد الحروف العربية لتجنب الاختلافات الطفيفة (مستوى من المرونة الإملائية الشائعة كالألف المقصورة والهاء والتاء المربوطة)
      const normalize = (val: string) => 
        val.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, "").toLowerCase();

      // التوافق مع الصفوف المحددة للمستخدم
      if (userGrades.length > 0 && !userGrades.includes("all")) {
        if (targetGrades.length > 0 && !targetGrades.includes("all")) {
          const hasOverlap = targetGrades.some(g => userGrades.includes(g));
          if (!hasOverlap) return false;
        }
      }

      // التوافق مع الشعب المحددة للمستخدم
      if (userSections.length > 0 && !userSections.includes("all")) {
        if (targetSections.length > 0 && !targetSections.includes("all")) {
          const normUserSecs = userSections.map(normalize);
          const normTargetSecs = targetSections.map(normalize);
          const hasOverlap = normTargetSecs.some(s => normUserSecs.includes(s));
          if (!hasOverlap) return false;
        }
      }

      return true;
    };

    // 1. أولاً: من حسابات المستخدمين المسجلة في نفس الفرع والمدرسة (نعطيهم أولوية قصوى لكي يتطابق المعرف id للتزامن)
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach((u: any) => {
        const isGlobal = u.role === "admin" || u.permissions?.all === true;
        const matchesSchool = isGlobal || currentSchools.length === 0 || 
          (u.schools && u.schools.some((sc: string) => currentSchools.includes(sc)));
        
        const matchesBranch = isGlobal || currentBranches.length === 0 || currentSchools.some((school) => {
          const userBranches = u.permissions?.schoolsAndBranches?.[school] || [];
          return currentBranches.some((b) => userBranches.includes(b));
        });
        
        const matchesGradeSection = checkGradeSectionCompatibility(u);
        
        if (matchesSchool && matchesBranch && matchesGradeSection) {
          const title = u.jobTitle || "معلم";
          staffList.push({
            id: u.id || `user_${u.name}`,
            name: u.name,
            jobTitles: [title]
          });
        }
      });
    }

    // 2. ثانياً: من سجل شؤون الموظفين بالسكرتارية (كملف تكميلي لتجهيز بقية الأسماء)
    if (data.secretariatStaff && Array.isArray(data.secretariatStaff)) {
      data.secretariatStaff.forEach((s: any) => {
        const matchesSchool = !s.school || currentSchools.length === 0 || currentSchools.includes(s.school);
        const matchesBranch = !s.branch || currentBranches.length === 0 || currentBranches.includes(s.branch) || currentBranches.includes(s.schoolBranch);
        
        const matchesGradeSection = checkGradeSectionCompatibility(s);
        
        if (matchesSchool && matchesBranch && matchesGradeSection) {
          const titles = Array.isArray(s.jobTitles) 
            ? s.jobTitles 
            : (s.jobTitles ? [s.jobTitles] : (s.jobTitle ? [s.jobTitle] : ["معلم"]));
          
          // البحث عما إذا كان هذا الموظف مضافاً سابقاً من حسابات المستخدمين
          const existing = staffList.find(item => item.name.trim().toLowerCase() === s.name.trim().toLowerCase());
          if (existing) {
            // ندمج المسميات الوظيفية بدون تكرار، ونحتفظ بالمعرّف لـ "مستخدم" لضمان التزامن باسم الموظف الحقيقي
            titles.forEach(t => {
              if (t && !existing.jobTitles.includes(t)) {
                existing.jobTitles.push(t);
              }
            });
          } else {
            staffList.push({
              id: s.id || `staff_${s.name}`,
              name: s.name,
              jobTitles: titles
            });
          }
        }
      });
    }

    const cleanList = staffList.filter(s => s && s.name && s.name.trim());
    
    // إرجاع قائمة فريدة من نوعها بالأسماء
    const uniqueList: typeof cleanList = [];
    const namesSeen = new Set<string>();
    cleanList.forEach((item) => {
      const trimmedName = item.name.trim();
      if (!namesSeen.has(trimmedName)) {
        namesSeen.add(trimmedName);
        uniqueList.push(item);
      }
    });

    return uniqueList;
  }, [data.secretariatStaff, data.users, currentUser]);

  const availableJobTitles = useMemo(() => {
    const titles = new Set<string>();
    sameSchoolStaff.forEach(s => {
      s.jobTitles.forEach(t => {
        if (t && t.trim()) {
          titles.add(t.trim());
        }
      });
    });
    if (titles.size === 0) {
      return ["معلم", "مشرف", "مدير", "وكيل", "سكرتير", "أخصائي اجتماعي", "إداري"];
    }
    return Array.from(titles);
  }, [sameSchoolStaff]);

  const matchedStaffList = useMemo(() => {
    if (selectedDestinations.includes("all")) {
      return sameSchoolStaff;
    }
    return sameSchoolStaff.filter(s => 
      s.jobTitles.some(t => {
        const tClean = normalizeArabicText(t);
        return selectedDestinations.some(dest => {
          const destClean = normalizeArabicText(dest);
          return tClean.includes(destClean) || destClean.includes(tClean);
        });
      })
    );
  }, [sameSchoolStaff, selectedDestinations]);

  // تحديث أسماء المستهدفين بشكل تلقائي عند تغيير الفلترة للتسهيل
  React.useEffect(() => {
    setSelectedStaffNames(matchedStaffList.map(s => s.name));
  }, [matchedStaffList]);

  // --- Filtering Logic ---
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Archive Filter
      if (showArchivedOnly && !post.isArchived) return false;
      if (!showArchivedOnly && post.isArchived) return false;

      // تحقق من الجهة المرسل إليها والخصوصية (أن يكون المستخدم مستهدفاً للتعميم/الاستطلاع أو هو الكاتب أو المشرف العام)
      const isAuthor = post.authorId === currentUser?.id || 
                       (currentUser?.name && normalizeArabicText(post.authorName || "") === normalizeArabicText(currentUser.name));
      const isAdminOrSupervisor = currentUser?.role === "admin" || currentUser?.permissions?.all === true || isGeneralSupervisor || isSupervisor || hasFullCommunicationViewAccess;
      
      if (!isAdminOrSupervisor && !isAuthor) {
        if (post.targetAudience === "specific") {
          // مطابقة دقيقة وعميقة بالمعرف id أو اسم المستخدم مع تلافي الفروق الإملائية الطفيفة
          const currentUserIdLower = currentUser?.id?.trim().toLowerCase();
          const isTargetedByUid = !!(currentUserIdLower && post.targetUserIds?.some(id => id?.trim().toLowerCase() === currentUserIdLower));
          
          const currentNormalizedName = normalizeArabicText(currentUser?.name || "");
          const isTargetedByName = !!(currentNormalizedName && post.targetUsers?.some(u => normalizeArabicText(u || "") === currentNormalizedName));
          
          // مطابقة المسمى الوظيفي للمستهدفين بمرونة (الاحتواء بدلاً من التطابق التام)
          const currentJobLower = normalizeArabicText(currentUser?.jobTitle || "");
          const isTargetedByDestination = !!(
            currentJobLower &&
            post.targetDestinations?.some(dest => {
              const destClean = normalizeArabicText(dest);
              return currentJobLower.includes(destClean) || destClean.includes(currentJobLower) || destClean === "all" || destClean === "الكل";
            })
          );
          
          if (!isTargetedByUid && !isTargetedByName && !isTargetedByDestination) {
            return false;
          }
        }
      }

      // Text query search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = post.title?.toLowerCase().includes(query);
        const matchesContent = post.content?.toLowerCase().includes(query);
        const matchesAuthor = post.authorName?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent && !matchesAuthor) return false;
      }

      return true;
    });
  }, [posts, searchQuery, showArchivedOnly, filterGrade, currentUser, isGeneralSupervisor, isSupervisor, hasFullCommunicationViewAccess]);

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter((hw) => {
      // Archive Filter
      if (showArchivedOnly && !hw.isArchived) return false;
      // If not archived-only, show all, but restrict to date selected if filterDay is not specified
      if (!showArchivedOnly && hw.isArchived) return false;

      // Day specific filter or global date
      if (filterDay) {
        if (hw.date !== filterDay) return false;
      } else if (!searchQuery.trim() && !filterGrade && !filterSection && !filterSubject) {
        // Fallback to active system date when no search filters are typed
        if (hw.date !== selectedDate) return false;
      }

      // Text query search (Title/Description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = hw.title?.toLowerCase().includes(query);
        const matchDesc = hw.description?.toLowerCase().includes(query);
        const matchTeacher = hw.teacherName?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchTeacher) return false;
      }

      // Dropdown filters
      if (filterGrade && hw.targetGrade !== filterGrade) return false;
      if (filterSection && hw.targetSection !== filterSection) return false;
      if (filterSubject && hw.subjectName !== filterSubject) return false;
      if (filterPeriod && hw.periodNumber.toString() !== filterPeriod) return false;

      // تصفية الواجبات للمعلم أو المربية ليرى فقط ما أضافه هو
      if (isSubjectTeacherOrNanny) {
        const matchesId = hw.teacherId === currentUser?.id;
        const matchesName = hw.teacherName?.trim().toLowerCase() === currentUser?.name?.trim().toLowerCase();
        if (!matchesId && !matchesName) return false;
      }

      return true;
    });
  }, [homeworks, searchQuery, filterDay, selectedDate, filterGrade, filterSection, filterSubject, filterPeriod, showArchivedOnly, isSubjectTeacherOrNanny, currentUser]);

  // Bulk action helpers
  const handleToggleBulkSelect = (id: string) => {
    setBulkSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllBulkSelect = (ids: string[]) => {
    if (bulkSelection.length === ids.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(ids);
    }
  };

  const executeBulkDelete = async () => {
    if (bulkSelection.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${bulkSelection.length} من العناصر المحددة نهائياً؟`)) return;

    try {
      if (activeTab === "homework") {
        const remaining = homeworks.filter((hw) => !bulkSelection.includes(hw.id));
        await syncWithServer("schoolHomeworks", remaining);
      } else {
        const remaining = posts.filter((p) => !bulkSelection.includes(p.id));
        await syncWithServer("communicationPosts", remaining);
      }
      setBulkSelection([]);
      toast.success("تم الحذف الجماعي بنجاح");
    } catch (e) {
      // Handled
    }
  };

  const executeBulkArchive = async () => {
    if (bulkSelection.length === 0) return;
    
    try {
      if (activeTab === "homework") {
        const updated = homeworks.map((hw) => 
          bulkSelection.includes(hw.id) ? { ...hw, isArchived: !hw.isArchived } : hw
        );
        await syncWithServer("schoolHomeworks", updated);
      } else {
        const updated = posts.map((p) => 
          bulkSelection.includes(p.id) ? { ...p, isArchived: !p.isArchived } : p
        );
        await syncWithServer("communicationPosts", updated);
      }
      setBulkSelection([]);
      toast.success("تم تعديل حالة الأرشفة بنجاح");
    } catch (e) {
      // Handled
    }
  };

  // --- CRUD Operations ---

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      toast.error("الرجاء إدخال عنوان ومحتوى المنشور");
      return;
    }

    if (selectedStaffNames.length === 0) {
      toast.error("⚠️ الرجاء تحديد موظف واحد على الأقل كجهة مستلمة في حقل الجهة المرسل إليها.");
      return;
    }

    // إذا اخترنا "الجميع" فنعين الجمهور كـ "all"، غير ذلك "specific"
    const isAllSelected = selectedDestinations.includes("all");

    const selectedStaffIds = sameSchoolStaff
      .filter((s) => selectedStaffNames.includes(s.name))
      .map((s) => s.id);

    const newPost: CommunicationPost = {
      id: "post_" + Date.now(),
      type: postType,
      title: postTitle,
      content: postContent,
      authorId: currentUser?.id || "unknown",
      authorName: currentUser?.name || "مشرف غير معروف",
      createdAt: new Date().toISOString(),
      schoolNames: [data.profile?.schoolName || "الكل"],
      targetAudience: isAllSelected ? "all" : "specific",
      targetUsers: selectedStaffNames,
      targetUserIds: selectedStaffIds,
      targetDestinations: selectedDestinations,
      importanceLevel: importance,
      isPinned: false,
      isArchived: false,
      isAdministrativeTask: postType === "circular" ? isAdministrativeTask : undefined,
      taskDeadline: (postType === "circular" && isAdministrativeTask) ? taskDeadline : undefined,
      taskCompletionRate: (postType === "circular" && isAdministrativeTask) ? 0 : undefined,
      options: postType === "poll" 
        ? pollOptions.filter(opt => opt.trim() !== "").map((text, idx) => ({ id: `opt_${idx}`, text, votes: [] }))
        : undefined,
      allowMultipleChoice: postType === "poll" ? allowMultipleChoice : undefined,
      isAnonymous: postType === "poll" ? isAnonymous : undefined,
      expirationDate: expirationDate || undefined,
      externalLink: externalLink || undefined,
      readBy: [],
      remindedUsers: [],
      views: [],
      acknowledgments: []
    };

    const updatedPosts = [newPost, ...posts];

    try {
      await syncWithServer("communicationPosts", updatedPosts);
      
      // Clear and close
      setPostTitle("");
      setPostContent("");
      setPostType("circular");
      setImportance("normal");
      setTargetAudience("all");
      setIsAdministrativeTask(false);
      setTaskDeadline("");
      setPollOptions(["", ""]);
      setAllowMultipleChoice(false);
      setIsAnonymous(false);
      setExpirationDate("");
      setExternalLink("");
      setSelectedDestinations(["all"]);
      setSelectedStaffNames([]);
      setIsCreating(false);
      toast.success("تم نشر بطاقة التواصل بنجاح");
    } catch (err) {
      // Handled
    }
  };

  const handleOpenNewHomework = () => {
    const defaultGrade = userSecretariatData.grades[0] || "";
    const defaultSection = userSecretariatData.sections[0] || "";
    const defaultSubject = userSecretariatData.subjects[0] || "";
    
    setHomeworkGrade(defaultGrade);
    setHomeworkSection(defaultSection);
    setHomeworkSubject(defaultSubject);
    setHomeworkTitle("");
    setHomeworkDescription("");
    setHomeworkDueDate("");
    setHomeworkPeriod(1);
    setEditingHomeworkId(null);
    setIsCreating(true);
  };

  const handleEditHomework = (hw: SchoolHomework) => {
    setHomeworkSubject(hw.subjectName);
    setHomeworkGrade(hw.targetGrade);
    setHomeworkSection(hw.targetSection);
    setHomeworkPeriod(hw.periodNumber);
    setHomeworkTitle(hw.title);
    setHomeworkDescription(hw.description);
    setHomeworkDueDate(hw.dueDate);
    setSelectedDate(hw.date);
    setEditingHomeworkId(hw.id);
    setIsCreating(true);
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkSubject || !homeworkGrade || !homeworkSection || !homeworkTitle.trim() || !homeworkDescription.trim()) {
      toast.error("الرجاء إدخال جميع الحقول الإجبارية للواجب");
      return;
    }

    const homeworksList = data.schoolHomeworks || [];
    
    // تحقق من تكرار الواجب للصف والشعبة والحصة في نفس اليوم لمنع التكرار (مع استثناء التكليف الذي يتم تعديله حالياً)
    const hasDuplicate = homeworksList.some(hw => 
      hw.id !== editingHomeworkId &&
      hw.targetGrade === homeworkGrade &&
      hw.targetSection === homeworkSection &&
      hw.periodNumber === homeworkPeriod &&
      hw.date === selectedDate &&
      !hw.isArchived
    );

    if (hasDuplicate) {
      toast.error("تم إسناد واجب لهذه الحصة للصف والشعبة نفسها. أعد المحاولة باختيار حصة أخرى.");
      return;
    }

    let updatedHomeworks;
    if (editingHomeworkId) {
      updatedHomeworks = homeworksList.map(hw => {
        if (hw.id === editingHomeworkId) {
          return {
            ...hw,
            subjectName: homeworkSubject,
            targetGrade: homeworkGrade,
            targetSection: homeworkSection,
            periodNumber: homeworkPeriod,
            title: homeworkTitle,
            description: homeworkDescription,
            dueDate: homeworkDueDate || selectedDate,
            date: selectedDate
          };
        }
        return hw;
      });
    } else {
      const newHw: SchoolHomework = {
        id: "hw_" + Date.now(),
        teacherId: currentUser?.id || "unknown",
        teacherName: currentUser?.name || "معلم المادة",
        subjectId: "subj_" + Date.now(),
        subjectName: homeworkSubject,
        targetGrade: homeworkGrade,
        targetSection: homeworkSection,
        date: selectedDate, // Use active selected school date
        periodNumber: homeworkPeriod,
        title: homeworkTitle,
        description: homeworkDescription,
        dueDate: homeworkDueDate || selectedDate,
        isArchived: false,
        createdAt: new Date().toISOString(),
        whatsappStatus: {
          sent: false
        }
      };
      updatedHomeworks = [newHw, ...homeworksList];
    }

    try {
      await syncWithServer("schoolHomeworks", updatedHomeworks);
      
      // Clear and close
      setHomeworkTitle("");
      setHomeworkDescription("");
      setHomeworkDueDate("");
      setEditingHomeworkId(null);
      setIsCreating(false);
      toast.success(editingHomeworkId ? "تم تعديل وحفظ التكليف بنجاح" : "تم إسناد وحفظ التكليف والواجب المدرسي بنجاح");
    } catch (err) {
      // Handled
    }
  };

  const handleDeleteItem = async (id: string, type: "post" | "hw") => {
    if (!confirm("هل أنت متأكد من حذف هذا العنصر نهائياً؟")) return;

    try {
      if (type === "post") {
        const updated = posts.filter(p => p.id !== id);
        await syncWithServer("communicationPosts", updated);
      } else {
        const updated = homeworks.filter(h => h.id !== id);
        await syncWithServer("schoolHomeworks", updated);
      }
      toast.success("تم الحذف بنجاح");
    } catch (e) {
      // Handled
    }
  };

  const handleToggleArchive = async (id: string, type: "post" | "hw") => {
    try {
      if (type === "post") {
        const updated = posts.map(p => p.id === id ? { ...p, isArchived: !p.isArchived } : p);
        await syncWithServer("communicationPosts", updated);
      } else {
        const updated = homeworks.map(h => h.id === id ? { ...h, isArchived: !h.isArchived } : h);
        await syncWithServer("schoolHomeworks", updated);
      }
      toast.success("تم تغيير حالة الأرشفة بنجاح");
    } catch (e) {
      // Handled
    }
  };

  const handleVotePoll = async (postId: string, optionId: string) => {
    const userId = currentUser?.id || "unknown";
    const updated = posts.map((post) => {
      if (post.id === postId && post.options) {
        const newOptions = post.options.map((opt) => {
          // If vote is directly on this option
          if (opt.id === optionId) {
            const hasVoted = opt.votes.includes(userId);
            return {
              ...opt,
              votes: hasVoted 
                ? opt.votes.filter(v => v !== userId) // Remove vote
                : [...opt.votes, userId] // Add vote
            };
          }
          // If multiple choice is disabled, remove user's vote from other options
          if (!post.allowMultipleChoice) {
            return {
              ...opt,
              votes: opt.votes.filter(v => v !== userId)
            };
          }
          return opt;
        });
        return { ...post, options: newOptions };
      }
      return post;
    });

    try {
      await syncWithServer("communicationPosts", updated);
      toast.success("تم تسجيل صوتك بنجاح");
    } catch (e) {
      // Handled
    }
  };

  // --- WhatsApp Engine String Templates Generators ---

  const handleWhatsAppSharePost = (post: CommunicationPost) => {
    const isTask = post.isAdministrativeTask;
    let emojiHeader = post.type === "circular" ? "📢 [تعميم إداري هام]" : "🗳️ [استطلاع رأي وتصويت]";
    if (isTask) {
      emojiHeader = "📝 [مهمة وتكليف إداري جديد]";
    }

    const importanceLabel = 
      post.importanceLevel === "critical" ? "🔴 حرج جداً" :
      post.importanceLevel === "urgent" ? "🟡 عاجل" : "🟢 عادي";

    let messageStr = `${emojiHeader}\n\n`;
    messageStr += `📌 *العنوان:* ${post.title}\n`;
    messageStr += `📝 *المحتوى:* ${post.content}\n\n`;
    messageStr += `👤 *المرسل:* ${post.authorName} | 🏢 *الفرع:* ${branchNameStr}\n`;
    messageStr += `⚠️ *درجة الأهمية:* ${importanceLabel}\n`;

    if (isTask && post.taskDeadline) {
      messageStr += `🏁 *آخر موعد للتنفيذ:* 📅 ${post.taskDeadline}\n`;
    }

    if (post.type === "poll" && post.options) {
      messageStr += `\n📊 *خيارات التصويت المتاحة:*\n`;
      post.options.forEach((opt, i) => {
        messageStr += `🔹 [${i + 1}] - ${opt.text} (${opt.votes.length} صوت)\n`;
      });
    }

    if (post.externalLink) {
      messageStr += `\n🔗 *رابط خارجي:* ${post.externalLink}\n`;
    }
    messageStr += `\n${getReportMessageFooter()}`;

    setWhatsappMessageContent(messageStr);
    setWhatsappModalOpen(true);
  };

  const handleWhatsAppShareDailyHomework = (grade: string, section: string, dateStr: string) => {
    const dailyHws = homeworks.filter(h => h.targetGrade === grade && h.targetSection === section && h.date === dateStr);
    const count = dailyHws.length;

    // Density computation
    const densityLabel = 
      count >= 5 ? "🔴 مكثف" :
      count >= 3 ? "🟡 متوسط" : "🟢 خفيف ومثالي";

    let messageStr = `📚 *[التقرير اليومي للواجبات والتكاليف الأكاديمية]*\n`;
    messageStr += `🏫 *الصف والشعبة:* ${grade} - شعبة ${section} | 📅 *التاريخ:* ${dateStr}\n`;
    messageStr += `📊 *مؤشر كثافة التكاليف اليومية:* ${densityLabel}\n`;
    messageStr += `----------------------------------------\n`;
    messageStr += `📋 *تفاصيل الحصص الدراسية السبع:*\n\n`;

    for (let pIdx = 1; pIdx <= 7; pIdx++) {
      const hwForPeriod = dailyHws.find(h => h.periodNumber === pIdx);
      const timeEmoji = 
        pIdx === 1 ? "🕐 (الحصة الأولى):" :
        pIdx === 2 ? "🕑 (الحصة الثانية):" :
        pIdx === 3 ? "🕒 (الحصة الثالثة):" :
        pIdx === 4 ? "🕓 (الحصة الرابعة):" :
        pIdx === 5 ? "🕔 (الحصة الخامسة):" :
        pIdx === 6 ? "🕕 (الحصة السادسة):" : "🕖 (الحصة السابعة):";

      if (hwForPeriod) {
        messageStr += `${timeEmoji} 📖 *[${hwForPeriod.subjectName}]* | 👨‍🏫 أ. ${hwForPeriod.teacherName}\n`;
        messageStr += `   📝 *التكليف:* ${hwForPeriod.title} - ${hwForPeriod.description}\n`;
        messageStr += `   📅 *تاريخ التسليم:* ${hwForPeriod.dueDate}\n\n`;
      } else {
        messageStr += `${timeEmoji} ⏳ لم يسند واجب بعد\n\n`;
      }
    }

    messageStr += `----------------------------------------\n`;
    messageStr += `🏁 *تمنياتنا لأبنائنا الطلاب بالتوفيق والنجاح الدائم* 🌟\n`;
    messageStr += `${getReportMessageFooter(dateStr)}`;

    setWhatsappMessageContent(messageStr);
    setWhatsappModalOpen(true);
  };

  // Launch genuine WhatsApp Web or app redirect
  const launchWhatsApp = () => {
    // Simulate updating whatsappStatus
    toast.success("تم تجهيز رسالة الواتساب البصرية بنجاح");
    setWhatsappModalOpen(false);
    shareViaWhatsApp(whatsappMessageContent, whatsappRecipientPhone);
  };

  // --- ExcelJS Official (RTL) Export Engine implementation ---

  const handleExportHomeworkExcel = async () => {
    try {
      const headers = [
        "التاريخ واليوم",
        "الحصة",
        "المادة",
        "المعلم",
        "الصف",
        "الشعبة",
        "عنوان التكليف",
        "وصف الواجب والتكاليف المسندة",
        "تاريخ التسليم المتوقع",
        "الحالة الأرشيفية"
      ];

      const excelRowsData = filteredHomeworks.map((hw) => [
        hw.date,
        `الحصة ${hw.periodNumber}`,
        hw.subjectName,
        hw.teacherName,
        hw.targetGrade,
        hw.targetSection,
        hw.title,
        hw.description,
        hw.dueDate,
        hw.isArchived ? "مؤرشف" : "نشط ومستمر"
      ]);

      const reportTitle = "كشف المتابعة اليومية للواجبات والتكاليف المدرسية";
      
      await exportToStyledExcel({
        title: reportTitle,
        filename: `كشف_الواجبات_والتكاليف_${selectedDate}`,
        headers: headers,
        data: excelRowsData,
        date: selectedDate,
        columnWidths: [15, 12, 16, 18, 15, 12, 22, 45, 16, 16],
        profile: {
          ministry: schoolProfile?.ministry || "جمهورية اليمن - وزارة التربية والتعليم والبحث العلمي",
          district: schoolProfile?.district || `مكتب التربية والتعليم بالأمانة بمنطقة ${currentUser?.selectedSchool?.split(",")[0] || ""}`,
          schoolName: schoolNameStr,
          branch: branchNameStr,
          branchManager: branchManagerStr,
          writerName: currentUser?.name || "منشئ التقرير"
        }
      });

      toast.success("تم تصدير كشف الواجبات إلى ملف Excel بنجاح (RTL)");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء حفظ التصدير");
    }
  };

  const handleExportCommunicationExcel = async () => {
    try {
      const headers = [
        "التاريخ",
        "النوع",
        "عنوان التعميم الإداري / الاستطلاع",
        "محتوى بطاقة التواصل بالكامل",
        "الكاتب والناشر للتقرير",
        "مستوى الأهمية والاستباقية",
        "هل هي مهمة إدارية بحد زمني لتسليمها؟",
        "الموعد لإنهاء المهمة",
        "مجموع الأصوات المسجلة"
      ];

      const excelRowsData = filteredPosts.map((post) => [
        post.createdAt.split("T")[0],
        post.type === "circular" ? "تعميم" : "استطلاع رأي",
        post.title,
        post.content,
        post.authorName,
        post.importanceLevel === "critical" ? "حرج جداً" : post.importanceLevel === "urgent" ? "عاجل" : "عادي",
        post.isAdministrativeTask ? "نعم" : "لا",
        post.taskDeadline || "غير محدد",
        post.options ? post.options.reduce((acc, current) => acc + current.votes.length, 0) : "-"
      ]);

      const reportTitle = "سجل الإعلانات الإدارية والتعاميم واستطلاعات الرأي";

      await exportToStyledExcel({
        title: reportTitle,
        filename: `سجل_التعاميم_والاستطلاعات_${new Date().toISOString().split("T")[0]}`,
        headers: headers,
        data: excelRowsData,
        columnWidths: [15, 15, 25, 45, 18, 15, 15, 16, 15],
        profile: {
          ministry: schoolProfile?.ministry || "جمهورية اليمن - وزارة التربية والتعليم والبحث العلمي",
          district: schoolProfile?.district || `مكتب التربية والتعليم بالأمانة بمنطقة ${currentUser?.selectedSchool?.split(",")[0] || ""}`,
          schoolName: schoolNameStr,
          branch: branchNameStr,
          branchManager: branchManagerStr,
          writerName: currentUser?.name || "منشئ التقرير"
        }
      });

      toast.success("تم تصدير سجل الإعلانات الإدارية إلى ملف Excel بنجاح (RTL)");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء حفظ التصدير");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-arabic text-slate-800" dir="rtl">
      {/* 1. Header Banner */}
      <div className="bg-white border text-center border-slate-100 rounded-[2rem] p-6 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <MessageCircle size={28} />
            </span>
            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900">قسم التواصل والتطوير ومتابعة التكاليف</h1>
              <p className="text-slate-500 font-bold text-sm">شاشة إدارة التعاميم الداخلية، استطلاعات الآراء، ومتابعة انسيابية الواجبات اليومية السبع للحصص</p>
            </div>
          </div>
        </div>

        {/* Universal control switches */}
        <div className="flex gap-2 flex-wrap justify-center md:justify-end">
          {permittedTabs.includes("circulars") && (isGeneralSupervisor || isSupervisor || canViewDetails) && (
            <button
              onClick={() => {
                setActiveTab("circulars");
                setPostType("circular");
                setIsCreating(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <Plus size={16} />
              إضافة تعميم جديد
            </button>
          )}
          {permittedTabs.includes("polls") && (isGeneralSupervisor || isSupervisor || canViewDetails) && (
            <button
              onClick={() => {
                setActiveTab("polls");
                setPostType("poll");
                setIsCreating(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-black text-xs hover:bg-violet-700 transition-all shadow-md shadow-violet-100"
            >
              <Plus size={16} />
              إضافة استطلاع جديد
            </button>
          )}
          
          {permittedTabs.includes("homework") && activeTab === "homework" && (
            <button
              onClick={handleOpenNewHomework}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Plus size={16} />
              إضافة واجب يومي جديد
            </button>
          )}

          {/* تم حذف زر إسناد واجب جديد لحصة (الأخضر/التايل) لوجود زر إضافة واجب يومي جديد */}

          <button
            onClick={() => {
              if (activeTab === "homework") handleExportHomeworkExcel();
              else handleExportCommunicationExcel();
            }}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-sm hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet size={18} />
            تصدير الكشف إلى Excel
          </button>
        </div>
      </div>

      {/* 2. Top Tabs Switchers */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        {permittedTabs.includes("circulars") && (
          <button
            onClick={() => {
              setActiveTab("circulars");
              setBulkSelection([]);
            }}
            className={`px-6 py-3.5 font-black text-base border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "circulars"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText size={18} />
            التعاميم والقرارات الإدارية ({posts.filter(p => p.type === "circular" && !p.isArchived).length})
          </button>
        )}

        {permittedTabs.includes("polls") && (
          <button
            onClick={() => {
              setActiveTab("polls");
              setBulkSelection([]);
            }}
            className={`px-6 py-3.5 font-black text-base border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "polls"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <HelpCircle size={18} />
            الاستطلاعات واستفتاء الآراء ({posts.filter(p => p.type === "poll" && !p.isArchived).length})
          </button>
        )}

        {permittedTabs.includes("homework") && (
          <button
            onClick={() => {
              setActiveTab("homework");
              setBulkSelection([]);
            }}
            className={`px-6 py-3.5 font-black text-base border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "homework"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen size={18} />
            متابعة الواجبات والتكاليف لـ (7 حصص) ({homeworks.filter(h => !h.isArchived).length})
          </button>
        )}
      </div>

      {/* 3. Search and Dynamic Archive Tool Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* General lookup input query */}
          <div className="relative">
            <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="البحث بالاسم، العنوان، الوصف..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Active date picker or day selection */}
          <div className="relative">
            <input
              type="date"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors font-bold text-center"
              value={activeTab === "homework" ? selectedDate : filterDay}
              onChange={(e) => {
                if (activeTab === "homework") {
                  setSelectedDate(e.target.value);
                } else {
                  setFilterDay(e.target.value);
                }
              }}
            />
          </div>

          {/* Dropdown criteria based on tabs */}
          {activeTab === "homework" ? (
            <>
              {/* Grade select filter */}
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors font-bold"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
              >
                <option value="">تصفية بـ الصف الدراسي (الكل)</option>
                {availableGrades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>

              {/* Section select filter */}
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors font-bold"
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
              >
                <option value="">تصفية بـ الشعبة الدراسية (الكل)</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </>
          ) : (
            <div className="md:col-span-2 text-left">
              {/* Informative counts for Communication */}
              <span className="inline-block py-2 px-4 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg">
                <Bookmark className="inline mr-1" size={14} />
                يتم مزامنة هذه المنشورات والتعاميم دورياً وتفصيلياً لجميع الأقسام
              </span>
            </div>
          )}
        </div>

        {/* Quick filters: Archived togglers, subject filter, and dynamic items */}
        {activeTab === "homework" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
            {/* Subject option selection */}
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors font-bold"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">تصفية بـ المادة الأكاديمية (الكل)</option>
              {availableSubjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>

            {/* Period drop down filter */}
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors font-bold"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
            >
              <option value="">تصفية بـ رقم الحصة (الكل)</option>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <option key={num} value={num}>الحصة {num}</option>
              ))}
            </select>

            {/* Share complete Daily schedule group template button */}
            {filterGrade && filterSection && (
              <button
                onClick={() => handleWhatsAppShareDailyHomework(filterGrade, filterSection, selectedDate)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl font-bold text-sm transition-colors"
              >
                <Share2 size={16} />
                مشاركة تقرير الشعبة اليومي بالكامل
              </button>
            )}

            {/* Toggle show archived lists */}
            <label className="flex items-center gap-2 cursor-pointer select-none py-2 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={showArchivedOnly}
                onChange={(e) => {
                  setShowArchivedOnly(e.target.checked);
                  setBulkSelection([]);
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-1"
              />
              <span className="text-xs font-black text-slate-600">عرض التكاليف المؤرشفة فقط (سابقاً)</span>
            </label>
          </div>
        )}

        {activeTab !== "homework" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none py-2 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={showArchivedOnly}
                onChange={(e) => {
                  setShowArchivedOnly(e.target.checked);
                  setBulkSelection([]);
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-1"
              />
              <span className="text-xs font-black text-slate-600">عرض المنشورات والقرارات المؤرشفة فقط</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveViewMode("card")}
                className={`py-1.5 px-4 text-xs font-bold rounded-lg transition-colors ${
                  activeViewMode === "card" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                عرض كبطاقات
              </button>
              <button
                onClick={() => setActiveViewMode("table")}
                className={`py-1.5 px-4 text-xs font-bold rounded-lg transition-colors ${
                  activeViewMode === "table" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                عرض كجدول
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bulk management controller */}
      {bulkSelection.length > 0 && (
        <div className="bg-slate-800 text-white p-4 rounded-2xl mb-6 shadow-md flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="bg-slate-700 text-amber-400 py-1 px-3 rounded-lg text-xs font-black">
              تم تحديد {bulkSelection.length}
            </span>
            <span className="text-sm font-bold">يمكنك تطبيق الإجراءات الجماعية على العناصر المحددة:</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={executeBulkArchive}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <Archive size={14} />
              أرشفة / إلغاء الأرشفة
            </button>
            <button
              onClick={executeBulkDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} />
              حذف نهائي
            </button>
            <button
              onClick={() => setBulkSelection([])}
              className="px-3 py-2 bg-slate-900 rounded-xl text-xs hover:bg-slate-950 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Content Area */}
      <div className="mt-4">
        {/* TAB 1: CIRCULARS */}
        {activeTab === "circulars" && (
          <div>
            {filteredPosts.filter(p => p.type === "circular").length === 0 ? (
              <div className="bg-white border rounded-[2rem] p-12 text-center text-slate-500 font-bold border-dashed shadow-sm">
                <AlertCircle className="mx-auto text-slate-300 mb-2" size={36} />
                لا توجد تعاميم مطابقة للفلاتر النشطة حالياً.
              </div>
            ) : activeViewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPosts.filter(p => p.type === "circular").map((post) => (
                  <motion.div
                    key={post.id}
                    layoutId={post.id}
                    className={`bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative group hover:shadow-md transition-all ${
                      post.importanceLevel === "critical" ? "border-r-8 border-r-rose-500" :
                      post.importanceLevel === "urgent" ? "border-r-8 border-r-amber-500" : "border-r-8 border-r-indigo-500"
                    }`}
                  >
                    {/* Select Indicator */}
                    <div className="absolute top-6 left-6 flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBulkSelect(post.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          bulkSelection.includes(post.id) ? "text-indigo-600" : "text-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <CheckSquare size={18} className={bulkSelection.includes(post.id) ? "fill-indigo-50 text-indigo-600" : ""} />
                      </button>

                      {/* Delete item optionally */}
                      {(!isTeacher || post.authorId === currentUser?.id) && (
                        <button
                          onClick={() => handleDeleteItem(post.id, "post")}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleArchive(post.id, "post")}
                        className={`p-1.5 rounded-lg transition-colors ${
                          post.isArchived ? "text-amber-600 bg-amber-50" : "text-slate-300 hover:text-amber-600 hover:bg-slate-50"
                        }`}
                        title={post.isArchived ? "إلغاء الأرشفة" : "أرشفة"}
                      >
                        <Archive size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-full ${
                        post.importanceLevel === "critical" ? "bg-red-50 text-red-700" :
                        post.importanceLevel === "urgent" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {post.importanceLevel === "critical" ? "حرج جداً" : post.importanceLevel === "urgent" ? "عاجل" : "عادي"}
                      </span>

                      <span 
                        className="inline-block px-3 py-1 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700"
                        title={post.targetUsers && post.targetUsers.length > 0 ? `المستلمون: ${post.targetUsers.join("، ")}` : "موجه للجميع"}
                      >
                        📨 موجه إلى: {post.targetAudience === "all" || !post.targetUsers || post.targetUsers.length === 0 ? "الجميع" : `${post.targetUsers.length} من الموظفين`}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-2">{post.title}</h3>
                    <p className="text-slate-600 font-bold text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

                    <div className="border-t border-slate-100 pt-4 flex flex-wrap justify-between items-center text-xs text-slate-500 font-bold">
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-indigo-500" />
                        <span>نشر بواسطة: *{post.authorName}*</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                        <Clock size={14} className="text-indigo-500" />
                        <span>التاريخ: {post.createdAt.split("T")[0]}</span>
                      </div>
                    </div>

                    {/* Task Deadline area */}
                    {post.isAdministrativeTask && (
                      <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-xl text-xs font-black flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle size={14} />
                          مهلة تسليم إدارية محددة: {post.taskDeadline || "بدون حد"}
                        </span>
                        <span>معدل الإنجاز المطلوب: 100%</span>
                      </div>
                    )}

                    {/* Standard Action Utility Bar explicitly required for ALL views */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleWhatsAppSharePost(post)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-700 font-black text-xs rounded-xl hover:bg-green-100 transition-colors"
                      >
                        <Share2 size={13} />
                        مشاركة عبر WhatsApp
                      </button>

                      <button
                        onClick={handleExportCommunicationExcel}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-700 font-black text-xs rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <FileSpreadsheet size={13} />
                        تصدير إلى Excel
                      </button>

                      {/* زر تم الاطلاع */}
                      <button
                        onClick={() => handleAcknowledgePost(post.id)}
                        disabled={post.acknowledgments?.some(a => a.userId === currentUser?.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 font-black text-xs rounded-xl transition-colors ${
                          post.acknowledgments?.some(a => a.userId === currentUser?.id)
                            ? "bg-emerald-100 text-emerald-700 cursor-default"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        <Check size={13} />
                        {post.acknowledgments?.some(a => a.userId === currentUser?.id) ? "تم تأكيد الاطلاع ✓" : "تم الاطلاع"}
                      </button>
                    </div>

                    {/* قسم تفاصيل الاطلاع والمشاهدات - يظهر فقط لصاحب التعميم أو من لديه الصلاحية */}
                    {(canViewDetails || post.authorId === currentUser?.id) && (
                      <div className="mt-3">
                        <button
                          onClick={() => togglePostDetails(post.id)}
                          className="w-full flex items-center justify-between py-2.5 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-600 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Eye size={14} className="text-indigo-500" />
                            تفاصيل الاطلاع والمشاهدات ({post.views?.length || 0} مشاهدة • {post.acknowledgments?.length || 0} تأكيد)
                          </span>
                          {expandedDetailPosts[post.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        <AnimatePresence>
                          {expandedDetailPosts[post.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                {/* قائمة من أكدوا الاطلاع */}
                                <div>
                                  <h4 className="text-xs font-black text-emerald-700 mb-2 flex items-center gap-1.5">
                                    <Check size={13} className="text-emerald-600" />
                                    أكدوا الاطلاع ({post.acknowledgments?.length || 0})
                                  </h4>
                                  {(post.acknowledgments?.length || 0) > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {post.acknowledgments?.map((ack, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-100/60">
                                          <span className="text-xs font-bold text-emerald-800">{ack.userName}</span>
                                          <span className="text-[10px] text-emerald-500 font-semibold">{new Date(ack.acknowledgedAt).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 font-semibold italic">لم يؤكد أحد الاطلاع بعد</p>
                                  )}
                                </div>

                                {/* قائمة من شاهدوا دون تأكيد */}
                                <div>
                                  <h4 className="text-xs font-black text-amber-700 mb-2 flex items-center gap-1.5">
                                    <Eye size={13} className="text-amber-500" />
                                    شاهدوا بدون تأكيد ({(post.views?.filter(v => !post.acknowledgments?.some(a => a.userId === v.userId))?.length) || 0})
                                  </h4>
                                  {(() => {
                                    const viewedOnly = post.views?.filter(v => !post.acknowledgments?.some(a => a.userId === v.userId)) || [];
                                    return viewedOnly.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {viewedOnly.map((view, idx) => (
                                          <div key={idx} className="flex items-center justify-between bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-100/60">
                                            <span className="text-xs font-bold text-amber-800">{view.userName}</span>
                                            <span className="text-[10px] text-amber-500 font-semibold">{new Date(view.viewedAt).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 font-semibold italic">لا توجد مشاهدات بدون تأكيد حتى الآن</p>
                                    );
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              // Table View
              <div className="bg-white border text-center border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-indigo-600 text-white font-black text-sm">
                      <th className="p-4 w-12 text-center">تحديد</th>
                      <th className="p-4">العنوان</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">الأهمية</th>
                      <th className="p-4">المرسل</th>
                      <th className="p-4">المحتوى العريض</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.filter(p => p.type === "circular").map((post) => (
                      <tr key={post.id} className="border-b last:border-none border-slate-150 hover:bg-slate-50 transition-colors font-bold text-slate-700 text-xs">
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={bulkSelection.includes(post.id)}
                            onChange={() => handleToggleBulkSelect(post.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </td>
                        <td className="p-4 font-black text-slate-900">{post.title}</td>
                        <td className="p-4">{post.createdAt.split("T")[0]}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            post.importanceLevel === "critical" ? "bg-red-100 text-red-800" :
                            post.importanceLevel === "urgent" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                          }`}>
                            {post.importanceLevel === "critical" ? "حرج جداً" : post.importanceLevel === "urgent" ? "عاجل" : "عادي"}
                          </span>
                        </td>
                        <td className="p-4">{post.authorName}</td>
                        <td className="p-4 max-w-sm truncate">{post.content}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleWhatsAppSharePost(post)}
                              className="p-1 px-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 font-black"
                            >
                              مشاركة
                            </button>
                            <button
                              onClick={handleExportCommunicationExcel}
                              className="p-1 px-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-black"
                            >
                              تصدير
                            </button>
                            <button
                              onClick={() => handleAcknowledgePost(post.id)}
                              disabled={post.acknowledgments?.some(a => a.userId === currentUser?.id)}
                              className={`p-1 px-2 text-xs rounded font-black ${
                                post.acknowledgments?.some(a => a.userId === currentUser?.id)
                                  ? "bg-emerald-100 text-emerald-700 cursor-default"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {post.acknowledgments?.some(a => a.userId === currentUser?.id) ? "✓ تم" : "تم الاطلاع"}
                            </button>
                            <button
                              onClick={() => handleToggleArchive(post.id, "post")}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded"
                            >
                              <Archive size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(post.id, "post")}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POLLS */}
        {activeTab === "polls" && (
          <div>
            {filteredPosts.filter(p => p.type === "poll").length === 0 ? (
              <div className="bg-white border rounded-[2rem] p-12 text-center text-slate-500 font-bold border-dashed shadow-sm">
                <HelpCircle className="mx-auto text-slate-300 mb-2" size={36} />
                لا توجد استطلاعات آراء مطابقة للفلاتر أو المدخلات حالياً.
              </div>
            ) : activeViewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPosts.filter(p => p.type === "poll").map((post) => {
                  const totalVotes = post.options?.reduce((acc, current) => acc + current.votes.length, 0) || 0;
                  return (
                    <motion.div
                      key={post.id}
                      className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative hover:shadow-md transition-all"
                    >
                      {/* Controls */}
                      <div className="absolute top-6 left-6 flex items-center gap-2">
                        <button
                          onClick={() => handleToggleBulkSelect(post.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            bulkSelection.includes(post.id) ? "text-indigo-600" : "text-slate-300 hover:text-slate-500"
                          }`}
                        >
                          <CheckSquare size={18} className={bulkSelection.includes(post.id) ? "fill-indigo-50 text-indigo-600" : ""} />
                        </button>
                        {(!isTeacher || post.authorId === currentUser?.id) && (
                          <button
                            onClick={() => handleDeleteItem(post.id, "post")}
                            className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-full font-black">🗳️ استطلاع رأي</span>
                        {post.isAnonymous && <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-black">تصويت سري</span>}
                        <span 
                          className="bg-indigo-50/50 text-indigo-750 text-[10px] px-3 py-1 rounded-full font-black"
                          title={post.targetUsers && post.targetUsers.length > 0 ? `المستلمون: ${post.targetUsers.join("، ")}` : "موجه للجميع"}
                        >
                          📨 موجه إلى: {post.targetAudience === "all" || !post.targetUsers || post.targetUsers.length === 0 ? "الجميع" : `${post.targetUsers.length} من الموظفين`}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 mb-2">{post.title}</h3>
                      <p className="text-slate-600 font-bold text-sm mb-4 leading-relaxed">{post.content}</p>

                      {/* Vote Options Renderer */}
                      <div className="space-y-3 mb-6">
                        {post.options?.map((opt) => {
                          const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                          const hasVoted = opt.votes.includes(currentUser?.id || "");
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVotePoll(post.id, opt.id)}
                              className={`w-full text-right p-3.5 rounded-2xl border transition-all relative overflow-hidden flex justify-between items-center ${
                                hasVoted 
                                  ? "bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-100" 
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                              }`}
                            >
                              <div
                                className="absolute right-0 top-0 bottom-0 bg-indigo-50 transition-all duration-500"
                                style={{ width: `${percentage}%`, zIndex: 0 }}
                              />
                              <span className="relative z-10 font-bold text-sm text-slate-800 flex items-center gap-2">
                                {hasVoted && <Check size={16} className="text-indigo-600 font-black" />}
                                {opt.text}
                              </span>
                              <span className="relative z-10 font-black text-xs text-slate-600">
                                {opt.votes.length} صوت ({percentage}%)
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 pt-4 flex justify-between text-xs text-slate-400 font-bold">
                        <span>إجمالي الأصوات: {totalVotes} صوت</span>
                        <span>تاريخ النشر: {post.createdAt.split("T")[0]}</span>
                      </div>

                      {/* Explicitly Required Utility actions on all tabs */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleWhatsAppSharePost(post)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-700 font-black text-xs rounded-xl hover:bg-green-100 transition-colors"
                        >
                          <Share2 size={13} />
                          مشاركة كود التصويت بالواتساب
                        </button>

                        <button
                          onClick={handleExportCommunicationExcel}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-700 font-black text-xs rounded-xl hover:bg-blue-100 transition-colors"
                        >
                          <FileSpreadsheet size={13} />
                          تصدير كشف المصوتين إلى Excel
                        </button>

                        {/* زر تم الاطلاع */}
                        <button
                          onClick={() => handleAcknowledgePost(post.id)}
                          disabled={post.acknowledgments?.some(a => a.userId === currentUser?.id)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 font-black text-xs rounded-xl transition-colors ${
                            post.acknowledgments?.some(a => a.userId === currentUser?.id)
                              ? "bg-emerald-100 text-emerald-700 cursor-default"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <Check size={13} />
                          {post.acknowledgments?.some(a => a.userId === currentUser?.id) ? "تم تأكيد الاطلاع ✓" : "تم الاطلاع"}
                        </button>
                      </div>

                      {/* قسم تفاصيل التصويت والاطلاع - يظهر فقط لصاحب الاستطلاع أو من لديه الصلاحية */}
                      {(canViewDetails || post.authorId === currentUser?.id) && (
                        <div className="mt-3">
                          <button
                            onClick={() => togglePostDetails(post.id)}
                            className="w-full flex items-center justify-between py-2.5 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-600 transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <Eye size={14} className="text-indigo-500" />
                              تفاصيل التصويت والاطلاع ({post.views?.length || 0} مشاهدة • {post.acknowledgments?.length || 0} تأكيد)
                            </span>
                            {expandedDetailPosts[post.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          <AnimatePresence>
                            {expandedDetailPosts[post.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                  {/* تفاصيل أصوات كل خيار */}
                                  {!post.isAnonymous && post.options && (
                                    <div>
                                      <h4 className="text-xs font-black text-indigo-700 mb-2 flex items-center gap-1.5">
                                        🗳️ تفاصيل الأصوات لكل خيار
                                      </h4>
                                      <div className="space-y-2">
                                        {post.options.map((opt) => {
                                          const voterNames = opt.votes.map(vid => {
                                            const u = sameSchoolStaff.find(s => s.id === vid);
                                            return u?.name || vid;
                                          });
                                          return (
                                            <div key={opt.id} className="bg-white p-3 rounded-xl border border-slate-100">
                                              <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-black text-slate-800">🔹 {opt.text}</span>
                                                <span className="text-[10px] font-bold text-indigo-600">{opt.votes.length} صوت</span>
                                              </div>
                                              {voterNames.length > 0 ? (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {voterNames.map((name, idx) => (
                                                    <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{name}</span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-[10px] text-slate-400 italic">لا أصوات</p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* قائمة من أكدوا الاطلاع */}
                                  <div>
                                    <h4 className="text-xs font-black text-emerald-700 mb-2 flex items-center gap-1.5">
                                      <Check size={13} className="text-emerald-600" />
                                      أكدوا الاطلاع ({post.acknowledgments?.length || 0})
                                    </h4>
                                    {(post.acknowledgments?.length || 0) > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {post.acknowledgments?.map((ack, idx) => (
                                          <div key={idx} className="flex items-center justify-between bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-100/60">
                                            <span className="text-xs font-bold text-emerald-800">{ack.userName}</span>
                                            <span className="text-[10px] text-emerald-500 font-semibold">{new Date(ack.acknowledgedAt).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 font-semibold italic">لم يؤكد أحد الاطلاع بعد</p>
                                    )}
                                  </div>

                                  {/* قائمة من شاهدوا دون تأكيد */}
                                  <div>
                                    <h4 className="text-xs font-black text-amber-700 mb-2 flex items-center gap-1.5">
                                      <Eye size={13} className="text-amber-500" />
                                      شاهدوا بدون تأكيد ({(post.views?.filter(v => !post.acknowledgments?.some(a => a.userId === v.userId))?.length) || 0})
                                    </h4>
                                    {(() => {
                                      const viewedOnly = post.views?.filter(v => !post.acknowledgments?.some(a => a.userId === v.userId)) || [];
                                      return viewedOnly.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          {viewedOnly.map((view, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-amber-50/60 px-3 py-2 rounded-lg border border-amber-100/60">
                                              <span className="text-xs font-bold text-amber-800">{view.userName}</span>
                                              <span className="text-[10px] text-amber-500 font-semibold">{new Date(view.viewedAt).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 font-semibold italic">لا توجد مشاهدات بدون تأكيد حتى الآن</p>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // Table View
              <div className="bg-white border text-center border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-indigo-600 text-white font-black text-sm">
                      <th className="p-4 w-12 text-center">تحديد</th>
                      <th className="p-4">العنوان والاستطلاع</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">نوع التصويت</th>
                      <th className="p-4">مجموع الأصوات</th>
                      <th className="p-4 text-center">خيارات والنسبة</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.filter(p => p.type === "poll").map((post) => {
                      const totalVotes = post.options?.reduce((acc, cur) => acc + cur.votes.length, 0) || 0;
                      return (
                        <tr key={post.id} className="border-b last:border-none border-slate-150 hover:bg-slate-50 transition-colors font-bold text-slate-700 text-xs">
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={bulkSelection.includes(post.id)}
                              onChange={() => handleToggleBulkSelect(post.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                          </td>
                          <td className="p-4 font-black text-slate-900">{post.title}</td>
                          <td className="p-4">{post.createdAt.split("T")[0]}</td>
                          <td className="p-4">{post.isAnonymous ? "سري" : "علني"}</td>
                          <td className="p-4 text-amber-600 font-black">{totalVotes} أصوات</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 text-[10px]">
                              {post.options?.slice(0, 3).map((opt) => (
                                <div key={opt.id}>
                                  • {opt.text} ({opt.votes.length} صوت)
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleWhatsAppSharePost(post)}
                                className="p-1 px-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 font-black"
                              >
                                مشاركة
                              </button>
                              <button
                                onClick={handleExportCommunicationExcel}
                                className="p-1 px-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-black"
                              >
                                تصدير
                              </button>
                              <button
                                onClick={() => handleAcknowledgePost(post.id)}
                                disabled={post.acknowledgments?.some(a => a.userId === currentUser?.id)}
                                className={`p-1 px-2 text-xs rounded font-black ${
                                  post.acknowledgments?.some(a => a.userId === currentUser?.id)
                                    ? "bg-emerald-100 text-emerald-700 cursor-default"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {post.acknowledgments?.some(a => a.userId === currentUser?.id) ? "✓ تم" : "تم الاطلاع"}
                              </button>
                              <button
                                onClick={() => handleDeleteItem(post.id, "post")}
                                className="p-1 text-slate-400 hover:text-red-500 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HOMEWORK & ASSIGNMENT TRACKING */}
        {activeTab === "homework" && (
          <div>
            {/* Show dynamic date indicator */}
            <div className="bg-indigo-50 text-indigo-800 p-4 rounded-2xl mb-6 shadow-sm font-bold flex flex-wrap justify-between items-center text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar size={18} className="text-indigo-600" />
                اليوم الدراسي النشط: *{getDayName(selectedDate)}* - *{selectedDate}* | الموافق الهجري: *{toHijri(selectedDate)}*
              </span>

              <span className="text-xs font-black bg-indigo-100 py-1 px-3 rounded-full text-indigo-700">
                إجمالي التكاليف المسندة لهذا اليوم في الفلاتر النشطة: {filteredHomeworks.length}
              </span>
            </div>

            {filteredHomeworks.length === 0 ? (
              <div className="bg-white border rounded-[2rem] p-12 text-center text-slate-500 font-bold border-dashed shadow-sm">
                <BookOpen className="mx-auto text-slate-300 mb-2" size={36} />
                لا توجد واجبات أو تكاليف مسندة في هذا اليوم لـ (7 حصص) في هذا الفلتر.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 7 Periods View Grouped By Grade/Section */}
                {Object.entries(
                  filteredHomeworks.reduce((grouped, hw) => {
                    const key = `${hw.targetGrade} - شعبة ${hw.targetSection}`;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(hw);
                    return grouped;
                  }, {} as Record<string, SchoolHomework[]>)
                ).map(([classKey, hwList]) => {
                  const densityLabel = 
                    hwList.length >= 5 ? "🔴 مكثف" :
                    hwList.length >= 3 ? "🟡 متوسط" : "🟢 خفيف ومثالي";

                  // Check if this class is completely represented
                  return (
                    <motion.div
                      key={classKey}
                      className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm"
                    >
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 flex-wrap gap-2">
                        <div>
                          <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                            <Layers className="text-indigo-600" size={20} />
                            تقرير: {classKey}
                          </h3>
                          <p className="text-xs text-slate-400 font-bold mt-1">تاريخ اليوم المدرسي المغطى: {selectedDate}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black py-1 px-3 rounded-full ${
                            hwList.length >= 5 ? "bg-red-50 text-red-700" :
                            hwList.length >= 3 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            مؤشر الكثافة لليوم: {densityLabel} ({hwList.length} تكليفات)
                          </span>

                          <button
                            onClick={() => {
                              const firstHw = hwList[0];
                              handleWhatsAppShareDailyHomework(firstHw.targetGrade, firstHw.targetSection, firstHw.date);
                            }}
                            className="flex items-center gap-1 py-1.5 px-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-black text-xs transition-colors"
                          >
                            <Share2 size={14} />
                            مشاركة التقرير اليومي بالكامل
                          </button>

                          <button
                            onClick={handleExportHomeworkExcel}
                            className="flex items-center gap-1 py-1.5 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-black text-xs transition-colors"
                          >
                            <FileSpreadsheet size={14} />
                            تصدير الكلاس لـ Excel
                          </button>
                        </div>
                      </div>

                      {/* Inside details grid for 1 to 7 classes */}
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                          const periodHw = hwList.find((h) => h.periodNumber === num);
                          return (
                            <div
                              key={num}
                              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                                periodHw 
                                  ? "bg-indigo-50/20 border-indigo-100 ring-1 ring-indigo-50" 
                                  : "bg-slate-50 border-slate-100 border-dashed"
                              }`}
                            >
                              <div>
                                <span className="block text-xs font-black text-indigo-500 mb-2">{periodLabels[num] || `الحصة ${num}`}</span>
                                {periodHw ? (
                                  <>
                                    <h4 className="font-black text-sm text-slate-900 mb-0.5">{periodHw.subjectName}</h4>
                                    <span className="block text-[10px] text-indigo-600 font-bold mb-2">أ. {periodHw.teacherName}</span>
                                    
                                    <div className="text-xs text-slate-700 leading-relaxed font-bold">
                                      <p className="font-extrabold text-indigo-950 mb-1">{periodHw.title}</p>
                                      <p className="line-clamp-3 text-[11px] text-slate-500">{periodHw.description}</p>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400 font-bold italic">⏳ لم يسند واجب بعد</span>
                                )}
                              </div>

                              {periodHw && (
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                  {/* Inner Actions */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleDeleteItem(periodHw.id, "hw")}
                                      className="p-1 hover:text-red-600 rounded text-slate-300 transition-colors"
                                      title="حذف الواجب السريع"
                                    >
                                      <Trash2 size={13} />
                                    </button>

                                    <button
                                      onClick={() => handleEditHomework(periodHw)}
                                      className="p-1 hover:text-indigo-600 rounded text-slate-300 transition-colors"
                                      title="تعديل الواجب"
                                    >
                                      <Pencil size={13} />
                                    </button>

                                    <button
                                      onClick={() => handleToggleArchive(periodHw.id, "hw")}
                                      className="p-1 hover:text-amber-600 rounded text-slate-300 transition-colors"
                                      title={periodHw.isArchived ? "إلغاء أرشفة" : "أرشفة لإخفائه"}
                                    >
                                      <Archive size={13} />
                                    </button>
                                  </div>

                                  <span className="text-[10px] font-black text-slate-400">تاريخ: {periodHw.dueDate}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. MODAL: CREATE CARD DIALOG (DYNAMICAL WRAPPER) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm font-arabic">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden text-right border border-slate-100"
            >
              <div className="px-6 py-5 bg-indigo-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Plus size={24} />
                  {activeTab === "homework" ? (editingHomeworkId ? "تعديل وحفظ تكليف الحصة الدراسية" : "إسناد تكليف وواجب حصة دراسية جديدة") : activeTab === "circulars" ? "تحرير ونشر تعميم إداري هام" : "إنشاء استطلاع وتصويت جماعي بفرع المدرسة"}
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[75vh]">
                {/* INTERACTIVE FORM FOR HOMEWORK */}
                {activeTab === "homework" ? (
                  <form onSubmit={handleCreateHomework} className="space-y-6">
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60 flex items-center gap-2.5 text-xs text-indigo-700 font-bold mb-2">
                      <Info size={16} />
                      تنويه المعلمين والمشرفين: الحقول المؤشرة بالنجمة (*) اختيارية ولكن تحديد (الصف والشعبة والمادة والحصة) إجباري للترشيد والفرز ومتابعة الكثافة
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Grade choose */}
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">الصف الأكاديمي المستهدف *</label>
                        <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-black"
                          value={homeworkGrade}
                          onChange={(e) => setHomeworkGrade(e.target.value)}
                        >
                          <option value="">اختر الصف...</option>
                          {(userSecretariatData.grades.length > 0 && !isGeneralSupervisor && !isSupervisor
                            ? userSecretariatData.grades
                            : availableGrades
                          ).map((g: string) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      {/* Section choose */}
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">الشعبة الدراسية المستهدفة *</label>
                        <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-black"
                          value={homeworkSection}
                          onChange={(e) => setHomeworkSection(e.target.value)}
                        >
                          <option value="">اختر الشعبة...</option>
                          {(userSecretariatData.sections.length > 0 && !isGeneralSupervisor && !isSupervisor
                            ? userSecretariatData.sections
                            : availableSections
                          ).map((s: string) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Name input */}
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">المادة الأكاديمية المقررة *</label>
                        <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-black"
                          value={homeworkSubject}
                          onChange={(e) => setHomeworkSubject(e.target.value)}
                        >
                          <option value="">اختر المادة...</option>
                          {(userSecretariatData.subjects.length > 0 && !isGeneralSupervisor && !isSupervisor
                            ? userSecretariatData.subjects
                            : availableSubjects
                          ).map((sub: string) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>

                      {/* Period Number choosing */}
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">رقم الحصة اليومية المدرج بها التكليف *</label>
                        <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-black"
                          value={homeworkPeriod}
                          onChange={(e) => setHomeworkPeriod(parseInt(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                            const isTaken = homeworks.some(hw => 
                              !hw.isArchived &&
                              hw.id !== editingHomeworkId &&
                              hw.targetGrade === homeworkGrade &&
                              hw.targetSection === homeworkSection &&
                              hw.date === selectedDate &&
                              hw.periodNumber === num
                            );
                            return (
                              <option key={num} value={num} disabled={isTaken}>
                                {periodLabels[num]} {isTaken ? " (غير نشطة - تم إسناد واجب)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {homeworks.filter(hw => 
                      !hw.isArchived &&
                      hw.id !== editingHomeworkId &&
                      hw.targetGrade === homeworkGrade &&
                      hw.targetSection === homeworkSection &&
                      hw.date === selectedDate
                    ).length >= 7 && (
                      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs font-black">
                        ⚠️ تنبيه: تم إسناد واجبات لكافة الحصص السبع في هذا اليوم لهذا الصف والشعبة! لا يمكن إضافة المزيد من الواجبات.
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-700 font-black text-xs mb-2">عنوان التكليف والمقرر *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: كتابة التمارين صفحة 45"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-bold"
                        value={homeworkTitle}
                        onChange={(e) => setHomeworkTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-black text-xs mb-2">تفاصيل الواجب وشرح الخطوات والتوجيهات *</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="اكتب التوجيهات بالتفصيل هنا للطلاب وأولياء الأمور..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-bold"
                        value={homeworkDescription}
                        onChange={(e) => setHomeworkDescription(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Active assignment date */}
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">تاريخ تسجيل الواجب باليوم الدراسي</label>
                        <input
                          type="date"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                      </div>

                      {/* Due date */}
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">تاريخ الاستحقاق لتسليم الكشكول</label>
                        <input
                          type="date"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center"
                          value={homeworkDueDate}
                          onChange={(e) => setHomeworkDueDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
                      >
                        إلغاء التعديل
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors shadow-lg shadow-indigo-100 text-sm"
                      >
                        إسناد التكليف فوراً
                      </button>
                    </div>
                  </form>
                ) : (
                  /* INTERACTIVE FORM FOR CIRCULARS & POLLS */
                  <form onSubmit={handleCreatePost} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">نوع المشاركة</label>
                        <select
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-black"
                          value={postType}
                          onChange={(e) => setPostType(e.target.value as "circular" | "poll")}
                        >
                          <option value="circular">تعميم إداري وقرارات داخلية</option>
                          <option value="poll">استطلاع وتصويت الرأي للموظفين</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-black text-xs mb-2">درجة الأهمية والحرج</label>
                        <select
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-black"
                          value={importance}
                          onChange={(e) => setImportance(e.target.value as "normal" | "urgent" | "critical")}
                        >
                          <option value="normal">عادي</option>
                          <option value="urgent">عاجل جداً</option>
                          <option value="critical">حرج (يتطلب إشعاراً وحيداً)</option>
                        </select>
                      </div>
                    </div>

                    {/* الجهة المرسل إليها وتحديد الموظفين المستهدفين */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                      <div>
                        <label className="block text-slate-800 font-black text-xs mb-2">
                          📨 الجهة المرسل إليها (الجمهور المستهدف حسب الصفة أو الوظيفة)
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {/* زر الجميع */}
                          <button
                            type="button"
                            onClick={() => setSelectedDestinations(["all"])}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                              selectedDestinations.includes("all")
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            الجميع
                          </button>

                          {/* أزرار الوظائف المتاحة */}
                          {availableJobTitles.map((title) => {
                            const isSelected = selectedDestinations.includes(title);
                            return (
                              <button
                                key={title}
                                type="button"
                                onClick={() => {
                                  setSelectedDestinations((prev) => {
                                    if (prev.includes("all")) {
                                      return [title];
                                    }
                                    if (prev.includes(title)) {
                                      const next = prev.filter((t) => t !== title);
                                      return next.length === 0 ? ["all"] : next;
                                    } else {
                                      return [...prev, title];
                                    }
                                  });
                                }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                  isSelected
                                    ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {title}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* قائمة الموظفين المتطابقين */}
                      <div className="pt-2 border-t border-slate-200/60">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-slate-700">
                            👥 الموظفون المستهدفون المتطابقون ({selectedStaffNames.length} من {matchedStaffList.length})
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedStaffNames(matchedStaffList.map((s) => s.name))}
                              className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                            >
                              تحديد الكل
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStaffNames([])}
                              className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors"
                            >
                              إلغاء التحديد
                            </button>
                          </div>
                        </div>

                        {matchedStaffList.length === 0 ? (
                          <div className="text-center py-4 text-xs font-semibold text-slate-400 bg-white rounded-xl border border-dashed">
                            ⚠️ لا يوجد موظفين مسجلين متطابقين مع هذه الوظيفة لشعَب مدرسة وفرع المستخدم الحالي
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar bg-white rounded-xl border border-slate-200">
                            {matchedStaffList.map((staff) => {
                              const isChecked = selectedStaffNames.includes(staff.name);
                              return (
                                <label
                                  key={staff.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border text-right select-none ${
                                    isChecked
                                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 font-bold"
                                      : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedStaffNames((prev) =>
                                        prev.includes(staff.name)
                                          ? prev.filter((n) => n !== staff.name)
                                          : [...prev, staff.name]
                                      );
                                    }}
                                    className="rounded text-indigo-500 focus:ring-indigo-400 w-3.5 h-3.5 ml-1"
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs truncate">
                                      {staff.name}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-semibold truncate leading-none mt-0.5">
                                      {staff.jobTitles.join(" / ") || "موظف"}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-black text-xs mb-2">عنوان الإعلان والتعميم</label>
                      <input
                        type="text"
                        required
                        placeholder="اكتب العنوان الرئيسي الجاذب..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-bold"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-black text-xs mb-2">محتوى بطاقة النشر بالتفصيل</label>
                      <textarea
                        rows={5}
                        required
                        placeholder="اكتب تفاصيل القرار المدرج بالتفصيل الأكاديمي..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-bold"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                      />
                    </div>

                    {/* Conditional Administrative Task deadlines */}
                    {postType === "circular" && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAdministrativeTask}
                            onChange={(e) => setIsAdministrativeTask(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-1"
                          />
                          <span className="text-xs font-black text-slate-700">تحويل هذا التعميم إلى مهمة إدارية بجدول زمني لإنفاقها</span>
                        </label>

                        {isAdministrativeTask && (
                          <div>
                            <label className="block text-slate-700 font-black text-xs mb-2">تاريخ أقصى مهلة لتسليم المهمة</label>
                            <input
                              type="date"
                              required
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center"
                              value={taskDeadline}
                              onChange={(e) => setTaskDeadline(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conditional Options array for Polls */}
                    {postType === "poll" && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                        <h4 className="text-xs font-black text-slate-900 mb-2">خيارات الاستفتاء والتصويت المتاحة:</h4>
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              placeholder={`الخيار ${idx + 1}`}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                              value={opt}
                              onChange={(e) => {
                                const copy = [...pollOptions];
                                copy[idx] = e.target.value;
                                setPollOptions(copy);
                              }}
                            />
                            {pollOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg"
                              >
                                <X size={20} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, ""])}
                          className="text-indigo-600 font-black text-xs hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} />
                          إضافة خيار بديل إضافي
                        </button>

                        <div className="pt-2 border-t border-slate-100/60 grid grid-cols-2 gap-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={allowMultipleChoice}
                              onChange={(e) => setAllowMultipleChoice(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-1"
                            />
                            <span className="text-xs font-black text-slate-700">السماح باختيارات متعددة</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAnonymous}
                              onChange={(e) => setIsAnonymous(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 ml-1"
                            />
                            <span className="text-xs font-black text-slate-700">جعل هوية المصوتين سرية بالكامل</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-700 font-black text-xs mb-2">رابط خارجي مرافق (اختياري)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/document"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
                      >
                        إلغاء التعديل
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors shadow-lg shadow-indigo-100 text-sm"
                      >
                        نشر وتعميم فوراً
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. WHATSAPP MODAL FOR POSTING VISUAL TEMPLATES */}
      <AnimatePresence>
        {whatsappModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm font-arabic">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden text-right border border-slate-100 text-slate-850"
            >
              <div className="px-6 py-5 bg-green-600 text-white flex justify-between items-center animate-pulse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Share2 size={24} />
                  محرك المشاركة والتصميم الصوري للواتساب
                </h3>
                <button
                  onClick={() => setWhatsappModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-slate-700 font-black text-xs mb-2">رقم هاتف ولي الأمر أو المعلم المستلم (اختياري)</label>
                  <input
                    type="tel"
                    placeholder="مثال: 967770000000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center"
                    value={whatsappRecipientPhone}
                    onChange={(e) => setWhatsappRecipientPhone(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 font-bold block mt-1">تنبيه: أدخل الرقم بمفتاح الدولة الكلي وبدون علامة (+)</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-black text-xs mb-2">معاينة النص المرئي للرسالة المجهزة بالتنسيق الفاخر:</label>
                  <textarea
                    rows={10}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold leading-relaxed whitespace-pre-wrap select-all focus:outline-none"
                    value={whatsappMessageContent}
                    onChange={(e) => setWhatsappMessageContent(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappMessageContent);
                      toast.success("تم نسخ النص البرمجي للرسالة بنجاح");
                    }}
                    className="px-4 py-2 border shadow-sm rounded-xl font-bold hover:bg-slate-50"
                  >
                    نسخ النص فقط
                  </button>
                  <button
                    onClick={launchWhatsApp}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-green-100"
                  >
                    <Send size={16} />
                    فتح وإرسال بالواتساب
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper: Translate Date string to Day name Arabic
function getDayName(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("ar-YE", { weekday: "long" }).format(d);
  } catch (e) {
    return "يوم غير معروف";
  }
}
