import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sentiment = url.searchParams.get("sentiment");
    const tag = url.searchParams.get("tag");
    const limitParam = url.searchParams.get("limit");

    const limit = Math.min(Math.max(Number(limitParam ?? "20"), 1), 100);

    const conditions: string[] = [];
    const values: Array<string | number> = [];
    let idx = 1;

    if (sentiment) {
      conditions.push(`sentiment = $${idx++}`);
      values.push(sentiment);
    }

    if (tag) {
      // Only include feedback rows where the tag exists in the tags array.
      conditions.push(`tags @> ARRAY[$${idx++}]::text[]`);
      values.push(tag);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM \"Feedback\" ${whereClause} ORDER BY \"createdAt\" DESC LIMIT $${idx}`;
    values.push(limit);

    const result = await pool.query(sql, values);

    return NextResponse.json({ feedback: result.rows });
  } catch (error) {
    console.error("Error fetching filtered feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback", feedback: [] },
      { status: 500 }
    );
  }
}
