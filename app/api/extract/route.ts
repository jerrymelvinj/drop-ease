import { NextRequest, NextResponse } from "next/server";
import {
  extractTextFromFileBuffer,
  parseResumeWithGemini,
  parseResumeWithHeuristics,
  ParsedCandidateData,
} from "@/lib/extractor";
import { CandidateRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getFormattedTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const userApiKey = (formData.get("apiKey") as string) || "";
    const activeApiKey = userApiKey.trim() || process.env.GEMINI_API_KEY || "";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const records: CandidateRecord[] = [];

    // Process files with individual error handling
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const rawText = await extractTextFromFileBuffer(buffer, file.name);

        let parsed: ParsedCandidateData;
        let usedGemini = false;

        if (activeApiKey && rawText.trim()) {
          try {
            parsed = await parseResumeWithGemini(rawText, activeApiKey);
            usedGemini = true;
          } catch (llmErr) {
            console.warn(`Gemini extraction failed for ${file.name}, using fallback heuristics:`, llmErr);
            parsed = parseResumeWithHeuristics(rawText);
          }
        } else {
          parsed = parseResumeWithHeuristics(rawText);
        }

        records.push({
          sNo: i + 1,
          candidateName: parsed.candidateName || file.name.replace(/\.[^/.]+$/, ""),
          email: parsed.email || "",
          contactNumber: parsed.contactNumber || "",
          roleAppliedFor: parsed.roleAppliedFor || "General",
          yearsOfExperience: parsed.yearsOfExperience || "",
          currentCtc: parsed.currentCtc || "",
          expectedCtc: parsed.expectedCtc || "",
          noticePeriod: parsed.noticePeriod || "",
          notes: parsed.notes || "",
          addedTimestamp: getFormattedTimestamp(),
          fileName: file.name,
        });
      } catch (fileErr: any) {
        console.error(`Error processing file ${file.name}:`, fileErr);
        // Fallback placeholder rather than failing entire batch
        records.push({
          sNo: i + 1,
          candidateName: file.name.replace(/\.[^/.]+$/, ""),
          email: "",
          contactNumber: "",
          roleAppliedFor: "General",
          yearsOfExperience: "",
          currentCtc: "",
          expectedCtc: "",
          noticePeriod: "",
          notes: `Extracted with manual review required: ${fileErr.message}`,
          addedTimestamp: getFormattedTimestamp(),
          fileName: file.name,
        });
      }
    }

    return NextResponse.json({
      success: true,
      records,
      count: records.length,
      usedApiKey: Boolean(activeApiKey),
    });
  } catch (error: any) {
    console.error("Error in /api/extract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse resumes" },
      { status: 500 }
    );
  }
}
