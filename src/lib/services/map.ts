import pool from "@/lib/db/pool";

export async function getMapData() {
  const pantryResult = await pool.query('SELECT * FROM "Pantry"');
  const censusResult = await pool.query('SELECT * FROM "CensusData"');

  return {
    pantries: pantryResult.rows,
    censusStats: censusResult.rows,
  };
}
