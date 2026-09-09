"use client";

import React, { useRef } from "react";
import { Plus, X, FileText, ArrowRight, Loader2, ArrowRightCircle } from "lucide-react";
import { UploadedFileItem } from "@/lib/types";

interface Screen02StagingProps {
  files: UploadedFileItem[];
  onAddFiles: (newFiles: File[]) => void;
  onRemoveFile: (id: string) => void;
  onExtractData: () => void;
  isExtracting: boolean;
  onBackToUpload: () => void;
}

export default function Screen02Staging({
  files,
  onAddFiles,
  onRemoveFile,
  onExtractData,
  isExtracting,
  onBackToUpload,
}: Screen02StagingProps) {
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddMoreClick = () => {
    addFileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FB] flex flex-col md:flex-row relative">
      {/* Hidden file input for adding more files */}
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Canvas (Document Previews) */}
      <main className="flex-1 p-8 sm:p-12 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBackToUpload}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition"
          >
            ← Upload different files
          </button>
          <div className="text-xs text-gray-400">
            {files.length} {files.length === 1 ? "document" : "documents"} ready for extraction
          </div>
        </div>

        {/* Preview Cards Grid Matching Screen 02 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {files.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center hover:shadow-md transition relative"
            >
              {/* Document Thumbnail Simulation */}
              <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded-lg p-3 flex flex-col justify-between overflow-hidden relative shadow-inner">
                {/* Header bar mimic */}
                <div className="w-full">
                  <div className="flex justify-between items-center mb-3">
                    <div className="h-2.5 w-12 bg-gray-400 rounded-sm" />
                    <div className="h-2 w-8 bg-gray-200 rounded-sm" />
                  </div>
                  <div className="h-5 w-full bg-gray-600 rounded-sm mb-3" />
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full" />
                    <div className="h-1.5 w-5/6 bg-gray-200 rounded-full" />
                    <div className="h-1.5 w-4/6 bg-gray-200 rounded-full" />
                  </div>
                </div>

                {/* Table/Experience area mimic */}
                <div className="w-full space-y-1.5 pt-2 border-t border-gray-100">
                  <div className="flex gap-2">
                    <div className="h-2 w-1/3 bg-gray-300 rounded-sm" />
                    <div className="h-2 w-2/3 bg-gray-200 rounded-sm" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 w-1/3 bg-gray-300 rounded-sm" />
                    <div className="h-2 w-2/3 bg-gray-200 rounded-sm" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 w-1/3 bg-gray-300 rounded-sm" />
                    <div className="h-2 w-2/3 bg-gray-200 rounded-sm" />
                  </div>
                </div>

                {/* Bottom line mimic */}
                <div className="flex justify-between items-center pt-2">
                  <div className="h-1.5 w-14 bg-gray-200 rounded-sm" />
                  <div className="h-1.5 w-10 bg-gray-300 rounded-sm" />
                </div>
              </div>

              {/* Filename underneath */}
              <span
                className="mt-3 text-xs font-normal text-gray-700 truncate max-w-full text-center"
                title={item.name}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Right Sidebar Matching Screen 02 */}
      <aside className="w-full md:w-80 lg:w-96 bg-white/70 md:bg-transparent p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-200 relative">
        {/* Floating Add Button with Badge */}
        <div className="relative mb-6 flex justify-start items-center">
          <div className="relative">
            {/* Counter Badge */}
            <span className="absolute -top-2 -left-2 bg-slate-900 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md z-10">
              {files.length}
            </span>
            {/* Sky Blue Add Button */}
            <button
              onClick={handleAddMoreClick}
              className="w-11 h-11 rounded-full bg-[#38BDF8] hover:bg-[#0284C7] active:scale-95 text-white flex items-center justify-center shadow-md transition"
              title="Add more resume files"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Uploaded File Cards List */}
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
          {files.map((item) => (
            <div
              key={item.id}
              className="bg-[#0057B7] hover:bg-[#004F9F] text-white rounded-xl p-3 flex items-center justify-between shadow-sm transition"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-white truncate max-w-[170px]" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-white/75 font-light">
                    {item.sizeFormatted}
                  </p>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemoveFile(item.id)}
                className="text-white/80 hover:text-white hover:bg-white/15 p-1 rounded-full transition flex-shrink-0"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {files.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-xs">
              All files removed. Please add files to proceed.
            </div>
          )}
        </div>

        {/* Bottom CTA Action Button Matching Screen 02 */}
        <div className="pt-6">
          <button
            onClick={onExtractData}
            disabled={files.length === 0 || isExtracting}
            className="w-full py-4 px-6 rounded-xl bg-[#00529B] hover:bg-[#00407A] active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-base shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 transition"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Extracting Data...</span>
              </>
            ) : (
              <>
                <span>Extract Data</span>
                <ArrowRightCircle className="w-5 h-5 text-white" />
              </>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
