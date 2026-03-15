import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { cached } from "@/lib/cache";

// NYC state filter — excludes NJ bleed-in from geo bounding box
const NYC_WHERE = `
  state IN ('NY', 'New York', 'Ny')
  AND "resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
`;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const body = await cached("insights", CACHE_TTL, async () => {
    const [
      countsResult,
      typeBreakdownResult,
      statusBreakdownResult,
      ratingDistResult,
      waitTimeDistResult,
      topByReviewsResult,
      topBySubscribersResult,
      zipHotspotsResult,
    ] = await Promise.all([
      // Total counts + avg metrics (cap wait time outliers at 240 min)
      pool.query(`
        SELECT
          COUNT(*)                                                        AS total,
          COUNT(*) FILTER (WHERE "resourceStatusId" = 'PUBLISHED')       AS published,
          COUNT(*) FILTER (WHERE "resourceStatusId" = 'UNAVAILABLE')     AS unavailable,
          COUNT(*) FILTER (WHERE "ratingAverage" IS NOT NULL)            AS rated,
          ROUND(AVG("ratingAverage")::numeric, 2)                        AS avg_rating,
          COUNT(*) FILTER (WHERE "waitTimeMinutesAverage" IS NOT NULL AND "waitTimeMinutesAverage" <= 240) AS has_wait,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY "waitTimeMinutesAverage"
          ) FILTER (WHERE "waitTimeMinutesAverage" IS NOT NULL AND "waitTimeMinutesAverage" <= 240)::numeric, 0) AS median_wait,
          COUNT(*) FILTER (WHERE "reviewCount" > 0)                      AS has_reviews,
          COUNT(*) FILTER (WHERE "subscriberCount" > 0)                  AS has_subscribers
        FROM "Resource"
        WHERE ${NYC_WHERE}
      `),

      // Resource type breakdown
      pool.query(`
        SELECT "resourceTypeId", "resourceTypeName", COUNT(*) AS count
        FROM "Resource"
        WHERE ${NYC_WHERE}
        GROUP BY "resourceTypeId", "resourceTypeName"
        ORDER BY count DESC
      `),

      // Published vs Unavailable
      pool.query(`
        SELECT "resourceStatusId", COUNT(*) AS count
        FROM "Resource"
        WHERE ${NYC_WHERE}
        GROUP BY "resourceStatusId"
        ORDER BY count DESC
      `),

      // Rating distribution in 0.5 buckets (1.0–3.5)
      pool.query(`
        SELECT
          FLOOR("ratingAverage" * 2) / 2 AS bucket_start,
          COUNT(*) AS count
        FROM "Resource"
        WHERE ${NYC_WHERE}
          AND "ratingAverage" IS NOT NULL
          AND "resourceStatusId" = 'PUBLISHED'
        GROUP BY bucket_start
        ORDER BY bucket_start
      `),

      // Wait time distribution (cap at 240 min)
      pool.query(`
        SELECT
          CASE
            WHEN "waitTimeMinutesAverage" < 15  THEN '0–15 min'
            WHEN "waitTimeMinutesAverage" < 30  THEN '15–30 min'
            WHEN "waitTimeMinutesAverage" < 60  THEN '30–60 min'
            WHEN "waitTimeMinutesAverage" < 120 THEN '60–120 min'
            ELSE '120+ min'
          END AS bucket,
          CASE
            WHEN "waitTimeMinutesAverage" < 15  THEN 1
            WHEN "waitTimeMinutesAverage" < 30  THEN 2
            WHEN "waitTimeMinutesAverage" < 60  THEN 3
            WHEN "waitTimeMinutesAverage" < 120 THEN 4
            ELSE 5
          END AS sort_order,
          COUNT(*) AS count
        FROM "Resource"
        WHERE ${NYC_WHERE}
          AND "waitTimeMinutesAverage" IS NOT NULL
          AND "waitTimeMinutesAverage" <= 240
          AND "resourceStatusId" = 'PUBLISHED'
        GROUP BY bucket, sort_order
        ORDER BY sort_order
      `),

      // Top 10 by review count
      pool.query(`
        SELECT
          name,
          "resourceTypeName",
          "reviewCount",
          "ratingAverage",
          "subscriberCount",
          COALESCE(NULLIF(TRIM(CONCAT_WS(', ',
            NULLIF(TRIM("addressStreet1"), ''),
            NULLIF(TRIM(city), ''),
            NULLIF(TRIM(state), '')
          )), ''), 'New York, NY') AS location
        FROM "Resource"
        WHERE ${NYC_WHERE}
          AND "resourceStatusId" = 'PUBLISHED'
          AND "reviewCount" > 0
        ORDER BY "reviewCount" DESC
        LIMIT 10
      `),

      // Top 10 by subscriber count
      pool.query(`
        SELECT
          name,
          "resourceTypeName",
          "reviewCount",
          "ratingAverage",
          "subscriberCount",
          COALESCE(NULLIF(TRIM(CONCAT_WS(', ',
            NULLIF(TRIM("addressStreet1"), ''),
            NULLIF(TRIM(city), ''),
            NULLIF(TRIM(state), '')
          )), ''), 'New York, NY') AS location
        FROM "Resource"
        WHERE ${NYC_WHERE}
          AND "resourceStatusId" = 'PUBLISHED'
          AND "subscriberCount" > 0
        ORDER BY "subscriberCount" DESC
        LIMIT 10
      `),

      // Top zip codes
      pool.query(`
        SELECT
          "zipCode",
          COUNT(*) AS count
        FROM "Resource"
        WHERE ${NYC_WHERE}
          AND "resourceStatusId" = 'PUBLISHED'
          AND "zipCode" IS NOT NULL
          AND "zipCode" != ''
        GROUP BY "zipCode"
        ORDER BY count DESC
        LIMIT 15
      `),
    ]);

    const counts = countsResult.rows[0];

    return {
      summary: {
        total: parseInt(counts.total),
        published: parseInt(counts.published),
        unavailable: parseInt(counts.unavailable),
        rated: parseInt(counts.rated),
        avgRating: parseFloat(counts.avg_rating),
        medianWaitMinutes: parseFloat(counts.median_wait),
        hasReviews: parseInt(counts.has_reviews),
        hasSubscribers: parseInt(counts.has_subscribers),
      },
      typeBreakdown: typeBreakdownResult.rows.map(r => ({
        type: r.resourceTypeId,
        name: r.resourceTypeName,
        count: parseInt(r.count),
      })),
      statusBreakdown: statusBreakdownResult.rows.map(r => ({
        status: r.resourceStatusId,
        count: parseInt(r.count),
      })),
      ratingDistribution: ratingDistResult.rows.map(r => ({
        bucket: parseFloat(r.bucket_start),
        label: `${parseFloat(r.bucket_start).toFixed(1)}–${(parseFloat(r.bucket_start) + 0.5).toFixed(1)}`,
        count: parseInt(r.count),
      })),
      waitTimeDistribution: waitTimeDistResult.rows.map(r => ({
        bucket: r.bucket,
        count: parseInt(r.count),
      })),
      topByReviews: topByReviewsResult.rows.map(r => ({
        name: r.name,
        type: r.resourceTypeName,
        reviewCount: parseInt(r.reviewCount),
        rating: r.ratingAverage ? parseFloat(r.ratingAverage).toFixed(2) : null,
        subscribers: parseInt(r.subscriberCount),
        location: r.location,
      })),
      topBySubscribers: topBySubscribersResult.rows.map(r => ({
        name: r.name,
        type: r.resourceTypeName,
        reviewCount: parseInt(r.reviewCount),
        rating: r.ratingAverage ? parseFloat(r.ratingAverage).toFixed(2) : null,
        subscribers: parseInt(r.subscriberCount),
        location: r.location,
      })),
      zipHotspots: zipHotspotsResult.rows.map(r => ({
        zip: r.zipCode,
        count: parseInt(r.count),
      })),
    };
    }); // end cached

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
