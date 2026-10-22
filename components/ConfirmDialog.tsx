import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Check, Info } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  type = "warning",
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: "bg-red-50",
      icon: "bg-red-100 text-red-600",
      button: "bg-red-600 hover:bg-red-700 shadow-red-100",
      border: "border-red-100",
    },
    warning: {
      bg: "bg-amber-50",
      icon: "bg-amber-100 text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700 shadow-amber-100",
      border: "border-amber-100",
    },
    info: {
      bg: "bg-blue-50",
      icon: "bg-blue-100 text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
      border: "border-blue-100",
    },
  };

  const style = colors[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-[6px] border-white"
          >
            <div className={`p-8 ${style.bg} border-b-2 ${style.border}`}>
              <div className="flex items-center gap-5">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${style.icon}`}
                >
                  {type === "info" ? (
                    <Info size={32} />
                  ) : (
                    <AlertTriangle size={32} />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {title}
                  </h3>
                  <p className="text-slate-500 font-bold mt-1 text-sm">
                    {message}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 flex gap-4">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`flex-1 px-6 py-4 text-white rounded-2xl font-black shadow-xl transition-all hover:-translate-y-1 active:translate-y-0 ${style.button}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
