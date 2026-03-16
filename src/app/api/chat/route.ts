import { NextResponse } from "next/server";

const ROLE_CONTEXT: Record<string, string> = {
  donor: `You are talking to a DONOR or foundation. Focus on:
- Where donations will have the most impact
- Which neighborhoods have the biggest food access gaps
- Pantry reliability and community trust scores
- High-need areas with few resources
Do NOT reveal internal operational details or raw scores of specific pantries.`,

  government: `You are talking to a GOVERNMENT AGENCY representative. Focus on:
- Borough-level coverage and gaps
- Demographic overlays and poverty data
- Underserved communities and food deserts
- System-wide trends and policy-relevant insights
You may share detailed statistics and borough breakdowns.`,

  internal: `You are talking to the LEMONTREE ADMIN TEAM. Focus on:
- Full system health and reliability scores
- At-risk pantries and operational issues
- Sentiment trends and common complaints
- Any data anomalies or issues
You may share all available data freely.`,

  provider: `You are talking to a FOOD PANTRY MANAGER. Focus on:
- How pantries are performing relative to others
- Common feedback themes from the community
- Wait time patterns and peak demand
- How to improve reliability scores
Do NOT share donor information or other pantries internal scores.`,

  client: `You are talking to a COMMUNITY MEMBER looking for food. Focus on:
- How to find nearby pantries
- What resources are available
- General information about food access
Do NOT share internal reliability scores, donor data, or operational metrics.`,
};

async function getDashboardContext(role: string) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const [insightsRes, reliabilityRes, trendsRes] = await Promise.all([
      fetch(`${base}/api/insights`),
      fetch(`${base}/api/reliability`),
      fetch(`${base}/api/trends`),
    ]);

    const [insights, reliability, trends] = await Promise.all([
      insightsRes.json(),
      reliabilityRes.json(),
      trendsRes.json(),
    ]);

    const summary = reliability?.summary;
    const topIssues = trends?.resourceTypes ?? [];
    const boroughs = trends?.boroughs ?? [];

    const isPrivileged = ["government", "internal"].includes(role);
    const isCommunity = role === "client";

    if (isCommunity) {
      return `
AVAILABLE RESOURCES:
${(insights?.typeBreakdown ?? []).map((t: { name: string; count: number }) => `- ${t.name}: ${t.count} locations`).join("\n")}

BOROUGH COVERAGE:
${boroughs.slice(0, 5).map((b: { borough: string; resourceCount: number }) => `- ${b.borough}: ${b.resourceCount} pantries`).join("\n")}
      `.trim();
    }

    const boroughNames = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
    const atRiskByBorough = boroughNames.map(borough => {
      const pantries = (reliability?.resources ?? [])
        .filter((r: { badge: string; city: string | null; waitTime: number | null }) =>
          r.badge === "At Risk" &&
          r.waitTime != null &&
          r.waitTime > 0 &&
          r.city != null
        )
        .filter((r: { city: string }) =>
          borough === "Manhattan"
            ? r.city.toLowerCase().includes("new york") || r.city.toLowerCase().includes("manhattan")
            : r.city.toLowerCase().includes(borough.toLowerCase())
        )
        .sort((a: { waitTime: number }, b: { waitTime: number }) => b.waitTime - a.waitTime)
        .slice(0, 3);
      return { borough, pantries };
    }).filter(b => b.pantries.length > 0);

    return `
RELIABILITY OVERVIEW:
- Excellent pantries: ${summary?.excellent ?? "N/A"}
- Good pantries: ${summary?.good ?? "N/A"}
- At-risk pantries: ${summary?.atRisk ?? "N/A"}
- Average reliability score: ${summary?.avgScore ?? "N/A"}

BOROUGH BREAKDOWN:
${boroughs.slice(0, 5).map((b: { borough: string; avgRating: number; resourceCount: number }) => `- ${b.borough}: ${b.resourceCount} pantries, avg rating ${b.avgRating?.toFixed(2) ?? "N/A"}`).join("\n")}

AT-RISK PANTRIES BY BOROUGH NEEDING SUPPORT:
${atRiskByBorough.map(b =>
      `${b.borough}:\n${b.pantries.map((r: { name: string; waitTime: number }) => `  - ${r.name} — ${Math.round(r.waitTime)} min avg wait`).join("\n")}`
    ).join("\n")}

${isPrivileged ? `RESOURCE TYPE BREAKDOWN:\n${topIssues.slice(0, 5).map((t: { type: string; count: number }) => `- ${t.type}: ${t.count} locations`).join("\n")}` : ""}
    `.trim();
  } catch {
    return "Live dashboard data is currently unavailable.";
  }
}

export async function POST(request: Request) {
  const { messages, role } = await request.json();

  const resolvedRole = role ?? "donor";
  const roleInstruction = ROLE_CONTEXT[resolvedRole] ?? ROLE_CONTEXT["donor"];
  const context = await getDashboardContext(resolvedRole);

  const groqMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are LemonAid Assistant, a helpful AI chatbot for the LemonAid food access dashboard. Be concise, direct, and keep responses to 2-3 sentences max. Never use numbered lists unless specifically asked. Only provide dashboard data when the user explicitly asks for it. If the user is just chatting or seems confused, respond naturally and ask how you can help. Do not volunteer data unless asked. Never include URLs or links in your responses. Never make up website addresses.\n\n${roleInstruction}\n\nHere is the current live dashboard data relevant to this user:\n${context}`
        },
        ...groqMessages
      ],
      max_tokens: 500,
    }),
  });

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response.";
  return NextResponse.json({ reply });
}