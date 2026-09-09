"use client";

import React, { useState } from "react";
import {
  X,
  Cloud,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Database,
} from "lucide-react";
import { LIVE_EXCEL_DB_URL } from "./Screen01Upload";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
}

export default function CloudSyncModal({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl,
}: CloudSyncModalProps) {
  const [inputVal, setInputVal] = useState(webhookUrl);
  const [saved, setSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/sync-excel");
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveWebhookUrl(inputVal.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Cloud className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Live SharePoint Excel DB
            </h3>
            <p className="text-xs text-gray-500">
              Direct cloud sync to TEST.xlsx with role segregation
            </p>
          </div>
        </div>

        {/* Live SharePoint Direct Connection Status Banner */}
        <div className="bg-emerald-50/70 rounded-xl p-4 mb-4 text-xs text-emerald-900 border border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold flex items-center gap-1.5 text-emerald-800 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              Direct SharePoint Sync: Active
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
          <p className="text-emerald-800/90 leading-relaxed">
            Your system is directly integrated with your live Microsoft SharePoint file{" "}
            <strong>TEST.xlsx</strong>. Every time you click &quot;Export to Excel&quot;, data is automatically merged, segregated into worksheets by candidate job role, and pushed to SharePoint in real-time.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <a
              href={LIVE_EXCEL_DB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline bg-white px-2.5 py-1 rounded-md border border-emerald-300 shadow-sm"
            >
              <span>Open TEST.xlsx on SharePoint</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white px-2.5 py-1 rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin text-blue-600" : ""}`} />
              <span>{isTesting ? "Verifying..." : "Test Live Connection"}</span>
            </button>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`mt-2 p-2.5 rounded-lg border text-[11px] ${
                testResult.success
                  ? "bg-white border-emerald-300 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {testResult.success ? (
                <div>
                  <p className="font-semibold flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connection Verified!
                  </p>
                  <p className="mt-0.5">
                    File: <strong>{testResult.fileName}</strong> | Records currently in file:{" "}
                    <strong>{testResult.recordCount}</strong>
                  </p>
                  <p className="mt-0.5 text-gray-600 truncate">
                    Worksheets: {testResult.sheets?.join(", ")}
                  </p>
                </div>
              ) : (
                <p>Connection failed: {testResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Optional Secondary Webhook URL */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-gray-500" />
            Optional: Secondary Cloud Webhook (Power Automate / Zapier)
          </label>
          <input
            type="url"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="https://prod-XX.logic.azure.com/workflows/... (optional)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00529B]/30 text-xs font-mono"
          />
          <p className="text-[11px] text-gray-400">
            If provided, candidate records will also be forwarded to this URL in addition to direct SharePoint updates.
          </p>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between pt-2">
          <button
            onClick={() => {
              setInputVal("");
              onSaveWebhookUrl("");
            }}
            className="text-xs text-red-500 hover:underline px-2 py-1"
          >
            Clear Optional Webhook
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-medium bg-[#00529B] hover:bg-[#00407A] text-white rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" /> Saved!
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
