import React from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Download,
  FileSpreadsheet,
  FileIcon as FilePdf,
  Copy,
  Share2,
  Plus,
  Trash2,
  Edit,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { exportToStyledExcel } from "../src/lib/excelExport";

interface Column {
  key: string;
  label: string;
}

interface DynamicTableProps {
  title: string;
  columns: Column[];
  data: Record<string, any>[];
  onAdd: () => void;
  onEdit: (item: Record<string, any>) => void;
  onDelete: (id: string) => void;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
  title,
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const { lang, data: globalData, getReportMessageFooter, shareViaWhatsApp } = useGlobal();

  const generateRichTextReport = (item?: Record<string, any>) => {
    const targetData = item ? [item] : data;
    let text = `*📋 تقرير: ${title}*\n`;
    text += `*التاريخ:* ${new Date().toLocaleDateString("ar-EG")}\n`;
    text += `----------------------------------\n\n`;

    targetData.forEach((row, idx) => {
      text += `*🔹 البند (${idx + 1}):*\n`;
      columns.forEach((col) => {
        const val = row[col.key] || "---";
        let symbol = "▪️";

        // Logical formatting with symbols based on values (for WhatsApp visuals)
        if (typeof val === "number") {
          if (val < 5)
            symbol = "⚠️"; // Highlight low scores
          else symbol = "⭐";
        } else if (typeof val === "string") {
          if (
            val.includes("ضعيف") ||
            val.includes("مخالفة") ||
            val.includes("pending")
          )
            symbol = "🔴";
          if (
            val.includes("ممتاز") ||
            val.includes("تمت") ||
            val.includes("paid")
          )
            symbol = "🟢";
        }

        text += `${symbol} *${col.label}:* ${val}\n`;
      });
      text += `\n`;
    });

    return text;
  };

  const handleShareWhatsApp = (item?: Record<string, any>) => {
    let text = generateRichTextReport(item);

    // START OF CHANGE - Requirement: Footer with School Name and Branch
    text += `\n${getReportMessageFooter()}`;
    // END OF CHANGE

    shareViaWhatsApp(text);
  };

  const exportToExcel = async () => {
    const headers = columns.map((col) => col.label);
    const excelData = data.map((row) => columns.map((col) => row[col.key]));

    await exportToStyledExcel({
      title: title,
      filename: `${title}_${new Date().getTime()}`,
      headers,
      data: excelData,
      profile: {
        ministry: globalData.profile.ministry,
        district: globalData.profile.district,
        schoolName: globalData.profile.schoolName,
        branch: globalData.profile.branch,
        branchManager: globalData.profile.branchManager,
        writerName: globalData.profile.managerName, // Use manager as default writer if not set
      },
    });
  };

  const exportToTxt = () => {
    const text = generateRichTextReport().replace(/\*/g, "");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title}_${new Date().getTime()}.txt`;
    link.click();
  };

  const handleCopyToClipboard = () => {
    const text = data
      .map((row) =>
        columns.map((col) => `${col.label}: ${row[col.key]}`).join(" | "),
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(lang === "ar" ? "تم النسخ بنجاح" : "Copied successfully");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "ar" ? "إضافة" : "Add"}</span>
          </button>

          <div className="flex items-center border rounded-lg p-1 bg-slate-50">
            <button
              onClick={handleCopyToClipboard}
              className="p-2 hover:bg-white rounded text-blue-600 transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={exportToTxt}
              className="p-2 hover:bg-white rounded text-slate-600 transition-colors"
              title="TXT Export"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={exportToExcel}
              className="p-2 hover:bg-white rounded text-green-600 transition-colors"
              title="Excel Export"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleShareWhatsApp()}
              className="p-2 hover:bg-white rounded text-green-500 transition-colors"
              title="WhatsApp Report"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b">
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4 text-start">
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-4 text-center">
                {lang === "ar" ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-12 text-center text-slate-400 italic"
                >
                  {lang === "ar"
                    ? "لا توجد بيانات حالياً"
                    : "No data available"}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  {columns.map((col) => {
                    const val = row[col.key];
                    let className = "px-6 py-4 text-sm text-slate-700";
                    if (
                      typeof val === "string" &&
                      (val.includes("ضعيف") || val.includes("مخالفة"))
                    ) {
                      className += " text-red-600 font-bold";
                    }
                    return (
                      <td key={col.key} className={className}>
                        {val}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(row)}
                        className="p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DynamicTable;
