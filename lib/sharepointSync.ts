import https from "https";
import * as XLSX from "xlsx";
import { CandidateRecord } from "./types";
import { EXCEL_COLUMNS } from "./excelExport";

export const DEFAULT_SHAREPOINT_DB_URL =
  "https://akoimarketing-my.sharepoint.com/:x:/g/personal/career_akoi_in/IQD4TYUI8Xz1SJ4qcHes2gJFAbb78vco-WIisH_YTS9jS1g?e=lUvVIX";

function httpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Buffer | string;
    timeout?: number;
  } = {}
): Promise<{ statusCode: number; headers: Record<string, any>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: options.timeout || 20000,
      },
      (res) => {
        const data: Buffer[] = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            body: Buffer.concat(data),
          });
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`HTTP request timed out: ${url}`));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

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
    "Added Timestamp": rec.addedTimestamp || new Date().toISOString().replace("T", " ").slice(0, 19),
  };
}

export interface SharePointSyncResult {
  success: boolean;
  totalRecords: number;
  addedRecords: number;
  duplicateRecords: number;
  sheets: string[];
  serverRelativeUrl: string;
  fileName: string;
}

/**
 * Direct sync to Microsoft SharePoint / OneDrive Excel DB using sharing link session.
 * 1. Reads existing Excel file from SharePoint.
 * 2. Deduplicates incoming candidate records against existing records.
 * 3. Segregates candidates into worksheets based on their Role (latest job title) + master "All Candidates" sheet.
 * 4. Pushes updated workbook binary back to SharePoint via REST SaveBinaryStream.
 */
