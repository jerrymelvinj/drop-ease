import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractText } from "unpdf";
import mammoth from "mammoth";

export interface ParsedCandidateData {
  candidateName: string;
  email: string;
  contactNumber: string;
  roleAppliedFor: string;
  yearsOfExperience: string;
  currentCtc: string;
  expectedCtc: string;
  noticePeriod: string;
  notes: string;
}

export async function extractTextFromFileBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();
  try {
    if (lowerName.endsWith(".pdf")) {
      const res = await extractText(new Uint8Array(buffer), { mergePages: true });
      return res.text || "";
    } else if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    }
  } catch (err) {
    console.error(`Error extracting text from ${fileName}:`, err);
  }
  return "";
}

const COMMON_ROLE_PATTERNS = [
  /Senior\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /Lead\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /Staff\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /Principal\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /(?:Software|Full\s*Stack|Frontend|Backend|DevOps|Cloud|Data|Machine\s*Learning|ML|AI|Product|Project|Security|QA)\s+(?:Engineer|Developer|Scientist|Analyst|Manager|Architect|Lead|Specialist)/i,
];

export function parseResumeWithHeuristics(rawText: string): ParsedCandidateData {
  // 1. Email extraction
  const emailMatch = rawText.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
  const email = emailMatch ? emailMatch[0].trim() : "";

  // 2. Phone extraction
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const contactNumber = phoneMatch ? phoneMatch[0].trim() : "";

  // 3. Name heuristic
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let candidateName = "";
  const noisePatterns = [/curriculum\s+vitae/i, /resume/i, /^page\s+\d+/i, /^\+?\d/, /^email/i, /^phone/i, /^contact/i];

  for (const line of lines.slice(0, 6)) {
    const isNoise = noisePatterns.some((pattern) => pattern.test(line));
    if (!isNoise && line.length > 2 && line.length < 50 && !(line.includes("@") && line.split(/\s+/).length <= 2)) {
      const parts = line.split(/[\s\t]*[|•·\-\–][\s\t]*/);
      candidateName = parts[0].trim();
      break;
    }
  }

  // 4. Role heuristic
  let roleAppliedFor = "";
  for (const pattern of COMMON_ROLE_PATTERNS) {
    const match = rawText.match(pattern);
    if (match) {
      roleAppliedFor = match[0].trim();
      break;
    }
  }

  // 5. Years of experience heuristic
  let yearsOfExperience = "";
  const expMatch = rawText.match(/(\d{1,2}(?:\.\d)?|\d{1,2}\+?)\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?/i);
  if (expMatch) {
    yearsOfExperience = expMatch[1].trim();
  }

  // 6. Notes / Skills summary heuristic
  let notes = "";
  const skillsMatch = rawText.match(/(?:Skills|Key Skills|Core Competencies|Technical Skills)[:\s]+([^\n\r]+)/i);
  if (skillsMatch) {
    notes = skillsMatch[1].trim().slice(0, 100);
  }

  return {
    candidateName,
    email,
    contactNumber,
    roleAppliedFor,
    yearsOfExperience,
    currentCtc: "",
    expectedCtc: "",
    noticePeriod: "",
    notes,
  };
}

export async function parseResumeWithGemini(
  rawText: string,
  apiKey: string
): Promise<ParsedCandidateData> {
  const prompt = `You are an expert HR recruitment assistant. Extract structured candidate information from the following resume text.
If a field is not explicitly mentioned or cannot be inferred, return an empty string "".

Resume Text:
"""
${rawText.slice(0, 12000)}
"""

Provide your answer ONLY in valid JSON matching this exact structure:
{
  "candidateName": "Full candidate name",
  "email": "candidate email address",
  "contactNumber": "phone number",
  "roleAppliedFor": "target designation / primary job role (e.g. Full Stack Developer, Lead Data Scientist)",
  "yearsOfExperience": "number of years or range, e.g. '5' or '7+'",
  "currentCtc": "current salary if stated or ''",
  "expectedCtc": "expected salary if stated or ''",
  "noticePeriod": "notice period if stated or ''",
  "notes": "brief summary of top skills, degrees, or notable achievements"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(contentText);

  return {
    candidateName: parsed.candidateName || "",
    email: parsed.email || "",
    contactNumber: parsed.contactNumber || "",
    roleAppliedFor: parsed.roleAppliedFor || "",
    yearsOfExperience: String(parsed.yearsOfExperience || ""),
    currentCtc: parsed.currentCtc || "",
    expectedCtc: parsed.expectedCtc || "",
    noticePeriod: parsed.noticePeriod || "",
    notes: parsed.notes || "",
  };
}
