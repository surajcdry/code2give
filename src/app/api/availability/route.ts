import pool from "@/lib/db/pool";
import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DAYS_MAP: Record<string, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};

const DAY_INDEX_MAP: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

function extractDaysFromShifts(shifts: unknown[]): string[] {
  if (!Array.isArray(shifts) || shifts.length === 0) return [];

  const days = new Set<string>();

  for (const shift of shifts) {
    if (!shift || typeof shift !== "object") continue;
    const recurrence = (shift as Record<string, unknown>).recurrencePattern;
    if (!recurrence || typeof recurrence !== "string") continue;

    const bydayMatch = recurrence.match(/BYDAY=([^;\n\r]+)/);
    if (!bydayMatch) continue;

    const codes = bydayMatch[1].split(",");
    for (const code of codes) {
      // Strip numeric prefixes like "2SA" → "SA"
      const cleaned = code.trim().replace(/^-?\d+/, "");
      if (DAYS_MAP[cleaned]) {
        days.add(DAYS_MAP[cleaned]);
      }
    }
  }

  return Array.from(days);
}

export async function GET() {
  try {
    const body = await cached("availability", CACHE_TTL, async () => {
    const result = await pool.query(`
      SELECT
        id,
        name,
        city,
        "addressStreet1" AS address,
        "resourceTypeName" AS type,
        shifts,
        ${BOROUGH_CASE} AS borough
      FROM "Resource"
      WHERE state IN ('NY', 'New York', 'Ny')
        AND "resourceStatusId" = 'PUBLISHED'
    `);

    const todayIndex = new Date().getDay();
    const todayName = DAY_INDEX_MAP[todayIndex];

    // Initialize heatmap counts per borough per day
    const heatmapMap: Record<string, Record<string, number>> = {};
    for (const borough of BOROUGHS) {
      heatmapMap[borough] = {};
      for (const day of ALL_DAYS) {
        heatmapMap[borough][day] = 0;
      }
    }

    // Initialize summary counts
    const summary: Record<string, number> = {};
    for (const day of ALL_DAYS) {
      summary[day] = 0;
    }

    const openToday: Array<{
      id: string;
      name: string;
      city: string;
      address: string;
      type: string;
    }> = [];

    for (const row of result.rows) {
      let shifts: unknown[] = [];
      if (row.shifts) {
        try {
          shifts = typeof row.shifts === "string" ? JSON.parse(row.shifts) : row.shifts;
        } catch {
          shifts = [];
        }
      }

      const days = extractDaysFromShifts(shifts);

      if (days.length > 0) {
        const borough: string = row.borough ?? "Manhattan";
        for (const day of days) {
          if (heatmapMap[borough]) {
            heatmapMap[borough][day] = (heatmapMap[borough][day] ?? 0) + 1;
          }
          summary[day] = (summary[day] ?? 0) + 1;
        }

        if (days.includes(todayName)) {
          openToday.push({
            id: row.id,
            name: row.name,
            city: row.city,
            address: row.address ?? "",
            type: row.type,
          });
        }
      }
    }

    const heatmap = BOROUGHS.map((borough) => ({
      borough,
      ...heatmapMap[borough],
    }));

    return { heatmap, openToday, summary };
    }); // end cached

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Error fetching availability data:", error);
    return NextResponse.json({ error: "Failed to fetch availability data" }, { status: 500 });
  }
}
