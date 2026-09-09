"use client";

import React, { useRef, useState } from "react";
import { Sparkles, KeyRound, FileCheck } from "lucide-react";

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
            title="Try with preloaded test resumes"
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Demo Resumes</span>
          </button>

          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              hasApiKey
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 shadow-sm"
            }`}
            title="Configure Gemini API Key"
          >
            {hasApiKey ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gemini AI Active</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                <span>Configure Gemini API</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Center Hero Section Matching Screen 01 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
        <div className="text-center max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight mb-3">
            Merge PDF files
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-normal leading-relaxed mb-10">
            Combine PDFs in the order you want with the easiest PDF merger available.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Grey Button: Select PDF files */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleSelectFilesClick}
                className="w-56 py-3.5 px-6 rounded-xl bg-[#6B7280] hover:bg-[#5A606B] active:scale-[0.98] text-white font-medium text-base shadow-md transition-all duration-150"
              >
                Select PDF files
              </button>
              <span className="text-xs text-gray-500 mt-2 font-light">
                or drop PDFs here
              </span>
            </div>

            {/* Green Bordered Button: Go to Excel DB */}
            <div className="flex flex-col items-center">
              <button
                onClick={onOpenExcelDb}
                className="w-56 py-3.5 px-6 rounded-xl bg-white hover:bg-emerald-50 active:scale-[0.98] text-[#15803D] font-medium text-base border-2 border-[#16A34A] shadow-sm transition-all duration-150"
              >
                Go to Excel DB
              </button>
              <span className="text-xs text-transparent mt-2 select-none">
                db link
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-gray-400">
        Standalone HR Resume Parser • Deployable to Vercel
      </footer>
    </div>
  );
}
