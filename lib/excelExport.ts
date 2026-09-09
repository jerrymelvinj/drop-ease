import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { CandidateRecord } from "./types";

export const EXCEL_COLUMNS = [
  "S.No",
  "Candidate Name",
  "Email Address",
  "Contact Number",
  "Current / Latest Role",
  "Experience (Years)",
  "Current CTC",
  "Expected CTC",
  "Notice Period",
  "Key Skills & Highlights",
  "Reason for Leaving",
  "Interview Schedule",
  "Status",
  "Offer Status",
  "Added On",
];

export const ROLE_COLORS: Record<string, string> = {
  "all candidates": "FF00529B", // Signature Deep Blue
  "full stack developer": "FF1D4ED8", // Royal Blue
  "marketing manager": "FF7C3AED", // Vibrant Purple
  "sales manager": "FF059669", // Emerald Green
  "operations manager": "FF0D9488", // Deep Teal
  "lead data scientist": "FFBE185D", // Fuchsia / Rose
  "devops engineer": "FF0891B2", // Cyan / Slate Blue
  "product manager": "FFEA580C", // Coral Orange
  "ui ux designer": "FFDB2777", // Pink
  "e-commerce specialist": "FFD97706", // Amber / Warm Gold
};

export const DYNAMIC_COLORS = [
  "FF2563EB", "FF059669", "FF7C3AED", "FFD97706", "FFDC2626",
  "FF0891B2", "FF4F46E5", "FFDB2777", "FF0D9488", "FF65A30D"
];

export function getColorForRole(roleName: string, index = 0): string {
  const norm = (roleName || "").toLowerCase().trim();
  if (ROLE_COLORS[norm]) return ROLE_COLORS[norm];
  return DYNAMIC_COLORS[index % DYNAMIC_COLORS.length];
}

