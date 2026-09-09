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
  // E-Commerce & Marketplace roles
  /(?:E-Commerce|Ecommerce|Marketplace|Amazon|Flipkart|Digital\s+Marketing|PPC|Growth|Performance|Catalog)\s+(?:Specialist|Manager|Executive|Lead|Associate|Analyst|Consultant|Head|Director)/i,
  // Sales, Business Development, Retail & Operations
  /(?:Sales|Retail|Store|Operations|Account|Supply\s+Chain|Procurement|Channel\s+Sales|Key\s+Account|Category|Business\s+Development)\s+(?:Manager|Executive|Lead|Director|Associate|Specialist|Officer|Head|Consultant)/i,
  // Engineering & Tech roles
  /Senior\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /Lead\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /Staff\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /Principal\s+[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Designer|Manager|Architect|Consultant)/i,
  /(?:Software|Full\s*Stack|Frontend|Backend|DevOps|Cloud|Data|Machine\s*Learning|ML|AI|Security|QA)\s+(?:Engineer|Developer|Scientist|Analyst|Manager|Architect|Lead|Specialist)/i,
  // Product & Design
  /(?:UI\/UX|Product|Graphic)\s+Designer/i,
  /(?:Product|Project|Program)\s+Manager/i,
  // General professional designations
  /(?:Marketing|Operations|Sales|General|Brand|Store|Area|Regional)\s+Manager/i,
  /(?:Sales|Marketing|Operations|Retail|Accounts)\s+Executive/i,
  /(?:Operations|Logistics|Warehouse|Inventory)\s+(?:Manager|Supervisor|Executive|Lead)/i,
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

  // 4. Role extraction: 2-step hierarchy
  let roleAppliedFor = "";

  // STEP 1: Check the TOP SECTION (lines 1 to 8 right below/around candidate name)
  for (const line of lines.slice(0, 10)) {
    // Check if subtitle contains separator like "Name | Role"
    if (line.includes("|") || line.includes("•") || line.includes("-") || line.includes("–")) {
      const segments = line.split(/[\s\t]*[|•·\-\–][\s\t]*/);
      for (const seg of segments) {
        for (const pattern of COMMON_ROLE_PATTERNS) {
          const m = seg.match(pattern);
          if (m) {
            roleAppliedFor = m[0].trim();
            break;
          }
        }
        if (roleAppliedFor) break;
      }
    }

    if (roleAppliedFor) break;

    // Check full line against role patterns
    for (const pattern of COMMON_ROLE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        roleAppliedFor = match[0].trim();
        break;
      }
    }
    if (roleAppliedFor) break;
  }

  // STEP 2: If NOT found in Top section, check the EXPERIENCE SECTION for the latest/current role
  if (!roleAppliedFor) {
    const expSectionMatch = rawText.match(
      /(?:Work\s+Experience|Professional\s+Experience|Experience|Employment\s+History|Career\s+History)[:\s]+([\s\S]{1,1500})/i
    );
    if (expSectionMatch) {
      const expSnippet = expSectionMatch[1];
      // Search line by line in the first experience entry
      const expLines = expSnippet.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of expLines.slice(0, 8)) {
        for (const pattern of COMMON_ROLE_PATTERNS) {
          const match = line.match(pattern);
          if (match) {
            roleAppliedFor = match[0].trim();
            break;
          }
        }
        if (roleAppliedFor) break;
      }

      // If line-by-line didn't match, check entire expSnippet
      if (!roleAppliedFor) {
        for (const pattern of COMMON_ROLE_PATTERNS) {
          const match = expSnippet.match(pattern);
          if (match) {
            roleAppliedFor = match[0].trim();
            break;
          }
        }
      }
    }
  }

  // STEP 3: Fallback search throughout the resume text
  if (!roleAppliedFor) {
    for (const pattern of COMMON_ROLE_PATTERNS) {
      const match = rawText.match(pattern);
      if (match) {
        roleAppliedFor = match[0].trim();
        break;
      }
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

CRITICAL INSTRUCTIONS FOR "roleAppliedFor":
Follow this strict 2-step priority hierarchy:
1. STEP 1 (TOP SECTION): Look at the top section of the resume (the lines right below or near the candidate's name, their subtitle, header, or summary/objective). Candidates often state their designation right at the top (e.g., "Amazon Marketplace Specialist", "E-Commerce Account Manager", "Marketing Manager", "Sales Manager", "Full Stack Developer", "Operations Manager", "Store Operations Executive"). If a designation/title is mentioned in the top section, extract that exact role!
2. STEP 2 (EXPERIENCE SECTION): If they did NOT mention a designation in the top section in the beginning, navigate to their "Work Experience", "Experience", or "Employment History" section. Extract the candidate's LATEST / CURRENT role (the very first listed job title in their experience history).
3. NEVER default to any hardcoded designation like "Full Stack Developer". Extract the candidate's real profession. If completely unspecified, return "".

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
  "roleAppliedFor": "designation from top section or latest role from experience",
  "yearsOfExperience": "number of years or range, e.g. '5' or '7+'",
  "currentCtc": "current salary if stated or ''",
  "expectedCtc": "expected salary if stated or ''",
  "noticePeriod": "notice period if stated or ''",
  "notes": "brief summary of top skills, degrees, or notable achievements"
}`;

  const models = ["gemini-3.6-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
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
        throw new Error(`Gemini [${model}] status ${res.status}: ${errText}`);
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
    } catch (err: any) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw lastError || new Error("All Gemini models failed");
}
