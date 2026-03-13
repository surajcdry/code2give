import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadResult {
  success: boolean;
  filename: string;
  size: number;
  mimeType: string;
  // Future fields:
  // pantryId?: string;
  // location?: string;
  // category?: string;
  // analysisResult?: PantryAnalysis;
  // storedUrl?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Stub: replace with real storage later (S3, GCS, Vercel Blob, etc.)
 * Returns a fake storage path for now.
 */
async function storeImage(file: File): Promise<string> {
  // Simulate processing time
  await new Promise((r) => setTimeout(r, 200));

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${timestamp}_${safeName}`;
}

/**
 * Stub: plug in your AI vision model here later.
 * e.g. OpenAI GPT-4o, Google Gemini Vision, or a custom model.
 */
// async function analyzeImage(file: File): Promise<PantryAnalysis> {
//   const base64 = await fileToBase64(file);
//   return callVisionModel(base64);
// }

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let formData: FormData;

  // Parse multipart form data
  try {
    formData = await req.formData();
  } catch {
    return errorResponse("Could not parse form data.");
  }

  const file = formData.get("image");

  // Validate: file present
  if (!file || !(file instanceof File)) {
    return errorResponse("No image file found in request.");
  }

  // Validate: is an image
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return errorResponse(
      "Invalid file type. Only JPEG, PNG, WebP, and GIF are accepted."
    );
  }

  // Validate: size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return errorResponse("File exceeds the 10 MB size limit.");
  }

  // Future: read extra metadata from formData
  // const pantryId = formData.get("pantryId")?.toString();
  // const location = formData.get("location")?.toString();

  // Store the image (currently a stub — no real I/O)
  const storedPath = await storeImage(file);

  // Future: run AI analysis
  // const analysis = await analyzeImage(file);

  // Future: save submission to database
  // await savePhotoSubmission({ storedPath, pantryId, analysis, ... });

  const result: UploadResult = {
    success: true,
    filename: storedPath,
    size: file.size,
    mimeType: file.type,
  };

  return NextResponse.json(
    {
      ...result,
      message: "Upload received successfully",
    },
    { status: 200 }
  );
}

// ─── Disable Next.js default body parsing (not needed for FormData) ───────────
// Next.js App Router handles this automatically; no config needed.