function recordToRowObject(rec: CandidateRecord, index: number) {
  return {
    "S.No": index + 1,
    "Candidate Name": rec.candidateName || "",
    "Email Address": rec.email || "",
    "Contact Number": rec.contactNumber || "",
    "Current / Latest Role": rec.roleAppliedFor || "General",
    "Experience (Years)": rec.yearsOfExperience || "",
    "Current CTC": rec.currentCtc || "",
    "Expected CTC": rec.expectedCtc || "",
    "Notice Period": rec.noticePeriod || "",
    "Key Skills & Highlights": rec.notes || "",
    "Reason for Leaving": rec.reasonForLeaving || "",
    "Interview Schedule": rec.interviewSchedule || "",
    "Status": rec.status || "Under Review",
    "Offer Status": rec.offerStatus || "Pending",
    "Added On": rec.addedTimestamp || new Date().toISOString().replace("T", " ").slice(0, 19),
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
export function sanitizeSheetName(name: string, existingNames: Set<string>): string {
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
 * Builds a professionally styled Excel workbook with:
 * - Distinct solid color & bold white text for top header row on each page
 * - Colored worksheet tab for each role
 * - Full column formatting so titles like "Expected CTC" and "Added Timestamp" are never truncated
 * - Alternating zebra rows and subtle grid lines
 */
export async function buildStyledExcelWorkbook(records: CandidateRecord[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HR Resume Intake System";
  wb.lastModifiedBy = "HR Resume Intake System";
  wb.created = new Date();
  wb.modified = new Date();

  const columnsDef = [
    { header: "S.No", key: "sNo", width: 8 },
    { header: "Candidate Name", key: "candidateName", width: 25 },
    { header: "Email Address", key: "email", width: 32 },
    { header: "Contact Number", key: "contactNumber", width: 20 },
    { header: "Current / Latest Role", key: "roleAppliedFor", width: 26 },
    { header: "Experience (Years)", key: "yearsOfExperience", width: 20 },
    { header: "Current CTC", key: "currentCtc", width: 16 },
    { header: "Expected CTC", key: "expectedCtc", width: 16 },
    { header: "Notice Period", key: "noticePeriod", width: 16 },
    { header: "Key Skills & Highlights", key: "notes", width: 38 },
    { header: "Reason for Leaving", key: "reasonForLeaving", width: 24 },
    { header: "Interview Schedule", key: "interviewSchedule", width: 24 },
    { header: "Status", key: "status", width: 16 },
    { header: "Offer Status", key: "offerStatus", width: 16 },
    { header: "Added On", key: "addedTimestamp", width: 22 },
  ];

  function addWorksheetWithStyling(
    title: string,
    items: CandidateRecord[],
    colorHex: string,
    isMaster = false,
    recToMasterRowMap?: Map<CandidateRecord, number>
  ) {
    const ws = wb.addWorksheet(title, {
      properties: { tabColor: { argb: colorHex } },
    });
    ws.columns = columnsDef;

    // Set number formats for date/time column (Interview Schedule)
    ws.getColumn(12).numFmt = "@"; // Text format preserve DD/MM/YYYY, HH:MM AM/PM

    // 1. Style Header Row (Row 1)
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Segoe UI",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: colorHex },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal:
          colNumber === 1 || colNumber === 6 || colNumber === 9 || colNumber === 13 || colNumber === 14 || colNumber === 15
            ? "center"
            : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
    });

    // 2. Add Data Rows
    items.forEach((rec, rIdx) => {
      let rowValues: any;

      if (isMaster || !recToMasterRowMap) {
        if (recToMasterRowMap) {
          recToMasterRowMap.set(rec, rIdx + 2); // Row 1 is header, Row 2 is first candidate
        }
        rowValues = {
          sNo: rIdx + 1,
          candidateName: rec.candidateName || "",
          email: rec.email || "",
          contactNumber: rec.contactNumber || "",
          roleAppliedFor: rec.roleAppliedFor || "General",
          yearsOfExperience: rec.yearsOfExperience || "",
          currentCtc: rec.currentCtc || "",
          expectedCtc: rec.expectedCtc || "",
          noticePeriod: rec.noticePeriod || "",
          notes: rec.notes || "",
          reasonForLeaving: rec.reasonForLeaving || "",
          interviewSchedule: rec.interviewSchedule || "",
          status: rec.status || "Under Review",
          offerStatus: rec.offerStatus || "Pending",
          addedTimestamp: rec.addedTimestamp || "",
        };
      } else {
        // Dynamic Excel Formula Linking to 'All Candidates' Master Sheet
        const masterRow = recToMasterRowMap.get(rec) || (rIdx + 2);
        rowValues = {
          sNo: { formula: `'All Candidates'!A${masterRow}`, result: rIdx + 1 },
          candidateName: { formula: `'All Candidates'!B${masterRow}`, result: rec.candidateName || "" },
          email: { formula: `'All Candidates'!C${masterRow}`, result: rec.email || "" },
          contactNumber: { formula: `'All Candidates'!D${masterRow}`, result: rec.contactNumber || "" },
          roleAppliedFor: { formula: `'All Candidates'!E${masterRow}`, result: rec.roleAppliedFor || "General" },
          yearsOfExperience: { formula: `'All Candidates'!F${masterRow}`, result: rec.yearsOfExperience || "" },
          currentCtc: { formula: `'All Candidates'!G${masterRow}`, result: rec.currentCtc || "" },
          expectedCtc: { formula: `'All Candidates'!H${masterRow}`, result: rec.expectedCtc || "" },
          noticePeriod: { formula: `'All Candidates'!I${masterRow}`, result: rec.noticePeriod || "" },
          notes: { formula: `'All Candidates'!J${masterRow}`, result: rec.notes || "" },
          reasonForLeaving: { formula: `'All Candidates'!K${masterRow}`, result: rec.reasonForLeaving || "" },
          interviewSchedule: { formula: `'All Candidates'!L${masterRow}`, result: rec.interviewSchedule || "" },
          status: { formula: `'All Candidates'!M${masterRow}`, result: rec.status || "Under Review" },
          offerStatus: { formula: `'All Candidates'!N${masterRow}`, result: rec.offerStatus || "Pending" },
          addedTimestamp: { formula: `'All Candidates'!O${masterRow}`, result: rec.addedTimestamp || "" },
        };
      }

      const row = ws.addRow(rowValues);
      row.height = 22;
      const isEven = rIdx % 2 === 0;
      const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

      // Native Dropdown Data Validations in Excel
      row.getCell(13).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Under Review,Selected,Rejected"'],
        showErrorMessage: true,
        errorTitle: "Invalid Status",
        error: "Please select Under Review, Selected, or Rejected.",
      };

      row.getCell(14).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Pending,Accepted,Rejected"'],
        showErrorMessage: true,
        errorTitle: "Invalid Offer Status",
        error: "Please select Pending, Accepted, or Rejected.",
      };

      row.getCell(12).dataValidation = {
        type: "custom",
        allowBlank: true,
        formulae: ["TRUE"],
        promptTitle: "Interview Schedule",
        prompt: "Format: DD/MM/YYYY, HH:MM AM/PM",
      };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = {
          name: "Segoe UI",
          size: 10,
          color: { argb: "FF1F2937" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBg },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal:
            colNumber === 1 || colNumber === 6 || colNumber === 9 || colNumber === 13 || colNumber === 14 || colNumber === 15
              ? "center"
              : "left",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });
  }

  const sheetNames = new Set<string>();
  const recToMasterRowMap = new Map<CandidateRecord, number>();

  // 1. "All Candidates" Master Sheet (Parent Single Source of Truth)
  addWorksheetWithStyling(
    "All Candidates",
    records,
    ROLE_COLORS["all candidates"],
    true,
    recToMasterRowMap
  );
  sheetNames.add("all candidates");

  // 2. Group records by "Role Applied For"
  const roleGroups: { [role: string]: CandidateRecord[] } = {};
  for (const rec of records) {
    const roleKey =
      (rec.roleAppliedFor || "General / Unassigned").trim() ||
      "General / Unassigned";
    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = [];
    }
    roleGroups[roleKey].push(rec);
  }

  // 3. Create dynamic linked subpage for each unique Role
  let colorCounter = 1;
  for (const [roleName, roleRecords] of Object.entries(roleGroups)) {
    const sheetTitle = sanitizeSheetName(roleName, sheetNames);
    const color = getColorForRole(roleName, colorCounter++);
    addWorksheetWithStyling(
      sheetTitle,
      roleRecords,
      color,
      false,
      recToMasterRowMap
    );
  }

  return wb;
}

