import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Filter,
  BookOpen,
  User,
  Calendar,
  Star,
  ChevronDown,
  Check,
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";

interface CourseArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CourseArchiveModal: React.FC<CourseArchiveModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data } = useGlobal();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("newest");

  const evaluations = data.trainingEvaluations || [];

  const filteredAndSortedEvaluations = useMemo(() => {
    let result = evaluations.filter((ev) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        ev.courseName.toLowerCase().includes(q) ||
        ev.trainerName.toLowerCase().includes(q) ||
        ev.traineeName.toLowerCase().includes(q)
      );
    });

    switch (filterType) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.evaluationDate).getTime() -
            new Date(a.evaluationDate).getTime(),
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.evaluationDate).getTime() -
            new Date(b.evaluationDate).getTime(),
        );
        break;
      case "highest_rating":
        result.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
        break;
      case "lowest_rating":
        result.sort((a, b) => (a.overallRating || 0) - (b.overallRating || 0));
        break;
    }

    return result;
  }, [evaluations, searchQuery, filterType]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-arabic overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto min-h-[80vh] max-h-[90vh]"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-6 flex flex-col gap-6 z-10 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">
                      أرشيف الدورات التدريبية
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                      سجل التقييمات الشامل للبرامج المنفذة
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="ابحث باسم الدورة، المدرب، أو المتدرب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
                <div className="relative w-full md:w-auto min-w-[200px]">
                  <Filter
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full appearance-none pr-12 pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="newest">الأحدث تقييماً</option>
                    <option value="oldest">الأقدم تقييماً</option>
                    <option value="highest_rating">الأعلى تقييماً</option>
                    <option value="lowest_rating">الأقل تقييماً</option>
                  </select>
                  <ChevronDown
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50 rounded-b-3xl">
              {filteredAndSortedEvaluations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <BookOpen size={64} className="opacity-20" />
                  <h3 className="text-xl font-black">
                    لا توجد تقييمات في الأرشيف
                  </h3>
                  <p className="font-bold">
                    استخدم نموذج التقييم لإضافة سجلات جديدة.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedEvaluations.map((ev) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 group-hover:w-3 transition-all" />

                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-black text-slate-800 line-clamp-2 pr-4">
                          {ev.courseName}
                        </h3>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">
                          <Star size={14} className="fill-amber-400" />
                          <span className="font-black text-sm">
                            {ev.overallRating?.toFixed(1) || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <User size={16} className="text-blue-500" />
                          <span className="font-bold">المدرب:</span>
                          <span className="truncate">{ev.trainerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <User size={16} className="text-indigo-500" />
                          <span className="font-bold">المتدرب:</span>
                          <span className="truncate">{ev.traineeName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-slate-50 p-2 rounded-lg">
                            <Calendar size={14} />
                            الدورة: <br />
                            {ev.courseDate}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-slate-50 p-2 rounded-lg">
                            <Check size={14} />
                            التقييم: <br />
                            {ev.evaluationDate}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default CourseArchiveModal;
