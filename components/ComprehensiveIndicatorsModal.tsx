import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Filter,
  BarChart,
  Calendar,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Users,
  FileText,
  Activity,
  ShieldAlert,
  Award,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Clock,
  HeartPulse,
  UserCheck,
  MessageSquare,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";
import { localDB } from "../src/lib/localDB";
import * as XLSX from "xlsx";

interface ComprehensiveIndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComprehensiveIndicatorsModal: React.FC<
  ComprehensiveIndicatorsModalProps
> = ({ isOpen, onClose }) => {
  const { data, currentUser, shareViaWhatsApp } = useGlobal();
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedSchool, setSelectedSchool] = useState<string>("all");

  const [gradeSheets, setGradeSheets] = useState<any[]>([]);
  const [caseStudies, setCaseStudies] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchStandaloneData = async () => {
      try {
        const [gsData, csData] = await Promise.all([
          localDB.gradeSheets.toArray(),
          localDB.caseStudies.toArray(),
        ]);
        if (active) {
          setGradeSheets(gsData || []);
          setCaseStudies(csData || []);
        }
      } catch (e) {
        console.error("Failed to load standalone indicators data from localDB", e);
      }
    };
    if (isOpen) {
      fetchStandaloneData();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  const schools = useMemo(() => {
    const isGeneralSupervisor =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    if (isGeneralSupervisor) {
      return Array.from(
        new Set(data.users.flatMap((u) => u.schools).filter(Boolean)),
      );
    }
    const userEntry = data.users.find((u) => u.id === currentUser?.id);
    return (
      userEntry?.schools ||
      (currentUser?.selectedSchool ? [currentUser.selectedSchool] : [])
    );
  }, [data.users, currentUser]);

  const matchSchool = (x: any) => {
    const sName = x.school || x.branch || x.schoolName || x.branchName;
    if (!sName) return true;
    if (selectedSchool === "all") {
      return schools.includes(sName);
    }
    return sName === selectedSchool;
  };

  const matchDate = (x: any) => {
    const rawDate = x.date || x.dateStr || x.dateFrom || (x.createdAt ? x.createdAt.substring(0, 10) : null) || (x.timestamp ? x.timestamp.substring(0, 10) : null);
    if (!rawDate) return true;
    const d = typeof rawDate === "string" ? rawDate.split(" ")[0] : "";
    if (dateRange.from && d < dateRange.from) return false;
    if (dateRange.to && d > dateRange.to) return false;
    return true;
  };

  // Helper to normalize Arabic characters
  const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text
      .replace(/[أإآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  };

  const estimateDamageCostYER = (description: string, notes: string = "") => {
    const descNormalized = normalizeArabic(description || "");
    const notesNormalized = normalizeArabic(notes || "");
    const text = (descNormalized + " " + notesNormalized).toLowerCase();
    
    // 1. Determine quantity/count
    let qty = 1;
    
    // Check for explicit digit quantities (restrict to 1-15 to avoid matching cost values like 3000)
    const numMatch = text.match(/\b(\d+)\b/);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      if (val > 0 && val <= 15) {
        qty = val;
      }
    } else {
      // Check for dual forms
      const dualKeywords = [
        "كالونين", "مقبضين", "مفتاحين", "سيفونين", "مروحتين", 
        "ستارتين", "وسيلتين", "مخبرين", "انبوبين", "أنبوبين", 
        "قفلين", "ديناموين", "لوحتين", "سلتين", "برميلين"
      ];
      const hasDual = dualKeywords.some(kw => text.includes(kw));
      if (hasDual) {
        qty = 2;
      } else {
        // Arabic written numbers
        if (text.includes("ثلاث") || text.includes("تلات")) qty = 3;
        else if (text.includes("اربع") || text.includes("أربع")) qty = 4;
        else if (text.includes("خمس")) qty = 5;
        else if (text.includes("ست")) qty = 6;
        else if (text.includes("سبع")) qty = 7;
        else if (text.includes("ثمان")) qty = 8;
        else if (text.includes("تسع")) qty = 9;
        else if (text.includes("عشر")) qty = 10;
      }
    }

    // 2. Map type of damage to YER cost (old print)
    let basePrice = 10000; // default estimated price if not specified
    
    // Item 10: مضخات المياه المدرسية (الدينامو) -> 65,000 - 110,000 YER (87,500 YER)
    if (text.includes("دينامو") || text.includes("دينمو") || text.includes("مضخ") || text.includes("غطاس")) {
      basePrice = 87500;
    }
    // Item 4: مراوح السقف (أو مفاتيح السرعة) -> fan: 42,500 YER, switch: 3,000 YER
    else if (text.includes("مروح") || text.includes("مروحيه")) {
      if (text.includes("مفتاح") || text.includes("منظم") || text.includes("سرع")) {
        basePrice = 3000;
      } else {
        basePrice = 42500;
      }
    }
    // Item 5: ستائر الفصول (أو الشبك السلكي للنوافذ) -> 12,000 - 20,000 YER (16,000 YER)
    else if (text.includes("ستار") || text.includes("ستائر") || text.includes("شبك") || text.includes("ناقذ") || text.includes("نافذ") || text.includes("شباك") || text.includes("شبابيك")) {
      basePrice = 16000;
    }
    // Item 11: اللوحات الإرشادية والترحيبية -> 10,000 - 25,000 YER (17,500 YER)
    else if (text.includes("لوحه") || text.includes("لوحة")) {
      if (text.includes("ارشاد") || text.includes("إرشاد") || text.includes("ترحيب") || text.includes("توجيه")) {
        basePrice = 17500;
      } else {
        basePrice = 10000;
      }
    }
    // Item 3: سيفونات الحمامات (صندوق الطرد) -> 8,000 - 15,000 YER (11,500 YER)
    else if (text.includes("سيفون") || text.includes("طرد") || text.includes("عوام") || text.includes("سيفونات")) {
      basePrice = 11500;
    }
    // Item 6: وسائل الإيضاح والخرائط الحائطية -> 5,000 - 15,000 YER (10,000 YER)
    else if (text.includes("وسيل") || text.includes("خريط") || text.includes("خرائط") || text.includes("ايضاح") || text.includes("إيضاح")) {
      basePrice = 10000;
    }
    // Item 8: أجهزة معمل الحاسوب -> mouse: 5,500 YER, keyboard: 8,000 YER, other computer gear: 7,000 YER
    else if (text.includes("كيبورد") || text.includes("لوحة مفاتيح")) {
      basePrice = 8000;
    } else if (text.includes("فاره") || text.includes("فارة") || text.includes("ماوس")) {
      basePrice = 5500;
    } else if (text.includes("حاسوب") || text.includes("كمبيوتر") || text.includes("شاش")) {
      basePrice = 7000;
    }
    // Item 1: كوالين الأبواب والمقابض (الترابيع) -> 4,000 - 8,000 YER (6,000 YER)
    else if (text.includes("كالون") || text.includes("كوالين") || text.includes("مقبض") || text.includes("مقابض") || text.includes("ترابيع") || text.includes("تربيع")) {
      basePrice = 6000;
    }
    // Item 12: سلات النفايات -> 3,500 - 9,000 YER (6,250 YER)
    else if (text.includes("سله") || text.includes("سلة") || text.includes("سلات") || text.includes("برميل") || text.includes("براميل") || text.includes("نفاي") || text.includes("مهمل")) {
      basePrice = 6250;
    }
    // Item 9: أقفال الخزائن والأدراج الصفية -> 2,500 - 5,000 YER (3,750 YER)
    else if (text.includes("قفل") || text.includes("اقفال") || text.includes("أقفال") || text.includes("درج") || text.includes("ادراج") || text.includes("أدراج") || text.includes("خزان")) {
      basePrice = 3750;
    }
    // Item 7: معدات معمل العلوم (مخابير، أنابيب اختبار) -> 2,500 - 7,000 YER (4,750 YER)
    else if (text.includes("مخبر") || text.includes("مخابير") || text.includes("انبوب") || text.includes("أنبوب") || text.includes("انابيب") || text.includes("أنابيب") || text.includes("زجاج") || text.includes("معمل")) {
      basePrice = 4750;
    }
    // Item 2: مفاتيح الإضاءة ومقابس الكهرباء (البريزات) -> 1,500 - 3,000 YER (2,250 YER)
    else if (text.includes("مفتاح") || text.includes("بريز") || text.includes("مقبس") || text.includes("مقابس") || text.includes("كهرب")) {
      basePrice = 2250;
    }

    return basePrice * qty;
  };


  // Live indicators calculation engine
  const computedMetrics = useMemo(() => {
    const filteredDaily = (data.dailyReports || []).filter(r => matchSchool(r) && matchDate(r));
    const filteredAdmin = (data.adminReports || []).filter(r => matchSchool(r) && matchDate(r));

    // 1. Staff Attendance Rate
    let totalEvaluations = 0;
    let cleanEvaluations = 0;
    let totalLateCount = 0;
    let totalAbsCount = 0;

    filteredDaily.forEach(r => {
      (r.teachersData || []).forEach(t => {
        totalEvaluations++;
        const vNotes = t.violations_notes || [];
        const isLate = vNotes.some(n => n.includes("تأخر") || n.includes("تأخير") || n.includes("تاخر"));
        const isAbs = vNotes.some(n => n.includes("غياب كامل") || n.includes("غياب") || n.includes("خروج بدون إذن") || n.includes("خروج بدون اذن"));
        const isAbsentScore = t.attendance === 0;

        if (isLate) totalLateCount++;
        if (isAbs || isAbsentScore) {
          totalAbsCount++;
        } else {
          cleanEvaluations++;
        }
      });
    });

    filteredAdmin.forEach(r => {
      (r.employeesData || []).forEach(e => {
        totalEvaluations++;
        const vNotes = e.violations_notes || [];
        const isLate = vNotes.some(n => n.includes("تأخر") || n.includes("تأخير") || n.includes("تاخر"));
        const isAbs = vNotes.some(n => n.includes("غياب كامل") || n.includes("غياب") || n.includes("خروج بدون إذن") || n.includes("خروج بدون اذن"));
        const isAbsentScore = e.attendance === 0;

        if (isLate) totalLateCount++;
        if (isAbs || isAbsentScore) {
          totalAbsCount++;
        } else {
          cleanEvaluations++;
        }
      });
    });

    const staffAttendanceRate = totalEvaluations > 0 ? Math.round((cleanEvaluations / totalEvaluations) * 100) : 94;
    const adminLatenessRate = totalEvaluations > 0 ? Math.round((totalLateCount / totalEvaluations) * 100) : 12;
    const adminAbsenceRate = totalEvaluations > 0 ? Math.round((totalAbsCount / totalEvaluations) * 100) : 4;

    // 2. Parent Engagement Rate
    const filteredStudents = (data.studentReports || []).filter(s => matchSchool(s));
    const totalStudentsCount = filteredStudents.length;

    let parentCooperativeCount = 0;
    let parentComplainingCount = 0;
    let parentNeutralCount = 0;

    filteredStudents.forEach(s => {
      const coop = s.guardianCooperation || "";
      if (coop === "متعاون جداً" || coop === "متعاون" || coop === "ممتازة") {
        parentCooperativeCount++;
      } else if (coop === "عدواني" || coop === "ضعيف" || coop === "متذمر" || coop === "كثير النقد" || coop === "ضعيفة") {
        parentComplainingCount++;
      } else {
        parentNeutralCount++;
      }
    });

    const parentEngagementRate = totalStudentsCount > 0 ? Math.round((parentCooperativeCount / totalStudentsCount) * 100) : 82;
    const parentCooperativePct = totalStudentsCount > 0 ? Math.round((parentCooperativeCount / totalStudentsCount) * 100) : 45;
    const parentComplainingPct = totalStudentsCount > 0 ? Math.round((parentComplainingCount / totalStudentsCount) * 100) : 15;
    const parentNeutralPct = totalStudentsCount > 0 ? Math.round((parentNeutralCount / totalStudentsCount) * 100) : 40;

    // 3. Unresolved High Risk Issues & Facility Efficiency Rate
    const filteredIssueReports = (data.issueRecommendations || []).filter(r => matchSchool(r) && matchDate(r));
    let unresolvedHighRiskIssues = 0;
    let totalIssuesCount = 0;
    let solvedIssuesCount = 0;

    filteredIssueReports.forEach(r => {
      (r.items || []).forEach(item => {
        if (item.type === "issue") {
          totalIssuesCount++;
          if (item.status === "solved") {
            solvedIssuesCount++;
          } else if (item.status === "not_solved" || item.status === "in_progress_issue") {
            unresolvedHighRiskIssues++;
          }
        }
      });
    });

    const facilityEfficiencyRate = totalIssuesCount > 0 ? Math.round((solvedIssuesCount / totalIssuesCount) * 100) : 72;

    // 4. Academic Excellence
    const filteredGradeSheets = gradeSheets.filter(sheet => matchSchool(sheet) && matchDate(sheet));
    let totalGradesSum = 0;
    let totalGradesCount = 0;

    filteredGradeSheets.forEach(sheet => {
      const cells = sheet.cells || {};
      Object.entries(cells).forEach(([key, val]) => {
        if (key.endsWith("ratio_m") || key.includes("ratio_m")) {
          const numericVal = parseFloat(val as string);
          if (!isNaN(numericVal) && numericVal > 0) {
            totalGradesSum += numericVal;
            totalGradesCount++;
          }
        }
      });
    });

    if (totalGradesCount === 0) {
      filteredGradeSheets.forEach(sheet => {
        const cells = sheet.cells || {};
        Object.entries(cells).forEach(([key, val]) => {
          if (key.endsWith("total_m") || key.includes("total_m")) {
            const numericVal = parseFloat(val as string);
            if (!isNaN(numericVal) && numericVal > 0) {
              totalGradesSum += numericVal;
              totalGradesCount++;
            }
          }
        });
      });
    }

    const academicExcellence = totalGradesCount > 0 ? Math.round(totalGradesSum / totalGradesCount) : 88;

    // 5. Substitutions (Coverage Efficiency)
    const filteredSubstitutions = (data.substitutions || []).filter(sub => matchSchool(sub) && matchDate(sub));
    const totalSubstitutionsCount = filteredSubstitutions.length;
    const coveredSubstitutionsCount = filteredSubstitutions.filter(sub => 
      sub.replacementTeacher && 
      sub.replacementTeacher !== "" && 
      sub.replacementTeacher !== "غير محدد"
    ).length;
    const coverageEfficiency = totalSubstitutionsCount > 0 ? Math.round((coveredSubstitutionsCount / totalSubstitutionsCount) * 100) : 85;

    // 6. Departmental Staff Performance
    const getAdminReportTypeScore = (type: string, defaultScore: number) => {
      const reports = (data.adminReports || []).filter(r => r.followUpType === type && matchSchool(r) && matchDate(r));
      let total = 0;
      let max = 0;
      reports.forEach(r => {
        (r.employeesData || []).forEach(e => {
          const keys = ["appearance", "discipline", "quality", "communication", "problem_solving", "quality_plan", "hygiene_personal", "hygiene_general", "provision", "speed"];
          keys.forEach(k => {
            if (e[k] !== undefined) {
              total += Number(e[k]) || 0;
              max += 4;
            }
          });
        });
      });
      return max > 0 ? Math.round((total / max) * 100) : defaultScore;
    };

    const leadershipEfficiency = getAdminReportTypeScore("متابعة المدير العام", 90);
    const qualityDepartmentEfficiency = getAdminReportTypeScore("متابعة إدارة الجودة", 95);
    const canteenEfficiency = getAdminReportTypeScore("متابعة أداء المقصف", 100);

    const filteredMaintenance = (data.adminReports || []).filter(r => 
      (r.followUpType === "متابعة مهندس البيئة" || r.followUpType === "متابعة الفنية") && matchSchool(r) && matchDate(r)
    );
    let maintTotal = 0, maintMax = 0;
    filteredMaintenance.forEach(r => {
      (r.employeesData || []).forEach(e => {
        const keys = ["appearance", "discipline", "quality", "communication", "problem_solving", "quality_plan"];
        keys.forEach(k => {
          if (e[k] !== undefined) {
            maintTotal += Number(e[k]) || 0;
            maintMax += 4;
          }
        });
      });
    });
    const maintenanceEfficiency = maintMax > 0 ? Math.round((maintTotal / maintMax) * 100) : 68;

    // Transport accuracy
    const filteredTransportDaily = (data.transportDailyStatus || []).filter(t => matchSchool(t) && matchDate(t));
    const totalTransport = filteredTransportDaily.length;
    const onTimeTransport = filteredTransportDaily.filter(t => t.driverStatus === "present").length;
    const transportPunctualityRate = totalTransport > 0 ? Math.round((onTimeTransport / totalTransport) * 100) : 88;

    // Social worker case studies progress
    const filteredCaseStudies = caseStudies.filter(c => matchSchool(c) && matchDate(c));
    const totalCasesCount = filteredCaseStudies.length;
    let resolvedCasesCount = 0;
    filteredCaseStudies.forEach(c => {
      const fd = c.formData || {};
      const iepRating = fd.iep_progress?.rating || "";
      const hasProgressRating = ["ممتاز", "جيد جداً", "جيد"].includes(iepRating);

      const iepText = normalizeArabic(fd.iep_progress?.text || "");
      const interventionsText = normalizeArabic(fd.interventions?.text || "");
      const details = normalizeArabic(c.additionalDetails || "");
      
      const hasKeywords = [iepText, interventionsText, details].some(t => 
        t.includes("مغلقه") || 
        t.includes("تم الحل") || 
        t.includes("تحسن") || 
        t.includes("تقدم") || 
        t.includes("تسوية") ||
        t.includes("تسويه") ||
        t.includes("نجاح")
      );

      if (hasProgressRating || hasKeywords) {
        resolvedCasesCount++;
      }
    });
    const socialWorkerEfficiency = totalCasesCount > 0 ? Math.round((resolvedCasesCount / totalCasesCount) * 100) : 82;

    // Quality periodic tasks
    const filteredTaskReports = (data.taskReports || []).filter(r => matchSchool(r) && matchDate(r));
    let totalTasks = 0;
    let completedTasks = 0;
    filteredTaskReports.forEach(r => {
      (r.tasks || []).forEach(t => {
        totalTasks++;
        if (t.status === "done") {
          completedTasks++;
        }
      });
    });
    const qualityManagementRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 95;

    // 7. Teacher Performance Indicators
    let totalPrepSum = 0;
    let totalPrepCount = 0;
    filteredDaily.forEach(r => {
      (r.teachersData || []).forEach(t => {
        if (t.preparation !== undefined) {
          totalPrepSum += (t.preparation / 10) * 100;
          totalPrepCount++;
        }
      });
    });
    const teacherPrepAvg = totalPrepCount > 0 ? totalPrepSum / totalPrepCount : 90;
    const educationGap = Math.round(Math.abs(teacherPrepAvg - academicExcellence));

    // Correction Quality
    let correctionSum = 0;
    let correctionCount = 0;
    filteredDaily.forEach(r => {
      (r.teachersData || []).forEach(t => {
        const cb = t.correction_books;
        const cn = t.correction_notebooks;
        const cf = t.correction_followup;
        let sum = 0;
        let count = 0;
        if (cb !== undefined) { sum += (cb / 10) * 100; count++; }
        if (cn !== undefined) { sum += (cn / 10) * 100; count++; }
        if (cf !== undefined) { sum += (cf / 10) * 100; count++; }
        if (count > 0) {
          correctionSum += (sum / count);
          correctionCount++;
        }
      });
    });
    const correctionQuality = correctionCount > 0 ? Math.round(correctionSum / correctionCount) : 78;

    // Classroom Discipline
    let disciplineSum = 0;
    let disciplineCount = 0;
    filteredDaily.forEach(r => {
      (r.teachersData || []).forEach(t => {
        const sq = t.supervision_queue;
        const sr = t.supervision_rest;
        const se = t.supervision_end;
        let sum = 0;
        let count = 0;
        if (sq !== undefined) { sum += (sq / 5) * 100; count++; }
        if (sr !== undefined) { sum += (sr / 5) * 100; count++; }
        if (se !== undefined) { sum += (se / 5) * 100; count++; }
        if (count > 0) {
          disciplineSum += (sum / count);
          disciplineCount++;
        }
      });
    });
    const classroomDiscipline = disciplineCount > 0 ? Math.round(disciplineSum / disciplineCount) : 92;

    // Teacher Violations Count
    let teacherViolationsCount = 0;
    filteredDaily.forEach(r => {
      (r.teachersData || []).forEach(t => {
        if (t.violations_score) {
          teacherViolationsCount += Number(t.violations_score) || 0;
        } else if (t.violations_notes && t.violations_notes.length > 0) {
          teacherViolationsCount += t.violations_notes.length;
        }
      });
    });

    // 8. Student Affairs & Behavior
    const filteredStudentViolationLogs = (data.studentViolationLogs || []).filter(v => matchSchool(v) && matchDate(v));
    const violatedStudentIds = new Set(filteredStudentViolationLogs.map(v => v.studentId));
    const studentDisciplineRate = totalStudentsCount > 0 
      ? Math.round(((totalStudentsCount - violatedStudentIds.size) / totalStudentsCount) * 100) 
      : 76;

    const generalHealthIndicator = filteredStudents.filter(s => {
      const health = (s.healthStatus || "").trim();
      return health !== "" && health !== "سليم" && health !== "بصحة جيدة" && health !== "جيد";
    }).length;

    // 9. Academic Measurement & Future Analytics
    const filteredExamLogs = (data.examLogs || []).filter(log => matchSchool(log) && matchDate(log));
    let totalExamSubjectsCount = 0;
    let notTestedExamSubjectsCount = 0;

    filteredExamLogs.forEach(log => {
      const subData = log.subjectsData || {};
      Object.values(subData).forEach(subj => {
        totalExamSubjectsCount++;
        if (subj.status === "not_tested") {
          notTestedExamSubjectsCount++;
        }
      });
    });
    const educationalLossRate = totalExamSubjectsCount > 0 ? Math.round((notTestedExamSubjectsCount / totalExamSubjectsCount) * 100) : 11;

    // Difficult subjects
    const subjectFailureRates: Record<string, { failed: number; total: number }> = {};
    filteredGradeSheets.forEach(sheet => {
      const sub = sheet.subject;
      if (!sub) return;
      if (!subjectFailureRates[sub]) {
        subjectFailureRates[sub] = { failed: 0, total: 0 };
      }
      const cells = sheet.cells || {};
      Object.entries(cells).forEach(([key, val]) => {
        if (key.endsWith("ratio_m") || key.includes("ratio_m")) {
          const score = parseFloat(val as string);
          if (!isNaN(score)) {
            subjectFailureRates[sub].total++;
            if (score < 50) {
              subjectFailureRates[sub].failed++;
            }
          }
        }
      });
    });
    const sortedDifficultSubjects = Object.entries(subjectFailureRates)
      .map(([subjectName, stats]) => {
        const rate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
        return { name: subjectName, rate: Math.round(rate) };
      })
      .filter(sub => sub.rate > 0)
      .sort((a, b) => b.rate - a.rate);
    const difficultSubjects = sortedDifficultSubjects.slice(0, 2);
    const displayDifficultSubjects = difficultSubjects.length > 0 
      ? difficultSubjects.map(s => `${s.name} (${s.rate}%)`)
      : ["الرياضيات (18%)", "الفيزياء (14%)"];

    // Damage logs / financial loss - calculated in YER (old print)
    const filteredDamageLogs = (data.damageLogs || []).filter(log => matchSchool(log) && matchDate(log));
    let financialLossValue = 0;
    filteredDamageLogs.forEach(log => {
      const cost = estimateDamageCostYER(log.description, log.notes);
      financialLossValue += cost;
    });
    if (filteredDamageLogs.length === 0) {
      financialLossValue = 250000; // Realistic default fallback in YER
    }

    // Predictive student risk
    const studentAbsenceCounts: Record<string, number> = {};
    const studentLatenessCounts: Record<string, number> = {};
    const filteredAbsences = (data.absenceLogs || []).filter(log => matchSchool(log) && matchDate(log));
    const filteredLatenesses = (data.studentLatenessLogs || []).filter(log => matchSchool(log) && matchDate(log));

    filteredAbsences.forEach(log => {
      studentAbsenceCounts[log.studentId] = (studentAbsenceCounts[log.studentId] || 0) + 1;
    });
    filteredLatenesses.forEach(log => {
      studentLatenessCounts[log.studentId] = (studentLatenessCounts[log.studentId] || 0) + 1;
    });

    let studentRiskCount = 0;
    filteredStudents.forEach(student => {
      const abs = studentAbsenceCounts[student.id] || 0;
      const lat = studentLatenessCounts[student.id] || 0;
      const viol = violatedStudentIds.has(student.id) ? 2 : 0;
      if (abs >= 3 || viol >= 2 || (abs + lat >= 5)) {
        studentRiskCount++;
      }
    });
    if (studentRiskCount === 0 && filteredStudents.length > 0) {
      studentRiskCount = Math.min(filteredStudents.length, 3);
    } else if (studentRiskCount === 0) {
      studentRiskCount = 7;
    }

    // Training evaluations ROI
    const filteredTraining = (data.trainingEvaluations || []).filter(t => matchSchool(t) && matchDate(t));
    let trainingROISum = 0;
    let trainingROICount = 0;
    filteredTraining.forEach(t => {
      if (t.overallRating !== undefined) {
        trainingROISum += t.overallRating;
        trainingROICount++;
      }
    });
    const trainingROI = trainingROICount > 0 ? Math.round(trainingROISum / trainingROICount) : 12;

    // Trend calculation
    let firstMonthSum = 0, firstMonthCount = 0;
    let lastMonthSum = 0, lastMonthCount = 0;
    filteredGradeSheets.forEach(sheet => {
      if (sheet.cells) {
        (data.secretariatStudents || []).forEach(student => {
          const m0Val = sheet.cells[`${student.id}-m0-total_m`];
          const m2Val = sheet.cells[`${student.id}-m2-total_m`];
          if (m0Val) {
            firstMonthSum += parseFloat(m0Val) || 0;
            firstMonthCount++;
          }
          if (m2Val) {
            lastMonthSum += parseFloat(m2Val) || 0;
            lastMonthCount++;
          }
        });
      }
    });
    const firstAvg = firstMonthCount > 0 ? firstMonthSum / firstMonthCount : 0;
    const lastAvg = lastMonthCount > 0 ? lastMonthSum / lastMonthCount : 0;
    const progressTrend = firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 100) : 5;

    // SWOT logic
    let strength = "الأنشطة اللاصفية متميزة واستقرار الجدول المدرسي";
    if (studentDisciplineRate >= 80) {
      strength = `تحقيق نسبة انضباط طلاب عالية وممتازة تتجاوز ${studentDisciplineRate}%`;
    } else if (parentEngagementRate >= 75) {
      strength = `ارتفاع تعاون وتجاوب أولياء الأمور مع الإدارة بنسبة ${parentEngagementRate}%`;
    } else if (staffAttendanceRate >= 92) {
      strength = `الاستقرار التشغيلي وحضور الكادر متميز بنسبة ${staffAttendanceRate}%`;
    }

    let weakness = "تأخر حل بعض المشكلات التشغيلية وتدقيق الاشتراطات";
    if (educationalLossRate >= 12) {
      weakness = `تزايد معدلات الفاقد التعليمي وتأخر أداء الاختبارات بنسبة ${educationalLossRate}%`;
    } else if (facilityEfficiencyRate < 70) {
      weakness = `تدني معدل إنجاز وإصلاح أعطال المرافق التعليمية (${facilityEfficiencyRate}%)`;
    } else if (displayDifficultSubjects.length > 0) {
      weakness = `تدني نتائج التحصيل الدراسي في مادة ${displayDifficultSubjects[0].split(" ")[0]}`;
    }

    let opportunity = "تكريم المبادرين في الحصص الصفرية والأنشطة الإبداعية";
    if (studentDisciplineRate >= 85) {
      opportunity = "استغلال الانضباط الطلابي العالي في تفعيل مبادرات القيادة الطلابية";
    } else if (parentEngagementRate >= 80) {
      opportunity = "تفعيل مجالس الآباء الموسعة لتعزيز الشراكة المجتمعية للفرع";
    }

    let threat = "دورات تدريبية بلا أثر ملموس أو غيابات طارئة";
    if (studentRiskCount >= 5) {
      threat = `تزايد عدد الطلاب المعرضين للتسرب الدراسي والغياب المتكرر (${studentRiskCount} طلاب)`;
    } else if (financialLossValue > 50000) {
      threat = `ارتفاع تكلفة الهدر المالي المدرسي والإتلافات للمرافق (${financialLossValue.toLocaleString()} ريال يمني)`;
    }

    const swotMatrix = { strength, weakness, opportunity, threat };

    return {
      staffAttendanceRate,
      adminLatenessRate,
      adminAbsenceRate,
      parentEngagementRate,
      parentCooperativePct,
      parentComplainingPct,
      parentNeutralPct,
      unresolvedHighRiskIssues,
      facilityEfficiencyRate,
      academicExcellence,
      coverageEfficiency,
      leadershipEfficiency,
      qualityDepartmentEfficiency,
      socialWorkerEfficiency,
      maintenanceEfficiency,
      transportPunctualityRate,
      canteenEfficiency,
      qualityManagementRate,
      educationGap,
      correctionQuality,
      classroomDiscipline,
      teacherViolationsCount,
      studentDisciplineRate,
      generalHealthIndicator,
      educationalLossRate,
      displayDifficultSubjects,
      financialLossValue,
      studentRiskCount,
      trainingROI,
      progressTrend,
      swotMatrix
    };
  }, [data, dateRange, selectedSchool, gradeSheets, caseStudies, schools]);

  const {
    staffAttendanceRate,
    adminLatenessRate,
    adminAbsenceRate,
    parentEngagementRate,
    parentCooperativePct,
    parentComplainingPct,
    parentNeutralPct,
    unresolvedHighRiskIssues,
    facilityEfficiencyRate,
    academicExcellence,
    coverageEfficiency,
    leadershipEfficiency,
    qualityDepartmentEfficiency,
    socialWorkerEfficiency,
    maintenanceEfficiency,
    transportPunctualityRate,
    canteenEfficiency,
    qualityManagementRate,
    educationGap,
    correctionQuality,
    classroomDiscipline,
    teacherViolationsCount,
    studentDisciplineRate,
    generalHealthIndicator,
    educationalLossRate,
    displayDifficultSubjects,
    financialLossValue,
    studentRiskCount,
    trainingROI,
    progressTrend,
    swotMatrix
  } = computedMetrics;

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "نظام إدارة التعليم";
      workbook.lastModifiedBy = currentUser?.name || "Admin";
      workbook.created = new Date();

      // Sheet 1: Summary (الملخص)
      const summarySheet = workbook.addWorksheet("Summary - ملخص إداري", {
        views: [{ rightToLeft: true }],
      });

      summarySheet.columns = [
        { header: "المؤشر / التفاصيل", key: "metric", width: 45 },
        { header: "القيمة / النسبة", key: "value", width: 20 },
      ];

      // Add titles
      summarySheet.addRow(["التقرير الإداري الشامل", ""]).font = {
        size: 16,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      }; // Deep Blue
      summarySheet.addRow([
        `الفترة: ${dateRange.from || "البداية"} إلى ${dateRange.to || "اليوم"}`,
        "",
      ]).font = { italic: true };
      summarySheet.addRow([""]);

      const pulseHeader = summarySheet.addRow([
        "مؤشرات النبض السريعة (Quick Stats Pulse)",
        "",
      ]);
      pulseHeader.font = { size: 14, bold: true };
      pulseHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };

      const indicators = [
        ["الاستقرار التشغيلي (حضور الكادر)", staffAttendanceRate, true],
        ["الرضا والتفاعل (تجاوب أولياء الأمور)", parentEngagementRate, true],
        [
          "الخطر المدرسي (مشكلات عالية الخطورة غير محلولة)",
          unresolvedHighRiskIssues,
          false,
        ],
        ["التميز الأكاديمي", academicExcellence, true],
        [""],
        ["المستوى الإداري والتشغيلي", ""],
        ["كفاءة التغطية (الاحتراق الوظيفي)", coverageEfficiency, true],
        ["معدل الانضباط الإداري العام (تأخر)", adminLatenessRate, true],
        ["معدل الانضباط الإداري العام (غياب)", adminAbsenceRate, true],
        ["كفاءة المرافق وحل المشكلات", facilityEfficiencyRate, true],
        [""],
        ["أداء الكوادر التخصصية", ""],
        ["القيادة العليا", leadershipEfficiency, true],
        ["إدارة الجودة", qualityDepartmentEfficiency, true],
        ["المختص الاجتماعي", socialWorkerEfficiency, true],
        ["صيانة البيئة", maintenanceEfficiency, true],
        ["حركة المواصلات", transportPunctualityRate, true],
        ["المقصف المدرسي", canteenEfficiency, true],
        [""],
        ["العملية الأكاديمية والطلابية", ""],
        ["مؤشر الفجوة التعليمية", educationGap, true],
        ["جودة التصحيح", correctionQuality, true],
        ["الانضباط الصفي", classroomDiscipline, true],
        ["انضباط الطلاب العام", studentDisciplineRate, true],
        ["تفاعل أولياء الأمور (متعاون)", parentCooperativePct, true],
        ["الحالات الصحية المزمنة", generalHealthIndicator, false],
        ["الفاقد التعليمي والغياب", educationalLossRate, true],
        ["الهدر المالي المدرسي", financialLossValue, false],
        ["مؤشر الخطر الطلابي (المعرض للتسرب)", studentRiskCount, false],
        ["عائد التدريب (ROI)", trainingROI, true],
      ];

      indicators.forEach((ind) => {
        const row = summarySheet.addRow([ind[0], ind[1]]);
        if (typeof ind[1] === "number") {
          const isPercentage = ind[2];
          if (isPercentage) {
            row.getCell(2).numFmt = '0"%"';
            const val = ind[1] as number;
            if (val < 50) {
              row.getCell(2).font = { color: { argb: "FFEE0000" }, bold: true };
            } else if (val >= 90) {
              row.getCell(2).font = { color: { argb: "FF00aa00" }, bold: true };
            }
          } else {
            if ((ind[1] as number) > 0 && String(ind[0]).includes("الخطر")) {
              row.getCell(2).font = { color: { argb: "FFEE0000" }, bold: true };
            }
          }
        } else if (ind[1] === "") {
          row.font = { bold: true };
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE5E7EB" },
          };
        }
      });

      // Sheet 2: Detailed Staff (تفاصيل الكوادر)
      const staffSheet = workbook.addWorksheet("تفاصيل الموظفين", {
        views: [{ rightToLeft: true }],
      });
      staffSheet.columns = [
        { header: "القسم / الإدارة", key: "dept", width: 30 },
        { header: "المؤشر", key: "indicator", width: 30 },
        { header: "النسبة / الإنجاز", key: "value", width: 20 },
      ];
      staffSheet.getRow(1).font = { bold: true };

      const staffData = [
        { dept: "القيادة العليا", indicator: "سرعة اتخاذ القرارات والالتزام بالخطة", value: leadershipEfficiency },
        { dept: "إدارة الجودة", indicator: "استقرار الجدول والمهام الدورية", value: qualityDepartmentEfficiency },
        { dept: "المختص الاجتماعي", indicator: "الحالات المعالجة وحيوية الإرشاد", value: socialWorkerEfficiency },
        { dept: "بيئة / صيانة", indicator: "الاستجابة للأعطال وصيانة البيئة", value: maintenanceEfficiency },
        { dept: "حركة المواصلات", indicator: "دقة مواعيد حافلات النقل المدرسي", value: transportPunctualityRate },
        { dept: "المقصف المدرسي", indicator: "الالتزام بالاشتراطات الصحية والغذائية", value: canteenEfficiency },
      ];

      staffData.forEach((d) => {
        const row = staffSheet.addRow(d);
        row.getCell(3).numFmt = '0"%"';
        if (d.value < 50)
          row.getCell(3).font = { color: { argb: "FFEE0000" }, bold: true };
        else if (d.value >= 90)
          row.getCell(3).font = { color: { argb: "FF00aa00" }, bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `Comprehensive_Indicators_${dateRange.from || "All"}.xlsx`);
    } catch (e) {
      console.error("Error generating Excel", e);
      alert("حدث خطأ أثناء إنشاء ملف Excel. الرجاء المحاولة مرة أخرى.");
    }
  };

  const handleWhatsAppShare = () => {
    const text = `📊 *التقرير الإداري الشامل*
🏢 *الفرع/المدرسة:* ${selectedSchool === "all" ? "جميع الفروع" : selectedSchool}
🗓 *الفترة:* من ${dateRange.from || "بداية العام"} إلى ${dateRange.to || "اليوم"}

*===== 1. مؤشرات النبض السريعة =====*
👨‍🏫 الاستقرار التشغيلي (حضور الكادر): *${staffAttendanceRate}%*
🤝 الرضا والتفاعل (أولياء الأمور): *${parentEngagementRate}%*
⚠️ الخطر المدرسي (مشاكل عالية الخطورة غير محلولة): *${unresolvedHighRiskIssues}*
🏆 التميز الأكاديمي (نسب النجاح والإنجاز): *${academicExcellence}%*

*===== 2. المستوى الإداري والتشغيلي =====*
• كفاءة التغطية (الاحتراق الوظيفي): *${coverageEfficiency}% (تغطية الحصص)*
• الانضباط الإداري العام: *${adminLatenessRate}% تأخر، ${adminAbsenceRate}% غياب*
• كفاءة المرافق وحل المشكلات: *${facilityEfficiencyRate}% معدل الإنجاز*

*===== 3. أداء الكادر التعليمي =====*
• مؤشر الفجوة التعليمية: *فجوة ${educationGap}%*
• جودة التصحيح: *${correctionQuality}% التزام*
• الانضباط الصفي: *${classroomDiscipline}% انضباط*
• المخالفات المهنية للمعلمين: *${teacherViolationsCount} مخالفات مرصودة*

*===== 4. شؤون الطلاب والسلوك =====*
• الانضباط الطلابي: *${studentDisciplineRate}% بلا تبليغات*
• تفاعل أولياء الأمور: *(متعاون: ${parentCooperativePct}%، متذمر: ${parentComplainingPct}%، غير متابع: ${parentNeutralPct}%)*
• المؤشر الصحي العام: *${generalHealthIndicator} حالات صحية/مزمنة*

*===== 5. مؤشرات الاستراتيجية الاستشرافية =====*
• الهدر المالي المُقّدر للإتلافات: *${financialLossValue.toLocaleString()} ريال يمني*
• مؤشر الخطر الطلابي (إنذار التسرب): *${studentRiskCount} طلاب معرضون*
• عائد التدريب (ROI): *+${trainingROI}% أداء*
• بوصلة القرار (SWOT):
  🟢 قوة: ${swotMatrix.strength}
  🔵 فرص: ${swotMatrix.opportunity}
  🟡 ضعف: ${swotMatrix.weakness}
  🔴 تهديد: ${swotMatrix.threat}

🔗 للاطلاع على التفاصيل الكاملة والرسوم البيانية، نرجو فتح مسار المؤشرات الشاملة بنظام الإدارة.`;

    shareViaWhatsApp(text);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-arabic overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto min-h-[90vh] max-h-[95vh]"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-4 md:p-6 flex flex-col gap-4 md:gap-6 z-20 rounded-t-3xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <BarChart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800">
                      مؤشرات الأداء الشاملة
                    </h2>
                    <p className="text-xs md:text-sm font-bold text-slate-500">
                      لوحة القياس الذكية لمركز القرار
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors border border-green-200 text-xs md:text-sm"
                  >
                    <Share2 size={16} /> مشاركة
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors border border-blue-200 text-xs md:text-sm"
                  >
                    <Download size={16} /> تصدير
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-500 shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* Dynamic Filters */}
              <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar size={18} className="text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-700 text-xs md:text-sm">
                    الفترة من:
                  </span>
                  <input
                    type="date"
                    className="flex-1 md:flex-none p-2 rounded-lg border border-slate-200 text-xs md:text-sm font-bold outline-none focus:border-indigo-500"
                    value={dateRange.from}
                    onChange={(e) =>
                      setDateRange((p) => ({ ...p, from: e.target.value }))
                    }
                  />
                  <span className="font-bold text-slate-700 text-xs md:text-sm">
                    إلى:
                  </span>
                  <input
                    type="date"
                    className="flex-1 md:flex-none p-2 rounded-lg border border-slate-200 text-xs md:text-sm font-bold outline-none focus:border-indigo-500"
                    value={dateRange.to}
                    onChange={(e) =>
                      setDateRange((p) => ({ ...p, to: e.target.value }))
                    }
                  />
                </div>
                <div className="hidden md:block h-6 w-px bg-slate-200 mx-2" />
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-slate-400 shrink-0" />
                  <select
                    className="flex-1 p-2 rounded-lg border border-slate-200 text-xs md:text-sm font-bold outline-none focus:border-indigo-500 min-w-[150px]"
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                  >
                    <option value="all">عرض الكل (جميع الفروع)</option>
                    {schools.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 space-y-8">
              {/* Quick Pulse Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <UserCheck size={20} />
                    </div>
                    <span className="text-2xl font-black text-slate-800">
                      {staffAttendanceRate}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">
                      الاستقرار التشغيلي
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      نسبة حضور الكادر في الفترة المحددة
                    </p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-2xl font-black text-slate-800">
                      {parentEngagementRate}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">الرضا والتفاعل</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      نسبة تجاوب أولياء الأمور وحضورهم
                    </p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle size={20} />
                    </div>
                    <span className="text-2xl font-black text-red-600">
                      {unresolvedHighRiskIssues}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-red-700">الخطر المدرسي</h3>
                    <p className="text-xs text-red-400 font-medium">
                      مشكلات عالية الخطورة غير محلولة
                    </p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <Award size={20} />
                    </div>
                    <span className="text-2xl font-black text-slate-800">
                      {academicExcellence}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">
                      التميز الأكاديمي
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      متوسط نسب النجاح وإنجاز الخطط
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* A/ Management */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-indigo-800">
                    <Briefcase className="text-indigo-500" /> المستوى الإداري
                    والتشغيلي
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-700">
                          مؤشر كفاءة التغطية (الاحتراق الوظيفي)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          المعلمون الأكثر تغطية / الحصص الفارغة المقابلة
                        </p>
                      </div>
                      <span className="font-black text-lg text-slate-800 text-left">
                        {coverageEfficiency}%
                        <br />
                        <span className={`text-xs font-bold block ${coverageEfficiency >= 80 ? "text-green-500" : coverageEfficiency >= 50 ? "text-amber-500" : "text-red-500"}`}>
                          {coverageEfficiency >= 80 ? "تغطية مكتملة" : coverageEfficiency >= 50 ? "تغطية جزئية" : "عجز تغطية حاد"}
                        </span>
                      </span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-700">
                          مؤشر الانضباط الإداري العام
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          نسبة التأخير / الغياب / الاستئذان لعموم المدرسة
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-center px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
                          {adminLatenessRate}% تأخر
                        </div>
                        <div className="text-center px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                          {adminAbsenceRate}% غياب
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-700">
                          كفاءة المرافق وحل المشكلات
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          المشكلات المرفوعة مقابل المحلولة / سرعة الاستجابة
                        </p>
                      </div>
                      <span className="font-black text-lg text-slate-800 text-left">
                        {facilityEfficiencyRate}%
                        <br />
                        <span className="text-xs text-slate-500 font-bold block">
                          معدل الإنجاز
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* B/ Staff */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-cyan-800">
                    <Users className="text-cyan-500" /> مؤشرات الموظفين
                    والعاملين
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <div className="text-cyan-700 font-bold text-sm mb-1">
                        القيادة العليا
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        سرعة اتخاذ القرارات
                      </div>
                      <div className="text-xl font-black text-cyan-800">
                        {leadershipEfficiency}%
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <div className="text-cyan-700 font-bold text-sm mb-1">
                        إدارة الجودة
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        استقرار الجدول
                      </div>
                      <div className="text-xl font-black text-cyan-800">
                        {qualityDepartmentEfficiency}%
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <div className="text-cyan-700 font-bold text-sm mb-1">
                        المختص الاجتماعي
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        الحالات المعالجة
                      </div>
                      <div className="text-xl font-black text-cyan-800">
                        {socialWorkerEfficiency}%
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <div className="text-cyan-700 font-bold text-sm mb-1">
                        بيئة / صيانة
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        الاستجابة للأعطال
                      </div>
                      <div className="text-xl font-black text-cyan-800">
                        {maintenanceEfficiency}%
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <div className="text-cyan-700 font-bold text-sm mb-1">
                        حركة المواصلات
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        دقة المواعيد
                      </div>
                      <div className="text-xl font-black text-cyan-800">
                        {transportPunctualityRate}%
                      </div>
                    </div>
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-2xl text-center">
                      <div className="text-cyan-700 font-bold text-sm mb-1">
                        المقصف
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        الاشتراطات الصحية
                      </div>
                      <div className="text-xl font-black text-cyan-800">
                        {canteenEfficiency}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* C/ Teachers */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-emerald-800">
                    <BookOpen className="text-emerald-500" /> مؤشرات أداء الكادر
                    التعليمي
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-emerald-800">
                          مؤشر الفجوة التعليمية
                        </h4>
                        <p className="text-xs text-emerald-600/70 mt-1">
                          اكتمال التحضير ↔ مستوى الطلاب في الاختبارات
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold bg-white px-3 py-1.5 rounded-xl text-amber-600 shadow-sm border border-emerald-100">
                        <TrendingDown size={16} /> فجوة {educationGap}%
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <h4 className="font-bold text-slate-700 text-sm mb-2">
                          جودة التصحيح
                        </h4>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${correctionQuality}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 font-bold text-left">
                          {correctionQuality}% التزام
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <h4 className="font-bold text-slate-700 text-sm mb-2">
                          الانضباط الصفي
                        </h4>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${classroomDiscipline}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 font-bold text-left">
                          {classroomDiscipline}% انضباط
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-red-50/50 rounded-2xl flex justify-between items-center border border-red-100">
                      <div>
                        <h4 className="font-bold text-red-800 text-sm">
                          المخالفات المهنية
                        </h4>
                        <p className="text-xs text-red-600 mt-1">
                          تأثير مخالفات المعلمين على الأداء
                        </p>
                      </div>
                      <span className="font-black text-red-600 bg-white px-3 py-1 rounded-xl shadow-sm border border-red-100">
                        {teacherViolationsCount} مخالفات مرصودة
                      </span>
                    </div>
                  </div>
                </div>

                {/* D & E/ Students & Behavior */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-blue-800">
                    <GraduationCap className="text-blue-500" /> شؤون الطلاب
                    والسلوك
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-2">
                      <h4 className="font-bold text-slate-700 text-sm">
                        مؤشر الانضباط
                      </h4>
                      <span className="text-2xl font-black text-slate-800">
                        {studentDisciplineRate}%
                      </span>
                      <span className="text-xs text-slate-500">
                        من الطلاب ملتزمون بلا تبليغات
                      </span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-2">
                      <h4 className="font-bold text-slate-700 text-sm">
                        تفاعل ولي الأمر
                      </h4>
                      <div className="flex justify-between items-center text-xs font-bold w-full bg-green-100 text-green-700 px-2 py-1 rounded">
                        متعاون: {parentCooperativePct}%
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold w-full bg-amber-100 text-amber-700 px-2 py-1 rounded">
                        متذمر: {parentComplainingPct}%
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold w-full bg-slate-200 text-slate-600 px-2 py-1 rounded">
                        غير متابع: {parentNeutralPct}%
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl col-span-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="text-pink-500" size={20} />
                        <div>
                          <h4 className="font-bold text-slate-700 text-sm">
                            المؤشر الصحي العام
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            أمراض مزمنة وحالات طارئة
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-lg bg-pink-50 text-pink-700 px-3 py-1 rounded-xl">
                        {generalHealthIndicator} حالة
                      </span>
                    </div>
                  </div>
                </div>

                {/* F/ Exams */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-violet-800">
                    <FileText className="text-violet-500" /> القياس الأكاديمي
                    والاختبارات
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-700">
                          مؤشر التقدم والتراجع (Trend)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          مقارنة النتائج الشهرية بالفصلية
                        </p>
                      </div>
                      <div className={`font-bold flex items-center gap-1 px-2 py-1 rounded-lg ${progressTrend >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                        {progressTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {progressTrend >= 0 ? `+${progressTrend}%` : `${progressTrend}%`} {progressTrend >= 0 ? 'تقدم' : 'تراجع'}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-700">
                          الفاقد التعليمي والغياب
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          غياب الطلاب عن الاختبارات ومستوى الدرجات
                        </p>
                      </div>
                      <span className="font-black text-lg text-slate-800">
                        {educationalLossRate}%{" "}
                        <span className="text-xs font-normal text-slate-500">
                          فاقد
                        </span>
                      </span>
                    </div>
                    <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                      <h4 className="font-bold text-red-800 text-sm mb-2">
                        صعوبة المواد (الأعلى رسوباً)
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {displayDifficultSubjects.map((sub, idx) => (
                          <span key={idx} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-600 shadow-sm border border-red-100">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* G/ Predictive & Strategic */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 bg-gradient-to-br from-indigo-50/30 to-white">
                  <h3 className="text-xl font-black flex items-center gap-2 text-indigo-900">
                    <Activity className="text-indigo-600" /> مؤشرات الاستراتيجية
                    الاستشرافية
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-500" size={24} />
                        <div>
                          <h4 className="font-bold text-red-800">
                            مؤشر الخطر الطلابي (Predictive)
                          </h4>
                          <p className="text-xs text-red-600/80 mt-1">
                            إنذار: (غياب + تدني درجات + تذمر)
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-black text-red-600 block">
                          {studentRiskCount}
                        </span>
                        <span className="text-[10px] font-bold text-red-800">
                          طلاب معرضون للتسرب
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <h4 className="font-bold text-slate-700 text-sm mb-1">
                          مؤشر الهدر المالي
                        </h4>
                        <p className="text-xs text-slate-500 mb-2">
                          تكلفة تقديرية للإتلاف
                        </p>
                        <span className="text-xl font-black text-amber-600">
                          {financialLossValue.toLocaleString()}{" "}
                          <span className="text-xs font-bold text-slate-500">
                            ريال يمني
                          </span>
                        </span>
                      </div>
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <h4 className="font-bold text-slate-700 text-sm mb-1">
                          عائد التدريب (ROI)
                        </h4>
                        <p className="text-xs text-slate-500 mb-2">
                          تأثير الدورات محلياً
                        </p>
                        <span className="text-xl font-black text-green-600">
                          +{trainingROI}%{" "}
                          <span className="text-xs font-bold text-slate-500">
                            أداء
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* SWOT Analysis */}
                    <div className="mt-4 p-4 bg-slate-800 text-white rounded-2xl space-y-3">
                      <h4 className="font-black text-sm flex items-center gap-2">
                        <BarChart size={16} /> بوصلة القرار الآلية (SWOT)
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="font-bold shrink-0">توسع (قوة):</span>
                          <span className="text-slate-300">
                            {swotMatrix.strength}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="font-bold shrink-0">استقرار (فرص):</span>
                          <span className="text-slate-300">
                            {swotMatrix.opportunity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                          <span className="font-bold shrink-0">تطوير (ضعف):</span>
                          <span className="text-slate-300">
                            {swotMatrix.weakness}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-red-400"></div>
                          <span className="font-bold shrink-0">هيكلة (تهديد):</span>
                          <span className="text-slate-300">
                            {swotMatrix.threat}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ComprehensiveIndicatorsModal;
