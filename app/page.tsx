"use client";

import React, { useState, useEffect } from "react";
import Screen01Upload from "@/components/Screen01Upload";
import Screen02Staging from "@/components/Screen02Staging";
import Screen03ReviewTable, { SyncNotification } from "@/components/Screen03ReviewTable";
import ExcelDbModal from "@/components/ExcelDbModal";
import ApiKeyModal from "@/components/ApiKeyModal";
import CloudSyncModal from "@/components/CloudSyncModal";
import { CandidateRecord, UploadedFileItem } from "@/lib/types";
import {
  mergeCandidatesDeduplicated,
  downloadExcelDatabase,
} from "@/lib/excelExport";

const DB_STORAGE_KEY = "hr_candidates_db_records";
const API_KEY_STORAGE = "gemini_api_key_stored";
const WEBHOOK_STORAGE = "excel_cloud_webhook_url";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"upload" | "staging" | "review">("upload");
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [database, setDatabase] = useState<CandidateRecord[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [cloudWebhookUrl, setCloudWebhookUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExcelDbOpen, setIsExcelDbOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [notification, setNotification] = useState<SyncNotification | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load stored DB, API key, and Webhook on mount
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
            reasonForLeaving: "Seeking leadership growth",
            interviewSchedule: "15/09/2026, 11:00 AM",
            status: "Under Review",
            offerStatus: "Pending",
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
            reasonForLeaving: "Relocation",
            interviewSchedule: "16/09/2026, 02:30 PM",
            status: "Selected",
            offerStatus: "Pending",
            addedTimestamp: "2026-09-08 18:04:22",
          },
        ];
        setDatabase(initialSeed);
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initialSeed));
      }

      const storedKey = localStorage.getItem(API_KEY_STORAGE);
      if (storedKey) setApiKey(storedKey);

      const storedWebhook = localStorage.getItem(WEBHOOK_STORAGE);
      if (storedWebhook) setCloudWebhookUrl(storedWebhook);
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

  const saveWebhookUrl = (url: string) => {
    setCloudWebhookUrl(url);
    try {
      localStorage.setItem(WEBHOOK_STORAGE, url);
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
      id: `${f.name}-${Date.now()}-${idx}-${Math.random()}`,
      file: f,
      name: f.name,
      sizeFormatted: formatFileSize(f.size),
    }));
    setFiles(newItems);
    setCurrentScreen("staging");
  };

  // Screen 01 -> Load Demo Samples (Loads 10 test resumes)
  const handleLoadDemoSamples = async () => {
    try {
      const sampleNames = [
        "jane_doe_software_engineer.pdf",
        "alex_smith_data_scientist.docx",
        "sarah_connor_devops_engineer.pdf",
        "michael_chen_product_manager.pdf",
        "emily_watson_frontend_engineer.docx",
        "david_miller_cloud_architect.pdf",
        "rachel_green_ui_ux_designer.docx",
        "bruce_wayne_security_specialist.pdf",
        "clark_kent_technical_lead.docx",
        "peter_parker_backend_developer.pdf",
      ];

      const loadedFiles: File[] = [];
      for (const name of sampleNames) {
        const res = await fetch(`/sample_resumes/${name}`);
        const blob = await res.blob();
        const type = name.endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const file = new File([blob], name, { type });
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
      id: `${f.name}-${Date.now()}-${idx}-${Math.random()}`,
      file: f,
      name: f.name,
      sizeFormatted: formatFileSize(f.size),
    }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  // Screen 02 -> Remove single file (Auto-redirects to Screen 01 if 0 files remain)
  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (updated.length === 0) {
        setCurrentScreen("upload");
      }
      return updated;
    });
  };

  // Screen 02 -> Trigger Data Extraction (Chunked into batches of 4)
  const handleExtractData = async () => {
    if (files.length === 0) return;
    setIsExtracting(true);

    try {
      const BATCH_SIZE = 4;
      const allExtractedRecords: CandidateRecord[] = [];

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        batch.forEach((item) => {
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
          throw new Error(`Extraction batch error: server returned ${res.status}`);
        }

        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          allExtractedRecords.push(...data.records);
        }
      }

      // Re-index sNo
      const reindexed = allExtractedRecords.map((r, idx) => ({
        ...r,
        sNo: idx + 1,
      }));

      setRecords(reindexed);
      setCurrentScreen("review");
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

  // Screen 03 -> "Save to Database" CTA: Saves locally and directly syncs to live SharePoint Excel
  const handleSaveToDatabase = async () => {
    if (records.length === 0) return;
    setIsSaving(true);
    setNotification(null);

    // 1. Deduplicate against existing local DB
    const { merged, addedCount: localAdded, duplicateCount: localDuplicates } = mergeCandidatesDeduplicated(
      database,
      records
    );
    setDatabase(merged);
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }

    // 2. Direct Sync to live SharePoint Excel (TEST.xlsx)
    try {
      const res = await fetch("/api/sync-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: records,
          webhookUrl: cloudWebhookUrl || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const savedCount = data.addedRecords ?? localAdded ?? records.length;
        const duplicateCount = data.duplicateRecords ?? localDuplicates ?? 0;
        setNotification({
          type: "success",
          savedCount,
          duplicateCount,
        });
      } else {
        setNotification({
          type: "error",
          errorMessage: "Unable to sync to the live sheet. Please verify your connection or database permissions and retry.",
        });
      }
    } catch (err: any) {
      console.warn("Cloud sync error:", err);
      setNotification({
        type: "error",
        errorMessage: "Unable to sync to the live sheet. Please verify your connection or database permissions and retry.",
      });
    } finally {
      setIsSaving(false);
    }

    setTimeout(() => {
      setNotification(null);
    }, 8000);
  };

  // Secondary option: Download offline .xlsx file
  const handleDownloadLocalBackup = () => {
    downloadExcelDatabase(database, "hr_candidates_db.xlsx");
  };

  // Import records from external Excel file
  const handleImportRecords = (imported: CandidateRecord[]) => {
    const { merged, addedCount } = mergeCandidatesDeduplicated(
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

      {/* Screen 03: Review Table & Excel Save */}
      {currentScreen === "review" && (
        <Screen03ReviewTable
          records={records}
          onUpdateRecord={handleUpdateRecord}
          onBack={() => setCurrentScreen("staging")}
          onOpenExcelDb={() => setIsExcelDbOpen(true)}
          onSaveToDatabase={handleSaveToDatabase}
          onDownloadLocalBackup={handleDownloadLocalBackup}
          onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
          hasCloudWebhook={Boolean(cloudWebhookUrl)}
          notification={notification}
          isSaving={isSaving}
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

      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        webhookUrl={cloudWebhookUrl}
        onSaveWebhookUrl={saveWebhookUrl}
      />
    </>
  );
}
