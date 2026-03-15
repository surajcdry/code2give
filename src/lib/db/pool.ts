import { Pool } from "pg";

// Use DATABASE_URL (Transaction mode pgbouncer, port 6543).
// Transaction mode is required for serverless — it releases connections
// back to pgbouncer after each query instead of holding them open.
// DIRECT_URL (port 5432, Session mode) is reserved for Prisma migrations only.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,                  // 1 connection per lambda instance
  idleTimeoutMillis: 10000, // release idle connections quickly
  connectionTimeoutMillis: 10000,
});

export default pool;
