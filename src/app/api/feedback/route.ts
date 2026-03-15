import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sentiment = url.searchParams.get("sentiment");
    const tag = url.searchParams.get("tag");
    const limitParam = url.searchParams.get("limit");
    const sortParam = url.searchParams.get("sort");
    const dirParam = url.searchParams.get("dir");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const limit = Math.min(Math.max(Number(limitParam ?? "20"), 1), 100);

    const allowedSortFields = new Set(["createdAt", "sentiment"]);
    const sortField = allowedSortFields.has(sortParam ?? "") ? sortParam! : "createdAt";

    const sortDir = dirParam?.toLowerCase() === "asc" ? "ASC" : "DESC";

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

    if (fromParam) {
      const fromDate = new Date(fromParam);
      if (!Number.isNaN(fromDate.getTime())) {
        conditions.push(`\"createdAt\" >= $${idx++}`);
        values.push(fromDate.toISOString());
      }
    }

    if (toParam) {
      const toDate = new Date(toParam);
      if (!Number.isNaN(toDate.getTime())) {
        conditions.push(`\"createdAt\" <= $${idx++}`);
        values.push(toDate.toISOString());
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT id, text, sentiment, tags, "createdAt" FROM "Feedback" ${whereClause} ORDER BY "${sortField}" ${sortDir} LIMIT $${idx}`;
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
