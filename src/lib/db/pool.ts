import { Pool } from "pg";

// Use DIRECT_DATABASE_URL for the raw pg driver.
// This matches what Prisma uses for schema operations.
const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL,
});

export default pool;
