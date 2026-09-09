"use client";

import React, { useRef, useState, useEffect } from "react";
import { Plus, X, FileText, Loader2, ArrowRightCircle, Eye, Maximize2 } from "lucide-react";
import { UploadedFileItem } from "@/lib/types";
import { generateFileThumbnail } from "@/lib/thumbnailGenerator";

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
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ [id: string]: string }>({});
  const [previewFile, setPreviewFile] = useState<UploadedFileItem | null>(null);

  // Generate real thumbnails for uploaded files
  useEffect(() => {
    files.forEach(async (item) => {
      if (!thumbnails[item.id]) {
        try {
          const thumbUrl = await generateFileThumbnail(item.file);
          setThumbnails((prev) => ({ ...prev, [item.id]: thumbUrl }));
        } catch (e) {
          console.warn("Thumbnail generation failed for", item.name);
        }
      }
    });
  }, [files, thumbnails]);

  const handleAddMoreClick = () => {
    addFileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
  };

  // Drag and drop handlers on Screen 02
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
        onAddFiles(filesArr);
      }
    }
  };

  const handleRemove = (id: string) => {
    if (files.length <= 1) {
      onBackToUpload();
    } else {
      onRemoveFile(id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-screen bg-[#F5F6FB] flex flex-col md:flex-row relative transition-all ${
        isDragging ? "bg-blue-50/80 border-4 border-dashed border-appBlue" : ""
      }`}
    >
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
          <div className="text-xs text-gray-500 font-medium">
            {files.length} {files.length === 1 ? "document" : "documents"} queued for extraction
          </div>
        </div>

        {/* Drag Over Banner */}
        {isDragging && (
          <div className="mb-6 p-4 bg-blue-100/70 border-2 border-dashed border-blue-400 rounded-xl text-center text-sm font-medium text-blue-800 animate-pulse">
            Drop resumes here to add them to the extraction queue!
          </div>
        )}

        {/* Preview Cards Grid Matching Screen 02 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {files.map((item) => (
            <div
              key={item.id}
              onClick={() => setPreviewFile(item)}
              className="group bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center hover:shadow-md transition relative cursor-pointer"
              title="Click to preview document"
            >
              {/* Document Thumbnail with Real Preview Image */}
              <div className="w-full aspect-[3/4] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden relative shadow-inner flex items-center justify-center">
                {thumbnails[item.id] ? (
                  <img
                    src={thumbnails[item.id]}
                    alt={item.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-appBlue mb-2" />
                    <span className="text-[10px]">Generating preview...</span>
                  </div>
                )}

                {/* Hover Quick Preview Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-medium backdrop-blur-[1px]">
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </div>
              </div>

              {/* Filename underneath */}
              <span
                className="mt-3 text-xs font-medium text-gray-700 truncate max-w-full text-center"
                title={item.name}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Right Sidebar Matching Screen 02 */}
      <aside className="w-full md:w-80 lg:w-96 bg-white/80 md:bg-transparent p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-200 relative">
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
          <span className="ml-4 text-xs text-gray-400 hidden sm:inline">
            Drag & drop more files anytime
          </span>
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
                onClick={() => handleRemove(item.id)}
                className="text-white/80 hover:text-white hover:bg-white/15 p-1 rounded-full transition flex-shrink-0"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
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
                <span>Extracting {files.length} Resumes...</span>
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

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-appBlue flex-shrink-0" />
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {previewFile.name}
                </h4>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-100">
              {thumbnails[previewFile.id] ? (
                <img
                  src={thumbnails[previewFile.id]}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain shadow-lg rounded-lg border border-gray-200"
                />
              ) : (
                <div className="text-gray-400 text-xs">Preview loading...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
