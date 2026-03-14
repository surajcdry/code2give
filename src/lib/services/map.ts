import pool from "@/lib/db/pool";

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
      "resourceStatusId"
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

  return {
    pantries: pantryResult.rows,
    totalPantries: parseInt(countResult.rows[0].count, 10),
    censusStats: censusResult.rows,
  };
}
