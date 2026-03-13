import { Pool } from "pg";

// Use DATABASE_URL for the raw pg driver.
// This matches what Prisma uses for schema operations.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
