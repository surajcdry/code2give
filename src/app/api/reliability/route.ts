import pool from "@/lib/db/pool";
import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";


const CACHE_TTL = 5 * 60 * 1000; // 5 minutes


interface ShiftRow {
  recurrencePattern?: string | null;
  [key: string]: unknown;
}


function parseDaysCovered(shifts: unknown): number {
  if (!Array.isArray(shifts) || shifts.length === 0) return 0;


  const uniqueDays = new Set<string>();
  const dayTokens = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];


  for (const shift of shifts as ShiftRow[]) {
    const pattern = shift?.recurrencePattern;
    if (typeof pattern !== "string") continue;


    const match = pattern.match(/BYDAY=([^;]+)/);
    if (!match) continue;


    const days = match[1].split(",").map((d) => d.trim().toUpperCase());
    for (const day of days) {
      if (dayTokens.includes(day)) {
        uniqueDays.add(day);
      }
    }
  }


  return uniqueDays.size;
}


function computeScores(
  ratingAverage: number | null,
  shifts: unknown
): { feedbackScore: number; consistencyScore: number; reliabilityScore: number } {
  const feedbackScore =
    ratingAverage == null
      ? 50
      : Math.min((ratingAverage / 3.5) * 100, 100);


  const daysCovered = parseDaysCovered(shifts);
  const consistencyScore = (daysCovered / 7) * 100;


  const reliabilityScore =
    Math.round((feedbackScore * 0.6 + consistencyScore * 0.4) * 10) / 10;


  return {
    feedbackScore: Math.round(feedbackScore * 10) / 10,
    consistencyScore: Math.round(consistencyScore * 10) / 10,
    reliabilityScore,
  };
}


function getBadge(score: number): { badge: string; color: string } {
  if (score >= 75) return { badge: "Excellent", color: "green" };
  if (score >= 50) return { badge: "Good", color: "yellow" };
  return { badge: "At Risk", color: "red" };
}


export async function GET() {
  try {
    const body = await cached("reliability", CACHE_TTL, async () => {
    const result = await pool.query(`
      SELECT
        id,
        name,
        city,
        "ratingAverage",
        "waitTimeMinutesAverage",
        "subscriberCount",
        "reviewCount",
        shifts,
        "resourceTypeName",
        "addressStreet1",
        "zipCode"
      FROM "Resource"
      WHERE state IN ('NY', 'New York', 'Ny')
        AND "resourceStatusId" = 'PUBLISHED'
        AND "resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
    `);


    const resources = result.rows.map((row) => {
      const ratingAverage =
        row.ratingAverage != null ? parseFloat(row.ratingAverage) : null;


      let shifts: unknown = row.shifts;
      if (typeof shifts === "string") {
        try {
          shifts = JSON.parse(shifts);
        } catch {
          shifts = [];
        }
      }


      const { feedbackScore, consistencyScore, reliabilityScore } =
        computeScores(ratingAverage, shifts);


      const daysCovered = parseDaysCovered(shifts);
      const { badge, color } = getBadge(reliabilityScore);


      const subscribers = row.subscriberCount != null ? parseInt(row.subscriberCount) : 0;
      const highPriority = subscribers > 100 && reliabilityScore < 50;


      return {
        id: row.id,
        name: row.name,
        city: row.city ?? null,
        address: row.addressStreet1 ?? null,
        zipCode: row.zipCode ?? null,
        type: row.resourceTypeName ?? null,
        ratingAverage,
        waitTime:
          row.waitTimeMinutesAverage != null
            ? parseFloat(row.waitTimeMinutesAverage)
            : null,
        subscribers,
        reviews: row.reviewCount != null ? parseInt(row.reviewCount) : 0,
        daysCovered,
        feedbackScore,
        consistencyScore,
        reliabilityScore,
        badge,
        badgeColor: color,
        ...(highPriority && { highPriority: true }),
      };
    });


    // Sort descending by reliability score
    resources.sort((a, b) => b.reliabilityScore - a.reliabilityScore);


    // Summary counts
    let excellent = 0;
    let good = 0;
    let atRisk = 0;
    let scoreSum = 0;


    const buckets: number[] = new Array(10).fill(0);


    for (const r of resources) {
      if (r.reliabilityScore >= 75) excellent++;
      else if (r.reliabilityScore >= 50) good++;
      else atRisk++;


      scoreSum += r.reliabilityScore;


      const bucketIndex = Math.min(Math.floor(r.reliabilityScore / 10), 9);
      buckets[bucketIndex]++;
    }


    const avgScore =
      resources.length > 0
        ? Math.round((scoreSum / resources.length) * 10) / 10
        : 0;


    const histogram = buckets.map((count, i) => ({
      range: `${i * 10}-${i * 10 + 10}`,
      count,
    }));


    return {
      resources,
      summary: {
        excellent,
        good,
        atRisk,
        avgScore,
        histogram,
      },
    };
    }); // end cached


    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ resources: [], summary: {} }, { status: 500 });
  }
}


