import { NextResponse } from "next/server";
import { getMapData } from "@/lib/services/map";

export async function GET() {
  try {
    const data = await getMapData();

    return NextResponse.json({
      pantries: data.pantries,
      censusStats: data.censusStats,
    });
  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data", pantries: [], censusStats: [] },
      { status: 500 }
    );
  }
}
