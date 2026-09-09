"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, Check, ExternalLink, Download } from "lucide-react";
import { CandidateRecord } from "@/lib/types";
import { LIVE_EXCEL_DB_URL } from "./Screen01Upload";

interface Screen03ReviewTableProps {
  records: CandidateRecord[];
  onUpdateRecord: (index: number, field: keyof CandidateRecord, value: string) => void;
  onBack: () => void;
  onOpenExcelDb: () => void;
  onSaveToDatabase: () => void;
  onDownloadLocalBackup: () => void;
  exportSuccessMessage: string | null;
}

export default function Screen03ReviewTable({
  records,
  onUpdateRecord,
  onBack,
  onOpenExcelDb,
  onSaveToDatabase,
  onDownloadLocalBackup,
  exportSuccessMessage,
}: Screen03ReviewTableProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);

  const columns: { key: keyof CandidateRecord; label: string; width: string; placeholder: string }[] = [
    { key: "candidateName", label: "Candidate Name", width: "min-w-[150px]", placeholder: "Name" },
    { key: "email", label: "Email ID", width: "min-w-[170px]", placeholder: "email@domain.com" },
    { key: "contactNumber", label: "Contact Number", width: "min-w-[130px]", placeholder: "+1 234..." },
    { key: "roleAppliedFor", label: "Role Applied For", width: "min-w-[160px]", placeholder: "Job Role" },
    { key: "yearsOfExperience", label: "Years of Experience", width: "min-w-[110px]", placeholder: "Enter XP" },
    { key: "currentCtc", label: "Current CTC", width: "min-w-[120px]", placeholder: "Enter Current CTC" },
    { key: "expectedCtc", label: "Expected CTC", width: "min-w-[120px]", placeholder: "Enter Expected CTC" },
    { key: "noticePeriod", label: "Notice Period", width: "min-w-[120px]", placeholder: "Enter Notice Period" },
    { key: "notes", label: "Notes", width: "min-w-[180px]", placeholder: "Enter Notes" },
    { key: "addedTimestamp", label: "Added Timestamp", width: "min-w-[140px]", placeholder: "" },
  ];

  const handleGoToLiveExcel = () => {
    window.open(LIVE_EXCEL_DB_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#F5F6FB] flex flex-col justify-between p-4 sm:p-8 lg:p-12">
      {/* Top Header */}
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight mb-2 text-center">
          PDFs have been merged!
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 text-center max-w-2xl">
          Review and edit the extracted candidate information. Click any cell to make manual corrections before saving.
        </p>

        {/* Success Alert Banner */}
        {exportSuccessMessage && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Main Table Container Matching Screen 03 */}
      <div className="w-full max-w-7xl mx-auto flex-1 overflow-x-auto shadow-sm rounded-xl border border-blue-900/30 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          {/* Deep Blue Header */}
          <thead>
            <tr className="bg-[#00529B] text-white border-b border-blue-900">
              <th className="py-3 px-3.5 font-semibold text-center w-12 border-r border-blue-800/60">
                S.No
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-3.5 font-semibold border-r border-blue-800/60 last:border-r-0 ${col.width}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-blue-100">
            {records.map((rec, rowIndex) => (
              <tr
                key={rowIndex}
                className={`transition-colors ${
                  rowIndex % 2 === 0 ? "bg-[#00529B]/10 hover:bg-[#00529B]/15" : "bg-white hover:bg-blue-50/50"
                }`}
              >
                {/* S.No */}
                <td className="py-2.5 px-3 text-center font-mono font-medium text-gray-700 border-r border-blue-100">
                  {rowIndex + 1}
                </td>

                {/* Editable Columns */}
                {columns.map((col) => {
                  const val = String(rec[col.key] || "");
                  const isTimestamp = col.key === "addedTimestamp";

                  return (
                    <td
                      key={col.key}
                      className="p-1 border-r border-blue-100 last:border-r-0"
                    >
                      {isTimestamp ? (
                        <div className="px-2.5 py-1.5 text-gray-500 font-mono text-[11px] truncate">
                          {val}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          placeholder={col.placeholder}
                          onChange={(e) =>
                            onUpdateRecord(rowIndex, col.key, e.target.value)
                          }
                          onFocus={() =>
                            setActiveCell({ row: rowIndex, col: col.key })
                          }
                          onBlur={() => setActiveCell(null)}
                          className={`w-full px-2.5 py-1.5 rounded bg-transparent border text-xs text-gray-800 transition ${
                            activeCell?.row === rowIndex &&
                            activeCell?.col === col.key
                              ? "bg-white border-appBlue ring-2 ring-appBlue/30 font-medium"
                              : "border-transparent hover:border-gray-300 focus:bg-white"
                          }`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Row Underneath Table Matching Screen 03 */}
      <div className="w-full max-w-7xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 relative">
        {/* Back Button (Circular Dark Grey) */}
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#5E6470] hover:bg-[#4B515C] active:scale-95 text-white flex items-center justify-center shadow-sm transition sm:absolute sm:left-4"
          title="Back to file staging"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Center Action Buttons */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {/* Go to Excel DB (Green Border, Redirects to Live SharePoint Excel) */}
          <button
            onClick={handleGoToLiveExcel}
            className="w-52 py-3.5 px-6 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] text-[#15803D] font-medium text-base border-2 border-[#16A34A] shadow-sm transition flex items-center justify-center gap-2"
          >
            <span>Go to Excel DB</span>
            <ExternalLink className="w-4 h-4 text-[#16A34A]" />
          </button>

          {/* Export to Excel CTA (Acts as Save to Database Action) */}
          <button
            onClick={onSaveToDatabase}
            className="w-56 py-3.5 px-6 rounded-xl bg-[#00529B] hover:bg-[#00407A] active:scale-[0.98] text-white font-medium text-base shadow-md flex items-center justify-center gap-2.5 transition"
            title="Save verified candidates to the database"
          >
            <span>Export to Excel</span>
            <Save className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Secondary Download Local Backup Option */}
        <div className="sm:absolute sm:right-4 flex items-center gap-3 text-xs">
          <button
            onClick={onDownloadLocalBackup}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-1 hover:underline"
            title="Download offline .xlsx copy"
          >
            <Download className="w-3.5 h-3.5" /> Download .xlsx backup
          </button>
        </div>
      </div>
    </div>
  );
}
