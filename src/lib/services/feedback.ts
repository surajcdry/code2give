import pool from "@/lib/db/pool";

export async function saveFeedback(text: string, sentiment: string, tags: string[]) {
  const id = Math.random().toString(36).substring(2, 9);
  const tagsArrayStr = `{${tags.join(",")}}`;
  await pool.query(
    'INSERT INTO "Feedback" (id, text, sentiment, tags, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
    [id, text, sentiment, tagsArrayStr]
  );
  return { id, text, sentiment, tags, createdAt: new Date().toISOString() };
}

export async function getRecentFeedback() {
  const result = await pool.query(
    'SELECT id, text, sentiment, tags, "createdAt" FROM "Feedback" ORDER BY "createdAt" DESC LIMIT 20'
  );
  return result.rows;
}
