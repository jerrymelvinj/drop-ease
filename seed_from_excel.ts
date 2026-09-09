import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { CandidateRecord } from "./lib/types";

export function importExcelToRecords(filePath: string): CandidateRecord[] {
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return [];
  }

  const buffer = fs.readFileSync(filePath);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const records: CandidateRecord[] = [];

  console.log("Workbook sheet names found:", wb.SheetNames);

  for (const sheetName of wb.SheetNames) {
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    console.log(`Sheet "${sheetName}" has ${rows.length} row(s)`);

    rows.forEach((row) => {
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

      const name = getVal("candidatename", "name", "applicantname", "full name");
      const email = getVal("emailid", "email", "primaryemail", "email address");

      if (name || email) {
        records.push({
          sNo: records.length + 1,
          candidateName: name || "Candidate",
          email: email || "",
          contactNumber: getVal("contactnumber", "phone", "contact", "phonenumber", "mobile"),
          roleAppliedFor: getVal("roleappliedfor", "role", "designation", "jobrole", "position") || sheetName,
          yearsOfExperience: getVal("yearsofexperience", "experience", "exp", "yoe", "totalexp"),
          currentCtc: getVal("currentctc", "ctc", "currentsalary"),
          expectedCtc: getVal("expectedctc", "expected", "expectedsalary"),
          noticePeriod: getVal("noticeperiod", "notice"),
          notes: getVal("notes", "remarks", "skills", "comments"),
          addedTimestamp: getVal("addedtimestamp", "date", "timestamp") || new Date().toISOString().replace("T", " ").slice(0, 19),
        });
      }
    });

    if (sheetName.toLowerCase().includes("all candidate")) {
      break;
    }
  }

  console.log(`Total valid candidates imported: ${records.length}`);
  return records;
}

if (process.argv[2]) {
  const records = importExcelToRecords(process.argv[2]);
  const outPath = path.join(__dirname, "public", "initial_db.json");
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2));
  console.log(`Saved initial DB to ${outPath}`);
}
