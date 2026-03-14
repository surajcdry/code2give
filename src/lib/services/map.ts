import pool from "@/lib/db/pool";

export async function getMapData() {
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
      AND latitude BETWEEN 40.4 AND 40.95
      AND longitude BETWEEN -74.3 AND -73.7
    ORDER BY priority DESC NULLS LAST, "subscriberCount" DESC
    LIMIT 500
  `);

  const [censusResult, countResult] = await Promise.all([
    pool.query('SELECT * FROM "CensusData"'),
    pool.query(`
      SELECT COUNT(*) FROM "Resource"
      WHERE latitude BETWEEN 40.4 AND 40.95
        AND longitude BETWEEN -74.3 AND -73.7
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
