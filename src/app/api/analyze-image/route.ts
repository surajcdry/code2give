import { NextRequest, NextResponse } from "next/server";
import type { ImageAnalysisResult, StockLevel, CrowdLevel } from "@/lib/types/imageAnalysis";

// ─── Groq config ──────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct";

const ANALYSIS_PROMPT = `You are analyzing a photo of a food pantry or community food resource.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

The JSON must match this exact shape:
{
  "stockLevel":  "low" | "medium" | "high",
  "crowdLevel":  "low" | "medium" | "high",
  "categories":  ["..."],
  "summary":     "..."
}

Definitions:
- stockLevel: how stocked the shelves/tables appear (low = mostly empty, high = well stocked)
- crowdLevel: how many people appear present or waiting (low = few/none, high = very crowded)
- categories: only food categories clearly visible, e.g. "produce", "canned goods", "bread", "dairy", "dry goods", "beverages", "snacks", "frozen foods"
- summary: 1-2 plain-language sentences describing what you see

Rules:
- Be conservative and approximate, do not claim exact counts
- If unsure about a level, choose "medium"
- Only include food categories you can actually see
- Keep the summary brief and factual`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

const VALID_LEVELS = new Set(["low", "medium", "high"]);

function normalizeResult(raw: Record<string, unknown>): ImageAnalysisResult {
  const stockLevel = VALID_LEVELS.has(raw.stockLevel as string)
    ? (raw.stockLevel as StockLevel) : "medium";

  const crowdLevel = VALID_LEVELS.has(raw.crowdLevel as string)
    ? (raw.crowdLevel as CrowdLevel) : "low";

  const categories = Array.isArray(raw.categories)
    ? (raw.categories as unknown[]).filter((c): c is string => typeof c === "string")
    : [];

  const summary = typeof raw.summary === "string" && raw.summary.trim()
    ? raw.summary.trim()
    : "Analysis complete. Unable to generate a detailed summary.";

  return { stockLevel, crowdLevel, categories, summary };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[analyze-image] GROQ_API_KEY is not set");
    return errorResponse("Image analysis is not configured.", 503);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorResponse("Could not parse form data.");
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return errorResponse("No image file found in request.");
  }

  // Convert image to base64 data URL
  const buffer   = await file.arrayBuffer();
  const base64   = Buffer.from(buffer).toString("base64");
  const mimeType = file.type || "image/jpeg";
  const dataUrl  = `data:${mimeType};base64,${base64}`;

  // Call Groq vision API (OpenAI-compatible format)
  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text",      text: ANALYSIS_PROMPT },
          ],
        }],
        temperature:  0.1,
        max_tokens:   512,
      }),
    });
  } catch (err) {
    console.error("[analyze-image] Groq fetch failed:", err);
    return errorResponse("Failed to reach the analysis service.", 502);
  }

  if (!groqRes.ok) {
    const body = await groqRes.text().catch(() => "");
    console.error("[analyze-image] Groq error:", groqRes.status, body);
    return errorResponse("Image analysis failed. Please try again.", 502);
  }

  const groqJson = await groqRes.json();
  const rawText: string = groqJson?.choices?.[0]?.message?.content ?? "";

  if (!rawText) {
    return errorResponse("No analysis returned from the model.", 502);
  }

  // Parse JSON robustly
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[analyze-image] Could not find JSON in output:", rawText);
      return errorResponse("Could not parse analysis result.", 502);
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      console.error("[analyze-image] JSON extraction failed:", match[0]);
      return errorResponse("Could not parse analysis result.", 502);
    }
  }

  return NextResponse.json(normalizeResult(parsed));
}
