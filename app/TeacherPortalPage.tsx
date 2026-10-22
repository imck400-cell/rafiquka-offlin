import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, ListTodo, Star, FileSpreadsheet, BookOpen } from "lucide-react";
import { useGlobal } from "../context/GlobalState";
import { toast } from "sonner";
import { SelfEvaluationView } from "./SelfEvaluationView";
import { StudentEvaluationView } from "./StudentEvaluationView";
import { GradeSheetsView } from "./GradeSheetsView";
import { DailyPreparationView } from "./DailyPreparationView";

export const TeacherPortalPage = () => {
  const { lang, currentUser } = useGlobal();
  const [activeView, setActiveView] = useState<
    "menu" | "selfEval" | "studentEval" | "grades" | "dailyPrep"
  >("menu");

  const handleNotImplemented = () => {
    toast.info(
      lang === "ar" ? "هذه الخاصية قيد التطوير" : "Feature under development",
    );
  };

  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const isAllowEdits =
    Array.isArray(currentUser?.permissions?.secretariat) &&
    currentUser.permissions.secretariat.includes("allowEdits");
  const isReadOnlyFlag = currentUser?.permissions?.readOnly === true;
  const isReadOnly = !isGeneralSupervisor && isReadOnlyFlag && !isAllowEdits;

  if (activeView === "selfEval") {
    return <SelfEvaluationView onBack={() => setActiveView("menu")} />;
  }

  if (activeView === "studentEval") {
    return <StudentEvaluationView onBack={() => setActiveView("menu")} />;
  }

  if (activeView === "grades") {
    return <GradeSheetsView onBack={() => setActiveView("menu")} />;
  }

  if (activeView === "dailyPrep") {
    return <DailyPreparationView onBack={() => setActiveView("menu")} />;
  }

  const teacherPortalPerms = currentUser?.permissions?.teacherPortal;
  const hasSelfEval = isGeneralSupervisor || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("selfEval"));
  const hasStudentEval = isGeneralSupervisor || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("studentEval"));
  const hasGrades = isGeneralSupervisor || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && teacherPortalPerms.includes("gradesSheet"));
  const hasDailyPrep = isGeneralSupervisor || teacherPortalPerms === true || (Array.isArray(teacherPortalPerms) && (teacherPortalPerms.includes("newPrep") || teacherPortalPerms.includes("archivePrep")));

  const buttons = [];

  if (hasSelfEval) {
    buttons.push({
      id: "self-eval",
      label: lang === "ar" ? "التقييم الذاتي" : "Self Evaluation",
      color: "bg-blue-600 shadow-blue-200 hover:bg-blue-700",
      icon: <CheckSquare size={48} className="mb-4 opacity-80" />,
      onClick: () => setActiveView("selfEval"),
    });
  }

  if (hasDailyPrep) {
    buttons.push({
      id: "daily-preparation",
      label: lang === "ar" ? "التحضير اليومي" : "Daily Preparation",
      color: "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700",
      icon: <BookOpen size={48} className="mb-4 opacity-80" />,
      onClick: () => setActiveView("dailyPrep"),
    });
  }

  if (hasStudentEval) {
    buttons.push({
      id: "student-eval",
      label: lang === "ar" ? "تقييم الطلاب" : "Student Evaluation",
      color: "bg-amber-500 shadow-amber-200 hover:bg-amber-600",
      icon: <Star size={48} className="mb-4 opacity-80" />,
      onClick: () => setActiveView("studentEval"),
    });
  }

  if (hasGrades) {
    const hasGradesDisablePerm =
      Array.isArray(currentUser?.permissions?.gradeSheets) &&
      currentUser.permissions.gradeSheets.includes("disable_button");
    buttons.push({
      id: "grades",
      label: lang === "ar" ? "كشف الدرجات" : "Grades Sheet",
      color: hasGradesDisablePerm
        ? "bg-slate-400 shadow-slate-200 cursor-not-allowed"
        : "bg-purple-600 shadow-purple-200 hover:bg-purple-700",
      icon: <FileSpreadsheet size={48} className="mb-4 opacity-80" />,
      onClick: () => {
        if (hasGradesDisablePerm) return;
        setActiveView("grades");
      },
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 font-arabic">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">
            {lang === "ar" ? "خاص بالمعلم" : "Teacher Portal"}
          </h1>
          <p className="text-slate-500 font-bold mt-2">
            {lang === "ar"
              ? "مساحة المعلم وإدارة المهام والتقييمات"
              : "Teacher workspace and quick actions"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {buttons.map((btn, index) => (
          <motion.button
            key={btn.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={btn.onClick}
            className={`${btn.color} text-white p-8 rounded-[2rem] shadow-xl flex flex-col items-center justify-center transition-all transform hover:-translate-y-2 group`}
          >
            <div className="group-hover:scale-110 transition-transform duration-300">
              {btn.icon}
            </div>
            <span className="text-2xl font-black">{btn.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
