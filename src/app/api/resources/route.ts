import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const search = searchParams.get("search")?.trim() ?? "";
    const offset = (page - 1) * PAGE_SIZE;

    const searchClause = search
      ? `AND (name ILIKE $3 OR CONCAT_WS(', ', "addressStreet1", city, state) ILIKE $3)`
      : "";

    const params: (string | number)[] = [PAGE_SIZE, offset];
    if (search) params.push(`%${search}%`);

    const [rowsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
          id, name,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(', ',
              NULLIF(TRIM("addressStreet1"), ''),
              NULLIF(TRIM(city), ''),
              NULLIF(TRIM(state), '')
            )), ''),
            'New York, NY'
          ) AS location,
          latitude, longitude,
          "resourceTypeName" AS hours,
          COALESCE(NULLIF(TRIM(description), ''), 'Food resource available in this area.') AS description,
          "resourceTypeId",
          "ratingAverage",
          "waitTimeMinutesAverage",
          "reviewCount",
          "acceptingNewClients"
        FROM "Resource"
        WHERE latitude BETWEEN 40.4 AND 40.95
          AND longitude BETWEEN -74.3 AND -73.7
          AND "resourceStatusId" = 'PUBLISHED'
          AND "resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
          ${searchClause}
        ORDER BY priority DESC NULLS LAST, "subscriberCount" DESC
        LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM "Resource"
        WHERE latitude BETWEEN 40.4 AND 40.95
          AND longitude BETWEEN -74.3 AND -73.7
          AND "resourceStatusId" = 'PUBLISHED'
          AND "resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
          ${searchClause}`,
        search ? [`%${search}%`] : []
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return NextResponse.json({
      resources: rowsResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json({ resources: [], total: 0, page: 1, totalPages: 0 }, { status: 500 });
  }
}
