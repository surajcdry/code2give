export async function analyzeFeedback(text: string): Promise<{ sentiment: string; tags: string[] }> {
  let sentiment = "Neutral";
  let tags: string[] = [];

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    const prompt = `You are an AI categorizer for a food pantry feedback system called Lemontree InsightEngine.
    Analyze the following user feedback and return a JSON object with:
    - "sentiment": one of "Positive", "Negative", or "Neutral"
    - "tags": an array of 1-3 short category tags (e.g., "Wait Time", "Food Quality", "Transportation", "Staff", "Hours", "Inventory", "Accessibility", "Cleanliness")

    User Feedback: "${text}"

    Respond ONLY with valid JSON, no markdown fences.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      try {
        const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        sentiment = parsed.sentiment || sentiment;
        tags = parsed.tags || tags;
      } catch {
        console.warn("Gemini response wasn't valid JSON, using fallback:", rawText);
      }
    }
  } else {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("love") || lowerText.includes("thank") || lowerText.includes("great") || lowerText.includes("kind")) {
      sentiment = "Positive";
    } else if (lowerText.includes("wait") || lowerText.includes("long") || lowerText.includes("hard") || lowerText.includes("ran out") || lowerText.includes("bad")) {
      sentiment = "Negative";
    }

    if (lowerText.includes("wait") || lowerText.includes("line")) tags.push("Wait Time");
    if (lowerText.includes("food") || lowerText.includes("fresh") || lowerText.includes("produce")) tags.push("Food Quality");
    if (lowerText.includes("subway") || lowerText.includes("bus") || lowerText.includes("drive") || lowerText.includes("stroller")) tags.push("Transportation");
    if (lowerText.includes("staff") || lowerText.includes("volunteer")) tags.push("Staff");
    if (lowerText.includes("hour") || lowerText.includes("evening") || lowerText.includes("morning")) tags.push("Hours");
    if (lowerText.includes("ran out") || lowerText.includes("milk") || lowerText.includes("bread")) tags.push("Inventory");
    if (tags.length === 0) tags.push("General");
  }

  return { sentiment, tags };
}
