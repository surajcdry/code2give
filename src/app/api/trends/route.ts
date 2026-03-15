import pool from "@/lib/db/pool";
import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const BOROUGH_CASE = `
  CASE
    WHEN city IN ('Brooklyn','Bedford-Stuyvesant','Williamsburg','Bushwick','East New York','Crown Heights','Flatbush','Bay Ridge','Sunset Park','Borough Park','Greenpoint','Park Slope') THEN 'Brooklyn'
    WHEN city ILIKE '%bronx%' OR city = 'Bronx' OR city = 'East Bronx' THEN 'Bronx'
    WHEN city = 'Staten Island' THEN 'Staten Island'
    WHEN city IN ('Jamaica','Flushing','Astoria','Elmhurst','Jackson Heights','Forest Hills','Bayside','Corona','Long Island City','Richmond Hill','Far Rockaway','Ridgewood','Woodside','Sunnyside','Maspeth','Middle Village') THEN 'Queens'
    ELSE 'Manhattan'
  END
`;

export async function GET() {
  try {
    const body = await cached("trends", CACHE_TTL, async () => {
    const [boroughsResult, quadrantResult, topEngagedResult, resourceTypesResult] =
      await Promise.all([
        pool.query(`
          SELECT
            ${BOROUGH_CASE} AS borough,
            count(*) AS total,
            sum(CASE WHEN "resourceStatusId" = 'PUBLISHED' THEN 1 ELSE 0 END) AS published,
            sum(CASE WHEN "resourceStatusId" = 'UNAVAILABLE' THEN 1 ELSE 0 END) AS unavailable,
            round(avg("ratingAverage")::numeric, 2) AS "avgRating",
            round(
              avg(CASE WHEN "waitTimeMinutesAverage" < 240 THEN "waitTimeMinutesAverage" END)::numeric,
              1
            ) AS "avgWait"
          FROM "Resource"
          WHERE state IN ('NY', 'New York', 'Ny')
          GROUP BY borough
          ORDER BY borough
        `),

        pool.query(`
          SELECT
            id,
            name,
            city,
            "ratingAverage" AS rating,
            "waitTimeMinutesAverage" AS "waitTime",
            "subscriberCount" AS subscribers,
            "resourceTypeName" AS type
          FROM "Resource"
          WHERE state IN ('NY', 'New York', 'Ny')
            AND "ratingAverage" IS NOT NULL
            AND "waitTimeMinutesAverage" IS NOT NULL
            AND "waitTimeMinutesAverage" < 240
            AND "resourceStatusId" = 'PUBLISHED'
          ORDER BY "ratingAverage" DESC
        `),

        pool.query(`
          SELECT
            id,
            name,
            city,
            "subscriberCount" AS subscribers,
            "reviewCount" AS reviews,
            "ratingAverage" AS rating,
            "resourceTypeName" AS type
          FROM "Resource"
          WHERE state IN ('NY', 'New York', 'Ny')
            AND "resourceStatusId" = 'PUBLISHED'
          ORDER BY "subscriberCount" DESC NULLS LAST
          LIMIT 15
        `),

        pool.query(`
          SELECT
            "resourceTypeName" AS type,
            count(*) AS count
          FROM "Resource"
          WHERE state IN ('NY', 'New York', 'Ny')
            AND "resourceStatusId" = 'PUBLISHED'
          GROUP BY "resourceTypeName"
          ORDER BY count DESC
        `),
      ]);

    const boroughs = boroughsResult.rows.map((row) => ({
      borough: row.borough,
      total: Number(row.total),
      published: Number(row.published),
      unavailable: Number(row.unavailable),
      avgRating: row.avgRating !== null ? Number(row.avgRating) : null,
      avgWait: row.avgWait !== null ? Number(row.avgWait) : null,
    }));

    const resourceTypes = resourceTypesResult.rows.map((row) => ({
      type: row.type,
      count: Number(row.count),
    }));

    return {
      boroughs,
      quadrant: quadrantResult.rows,
      topEngaged: topEngagedResult.rows,
      resourceTypes,
    };
    }); // end cached

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });  } catch (error) {
    console.error("Error fetching trends data:", error);
    return NextResponse.json({ error: "Failed to fetch trends data" }, { status: 500 });
  }
}
