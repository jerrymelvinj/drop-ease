"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, Check, ExternalLink, Download, RefreshCw, AlertCircle, Info } from "lucide-react";
import { CandidateRecord } from "@/lib/types";
import { LIVE_EXCEL_DB_URL } from "./Screen01Upload";

export interface SyncNotification {
  type: "success" | "error";
  savedCount?: number;
  duplicateCount?: number;
  errorMessage?: string;
}

interface Screen03ReviewTableProps {
  records: CandidateRecord[];
  onUpdateRecord: (index: number, field: keyof CandidateRecord, value: string) => void;
  onBack: () => void;
  onOpenExcelDb: () => void;
  onSaveToDatabase: () => void;
  onDownloadLocalBackup: () => void;
  onOpenCloudSync: () => void;
  hasCloudWebhook: boolean;
  notification: SyncNotification | null;
  isSaving?: boolean;
}

export default function Screen03ReviewTable({
  records,
  onUpdateRecord,
  onBack,
  onOpenExcelDb,
  onSaveToDatabase,
  onDownloadLocalBackup,
  onOpenCloudSync,
  hasCloudWebhook,
  notification,
  isSaving = false,
}: Screen03ReviewTableProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);

  const columns: {
    key: keyof CandidateRecord;
    label: string;
    width: string;
    placeholder: string;
    tooltip?: string;
    type?: "text" | "select" | "timestamp";
    options?: { label: string; value: string; colorClass: string }[];
  }[] = [
    { key: "candidateName", label: "Candidate Name", width: "min-w-[150px]", placeholder: "Name" },
    { key: "email", label: "Email Address", width: "min-w-[175px]", placeholder: "email@domain.com" },
    { key: "contactNumber", label: "Contact Number", width: "min-w-[130px]", placeholder: "+1 234..." },
    {
      key: "roleAppliedFor",
      label: "Current / Latest Role",
      width: "min-w-[180px]",
      placeholder: "Current Role",
      tooltip: "Auto-extracted from current work history or headline",
    },
    { key: "yearsOfExperience", label: "Experience (Years)", width: "min-w-[130px]", placeholder: "Years of XP" },
    { key: "currentCtc", label: "Current CTC", width: "min-w-[120px]", placeholder: "Current CTC" },
    { key: "expectedCtc", label: "Expected CTC", width: "min-w-[120px]", placeholder: "Expected CTC" },
    { key: "noticePeriod", label: "Notice Period", width: "min-w-[120px]", placeholder: "Notice Period" },
    { key: "notes", label: "Key Skills & Highlights", width: "min-w-[200px]", placeholder: "Highlights" },
    { key: "reasonForLeaving", label: "Reason for Leaving", width: "min-w-[160px]", placeholder: "Enter reason" },
    { key: "interviewSchedule", label: "Interview Schedule", width: "min-w-[190px]", placeholder: "DD/MM/YYYY, HH:MM AM/PM" },
    {
      key: "status",
      label: "Status",
      width: "min-w-[145px]",
      placeholder: "Status",
      type: "select",
      options: [
        { label: "Under Review", value: "Under Review", colorClass: "bg-gray-100 text-gray-700 border-gray-300" },
        { label: "Selected", value: "Selected", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
        { label: "Rejected", value: "Rejected", colorClass: "bg-rose-100 text-rose-800 border-rose-300" },
      ],
    },
    {
      key: "offerStatus",
      label: "Offer Status",
      width: "min-w-[145px]",
      placeholder: "Offer Status",
      type: "select",
      options: [
        { label: "Pending", value: "Pending", colorClass: "bg-gray-100 text-gray-700 border-gray-300" },
        { label: "Accepted", value: "Accepted", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
        { label: "Rejected", value: "Rejected", colorClass: "bg-rose-100 text-rose-800 border-rose-300" },
      ],
    },
    { key: "addedTimestamp", label: "Added On", width: "min-w-[140px]", placeholder: "", type: "timestamp" },
  ];

  const handleGoToLiveExcel = () => {
    window.open(LIVE_EXCEL_DB_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#F5F6FB] flex flex-col justify-between p-4 sm:p-8 lg:p-10">
      {/* Top Header & Navigation Bar */}
      <div className="w-full max-w-7xl mx-auto flex flex-col mb-6">
        {/* Top Actions Row */}
        <div className="w-full flex items-center justify-between gap-3 mb-4">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium shadow-sm flex items-center gap-1.5 transition"
            title="← Back to Staging"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to Staging</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenCloudSync}
              className="hidden sm:flex px-3 py-1.5 rounded-full text-xs font-medium border items-center gap-1.5 transition bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-sm"
              title="Configure Live SharePoint/Cloud Sync"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live SharePoint: TEST.xlsx</span>
            </button>

            <button
              onClick={handleGoToLiveExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 shadow-sm transition"
              title="Open Live Excel DB in SharePoint"
            >
              <span>Open Live Excel DB</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Section Header & Instructions */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight mb-2">
            Review & Verify Candidate Profiles
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">
            Candidate data and latest designations have been extracted. Edit any cell inline before saving to the live database.
          </p>

          {/* System Notifications & Feedback (Post-Click) */}
          {notification && notification.type === "success" && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 animate-in fade-in duration-200">
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Successfully saved {notification.savedCount ?? records.length} candidate(s) to the Excel database.
                </span>
              </div>
              {typeof notification.duplicateCount === "number" && notification.duplicateCount > 0 && (
                <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>{notification.duplicateCount} duplicate entries were identified and omitted.</span>
                </div>
              )}
            </div>
          )}

          {notification && notification.type === "error" && (
            <div className="mt-4 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                Unable to sync to the live sheet. Please verify your connection or database permissions and retry.
              </span>
            </div>
          )}
        </div>
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
                  title={col.tooltip}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.tooltip && (
                      <span
                        title={col.tooltip}
                        aria-label={col.tooltip}
                        className="cursor-help inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/35 text-[10px] text-white font-bold transition"
                      >
                        i
                      </span>
                    )}
                  </div>
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
                  const isSelect = col.type === "select";

                  if (isTimestamp) {
                    return (
                      <td key={col.key} className="p-1 border-r border-blue-100 last:border-r-0">
                        <div className="px-2.5 py-1.5 text-gray-500 font-mono text-[11px] truncate">
                          {val}
                        </div>
                      </td>
                    );
                  }

                  if (isSelect) {
                    const fallbackVal = col.key === "status" ? "Under Review" : "Pending";
                    const currentVal = val || fallbackVal;
                    let badgeClass = "bg-gray-100 text-gray-700 border-gray-300";
                    if (currentVal === "Selected" || currentVal === "Accepted") {
                      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-medium";
                    } else if (currentVal === "Rejected") {
                      badgeClass = "bg-rose-100 text-rose-800 border-rose-300 font-medium";
                    }

                    return (
                      <td key={col.key} className="p-1 border-r border-blue-100 last:border-r-0">
                        <select
                          value={currentVal}
                          onChange={(e) => onUpdateRecord(rowIndex, col.key, e.target.value)}
                          className={`w-full px-2 py-1 rounded-md text-xs border transition cursor-pointer font-medium focus:outline-hidden focus:ring-2 focus:ring-appBlue/40 ${badgeClass}`}
                        >
                          {col.options?.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-white text-gray-800 font-normal">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className="p-1 border-r border-blue-100 last:border-r-0"
                    >
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Row Underneath Table Matching Screen 03 */}
      <div className="w-full max-w-7xl mx-auto mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Secondary Action: Back to Staging */}
        <button
          onClick={onBack}
          className="py-3 px-5 rounded-xl bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-medium text-sm border border-gray-300 shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
          title="← Back to Staging"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Staging</span>
        </button>

        {/* Center Action Buttons */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {/* External Link Action: Open Live Excel DB */}
          <button
            onClick={handleGoToLiveExcel}
            className="w-52 py-3.5 px-6 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] text-[#15803D] font-medium text-base border-2 border-[#16A34A] shadow-sm transition flex items-center justify-center gap-2"
            title="Open Live Excel DB"
          >
            <span>Open Live Excel DB</span>
            <ExternalLink className="w-4 h-4 text-[#16A34A]" />
          </button>

          {/* Primary CTA: Save to Database (Active Saving State: Syncing to Excel DB...) */}
          <button
            onClick={onSaveToDatabase}
            disabled={isSaving}
            className="w-56 py-3.5 px-6 rounded-xl bg-[#00529B] hover:bg-[#00407A] active:scale-[0.98] text-white font-medium text-base shadow-md flex items-center justify-center gap-2.5 transition disabled:opacity-75 disabled:cursor-not-allowed"
            title="Save to Database"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                <span>Syncing to Excel DB...</span>
              </>
            ) : (
              <>
                <span>Save to Database</span>
                <Save className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>

        {/* Secondary Download Local Backup Option */}
        <div className="flex items-center gap-3 text-xs">
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
