import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Save,
  Users,
  Building,
  FileSpreadsheet,
} from "lucide-react";
import { useGlobal } from "../context/GlobalState";
import { AdminActivity } from "../types";
import { toast } from "sonner";
import { ACTIVITIES_DATA } from "../app/evaluationData";

interface AdminCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCriteriaModal: React.FC<AdminCriteriaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data, updateData, currentUser } = useGlobal();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activities, setActivities] = useState<AdminActivity[]>([]);

  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const isAdminOrFull =
        currentUser?.role === "admin" || currentUser?.permissions?.all === true;
      const userSchools = isAdminOrFull
        ? data.availableSchools || []
        : Object.keys(currentUser?.permissions?.schoolsAndBranches || {});

      const defaultSchools =
        currentUser?.selectedSchool === "all"
          ? userSchools
          : currentUser?.selectedSchool
            ? currentUser.selectedSchool
                .split(",")
                .map((s) => s.trim())
                .filter((s) => userSchools.includes(s))
            : [];

      setSelectedSchools(
        defaultSchools.length > 0 ? defaultSchools : userSchools,
      );

      if (currentUser?.selectedBranch) {
        setSelectedBranches([currentUser.selectedBranch]);
      }

      if (
        data.adminFollowUpTypes &&
        data.adminFollowUpTypes.length > 0 &&
        !selectedCategory
      ) {
        setSelectedCategory(data.adminFollowUpTypes[0]);
      }
    }
  }, [
    isOpen,
    data.availableSchools,
    currentUser,
    selectedCategory,
    data.adminFollowUpTypes,
  ]);

  useEffect(() => {
    const branches = new Set<string>();
    const isAdminOrFull =
      currentUser?.role === "admin" || currentUser?.permissions?.all === true;
    if (isAdminOrFull) {
      data.secretariatStudents?.forEach((s) => {
        if (s.branch) branches.add(s.branch);
      });
      data.secretariatStaff?.forEach((s) => {
        if (s.branch) branches.add(s.branch);
      });
      if (branches.size === 0) branches.add("بدون فرع مخصص");
    } else {
      selectedSchools.forEach((s) => {
        const sb = currentUser?.permissions?.schoolsAndBranches?.[s] || [];
        sb.forEach((b) => branches.add(b));
      });
    }
    const branchList = Array.from(branches);
    setAvailableBranches(branchList);

    if (selectedBranches.length > 0) {
      const validSelected = selectedBranches.filter((b) =>
        branchList.includes(b),
      );
      if (validSelected.length !== selectedBranches.length) {
        setSelectedBranches(validSelected);
      }
    }
  }, [
    selectedSchools,
    currentUser,
    data.secretariatStudents,
    data.secretariatStaff,
  ]);

  useEffect(() => {
    if (isOpen && selectedCategory) {
      const activeSchool = selectedSchools.length > 0 ? selectedSchools[0] : "";
      const activeBranch =
        selectedBranches.length > 0 ? selectedBranches[0] : "";
      const key = `${activeSchool}_${activeBranch}`;

      let initialActivities: AdminActivity[] = [];
      if (
        activeSchool &&
        activeBranch &&
        data.adminBranchActivities?.[key]?.[selectedCategory]
      ) {
        initialActivities = JSON.parse(
          JSON.stringify(data.adminBranchActivities[key][selectedCategory]),
        );
      } else if (data.adminActivitiesList?.[selectedCategory]) {
        initialActivities = JSON.parse(
          JSON.stringify(data.adminActivitiesList[selectedCategory]),
        );
      } else if (ACTIVITIES_DATA[selectedCategory]) {
        initialActivities = JSON.parse(
          JSON.stringify(ACTIVITIES_DATA[selectedCategory]),
        );
      }

      // Automatically add an empty row at the end if the last one isn't empty, or if list is empty
      if (
        initialActivities.length === 0 ||
        initialActivities[initialActivities.length - 1].text.trim() !== ""
      ) {
        initialActivities.push({ text: "", planned: "", evidence: "" });
      }

      setActivities(initialActivities);
    }
  }, [
    isOpen,
    selectedCategory,
    data.adminActivitiesList,
    data.adminBranchActivities,
    selectedBranches,
    selectedSchools,
  ]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!selectedCategory) {
      toast.error("الرجاء اختيار مجال التقرير أولاً");
      return;
    }

    // Filter out completely empty activities before saving
    const validActivities = activities.filter(
      (a) => a.text.trim() || String(a.planned).trim() || a.evidence.trim(),
    );

    if (selectedSchools.length > 0 && selectedBranches.length > 0) {
      const updatedAdminBranchActivities = {
        ...(data.adminBranchActivities || {}),
      };
      selectedSchools.forEach((school) => {
        selectedBranches.forEach((branch) => {
          const key = `${school}_${branch}`;
          if (!updatedAdminBranchActivities[key]) {
            updatedAdminBranchActivities[key] = {};
          }
          updatedAdminBranchActivities[key] = {
            ...updatedAdminBranchActivities[key],
            [selectedCategory]: validActivities,
          };
        });
      });
      updateData(
        { adminBranchActivities: updatedAdminBranchActivities },
        selectedSchools,
      );
    } else {
      const updatedAdminActivitiesList = {
        ...(data.adminActivitiesList || {}),
        [selectedCategory]: validActivities,
      };
      updateData(
        { adminActivitiesList: updatedAdminActivitiesList },
        selectedSchools,
      );
    }

    toast.success("تم الحفظ وتعميم المعايير بنجاح");
    onClose();
  };

  const handleAdd = () => {
    setActivities([...activities, { text: "", planned: "", evidence: "" }]);
  };

  const handleRemove = (index: number) => {
    const newActivities = [...activities];
    newActivities.splice(index, 1);
    if (
      newActivities.length === 0 ||
      newActivities[newActivities.length - 1].text.trim() !== ""
    ) {
      newActivities.push({ text: "", planned: "", evidence: "" });
    }
    setActivities(newActivities);
  };

  const handleChange = (
    index: number,
    field: keyof AdminActivity,
    value: string,
  ) => {
    const newActivities = [...activities];
    newActivities[index] = { ...newActivities[index], [field]: value };

    // Auto-add empty row if we just typed in the last row
    if (index === activities.length - 1 && value.trim() !== "") {
      newActivities.push({ text: "", planned: "", evidence: "" });
    }

    setActivities(newActivities);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        <div className="bg-gradient-to-l from-emerald-600 to-teal-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Users size={24} />
            </div>
            <h2 className="text-xl font-black">
              التحكم بمعايير الموظفين والعاملين (التقارير الفردية)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Building size={20} className="text-emerald-600" />
              البيانات الأساسية للمجال
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اسم المدارس المستهدفة
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-32 overflow-y-auto space-y-2">
                  {(currentUser?.role === "admin" ||
                  currentUser?.permissions?.all === true
                    ? data.availableSchools || []
                    : Object.keys(
                        currentUser?.permissions?.schoolsAndBranches || {},
                      )
                  ).map((s, idx) => (
                    <label
                      key={`school-${s}-${idx}`}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-emerald-500"
                        checked={selectedSchools.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedSchools([...selectedSchools, s]);
                          else
                            setSelectedSchools(
                              selectedSchools.filter((x) => x !== s),
                            );
                        }}
                      />
                      <span className="text-sm text-slate-700">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  الفروع المستهدفة
                </label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 h-32 overflow-y-auto space-y-2">
                  {availableBranches.map((b, idx) => (
                    <label
                      key={`branch-${b}-${idx}`}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-emerald-500"
                        checked={selectedBranches.includes(b)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedBranches([...selectedBranches, b]);
                          else
                            setSelectedBranches(
                              selectedBranches.filter((x) => x !== b),
                            );
                        }}
                      />
                      <span className="text-sm text-slate-700">{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  مجال التقرير
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="" disabled>
                    اختر المجال...
                  </option>
                  {(data.adminIndividualReportFields?.length
                    ? data.adminIndividualReportFields
                    : [
                        "متابعة مؤشرات سير العملية الإدارية والتربوية بالمدارس",
                        "متابعة المدير العام",
                        "متابعة مدير الفرع",
                        "متابعة إدارة الجودة",
                        "متابعة وكيل المدرسة",
                        "متابعة السكرتارية",
                        "متابعة المشرف التربوي",
                        "متابعة المشرف الإداري",
                        "متابعة المشرف الأكاديمي",
                        "متابعة المختص الاجتماعي",
                        "متابعة مسؤول معمل العلوم",
                        "متابعة مسؤول الأنشطة",
                        "متابعة مسؤول الرياضة",
                        "متابعة مسؤول الفنية",
                        "متابعة مسؤول المخازن",
                        "متابعة معمل الوسائل",
                        "متابعة مسؤول المكتبة",
                        "متابعة شاشة العرض",
                        "متابعة مهندس البيئة",
                        "متابعة الحراسة",
                        "متابعة حركة المواصلات",
                        "متابعة أداء المقصف",
                      ]
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedCategory && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <FileSpreadsheet size={20} className="text-emerald-600" />
                معايير التقييم للمجال: {selectedCategory}
              </h3>

              <div className="space-y-4">
                {activities.map((activity, idx) => {
                  const isEmptyRow =
                    idx === activities.length - 1 &&
                    !activity.text &&
                    !activity.planned &&
                    !activity.evidence;
                  return (
                    <div
                      key={`act-${idx}`}
                      className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border transition-all ${
                        isEmptyRow
                          ? "bg-slate-50/50 border-slate-200 border-dashed opacity-70 hover:opacity-100 focus-within:opacity-100 focus-within:border-emerald-400 focus-within:bg-white"
                          : "bg-slate-50 border-slate-200 hover:border-emerald-200"
                      }`}
                    >
                      <input
                        type="text"
                        value={activity.text}
                        onChange={(e) =>
                          handleChange(idx, "text", e.target.value)
                        }
                        placeholder="نص المعيار (مثلاً: الإشراف على صلاة الظهر)"
                        className="flex-[2] w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none font-bold text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-sm"
                      />
                      <input
                        type="text"
                        value={activity.planned}
                        onChange={(e) =>
                          handleChange(idx, "planned", e.target.value)
                        }
                        placeholder="المخطط (مثلاً: 22)"
                        className="flex-1 min-w-[120px] bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none font-bold text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-sm text-center"
                      />
                      <input
                        type="text"
                        value={activity.evidence}
                        onChange={(e) =>
                          handleChange(idx, "evidence", e.target.value)
                        }
                        placeholder="الشاهد (مثلاً: سجل المتابعة)"
                        className="flex-1 min-w-[140px] bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none font-bold text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all text-sm text-center"
                      />
                      <button
                        onClick={() => handleRemove(idx)}
                        className={`p-2 rounded-lg transition-colors ${isEmptyRow ? "text-slate-300 pointer-events-none" : "text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"}`}
                        title="حذف المعيار"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleAdd}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-3 rounded-xl border-2 border-dashed border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors font-bold"
              >
                <Plus size={20} />
                إضافة معيار جديد
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
          >
            <Save size={20} />
            تغيير وتعميم على المدارس والفروع المشتركة
          </button>
        </div>
      </motion.div>
    </div>
  );
};
