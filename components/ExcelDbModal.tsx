"use client";

import React, { useState, useMemo, useRef } from "react";
import { X, FileSpreadsheet, Download, Upload, Trash2, Search, Layers, UserCheck } from "lucide-react";
import * as XLSX from "xlsx";
import { CandidateRecord } from "@/lib/types";
import { downloadExcelDatabase } from "@/lib/excelExport";

interface ExcelDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: CandidateRecord[];
  onClearDb: () => void;
  onImportRecords: (imported: CandidateRecord[]) => void;
}

export default function ExcelDbModal({
  isOpen,
  onClose,
  database,
  onClearDb,
  onImportRecords,
}: ExcelDbModalProps) {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Candidates");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract unique roles for tabs
  const roles = useMemo(() => {
    const set = new Set<string>();
    database.forEach((c) => {
      const r = (c.roleAppliedFor || "General / Unassigned").trim();
      if (r) set.add(r);
    });
    return ["All Candidates", ...Array.from(set)];
  }, [database]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return database.filter((c) => {
      const roleMatch =
        selectedRole === "All Candidates" ||
        (c.roleAppliedFor || "General / Unassigned").trim() === selectedRole;
      if (!roleMatch) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.candidateName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.contactNumber.toLowerCase().includes(q) ||
        c.roleAppliedFor.toLowerCase().includes(q)
      );
    });
  }, [database, selectedRole, search]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const importedList: CandidateRecord[] = [];

      // Look across all sheets or first sheet
      for (const sheetName of wb.SheetNames) {
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
        rows.forEach((row, idx) => {
          // Normalize column headers
          const getVal = (...keys: string[]) => {
            for (const k of keys) {
              for (const rowKey of Object.keys(row)) {
                if (rowKey.toLowerCase().replace(/[^a-z]/g, "") === k.toLowerCase().replace(/[^a-z]/g, "")) {
                  return String(row[rowKey] || "").trim();
                }
              }
            }
            return "";
          };

          const name = getVal("candidatename", "name", "applicantname");
          const email = getVal("emailid", "email", "primaryemail");

          if (name || email) {
            importedList.push({
              sNo: importedList.length + 1,
              candidateName: name || "Candidate",
              email: email || "",
              contactNumber: getVal("contactnumber", "phone", "contact", "phonenumber"),
              roleAppliedFor: getVal("roleappliedfor", "role", "designation", "jobrole") || sheetName,
              yearsOfExperience: getVal("yearsofexperience", "experience", "exp", "yoe"),
              currentCtc: getVal("currentctc", "ctc", "currentsalary"),
              expectedCtc: getVal("expectedctc", "expected", "expectedsalary"),
              noticePeriod: getVal("noticeperiod", "notice"),
              notes: getVal("notes", "remarks", "skills"),
              addedTimestamp: getVal("addedtimestamp", "date", "timestamp") || new Date().toISOString().replace("T", " ").slice(0, 19),
            });
          }
        });

        // If "All Candidates" sheet exists, only read that to avoid duplicate reads across role sheets
        if (sheetName.toLowerCase().includes("all candidate")) {
          break;
        }
      }

      if (importedList.length > 0) {
        onImportRecords(importedList);
        alert(`Successfully imported ${importedList.length} candidate record(s) from ${file.name}!`);
      } else {
        alert("No valid candidate rows found in the imported Excel file.");
      }
    } catch (err: any) {
      console.error("Failed to parse Excel file:", err);
      alert(`Failed to import Excel file: ${err.message}`);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      {/* Hidden Excel File Input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileImport}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-appGreen-text flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5 text-appGreen-text" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Excel Database: <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-700">hr_candidates_db.xlsx</span>
              </h3>
              <p className="text-xs text-gray-500">
                Segregated by Job Roles into individual worksheet tabs ({database.length} total entries)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              className="px-3.5 py-1.5 text-xs font-medium bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Import an existing Excel spreadsheet (.xlsx)"
            >
              <Upload className="w-3.5 h-3.5 text-gray-600" /> Import Excel
            </button>
            <button
              onClick={() => downloadExcelDatabase(database)}
              disabled={database.length === 0}
              className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Download .xlsx
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-200 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader: Role Tabs & Search */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5" /> Sheets:
            </span>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                  selectedRole === role
                    ? "bg-[#00529B] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-appBlue"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto p-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <UserCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No records found in this sheet.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00529B] text-white">
                    <th className="py-2.5 px-3 font-semibold">S.No</th>
                    <th className="py-2.5 px-3 font-semibold">Candidate Name</th>
                    <th className="py-2.5 px-3 font-semibold">Email ID</th>
                    <th className="py-2.5 px-3 font-semibold">Contact</th>
                    <th className="py-2.5 px-3 font-semibold">Role Applied For</th>
                    <th className="py-2.5 px-3 font-semibold">Exp</th>
                    <th className="py-2.5 px-3 font-semibold">Current CTC</th>
                    <th className="py-2.5 px-3 font-semibold">Expected CTC</th>
                    <th className="py-2.5 px-3 font-semibold">Notice</th>
                    <th className="py-2.5 px-3 font-semibold">Notes</th>
                    <th className="py-2.5 px-3 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((c, i) => (
                    <tr key={i} className="hover:bg-blue-50/40 transition">
                      <td className="py-2 px-3 text-gray-500 font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-900">{c.candidateName}</td>
                      <td className="py-2 px-3 text-blue-600">{c.email}</td>
                      <td className="py-2 px-3 text-gray-600">{c.contactNumber}</td>
                      <td className="py-2 px-3">
                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-medium">
                          {c.roleAppliedFor || "General"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-700">{c.yearsOfExperience || "-"}</td>
                      <td className="py-2 px-3 text-gray-700">{c.currentCtc || "-"}</td>
                      <td className="py-2 px-3 text-gray-700">{c.expectedCtc || "-"}</td>
                      <td className="py-2 px-3 text-gray-700">{c.noticePeriod || "-"}</td>
                      <td className="py-2 px-3 text-gray-500 max-w-[140px] truncate" title={c.notes}>{c.notes || "-"}</td>
                      <td className="py-2 px-3 text-gray-400 text-[10px] whitespace-nowrap">{c.addedTimestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-700">{filteredRecords.length}</strong> of{" "}
            <strong className="text-gray-700">{database.length}</strong> total candidates in database
          </div>
          {database.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear the local candidate database?")) {
                  onClearDb();
                }
              }}
              className="text-red-500 hover:text-red-700 flex items-center gap-1 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Database
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
