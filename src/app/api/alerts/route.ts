import pool from "@/lib/db/pool";
import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const BOROUGH_CASE = `
  CASE
    WHEN city IN ('Brooklyn','Bedford-Stuyvesant','Williamsburg','Bushwick','East New York','Crown Heights','Flatbush','Bay Ridge','Sunset Park','Borough Park','Greenpoint','Park Slope') THEN 'Brooklyn'
    WHEN city ILIKE '%bronx%' OR city = 'Bronx' OR city = 'East Bronx' THEN 'Bronx'
    WHEN city = 'Staten Island' THEN 'Staten Island'
    WHEN city IN ('Jamaica','Flushing','Astoria','Elmhurst','Jackson Heights','Forest Hills','Bayside','Corona','Long Island City','Richmond Hill','Far Rockaway','Ridgewood','Woodside','Sunnyside','Maspeth','Middle Village') THEN 'Queens'
    ELSE 'Manhattan'
  END
`;

interface Alert {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count: number;
  zipCode?: string;
  id?: string;
}

export async function GET() {
  try {
    const body = await cached("alerts", CACHE_TTL, async () => {
    const [
      unavailabilityResult,
      lowRatedResult,
      dataGapResult,
      shiftsResult,
    ] = await Promise.all([
      // Alert 1: High Unavailability Zones
      pool.query(`
        SELECT
          "zipCode",
          count(*) AS total,
          sum(CASE WHEN "resourceStatusId" = 'UNAVAILABLE' THEN 1 ELSE 0 END) AS unavailable,
          round(
            sum(CASE WHEN "resourceStatusId" = 'UNAVAILABLE' THEN 1 ELSE 0 END)::numeric / count(*) * 100,
            0
          ) AS pct
        FROM "Resource"
        WHERE state IN ('NY', 'New York', 'Ny')
          AND "zipCode" IS NOT NULL
          AND "zipCode" != ''
        GROUP BY "zipCode"
        HAVING
          count(*) >= 3
          AND sum(CASE WHEN "resourceStatusId" = 'UNAVAILABLE' THEN 1 ELSE 0 END)::numeric / count(*) > 0.6
        ORDER BY pct DESC
        LIMIT 10
      `),

      // Alert 2: Low-rated but High Traffic
      pool.query(`
        SELECT
          id,
          name,
          city,
          "ratingAverage" AS rating,
          "subscriberCount" AS subscribers
        FROM "Resource"
        WHERE state IN ('NY', 'New York', 'Ny')
          AND "resourceStatusId" = 'PUBLISHED'
          AND "ratingAverage" < 2.0
          AND "subscriberCount" > 50
        ORDER BY "subscriberCount" DESC
      `),

      // Alert 3: Data Gaps
      pool.query(`
        SELECT
          sum(CASE WHEN "ratingAverage" IS NULL THEN 1 ELSE 0 END) AS "noRating",
          sum(CASE WHEN "waitTimeMinutesAverage" IS NULL THEN 1 ELSE 0 END) AS "noWait",
          sum(CASE WHEN shifts = '[]' OR shifts IS NULL THEN 1 ELSE 0 END) AS "noShifts"
        FROM "Resource"
        WHERE state IN ('NY', 'New York', 'Ny')
          AND "resourceStatusId" = 'PUBLISHED'
      `),

      // Alert 4: No Sunday Coverage — check in SQL to avoid pulling all shifts JSON
      pool.query(`
        SELECT DISTINCT
          ${BOROUGH_CASE} AS borough
        FROM "Resource",
          LATERAL jsonb_array_elements(shifts::jsonb) AS shift
        WHERE state IN ('NY', 'New York', 'Ny')
          AND "resourceStatusId" = 'PUBLISHED'
          AND shift->>'recurrencePattern' LIKE '%SU%'
      `),
    ]);

    const alerts: Alert[] = [];

    // Alert 1: High Unavailability Zones
    for (const row of unavailabilityResult.rows) {
      const pct = Number(row.pct);
      const unavailable = Number(row.unavailable);
      const total = Number(row.total);
      alerts.push({
        type: "HIGH_UNAVAILABILITY",
        severity: "high",
        zipCode: row.zipCode,
        title: `${pct}% of resources unavailable in zip ${row.zipCode}`,
        description: `${unavailable} of ${total} resources in this area are unavailable`,
        count: unavailable,
      });
    }

    // Alert 2: Low-rated but High Traffic
    for (const row of lowRatedResult.rows) {
      const rating = Number(row.rating);
      const subscribers = Number(row.subscribers);
      alerts.push({
        type: "LOW_RATED_HIGH_TRAFFIC",
        severity: "high",
        id: row.id,
        title: row.name,
        description: `Rating ${rating.toFixed(1)} but ${subscribers} subscribers — high need, poor experience`,
        count: subscribers,
      });
    }

    // Alert 3: Data Gaps
    if (dataGapResult.rows.length > 0) {
      const { noRating, noWait, noShifts } = dataGapResult.rows[0];
      const noRatingCount = Number(noRating);
      const noWaitCount = Number(noWait);
      const noShiftsCount = Number(noShifts);

      if (noRatingCount > 0 || noWaitCount > 0 || noShiftsCount > 0) {
        alerts.push({
          type: "DATA_GAP",
          severity: "medium",
          title: "Incomplete resource data",
          description: `${noRatingCount} resources have no rating, ${noWaitCount} have no wait time data, ${noShiftsCount} have no schedule`,
          count: noRatingCount,
        });
      }
    }

    // Alert 4: No Sunday Coverage Boroughs
    const sundayCoveredBoroughs = new Set(shiftsResult.rows.map((r: { borough: string }) => r.borough));
    for (const borough of BOROUGHS) {
      if (!sundayCoveredBoroughs.has(borough)) {
        alerts.push({
          type: "COVERAGE_GAP",
          severity: "medium",
          title: `No Sunday coverage in ${borough}`,
          description: "No food resources scheduled on Sundays in this area",
          count: 0,
        });
      }
    }

    // Sort: high severity first, then medium
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return { alerts };
    }); // end cached

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });  } catch (error) {
    console.error("Error fetching alerts data:", error);
    return NextResponse.json({ error: "Failed to fetch alerts data" }, { status: 500 });
  }
}
