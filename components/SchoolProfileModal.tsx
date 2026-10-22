import React, { useState, useEffect } from "react";
import { X, Save, Upload, School, Building2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobal } from "../context/GlobalState";
import { toast } from "sonner";

interface SchoolProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data, updateData, currentUser } = useGlobal();

  const [ministry, setMinistry] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [logoImg, setLogoImg] = useState("");
  const [branchManager, setBranchManager] = useState("");
  const [generalManager, setGeneralManager] = useState("");

  const availableSchools =
    currentUser?.selectedSchool === "all"
      ? (data.availableSchools || []).filter(Boolean)
      : (currentUser?.selectedSchool || "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "all" && s) || [];

  // Load defaults from first available selected school if exists
  useEffect(() => {
    if (isOpen) {
      // First, prioritize schools the user is actually currently working in (from session)
      const sessionSchools = currentUser?.selectedSchool?.split(",").map(s => s.trim()).filter(s => s !== "all") || [];
      
      // But only use them if they are in the availableSchools list (which means they have permissions)
      const allowedAvailable = (data.availableSchools || []).filter(sch => 
        currentUser?.role === "admin" || 
        currentUser?.permissions?.all === true || 
        availableSchools.includes(sch)
      );

      let initialSchool = "";
      if (sessionSchools.length > 0 && availableSchools.includes(sessionSchools[0])) {
        initialSchool = sessionSchools[0];
      } else if (availableSchools.length > 0) {
        initialSchool = availableSchools[0];
      }

      if (initialSchool) {
        setSelectedSchool(initialSchool);
      } else {
        setSelectedSchool("");
        setMinistry("");
        setDistrict("");
        setBranchManager("");
        setGeneralManager("");
        setYear("");
        setLogoImg("");
        setSelectedBranch("");
      }
    }
  }, [isOpen, data.availableSchools, currentUser, availableSchools]);

  useEffect(() => {
    if (selectedSchool) {
      const schoolProfiles = (data.profiles?.[selectedSchool] || {}) as any;
      let profileToEdit = schoolProfiles;

      // If a branch is selected, edit that specific branch
      if (selectedBranch && schoolProfiles[selectedBranch]) {
        profileToEdit = schoolProfiles[selectedBranch];
      }
      // Else if it's the new branch-based map format but no legacy properties, pick the first branch to prepopulate
      else if (schoolProfiles.ministry === undefined) {
        const firstBranchKey = Object.keys(schoolProfiles)[0];
        if (
          firstBranchKey &&
          typeof schoolProfiles[firstBranchKey] === "object"
        ) {
          profileToEdit = schoolProfiles[firstBranchKey];
        }
      }

      setMinistry(profileToEdit.ministry || "");
      setDistrict(profileToEdit.district || "");
      setBranchManager(profileToEdit.branchManager || "");
      setGeneralManager(profileToEdit.generalManager || "");
      setYear(profileToEdit.year || "");
      setLogoImg(profileToEdit.logoImg || "");
    }
  }, [selectedSchool, selectedBranch, data.profiles]);

  const userFullData = data.users?.find((u) => u.id === currentUser?.id);
  const availableYears = (userFullData?.academicYears?.length
    ? userFullData.academicYears
    : data.availableYears || []).filter(Boolean);

  const [year, setYear] = useState("");

  // Combine all branches for the selected school from data.schoolBranches
  // Falls back to user's permissions.schoolsAndBranches if global data hasn't loaded
  const availableBranches = selectedSchool
    ? (() => {
        const trimmedSchool = selectedSchool.trim();
        let branches = (data.schoolBranches?.[trimmedSchool] || []).filter(Boolean);
        const isAdminOrFull =
          currentUser?.role === "admin" ||
          currentUser?.permissions?.all === true;
        if (!isAdminOrFull) {
          const freshUser = (data.users || []).find((u) => u.id === currentUser?.id);
          const userPermsMap = freshUser?.permissions?.schoolsAndBranches || currentUser?.permissions?.schoolsAndBranches || {};
          
          // Try to find the school in the user's perms map using trimmed keys
          let allowed: string[] = [];
          Object.keys(userPermsMap).forEach(key => {
            if (key.trim() === trimmedSchool) {
              allowed = (userPermsMap[key] || []).filter(Boolean);
            }
          });
          
          if (allowed.length > 0) {
            if (branches.length > 0) {
              // Global branches exist - filter to only allowed ones
              branches = branches.filter((b) => b && allowed.includes(b.trim()));
            } else {
              // FALLBACK: data.schoolBranches is empty (not loaded yet or doesn't exist)
              // Use the user's permission branches directly as the source of truth
              branches = [...allowed];
            }
          }
          // If allowed.length === 0, the user has the school but no specific branch restrictions
          // In this case, show ALL branches for this school (don't filter)
        }
        return branches.filter(Boolean);
      })()
    : [];

  // Auto-select branch if there's only one or if none is selected but branches exist
  useEffect(() => {
    if (selectedSchool && availableBranches.length > 0 && !selectedBranch) {
      setSelectedBranch(availableBranches[0]);
    }
  }, [selectedSchool, availableBranches, selectedBranch]);

  const handleSchoolToggle = (school: string) => {
    setSelectedSchool(school);
    setSelectedBranch(""); // Reset branch when school changes
  };

  const handleBranchToggle = (branch: string) => {
    setSelectedBranch(branch);
  };

  const [isSpecialChangeMode, setIsSpecialChangeMode] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [selectedSpecUsers, setSelectedSpecUsers] = useState<string[]>([]);

  // Users belonging to selected school and branch
  const availableUsers = (data.users || []).filter((u) => {
    if (!u.id) return false;
    // Exclude General Supervisor completely
    if (u.name === "المشرف العام" || u.permissions?.all === true) return false;

    if (!selectedSchool) return false;
    // Admins or users that have this school
    if (u.role === "admin") return true;
    if (!u.schools?.includes(selectedSchool)) return false;
    // Check branch permissions
    if (selectedBranch && u.permissions?.schoolsAndBranches?.[selectedSchool]) {
      return u.permissions.schoolsAndBranches[selectedSchool].includes(selectedBranch);
    }
    return true; // Default include if branch logic doesn't strictly apply
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error(
          "حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.",
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setLogoImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndBroadcast = () => {
    if (!selectedSchool || selectedSchool === "all") {
      toast.error("يرجى اختيار مدرسة محددة لتعديل ملفها");
      return;
    }

    const existingSchoolProfiles = (data.profiles?.[selectedSchool] ||
      {}) as any;

    // Get the profile specifically for the branch we are editing, or default to an empty object if not found.
    // If it's a legacy flat structure, we extract that.
    let currentBranchProfile = {};
    if (selectedBranch && existingSchoolProfiles[selectedBranch]) {
      currentBranchProfile = existingSchoolProfiles[selectedBranch];
    } else if (existingSchoolProfiles.ministry !== undefined) {
      currentBranchProfile = { ...existingSchoolProfiles };
      // clean up legacy map artifacts
      delete (currentBranchProfile as any).lastUpdated;
    }

    const updatedProfile = {
      ...currentBranchProfile,
      ministry,
      district,
      branchManager,
      generalManager,
      year,
      schoolName: selectedSchool,
    };

    if (selectedBranch) {
      (updatedProfile as any).branch = selectedBranch;
    } else {
      (updatedProfile as any).branch = "";
    }

    // We only set logoImg if a new one is uploaded, otherwise keep existing
    if (logoImg) {
      (updatedProfile as any).logoImg = logoImg;
    }

    if (isSpecialChangeMode) {
      if (selectedSpecUsers.length === 0) {
        toast.error("يرجى اختيار مستخدم واحد على الأقل");
        return;
      }

      const updatedUsers = (data.users || []).map((u) => {
        if (selectedSpecUsers.includes(u.id)) {
          const currentCustomProfiles = u.customSchoolProfiles || {};
          const currentSchoolProfiles = currentCustomProfiles[selectedSchool] || {};
          const key = selectedBranch || "";

          return {
            ...u,
            customSchoolProfiles: {
              ...currentCustomProfiles,
              [selectedSchool]: {
                ...currentSchoolProfiles,
                [key]: {
                  ...currentSchoolProfiles[key],
                  ...updatedProfile,
                },
              },
            },
          };
        }
        return u;
      });

      updateData({ users: updatedUsers }, [selectedSchool]);
      toast.success(`تم حفظ التغيير الخاص لـ (${selectedSpecUsers.length}) مستخدم بنجاح`);
      onClose();
      return;
    }

    // Update the profile in the new branch-based map format
    const payloadMap: any = { ...existingSchoolProfiles };

    // For legacy documents: if it's currently a flat Document, just migrate it to "الفرع الرئيسي" or its branch property
    if (payloadMap.ministry !== undefined) {
      const legacyBranch = payloadMap.branch || "الفرع الرئيسي";
      payloadMap[legacyBranch] = { ...existingSchoolProfiles };
      // Remove all flat fields from the payloadMap (which will now hold branches as keys)
      const flatFields = [
        "ministry", "district", "schoolName", "logoImg", 
        "branchManager", "generalManager", "year", "branch", "lastUpdated"
      ];
      flatFields.forEach(f => delete payloadMap[f]);
    }

    if (selectedBranch) {
      payloadMap[selectedBranch] = {
        ...updatedProfile,
        branch: selectedBranch,
      };
    } else {
      // If no branch is explicitly selected (and branches exist), 
      // we might want to update the "General Settings" or the first branch.
      // But based on user request, it should be the branch chosen.
      const branchKey = selectedBranch || "اعدادات عامة";
      payloadMap[branchKey] = {
        ...updatedProfile,
        branch: branchKey === "اعدادات عامة" ? "" : branchKey,
      };
    }

    // Explicitly target ONLY the selected school to ensure isolation
    updateData({ profile: payloadMap as any }, [selectedSchool]);
    toast.success(`تم حفظ تعديلات مدرسة (${selectedSchool}) - فرع (${selectedBranch || "العام"}) بنجاح`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-white flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-200/50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                <School size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  ملف المدرسة
                </h2>
                <p className="text-sm text-slate-500 font-bold">
                  البيانات الأساسية المستقلة لكل مدرسة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUserSelection(true)}
                className="px-4 py-2 bg-slate-100 text-blue-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors text-sm"
              >
                تغيير خاص
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-200/50 text-slate-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  اسم الوزارة
                </label>
                <input
                  type="text"
                  value={ministry}
                  onChange={(e) => setMinistry(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-500" />
                  اسم المنطقة التعليمية
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {isSpecialChangeMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-800 text-sm mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                  <span className="font-bold">وضع التغيير الخاص: </span>
                  <span>سيتم تطبيق التعديلات فقط على المستخدمين المختارين أدناه.</span>
                </div>
                <div className="space-y-1 pr-4 border-r-2 border-blue-200">
                  {data.users?.filter(u => selectedSpecUsers.includes(u.id)).map(u => (
                    <div key={u.id} className="flex items-center gap-2">
                      <span className="font-bold">{u.name}</span>
                      <span className="text-blue-400">|</span>
                      <span>{selectedBranch || "الفرع الرئيسي"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 p-5 bg-white/50 rounded-2xl border border-slate-200/50 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <div className="w-2 h-5 bg-violet-500 rounded-full" />
                  قائمة المدارس المتاحة
                </label>
                {isSpecialChangeMode && <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">وضع التغيير الخاص نشط (المدرسة مقيدة)</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSchools.map((sch) => (
                  <button
                    key={sch}
                    onClick={() => !isSpecialChangeMode && handleSchoolToggle(sch)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 transform active:scale-95 ${
                      selectedSchool === sch
                        ? "bg-gradient-to-l from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/20 translate-y-[-2px]"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-violet-300 hover:text-violet-600"
                    } ${isSpecialChangeMode ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <School size={16} />
                      {sch}
                    </div>
                  </button>
                ))}
                {availableSchools.length === 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 w-full text-center text-sm text-slate-400 font-medium">
                    لا يوجد مدارس ضمن صلاحياتك حالياً
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedSchool && (
                <motion.div
                  key={selectedSchool}
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 p-5 bg-white/80 rounded-2xl border border-blue-100 shadow-md overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60" />
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-5 bg-blue-500 rounded-full" />
                      الفروع التابعة للمدرسة
                    </label>
                    {isSpecialChangeMode && <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">الفرع مقيد</span>}
                  </div>
                  
                  {availableBranches.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableBranches.map((branch) => (
                        <button
                          key={branch}
                          onClick={() => !isSpecialChangeMode && handleBranchToggle(branch)}
                          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 transform active:scale-95 ${
                            selectedBranch === branch
                              ? "bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-xl shadow-blue-500/20 translate-y-[-2px]"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
                          } ${isSpecialChangeMode ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 size={16} />
                            {branch}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-dashed border-blue-100 w-full text-center text-sm text-blue-400 font-medium">
                      لا توجد فروع مسجلة لهذه المدرسة أو ضمن صلاحياتك
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">
                  العام الدراسي
                </label>
                <div className="flex gap-2">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                    dir="rtl"
                  >
                    <option value="">اختر العام الدراسي</option>
                    {availableYears.map((y: string) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  {(currentUser?.role === "admin" ||
                    currentUser?.permissions?.all) && (
                    <button
                      type="button"
                      title="إضافة عام دراسي جديد للنظام"
                      onClick={() => {
                        const newY = window.prompt(
                          "أدخل العام الدراسي الجديد (مثال: 1445-1446):",
                        );
                        if (newY && !data.availableYears?.includes(newY)) {
                          const updatedYears = [
                            ...(data.availableYears || []),
                            newY,
                          ];
                          updateData({ availableYears: updatedYears });
                          setYear(newY);
                          toast.success("تم إضافة العام الدراسي وتعميمه");
                        }
                      }}
                      className="px-4 py-3 bg-violet-100 text-violet-700 rounded-xl hover:bg-violet-200 transition-colors font-bold text-sm flex items-center justify-center whitespace-nowrap"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">
                  مدير الفرع
                </label>
                <input
                  type="text"
                  value={branchManager}
                  onChange={(e) => setBranchManager(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">
                  المدير العام
                </label>
                <input
                  type="text"
                  value={generalManager}
                  onChange={(e) => setGeneralManager(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">
                شعار المدرسة
              </label>
              <div className="relative w-full max-w-[200px] h-32 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group hover:border-violet-400 transition-colors cursor-pointer">
                {logoImg ? (
                  <img
                    src={logoImg}
                    className="w-full h-full object-contain p-2"
                    alt="شعار المدرسة"
                  />
                ) : (
                  <div className="text-slate-400 font-bold flex flex-col items-center">
                    <Upload
                      size={24}
                      className="mb-2 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-xs">رفع الشعار</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200/50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveAndBroadcast}
              className="px-6 py-3 bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Save size={20} />
              حفظ التغييرات
            </button>
          </div>
        </motion.div>
      </div>

      {showUserSelection && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-white"
          >
            <h3 className="text-xl font-black text-slate-800 mb-4">تغيير خاص (اختيار المستخدمين)</h3>
            <p className="text-sm text-slate-600 mb-4">
              اختر المستخدمين الذين ترغب بتطبيق التعديلات على ملفهم الشخصي فقط في مدرسة ({selectedSchool}) فرع ({selectedBranch || 'عام'}).
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl p-2 bg-slate-50">
              {availableUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={selectedSpecUsers.includes(u.id)} 
                    onChange={(e) => {
                      if (e.target.checked) setSelectedSpecUsers([...selectedSpecUsers, u.id]);
                      else setSelectedSpecUsers(selectedSpecUsers.filter(id => id !== u.id));
                    }} 
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{u.name}</span>
                    <span className="text-xs text-slate-500">{u.role === 'admin' ? 'مدير' : 'مستخدم'}</span>
                  </div>
                </label>
              ))}
              {availableUsers.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">لا يوجد مستخدمين آخرين في هذا الفرع.</div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => { setShowUserSelection(false); setSelectedSpecUsers([]); setIsSpecialChangeMode(false); }} 
                className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={() => { setShowUserSelection(false); setIsSpecialChangeMode(true); }} 
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                disabled={selectedSpecUsers.length === 0}
              >
                موافق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
