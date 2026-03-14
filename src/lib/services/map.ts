import pool from "@/lib/db/pool";

const DAY_CODES = new Set(["MO","TU","WE","TH","FR","SA","SU"]);

function computeReliability(ratingAverage: number | null, shifts: unknown): {
  reliabilityScore: number;
  badge: "Excellent" | "Good" | "At Risk";
  badgeColor: "green" | "yellow" | "red";
} {
  // feedbackScore: normalize rating to 0-100, null = 50
  const feedbackScore = ratingAverage != null
    ? Math.min((ratingAverage / 3.5) * 100, 100)
    : 50;

  // consistencyScore: count unique days from BYDAY in shifts RRULE
  let uniqueDays = 0;
  if (Array.isArray(shifts) && shifts.length > 0) {
    const days = new Set<string>();
    for (const shift of shifts) {
      const pattern = (shift as Record<string, unknown>)?.recurrencePattern;
      if (typeof pattern === "string") {
        const m = pattern.match(/BYDAY=([^;\n]+)/);
        if (m) {
          m[1].split(",").forEach(code => {
            const trimmed = code.trim().replace(/[^A-Z]/g, "");
            if (DAY_CODES.has(trimmed)) days.add(trimmed);
          });
        }
      }
    }
    uniqueDays = days.size;
  }
  const consistencyScore = (uniqueDays / 7) * 100;

  const reliabilityScore = Math.round((feedbackScore * 0.6 + consistencyScore * 0.4) * 10) / 10;

  let badge: "Excellent" | "Good" | "At Risk";
  let badgeColor: "green" | "yellow" | "red";
  if (reliabilityScore >= 75) { badge = "Excellent"; badgeColor = "green"; }
  else if (reliabilityScore >= 50) { badge = "Good"; badgeColor = "yellow"; }
  else { badge = "At Risk"; badgeColor = "red"; }

  return { reliabilityScore, badge, badgeColor };
}

const ORDER_BY: Record<string, string> = {
  top_rated:       '"ratingAverage" DESC NULLS LAST, "subscriberCount" DESC',
  needs_attention: '"ratingAverage" ASC NULLS LAST, "waitTimeMinutesAverage" DESC NULLS LAST',
  most_subscribed: '"subscriberCount" DESC NULLS LAST',
  most_reviewed:   '"reviewCount" DESC NULLS LAST',
  default:         'priority DESC NULLS LAST, "subscriberCount" DESC',
};

export async function getMapData(filter = "default") {
  const orderBy = ORDER_BY[filter] ?? ORDER_BY.default;

  // Query real Lemontree resource data — food pantries and soup kitchens with valid coordinates
  const pantryResult = await pool.query(`
    SELECT
      id,
      name,
      COALESCE(
        NULLIF(
          TRIM(CONCAT_WS(', ',
            NULLIF(TRIM("addressStreet1"), ''),
            NULLIF(TRIM(city), ''),
            NULLIF(TRIM(state), '')
          )), ''
        ),
        'New York, NY'
      ) AS location,
      latitude,
      longitude,
      "resourceTypeName" AS hours,
      COALESCE(NULLIF(TRIM(description), ''), 'Food resource available in this area.') AS description,
      "resourceTypeId",
      "ratingAverage",
      "waitTimeMinutesAverage",
      "reviewCount",
      "acceptingNewClients",
      "resourceStatusId",
      shifts
    FROM "Resource"
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND "resourceStatusId" = 'PUBLISHED'
      AND "resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
      AND state IN ('NY', 'New York', 'Ny')
    ORDER BY ${orderBy}
    LIMIT 500
  `);

  const [censusResult, countResult] = await Promise.all([
    pool.query('SELECT * FROM "CensusData"'),
    pool.query(`
      SELECT COUNT(*) FROM "Resource"
      WHERE state IN ('NY', 'New York', 'Ny')
        AND "resourceStatusId" = 'PUBLISHED'
        AND "resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
    `),
  ]);

  const pantries = pantryResult.rows.map(row => {
    const { reliabilityScore, badge, badgeColor } = computeReliability(row.ratingAverage, row.shifts);
    const { shifts: _s, ...rest } = row;
    return { ...rest, reliabilityScore, badge, badgeColor };
  });

  return {
    pantries,
    totalPantries: parseInt(countResult.rows[0].count, 10),
    censusStats: censusResult.rows,
  };
}
