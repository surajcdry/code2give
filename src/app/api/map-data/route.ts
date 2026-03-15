// src/app/api/map-data/route.ts

import { NextResponse } from "next/server";
import { getMapData, getResourceDetails } from "@/lib/services/map";

function parseNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Single resource detail lookup
    const resourceId = searchParams.get("id");
    if (resourceId) {
      const pantry = await getResourceDetails(resourceId);
      return NextResponse.json({ pantry });
    }

    // Bounds-based marker fetch
    const north = parseNumber(searchParams.get("north"));
    const south = parseNumber(searchParams.get("south"));
    const east  = parseNumber(searchParams.get("east"));
    const west  = parseNumber(searchParams.get("west"));

    const bounds =
      north != null && south != null && east != null && west != null
        ? { north, south, east, west }
        : { north: 40.92, south: 40.49, east: -73.70, west: -74.26 }; // default NYC bounds

    const data = await getMapData("default", bounds);

    return NextResponse.json({
      pantries:      data.pantries,
      listResources: data.listResources,
      totalPantries: data.totalPantries,
      censusStats:   data.censusStats,
    });
  } catch (error) {
    console.error("Error fetching map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data", pantries: [], totalPantries: 0, censusStats: [] },
      { status: 500 }
    );
  }
}