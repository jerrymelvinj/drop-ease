# HR Candidate Intake & Resume Parsing System (Web App)

A standalone web application matching the 3-screen candidate extraction workflow built with **Next.js (App Router)**, **React**, **TypeScript**, **Tailwind CSS**, and **Poppins** typography.

Designed for zero-configuration, serverless remote deployment on **Vercel** so your entire recruitment team can access and use it simultaneously from anywhere without local tunnels.

---

## 📸 3-Screen Workflow Architecture

### Screen 01: Upload & Merge Center
- Centered interface with clean `#F5F6FB` background and bold typography.
- Primary **"Select PDF files"** action with drag-and-drop support for `.pdf` and `.docx` resumes.
- Direct **"Go to Excel DB"** button with emerald border (`#16A34A`) to inspect existing records.
- Instant **"Load Demo Resumes"** button to test the pipeline with preloaded sample resumes.

### Screen 02: Staging & Canvas
- Visual document preview grid rendering simulated resume document cards with filenames.
- Right-docked management sidebar:
  - Floating sky-blue `+` button with a live document counter badge (`3 +`).
  - Active list of uploaded documents styled in solid deep blue (`#0057B7`) with file sizes and individual delete (`×`) controls.
  - Sticky bottom CTA: **"Extract Data ➔"** in deep royal blue (`#00529B`).

### Screen 03: Human-in-the-Loop Review Table & Excel Database Export
- Centered header: `"PDFs have been merged!"`.
- Deep blue header table with **full inline editing** across all 11 columns:
  1. `S.No`
  2. `Candidate Name`
  3. `Email ID`
  4. `Contact Number`
  5. `Role Applied For`
  6. `Years of Experience`
  7. `Current CTC`
  8. `Expected CTC`
  9. `Notice Period`
  10. `Notes` (exceptional contributions or technical remarks)
  11. `Added Timestamp`
- **Actions Row**:
  - Circular dark back button (`←`).
  - **"Go to Excel DB"** (opens the multi-sheet database inspector).
  - **"Export to Excel ➔"** (triggers role segregation, deduplication, and direct `.xlsx` download).

---

## 📊 Role-Segregated Excel Database & Deduplication

1. **Role Segregation**:
   - The exported Excel workbook (`hr_candidates_db.xlsx`) automatically partitions data into separate worksheet tabs named after each unique **"Role Applied For"** (e.g. `Full Stack Developer`, `Lead Data Scientist`), plus a master **"All Candidates"** summary sheet.
2. **Duplicate Prevention**:
   - All new entries are verified against existing database entries.
   - If an entry is identical across all data attributes, it is flagged as a duplicate and omitted, keeping the database clean.

---

## 🔑 Guide: How to Get a Free Google Gemini API Key

The tool includes a built-in heuristic/regex extraction engine that works out of the box without any key. To enable high-accuracy contextual understanding across varied resume layouts using Gemini:

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. In the top navigation sidebar, click **"Get API key"**.
4. Click **"Create API key"** (select an existing Google Cloud project or create a free one).
5. Copy your API key (starts with `AIzaSy...`).
6. **In the Web App**: Click **"Configure Gemini API"** at the top right of Screen 01 and paste your key.
7. **For Vercel / Production**: Add `GEMINI_API_KEY=your_key_here` to your project environment variables.

---

## 🚀 How to Deploy to Vercel (For Remote Team Access)

Deploying to Vercel makes the app available to your team on a permanent remote URL (e.g., `https://your-hr-tool.vercel.app`):

### Option A: Deploy via GitHub (Recommended)
1. Push this project folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of HR Resume Extractor"
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. (Optional) In the **Environment Variables** section, add `GEMINI_API_KEY` with your API key.
5. Click **Deploy**. Vercel will build and deploy the application in ~60 seconds.

### Option B: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## 💻 Running Locally

```bash
# Navigate to the project directory
cd hr-resume-extractor-web

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
