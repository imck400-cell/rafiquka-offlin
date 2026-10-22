import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Save,
  Printer,
  Star,
  Edit,
  ChevronLeft,
  User,
  BookOpen,
  Coffee,
  Activity,
  MessageSquare,
  Puzzle,
  Target,
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";

const iconMap: Record<string, any> = {
  User,
  BookOpen,
  Star,
  Coffee,
  Activity,
  MessageSquare,
  Puzzle,
  Target,
};

interface CourseEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultSchema_v2 = [
  {
    id: "general_info",
    title: "أولاً: المعلومات العامة",
    icon: "User",
    theme: "blue",
    fields: [
      { id: "trainee_name", type: "text", label: "اسم المتدرب (اختياري لضمان شفافية وموضوعية التقييم)" },
      { id: "job_title", type: "text", label: "المسمى الوظيفي / جهة العمل" },
      { id: "course_name", type: "text", label: "اسم البرنامج التدريبي" },
      { id: "course_date_venue", type: "text", label: "تاريخ ومكان انعقاد البرنامج (حضورياً أو عن بُعد)" },
    ],
  },
  {
    id: "scientific_content",
    title: "ثانياً: تقييم المحتوى العلمي والبرنامج",
    description: "(مقياس رقمي من 1 إلى 5)",
    icon: "BookOpen",
    theme: "emerald",
    fields: [
      { id: "goals_clarity", type: "rating", label: "مدى وضوح أهداف البرنامج التدريبي وتوافقها مع التوقعات الشخصية والمهنية." },
      { id: "content_modernity", type: "rating", label: "شمولية المحتوى التدريبي وحداثة المعلومات المقدمة." },
      { id: "theory_practice_balance", type: "rating", label: "التوازن الفعال بين الجانب النظري والتطبيق العملي." },
      { id: "relevance", type: "rating", label: "مدى ارتباط محتوى الدورة بالاحتياجات الفعلية والتحديات في بيئة العمل." },
      { id: "time_adequacy", type: "rating", label: "كفاية الوقت المخصص لتغطية جميع محاور البرنامج التدريبي بسلاسة." },
    ],
  },
  {
    id: "trainers_performance",
    title: "ثالثاً: تقييم أداء المدرب",
    description: "(مقياس رقمي من 1 إلى 5)",
    icon: "Star",
    theme: "amber",
    fields: [
      { id: "concept_delivery", type: "rating", label: "تمكن المدرب من المادة العلمية وقدرته على إيصال المعلومات بوضوح." },
      { id: "discussion_management", type: "rating", label: "مدى تفاعل المدرب مع استفسارات ومشاركات المتدربين باحترافية." },
      { id: "methods_variation", type: "rating", label: "تنويع أساليب التدريب واستخدام الوسائل التقنية والتعليمية الحديثة في العرض." },
      { id: "time_management", type: "rating", label: "إدارة الوقت وتوزيع الجلسات التدريبية بكفاءة عالية." },
    ],
  },
  {
    id: "facilities_services",
    title: "رابعاً: التجهيزات والخدمات وبيئة التدريب",
    description: "(مقياس رقمي من 1 إلى 5)",
    icon: "Coffee",
    theme: "purple",
    fields: [
      { id: "environment_suitability", type: "rating", label: "ملاءمة بيئة التدريب (القاعة أو المنصة الافتراضية) من حيث التجهيزات التقنية والتنظيم." },
      { id: "breaks_adequacy", type: "rating", label: "كفاية ومناسبة أوقات الاستراحة وجودة الخدمات المرافقة." },
      { id: "organizer_role", type: "rating", label: "دور الجهة المنظمة في تذليل الصعوبات والتواصل الفعال مع المتدربين." },
      { id: "materials_quality", type: "rating", label: "جودة المواد العلمية الموزعة (الحقيبة التدريبية، المراجع، العروض التقديمية)." },
    ],
  },
  {
    id: "impact_results",
    title: "خامساً: قياس الأثر والنتائج (نقل أثر التدريب - السلوك)",
    icon: "Activity",
    theme: "rose",
    fields: [
      { id: "acquired_skills", type: "textarea", label: "ما هي أهم مهارة أو معرفة اكتسبتها وتخطط لتطبيقها بشكل مباشر في مهامك الوظيفية؟" },
      { id: "performance_improvement", type: "rating", label: "إلى أي مدى تعتقد أن هذه الدورة ستساهم في تحسين مستوى أدائك العام؟ (مقياس من 1 إلى 5)" },
      { id: "overall_rating", type: "rating", label: "مدى رضاك العام عن البرنامج التدريبي كحزمة متكاملة. (مقياس من 1 إلى 5)" },
    ],
  },
  {
    id: "nps_rating",
    title: "سادساً: التقييم الرقمي العام (مؤشر صافي الترويج - NPS)",
    icon: "Target",
    theme: "cyan",
    fields: [
      { id: "recommendation", type: "nps", label: "على مقياس من 0 إلى 10، ما مدى احتمالية أن توصي بهذا البرنامج التدريبي لزملائك في العمل؟" },
    ],
  },
  {
    id: "continuous_improvement",
    title: "سابعاً: أسئلة مفتوحة للتطوير المستمر",
    icon: "MessageSquare",
    theme: "teal",
    fields: [
      { id: "strengths", type: "textarea", label: "ما هي أبرز نقاط القوة التي تميز بها هذا البرنامج التدريبي؟" },
      { id: "improvement_suggestions", type: "textarea", label: "ما هي مقترحاتك التطويرية لتحسين البرنامج في دوراته القادمة (محتوى، مدرب، تجهيزات)؟" },
      { id: "future_topics", type: "textarea", label: "ما هي البرامج أو المواضيع التدريبية التي تقترح إدراجها مستقبلاً لتلبية احتياجاتك المهنية؟" },
    ],
  },
];

