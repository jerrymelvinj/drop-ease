import * as XLSX from "xlsx";
import { CandidateRecord } from "./types";

export const EXCEL_COLUMNS = [
  "S.No",
  "Candidate Name",
  "Email ID",
  "Contact Number",
  "Role Applied For",
  "Years of Experience",
  "Current CTC",
  "Expected CTC",
  "Notice Period",
  "Notes",
  "Added Timestamp",
];

function recordToRowObject(rec: CandidateRecord, index: number) {
  return {
    "S.No": index + 1,
    "Candidate Name": rec.candidateName || "",
    "Email ID": rec.email || "",
    "Contact Number": rec.contactNumber || "",
    "Role Applied For": rec.roleAppliedFor || "General",
    "Years of Experience": rec.yearsOfExperience || "",
    "Current CTC": rec.currentCtc || "",
    "Expected CTC": rec.expectedCtc || "",
    "Notice Period": rec.noticePeriod || "",
    "Notes": rec.notes || "",
    "Added Timestamp": rec.addedTimestamp || new Date().toISOString(),
  };
}

/**
 * Checks if a new record is an exact duplicate of an existing record across all data fields.
 */
export function isExactDuplicate(
  existing: CandidateRecord,
  candidate: CandidateRecord
): boolean {
  const norm = (v: string | undefined) => (v || "").trim().toLowerCase();

  return (
    norm(existing.candidateName) === norm(candidate.candidateName) &&
    norm(existing.email) === norm(candidate.email) &&
    norm(existing.contactNumber) === norm(candidate.contactNumber) &&
    norm(existing.roleAppliedFor) === norm(candidate.roleAppliedFor) &&
    norm(existing.yearsOfExperience) === norm(candidate.yearsOfExperience) &&
    norm(existing.currentCtc) === norm(candidate.currentCtc) &&
    norm(existing.expectedCtc) === norm(candidate.expectedCtc) &&
    norm(existing.noticePeriod) === norm(candidate.noticePeriod) &&
    norm(existing.notes) === norm(candidate.notes)
  );
}

/**
 * Filter duplicates and merge new records with existing records.
 */
export function mergeCandidatesDeduplicated(
  existingRecords: CandidateRecord[],
  newRecords: CandidateRecord[]
): { merged: CandidateRecord[]; addedCount: number; duplicateCount: number } {
  const merged = [...existingRecords];
  let addedCount = 0;
  let duplicateCount = 0;

  for (const newRec of newRecords) {
    const isDup = existingRecords.some((ex) => isExactDuplicate(ex, newRec));
    if (isDup) {
      duplicateCount++;
    } else {
      merged.push({
        ...newRec,
        sNo: merged.length + 1,
      });
      addedCount++;
    }
  }

  return { merged, addedCount, duplicateCount };
}

/**
 * Sanitize an Excel sheet name (max 31 chars, no special chars : \ / ? * [ ])
 */
function sanitizeSheetName(name: string, existingNames: Set<string>): string {
  let clean = name.replace(/[:\\/?*\[\]]/g, " ").trim();
  if (!clean) clean = "General";
  clean = clean.slice(0, 31).trim();

  let candidate = clean;
  let counter = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    const suffix = ` (${counter})`;
    candidate = clean.slice(0, 31 - suffix.length) + suffix;
    counter++;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Generates an Excel Workbook with segregation by Role Applied For, plus an All Candidates sheet.
 */
export function generateRoleSegregatedWorkbook(records: CandidateRecord[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const sheetNames = new Set<string>();

  // 1. "All Candidates" Master Sheet
  const allRows = records.map((r, i) => recordToRowObject(r, i));
  const masterSheet = XLSX.utils.json_to_sheet(allRows, { header: EXCEL_COLUMNS });
  masterSheet["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 22 }, // Name
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 25 }, // Role
    { wch: 18 }, // Experience
    { wch: 15 }, // Current CTC
    { wch: 15 }, // Expected CTC
    { wch: 16 }, // Notice Period
    { wch: 30 }, // Notes
    { wch: 22 }, // Timestamp
  ];
  XLSX.utils.book_append_sheet(wb, masterSheet, "All Candidates");
  sheetNames.add("all candidates");

  // 2. Group records by "Role Applied For"
  const roleGroups: { [role: string]: CandidateRecord[] } = {};
  for (const rec of records) {
    const roleKey = (rec.roleAppliedFor || "General / Unassigned").trim() || "General / Unassigned";
    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = [];
    }
    roleGroups[roleKey].push(rec);
  }

  // 3. Create a worksheet for each unique Role
  for (const [roleName, roleRecords] of Object.entries(roleGroups)) {
    const sheetTitle = sanitizeSheetName(roleName, sheetNames);
    const roleRows = roleRecords.map((r, i) => recordToRowObject(r, i));
    const roleSheet = XLSX.utils.json_to_sheet(roleRows, { header: EXCEL_COLUMNS });
    roleSheet["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 28 },
      { wch: 18 },
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 16 },
      { wch: 30 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, roleSheet, sheetTitle);
  }

  return wb;
}

/**
 * Downloads the Excel database file directly to the user's browser.
 */
export function downloadExcelDatabase(records: CandidateRecord[], fileName = "hr_candidates_db.xlsx") {
  const wb = generateRoleSegregatedWorkbook(records);
  XLSX.writeFile(wb, fileName);
}
