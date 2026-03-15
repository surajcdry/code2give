"use client";

import { useState, useRef, useCallback, ChangeEvent } from "react";
import type { ImageAnalysisResult } from "@/lib/types/imageAnalysis";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB         = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Please select a JPEG, PNG, WebP, or GIF image.";
  if (file.size > MAX_MB * 1024 * 1024)
    return `File is too large. Maximum size is ${MAX_MB} MB.`;
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelBadge({ label, value }: { label: string; value: "low" | "medium" | "high" }) {
  const colors = {
    low:    "bg-green-100  text-green-800",
    medium: "bg-amber-100  text-amber-800",
    high:   "bg-red-100    text-red-800",
  };
  const icons = { low: "▼", medium: "●", high: "▲" };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize flex items-center gap-1 ${colors[value]}`}>
        <span>{icons[value]}</span> {value}
      </span>
    </div>
  );
}

function AnalysisCard({ result }: { result: ImageAnalysisResult }) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <h3 className="font-bold text-gray-900 text-sm">Pantry Analysis</h3>
        <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">AI</span>
      </div>

      {/* Stock + crowd levels */}
      <div className="flex justify-around bg-white rounded-xl border border-gray-100 py-4 px-2">
        <LevelBadge label="Stock Level"  value={result.stockLevel} />
        <div className="w-px bg-gray-100" />
        <LevelBadge label="Crowd Level"  value={result.crowdLevel} />
      </div>

      {/* Categories */}
      {result.categories.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Visible Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {result.categories.map(cat => (
              <span key={cat} className="text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full capitalize">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Summary</p>
        <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
      </div>

      <p className="text-[10px] text-gray-400">
        Analysis is approximate. Results may not reflect exact inventory.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ImageReportUpload() {
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ImageAnalysisResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File selection ───────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setError(null);
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Analyze ──────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze-image", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }

      setResult(data as ImageAnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* Drop zone / preview */}
      {!result && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3 rounded-xl
            border-2 border-dashed cursor-pointer transition-colors min-h-[160px] p-5 text-center
            ${preview
              ? "border-purple-300 bg-purple-50/30"
              : "border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/20"}
          `}
        >
          {preview ? (
            <div className="w-full flex flex-col items-center gap-2">
              <img src={preview} alt="Selected photo" className="max-h-48 rounded-lg object-contain shadow-sm" />
              <p className="text-xs text-gray-400 truncate max-w-xs">{file?.name}</p>
            </div>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Click to choose a pantry photo
                </p>
                <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP · Max {MAX_MB} MB</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />

      {/* Validation / API error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          ⚠ {error}
        </div>
      )}

      {/* Analysis result */}
      {result && <AnalysisCard result={result} />}

      {/* Action buttons */}
      {!result ? (
        <div className="flex gap-3">
          {file && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={loading || !file}
            className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Analyzing…
              </>
            ) : (
              "Upload & Analyze"
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleReset}
          className="text-sm text-purple-600 underline underline-offset-2 hover:text-purple-800 text-center"
        >
          Analyze another photo
        </button>
      )}
    </div>
  );
}