export async function syncCandidatesToSharePoint(
  shareUrl?: string,
  newRecords: CandidateRecord[] = []
): Promise<SharePointSyncResult> {
  const targetShareUrl = shareUrl?.trim() || DEFAULT_SHAREPOINT_DB_URL;

  // 1. Fetch sharing link to obtain session FedAuth cookies & redirect location
  const initialRes = await httpRequest(targetShareUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const cookies = (initialRes.headers["set-cookie"] || [])
    .map((c: string) => c.split(";")[0])
    .join("; ");

  const redirectLocation = initialRes.headers.location;
  if (!redirectLocation) {
    throw new Error("SharePoint sharing link did not return a redirect target.");
  }

  const locUrl = new URL(redirectLocation);
  const sourcedocMatch = redirectLocation.match(/sourcedoc=(?:%7B)?([a-f0-9-]+)(?:%7D)?/i);
  const uniqueId = sourcedocMatch ? sourcedocMatch[1] : null;
  if (!uniqueId) {
    throw new Error("Could not extract file UniqueId from SharePoint redirect URL.");
  }

  // Extract site root URL e.g. https://akoimarketing-my.sharepoint.com/personal/career_akoi_in
  const pathParts = locUrl.pathname.split("/_layouts/")[0];
  const siteUrl = `${locUrl.origin}${pathParts}`;

  // 2. Request contextinfo to get FormDigestValue
  const ctxRes = await httpRequest(`${siteUrl}/_api/contextinfo`, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
      "Accept": "application/json;odata=verbose",
      "Content-Length": "0",
    },
  });

  if (ctxRes.statusCode !== 200) {
    throw new Error(`Failed to acquire SharePoint FormDigest: HTTP ${ctxRes.statusCode}`);
  }

  const ctxData = JSON.parse(ctxRes.body.toString("utf-8"));
  const formDigest = ctxData?.d?.GetContextWebInformation?.FormDigestValue;
  if (!formDigest) {
    throw new Error("Invalid FormDigest response received from SharePoint.");
  }

  // 3. Request file metadata to obtain ServerRelativeUrl and Name
  const metaUrl = `${siteUrl}/_api/web/GetFileById(guid'${uniqueId}')`;
  const metaRes = await httpRequest(metaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
      "Accept": "application/json;odata=verbose",
    },
  });

  if (metaRes.statusCode !== 200) {
    throw new Error(`Failed to fetch file metadata from SharePoint: HTTP ${metaRes.statusCode}`);
  }

  const fileMeta = JSON.parse(metaRes.body.toString("utf-8"))?.d;
  const serverRelativeUrl = fileMeta?.ServerRelativeUrl;
  const fileName = fileMeta?.Name || "TEST.xlsx";

  if (!serverRelativeUrl) {
    throw new Error("Could not determine SharePoint server-relative URL for file.");
  }

  // 4. Download existing file to read existing records
  const downloadUrl = `${siteUrl}/_layouts/15/download.aspx?UniqueId=${uniqueId}&Translate=false`;
  const dlRes = await httpRequest(downloadUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
    },
  });

  let existingRecords: CandidateRecord[] = [];
  if (dlRes.statusCode === 200 && dlRes.body.length > 500) {
    try {
      const existingWb = XLSX.read(dlRes.body, { type: "buffer" });
      const masterSheet =
        existingWb.Sheets["All Candidates"] ||
        existingWb.Sheets[existingWb.SheetNames[0]];

      if (masterSheet) {
        const rows: any[] = XLSX.utils.sheet_to_json(masterSheet);
        existingRecords = rows
          .map((r: any, idx: number) => ({
            sNo: Number(r["S.No"]) || idx + 1,
            candidateName: String(r["Candidate Name"] || "").trim(),
            email: String(r["Email ID"] || "").trim(),
            contactNumber: String(r["Contact Number"] || "").trim(),
            roleAppliedFor: String(r["Role Applied For"] || "").trim(),
            yearsOfExperience: String(r["Years of Experience"] || "").trim(),
            currentCtc: String(r["Current CTC"] || "").trim(),
            expectedCtc: String(r["Expected CTC"] || "").trim(),
            noticePeriod: String(r["Notice Period"] || "").trim(),
            notes: String(r["Notes"] || "").trim(),
            addedTimestamp: String(r["Added Timestamp"] || "").trim(),
          }))
          .filter((r) => r.candidateName || r.email);
      }
    } catch (parseErr) {
      console.warn("Could not parse existing workbook, will create fresh:", parseErr);
    }
  }

  // 5. Deduplicate and merge candidates
  const merged: CandidateRecord[] = [...existingRecords];
  let addedCount = 0;
  let duplicateCount = 0;

  for (const newRec of newRecords) {
    const isDup = existingRecords.some((ex) => {
      const emailMatch =
        Boolean(ex.email &&
        newRec.email &&
        ex.email.toLowerCase() === newRec.email.toLowerCase());
      const nameMatch =
        Boolean(ex.candidateName &&
        newRec.candidateName &&
        ex.candidateName.toLowerCase() === newRec.candidateName.toLowerCase());
      const phoneMatch =
        Boolean(ex.contactNumber &&
        newRec.contactNumber &&
        ex.contactNumber.replace(/\D/g, "") ===
          newRec.contactNumber.replace(/\D/g, ""));

      return emailMatch || (nameMatch && phoneMatch);
    });

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

  // 6. Build role-segregated workbook
  const wb = XLSX.utils.book_new();
  const sheetNames = new Set<string>();

  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 24 }, // Candidate Name
    { wch: 30 }, // Email ID
    { wch: 18 }, // Contact Number
    { wch: 28 }, // Role Applied For
    { wch: 18 }, // Years of Experience
    { wch: 16 }, // Current CTC
    { wch: 16 }, // Expected CTC
    { wch: 16 }, // Notice Period
    { wch: 32 }, // Notes
    { wch: 22 }, // Added Timestamp
  ];

  // 6a. Master "All Candidates" Sheet
  const allRows = merged.map((r, i) => recordToRowObject(r, i));
  const masterWs = XLSX.utils.json_to_sheet(allRows, { header: EXCEL_COLUMNS });
  masterWs["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, masterWs, "All Candidates");
  sheetNames.add("all candidates");

  // 6b. Role-segregated sheets
  const roleGroups: { [role: string]: CandidateRecord[] } = {};
  for (const rec of merged) {
    const roleKey =
      (rec.roleAppliedFor || "General / Unassigned").trim() ||
      "General / Unassigned";
    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = [];
    }
    roleGroups[roleKey].push(rec);
  }

  for (const [roleName, roleItems] of Object.entries(roleGroups)) {
    const sheetTitle = sanitizeSheetName(roleName, sheetNames);
    const roleRows = roleItems.map((r, i) => recordToRowObject(r, i));
    const roleWs = XLSX.utils.json_to_sheet(roleRows, { header: EXCEL_COLUMNS });
    roleWs["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, roleWs, sheetTitle);
  }

  const binaryBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // 7. Save binary stream back to SharePoint
  const saveUrl = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/SaveBinaryStream`;
  const saveRes = await httpRequest(saveUrl, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
      "X-RequestDigest": formDigest,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(binaryBuffer.length),
    },
    body: binaryBuffer,
  });

  if (saveRes.statusCode !== 200) {
    throw new Error(
      `SharePoint SaveBinaryStream failed with HTTP status ${saveRes.statusCode}: ${saveRes.body.toString(
        "utf-8"
      )}`
    );
  }

  return {
    success: true,
    totalRecords: merged.length,
    addedRecords: addedCount,
    duplicateRecords: duplicateCount,
    sheets: wb.SheetNames,
    serverRelativeUrl,
    fileName,
  };
}

/**
 * Diagnostic test to verify that the SharePoint file is accessible.
 */
export async function testSharePointConnection(shareUrl?: string): Promise<{
  connected: boolean;
  fileName: string;
  serverRelativeUrl: string;
  sheets: string[];
  recordCount: number;
}> {
  const targetShareUrl = shareUrl?.trim() || DEFAULT_SHAREPOINT_DB_URL;

  const initialRes = await httpRequest(targetShareUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  const cookies = (initialRes.headers["set-cookie"] || [])
    .map((c: string) => c.split(";")[0])
    .join("; ");

  const redirectLocation = initialRes.headers.location;
  if (!redirectLocation) {
    throw new Error("SharePoint sharing link did not redirect");
  }

  const locUrl = new URL(redirectLocation);
  const sourcedocMatch = redirectLocation.match(/sourcedoc=(?:%7B)?([a-f0-9-]+)(?:%7D)?/i);
  const uniqueId = sourcedocMatch ? sourcedocMatch[1] : null;

  const pathParts = locUrl.pathname.split("/_layouts/")[0];
  const siteUrl = `${locUrl.origin}${pathParts}`;

  // Get file meta
  const metaUrl = `${siteUrl}/_api/web/GetFileById(guid'${uniqueId}')`;
  const metaRes = await httpRequest(metaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
      "Accept": "application/json;odata=verbose",
    },
  });

  const fileMeta = JSON.parse(metaRes.body.toString("utf-8"))?.d;

  // Download to check sheets
  const downloadUrl = `${siteUrl}/_layouts/15/download.aspx?UniqueId=${uniqueId}&Translate=false`;
  const dlRes = await httpRequest(downloadUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
    },
  });

  let sheets: string[] = [];
  let recordCount = 0;

  if (dlRes.statusCode === 200 && dlRes.body.length > 500) {
    try {
      const wb = XLSX.read(dlRes.body, { type: "buffer" });
      sheets = wb.SheetNames;
      const master = wb.Sheets["All Candidates"] || wb.Sheets[sheets[0]];
      if (master) {
        recordCount = XLSX.utils.sheet_to_json(master).length;
      }
    } catch (e) {
      console.warn("Could not read sheets", e);
    }
  }

  return {
    connected: true,
    fileName: fileMeta?.Name || "TEST.xlsx",
    serverRelativeUrl: fileMeta?.ServerRelativeUrl || "",
    sheets,
    recordCount,
  };
}
