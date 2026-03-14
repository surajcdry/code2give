import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";

const PAGE_SIZE = 20;

const ALL_FOOD_TYPES = [
  "FOOD_PANTRY",
  "SOUP_KITCHEN",
  "COMMUNITY_FRIDGE",
  "SNAP_EBT",
  "MEAL_DELIVERY",
  "OTHER",
];

const DAY_CODE_MAP: Record<string, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WEEKEND = ["Sat", "Sun"];

const ISO_DAY_INDEX: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function parseSchedule(shifts: unknown): string {
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return "Schedule unavailable";
  }

  const uniqueDays = new Set<string>();
  let isMonthly = false;

  for (const shift of shifts) {
    if (!shift || typeof shift !== "object") continue;

    const pattern = (shift as Record<string, unknown>).recurrencePattern;

    if (typeof pattern === "string" && pattern.length > 0) {
      if (pattern.includes("FREQ=MONTHLY")) {
        isMonthly = true;
      }

      const bydayMatch = pattern.match(/BYDAY=([^;]+)/);
      if (bydayMatch) {
        const codes = bydayMatch[1].split(",");
        for (const code of codes) {
          const trimmed = code.trim().toUpperCase();
          if (DAY_CODE_MAP[trimmed]) {
            uniqueDays.add(DAY_CODE_MAP[trimmed]);
          }
        }
      }
    } else {
      // No recurrencePattern — try to derive day from startTime ISO string
      const startTime = (shift as Record<string, unknown>).startTime;
      if (typeof startTime === "string" && startTime.length > 0) {
        const date = new Date(startTime);
        if (!isNaN(date.getTime())) {
          const dayName = ISO_DAY_INDEX[date.getDay()];
          if (dayName) uniqueDays.add(dayName);
        }
      }
    }
  }

  if (uniqueDays.size === 0) {
    return "Schedule unavailable";
  }

  // Preserve canonical order
  const orderedDays = ALL_DAYS.filter((d) => uniqueDays.has(d));

  let label: string;
  if (orderedDays.length === 7) {
    label = "Every day";
  } else if (
    orderedDays.length === WEEKDAYS.length &&
    WEEKDAYS.every((d) => uniqueDays.has(d)) &&
    !uniqueDays.has("Sat") &&
    !uniqueDays.has("Sun")
  ) {
    label = "Weekdays";
  } else if (
    orderedDays.length === WEEKEND.length &&
    WEEKEND.every((d) => uniqueDays.has(d)) &&
    orderedDays.length === 2
  ) {
    label = "Weekends";
  } else {
    label = orderedDays.join(", ");
  }

  return isMonthly ? `Monthly — ${label}` : label;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // --- Meta shortcut ---
    if (searchParams.get("meta") === "true") {
      const [typesResult, statusResult] = await Promise.all([
        pool.query<{ id: string; name: string; count: string }>(
          `SELECT
            "resourceTypeId" AS id,
            "resourceTypeName" AS name,
            COUNT(*) AS count
          FROM "Resource"
          WHERE state IN ('NY', 'New York', 'Ny')
            AND "resourceTypeId" IN (${ALL_FOOD_TYPES.map((_, i) => `$${i + 1}`).join(", ")})
          GROUP BY "resourceTypeId", "resourceTypeName"
          ORDER BY count DESC`,
          ALL_FOOD_TYPES
        ),
        pool.query<{ status: string; count: string }>(
          `SELECT
            "resourceStatusId" AS status,
            COUNT(*) AS count
          FROM "Resource"
          WHERE state IN ('NY', 'New York', 'Ny')
            AND "resourceTypeId" IN (${ALL_FOOD_TYPES.map((_, i) => `$${i + 1}`).join(", ")})
          GROUP BY "resourceStatusId"`,
          ALL_FOOD_TYPES
        ),
      ]);

      const types = typesResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        count: parseInt(r.count, 10),
      }));

      const statusCounts: Record<string, number> = {};
      for (const r of statusResult.rows) {
        statusCounts[r.status] = parseInt(r.count, 10);
      }

      return NextResponse.json({ types, statusCounts });
    }

    // --- Main query ---
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const search = searchParams.get("search")?.trim() ?? "";
    const typeFilter = searchParams.get("type")?.trim() ?? "";
    const statusFilter = searchParams.get("status")?.trim() ?? "all";
    const sortBy = searchParams.get("sortBy")?.trim() ?? "name";
    const sortDir = searchParams.get("sortDir")?.trim() === "desc" ? "DESC" : "ASC";
    const offset = (page - 1) * PAGE_SIZE;

    // Validate sortBy to prevent SQL injection
    const allowedSortFields: Record<string, string> = {
      name: "name",
      city: "city",
      ratingAverage: '"ratingAverage"',
      waitTimeMinutesAverage: '"waitTimeMinutesAverage"',
      subscriberCount: '"subscriberCount"',
      reviewCount: '"reviewCount"',
      resourceTypeName: '"resourceTypeName"',
      status: '"resourceStatusId"',
      resourceStatusId: '"resourceStatusId"',
    };
    const orderExpr = allowedSortFields[sortBy] ?? "name";

    const conditions: string[] = [`state IN ('NY', 'New York', 'Ny')`];
    const params: (string | number)[] = [];

    // Type filter
    const typeIds = typeFilter && typeFilter !== "all" ? [typeFilter] : ALL_FOOD_TYPES;
    const typePlaceholders = typeIds.map((_, i) => `$${params.length + i + 1}`).join(", ");
    conditions.push(`"resourceTypeId" IN (${typePlaceholders})`);
    params.push(...typeIds);

    // Status filter
    if (statusFilter && statusFilter !== "all") {
      params.push(statusFilter);
      conditions.push(`"resourceStatusId" = $${params.length}`);
    }

    // Search filter
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR city ILIKE $${params.length} OR "addressStreet1" ILIKE $${params.length})`
      );
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Pagination params
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(PAGE_SIZE, offset);

    const selectSQL = `
      SELECT
        id, name, city,
        "zipCode",
        "addressStreet1",
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(', ',
            NULLIF(TRIM("addressStreet1"), ''),
            NULLIF(TRIM(city), ''),
            NULLIF(TRIM(state), '')
          )), ''),
          'New York, NY'
        ) AS location,
        "resourceTypeName" AS type,
        "resourceTypeId",
        "resourceStatusId" AS status,
        "ratingAverage",
        "waitTimeMinutesAverage",
        "reviewCount",
        "subscriberCount",
        "acceptingNewClients",
        "openByAppointment",
        "appointmentRequired",
        website,
        shifts,
        latitude, longitude
      FROM "Resource"
      ${whereClause}
      ORDER BY ${orderExpr} ${sortDir} NULLS LAST
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countSQL = `SELECT COUNT(*) FROM "Resource" ${whereClause}`;
    // Count query uses same params minus LIMIT/OFFSET
    const countParams = params.slice(0, params.length - 2);

    const [rowsResult, countResult] = await Promise.all([
      pool.query(selectSQL, params),
      pool.query(countSQL, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    const resources = rowsResult.rows.map((row) => {
      const schedule = parseSchedule(row.shifts);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { shifts: _shifts, ...rest } = row;
      return { ...rest, schedule };
    });

    return NextResponse.json({
      resources,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { resources: [], total: 0, page: 1, totalPages: 0 },
      { status: 500 }
    );
  }
}
