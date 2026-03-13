import { NextResponse } from "next/server";
import { analyzeFeedback } from "@/lib/ai/feedback-analysis";
import { saveFeedback, getRecentFeedback } from "@/lib/services/feedback";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Feedback text is required." },
        { status: 400 }
      );
    }

    const { sentiment, tags } = await analyzeFeedback(text);
    const feedback = await saveFeedback(text, sentiment, tags);

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    return NextResponse.json(
      { error: "Failed to analyze feedback" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const feedback = await getRecentFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ feedback: [] }, { status: 500 });
  }
}
