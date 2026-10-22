import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useGlobal } from "../context/GlobalState";
import {
  Save,
  Plus,
  Trash2,
  School,
  Building,
  Calendar,
  Users,
  Briefcase,
  Sparkles,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

const ProfilePage: React.FC = () => {
  const { data, updateData, lang, currentUser } = useGlobal();
  const isReadOnly = true;
  const profile = data.profile;

  React.useEffect(() => {
    console.log("ProfilePage Debug Info:", {
      profile,
      profiles: data.profiles,
      currentUser,
      schoolId: currentUser?.selectedSchool?.split(",")[0]?.trim()
    });
  }, [profile, data.profiles, currentUser]);

  const isManagerOrAdmin =
    currentUser?.role === "admin" ||
    currentUser?.permissions?.all === true ||
    currentUser?.permissions?.userManagement === true;

  const updateField = (field: string, value: string) => {
    if (isReadOnly) return;
    updateData({
      profile: { ...profile, [field]: value },
    });
  };

  const handleAddCustomField = () => {
    if (isReadOnly) return;
    const customFields = profile.customFields || [];
    updateData({
      profile: {
        ...profile,
        customFields: [...customFields, { label: "", value: "" }],
      },
    });
  };

  const updateCustomField = (
    index: number,
    field: "label" | "value",
    value: string,
  ) => {
    if (isReadOnly) return;
    const customFields = (profile.customFields || []).map((f, i) =>
      i === index ? { ...f, [field]: value } : f,
    );
    updateData({ profile: { ...profile, customFields } });
  };

  const deleteCustomField = (index: number) => {
    if (isReadOnly) return;
    const customFields = (profile.customFields || []).filter(
      (_, i) => i !== index,
    );
    updateData({ profile: { ...profile, customFields } });
  };

  const formFields = [
    {
      key: "ministry",
      label: "وزارة التربية والتعليم والبحث العلمي",
      icon: <School className="w-5 h-5" />,
      autoFilled: true,
    },
    {
      key: "district",
      label: "المنطقة التعليمية",
      icon: <Building className="w-5 h-5" />,
      autoFilled: true,
    },
    {
      key: "schoolName",
      label: "اسم المدارس",
      icon: <Briefcase className="w-5 h-5" />,
      autoFilled: true,
    },
    {
      key: "branch",
      label: "الفرع",
      icon: <Sparkles className="w-5 h-5" />,
      autoFilled: true,
    },
    {
      key: "year",
      label: "العام الدراسي",
      icon: <Calendar className="w-5 h-5" />,
      autoFilled: true,
    },
    {
      key: "branchManager",
      label: "مدير الفرع",
      icon: <Users className="w-5 h-5" />,
      autoFilled: true,
    },
    {
      key: "generalManager",
      label: "المدير العام",
      icon: <Users className="w-5 h-5" />,
      autoFilled: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-arabic animate-in fade-in duration-500 pb-20">
      <header className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">
            بيانات ملف المدرسة
          </h2>
          <p className="text-blue-500 font-bold text-sm mt-1">
            إدارة المعلومات التنظيمية والإدارية للمؤسسة
          </p>
        </div>
        <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl">
          <School size={32} />
        </div>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8">
        <div className="flex flex-col items-center justify-center space-y-4 mb-8">
          <div className="relative group w-32 h-32 rounded-[2rem] border-4 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner transition-all hover:border-blue-200">
            {profile.logoImg ? (
              <img
                src={profile.logoImg}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-300 transition-colors" />
            )}
          </div>
          <div className="text-center">
            <h3 className="font-black text-slate-700">شعار المدرسة والفرع</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              يُفضل استخدام صورة بخلفية شفافة (png)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formFields.map((field) => {
            const isFieldReadOnly = isReadOnly || field.autoFilled;
            return (
              <div key={field.key} className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 flex items-center gap-2">
                  {field.icon}
                  {field.label}
                  {field.autoFilled && (
                    <span className="text-[10px] text-white bg-gradient-to-r from-violet-500 to-purple-500 px-2 py-0.5 rounded-full shadow-sm">
                      تلقائي من السكرتارية
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  disabled={isFieldReadOnly}
                  className={`w-full p-4 rounded-2xl border-2 transition-all outline-none font-bold ${field.autoFilled ? "bg-violet-50/50 border-violet-100 text-violet-900 shadow-inner" : isFieldReadOnly ? "bg-slate-100 border-slate-200 text-slate-700 opacity-70 cursor-not-allowed" : "bg-slate-50 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-slate-700"}`}
                  value={(profile as any)[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder="..."
                />
              </div>
            );
          })}
        </div>

        <div className="border-t pt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">
              بنود إضافية مخصصة
            </h3>
            {!isReadOnly && (
              <button
                onClick={handleAddCustomField}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-sm hover:bg-black transition-all shadow-md active:scale-95"
              >
                <Plus size={16} /> إضافة حقل جديد
              </button>
            )}
          </div>

          <div className="space-y-4">
            {(profile.customFields || []).length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic font-bold">
                لا توجد حقول إضافية حالياً. اضغط "إضافة حقل جديد" لتخصيص ملف
                المدرسة.
              </div>
            ) : (
              (profile.customFields || []).map((field, idx) => (
                <div
                  key={`custom-field-${idx}`}
                  className="flex flex-col md:flex-row gap-4 animate-in slide-in-from-right-2"
                >
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">
                      العنوان
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold text-xs cursor-not-allowed opacity-70"
                      value={field.label}
                      onChange={(e) =>
                        updateCustomField(idx, "label", e.target.value)
                      }
                      placeholder="مثال: رقم الترخيص"
                    />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2">
                      القيمة
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        className="flex-1 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-bold text-xs cursor-not-allowed opacity-70"
                        value={field.value}
                        onChange={(e) =>
                          updateCustomField(idx, "value", e.target.value)
                        }
                        placeholder="..."
                      />
                      <button
                        onClick={() => deleteCustomField(idx)}
                        className={`p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors ${isReadOnly ? "hidden" : ""}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
