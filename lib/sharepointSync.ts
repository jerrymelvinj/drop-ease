import https from "https";
import ExcelJS from "exceljs";
import { CandidateRecord } from "./types";
import { buildStyledExcelWorkbook } from "./excelExport";

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
        timeout: options.timeout || 25000,
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * 1. Reads existing Excel file from SharePoint using ExcelJS.
 * 2. Deduplicates incoming candidate records against existing records.
 * 3. Segregates candidates into worksheets based on their Role (latest job title) + master "All Candidates" sheet.
 * 4. Styles top row with bold text, white font, and vibrant solid color assigned to each page.
 * 5. Pushes updated workbook binary back to SharePoint via REST SaveBinaryStream.
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
      const existingWb = new ExcelJS.Workbook();
      await existingWb.xlsx.load(dlRes.body as any);
      const masterSheet =
        existingWb.getWorksheet("All Candidates") || existingWb.worksheets[0];

      if (masterSheet && masterSheet.rowCount > 1) {
        const headerMap: Record<number, string> = {};
        masterSheet.getRow(1).eachCell((cell, colNum) => {
          headerMap[colNum] = String(cell.value || "").trim();
        });

        masterSheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const r: Record<string, any> = {};
            row.eachCell((cell, colNum) => {
              const h = headerMap[colNum];
              if (h) r[h] = String(cell.value || "").trim();
            });

            const candidateName = r["Candidate Name"] || "";
            const email = r["Email Address"] || r["Email ID"] || "";

            if (candidateName || email) {
              existingRecords.push({
                sNo: Number(r["S.No"]) || existingRecords.length + 1,
                candidateName,
                email,
                contactNumber: r["Contact Number"] || "",
                roleAppliedFor: r["Current / Latest Role"] || r["Role Applied For"] || "",
                yearsOfExperience: r["Experience (Years)"] || r["Years of Experience"] || "",
                currentCtc: r["Current CTC"] || "",
                expectedCtc: r["Expected CTC"] || "",
                noticePeriod: r["Notice Period"] || "",
                notes: r["Key Skills & Highlights"] || r["Notes"] || "",
                reasonForLeaving: r["Reason for Leaving"] || "",
                interviewSchedule: r["Interview Schedule"] || "",
                status: r["Status"] || "Under Review",
                offerStatus: r["Offer Status"] || "Pending",
                addedTimestamp: r["Added On"] || r["Added Timestamp"] || "",
              });
            }
          }
        });
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

  // 6. Build styled workbook with bold headers, solid colored top rows, and colored tabs
  const styledWb = await buildStyledExcelWorkbook(merged);
  const binaryBuffer = await styledWb.xlsx.writeBuffer();
  const sheetsCreated = styledWb.worksheets.map((w) => w.name);

  // 7. Save binary stream back to SharePoint (with retry if locked by active edit session)
  const saveUrl = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${serverRelativeUrl}')/SaveBinaryStream`;

  let saveSuccess = false;
  let lastStatusCode = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const saveRes = await httpRequest(saveUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": cookies,
        "X-RequestDigest": formDigest,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(binaryBuffer.byteLength),
      },
      body: Buffer.from(binaryBuffer),
    });

    lastStatusCode = saveRes.statusCode;
    lastBody = saveRes.body.toString("utf-8");

    if (saveRes.statusCode === 200) {
      saveSuccess = true;
      break;
    }

    // HTTP 423 = Locked (user currently editing in Excel Online)
    if (saveRes.statusCode === 423 && attempt < 3) {
      await delay(2500);
    }
  }

  if (!saveSuccess) {
    if (lastStatusCode === 423) {
      throw new Error(
        "The Excel file is currently open in an active tab in Excel Online (locked for co-authoring). Please close or switch away from the TEST.xlsx browser tab and click 'Export to Excel' again to sync."
      );
    }

    throw new Error(
      `SharePoint SaveBinaryStream failed with HTTP status ${lastStatusCode}: ${lastBody}`
    );
  }

  return {
    success: true,
    totalRecords: merged.length,
    addedRecords: addedCount,
    duplicateRecords: duplicateCount,
    sheets: sheetsCreated,
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
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(dlRes.body as any);
      sheets = wb.worksheets.map((w) => w.name);
      const master = wb.getWorksheet("All Candidates") || wb.worksheets[0];
      if (master) {
        recordCount = Math.max(0, master.rowCount - 1);
      }
    } catch (e) {
      console.warn("Could not read sheets with ExcelJS", e);
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
