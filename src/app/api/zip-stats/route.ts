import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { cached } from "@/lib/cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const body = await cached("zip-stats", CACHE_TTL, async () => {
    const result = await pool.query(`
      SELECT
        "zipCode",
        COUNT(*) AS total,
        SUM(CASE WHEN "resourceStatusId" = 'PUBLISHED' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN "resourceStatusId" = 'UNAVAILABLE' THEN 1 ELSE 0 END) AS unavailable,
        ROUND(
          SUM(CASE WHEN "resourceStatusId" = 'UNAVAILABLE' THEN 1 ELSE 0 END)::numeric
          / COUNT(*) * 100, 1
        ) AS pct_unavailable
      FROM "Resource"
      WHERE state IN ('NY', 'New York', 'Ny')
        AND "zipCode" IS NOT NULL
        AND "zipCode" != ''
        AND "resourceTypeId" IN ('FOOD_PANTRY','SOUP_KITCHEN','COMMUNITY_FRIDGE','SNAP_EBT','MEAL_DELIVERY')
      GROUP BY "zipCode"
      HAVING COUNT(*) >= 2
      ORDER BY pct_unavailable DESC
    `);

    const zipStats: Record<string, { total: number; published: number; unavailable: number; pctUnavailable: number }> = {};
    for (const row of result.rows) {
      zipStats[row.zipCode] = {
        total: parseInt(row.total),
        published: parseInt(row.published),
        unavailable: parseInt(row.unavailable),
        pctUnavailable: parseFloat(row.pct_unavailable),
      };
    }

    return { zipStats };
    }); // end cached

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("zip-stats error:", error);
    return NextResponse.json({ zipStats: {} }, { status: 500 });
  }
}
