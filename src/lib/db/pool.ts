import { Pool } from "pg";

// Use DIRECT_URL (direct Supabase connection, bypasses pgbouncer).
// Falls back to DIRECT_DATABASE_URL for local dev compatibility.
const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DIRECT_DATABASE_URL,
});

export default pool;