/**
 * Generates an Excel Workbook with segregation by Role Applied For, plus an All Candidates sheet (SheetJS compatible).
 */
export function generateRoleSegregatedWorkbook(records: CandidateRecord[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const sheetNames = new Set<string>();

  const allRows = records.map((r, i) => recordToRowObject(r, i));
  const masterSheet = XLSX.utils.json_to_sheet(allRows, { header: EXCEL_COLUMNS });
  masterSheet["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 25 }, // Name
    { wch: 32 }, // Email
    { wch: 20 }, // Phone
    { wch: 26 }, // Role
    { wch: 20 }, // Experience
    { wch: 16 }, // Current CTC
    { wch: 16 }, // Expected CTC
    { wch: 16 }, // Notice Period
    { wch: 38 }, // Notes
    { wch: 24 }, // Reason for Leaving
    { wch: 24 }, // Interview Schedule
    { wch: 16 }, // Status
    { wch: 16 }, // Offer Status
    { wch: 22 }, // Added On
  ];
  XLSX.utils.book_append_sheet(wb, masterSheet, "All Candidates");
  sheetNames.add("all candidates");

  const roleGroups: { [role: string]: CandidateRecord[] } = {};
  for (const rec of records) {
    const roleKey = (rec.roleAppliedFor || "General / Unassigned").trim() || "General / Unassigned";
    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = [];
    }
    roleGroups[roleKey].push(rec);
  }

  for (const [roleName, roleRecords] of Object.entries(roleGroups)) {
    const sheetTitle = sanitizeSheetName(roleName, sheetNames);
    const roleRows = roleRecords.map((r, i) => recordToRowObject(r, i));
    const roleSheet = XLSX.utils.json_to_sheet(roleRows, { header: EXCEL_COLUMNS });
    roleSheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 32 },
      { wch: 20 },
      { wch: 26 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 38 },
      { wch: 24 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, roleSheet, sheetTitle);
  }

  return wb;
}

/**
 * Downloads the styled Excel database file directly to the user's browser.
 */
export async function downloadExcelDatabase(records: CandidateRecord[], fileName = "hr_candidates_db.xlsx") {
  try {
    const wb = await buildStyledExcelWorkbook(records);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("ExcelJS client download fallback to SheetJS:", err);
    const wb = generateRoleSegregatedWorkbook(records);
    XLSX.writeFile(wb, fileName);
  }
}
