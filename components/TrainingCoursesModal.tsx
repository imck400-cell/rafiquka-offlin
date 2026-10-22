import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  User,
  Star,
  List,
  BarChart,
  ChevronRight,
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";
import CourseEvaluationModal from "./CourseEvaluationModal";
import CourseArchiveModal from "./CourseArchiveModal";

interface TrainingCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrainingCoursesModal: React.FC<TrainingCoursesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useGlobal();
  const [evaluationMode, setEvaluationMode] = useState<
    null | "select" | "current" | "comprehensive"
  >(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const trainingPerm = currentUser?.permissions?.trainingCourses;
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const canViewIndicators =
    isGeneralSupervisor ||
    (Array.isArray(trainingPerm) && trainingPerm.includes("viewIndicators"));

  const handleCloseEvaluation = () => {
    setEvaluationMode(null);
  };

  if (!isOpen && !evaluationMode && !isArchiveOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm font-arabic">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    الدورات التدريبية
                  </h2>
                  <p className="text-slate-500 font-medium">
                    بوابة إدارة وتقييم البرامج التدريبية
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
              {evaluationMode === "select" ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => setEvaluationMode(null)}
                      className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
                    >
                      <ChevronRight size={20} /> عودة للقائمة الرئيسية
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => setEvaluationMode("current")}
                      className="relative overflow-hidden flex flex-col items-center justify-center p-8 bg-amber-50/70 border-2 border-amber-100/50 backdrop-blur-sm rounded-3xl hover:border-amber-400 hover:shadow-xl transition-all group"
                    >
                      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Star size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">
                        تقييم الدورة الحالية
                      </h3>
                      <p className="text-slate-500 text-sm mt-2 font-medium">
                        النموذج المخصص للبرنامج الأخير
                      </p>
                    </button>

                    <button
                      onClick={() => setEvaluationMode("comprehensive")}
                      className="relative overflow-hidden flex flex-col items-center justify-center p-8 bg-blue-50/70 border-2 border-blue-100/50 backdrop-blur-sm rounded-3xl hover:border-blue-400 hover:shadow-xl transition-all group"
                    >
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BookOpen size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">
                        تقييم شامل للدورات كلها
                      </h3>
                      <p className="text-slate-500 text-sm mt-2 font-medium">
                        نموذج تقييم على مستوى جميع الدورات
                      </p>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button className="relative overflow-hidden flex flex-col items-center justify-center p-8 bg-blue-50/70 border-2 border-blue-100/50 backdrop-blur-sm rounded-3xl hover:border-blue-400 hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <List size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      الاحتياجات التدريبية القادمة
                    </h3>
                  </button>

                  <button
                    onClick={() => setEvaluationMode("select")}
                    className="relative overflow-hidden flex flex-col items-center justify-center p-8 bg-amber-50/70 border-2 border-amber-100/50 backdrop-blur-sm rounded-3xl hover:border-amber-400 hover:shadow-xl transition-all group"
                  >
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Star size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      تقييم الدورة التدريبية
                    </h3>
                  </button>

                  <button
                    onClick={() => setIsArchiveOpen(true)}
                    className="relative overflow-hidden flex flex-col items-center justify-center p-8 bg-emerald-50/70 border-2 border-emerald-100/50 backdrop-blur-sm rounded-3xl hover:border-emerald-400 hover:shadow-xl transition-all group"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BookOpen size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      أرشيف الدورات التدريبية
                    </h3>
                  </button>

                  {canViewIndicators && (
                    <button className="relative overflow-hidden flex flex-col items-center justify-center p-8 bg-purple-50/70 border-2 border-purple-100/50 backdrop-blur-sm rounded-3xl hover:border-purple-400 hover:shadow-xl transition-all group opacity-50 cursor-not-allowed">
                      <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BarChart size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">
                        مؤشرات الدروات التدريبية
                      </h3>
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {(evaluationMode === "current" || evaluationMode === "comprehensive") && (
        <CourseEvaluationModal isOpen={true} onClose={handleCloseEvaluation} />
      )}

      {isArchiveOpen && (
        <CourseArchiveModal
          isOpen={true}
          onClose={() => setIsArchiveOpen(false)}
        />
      )}
    </AnimatePresence>
  );
};
export default TrainingCoursesModal;
