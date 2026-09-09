"use client";

import React, { useState, useEffect } from "react";
import Screen01Upload from "@/components/Screen01Upload";
import Screen02Staging from "@/components/Screen02Staging";
import Screen03ReviewTable from "@/components/Screen03ReviewTable";
import ExcelDbModal from "@/components/ExcelDbModal";
import ApiKeyModal from "@/components/ApiKeyModal";
import { CandidateRecord, UploadedFileItem } from "@/lib/types";
import {
  mergeCandidatesDeduplicated,
  downloadExcelDatabase,
} from "@/lib/excelExport";

const DB_STORAGE_KEY = "hr_candidates_db_records";
const API_KEY_STORAGE = "gemini_api_key_stored";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"upload" | "staging" | "review">("upload");
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [database, setDatabase] = useState<CandidateRecord[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExcelDbOpen, setIsExcelDbOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Load stored DB and API key on mount
  useEffect(() => {
    try {
      const storedDb = localStorage.getItem(DB_STORAGE_KEY);
      if (storedDb) {
        setDatabase(JSON.parse(storedDb));
      } else {
        const initialSeed: CandidateRecord[] = [
          {
            sNo: 1,
            candidateName: "Jerry Melvin",
            email: "jerry.m@eko.in",
            contactNumber: "12345 12345",
            roleAppliedFor: "Full Stack Developer",
            yearsOfExperience: "7",
            currentCtc: "12 LPA",
            expectedCtc: "20 LPA",
            noticePeriod: "30 Days",
            notes: "Strong UI understanding & TypeScript",
            addedTimestamp: "2026-09-08 18:04:22",
          },
          {
            sNo: 2,
            candidateName: "Alex Smith",
            email: "alex.smith.ai@domain.org",
            contactNumber: "987-654-3210",
            roleAppliedFor: "Lead Data Scientist",
            yearsOfExperience: "6+",
            currentCtc: "$140,000",
            expectedCtc: "$175,000",
            noticePeriod: "Immediate",
            notes: "Columbia M.S., PyTorch, ML Pipelines",
            addedTimestamp: "2026-09-08 18:04:22",
          },
        ];
        setDatabase(initialSeed);
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initialSeed));
      }

      const storedKey = localStorage.getItem(API_KEY_STORAGE);
      if (storedKey) setApiKey(storedKey);
    } catch (e) {
      console.warn("Could not access localStorage", e);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem(API_KEY_STORAGE, key);
    } catch (e) {
      console.warn(e);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  // Screen 01 -> File Selection
  const handleFilesSelected = (selectedFiles: File[]) => {
    const newItems: UploadedFileItem[] = selectedFiles.map((f, idx) => ({
      id: `${f.name}-${Date.now()}-${idx}`,
      file: f,
      name: f.name,
      sizeFormatted: formatFileSize(f.size),
    }));
    setFiles(newItems);
    setCurrentScreen("staging");
  };

  // Screen 01 -> Load Demo Samples
  const handleLoadDemoSamples = async () => {
    try {
      const samples = [
        { name: "jane_doe_software_engineer.pdf", type: "application/pdf" },
        { name: "alex_smith_data_scientist.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      ];

      const loadedFiles: File[] = [];
      for (const s of samples) {
        const res = await fetch(`/sample_resumes/${s.name}`);
        const blob = await res.blob();
        const file = new File([blob], s.name, { type: s.type });
        loadedFiles.push(file);
      }
      handleFilesSelected(loadedFiles);
    } catch (err) {
      console.error("Failed to load demo files:", err);
    }
  };

  // Screen 02 -> Add more files
  const handleAddMoreFiles = (newFiles: File[]) => {
    const newItems: UploadedFileItem[] = newFiles.map((f, idx) => ({
      id: `${f.name}-${Date.now()}-${idx}`,
      file: f,
      name: f.name,
      sizeFormatted: formatFileSize(f.size),
    }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  // Screen 02 -> Remove single file
  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Screen 02 -> Trigger Data Extraction
  const handleExtractData = async () => {
    if (files.length === 0) return;
    setIsExtracting(true);

    try {
      const formData = new FormData();
      files.forEach((item) => {
        formData.append("files", item.file);
      });
      if (apiKey) {
        formData.append("apiKey", apiKey);
      }

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.records && Array.isArray(data.records)) {
        setRecords(data.records);
        setCurrentScreen("review");
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      alert(`Error extracting resume details: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Screen 03 -> Update inline editable field
  const handleUpdateRecord = (
    index: number,
    field: keyof CandidateRecord,
    value: string
  ) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // Screen 03 -> Export to Excel with role segregation & deduplication
  const handleExportToExcel = () => {
    if (records.length === 0) return;

    // Deduplicate against existing DB
    const { merged, addedCount, duplicateCount } = mergeCandidatesDeduplicated(
      database,
      records
    );

    // Save updated database
    setDatabase(merged);
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }

    // Trigger Excel download
    downloadExcelDatabase(merged, "hr_candidates_db.xlsx");

    const message = `Successfully exported to Excel! ${addedCount} candidate record(s) added.${
      duplicateCount > 0 ? ` (${duplicateCount} duplicate(s) skipped)` : ""
    }`;
    setExportSuccessMessage(message);

    setTimeout(() => {
      setExportSuccessMessage(null);
    }, 6000);
  };

  // Import records from external Excel file
  const handleImportRecords = (imported: CandidateRecord[]) => {
    const { merged, addedCount, duplicateCount } = mergeCandidatesDeduplicated(
      database,
      imported
    );
    setDatabase(merged);
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClearDatabase = () => {
    setDatabase([]);
    try {
      localStorage.removeItem(DB_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <>
      {/* Screen 01: Upload */}
      {currentScreen === "upload" && (
        <Screen01Upload
          onFilesSelected={handleFilesSelected}
          onOpenExcelDb={() => setIsExcelDbOpen(true)}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          onLoadDemoSamples={handleLoadDemoSamples}
          hasApiKey={Boolean(apiKey)}
        />
      )}

      {/* Screen 02: Staging & Preview */}
      {currentScreen === "staging" && (
        <Screen02Staging
          files={files}
          onAddFiles={handleAddMoreFiles}
          onRemoveFile={handleRemoveFile}
          onExtractData={handleExtractData}
          isExtracting={isExtracting}
          onBackToUpload={() => setCurrentScreen("upload")}
        />
      )}

      {/* Screen 03: Review Table & Excel Export */}
      {currentScreen === "review" && (
        <Screen03ReviewTable
          records={records}
          onUpdateRecord={handleUpdateRecord}
          onBack={() => setCurrentScreen("staging")}
          onOpenExcelDb={() => setIsExcelDbOpen(true)}
          onExportToExcel={handleExportToExcel}
          exportSuccessMessage={exportSuccessMessage}
        />
      )}

      {/* Modals */}
      <ExcelDbModal
        isOpen={isExcelDbOpen}
        onClose={() => setIsExcelDbOpen(false)}
        database={database}
        onClearDb={handleClearDatabase}
        onImportRecords={handleImportRecords}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={saveApiKey}
      />
    </>
  );
}
