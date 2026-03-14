"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  message: string | null;
  filename: string | null;
}

interface UploadResponse {
  success: boolean;
  filename: string;
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 10;

function isValidImage(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Please select a valid image file (JPEG, PNG, WebP, or GIF).";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

/**
 * Sends the image file to /api/upload.
 * Swap in real cloud storage here later (e.g. uploadToS3(file)).
 */
async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("image", file);

  // Future: attach metadata before upload
  // formData.append("pantryId", pantryId);
  // formData.append("location", locationString);
  // formData.append("category", "shelves");

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Upload failed. Please try again.");
  }

  return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    message: null,
    filename: null,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const error = isValidImage(file);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setUploadState({ status: "idle", message: null, filename: null });
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    setValidationError(null);
    setUploadState({ status: "idle", message: null, filename: null });
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedFile) {
      setValidationError("Please select an image before submitting.");
      return;
    }

    setUploadState({ status: "uploading", message: null, filename: null });

    try {
      const result = await uploadImage(selectedFile);

      // Future: trigger AI analysis after successful upload
      // await analyzeImage(selectedFile);
      // await savePhotoSubmission({ filename: result.filename, pantryId, ... });

      setUploadState({
        status: "success",
        message: result.message,
        filename: result.filename,
      });
    } catch (err) {
      setUploadState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
        filename: null,
      });
    }
  };

  const isUploading = uploadState.status === "uploading";
  const isSuccess = uploadState.status === "success";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* Drop zone */}
      {!isSuccess && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Image upload area"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center gap-3
            rounded-xl border-2 border-dashed cursor-pointer
            transition-colors duration-200 min-h-[180px] p-6 text-center
            ${isDragging
              ? "border-emerald-400 bg-emerald-50"
              : selectedFile
              ? "border-emerald-300 bg-emerald-50/40"
              : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/30"
            }
          `}
        >
          {preview ? (
            // Image preview
            <div className="w-full flex flex-col items-center gap-3">
              <img
                src={preview}
                alt="Selected pantry photo"
                className="max-h-52 rounded-lg object-contain shadow-sm"
              />
              <p className="text-xs text-gray-500 truncate max-w-xs">
                {selectedFile?.name}
              </p>
            </div>
          ) : (
            // Empty state prompt
            <>
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drag & drop or{" "}
                  <span className="text-emerald-600 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPEG, PNG, WebP, GIF · Max {MAX_FILE_SIZE_MB} MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Validation error */}
      {validationError && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <span>⚠</span> {validationError}
        </p>
      )}

      {/* Success banner */}
      {isSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-2xl mb-1">🥦</p>
          <p className="font-semibold text-emerald-700">{uploadState.message}</p>
          {uploadState.filename && (
            <p className="text-xs text-gray-400 mt-1 truncate">{uploadState.filename}</p>
          )}
          <button
            onClick={handleRemove}
            className="mt-3 text-sm text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
          >
            Upload another photo
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadState.status === "error" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {uploadState.message}
        </div>
      )}

      {/* Action buttons */}
      {!isSuccess && (
        <div className="flex gap-3">
          {selectedFile && (
            <button
              onClick={handleRemove}
              disabled={isUploading}
              className="flex-none px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isUploading || !selectedFile}
            className="flex-1nnpy-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold
              hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Uploading…
              </>
            ) : (
              "Submit Photo"
            )}
          </button>
        </div>
      )}
    </div>
  );
}