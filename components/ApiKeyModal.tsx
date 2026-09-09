"use client";

import React, { useState } from "react";
import { X, Key, ExternalLink, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: ApiKeyModalProps) {
  const [inputVal, setInputVal] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputVal.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setInputVal("");
    onSaveApiKey("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-appBlue flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-appBlue" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Gemini LLM Brain Configuration</h3>
            <p className="text-xs text-gray-500">Optional high-accuracy AI extraction across diverse templates</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-700 border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-appBlue" /> How to get your free Gemini API Key:
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600">
            <li>
              Go to{" "}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-appBlue font-medium inline-flex items-center gap-1 hover:underline"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Sign in with your Google account.</li>
            <li>Click <strong>&quot;Get API key&quot;</strong> in the left navigation sidebar.</li>
            <li>Click <strong>&quot;Create API key&quot;</strong> (select any project or create one).</li>
            <li>Copy the API key (starts with <code className="bg-gray-200 px-1 rounded">AIzaSy...</code>) and paste it below.</li>
          </ol>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-700">
            Gemini API Key
          </label>
          <input
            type="password"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-appBlue/40 text-sm font-mono"
          />
          <p className="text-[11px] text-gray-400">
            Note: If left empty, the application will automatically use rule-based regex & heuristic extraction.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-xs text-red-500 hover:underline px-2 py-1"
          >
            Clear key
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-medium bg-appBlue hover:bg-appBlue-dark text-white rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" /> Saved!
                </>
              ) : (
                "Save API Key"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
