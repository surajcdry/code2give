// src/lib/services/map.ts

import pool from "@/lib/db/pool";

const API_BASE = "https://platform.foodhelpline.org";

// ---- Types ----------------------------------------------------------------

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type MarkerFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: string; resourceTypeId: string };
};

type MarkerCollection = {
  type: "FeatureCollection";
  features: MarkerFeature[];
};

type LemontreeResource = {
  id: string;
  name: string | null;
  description: string | null;
  addressStreet1: string | null;
  addressStreet2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  images?: { url: string }[];
  occurrences?: { startTime: string; endTime: string; skippedAt: string | null }[];
  contacts?: { phone?: string }[];
  resourceType?: { id: string; name: string };
  ratingAverage?: number | null;
  _count?: { reviews?: number; resourceSubscriptions?: number };
  acceptingNewClients?: boolean | null;
  waitTimeMinutesAverage?: number | null;
};

// ---- Helpers ---------------------------------------------------------------

function buildAddress(r: LemontreeResource): string {
  const parts = [r.addressStreet1, r.addressStreet2, r.city, r.state, r.zipCode]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Address unavailable";
}

function getHoursLabel(r: LemontreeResource): string {
  const next = (r.occurrences ?? []).find((o) => !o.skippedAt);
  if (!next) return "Schedule unavailable";
  const start = new Date(next.startTime);
  const end = new Date(next.endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Schedule unavailable";
  return `Next: ${start.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })} · ${start.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  })}–${end.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  })}`;
}

function computeBadge(ratingAverage: number | null | undefined): {
  badge: "Excellent" | "Good" | "At Risk" | null;
  badgeColor: "green" | "yellow" | "red" | null;
} {
  if (ratingAverage == null) return { badge: null, badgeColor: null };
  if (ratingAverage >= 3.0)  return { badge: "Excellent", badgeColor: "green" };
  if (ratingAverage >= 2.0)  return { badge: "Good",      badgeColor: "yellow" };
  return                            { badge: "At Risk",   badgeColor: "red" };
}

function resourceToPantry(r: LemontreeResource) {
  const { badge, badgeColor } = computeBadge(r.ratingAverage);
  return {
    id:                    r.id,
    resourceTypeId:        r.resourceType?.id ?? "",
    latitude:              r.latitude ?? 0,
    longitude:             r.longitude ?? 0,
    name:                  r.name?.trim() || "",
    location:              buildAddress(r),
    hours:                 getHoursLabel(r),
    description:           r.description?.trim() || "",
    website:               r.website ?? null,
    phone:                 r.contacts?.[0]?.phone ?? null,
    ratingAverage:         r.ratingAverage ?? null,
    reviewCount:           r._count?.reviews ?? null,
    subscriberCount:       r._count?.resourceSubscriptions ?? null,
    waitTimeMinutesAverage: r.waitTimeMinutesAverage ?? null,
    acceptingNewClients:   r.acceptingNewClients ?? null,
    imageUrl:              r.images?.[0]?.url ?? null,
    badge,
    badgeColor,
    isPublished:           true,
  };
}

// ---- Exports ---------------------------------------------------------------

export async function getMapData(_filter = "default", bounds?: MapBounds | null) {
  if (!bounds) {
    return { pantries: [], totalPantries: 0, censusStats: [] };
  }

  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;

  // Run both calls in parallel — markers for pins, resources for the list
  const [markersRes, resourcesRes] = await Promise.all([
    fetch(
      `${API_BASE}/api/resources/markersWithinBounds?corner=${bounds.west},${bounds.south}&corner=${bounds.east},${bounds.north}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    ),
    fetch(
      `${API_BASE}/api/resources?lat=${centerLat}&lng=${centerLng}&take=100`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    ),
  ]);

  if (!markersRes.ok) throw new Error(`markersWithinBounds failed: ${markersRes.status}`);

  const collection = (await markersRes.json()) as MarkerCollection;

  // Build a full-detail lookup map from the resources call
  const detailMap = new Map<string, ReturnType<typeof resourceToPantry>>();
  if (resourcesRes.ok) {
    const raw = await resourcesRes.json();
    // The /api/resources endpoint returns superjson: { json: { resources: [...] } }
    const resources: LemontreeResource[] = raw?.json?.resources ?? raw?.resources ?? [];
    console.log(`[map] resources fetched: ${resources.length}, first name: ${resources[0]?.name}`);
    for (const r of resources) {
      detailMap.set(r.id, resourceToPantry(r));
    }
  }

  const features = Array.isArray(collection?.features) ? collection.features : [];

  // Map pins — all markers from bounds (lightweight, up to 1000)
  const markers = features
    .filter(f =>
      f?.geometry?.type === "Point" &&
      Array.isArray(f.geometry.coordinates) &&
      f.geometry.coordinates.length === 2 &&
      typeof f.properties?.id === "string"
    )
    .map(f => {
      const detail = detailMap.get(f.properties.id);
      if (detail) return detail;
      const { badge, badgeColor } = computeBadge(null);
      return {
        id: f.properties.id,
        resourceTypeId: f.properties.resourceTypeId,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        name: "", location: "", hours: "", description: "",
        website: null, phone: null, ratingAverage: null,
        reviewCount: null, subscriberCount: null,
        waitTimeMinutesAverage: null, acceptingNewClients: null,
        badge, badgeColor, isPublished: true,
      };
    });

  // Enrich with GNN archetype data from our Supabase DB
  const ids = markers.map(m => m.id);
  const archetypeMap = new Map<string, { archetypeId: number; archetypeName: string }>();
  if (ids.length > 0) {
    try {
      const { rows } = await pool.query<{ id: string; archetypeId: number; archetypeName: string }>(
        `SELECT id, "archetypeId", "archetypeName" FROM "Resource"
         WHERE id = ANY($1) AND "archetypeId" IS NOT NULL`,
        [ids],
      );
      for (const row of rows) archetypeMap.set(row.id, { archetypeId: row.archetypeId, archetypeName: row.archetypeName });
    } catch (e) {
      console.warn("[map] archetype fetch failed:", e);
    }
  }

  // List — use the full detail resources (top 100 nearest, all have names), enriched with archetype
  const listResources = Array.from(detailMap.values()).map(r => {
    const archetype = archetypeMap.get(r.id);
    return archetype ? { ...r, ...archetype } : r;
  });

  // Merge: for markers that have detail, use enriched data; rest are pin-only
  const pantries = markers.map(m => {
    const detail = detailMap.get(m.id);
    const archetype = archetypeMap.get(m.id);
    const base = detail ?? m;
    return archetype ? { ...base, ...archetype } : base;
  });

  return { pantries, listResources, totalPantries: pantries.length, censusStats: [] };
}

export async function getResourceDetails(resourceId: string) {
  const response = await fetch(
    `${API_BASE}/api/resources/${encodeURIComponent(resourceId)}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );

  if (!response.ok) throw new Error(`Resource detail fetch failed: ${response.status}`);

  const raw = await response.json() as { json: LemontreeResource };
  const r = raw.json;
  const { badge, badgeColor } = computeBadge(r.ratingAverage);

  return {
    id:               r.id,
    name:             r.name?.trim() || "Unnamed resource",
    description:      r.description?.trim() || "Food resource available in this area.",
    location:         buildAddress(r),
    hours:            getHoursLabel(r),
    resourceTypeLabel: r.resourceType?.name || "Food resource",
    website:          r.website ?? null,
    phone:            r.contacts?.[0]?.phone ?? null,
    imageUrl:         r.images?.[0]?.url ?? null,
    ratingAverage:    r.ratingAverage ?? null,
    reviewCount:      r._count?.reviews ?? 0,
    badge,
    badgeColor,
  };
}