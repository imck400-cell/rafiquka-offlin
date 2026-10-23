import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useGlobal } from "../context/GlobalState";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Users,
  School,
  Calendar,
  Key,
  ChevronDown,
  ChevronLeft,
  Database,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserEditModal, { getPermissionsForJobs } from "./UserEditModal";
import ConfirmDialog from "./ConfirmDialog";
import { User } from "../types";
import * as XLSX from "xlsx-js-style";
import { toast } from "sonner";

const GroupedUsersRenderer: React.FC<{
  users: User[];
  onEditUser: (user: User) => void;
}> = ({ users, onEditUser }) => {
  const { data, updateData, currentUser } = useGlobal();
  const isReadOnly =
    currentUser?.permissions?.readOnly === true ||
    (Array.isArray(currentUser?.permissions?.userManagement) &&
      currentUser.permissions.userManagement.includes("disable"));

  const [expandedSchools, setExpandedSchools] = useState<
    Record<string, boolean>
  >({});
  const [expandedBranches, setExpandedBranches] = useState<
    Record<string, boolean>
  >({});
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const grouped: Record<string, Record<string, Record<string, User[]>>> = {};
  users.forEach((u) => {
    const activeSchools = (u.schools || []).map((s) => s?.trim()).filter(Boolean);
    const schools = activeSchools.length > 0 ? activeSchools : ["بدون مدرسة"];
    schools.forEach((school) => {
      let branches = (u.permissions?.schoolsAndBranches?.[school] || [])
        .map((b) => b?.trim())
        .filter(Boolean);
      if (branches.length === 0) branches = ["بدون فرع"];

      branches.forEach((branch) => {
        const job = u.jobTitle?.trim() || "بدون وظيفة";
        if (!grouped[school]) grouped[school] = {};
        if (!grouped[school][branch]) grouped[school][branch] = {};
        if (!grouped[school][branch][job]) grouped[school][branch][job] = [];

        if (
          !grouped[school][branch][job].some((existing) => existing.id === u.id)
        ) {
          grouped[school][branch][job].push(u);
        }
      });
    });
  });

  const toggleSchool = (s: string) =>
    setExpandedSchools((prev) => ({ ...prev, [s]: !prev[s] }));
  const toggleBranch = (b: string) =>
    setExpandedBranches((prev) => ({ ...prev, [b]: !prev[b] }));
  const toggleJob = (j: string) =>
    setExpandedJobs((prev) => ({ ...prev, [j]: !prev[j] }));

  const handleDeleteUserClick = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد حذف المستخدم",
      message: `هل أنت متأكد من حذف المستخدم "${user.name || 'بدون اسم'}" بشكل نهائي من البرنامج؟ لن يبقى له أي أثر ولا يمكن التراجع عن هذا الإجراء.`,
      onConfirm: () => {
        const updatedUsers = data.users.filter((u) => u.id !== user.id);
        const deletedName = user.name?.trim().toLowerCase();
        const nextStaff = Array.isArray(data.secretariatStaff)
          ? data.secretariatStaff.filter(
              (s) => s.name?.trim().toLowerCase() !== deletedName
            )
          : [];

        let targetSchools = Array.isArray(user.schools) ? [...user.schools] : [];
        if (user.role === "admin" || user.permissions?.all) {
          targetSchools = data.availableSchools || [];
        }

        updateData({ users: updatedUsers }, targetSchools);

        const activeSchool = currentUser?.selectedSchool?.split(",")[0]?.trim();
        if (user.schools?.includes(activeSchool) || user.role === "admin" || user.permissions?.all) {
          updateData({ secretariatStaff: nextStaff });
        }
        toast.success("تم حذف المستخدم نهائياً بنجاح!");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteSchoolClick = (schoolName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد حذف المدرسة وكل ما تحتها",
      message: schoolName === "بدون مدرسة"
        ? `هل أنت متأكد من حذف جميع المستخدمين غير المرتبطين بأي مدرسة بشكل نهائي؟`
        : `هل أنت متأكد من حذف المدرسة "${schoolName}" بشكل نهائي؟ سيتم حذفها من القوائم وفك ارتباط جميع المستخدمين بها وحذفهم إن لم يكن لديهم مدارس أخرى.`,
      onConfirm: () => {
        let updatedAvailableSchools = data.availableSchools || [];
        let updatedSchoolBranches = { ...(data.schoolBranches || {}) };

        if (schoolName !== "بدون مدرسة") {
          updatedAvailableSchools = updatedAvailableSchools.filter((s) => s !== schoolName);
          delete updatedSchoolBranches[schoolName];
        }

        const updatedUsers = data.users.map((u) => {
          const userSchools = u.schools || [];
          if (userSchools.includes(schoolName)) {
            const nextSchools = userSchools.filter((s) => s !== schoolName);
            const nextSchoolsAndBranches = { ...(u.permissions?.schoolsAndBranches || {}) };
            delete nextSchoolsAndBranches[schoolName];

            return {
              ...u,
              schools: nextSchools,
              permissions: {
                ...u.permissions,
                schoolsAndBranches: nextSchoolsAndBranches,
              },
            };
          }
          return u;
        }).filter((u) => {
          if (u.role === "admin" || u.permissions?.all === true) return true;
          return Array.isArray(u.schools) && u.schools.length > 0;
        });

        const nextStaff = Array.isArray(data.secretariatStaff)
          ? data.secretariatStaff.filter((s) => s.school !== schoolName)
          : [];

        const targetSchools = data.availableSchools || [];

        updateData(
          {
            users: updatedUsers,
            availableSchools: updatedAvailableSchools,
            schoolBranches: updatedSchoolBranches,
            secretariatStaff: nextStaff,
          },
          targetSchools
        );
        toast.success("تم حذف المدرسة وفك ارتباط مستخدميها بنجاح!");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteBranchClick = (schoolName: string, branchName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد حذف الفرع والمستخدمين تحت مسمى الفرع",
      message: `هل أنت متأكد من حذف الفرع "${branchName}" التابع لمدرسة "${schoolName}" وكل ما تحته من مستخدمين؟`,
      onConfirm: () => {
        let updatedSchoolBranches = { ...(data.schoolBranches || {}) };
        if (branchName !== "بدون فرع" && updatedSchoolBranches[schoolName]) {
          updatedSchoolBranches[schoolName] = updatedSchoolBranches[schoolName].filter((b) => b !== branchName);
        }

        const updatedUsers = data.users.map((u) => {
          const userSchools = u.schools || [];
          if (userSchools.includes(schoolName)) {
            const sab = u.permissions?.schoolsAndBranches?.[schoolName] || [];
            const isUserInBranch = branchName === "بدون فرع" 
              ? sab.length === 0 
              : sab.includes(branchName);

            if (isUserInBranch) {
              const nextSab = sab.filter((b) => b !== branchName);
              const nextSchoolsAndBranches = { ...(u.permissions?.schoolsAndBranches || {}) };
              
              if (nextSab.length > 0) {
                nextSchoolsAndBranches[schoolName] = nextSab;
                return {
                  ...u,
                  permissions: {
                    ...u.permissions,
                    schoolsAndBranches: nextSchoolsAndBranches,
                  },
                };
              } else {
                const nextSchools = userSchools.filter((s) => s !== schoolName);
                delete nextSchoolsAndBranches[schoolName];
                return {
                  ...u,
                  schools: nextSchools,
                  permissions: {
                    ...u.permissions,
                    schoolsAndBranches: nextSchoolsAndBranches,
                  },
                };
              }
            }
          }
          return u;
        }).filter((u) => {
          if (u.role === "admin" || u.permissions?.all === true) return true;
          return Array.isArray(u.schools) && u.schools.length > 0;
        });

        updateData(
          {
            users: updatedUsers,
            schoolBranches: updatedSchoolBranches,
          },
          [schoolName]
        );
        toast.success("تم حذف الفرع والمستخدمين المرتبطين به بنجاح!");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteJobClick = (schoolName: string, branchName: string, jobName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "تأكيد حذف الوظيفة",
      message: `هل أنت متأكد من حذف الوظيفة "${jobName}" تحت الفرع "${branchName}" بمدرسة "${schoolName}" وكل مستخدميها بشكل نهائي؟`,
      onConfirm: () => {
        const updatedUsers = data.users.map((u) => {
          const userSchools = u.schools || [];
          const jobMatches = jobName === "بدون وظيفة" 
            ? (!u.jobTitle || u.jobTitle === "") 
            : (u.jobTitle === jobName);

          if (userSchools.includes(schoolName) && jobMatches) {
            const sab = u.permissions?.schoolsAndBranches?.[schoolName] || [];
            const branchMatches = branchName === "بدون فرع"
              ? sab.length === 0
              : sab.includes(branchName);

            if (branchMatches) {
              const nextSchoolsAndBranches = { ...(u.permissions?.schoolsAndBranches || {}) };
              
              if (branchName !== "بدون فرع") {
                const nextSab = sab.filter((b) => b !== branchName);
                if (nextSab.length > 0) {
                  nextSchoolsAndBranches[schoolName] = nextSab;
                  return {
                    ...u,
                    permissions: {
                      ...u.permissions,
                      schoolsAndBranches: nextSchoolsAndBranches,
                    },
                  };
                }
              }

              const nextSchools = userSchools.filter((s) => s !== schoolName);
              delete nextSchoolsAndBranches[schoolName];
              return {
                ...u,
                schools: nextSchools,
                permissions: {
                  ...u.permissions,
                  schoolsAndBranches: nextSchoolsAndBranches,
                },
              };
            }
          }
          return u;
        }).filter((u) => {
          if (u.role === "admin" || u.permissions?.all === true) return true;
          return Array.isArray(u.schools) && u.schools.length > 0;
        });

        updateData({ users: updatedUsers }, [schoolName]);
        toast.success("تم حذف الوظيفة وفك ارتباط مستخدميها بنجاح!");
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  if (users.length === 0)
    return (
      <div className="text-slate-400 text-sm font-bold p-4 text-center">
        لا يوجد مستخدمين
      </div>
    );

  return (
    <div className="space-y-3">
      {Object.keys(grouped).map((school, sIdx) => (
        <div
          key={school ? school : `school-${sIdx}`}
          className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"
        >
          <div className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => toggleSchool(school)}
              className="flex-1 flex items-center gap-2 font-black text-slate-700 text-right hover:text-blue-600 transition-colors"
            >
              <School size={18} /> {school}
            </button>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSchoolClick(school);
                  }}
                  className="p-1.5 bg-white text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg shadow-sm border border-slate-200 transition-all"
                  title="حذف المدرسة بالكامل"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => toggleSchool(school)}
                className="p-1 hover:bg-slate-200 rounded-md transition-colors"
              >
                {expandedSchools[school] ? (
                  <ChevronDown size={18} className="text-slate-400" />
                ) : (
                  <ChevronLeft size={18} className="text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {expandedSchools[school] && (
            <div className="p-4 pt-2 space-y-3 border-t border-slate-100">
              {Object.keys(grouped[school]).map((branch, bIdx) => {
                const branchKey = `${school}-${branch}`;
                return (
                  <div
                    key={branchKey ? branchKey : `branch-${bIdx}`}
                    className="border border-indigo-100 rounded-xl overflow-hidden mr-4"
                  >
                    <div className="w-full flex items-center justify-between p-3 bg-indigo-50/50 border-b border-indigo-100">
                      <button
                        onClick={() => toggleBranch(branchKey)}
                        className="flex-1 text-right font-bold text-indigo-700 text-sm hover:text-indigo-900 transition-colors"
                      >
                        {branch}
                      </button>
                      <div className="flex items-center gap-2">
                        {!isReadOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBranchClick(school, branch);
                            }}
                            className="p-1.5 bg-white text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg shadow-sm border border-slate-200 transition-all"
                            title="حذف الفرع"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleBranch(branchKey)}
                          className="p-1 hover:bg-indigo-150 rounded-md transition-colors"
                        >
                          {expandedBranches[branchKey] ? (
                            <ChevronDown size={16} className="text-indigo-400" />
                          ) : (
                            <ChevronLeft size={16} className="text-indigo-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedBranches[branchKey] && (
                      <div className="p-3 pt-1 space-y-2 border-t border-indigo-50 bg-white">
                        {Object.keys(grouped[school][branch]).map((job, jIdx) => {
                          const jobKey = `${school}-${branch}-${job}`;
                          const jobUsers = grouped[school][branch][job];
                          return (
                            <div
                              key={jobKey ? jobKey : `job-${jIdx}`}
                              className="border border-emerald-100 rounded-lg overflow-hidden mr-4"
                            >
                              <div className="w-full flex items-center justify-between p-2 bg-emerald-50/30 border-b border-emerald-100">
                                <button
                                  onClick={() => toggleJob(jobKey)}
                                  className="flex-1 text-right font-bold text-emerald-700 text-xs hover:text-emerald-900 transition-colors flex items-center gap-2"
                                >
                                  {job}{" "}
                                  <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
                                    {jobUsers.length}
                                  </span>
                                </button>
                                <div className="flex items-center gap-1.5">
                                  {!isReadOnly && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteJobClick(school, branch, job);
                                      }}
                                      className="p-1 bg-white text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-md shadow-sm border border-slate-200 transition-all"
                                      title="حذف الوظيفة وكل مستخدميها"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => toggleJob(jobKey)}
                                    className="p-0.5 hover:bg-emerald-100 rounded transition-colors"
                                  >
                                    {expandedJobs[jobKey] ? (
                                      <ChevronDown
                                        size={14}
                                        className="text-emerald-400"
                                      />
                                    ) : (
                                      <ChevronLeft
                                        size={14}
                                        className="text-emerald-400"
                                      />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {expandedJobs[jobKey] && (
                                <div className="p-2 bg-white flex flex-col gap-2">
                                  {jobUsers.map((user: User, uIdx) => (
                                    <div
                                      key={user.id ? user.id : `user-${uIdx}`}
                                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between mr-2"
                                    >
                                      <div>
                                        <div className="font-black text-slate-800 text-sm">
                                          {user.name}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-1">
                                          <Key size={10} /> {user.code}
                                          {user.role === "admin" && (
                                            <span className="text-red-500 mr-1 bg-red-100 px-1 rounded text-[10px]">
                                              (مدير)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => onEditUser(user)}
                                          className="p-1.5 bg-white text-slate-450 hover:text-blue-600 rounded-lg shadow-sm hover:shadow-md transition-all border border-slate-200"
                                          title="تعديل بيانات المستخدم"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        {!isReadOnly && (
                                          <button
                                            onClick={() => handleDeleteUserClick(user)}
                                            className="p-1.5 bg-white text-slate-450 hover:text-red-650 rounded-lg shadow-sm hover:shadow-md transition-all border border-slate-200"
                                            title="حذف المستخدم نهائياً"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
        type="danger"
        confirmText="حذف نهائي"
        cancelText="تراجع"
      />
    </div>
  );
};

const jobsOptions = [
  "المشرف العام", "نائب المشرف العام", "مدير عام", "مدير فرع", "الإدارة المالية", 
  "المحاسب", "أمين صندوق", "وكيل إداري", "وكيل أكاديمي", "مدير الموارد البشرية", 
  "إدارة الجودة", "مدير العلاقات", "المشرف التربوي", "المشرف الأكاديمي", "المشرف الإداري", 
  "السكرتارية", "المختص الاجتماعي", "مسؤول معمل العلوم", "مسؤول الوسائل", "مسؤول المكتبة", 
  "مسؤول الأنشطة", "معلم فنية", "معلم الرياضة", "معلم مادة", "مربية", 
  "مسؤول الحركة", "الحراسة", "مهندس البيئة", "مسؤول المقصف"
];

const gradesOptions = [
  "تمهيدي", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"
];

const sectionsOptions = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

const permissionsOptions = [
  "كامل الصلاحيات", "الرئيسية", "متابعة المعلمين", "متابعة الموظفين", "شؤون الطلاب", 
  "التغطية", "ملف المدرسة", "السكرتارية", "بوابة المعلم", "الإشراف التربوي", 
  "مسؤول الحركة والمواصلات", "التحكم بالصلاحيات", "التحكم بالمستخدمين", "قراءة فقط"
];

const subjectsList = [
  "مربية", "القرآن الكريم", "التربية الإسلامية", "اللغة العربية", "اللغة الإنجليزية", 
  "الرياضيات", "العلوم", "الكيمياء", "الفيزياء", "الأحياء", "الاجتماعيات", "الحاسوب",
  "الإرشاد", "المهارات الحياتية"
];

const CheckboxDropdown: React.FC<{
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  onApply?: () => void;
  onSave?: () => void;
  onCancel: () => void;
  title?: string;
}> = ({ options, selected, onChange, onApply, onSave, onCancel, title }) => {
  const [search, setSearch] = useState("");
  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  
  const [openUpward, setOpenUpward] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    zIndex: 9999,
  });

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!placeholderRef.current) return;
      const parentEl = placeholderRef.current.parentElement;
      if (!parentEl) return;
      
      const rect = parentEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let upward = false;
      let calcMaxHeight = 320;
      
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow < 290 && spaceAbove > spaceBelow) {
        upward = true;
        calcMaxHeight = Math.max(180, spaceAbove - 20);
      } else {
        upward = false;
        calcMaxHeight = Math.max(180, spaceBelow - 20);
      }
      
      let left = rect.right - 256;
      if (left < 10) {
        left = Math.max(10, rect.left);
      }
      if (left + 256 > viewportWidth - 10) {
        left = Math.max(10, viewportWidth - 266);
      }
      
      const nextStyle: React.CSSProperties = {
        position: 'fixed',
        width: '256px',
        left: `${left}px`,
        maxHeight: `${calcMaxHeight}px`,
        visibility: 'visible',
        zIndex: 9999,
      };
      
      if (upward) {
        nextStyle.bottom = `${viewportHeight - rect.top + 4}px`;
      } else {
        nextStyle.top = `${rect.bottom + 4}px`;
      }
      
      setStyle(nextStyle);
      setOpenUpward(upward);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      if (containerRef.current && containerRef.current.contains(event.target as Node)) {
        return;
      }
      onCancel();
    };
    
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [onCancel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <>
      <span ref={placeholderRef} className="hidden" />
      {createPortal(
        <div
          ref={containerRef}
          style={style}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 flex flex-col text-slate-800 font-arabic font-bold text-xs text-right animate-in fade-in zoom-in duration-150"
        >
          {title && <div className="text-[10px] text-slate-400 mb-1 border-b pb-1">{title}</div>}
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs mb-2 font-bold"
          />
          <div className="flex justify-between items-center mb-2 px-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-650 hover:underline text-[10px]"
            >
              {selected.length === options.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
            </button>
            <span className="text-[10px] text-slate-500">المحدد: {selected.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mb-2 pr-1 min-h-0">
            {filteredOptions.map((opt, idx) => {
              const isChecked = selected.includes(opt);
              return (
                <label
                  key={`opt-${opt}-${idx}`}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-right justify-start"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(opt)}
                    className="rounded border-slate-350 text-indigo-650 w-3.5 h-3.5 focus:ring-indigo-500"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="text-center text-slate-400 py-4">لا توجد نتائج</div>
            )}
          </div>
          <div className="flex gap-2 border-t pt-2 mt-auto">
            {onApply ? (
              <button
                type="button"
                onClick={onApply}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black"
              >
                تعميم
              </button>
            ) : (
              <button
                type="button"
                onClick={onSave}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black"
              >
                تطبيق
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg text-[10px] font-bold"
            >
              إلغاء
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

interface AccessCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  enteredPassword?: string;
}

const AccessCodesModal: React.FC<AccessCodesModalProps> = ({
  isOpen,
  onClose,
  enteredPassword,
}) => {
  const { data, updateData, currentUser, effectiveUserIds } = useGlobal();
  const isReadOnly =
    currentUser?.permissions?.readOnly === true ||
    (Array.isArray(currentUser?.permissions?.userManagement) &&
      currentUser.permissions.userManagement.includes("disable"));
  const [newSchool, setNewSchool] = useState("");
  const [newYear, setNewYear] = useState("");
  const [selectedSchoolForBranch, setSelectedSchoolForBranch] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // States for "School and Users Data" modal
  const [isSchoolUsersModalOpen, setIsSchoolUsersModalOpen] = useState(false);
  const [filterSchool, setFilterSchool] = useState("الكل");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [filterUser, setFilterUser] = useState("");
  const [filterJob, setFilterJob] = useState("الكل");
  const [filterGrade, setFilterGrade] = useState("الكل");
  const [filterSection, setFilterSection] = useState("الكل");
  const [filterPermission, setFilterPermission] = useState("الكل");
  const [hasClickedOk, setHasClickedOk] = useState(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

  // States for interactive cells and generalization (تعميم)
  const [activeHeaderDropdown, setActiveHeaderDropdown] = useState<string | null>(null);
  const [headerSelections, setHeaderSelections] = useState<Record<string, string[]>>({
    schools: [],
    branches: [],
    job: [],
    subjects: [],
    grades: [],
    sections: [],
    years: []
  });
  const [activeCellEdit, setActiveCellEdit] = useState<{ userId: string; field: string; schoolContext?: string } | null>(null);
  const [cellSelections, setCellSelections] = useState<string[]>([]);

  // States for checkmarking and confirmations
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [duplicateResolutionData, setDuplicateResolutionData] = useState<{
    isOpen: boolean;
    duplicatesList: { row: any; existing: any }[];
    uniqueRows: any[];
  }>({
    isOpen: false,
    duplicatesList: [],
    uniqueRows: [],
  });
  const [resolvedDuplicateUserIds, setResolvedDuplicateUserIds] = useState<string[]>([]);

  const handleSendToStaffTable = () => {
    if (isReadOnly) {
      toast.error("صلاحياتك الحالية قراءة فقط.");
      return;
    }

    const incomingRows = selectedUserIds.length > 0
      ? filteredUsersRows.filter(r => selectedUserIds.includes(r.userId))
      : filteredUsersRows;

    if (incomingRows.length === 0) {
      toast.warning("لا توجد بيانات لإرسالها.");
      return;
    }

    const existingStaff = data.secretariatStaff || [];
    const duplicatesList: { row: any; existing: any }[] = [];
    const uniqueRows: any[] = [];

    incomingRows.forEach(row => {
      const match = existingStaff.find(s => 
        s.name?.trim().toLowerCase() === row.userName?.trim().toLowerCase() &&
        s.school?.trim() === row.school?.trim() &&
        s.branch?.trim() === row.branch?.trim()
      );
      if (match) {
        duplicatesList.push({ row, existing: match });
      } else {
        uniqueRows.push(row);
      }
    });

    if (duplicatesList.length > 0) {
      setDuplicateResolutionData({
        isOpen: true,
        duplicatesList,
        uniqueRows,
      });
      setResolvedDuplicateUserIds([]); // Default: none selected
    } else {
      executeSendToStaff(uniqueRows, [], false);
    }
  };

  const executeSendToStaff = (
    uniques: any[],
    duplicatesList: { row: any; existing: any }[],
    isAdoptAll: boolean,
    selectedDupUserIds: string[] = []
  ) => {
    let newStaffList = Array.isArray(data.secretariatStaff) ? [...data.secretariatStaff] : [];
    let maxSerial = newStaffList.reduce((max, s) => Math.max(max, s.serialNumber || 0), 0);
    const targetSchoolsSet = new Set<string>();

    // 1. Process Unique Rows (always add)
    uniques.forEach(row => {
      maxSerial++;
      newStaffList.push({
        id: "staff-" + Date.now().toString() + Math.random().toString(36).substring(2, 7) + "-" + maxSerial,
        serialNumber: maxSerial,
        school: row.school,
        branch: row.branch,
        name: row.userName,
        gender: "",
        jobTitles: row.job ? row.job.split(/[,،]/).map((j: string) => j.trim()).filter(Boolean) : [],
        subjects: row.rawSubjects || [],
        phone: "",
        grades: row.rawGrades || [],
        date: new Date().toISOString().split("T")[0],
      });
      if (row.school) targetSchoolsSet.add(row.school);
    });

    // 2. Process Duplicates
    if (isAdoptAll) {
      // Add all as new rows
      duplicatesList.forEach(({ row }) => {
        maxSerial++;
        newStaffList.push({
          id: "staff-" + Date.now().toString() + Math.random().toString(36).substring(2, 7) + "-" + maxSerial,
          serialNumber: maxSerial,
          school: row.school,
          branch: row.branch,
          name: row.userName,
          gender: "",
          jobTitles: row.job ? row.job.split(/[,،]/).map((j: string) => j.trim()).filter(Boolean) : [],
          subjects: row.rawSubjects || [],
          phone: "",
          grades: row.rawGrades || [],
          date: new Date().toISOString().split("T")[0],
        });
        if (row.school) targetSchoolsSet.add(row.school);
      });
    } else {
      // Update only selected duplicates, ignore unchecked ones
      duplicatesList.forEach(({ row, existing }) => {
        const isSelected = selectedDupUserIds.includes(row.userId);
        if (isSelected) {
          const idx = newStaffList.findIndex(s => s.id === existing.id);
          const updatedRecord = {
            ...existing,
            school: row.school,
            branch: row.branch,
            name: row.userName,
            jobTitles: row.job ? row.job.split(/[,،]/).map((j: string) => j.trim()).filter(Boolean) : [],
            subjects: row.rawSubjects || [],
            grades: row.rawGrades || [],
          };
          if (idx > -1) {
            newStaffList[idx] = updatedRecord;
          } else {
             newStaffList.push(updatedRecord);
          }
          if (row.school) targetSchoolsSet.add(row.school);
        }
      });
    }

    // Sort staff alphabetically by name and correctly re-number (matching StaffManager's sort)
    const sortedStaff = [...newStaffList]
      .sort((a, b) => {
        const nameA = a.name ? a.name.trim() : "";
        const nameB = b.name ? b.name.trim() : "";
        if (!nameA && nameB) return 1;
        if (nameA && !nameB) return -1;
        return nameA.localeCompare(nameB, "ar");
      })
      .map((s, idx) => ({ ...s, serialNumber: idx + 1 }));

    const targetSchools = Array.from(targetSchoolsSet).filter(Boolean);
    updateData({ secretariatStaff: sortedStaff }, targetSchools);
    toast.success("✅ تم إرسال البيانات إلى جدول الموظفين بنجاح!");
    
    // Reset modal state
    setDuplicateResolutionData({ isOpen: false, duplicatesList: [], uniqueRows: [] });
    setResolvedDuplicateUserIds([]);
  };

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkApply = (field: string, selectedValues: string[]) => {
    if (isReadOnly) return;
    const visibleUserIds = Array.from(new Set(filteredUsersRows.map(r => r.userId).filter(Boolean))) as string[];
    if (visibleUserIds.length === 0) {
      toast.warning("لا توجد سجلات ظاهرة لتعميم التغيير عليها.");
      return;
    }

    const updatedUsers = data.users.map(u => {
      if (!visibleUserIds.includes(u.id)) return u;
      const updatedUser = { ...u };

      if (field === 'schools') {
        updatedUser.schools = selectedValues;
        const sab = { ...(updatedUser.permissions?.schoolsAndBranches || {}) };
        Object.keys(sab).forEach(s => {
          if (!selectedValues.includes(s)) {
            delete sab[s];
          }
        });
        selectedValues.forEach(s => {
          if (!sab[s] || sab[s].length === 0) {
            sab[s] = ["المركز الرئيسي"];
          }
        });
        updatedUser.permissions = {
          ...(updatedUser.permissions || {}),
          schoolsAndBranches: sab
        };
      } else if (field === 'branches') {
        const sab = { ...(updatedUser.permissions?.schoolsAndBranches || {}) };
        updatedUser.schools.forEach(s => {
          const validSchoolBranches = data.schoolBranches?.[s] || [];
          const matchedBranches = selectedValues.filter(b => validSchoolBranches.includes(b));
          sab[s] = matchedBranches.length > 0 ? matchedBranches : ["المركز الرئيسي"];
        });
        updatedUser.permissions = {
          ...(updatedUser.permissions || {}),
          schoolsAndBranches: sab
        };
      } else if (field === 'jobTitle') {
        updatedUser.jobTitle = selectedValues.join(", ");
        
        const isSuperAdminJob = selectedValues.includes("المشرف العام") || selectedValues.includes("نائب المشرف العام");
        const isMgmtJob = selectedValues.some(j => ["مدير عام", "مدير فرع", "مدير عام المدارس"].includes(j));
        const isSecOrQuality = selectedValues.some(j => ["السكرتارية", "إدارة الجودة", "الجودة"].includes(j));

        if (isSuperAdminJob || isMgmtJob || isSecOrQuality) {
          updatedUser.role = (isSuperAdminJob || isMgmtJob) ? "admin" : "user";
          updatedUser.grades = [...gradesOptions];
          updatedUser.sections = [...sectionsOptions];
          updatedUser.schools = (data.availableSchools || []).filter(Boolean);
          
          const sab: Record<string, string[]> = {};
          updatedUser.schools.forEach(school => {
            sab[school] = data.schoolBranches?.[school] || ["المركز الرئيسي"];
          });

          const newPerms = getPermissionsForJobs(selectedValues, updatedUser.permissions || {}, false);
          updatedUser.permissions = {
            ...newPerms,
            schoolsAndBranches: sab,
          };
        } else {
          updatedUser.role = "user";
          const newPerms = getPermissionsForJobs(selectedValues, updatedUser.permissions || {}, false);
          updatedUser.permissions = newPerms;
        }
      } else if (field === 'subjects') {
        updatedUser.subjects = selectedValues;
      } else if (field === 'grades') {
        updatedUser.grades = selectedValues;
      } else if (field === 'sections') {
        updatedUser.sections = selectedValues;
      } else if (field === 'academicYears') {
        updatedUser.academicYears = selectedValues;
      }
      return updatedUser;
    });

    updateData({ users: updatedUsers });
    toast.success("تم تعميم التغيير بنجاح على جميع المستخدمين الظاهرين!");
    setActiveHeaderDropdown(null);
  };

  const handleCellUpdate = (userId: string, field: string, selectedValues: string[], schoolContext?: string) => {
    if (isReadOnly) return;
    const updatedUsers = data.users.map(u => {
      if (u.id !== userId) return u;
      const updatedUser = { ...u };

      if (field === 'schools') {
        updatedUser.schools = selectedValues;
        const sab = { ...(updatedUser.permissions?.schoolsAndBranches || {}) };
        Object.keys(sab).forEach(s => {
          if (!selectedValues.includes(s)) {
            delete sab[s];
          }
        });
        selectedValues.forEach(s => {
          if (!sab[s] || sab[s].length === 0) {
            sab[s] = ["المركز الرئيسي"];
          }
        });
        updatedUser.permissions = {
          ...(updatedUser.permissions || {}),
          schoolsAndBranches: sab
        };
      } else if (field === 'branches' && schoolContext) {
        const sab = { ...(updatedUser.permissions?.schoolsAndBranches || {}) };
        sab[schoolContext] = selectedValues;
        updatedUser.permissions = {
          ...(updatedUser.permissions || {}),
          schoolsAndBranches: sab
        };
      } else if (field === 'jobTitle' && selectedValues) {
        updatedUser.jobTitle = selectedValues.join(", ");
        
        const isSuperAdminJob = selectedValues.includes("المشرف العام") || selectedValues.includes("نائب المشرف العام");
        const isMgmtJob = selectedValues.some(j => ["مدير عام", "مدير فرع", "مدير عام المدارس"].includes(j));
        const isSecOrQuality = selectedValues.some(j => ["السكرتارية", "إدارة الجودة", "الجودة"].includes(j));

        if (isSuperAdminJob || isMgmtJob || isSecOrQuality) {
          updatedUser.role = (isSuperAdminJob || isMgmtJob) ? "admin" : "user";
          updatedUser.grades = [...gradesOptions];
          updatedUser.sections = [...sectionsOptions];
          updatedUser.schools = (data.availableSchools || []).filter(Boolean);
          
          const sab: Record<string, string[]> = {};
          updatedUser.schools.forEach(school => {
            sab[school] = data.schoolBranches?.[school] || ["المركز الرئيسي"];
          });

          const newPerms = getPermissionsForJobs(selectedValues, updatedUser.permissions || {}, false);
          updatedUser.permissions = {
            ...newPerms,
            schoolsAndBranches: sab,
          };
        } else {
          updatedUser.role = "user";
          const newPerms = getPermissionsForJobs(selectedValues, updatedUser.permissions || {}, false);
          updatedUser.permissions = newPerms;
        }
      } else if (field === 'subjects') {
        updatedUser.subjects = selectedValues;
      } else if (field === 'grades') {
        updatedUser.grades = selectedValues;
      } else if (field === 'sections') {
        updatedUser.sections = selectedValues;
      } else if (field === 'academicYears') {
        updatedUser.academicYears = selectedValues;
      }
      return updatedUser;
    });

    updateData({ users: updatedUsers });
    toast.success("تم تحديث بيانات المستخدم بنجاح!");
    setActiveCellEdit(null);
  };

  const startCellEdit = (userId: string, field: string, schoolContext?: string) => {
    if (isReadOnly) return;
    const u = data.users.find(x => x.id === userId);
    if (!u) return;

    let initialSelections: string[] = [];
    if (field === 'schools') {
      initialSelections = u.schools || [];
    } else if (field === 'branches' && schoolContext) {
      initialSelections = u.permissions?.schoolsAndBranches?.[schoolContext] || [];
    } else if (field === 'jobTitle') {
      initialSelections = u.jobTitle ? u.jobTitle.split(",").map(x => x.trim()).filter(Boolean) : [];
    } else if (field === 'subjects') {
      initialSelections = u.subjects || [];
    } else if (field === 'grades') {
      initialSelections = u.grades || [];
    } else if (field === 'sections') {
      initialSelections = u.sections || [];
    } else if (field === 'academicYears') {
      initialSelections = u.academicYears || [];
    }

    setCellSelections(initialSelections);
    setActiveCellEdit({ userId, field, schoolContext });
  };


  const handleDeleteSelectedUsers = () => {
    if (isReadOnly) return;
    if (selectedUserIds.length === 0) {
      toast.warning("يرجى تحديد مستخدم واحد على الأقل للحذف.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "حذف المستخدمين المحددين",
      message: `هل أنت متأكد من حذف عدد ${selectedUserIds.length} مستخدم(ين) بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء ولا يتأثر غيرهم.`,
      onConfirm: () => {
        const usersToDelete = data.users.filter((u) =>
          selectedUserIds.includes(u.id)
        );
        let targetSchools = Array.from(
          new Set(usersToDelete.flatMap((u) => u.schools || []))
        ).filter(Boolean);

        if (
          usersToDelete.some((u) => u.role === "admin" || u.permissions?.all)
        ) {
          targetSchools = data.availableSchools || [];
        }

        const nextUsers = data.users.filter((u) => !selectedUserIds.includes(u.id));
        const deletedNames = usersToDelete.map((u) =>
          u.name?.trim().toLowerCase()
        );
        const nextStaff = Array.isArray(data.secretariatStaff)
          ? data.secretariatStaff.filter(
              (s) => !deletedNames.includes(s.name?.trim().toLowerCase())
            )
          : [];

        updateData({ users: nextUsers }, targetSchools);

        const activeSchool = currentUser?.selectedSchool?.split(",")[0]?.trim();
        const hasDeletedUserFromActiveSchool = usersToDelete.some(
          (u) => u.schools?.includes(activeSchool) || u.role === "admin" || u.permissions?.all
        );
        if (hasDeletedUserFromActiveSchool) {
          updateData({ secretariatStaff: nextStaff });
        }
        setSelectedUserIds([]);
        toast.success("تم حذف المستخدمين المحددين نهائياً بنجاح!");
      },
    });
  };

  // Maps for school/branch background colors (pastel palette)
  const [schoolColorsMap] = useState<Record<string, string>>({});
  const [branchColorsMap] = useState<Record<string, string>>({});
  
  const colorPalette = [
    "D9EAD3", // light green
    "C9DAF8", // light blue
    "F4CCCC", // light red
    "FFF2CC", // light yellow
    "F3E2F2", // pale magenta/pink
    "EAD1DC", // light purple
    "D5E8D4", // sage green
    "FFE6CC", // peach
    "E1D5E7", // violet
    "F8CECC"  // warm pink
  ];

  let sColorIdx = 0;
  let bColorIdx = 0;

  const getSchoolColor = (schoolName: string) => {
    if (!schoolName || schoolName === "بدون مدرسة") return "FFFFFF";
    if (!schoolColorsMap[schoolName]) {
      schoolColorsMap[schoolName] = colorPalette[sColorIdx % colorPalette.length];
      sColorIdx++;
    }
    return schoolColorsMap[schoolName];
  };

  const getBranchColor = (branchName: string) => {
    if (!branchName || branchName === "بدون فرع") return "FFFFFF";
    if (!branchColorsMap[branchName]) {
      branchColorsMap[branchName] = colorPalette[(bColorIdx + 3) % colorPalette.length];
      bColorIdx++;
    }
    return branchColorsMap[branchName];
  };

  // Flat rows constructor
  const allFlatRows: any[] = [];
  data.users.forEach((u) => {
    const activeSchools = (u.schools || []).map((s) => s?.trim()).filter(Boolean);
    const schools = activeSchools.length > 0 ? activeSchools : ["بدون مدرسة"];
    schools.forEach((school) => {
      let branches = (u.permissions?.schoolsAndBranches?.[school] || [])
        .map((b) => b?.trim())
        .filter(Boolean);
      if (branches.length === 0) branches = ["بدون فرع"];

      branches.forEach((branch) => {
        let permSummary = "";
        if (u.permissions?.all) {
          permSummary = "كامل الصلاحيات";
        } else {
          const activePerms: string[] = [];
          const p = u.permissions;
          if (p) {
            if (p.dashboard && (p.dashboard === true || (Array.isArray(p.dashboard) && p.dashboard.length > 0))) activePerms.push("الرئيسية");
            if (p.dailyFollowUp && (p.dailyFollowUp === true || (Array.isArray(p.dailyFollowUp) && p.dailyFollowUp.length > 0))) activePerms.push("متابعة المعلمين");
            if (p.adminFollowUp && (p.adminFollowUp === true || (Array.isArray(p.adminFollowUp) && p.adminFollowUp.length > 0))) activePerms.push("متابعة الموظفين");
            if (p.studentAffairs && (p.studentAffairs === true || (Array.isArray(p.studentAffairs) && p.studentAffairs.length > 0))) activePerms.push("شؤون الطلاب");
            if (p.substitutions && (p.substitutions === true || (Array.isArray(p.substitutions) && p.substitutions.length > 0))) activePerms.push("التغطية");
            if (p.schoolProfile && (p.schoolProfile === true || (Array.isArray(p.schoolProfile) && p.schoolProfile.length > 0))) activePerms.push("ملف المدرسة");
            if (p.secretariat && (p.secretariat === true || (Array.isArray(p.secretariat) && p.secretariat.length > 0))) activePerms.push("السكرتارية");
            if (p.teacherPortal && (p.teacherPortal === true || (Array.isArray(p.teacherPortal) && p.teacherPortal.length > 0))) activePerms.push("بوابة المعلم");
            if (p.educationalSupervision && (p.educationalSupervision === true || (Array.isArray(p.educationalSupervision) && p.educationalSupervision.length > 0))) activePerms.push("الإشراف التربوي");
            if (p.transport && (p.transport === true || (Array.isArray(p.transport) && p.transport.length > 0))) activePerms.push("مسؤول الحركة والمواصلات");
            if (p.specialCodes && (p.specialCodes === true || (Array.isArray(p.specialCodes) && p.specialCodes.length > 0))) activePerms.push("التحكم بالصلاحيات");
            if (p.userManagement && (p.userManagement === true || (Array.isArray(p.userManagement) && p.userManagement.length > 0))) activePerms.push("التحكم بالمستخدمين");
            if (p.readOnly) activePerms.push("قراءة فقط");
          }
          
          permSummary = activePerms.join("، ") || "بدون صلاحيات إضافية";
        }

        allFlatRows.push({
          userId: u.id,
          school,
          branch,
          userName: u.name || "",
          job: u.jobTitle || "بدون وظيفة",
          subjects: (u.subjects || []).join("، ") || "بدون مادة",
          rawSubjects: u.subjects || [],
          grades: (u.grades || []).join("، ") || "الكل",
          rawGrades: u.grades || [],
          sections: (u.sections || []).join("، ") || "الكل",
          rawSections: u.sections || [],
          code: u.code || "",
          startDate: u.startDate || "",
          expiryDate: u.expiryDate || "",
          allowedSchools: (u.schools || []).join("، "),
          years: (u.academicYears || []).join("، "),
          permissionsText: permSummary,
          rawPermissions: u.permissions || {},
        });
      });
    });
  });

  const uniqueBranches = Array.from(new Set(allFlatRows.map(r => r.branch?.trim()).filter(Boolean)));

  const filteredUsersRows = allFlatRows.filter((r) => {
    if (filterSchool !== "الكل" && r.school !== filterSchool) return false;
    if (filterBranch !== "الكل" && r.branch !== filterBranch) return false;
    if (filterUser.trim() !== "" && !r.userName.toLowerCase().includes(filterUser.trim().toLowerCase())) return false;

    // فحص فلترة الوظيفة
    if (filterJob !== "الكل") {
      const userJobs = r.job ? r.job.split(",").map((j: string) => j.trim()) : [];
      if (!userJobs.includes(filterJob)) return false;
    }

    // فحص فلترة الصف
    if (filterGrade !== "الكل") {
      if (filterGrade === "بدون صف") {
        if (r.rawGrades.length > 0) return false;
      } else {
        if (!r.rawGrades.includes(filterGrade)) return false;
      }
    }

    // فحص فلترة الشعبة
    if (filterSection !== "الكل") {
      if (filterSection === "بدون شعبة") {
        if (r.rawSections.length > 0) return false;
      } else {
        if (!r.rawSections.includes(filterSection)) return false;
      }
    }

    // فحص فلترة الصلاحية
    if (filterPermission !== "الكل") {
      if (filterPermission === "بدون صلاحيات") {
        if (r.permissionsText !== "بدون صلاحيات إضافية") return false;
      } else if (r.rawPermissions.all) {
        if (filterPermission === "قراءة فقط" && !r.rawPermissions.readOnly) return false;
      } else {
        if (filterPermission === "كامل الصلاحيات") {
          return false;
        } else if (filterPermission === "قراءة فقط") {
          if (!r.rawPermissions.readOnly) return false;
        } else {
          const keyMap: Record<string, string> = {
            "الرئيسية": "dashboard",
            "متابعة المعلمين": "dailyFollowUp",
            "متابعة الموظفين": "adminFollowUp",
            "شؤون الطلاب": "studentAffairs",
            "التغطية": "substitutions",
            "ملف المدرسة": "schoolProfile",
            "السكرتارية": "secretariat",
            "بوابة المعلم": "teacherPortal",
            "الإشراف التربوي": "educationalSupervision",
            "مسؤول الحركة والمواصلات": "transport",
            "التحكم بالصلاحيات": "specialCodes",
            "التحكم بالمستخدمين": "userManagement",
          };
          const key = keyMap[filterPermission];
          if (key) {
            const val = r.rawPermissions[key];
            const hasPerm = val && (val === true || (Array.isArray(val) && val.length > 0));
            if (!hasPerm) return false;
          } else {
            return false;
          }
        }
      }
    }

    return true;
  });

  const filteredUserIds = Array.from(
    new Set(filteredUsersRows.map((r) => r.userId).filter(Boolean))
  ) as string[];

  const isAllSelected =
    filteredUserIds.length > 0 &&
    filteredUserIds.every((id) => selectedUserIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds((prev) =>
        prev.filter((id) => !filteredUserIds.includes(id))
      );
    } else {
      setSelectedUserIds((prev) =>
        Array.from(new Set([...prev, ...filteredUserIds]))
      );
    }
  };

  const handleExportFilteredExcel = () => {
    try {
      const headers = [
        "اسم المدرسة",
        "اسم الفرع",
        "اسم المستخدم",
        "الوظيفة",
        "المادة",
        "الصف",
        "الشعبة",
        "الكود",
        "تاريخ البدء",
        "تاريخ الانتهاء",
        "المدارس المصرح بها",
        "الأعوام الدراسية",
        "صلاحيات الوصول"
      ];

      const wsData = [headers];
      filteredUsersRows.forEach(row => {
        wsData.push([
          row.school,
          row.branch,
          row.userName,
          row.job,
          row.subjects,
          row.grades,
          row.sections,
          row.code,
          row.startDate,
          row.expiryDate,
          row.allowedSchools,
          row.years,
          row.permissionsText
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!dir"] = "rtl";
      ws["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 30 }
      ];

      for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < wsData[R].length; ++C) {
          const address = XLSX.utils.encode_cell({ c: C, r: R });
          if (!ws[address]) continue;

          let cellStyle: any = {
            font: { name: "Arial", sz: 11 },
            alignment: { vertical: "center", horizontal: "center", wrapText: true }
          };

          if (R === 0) {
            cellStyle.font.bold = true;
            cellStyle.font.sz = 12;
            cellStyle.font.color = { rgb: "FFFFFF" };
            cellStyle.fill = { fgColor: { rgb: "312E81" } };
          } else {
            const rowData = filteredUsersRows[R - 1];
            if (C === 0) {
              cellStyle.fill = { fgColor: { rgb: getSchoolColor(rowData.school) } };
              cellStyle.font.bold = true;
            } else if (C === 1) {
              cellStyle.fill = { fgColor: { rgb: getBranchColor(rowData.branch) } };
              cellStyle.font.bold = true;
            } else {
              if ((R - 1) % 2 === 1) {
                cellStyle.fill = { fgColor: { rgb: "F8FAFC" } };
              }
            }
          }
          ws[address].s = cellStyle;
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بيانات الفلترة");
      XLSX.writeFile(wb, `بيانات_المدارس_والمستخدمين_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("تم تصدير كشف المدارس والمستخدمين إلى ملف Excel بنظام الألوان!");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تصدير البيانات.");
    }
  };

  if (!isOpen) return null;

  const handleAddSchool = () => {
    if (isReadOnly) return;
    if (!newSchool.trim()) return;
    const currentSchools = data.availableSchools || [];
    if (!currentSchools.includes(newSchool.trim())) {
      updateData({
        availableSchools: [...currentSchools, newSchool.trim()],
        schoolBranches: {
          ...(data.schoolBranches || {}),
          [newSchool.trim()]: ["المركز الرئيسي", "فرع الطلاب", "فرع الطالبات"],
        },
      });
    }
    setNewSchool("");
  };

  const handleAddBranch = () => {
    if (isReadOnly) return;
    if (!selectedSchoolForBranch || !newBranch.trim()) return;
    const currentBranches =
      data.schoolBranches?.[selectedSchoolForBranch] || [];
    if (!currentBranches.includes(newBranch.trim())) {
      updateData({
        schoolBranches: {
          ...(data.schoolBranches || {}),
          [selectedSchoolForBranch]: [...currentBranches, newBranch.trim()],
        },
      });
    }
    setNewBranch("");
  };

  const handleDeleteBranch = (school: string, branch: string) => {
    if (isReadOnly) return;
    const currentBranches = data.schoolBranches?.[school] || [];
    updateData({
      schoolBranches: {
        ...(data.schoolBranches || {}),
        [school]: currentBranches.filter((b) => b !== branch),
      },
    });
  };

  const handleAddYear = () => {
    if (isReadOnly) return;
    if (!newYear.trim()) return;
    const currentYears = data.availableYears || [];
    if (!currentYears.includes(newYear.trim())) {
      updateData({ availableYears: [...currentYears, newYear.trim()] });
    }
    setNewYear("");
  };

  const handleDeleteSchool = (school: string) => {
    if (isReadOnly) return;
    const currentSchools = data.availableSchools || [];
    updateData({
      availableSchools: currentSchools.filter((s) => s !== school),
    });
  };

  const handleDeleteYear = (year: string) => {
    if (isReadOnly) return;
    const currentYears = data.availableYears || [];
    updateData({ availableYears: currentYears.filter((y) => y !== year) });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const generateId = () =>
    "u" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

  const handleAddNewAdmin = () => {
    if (isReadOnly) return;
    const newUser: User = {
      id: generateId(),
      name: "",
      code: "",
      jobTitle: "",
      subjects: [],
      grades: [],
      sections: [],
      schools: [],
      academicYears: [],
      startDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      role: "admin",
      permissions: { all: true },
    };
    setEditingUser(newUser);
    setIsEditModalOpen(true);
  };

  const handleAddNewUser = () => {
    if (isReadOnly) return;
    const newUser: User = {
      id: generateId(),
      name: "",
      code: "",
      jobTitle: "",
      subjects: [],
      grades: [],
      sections: [],
      schools: [],
      academicYears: [],
      startDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      role: "user",
      permissions: {
        dashboard: ["view"],
        trainingCourses: ["view"],
        specialCodes: ["hideButton"],
      },
    };
    setEditingUser(newUser);
    setIsEditModalOpen(true);
  };

  const isAdminOrFull =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const hasFullAccess = isAdminOrFull || enteredPassword === "2#3#2*4*a";

  const admins = data.users.filter((u) => {
    if (u.role !== "admin") return false;
    if (hasFullAccess) return true;
    const isSuperAdmin = u.permissions?.all === true || u.role === "admin";
    if (isSuperAdmin && !isAdminOrFull) return false;
    return effectiveUserIds.includes(u.id);
  });

  const regularUsers = data.users.filter((u) => {
    if (u.role !== "user") return false;
    if (hasFullAccess) return true;
    const isSuperAdmin = u.permissions?.all === true;
    if (isSuperAdmin && !isAdminOrFull) return false;
    return effectiveUserIds.includes(u.id);
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-4 border-blue-50 flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                التحكم بالصلاحيات
              </h2>
              <p className="text-slate-500 text-sm font-bold">
                إدارة المدارس والمستخدمين والصلاحيات
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-red-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            {/* Section 1: Schools and Years */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <School size={20} />
                <h3 className="font-black text-lg">
                  أولاً: إدارة المدارس والأعوام الدراسية
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 mr-2">
                    إضافة مدرسة جديدة
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                      placeholder="اسم المدرسة..."
                      value={newSchool}
                      onChange={(e) => setNewSchool(e.target.value)}
                    />
                    <button
                      onClick={handleAddSchool}
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Plus size={18} /> إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.availableSchools?.filter(Boolean).map((s, idx) => (
                      <div
                        key={`school-${s}-${idx}`}
                        className="flex flex-col gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 group w-full"
                      >
                        <div className="flex items-center justify-between">
                          <span>{s}</span>
                          <button
                            onClick={() => handleDeleteSchool(s)}
                            className="p-0.5 hover:bg-blue-200 rounded-md transition-colors text-blue-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {data.schoolBranches?.[s]?.filter(Boolean).map((b, bIdx) => (
                            <span
                              key={`${s}-${b || bIdx}-${bIdx}`}
                              className="px-2 py-0.5 bg-white text-blue-500 rounded text-[10px] border border-blue-100 flex items-center gap-1"
                            >
                              {b}
                              <button
                                onClick={() => handleDeleteBranch(s, b)}
                                className="hover:text-red-500"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 mr-2">
                      إضافة فرع למدرسة
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-1/3 px-2 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm"
                        value={selectedSchoolForBranch}
                        onChange={(e) =>
                          setSelectedSchoolForBranch(e.target.value)
                        }
                      >
                        <option key="select-school-placeholder" value="">تحديد مدرسة</option>
                        {data.availableSchools?.filter(Boolean).map((s, sIdx) => (
                          <option key={`school-opt-${sIdx}`} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm"
                        placeholder="اسم الفرع..."
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                      />
                      <button
                        onClick={handleAddBranch}
                        className="px-3 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-1 text-sm"
                      >
                        <Plus size={16} /> اضافة فرع
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 mr-2">
                      إضافة عام دراسي جديد
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold"
                        placeholder="العام الدراسي (مثلاً 2024-2025)..."
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                      />
                      <button
                        onClick={handleAddYear}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                        <Plus size={18} /> إضافة
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.availableYears?.filter(Boolean).map((y, idx) => (
                        <div
                          key={`year-${y}-${idx}`}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 group"
                        >
                          <span>{y}</span>
                          <button
                            onClick={() => handleDeleteYear(y)}
                            className="p-0.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Admins */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Shield size={20} />
                  <h3 className="font-black text-lg">
                    ثانياً: المدير العام ومن له صلاحيات كاملة
                  </h3>
                </div>
                <button
                  onClick={handleAddNewAdmin}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> إضافة مدير
                </button>
              </div>
              <div className="mt-3">
                <GroupedUsersRenderer
                  users={admins}
                  onEditUser={handleEditUser}
                />
              </div>
            </section>

            {/* Section 3: Regular Users */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users size={20} />
                  <h3 className="font-black text-lg">
                    ثالثاً: المستخدمين الآخرين
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSchoolUsersModalOpen(true)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-750 hover:bg-indigo-600 hover:text-white rounded-xl font-extrabold text-sm transition-all flex items-center gap-1.5 border border-indigo-200 shadow-sm"
                  >
                    <Database size={16} />
                    <span>بيانات المدارس والمستخدمين</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNewUser}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Plus size={16} /> إضافة مستخدم
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <GroupedUsersRenderer
                  users={regularUsers}
                  onEditUser={handleEditUser}
                />
              </div>
            </section>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isSchoolUsersModalOpen && (
          <div className="fixed inset-0 z-[120] bg-slate-50 font-arabic flex flex-col" dir="rtl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white w-full h-full flex flex-col font-arabic text-right text-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className={`border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 transition-all duration-300 ${hasClickedOk ? 'p-3' : 'p-6'}`}>
                <div className="flex items-center gap-3">
                  <div className={`bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-150 transition-all duration-300 ${hasClickedOk ? 'w-8 h-8' : 'w-12 h-12'}`}>
                    <Database size={hasClickedOk ? 18 : 24} />
                  </div>
                  <div>
                    <h2 className={`font-black text-slate-800 transition-all duration-300 ${hasClickedOk ? 'text-sm' : 'text-xl'}`}>
                      بيانات المدارس والمستخدمين
                    </h2>
                    <p className={`text-slate-500 font-bold transition-all duration-300 ${hasClickedOk ? 'text-[10px]' : 'text-xs'}`}>
                      استعراض، فلترة وتصدير كشوفات المدارس والفروع والمستخدمين بالتفصيل
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSchoolUsersModalOpen(false);
                    setHasClickedOk(false);
                    setIsFiltersCollapsed(false);
                    setSelectedUserIds([]);
                    setFilterSchool("الكل");
                    setFilterBranch("الكل");
                    setFilterUser("");
                    setFilterJob("الكل");
                    setFilterGrade("الكل");
                    setFilterSection("الكل");
                    setFilterPermission("الكل");
                  }}
                  className={`hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-red-500 ${hasClickedOk ? 'p-2' : 'p-3'}`}
                >
                  <X size={hasClickedOk ? 16 : 20} />
                </button>
              </div>

              {/* Collapsible Filtering Controls Container */}
              <div className="border-b border-slate-150 bg-slate-50/30">
                {hasClickedOk && (
                  <div
                    className="px-6 py-2 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-150 transition-all select-none"
                    onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                  >
                    <span className="text-xs font-black text-slate-600 flex items-center gap-1">
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 ${isFiltersCollapsed ? '-rotate-90 text-indigo-600' : 'text-slate-500'}`}
                      />
                      فلاتر التصفية والبحث {isFiltersCollapsed ? '(مغلقة)' : '(مفتوحة)'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      اضغط للتوسيع أو الطي
                    </span>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {(!hasClickedOk || !isFiltersCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end text-right">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">اسم المدرسة</label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    value={filterSchool}
                    onChange={(e) => {
                      setFilterSchool(e.target.value);
                      setHasClickedOk(false);
                    }}
                  >
                    <option key="all-schools" value="الكل">كل المدارس (الكل)</option>
                    <option key="no-school" value="بدون مدرسة">بدون مدرسة</option>
                    {data.availableSchools?.filter(Boolean).map((sch, idx) => (
                      <option key={`school-filter-${idx}`} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">اسم الفرع</label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    value={filterBranch}
                    onChange={(e) => {
                      setFilterBranch(e.target.value);
                      setHasClickedOk(false);
                    }}
                  >
                    <option key="all-branches" value="الكل">كل الفروع (الكل)</option>
                    <option key="no-branch" value="بدون فرع">بدون فرع</option>
                    {uniqueBranches.filter(br => br !== "بدون فرع").map((br, idx) => (
                      <option key={`branch-filter-${idx}`} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">اسم المستخدم</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    placeholder="ابحث باسم المستخدم..."
                    value={filterUser}
                    onChange={(e) => {
                      setFilterUser(e.target.value);
                      setHasClickedOk(false);
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">الوظيفة</label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    value={filterJob}
                    onChange={(e) => {
                      setFilterJob(e.target.value);
                      setHasClickedOk(false);
                    }}
                  >
                    <option key="all-jobs" value="الكل">كل الوظائف (الكل)</option>
                    <option key="no-job" value="بدون وظيفة">بدون وظيفة</option>
                    {jobsOptions.filter(job => job !== "بدون وظيفة").map((job, idx) => (
                      <option key={`job-filter-${idx}`} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">الصف</label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    value={filterGrade}
                    onChange={(e) => {
                      setFilterGrade(e.target.value);
                      setHasClickedOk(false);
                    }}
                  >
                    <option key="all-grades" value="الكل">كل الصفوف (الكل)</option>
                    <option key="no-grade" value="بدون صف">بدون صف</option>
                    {gradesOptions.filter(grade => grade !== "بدون صف").map((grade, idx) => (
                      <option key={`grade-filter-${idx}`} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">الشعبة</label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    value={filterSection}
                    onChange={(e) => {
                      setFilterSection(e.target.value);
                      setHasClickedOk(false);
                    }}
                  >
                    <option key="all-sections" value="الكل">كل الشعب (الكل)</option>
                    <option key="no-section" value="بدون شعبة">بدون شعبة</option>
                    {sectionsOptions.filter(sec => sec !== "بدون شعبة").map((sec, idx) => (
                      <option key={`sec-filter-${idx}`} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-1 block text-right">الصلاحيات</label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-sm text-right"
                    value={filterPermission}
                    onChange={(e) => {
                      setFilterPermission(e.target.value);
                      setHasClickedOk(false);
                    }}
                  >
                    <option key="all-permissions" value="الكل">كل الصلاحيات (الكل)</option>
                    <option key="no-permissions" value="بدون صلاحيات">بدون صلاحيات</option>
                    {permissionsOptions.filter(perm => perm !== "بدون صلاحيات").map((perm, idx) => (
                      <option key={`perm-filter-${idx}`} value={perm}>
                        {perm}
                      </option>
                    ))}
                  </select>
                </div>

                        <button
                          type="button"
                          onClick={() => {
                            setHasClickedOk(true);
                            setIsFiltersCollapsed(true);
                          }}
                          className="w-full py-2.5 bg-indigo-650 text-white hover:bg-indigo-750 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 shadow-md shadow-indigo-150 transition-all border-2 border-indigo-750"
                        >
                          موافق
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Data Table */}
              <div className="p-6 flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
                {hasClickedOk ? (
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    {/* Upper Controls / Export */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-shrink-0">
                      <div className="text-sm font-black text-slate-700 text-right flex items-center gap-3">
                        <span>
                          عدد السجلات المطابقة: <span className="text-indigo-600 font-extrabold">{filteredUsersRows.length}</span> سجل
                        </span>
                        {selectedUserIds.length > 0 && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black">
                            تم تحديد: {selectedUserIds.length} مستخدم(ين)
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={handleSendToStaffTable}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-100 transition-all border border-blue-500"
                          >
                            <Users size={16} />
                            <span>إرسال البيانات إلى جدول الموظفين ({selectedUserIds.length > 0 ? selectedUserIds.length : filteredUsersRows.length})</span>
                          </button>
                        )}

                        {!isReadOnly && selectedUserIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleDeleteSelectedUsers}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-red-100 transition-all border border-red-550"
                          >
                            <Trash2 size={16} />
                            <span>حذف المستخدمين المحددين ({selectedUserIds.length})</span>
                          </button>
                        )}
                        
                        {filteredUsersRows.length > 0 && (
                          <button
                            type="button"
                            onClick={handleExportFilteredExcel}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-100 transition-all border border-emerald-500"
                          >
                            <FileSpreadsheet size={16} />
                            <span>تصدير البيانات المفلترة إلى Excel</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredUsersRows.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold text-sm">
                        لا توجد بيانات تطابق الفلاتر المحددة.
                      </div>
                    ) : (
                      <div className="overflow-auto rounded-2xl border border-slate-200 flex-1 min-h-0 shadow-inner custom-scrollbar relative">
                        <table className="w-full text-right border-collapse text-xs table-auto relative" dir="rtl">
                          <thead>
                            <tr className="bg-indigo-900 text-white sticky top-0 font-extrabold z-[12] shadow-sm">
                              <th className="p-3 border-b border-indigo-950 text-center w-[80px]">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleToggleSelectAll}
                                    className="rounded border-slate-350 text-indigo-650 w-4 h-4 cursor-pointer focus:ring-indigo-500"
                                  />
                                  {!isReadOnly && selectedUserIds.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={handleDeleteSelectedUsers}
                                      className="p-1 bg-red-100 text-red-650 hover:bg-red-200 rounded-lg transition-all"
                                      title="حذف المحددين"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[120px]">اسم المدرسة</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[120px]">اسم الفرع</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[150px]">اسم المستخدم</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[100px]">الوظيفة</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[100px]">المادة</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[80px]">الصف</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[80px]">الشعبة</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[80px]">الكود</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[100px]">تاريخ البدء</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[100px]">تاريخ الانتهاء</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[150px]">المدارس المصرح بها</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[120px]">الأعوام الدراسية</th>
                              <th className="p-3 border-b border-indigo-950 text-right min-w-[180px]">صلاحيات الوصول</th>
                            </tr>

                            {/* Bulk Generalization row */}
                            <tr className={`bg-indigo-950 text-white font-extrabold sticky top-[41px] shadow-sm border-t border-indigo-900 text-[10px] ${activeHeaderDropdown !== null ? 'z-[15]' : 'z-[11]'}`}>
                              <th className="p-2 border-b border-indigo-950 text-center w-[80px]"></th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "schools" ? null : "schools");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم المدرسة</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "schools" && (
                                  <CheckboxDropdown
                                    title="تعميم اسم المدرسة"
                                    options={data.availableSchools || []}
                                    selected={headerSelections.schools || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, schools: val }))}
                                    onApply={() => handleBulkApply("schools", headerSelections.schools)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "branches" ? null : "branches");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم الفرع</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "branches" && (
                                  <CheckboxDropdown
                                    title="تعميم اسم الفرع"
                                    options={Array.from(new Set(Object.values(data.schoolBranches || {}).flat().map(b => b?.trim()).filter(Boolean)))}
                                    selected={headerSelections.branches || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, branches: val }))}
                                    onApply={() => handleBulkApply("branches", headerSelections.branches)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 text-right"></th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "job" ? null : "job");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم الوظيفة</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "job" && (
                                  <CheckboxDropdown
                                    title="تعميم الوظيفة"
                                    options={jobsOptions}
                                    selected={headerSelections.job || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, job: val }))}
                                    onApply={() => handleBulkApply("jobTitle", headerSelections.job)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "subjects" ? null : "subjects");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم المادة</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "subjects" && (
                                  <CheckboxDropdown
                                    title="تعميم المادة"
                                    options={subjectsList}
                                    selected={headerSelections.subjects || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, subjects: val }))}
                                    onApply={() => handleBulkApply("subjects", headerSelections.subjects)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "grades" ? null : "grades");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم الصف</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "grades" && (
                                  <CheckboxDropdown
                                    title="تعميم الصف"
                                    options={gradesOptions}
                                    selected={headerSelections.grades || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, grades: val }))}
                                    onApply={() => handleBulkApply("grades", headerSelections.grades)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "sections" ? null : "sections");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم الشعبة</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "sections" && (
                                  <CheckboxDropdown
                                    title="تعميم الشعبة"
                                    options={sectionsOptions}
                                    selected={headerSelections.sections || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, sections: val }))}
                                    onApply={() => handleBulkApply("sections", headerSelections.sections)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 text-right"></th>
                              <th className="p-2 border-b border-indigo-950 text-right"></th>
                              <th className="p-2 border-b border-indigo-950 text-right"></th>
                              <th className="p-2 border-b border-indigo-950 text-right"></th>
                              <th className="p-2 border-b border-indigo-950 relative text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHeaderDropdown(activeHeaderDropdown === "years" ? null : "years");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/80 rounded border border-indigo-800 text-[10px] w-full text-right justify-between font-bold"
                                >
                                  <span>تعميم الأعوام</span>
                                  <ChevronDown size={10} />
                                </button>
                                {activeHeaderDropdown === "years" && (
                                  <CheckboxDropdown
                                    title="تعميم الأعوام الدراسية"
                                    options={data.availableYears || []}
                                    selected={headerSelections.years || []}
                                    onChange={(val) => setHeaderSelections(prev => ({ ...prev, years: val }))}
                                    onApply={() => handleBulkApply("academicYears", headerSelections.years)}
                                    onCancel={() => setActiveHeaderDropdown(null)}
                                  />
                                )}
                              </th>
                              <th className="p-2 border-b border-indigo-950 text-right"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsersRows.map((row, idx) => {
                              const sBg = getSchoolColor(row.school);
                              const bBg = getBranchColor(row.branch);
                              return (
                                <tr
                                  key={`flat-row-${idx}`}
                                  className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                                >
                                  <td className="p-3 border-l border-slate-100 text-center w-[80px]">
                                    <input
                                      type="checkbox"
                                      checked={selectedUserIds.includes(row.userId)}
                                      onChange={() => handleToggleSelectUser(row.userId)}
                                      className="rounded border-slate-350 text-indigo-650 w-4 h-4 cursor-pointer focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td
                                    className={`p-3 font-extrabold border-l border-slate-100 text-slate-900 text-right cursor-pointer hover:bg-slate-150/70 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'schools' ? 'z-[15]' : ''}`}
                                    style={{ backgroundColor: sBg ? `#${sBg}` : undefined }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'schools');
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.school}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'schools' && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title="تعديل المدارس للمستخدم"
                                          options={data.availableSchools || []}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'schools', cellSelections)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className={`p-3 font-extrabold border-l border-slate-100 text-slate-800 text-right cursor-pointer hover:bg-slate-150/70 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'branches' && activeCellEdit?.schoolContext === row.school ? 'z-[15]' : ''}`}
                                    style={{ backgroundColor: bBg ? `#${bBg}` : undefined }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'branches', row.school);
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.branch}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'branches' && activeCellEdit?.schoolContext === row.school && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title={`تعديل الفروع بمدرسة ${row.school}`}
                                          options={data.schoolBranches?.[row.school] || []}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'branches', cellSelections, row.school)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-bold text-slate-900 text-right">{row.userName}</td>
                                  <td
                                    className={`p-3 text-slate-655 text-right cursor-pointer hover:bg-slate-100/65 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'jobTitle' ? 'z-[15]' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'jobTitle');
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.job}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'jobTitle' && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title="تعديل الوظائف للمستخدم"
                                          options={jobsOptions}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'jobTitle', cellSelections)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className={`p-3 text-slate-655 text-right cursor-pointer hover:bg-slate-100/65 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'subjects' ? 'z-[15]' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'subjects');
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.subjects}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'subjects' && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title="تعديل المواد للمعلم"
                                          options={subjectsList}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'subjects', cellSelections)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className={`p-3 text-slate-500 font-mono text-right cursor-pointer hover:bg-slate-100/65 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'grades' ? 'z-[15]' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'grades');
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.grades}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'grades' && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title="تعديل الصفوف للمستخدم"
                                          options={gradesOptions}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'grades', cellSelections)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className={`p-3 text-slate-500 font-mono text-right cursor-pointer hover:bg-slate-100/65 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'sections' ? 'z-[15]' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'sections');
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.sections}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'sections' && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title="تعديل الشعب للمستخدم"
                                          options={sectionsOptions}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'sections', cellSelections)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-705 font-mono font-bold bg-slate-50 text-right">{row.code}</td>
                                  <td className="p-3 text-slate-500 font-mono text-right">{row.startDate}</td>
                                  <td className="p-3 text-slate-500 font-mono text-right">{row.expiryDate}</td>
                                  <td className="p-3 text-slate-500 text-right truncate max-w-[120px]" title={row.allowedSchools}>
                                    {row.allowedSchools}
                                  </td>
                                  <td
                                    className={`p-3 text-slate-500 text-right cursor-pointer hover:bg-slate-100/65 transition-colors relative group ${activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'academicYears' ? 'z-[15]' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startCellEdit(row.userId, 'academicYears');
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1 select-none">
                                      <span>{row.years}</span>
                                      <ChevronDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                    </div>
                                    {activeCellEdit?.userId === row.userId && activeCellEdit?.field === 'academicYears' && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <CheckboxDropdown
                                          title="تعديل الأعوام الدراسية للمستخدم"
                                          options={data.availableYears || []}
                                          selected={cellSelections}
                                          onChange={(val) => setCellSelections(val)}
                                          onSave={() => handleCellUpdate(row.userId, 'academicYears', cellSelections)}
                                          onCancel={() => setActiveCellEdit(null)}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-600 text-right truncate max-w-[185px]" title={row.permissionsText}>
                                    {row.permissionsText}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Database size={48} className="text-indigo-400 animate-pulse" />
                    <p className="font-extrabold text-sm text-slate-500">
                      يرجى تعبئة الفلاتر أعلاه والضغط على زر "موافق" لعرض جدول البيانات
                    </p>
                  </div>
                )}
              </div>


              {/* Footer */}
              {!hasClickedOk && (
                <div className="bg-slate-50 border-t border-slate-100 flex justify-end p-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSchoolUsersModalOpen(false);
                      setHasClickedOk(false);
                      setIsFiltersCollapsed(false);
                      setSelectedUserIds([]);
                      setFilterSchool("الكل");
                      setFilterBranch("الكل");
                      setFilterUser("");
                      setFilterJob("الكل");
                      setFilterGrade("الكل");
                      setFilterSection("الكل");
                      setFilterPermission("الكل");
                    }}
                    className="bg-white border-2 border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-all px-8 py-2.5 text-sm"
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={editingUser}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
        type="danger"
          cancelText="تراجع"
      />

      <AnimatePresence>
        {duplicateResolutionData.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-arabic" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border-4 border-blue-50 flex flex-col text-right"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-amber-800 flex items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    تنبيه: مكررات في جدول الموظفين
                  </h3>
                  <p className="text-slate-500 text-xs font-bold mt-1">
                    تم العثور على {duplicateResolutionData.duplicatesList.length} اسم(اً) موجوداً بالفعل في جدول الموظفين بنفس المدرسة والفرع والاسم.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDuplicateResolutionData({ isOpen: false, duplicatesList: [], uniqueRows: [] });
                    setResolvedDuplicateUserIds([]);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-red-500"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Duplicate List */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">تحديد الأسماء التي تريد اعتمادها وتجنب تكرارها:</span>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-indigo-650">
                    <input
                      type="checkbox"
                      className="rounded border-slate-350 text-indigo-650 w-4 h-4 cursor-pointer focus:ring-indigo-500"
                      checked={
                        duplicateResolutionData.duplicatesList.length > 0 &&
                        resolvedDuplicateUserIds.length === duplicateResolutionData.duplicatesList.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setResolvedDuplicateUserIds(duplicateResolutionData.duplicatesList.map(d => d.row.userId));
                        } else {
                          setResolvedDuplicateUserIds([]);
                        }
                      }}
                    />
                    تحديد الكل
                  </label>
                </div>

                <div className="space-y-3">
                  {duplicateResolutionData.duplicatesList.map((item, idx) => {
                    const isChecked = resolvedDuplicateUserIds.includes(item.row.userId);
                    return (
                      <div
                        key={`dup-item-${idx}`}
                        className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                          isChecked ? "bg-blue-50/50 border-blue-200" : "bg-white border-slate-150 hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setResolvedDuplicateUserIds(prev =>
                            prev.includes(item.row.userId)
                              ? prev.filter(id => id !== item.row.userId)
                              : [...prev, item.row.userId]
                          );
                        }}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-350 text-blue-600 w-5 h-5 cursor-pointer focus:ring-blue-500 mt-0.5"
                          checked={isChecked}
                          onChange={() => {}} // Handled by outer div onClick
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 text-sm">{item.row.userName}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                              مكرر
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-slate-400">الاسم بالسكرتارية:</span> <span className="text-slate-700">{item.existing.name}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">المدرسة والفرع:</span> <span className="text-slate-700">{item.row.school} - {item.row.branch}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400">الوظيفة المراد إرسالها:</span> <span className="text-slate-700">{item.row.job}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => {
                    setDuplicateResolutionData({ isOpen: false, duplicatesList: [], uniqueRows: [] });
                    setResolvedDuplicateUserIds([]);
                  }}
                  className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-xs"
                >
                  إلغاء
                </button>
                
                <button
                  onClick={() => {
                    executeSendToStaff(
                      duplicateResolutionData.uniqueRows,
                      duplicateResolutionData.duplicatesList,
                      false,
                      resolvedDuplicateUserIds
                    );
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md shadow-blue-100 transition-all text-xs"
                >
                  عدم التكرار (اعتماد المحددين فقط)
                </button>

                <button
                  onClick={() => {
                    executeSendToStaff(
                      duplicateResolutionData.uniqueRows,
                      duplicateResolutionData.duplicatesList,
                      true
                    );
                  }}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md shadow-amber-100 transition-all text-xs"
                >
                  اعتماد الجميع (بما في ذلك المكررين)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default AccessCodesModal;
