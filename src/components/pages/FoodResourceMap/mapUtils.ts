import { TYPE_LABELS, MARKER_COLORS, ARCHETYPE_COLORS } from "./constants";
import type { Pantry } from "./types";

export function povertyDotColor(w: number): string {
  if (w >= 0.4)  return "#7B1FA2";
  if (w >= 0.25) return "#AB47BC";
  if (w >= 0.1)  return "#CE93D8";
  return "#E8D5F0";
}

export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveHours(hours?: string) {
  if (!hours || Object.values(TYPE_LABELS).includes(hours)) return "Hours not listed";
  return hours;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMarkerIcon(
  badge?: string,
  rating?: number | null,
  selected = false,
  archetypeName?: string | null,
  showArchetypes = false,
): any {
  let color: string;
  if (showArchetypes && archetypeName) {
    color = ARCHETYPE_COLORS[archetypeName] ?? "#42A5F5";
  } else {
    const effectiveBadge = rating != null
      ? rating >= 2.5 ? "Excellent" : rating >= 1.5 ? "Good" : "At Risk"
      : badge;
    color = MARKER_COLORS[effectiveBadge ?? ""] ?? "#42A5F5";
  }
  return {
    path: "M 0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0",
    fillColor: color, fillOpacity: 0.9,
    strokeColor: selected ? "#1e293b" : "#ffffff",
    strokeWeight: selected ? 3 : 2,
    scale: selected ? 1.5 : 1,
  };
}

export function gapFillColor(pct: number): string {
  if (pct >= 80) return "#B71C1C";
  if (pct >= 50) return "#EF5350";
  if (pct >= 20) return "#FFB74D";
  return "#C8E6C9";
}

export function getZipFromFeature(feature: google.maps.Data.Feature): string {
  return String(
    feature.getProperty("ZCTA5CE10") ?? feature.getProperty("zcta5ce10") ??
    feature.getProperty("ZIPCODE")   ?? feature.getProperty("postalCode") ??
    feature.getProperty("zipcode")   ?? feature.getProperty("zip") ?? ""
  ).trim();
}

export function ratingColor(r: number) {
  if (r >= 2.5) return "text-green-600";
  if (r >= 2.0) return "text-yellow-600";
  return "text-red-600";
}

export function waitColor(m: number) {
  if (m <= 15) return "text-green-600";
  if (m <= 30) return "text-yellow-600";
  return "text-red-600";
}

export function waitLabel(m: number) {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60), rem = Math.round(m % 60);
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function exportToCSV(rows: Pantry[], filename: string) {
  const headers = ["Name", "Address", "Type", "Hours", "Badge", "Score", "Published"];
  const lines = rows.map(p =>
    [p.name, p.location, TYPE_LABELS[p.resourceTypeId ?? ""] ?? "",
      resolveHours(p.hours), p.badge ?? "", p.reliabilityScore ?? "",
      p.isPublished !== false ? "Yes" : "No"]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}
