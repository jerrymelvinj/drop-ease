"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, Check, ExternalLink, Download, RefreshCw, AlertCircle, Info, Calendar, Clock, X } from "lucide-react";
import { CandidateRecord } from "@/lib/types";
import { LIVE_EXCEL_DB_URL } from "./Screen01Upload";
import { getStatusOfferColor } from "@/lib/excelExport";

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

function parseInterviewSchedule(val: string): { dateStr: string; timeStr: string } {
  if (!val || !val.trim()) {
    const today = new Date().toISOString().split("T")[0];
    return { dateStr: today, timeStr: "11:00" };
  }
  try {
    const parts = val.split(",");
    const datePart = (parts[0] || "").trim();
    const timePart = (parts[1] || "").trim();

    let yyyyMmDd = "";
    if (datePart.includes("/")) {
      const [d, m, y] = datePart.split("/");
      if (d && m && y) {
        yyyyMmDd = `${y.padStart(4, "20")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    } else if (datePart.includes("-")) {
      yyyyMmDd = datePart;
    } else {
      yyyyMmDd = new Date().toISOString().split("T")[0];
    }

    let hhMm = "11:00";
    if (timePart) {
      const match = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const min = match[2];
        const ampm = match[3]?.toUpperCase();
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        hhMm = `${String(h).padStart(2, "0")}:${min}`;
      }
    }

    return { dateStr: yyyyMmDd, timeStr: hhMm };
  } catch {
    const today = new Date().toISOString().split("T")[0];
    return { dateStr: today, timeStr: "11:00" };
  }
}

function formatInterviewSchedule(dateStr: string, timeStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const formattedDate = `${d}/${m}/${y}`;

  let formattedTime = "11:00 AM";
  if (timeStr) {
    const [hStr, minStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const min = minStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    formattedTime = `${String(h).padStart(2, "0")}:${min} ${ampm}`;
  }

  return `${formattedDate}, ${formattedTime}`;
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
  const [schedulingCandidate, setSchedulingCandidate] = useState<{
    index: number;
    candidateName: string;
    date: string;
    time: string;
  } | null>(null);

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

      {/* Row Color Hierarchy Legend */}
      <div className="w-full max-w-7xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-500 font-semibold flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Row Colors:</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Under Review (On Hold)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-900 border border-green-300 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Selected (Offer Pending)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-400 font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-700" />
            <span>Selected (Offer Accepted)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-200 text-rose-950 border border-rose-300 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Selected (Offer Rejected)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 font-medium shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>Rejected</span>
          </span>
        </div>
        <div className="text-[11px] text-gray-500 font-medium">
          ⚡ Synchronized with Excel conditional formatting & dropdowns
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

          {/* Table Rows with Dynamic Row Coloring */}
          <tbody className="divide-y divide-gray-200">
            {records.map((rec, rowIndex) => {
              const rowStyling = getStatusOfferColor(rec.status, rec.offerStatus);
              return (
                <tr
                  key={rowIndex}
                  className={`transition-colors border-b ${rowStyling.webBorderClass} ${rowStyling.webBgClass}`}
                >
                  {/* S.No */}
                  <td className="py-2.5 px-3 text-center font-mono font-medium text-gray-700 border-r border-gray-200/80">
                    {rowIndex + 1}
                  </td>

                  {/* Editable Columns */}
                  {columns.map((col) => {
                    const val = String(rec[col.key] || "");
                    const isTimestamp = col.key === "addedTimestamp";
                    const isSelect = col.type === "select";
                    const isSchedule = col.key === "interviewSchedule";

                    if (isTimestamp) {
                      return (
                        <td key={col.key} className="p-1 border-r border-gray-200/80 last:border-r-0">
                          <div className="px-2.5 py-1.5 text-gray-600 font-mono text-[11px] truncate">
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
                        <td key={col.key} className="p-1 border-r border-gray-200/80 last:border-r-0">
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

                    if (isSchedule) {
                      return (
                        <td key={col.key} className="p-1 border-r border-gray-200/80 last:border-r-0">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={val}
                              placeholder={col.placeholder}
                              onChange={(e) => onUpdateRecord(rowIndex, col.key, e.target.value)}
                              onFocus={() => setActiveCell({ row: rowIndex, col: col.key })}
                              onBlur={() => setActiveCell(null)}
                              className={`flex-1 min-w-0 px-2 py-1.5 rounded bg-transparent border text-xs text-gray-800 transition ${
                                activeCell?.row === rowIndex && activeCell?.col === col.key
                                  ? "bg-white border-appBlue ring-2 ring-appBlue/30 font-medium"
                                  : "border-transparent hover:border-gray-300 focus:bg-white"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const parsed = parseInterviewSchedule(val);
                                setSchedulingCandidate({
                                  index: rowIndex,
                                  candidateName: rec.candidateName || `Candidate #${rowIndex + 1}`,
                                  date: parsed.dateStr,
                                  time: parsed.timeStr,
                                });
                              }}
                              className="p-1.5 rounded-md hover:bg-white/80 border border-gray-300/80 text-gray-600 hover:text-blue-700 bg-white/60 shadow-xs transition flex-shrink-0"
                              title="Pick date from Calendar and time from Clock timer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className="p-1 border-r border-gray-200/80 last:border-r-0"
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Calendar & Clock Schedule Picker Modal */}
      {schedulingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Interview Schedule Picker
                  </h3>
                  <p className="text-xs text-gray-500 truncate max-w-[240px]">
                    {schedulingCandidate.candidateName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingCandidate(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Date and Time Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Select Date</span>
                </label>
                <input
                  type="date"
                  value={schedulingCandidate.date}
                  onChange={(e) =>
                    setSchedulingCandidate((prev) =>
                      prev ? { ...prev, date: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-hidden bg-white shadow-xs cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Select Time</span>
                </label>
                <input
                  type="time"
                  value={schedulingCandidate.time}
                  onChange={(e) =>
                    setSchedulingCandidate((prev) =>
                      prev ? { ...prev, time: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-hidden bg-white shadow-xs cursor-pointer"
                />
              </div>

              {/* Quick Time Slots */}
              <div>
                <span className="block text-[11px] font-medium text-gray-500 mb-1.5">
                  Quick Time Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["10:00", "11:30", "14:00", "15:30", "17:00"].map((t) => {
                    const label = formatInterviewSchedule(
                      schedulingCandidate.date || "2026-09-15",
                      t
                    ).split(",")[1]?.trim() || t;
                    const isSelected = schedulingCandidate.time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setSchedulingCandidate((prev) =>
                            prev ? { ...prev, time: t } : null
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Display */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
                <span className="text-gray-500 block text-[11px] font-medium">
                  Formatted Schedule (Excel Compatible):
                </span>
                <span className="font-semibold text-blue-900 text-sm">
                  {formatInterviewSchedule(
                    schedulingCandidate.date,
                    schedulingCandidate.time
                  ) || "None selected"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 mt-6 pt-3.5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  onUpdateRecord(schedulingCandidate.index, "interviewSchedule", "");
                  setSchedulingCandidate(null);
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-medium"
              >
                Clear Schedule
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSchedulingCandidate(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const formatted = formatInterviewSchedule(
                      schedulingCandidate.date,
                      schedulingCandidate.time
                    );
                    onUpdateRecord(
                      schedulingCandidate.index,
                      "interviewSchedule",
                      formatted
                    );
                    setSchedulingCandidate(null);
                  }}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-lg transition font-medium shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Set Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
