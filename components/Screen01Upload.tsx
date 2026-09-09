"use client";

import React, { useRef, useState } from "react";
import { Sparkles, KeyRound, FileCheck, ExternalLink } from "lucide-react";

export const LIVE_EXCEL_DB_URL =
  "https://akoimarketing-my.sharepoint.com/:x:/g/personal/career_akoi_in/IQD4TYUI8Xz1SJ4qcHes2gJFAbb78vco-WIisH_YTS9jS1g?e=lUvVIX";

interface Screen01UploadProps {
  onFilesSelected: (files: File[]) => void;
  onOpenExcelDb: () => void;
  onOpenApiKeyModal: () => void;
  onLoadDemoSamples: () => void;
  hasApiKey: boolean;
}

export default function Screen01Upload({
  onFilesSelected,
  onOpenExcelDb,
  onOpenApiKeyModal,
  onLoadDemoSamples,
  hasApiKey,
}: Screen01UploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      onFilesSelected(filesArr);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.match(/\.(pdf|docx|doc)$/i)
      );
      if (filesArr.length > 0) {
        onFilesSelected(filesArr);
      }
    }
  };

  const handleGoToLiveExcel = () => {
    window.open(LIVE_EXCEL_DB_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-screen bg-[#F5F6FB] flex flex-col justify-between transition-colors ${
        isDragging ? "bg-blue-50/70 border-4 border-dashed border-appBlue" : ""
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Navbar */}
      <header className="w-full px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00529B] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            HR
          </div>
          <span className="font-semibold text-gray-800 text-sm tracking-tight">
            Intake & Resume Parser
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadDemoSamples}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm transition"
            title="Try a test run with sample candidate profiles."
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Demo Resumes</span>
          </button>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm"
            title="AI Extraction Engine Active"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Parser Active</span>
          </div>

          <button
            onClick={handleGoToLiveExcel}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 shadow-sm transition"
            title="Opens your live SharePoint sheet in a new tab"
          >
            <span>Open Live Excel DB</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      </header>

      {/* Center Hero Section Matching Screen 01 UX Writing */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
        <div className="text-center max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight mb-3">
            Drop resumes here to parse
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-normal leading-relaxed mb-8">
            Upload PDF or DOCX files to automatically extract candidate details and current designations.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Grey Button: Select Files */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleSelectFilesClick}
                className="w-56 py-3.5 px-6 rounded-xl bg-[#6B7280] hover:bg-[#5A606B] active:scale-[0.98] text-white font-medium text-base shadow-md transition-all duration-150"
              >
                Select Files
              </button>
              <span className="text-xs text-gray-500 mt-2 font-light">
                or drop PDFs here
              </span>
            </div>

            {/* Green Bordered Button: Open Live Excel DB */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleGoToLiveExcel}
                className="w-56 py-3.5 px-6 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] text-[#15803D] font-medium text-base border-2 border-[#16A34A] shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span>Open Live Excel DB</span>
                <ExternalLink className="w-4 h-4 text-[#16A34A]" />
              </button>
              <span className="text-xs text-transparent mt-2 select-none">
                db link
              </span>
            </div>
          </div>

          {/* Format & Constraint Helper */}
          <p className="text-xs text-gray-400 mt-6 font-normal">
            Supports PDF and DOCX · Batch upload 10+ resumes at once
          </p>

          {/* Quick Testing / Empty State Helper */}
          <div className="mt-4 pt-4 border-t border-gray-200/60 inline-flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-2">
              Try a test run with sample candidate profiles.
            </span>
            <button
              onClick={onLoadDemoSamples}
              className="text-xs font-medium text-[#00529B] hover:text-[#003B70] underline flex items-center gap-1"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Load Demo Resumes</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-4">
        <span>Standalone HR Resume Parser • Deployable to Vercel</span>
        <span>•</span>
        <button
          onClick={onOpenExcelDb}
          className="text-gray-500 hover:text-gray-700 underline"
        >
          View Local DB Inspector
        </button>
      </footer>
    </div>
  );
}