export const CourseEvaluationModal: React.FC<CourseEvaluationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, updateData, data } = useGlobal();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const schema = data.courseEvaluationSchema_v3 && data.courseEvaluationSchema_v3.length > 0 
    ? data.courseEvaluationSchema_v3 
    : defaultSchema_v2;

  const [isEditMode, setIsEditMode] = useState(false);

  // Check if user has permission to edit schema
  const trainingPerm = currentUser?.permissions?.trainingCourses;
  const isGeneralSupervisor =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;
  const canEditSchema =
    isGeneralSupervisor ||
    (Array.isArray(trainingPerm) && trainingPerm.includes("editSchema"));

  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setIsSubmitted(false);
      setIsEditMode(false);
    }
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = () => {
    const newEvaluation = {
      id: `eval_${Date.now()}`,
      userId: currentUser?.id,
      traineeName: formData["trainee_name"] || "غير مسجل",
      jobTitle: formData["job_title"] || "غير مسجل",
      courseName: formData["course_name"] || "غير مسجل",
      trainerName: formData["trainer_name"] || "غير مسجل",
      courseDate:
        formData["course_date"] || new Date().toISOString().split("T")[0],
      evaluationDate: new Date().toISOString().split("T")[0],
      answers: formData,
      overallRating: formData["overall_rating"] || 0,
    };

    const currentEvaluations = data.trainingEvaluations || [];
    updateData({ trainingEvaluations: [...currentEvaluations, newEvaluation] });

    setIsSubmitted(true);
  };

  const handleFieldChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Schema Editing Handlers
  const handleUpdateSectionTitle = (sIdx: number, newTitle: string) => {
    const newSchema = [...schema];
    newSchema[sIdx].title = newTitle;
    updateData({ courseEvaluationSchema_v3: newSchema });
  };

  const handleUpdateFieldLabel = (
    sIdx: number,
    fIdx: number,
    newLabel: string,
  ) => {
    const newSchema = [...schema];
    newSchema[sIdx].fields[fIdx].label = newLabel;
    updateData({ courseEvaluationSchema_v3: newSchema });
  };

  const handleRemoveField = (sIdx: number, fIdx: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المعيار/السؤال؟")) return;
    const newSchema = [...schema];
    newSchema[sIdx].fields.splice(fIdx, 1);
    updateData({ courseEvaluationSchema_v3: newSchema });
  };

  const handleAddField = (sIdx: number) => {
    const newSchema = [...schema];
    const type = window.prompt(
      "نوع الحقل (text, textarea, rating, select, star_rating, nps):",
      "rating",
    );
    if (!type) return;
    const label = window.prompt("نص السؤال:");
    if (!label) return;

    const newField: any = {
      id: `custom_${Date.now()}`,
      type,
      label,
    };
    if (type === "select") {
      newField.options = ["نعم", "إلى حد ما", "لا"];
    }
    newSchema[sIdx].fields.push(newField);
    updateData({ courseEvaluationSchema_v3: newSchema });
  };

  const handleRemoveSection = (sIdx: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه البطاقة بالكامل؟")) return;
    const newSchema = [...schema];
    newSchema.splice(sIdx, 1);
    updateData({ courseEvaluationSchema_v3: newSchema });
  };

  const handleAddSection = () => {
    const title = window.prompt("عنوان البطاقة الجديدة:");
    if (!title) return;
    const newSchema = [...schema];
    newSchema.push({
      id: `custom_section_${Date.now()}`,
      title,
      icon: "Star",
      theme: "blue",
      fields: [],
    });
    updateData({ courseEvaluationSchema_v3: newSchema });
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
            className={`relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col my-auto PrintSection ${isSubmitted ? "h-auto" : ""}`}
          >
            {isSubmitted ? (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"
                >
                  <Check size={48} strokeWidth={3} />
                </motion.div>
                <h2 className="text-3xl font-black text-slate-800">
                  شكراً لك، {formData["trainee_name"] || "أستاذي الكريم"}!
                </h2>
                <p className="text-xl text-slate-600">
                  تم حفظ تقييمك بنجاح، نقدر وقتك ومساهمتك في التطوير.
                </p>
                <div className="flex gap-4 mt-8 pt-8 border-t border-slate-100 w-full justify-center flex-wrap">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  >
                    العودة للقائمة السابقة
                  </button>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                  >
                    تعديل الإجابات
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                  >
                    حفظ وإغلاق
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-6 flex items-center justify-between z-10 rounded-t-3xl hide-on-print">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                    >
                      <X size={24} />
                    </button>
                    <h2 className="text-2xl font-black text-slate-800">
                      تقييم الدورة التدريبية
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {canEditSchema && (
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-4 py-2 flex items-center gap-2 rounded-xl font-bold transition-all ${isEditMode ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        <Edit size={18} />{" "}
                        {isEditMode ? "إلغاء التعديل" : "تعديل المعايير"}
                      </button>
                    )}
                    <button
                      onClick={handlePrint}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 flex items-center gap-2"
                      title="طباعة النموذج"
                    >
                      <Printer size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto space-y-8 bg-slate-50">
                  {schema.map((section, sIdx) => {
                    const IconComponent =
                      iconMap[section.icon || "Star"] || Star;
                    return (
                      <div
                        key={section.id}
                        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 print-break-inside-avoid relative overflow-hidden"
                      >
                        {/* Decorative background for icon */}
                        <div
                          className={`absolute -right-6 -top-6 w-32 h-32 opacity-[0.03] text-${section.theme || "blue"}-500 pointer-events-none`}
                        >
                          <IconComponent size={128} />
                        </div>

                        <div className="flex items-start justify-between mb-6 relative">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-${section.theme || "blue"}-50 text-${section.theme || "blue"}-600`}
                            >
                              <IconComponent size={24} />
                            </div>
                            <div className="flex-1">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={section.title}
                                  onChange={(e) =>
                                    handleUpdateSectionTitle(
                                      sIdx,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-xl font-black text-slate-800 bg-slate-50 border-2 border-indigo-100 rounded-lg px-3 py-1 outline-none mb-1"
                                />
                              ) : (
                                <h3 className="text-xl font-black text-slate-800">
                                  {section.title}
                                </h3>
                              )}
                              {section.description && (
                                <span className="text-sm font-bold text-slate-400 block mt-1">
                                  {section.description}
                                </span>
                              )}
                            </div>
                          </div>
                          {isEditMode && (
                            <button
                              onClick={() => handleRemoveSection(sIdx)}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg mr-2 transition-colors shrink-0"
                            >
                              <X size={20} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-6">
                          {section.fields.map((field, fIdx) => (
                            <div
                              key={field.id}
                              className="space-y-3 relative group/field"
                            >
                              {isEditMode && (
                                <button
                                  onClick={() => handleRemoveField(sIdx, fIdx)}
                                  className="absolute left-[-16px] top-0 text-red-500 opacity-0 group-hover/field:opacity-100 transition-opacity"
                                >
                                  <X size={16} />
                                </button>
                              )}
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) =>
                                    handleUpdateFieldLabel(
                                      sIdx,
                                      fIdx,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full block text-slate-700 font-bold bg-slate-50 border-2 border-indigo-100 rounded-lg px-3 py-1 outline-none"
                                />
                              ) : (
                                <label className="block text-slate-700 font-bold">
                                  {field.label}
                                </label>
                              )}

                              {field.type === "text" && (
                                <input
                                  type="text"
                                  value={formData[field.id] || ""}
                                  onChange={(e) =>
                                    handleFieldChange(field.id, e.target.value)
                                  }
                                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                                />
                              )}

                              {field.type === "date" && (
                                <input
                                  type="date"
                                  value={formData[field.id] || ""}
                                  onChange={(e) =>
                                    handleFieldChange(field.id, e.target.value)
                                  }
                                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all"
                                />
                              )}

                              {field.type === "textarea" && (
                                <textarea
                                  value={formData[field.id] || ""}
                                  onChange={(e) =>
                                    handleFieldChange(field.id, e.target.value)
                                  }
                                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all min-h-[100px]"
                                />
                              )}

                              {field.type === "rating" && (
                                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                                  {[1, 2, 3, 4, 5].map((num) => {
                                    const isSelected =
                                      formData[field.id] === num;
                                    let colorClass =
                                      "bg-slate-100 text-slate-500 hover:bg-slate-200";
                                    if (isSelected) {
                                      if (num === 5)
                                        colorClass =
                                          "bg-[#86efac] text-green-950 shadow-lg shadow-green-200 scale-110 border-2 border-[#4ade80]"; // Light Green
                                      else if (num === 4)
                                        colorClass =
                                          "bg-blue-500 text-white shadow-lg shadow-blue-200 scale-110 border-2 border-blue-600"; // Blue
                                      else if (num === 3)
                                        colorClass =
                                          "bg-cyan-300 text-cyan-950 shadow-lg shadow-cyan-200 scale-110 border-2 border-cyan-400"; // Cyan
                                      else if (num === 2)
                                        colorClass =
                                          "bg-orange-500 text-white shadow-lg shadow-orange-200 scale-110 border-2 border-orange-600"; // Orange
                                      else if (num === 1)
                                        colorClass =
                                          "bg-[#990000] text-white shadow-lg shadow-red-200 scale-110 border-2 border-[#660000]"; // Crimson
                                    }
                                    return (
                                      <button
                                        key={num}
                                        onClick={() =>
                                          handleFieldChange(field.id, num)
                                        }
                                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full font-black text-lg flex items-center justify-center transition-all ${colorClass}`}
                                      >
                                        {num}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {field.type === "select" && (
                                <div className="flex gap-3 flex-wrap">
                                  {field.options?.map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() =>
                                        handleFieldChange(field.id, opt)
                                      }
                                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                        formData[field.id] === opt
                                          ? `bg-blue-600 text-white shadow-md`
                                          : `bg-slate-100 text-slate-600 hover:bg-slate-200`
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {field.type === "star_rating" && (
                                <div className="flex items-center gap-2">
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                      key={num}
                                      onClick={() =>
                                        handleFieldChange(field.id, num)
                                      }
                                      className="p-2 transition-transform hover:scale-110"
                                    >
                                      <Star
                                        size={36}
                                        className={
                                          formData[field.id] >= num
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-slate-200 fill-slate-100"
                                        }
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}

                              {field.type === "nps" && (
                                <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-center mt-4">
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                    const isSelected = formData[field.id] === num;
                                    let colorClass = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                                    if (isSelected) {
                                      if (num >= 9) colorClass = "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110 border-2 border-emerald-600";
                                      else if (num >= 7) colorClass = "bg-amber-500 text-white shadow-lg shadow-amber-200 scale-110 border-2 border-amber-600";
                                      else colorClass = "bg-rose-500 text-white shadow-lg shadow-rose-200 scale-110 border-2 border-rose-600";
                                    }
                                    return (
                                      <button
                                        key={num}
                                        onClick={() => handleFieldChange(field.id, num)}
                                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl font-black text-sm md:text-base flex items-center justify-center transition-all ${colorClass}`}
                                      >
                                        {num}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}

                          {isEditMode && (
                            <button
                              onClick={() => handleAddField(sIdx)}
                              className="mt-4 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors w-full border-2 border-dashed border-indigo-200"
                            >
                              + إضافة معيار / سؤال جديد
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isEditMode && (
                    <button
                      onClick={handleAddSection}
                      className="w-full py-6 text-lg font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-3xl transition-colors border-4 border-dashed border-indigo-200"
                    >
                      + إضافة بطاقة جديدة
                    </button>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-center hide-on-print rounded-b-3xl">
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all hover:-translate-y-1"
                  >
                    <Save size={24} />
                    إرسال وحفظ التقييم
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default CourseEvaluationModal;
