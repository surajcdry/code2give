"use client";
// src/components/pages/FoodResourceMapPage.tsx

import {
  MapPin, Clock, Search, X, ExternalLink, Phone,
  Navigation, Download, Timer, Filter, LocateFixed, AlertCircle, Star,
  Layers,
} from "lucide-react";
import { GoogleMap, Marker, Circle, InfoWindow } from "@react-google-maps/api";
import { Button } from "@/components/ui/Button";
import { useEffect, useState, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Pantry = {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  hours: string;
  description?: string;
  resourceTypeId?: string;
  reliabilityScore?: number;
  badge?: string;
  phone?: string;
  website?: string;
  notes?: string;
  waitTime?: string;
  waitTimeMinutesAverage?: number | null;
  isOpenNow?: boolean;
  isPublished?: boolean;
  culturalTags?: string[];
  languages?: string[];
  ratingAverage?: number | null;
  reviewCount?: number | null;
  subscriberCount?: number | null;
  acceptingNewClients?: boolean | null;
  appointmentRequired?: boolean | null;
  city?: string | null;
  zipCode?: string | null;
};

type ZipStat = { total: number; published: number; unavailable: number; pctUnavailable: number };

// ── Constants ─────────────────────────────────────────────────────────────────
// Start in NYC so markers are visible immediately on load
const DEFAULT_CENTER  = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM    = 13;
// Don't fetch when zoomed out further than this — bounding box too large for API
const MIN_FETCH_ZOOM  = 13; // Only fetch markers at neighborhood level or closer
const MIN_MAP_ZOOM    = 4;  // Allow zooming out to national view to navigate
const MAX_MARKERS     = 300; // Cap rendered pins to keep the map responsive

const MILES_TO_METERS = 1609.34;
const RADIUS_OPTIONS  = [0.5, 1, 2, 5, 10];

const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY:      "Food Pantry",
  SOUP_KITCHEN:     "Soup Kitchen",
  COMMUNITY_FRIDGE: "Community Fridge",
};

const FOOD_TAGS = [
  "Halal", "Kosher", "Caribbean", "Chinese", "South Asian",
  "Latin American", "West African", "Korean", "Vegan/Vegetarian", "Fresh Produce",
];

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Excellent: { bg: "bg-green-50",  text: "text-green-700"  },
  Good:      { bg: "bg-yellow-50", text: "text-yellow-700" },
  "At Risk": { bg: "bg-red-50",    text: "text-red-700"    },
};

const MARKER_COLORS: Record<string, string> = {
  Excellent: "#2E7D32",
  Good:      "#F9A825",
  "At Risk": "#E53935",
};

type SortOption = "default" | "distance" | "rating" | "open_now";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default",  label: "Default"        },
  { value: "distance", label: "Nearest first"  },
  { value: "rating",   label: "Highest rated"  },
  { value: "open_now", label: "Open now first" },
];

const GAP_COLORS = [
  { label: "Critical ≥80%",    color: "#B71C1C", min: 80 },
  { label: "High 50–79%",      color: "#EF5350", min: 50 },
  { label: "Moderate 20–49%",  color: "#FFB74D", min: 20 },
  { label: "Good <20%",        color: "#C8E6C9", min: 0  },
];

const POVERTY_COLORS = [
  { label: "High ≥40%",        color: "#7B1FA2" },
  { label: "Mod-high 25–39%",  color: "#BA68C8" },
  { label: "Moderate 10–24%",  color: "#E1BEE7" },
  { label: "Low <10%",         color: "#F3E5F5" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function povertyDotColor(w: number): string {
  if (w >= 0.4)  return "#7B1FA2";
  if (w >= 0.25) return "#AB47BC";
  if (w >= 0.1)  return "#CE93D8";
  return "#E8D5F0";
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveHours(hours?: string) {
  if (!hours || Object.values(TYPE_LABELS).includes(hours)) return "Hours not listed";
  return hours;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkerIcon(badge?: string, rating?: number | null, selected = false): any {
  const effectiveBadge = rating != null
    ? rating >= 2.5 ? "Excellent" : rating >= 1.5 ? "Good" : "At Risk"
    : badge;
  const color = MARKER_COLORS[effectiveBadge ?? ""] ?? "#42A5F5";
  return {
    path: "M 0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0",
    fillColor: color, fillOpacity: 0.9,
    strokeColor: selected ? "#1e293b" : "#ffffff",
    strokeWeight: selected ? 3 : 2,
    scale: selected ? 1.5 : 1,
  };
}

function gapFillColor(pct: number): string {
  if (pct >= 80) return "#B71C1C";
  if (pct >= 50) return "#EF5350";
  if (pct >= 20) return "#FFB74D";
  return "#C8E6C9";
}

function getZipFromFeature(feature: google.maps.Data.Feature): string {
  return String(
    feature.getProperty("ZCTA5CE10") ?? feature.getProperty("zcta5ce10") ??
    feature.getProperty("ZIPCODE")   ?? feature.getProperty("postalCode") ??
    feature.getProperty("zipcode")   ?? feature.getProperty("zip") ?? ""
  ).trim();
}

function ratingColor(r: number) {
  if (r >= 2.5) return "text-green-600";
  if (r >= 2.0) return "text-yellow-600";
  return "text-red-600";
}

function waitColor(m: number) {
  if (m <= 15) return "text-green-600";
  if (m <= 30) return "text-yellow-600";
  return "text-red-600";
}

function waitLabel(m: number) {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60), rem = Math.round(m % 60);
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function exportToCSV(rows: Pantry[], filename: string) {
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

// ── Filter Chip ───────────────────────────────────────────────────────────────
function Chip({ label, onRemove, color }: { label: string; onRemove: () => void; color?: "green" | "orange" }) {
  const cls = color === "green"  ? "bg-green-50 text-green-700 border-green-200"
            : color === "orange" ? "bg-orange-50 text-orange-700 border-orange-200"
            :                      "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
      <button onClick={e => { e.stopPropagation(); onRemove(); }} className="hover:opacity-60">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ── Selected Pantry Detail Card ───────────────────────────────────────────────
function PantryDetailCard({ pantry, onClose }: { pantry: Pantry; onClose: () => void }) {
  const mapsUrl   = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pantry.location)}`;
  const bs        = pantry.badge ? BADGE_STYLES[pantry.badge] : null;
  const typeLabel = TYPE_LABELS[pantry.resourceTypeId ?? ""] ?? "Food Resource";

  return (
    <div className="rounded-xl border-2 border-primary bg-white shadow-lg overflow-hidden">
      <div className="bg-primary/10 px-4 py-3 flex items-start justify-between gap-2 border-b border-primary/20">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">{typeLabel}</p>
          <h3 className="font-bold text-gray-900 text-sm leading-snug">{pantry.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pantry.isOpenNow !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pantry.isOpenNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {pantry.isOpenNow ? "● Open" : "Closed"}
            </span>
          )}
          <button onClick={onClose} className="p-1 rounded-md hover:bg-primary/10 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 text-sm">
        {(pantry.ratingAverage != null || pantry.waitTimeMinutesAverage != null) && (
          <div className="grid grid-cols-2 gap-2">
            {pantry.ratingAverage != null && (
              <div className={`flex flex-col items-center justify-center py-2.5 rounded-lg border border-transparent ${bs ? bs.bg : "bg-gray-50"}`}>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i}
                      className={`w-3 h-3 ${pantry.ratingAverage! >= i ? (bs ? bs.text : "text-yellow-500") : "text-gray-300"}`}
                      fill={pantry.ratingAverage! >= i ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className={`text-sm font-bold ${bs ? bs.text : ratingColor(pantry.ratingAverage)}`}>
                  {pantry.ratingAverage.toFixed(1)}
                  <span className="text-[10px] font-normal opacity-60">/5</span>
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {pantry.reviewCount != null ? `${pantry.reviewCount.toLocaleString()} reviews` : "Rating"}
                </span>
              </div>
            )}
            {pantry.waitTimeMinutesAverage != null && (
              <div className="flex flex-col items-center justify-center py-2.5 rounded-lg bg-blue-50 border border-transparent">
                <Timer className={`w-3.5 h-3.5 mb-0.5 ${waitColor(pantry.waitTimeMinutesAverage)}`} />
                <span className={`text-sm font-bold ${waitColor(pantry.waitTimeMinutesAverage)}`}>
                  {waitLabel(pantry.waitTimeMinutesAverage)}
                </span>
                <span className="text-[10px] text-blue-400 uppercase tracking-wide">Avg Wait</span>
              </div>
            )}
          </div>
        )}

        {(pantry.subscriberCount != null || pantry.acceptingNewClients != null || pantry.appointmentRequired != null) && (
          <div className="flex flex-wrap gap-1.5">
            {pantry.subscriberCount != null && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                👥 {pantry.subscriberCount.toLocaleString()} subscribers
              </span>
            )}
            {pantry.acceptingNewClients === true && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                ✓ Accepting clients
              </span>
            )}
            {pantry.acceptingNewClients === false && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                ✗ Not accepting
              </span>
            )}
            {pantry.appointmentRequired === true && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 font-medium">
                📅 Appointment needed
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2.5">
          <Layers className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Resource Type</p>
            <p className="text-gray-800 text-xs">{typeLabel}</p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
            <p className="text-gray-800 text-xs leading-snug">{pantry.location}</p>
            {(pantry.city || pantry.zipCode) && (
              <p className="text-gray-400 text-xs mt-0.5">{[pantry.city, pantry.zipCode].filter(Boolean).join(", ")}</p>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              Open in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex gap-2.5">
          <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Hours</p>
            <p className="text-gray-800 text-xs whitespace-pre-line">{resolveHours(pantry.hours)}</p>
          </div>
        </div>

        {pantry.phone && (
          <div className="flex gap-2.5">
            <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
              <a href={`tel:${pantry.phone}`} className="text-xs text-blue-600 hover:underline">{pantry.phone}</a>
            </div>
          </div>
        )}

        {pantry.website && (
          <div className="flex gap-2.5">
            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Website</p>
              <a href={pantry.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline break-all">
                {pantry.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
        )}

        {pantry.description && (
          <div className="flex gap-2.5">
            <Navigation className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">About</p>
              <p className="text-gray-600 text-xs leading-relaxed">{pantry.description}</p>
            </div>
          </div>
        )}

        {((pantry.culturalTags?.length ?? 0) > 0 || (pantry.languages?.length ?? 0) > 0) && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1">
              {pantry.culturalTags?.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-medium">{t}</span>
              ))}
              {pantry.languages?.map(l => (
                <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">{l}</span>
              ))}
            </div>
          </div>
        )}

        {pantry.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-[11px] font-bold text-amber-700 mb-0.5">Note</p>
            <p className="text-xs text-amber-800 leading-relaxed">{pantry.notes}</p>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
          <span className={`w-1.5 h-1.5 rounded-full ${pantry.isPublished !== false ? "bg-green-500" : "bg-gray-300"}`} />
          <span className="text-[11px] text-gray-400">
            {pantry.isPublished !== false ? "Published & active" : "Unpublished"}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="default" size="sm" className="w-full gap-1.5 h-8">
            <MapPin className="w-3.5 h-3.5" /> Get Directions
          </Button>
        </a>
      </div>
    </div>
  );
}

// ── Pantry Card ───────────────────────────────────────────────────────────────
function PantryCard({ pantry, selected, distance, onSelect }: {
  pantry: Pantry; selected: boolean; distance: number | null; onSelect: () => void;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pantry.location)}`;
  const bs      = pantry.badge ? BADGE_STYLES[pantry.badge] : null;

  return (
    <div onClick={onSelect}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md
        ${selected ? "border-primary bg-primary/5 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm leading-snug truncate">
            {pantry.name || TYPE_LABELS[pantry.resourceTypeId ?? ""] || "Food Resource"}
          </h4>
          {pantry.resourceTypeId && (
            <p className="text-[11px] text-gray-400 mt-0.5">{TYPE_LABELS[pantry.resourceTypeId] ?? pantry.resourceTypeId}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {pantry.isOpenNow !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pantry.isOpenNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {pantry.isOpenNow ? "● Open" : "Closed"}
            </span>
          )}
          {bs && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bs.bg} ${bs.text}`}>{pantry.badge}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-2.5">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {pantry.location || "Click to load address"}
        </span>
        {distance !== null && (
          <span className="flex items-center gap-1 text-indigo-600 font-medium shrink-0">
            <Navigation className="w-3 h-3" />{distance.toFixed(1)} mi
          </span>
        )}
        {pantry.waitTimeMinutesAverage != null && (
          <span className={`flex items-center gap-1 shrink-0 font-medium ${waitColor(pantry.waitTimeMinutesAverage)}`}>
            <Timer className="w-3 h-3" />{waitLabel(pantry.waitTimeMinutesAverage)}
          </span>
        )}
        {pantry.ratingAverage != null && (
          <span className={`flex items-center gap-1 shrink-0 font-medium ${ratingColor(pantry.ratingAverage)}`}>
            ⭐ {pantry.ratingAverage.toFixed(1)}
          </span>
        )}
      </div>

      {((pantry.culturalTags?.length ?? 0) > 0 || (pantry.languages?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {pantry.culturalTags?.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-medium">{t}</span>
          ))}
          {pantry.languages?.map(l => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">{l}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          <Button variant="default" size="sm" className="h-7 text-xs gap-1">
            <MapPin className="w-3 h-3" /> Get Directions
          </Button>
        </a>
        {pantry.phone && (
          <a href={`tel:${pantry.phone}`} onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-500">
              <Phone className="w-3 h-3" /> Call
            </Button>
          </a>
        )}
        <span className={`ml-auto text-[10px] font-medium ${pantry.isPublished !== false ? "text-green-600" : "text-gray-400"}`}>
          {pantry.isPublished !== false ? "✓ Published" : "Unpublished"}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function FoodResourceMapPage() {
  const [allPantries, setAllPantries]         = useState<Pantry[]>([]);
  const [listPantries, setListPantries]       = useState<Pantry[]>([]); // never clears — only updates on first load or click
  const [defaultPantries, setDefaultPantries] = useState<Pantry[]>([]);
  const [lastClicked, setLastClicked]         = useState<Pantry | null>(null);
  const [loading, setLoading]                 = useState(false);
  const listInitialized                       = useRef(false);
  const [selectedPantry, setSelectedPantry]   = useState<Pantry | null>(null);
  const [selectionSource, setSelectionSource] = useState<"map" | "list" | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Refs for bounds-based fetching
  const mapRef      = useRef<google.maps.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  const [showServiceGapLayer, setShowServiceGapLayer] = useState(false);
  const [zipStats, setZipStats]                       = useState<Record<string, ZipStat>>({});
  const [geoJson, setGeoJson]                         = useState<object | null>(null);
  const [geoJsonLoaded, setGeoJsonLoaded]             = useState(false);
  const [zipInfoWindow, setZipInfoWindow]             = useState<{ lat: number; lng: number; content: string; title: string } | null>(null);
  const dataListenerRef                               = useRef<google.maps.MapsEventListener | null>(null);

  const [showTractLayer, setShowTractLayer]             = useState(false);
  const [tractCentroids, setTractCentroids]             = useState<[number, number, number][]>([]);
  const [tractCentroidsLoaded, setTractCentroidsLoaded] = useState(false);

  const [legendFilter, setLegendFilter] = useState<Set<string>>(new Set(["Excellent", "Good", "At Risk"]));

  const toggleLegendFilter = (key: string) =>
    setLegendFilter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const [zipInput, setZipInput]         = useState("");
  const [zipError, setZipError]         = useState<string | null>(null);
  const [zipLoading, setZipLoading]     = useState(false);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [radiusMiles, setRadiusMiles]   = useState(2);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  const [showFilters, setShowFilters]   = useState(false);
  const [searchInput, setSearchInput]   = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeTag, setActiveTag]       = useState<string | null>(null);
  const [sortBy, setSortBy]             = useState<SortOption>("default");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [openNowOnly, setOpenNowOnly]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "unpublished">("all");

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) { setActiveTag(null); setSearchQuery(""); setSearchInput(""); }
    else { setActiveTag(tag); setSearchQuery(tag); setSearchInput(tag); }
  };

  const activeFilterCount = [!!searchQuery, typeFilter !== "all", openNowOnly, statusFilter !== "all"].filter(Boolean).length;

  // ── Bounds-based fetching ─────────────────────────────────────────────────

  const fetchForBounds = useCallback(async (searchQ: string) => {
    const map = mapRef.current;
    if (!map) return;

    const zoom = map.getZoom() ?? 0;
    // Only fetch at zoom 8+; below that the bounding box is too large for the API
    if (zoom < MIN_FETCH_ZOOM) {
      setAllPantries([]);
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        north: String(ne.lat()),
        south: String(sw.lat()),
        east:  String(ne.lng()),
        west:  String(sw.lng()),
      });
      if (searchQ) params.set("search", searchQ);

      const res = await fetch(`/api/map-data?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const d = await res.json();
      const incoming = d.pantries ?? [];
      const incomingList = d.listResources ?? incoming.filter((p: Pantry) => p.name);
      setAllPantries(incoming);
      if (!listInitialized.current && incomingList.length > 0) {
        listInitialized.current = true;
        setListPantries(incomingList);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Map fetch error:", err);
        setAllPantries([]);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, []);

  // Fires after every pan/zoom
  const onIdle = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchForBounds(searchQuery), 250);
  }, [fetchForBounds, searchQuery]);

  // Re-fetch when search query changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchForBounds(searchQuery), 250);
  }, [searchQuery, fetchForBounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Fetch default NYC pantries on mount — shown when zoomed out
  useEffect(() => {
    fetch("/api/map-data?north=40.92&south=40.49&east=-73.70&west=-74.26", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setDefaultPantries(d.pantries ?? []))
      .catch(() => {});
  }, []);

  // Zip stats on mount

  useEffect(() => {
    fetch("/api/zip-stats")
      .then(r => r.json())
      .then(d => setZipStats(d.zipStats ?? {}))
      .catch(() => {});
  }, []);

  // Lazy-load GeoJSON on first toggle
  useEffect(() => {
    if (!showServiceGapLayer || geoJsonLoaded) return;
    setGeoJsonLoaded(true);
    fetch("/nyc-zips.geojson")
      .then(r => { if (!r.ok) throw new Error(`/nyc-zips.geojson ${r.status}`); return r.json(); })
      .then(d => setGeoJson(d))
      .catch(err => console.error("[ZipStats] GeoJSON error:", err));
  }, [showServiceGapLayer, geoJsonLoaded]);

  // Apply / remove overlay layer
  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.data.forEach(f => mapInstance.data.remove(f));
    if (dataListenerRef.current) { google.maps.event.removeListener(dataListenerRef.current); dataListenerRef.current = null; }
    setZipInfoWindow(null);

    if (!showServiceGapLayer || !geoJson) { mapInstance.data.setStyle({}); return; }

    mapInstance.data.addGeoJson(geoJson as object);
    mapInstance.data.setStyle(feature => {
      const zip  = String(getZipFromFeature(feature)).trim();
      const stat = zip ? zipStats[String(zip)] : undefined;
      if (!stat) return { fillOpacity: 0 };
      return { fillColor: gapFillColor(stat.pctUnavailable), fillOpacity: 0.55, strokeColor: "#ffffff", strokeWeight: 1.5, strokeOpacity: 1, zIndex: 0 };
    });

    dataListenerRef.current = mapInstance.data.addListener("click", (e: google.maps.Data.MouseEvent) => {
      if (!e.latLng) return;
      const zip  = String(getZipFromFeature(e.feature)).trim();
      const stat = zip ? zipStats[String(zip)] : undefined;
      setZipInfoWindow({
        lat: e.latLng.lat(), lng: e.latLng.lng(),
        title: "Service Gap",
        content: stat ? `ZIP ${zip}: ${stat.pctUnavailable}% of resources are currently unavailable.` : `ZIP ${zip}: no service data available.`,
      });
    });
  }, [showServiceGapLayer, geoJson, mapInstance, zipStats]);

  // Lazy-load tract centroids on first toggle
  useEffect(() => {
    if (!showTractLayer || tractCentroidsLoaded) return;
    setTractCentroidsLoaded(true);
    fetch("/tract-centroids.json")
      .then(r => { if (!r.ok) throw new Error(`/tract-centroids.json ${r.status}`); return r.json(); })
      .then(d => setTractCentroids(d))
      .catch(err => console.error("[TractLayer] centroids error:", err));
  }, [showTractLayer, tractCentroidsLoaded]);

  // Canvas overlay for poverty index
  useEffect(() => {
    if (!mapInstance || !showTractLayer || tractCentroids.length === 0) return;

    class PovertyOverlay extends google.maps.OverlayView {
      private canvas = document.createElement("canvas");

      onAdd() {
        this.canvas.style.position = "absolute";
        this.canvas.style.pointerEvents = "none";
        this.getPanes()!.overlayLayer.appendChild(this.canvas);
      }

      draw() {
        const proj = this.getProjection();
        if (!proj) return;
        const map = this.getMap() as google.maps.Map;
        const w = map.getDiv().offsetWidth;
        const h = map.getDiv().offsetHeight;
        const center = map.getCenter()!;
        const centerPx = proj.fromLatLngToDivPixel(center)!;

        const zoom = map.getZoom() ?? 10;
        const r    = Math.max(2, Math.min(12, zoom - 7));
        const blur = Math.round(r * 1.5);
        const pad  = blur * 3;

        const totalW = w + pad * 2;
        const totalH = h + pad * 2;

        this.canvas.width  = totalW;
        this.canvas.height = totalH;
        this.canvas.style.left = `${centerPx.x - w / 2 - pad}px`;
        this.canvas.style.top  = `${centerPx.y - h / 2 - pad}px`;

        const originX = centerPx.x - w / 2 - pad;
        const originY = centerPx.y - h / 2 - pad;

        const ctx = this.canvas.getContext("2d")!;
        ctx.clearRect(0, 0, totalW, totalH);
        ctx.filter = `blur(${blur}px)`;

        const buckets: Record<string, [number, number][]> = {};
        for (const [lat, lng, weight] of tractCentroids) {
          const pt = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
          if (!pt) continue;
          const cx = pt.x - originX;
          const cy = pt.y - originY;
          if (cx < -r || cx > totalW + r || cy < -r || cy > totalH + r) continue;
          const color = povertyDotColor(weight);
          (buckets[color] ??= []).push([cx, cy]);
        }

        ctx.globalAlpha = Math.min(0.95, 0.5 + (zoom - 7) * 0.06);
        for (const [color, pts] of Object.entries(buckets)) {
          ctx.beginPath();
          for (const [cx, cy] of pts) {
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
          }
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      onRemove() { this.canvas.remove(); }
    }

    const overlay = new PovertyOverlay();
    overlay.setMap(mapInstance);
    return () => { overlay.setMap(null); };
  }, [mapInstance, showTractLayer, tractCentroids]);

  // ── Derived state ─────────────────────────────────────────────────────────

  // List never clears — shows initial load, updated only when marker clicked
  const displayPantries = listPantries.length > 0
    ? listPantries
    : lastClicked
      ? [lastClicked, ...defaultPantries.filter(p => p.id !== lastClicked.id)]
      : defaultPantries;

  const allChecked = legendFilter.has("Excellent") && legendFilter.has("Good") && legendFilter.has("At Risk");

  const filteredResources = displayPantries
    .filter(p => {
      const effBadge = p.ratingAverage != null
        ? p.ratingAverage >= 2.5 ? "Excellent" : p.ratingAverage >= 1.5 ? "Good" : "At Risk"
        : p.badge;
      if (searchCenter && distanceMiles(searchCenter.lat, searchCenter.lng, p.latitude, p.longitude) > radiusMiles) return false;
      if (openNowOnly && !p.isOpenNow) return false;
      if (typeFilter !== "all" && p.resourceTypeId !== typeFilter) return false;
      if (statusFilter === "published"   && p.isPublished === false) return false;
      if (statusFilter === "unpublished" && p.isPublished !== false) return false;
      if (!allChecked && legendFilter.size > 0 && effBadge && !legendFilter.has(effBadge)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "distance" && searchCenter)
        return distanceMiles(searchCenter.lat, searchCenter.lng, a.latitude, a.longitude)
             - distanceMiles(searchCenter.lat, searchCenter.lng, b.latitude, b.longitude);
      if (sortBy === "rating")   return (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0);
      if (sortBy === "open_now") return (b.isOpenNow ? 1 : 0) - (a.isOpenNow ? 1 : 0);
      return 0;
    });

  // Map pins — dynamic per-viewport, not limited to the sidebar 100
  const mapMarkers = allPantries.filter(p => {
    if (searchCenter && distanceMiles(searchCenter.lat, searchCenter.lng, p.latitude, p.longitude) > radiusMiles) return false;
    if (typeFilter !== "all" && p.resourceTypeId !== typeFilter) return false;
    if (statusFilter === "published"   && p.isPublished === false) return false;
    if (statusFilter === "unpublished" && p.isPublished !== false) return false;
    return true;
  }).slice(0, MAX_MARKERS);

  const searchedZipStat = zipInput.length === 5 ? zipStats[zipInput] : undefined;

  const zoomTo = (lat: number, lng: number, miles: number) => {
    setSearchCenter({ lat, lng }); setSelectedPantry(null);
    if (mapInstance) { mapInstance.panTo({ lat, lng }); mapInstance.setZoom(miles <= 1 ? 15 : miles <= 2 ? 14 : miles <= 5 ? 13 : 12); }
  };

  const handleZipSearch = async () => {
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) { setZipError("Enter a valid 5-digit ZIP."); return; }
    const known = zipStats[zip];
    if (!known) { setZipError("No pantry data found for that ZIP code."); return; }
    setZipError(null); setZipLoading(true);
    try {
      const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${zip}|country:US&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
      const data = await res.json();
      if (data.status !== "OK" || !data.results[0]) { setZipError("Could not locate that ZIP on the map."); return; }
      const { lat, lng } = data.results[0].geometry.location;
      zoomTo(lat, lng, radiusMiles);
    } catch { setZipError("Could not look up ZIP."); }
    finally { setZipLoading(false); }
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) { setZipError("Geolocation not supported."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { zoomTo(pos.coords.latitude, pos.coords.longitude, radiusMiles); setGpsLoading(false); },
      ()  => { setZipError("Could not get your location."); setGpsLoading(false); }
    );
  };

  const handleClearSearch = () => {
    setZipInput(""); setZipError(null); setSearchCenter(null);
    setSelectedPantry(null); setSelectionSource(null);
    if (mapInstance) { mapInstance.panTo(DEFAULT_CENTER); mapInstance.setZoom(DEFAULT_ZOOM); }
  };

  const clearAllFilters = () => {
    setTypeFilter("all"); setOpenNowOnly(false); setStatusFilter("all");
    setSearchQuery(""); setSearchInput(""); setActiveTag(null);
  };

  const resetAll = () => {
    clearAllFilters(); setShowServiceGapLayer(false); setShowTractLayer(false); setShowFilters(false);
    setSortBy("default"); setZipInfoWindow(null); handleClearSearch();
    setLegendFilter(new Set(["Excellent", "Good", "At Risk"]));
  };

  const handleCardSelect = (p: Pantry) => {
    if (selectedPantry?.id === p.id && selectionSource === "list") {
      setSelectedPantry(null); setSelectionSource(null);
    } else {
      setSelectedPantry(p); setSelectionSource("list");
      if (mapInstance) { mapInstance.panTo({ lat: p.latitude, lng: p.longitude }); mapInstance.setZoom(15); }
    }
  };

  const handleMarkerClick = async (p: Pantry) => {
    if (selectedPantry?.id === p.id && selectionSource === "map") {
      setSelectedPantry(null); setSelectionSource(null); return;
    }
    setSelectedPantry(p); setSelectionSource("map");
    setLastClicked(p);
    if (mapInstance) { mapInstance.panTo({ lat: p.latitude, lng: p.longitude }); mapInstance.setZoom(15); }
    requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
    try {
      const res = await fetch(`/api/map-data?id=${encodeURIComponent(p.id)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const detail = data.pantry;
      if (!detail) return;
      setSelectedPantry({
        ...p,
        name:          detail.name,
        location:      detail.location,
        hours:         detail.hours,
        description:   detail.description,
        phone:         detail.phone,
        website:       detail.website,
        ratingAverage: detail.ratingAverage,
        reviewCount:   detail.reviewCount,
        badge:         detail.badge,
      });
      // Bubble clicked pantry to top of list with full details
      setListPantries(prev => {
        const enriched = {
          ...p,
          name:          detail.name,
          location:      detail.location,
          hours:         detail.hours,
          description:   detail.description,
          phone:         detail.phone,
          website:       detail.website,
          ratingAverage: detail.ratingAverage,
          reviewCount:   detail.reviewCount,
          badge:         detail.badge,
        };
        return [enriched, ...prev.filter(x => x.id !== p.id)];
      });
    } catch (err) {
      console.error("Detail fetch error:", err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Food Resource Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${allPantries.length.toLocaleString()} resources in current view`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => exportToCSV(filteredResources, "food-resources.csv")} className="gap-1.5 text-gray-600">
          <Download className="w-4 h-4" /> Export ({filteredResources.length})
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-sm p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Navigation className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <input type="text" inputMode="numeric" maxLength={5} placeholder="ZIP code" value={zipInput}
              onChange={e => { setZipInput(e.target.value.replace(/\D/g, "")); setZipError(null); }}
              onKeyDown={e => e.key === "Enter" && handleZipSearch()}
              className="w-20 bg-transparent text-sm focus:outline-none placeholder:text-gray-400" />
          </div>

          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {RADIUS_OPTIONS.map(m => (
              <button key={m} onClick={() => setRadiusMiles(m)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${radiusMiles === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {m < 1 ? "½" : m}mi
              </button>
            ))}
          </div>

          <Button variant="default" size="sm" onClick={handleZipSearch} disabled={zipLoading} className="h-8 gap-1.5">
            <Search className="w-3.5 h-3.5" /> {zipLoading ? "…" : "Search"}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleNearMe} disabled={gpsLoading}
            className="h-8 gap-1.5 text-indigo-600 hover:text-indigo-700 border border-indigo-200">
            <LocateFixed className="w-3.5 h-3.5" /> {gpsLoading ? "Locating…" : "Near Me"}
          </Button>

          <button onClick={() => { setShowServiceGapLayer(v => !v); setShowTractLayer(false); }}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
              showServiceGapLayer ? "bg-[#FFD700] border-yellow-400 text-slate-900" : "bg-white border-gray-200 text-gray-600 hover:border-yellow-300"
            }`}>
            <span className={`w-3 h-3 rounded-sm inline-block border ${showServiceGapLayer ? "bg-red-500 border-red-600" : "bg-gray-200 border-gray-300"}`} />
            Service Gap Layer
          </button>

          <button onClick={() => { setShowTractLayer(v => !v); setShowServiceGapLayer(false); }}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
              showTractLayer ? "bg-purple-100 border-purple-400 text-purple-900" : "bg-white border-gray-200 text-gray-600 hover:border-purple-300"
            }`}>
            <span className={`w-3 h-3 rounded-sm inline-block border ${showTractLayer ? "bg-purple-600 border-purple-700" : "bg-gray-200 border-gray-300"}`} />
            Equity Gap Index
          </button>

          {searchCenter && (
            <button onClick={handleClearSearch} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" /> Clear search
            </button>
          )}

          <button onClick={resetAll}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
            <X className="w-3.5 h-3.5" /> Reset
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select onChange={e => { if (e.target.value) { handleTagClick(e.target.value); e.currentTarget.value = ""; } }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer max-w-[160px]">
              <option value="">{activeTag ? `✓ ${activeTag}` : "Food preferences…"}</option>
              {FOOD_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <Button variant={showFilters || activeFilterCount > 0 ? "default" : "ghost"} size="sm"
              onClick={() => setShowFilters(v => !v)} className="h-8 gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-primary rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </div>

        {zipError && <p className="text-xs text-red-500 px-1">{zipError}</p>}

        {!showFilters && activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeTag && <Chip label={`🔍 "${activeTag}"`} onRemove={() => { setActiveTag(null); setSearchQuery(""); setSearchInput(""); }} color="orange" />}
            {!activeTag && searchQuery && <Chip label={`🔍 "${searchQuery}"`} onRemove={() => { setSearchQuery(""); setSearchInput(""); }} />}
            {openNowOnly && <Chip label="Open now" onRemove={() => setOpenNowOnly(false)} color="green" />}
            {typeFilter !== "all" && <Chip label={TYPE_LABELS[typeFilter] ?? typeFilter} onRemove={() => setTypeFilter("all")} />}
            {statusFilter !== "all" && <Chip label={statusFilter} onRemove={() => setStatusFilter("all")} />}
          </div>
        )}

        {showFilters && (
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input type="checkbox" checked={openNowOnly} onChange={e => setOpenNowOnly(e.target.checked)} className="rounded border-gray-300 accent-green-600" />
                Open now only
              </label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer">
                <option value="all">All types</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
                {(["all", "published", "unpublished"] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors capitalize ${statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                    {s}
                  </button>
                ))}
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto">Clear all</button>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Food preferences</p>
              <p className="text-[11px] text-gray-400 mb-2">Selecting a tag searches resources mentioning that keyword.</p>
              <div className="flex flex-wrap gap-1.5">
                {FOOD_TAGS.map(tag => (
                  <button key={tag} onClick={() => handleTagClick(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      activeTag === tag ? "bg-[#FFD700] border-yellow-400 text-slate-900 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-yellow-300"
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Master-Detail Split View */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-md" style={{ height: "750px" }}>

        {/* LEFT — Card list */}
        <div className="flex flex-col border-r border-gray-200 bg-gray-50" style={{ width: "28%" }}>
          <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {loading ? "Loading…" : searchCenter
                  ? `${filteredResources.length} within ${radiusMiles} mi`
                  : `${filteredResources.length.toLocaleString()} resource${filteredResources.length !== 1 ? "s" : ""}`}
              </span>
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 flex-1 max-w-[160px]">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input type="text" placeholder="Search…" value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { setSearchQuery(searchInput); setActiveTag(null); } }}
                  onBlur={() => { setSearchQuery(searchInput); if (searchInput !== activeTag) setActiveTag(null); }}
                  className="bg-transparent text-xs focus:outline-none w-full placeholder:text-gray-400" />
              </div>
            </div>

            {searchCenter && searchedZipStat && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                searchedZipStat.pctUnavailable >= 80 ? "bg-red-50 text-red-700"
                : searchedZipStat.pctUnavailable >= 50 ? "bg-orange-50 text-orange-700"
                : searchedZipStat.pctUnavailable >= 20 ? "bg-yellow-50 text-yellow-700"
                : "bg-green-50 text-green-700"
              }`}>
                <span className="font-bold">{searchedZipStat.pctUnavailable}%</span>
                unavailable in ZIP {zipInput}
                <span className="ml-auto font-normal opacity-70">
                  {searchedZipStat.unavailable ?? "??"}/{searchedZipStat.total ?? "??"}
                </span>
              </div>
            )}
          </div>

          <div ref={listScrollRef} className="flex-1 overflow-y-auto pb-3 space-y-2">
            {selectedPantry && selectionSource === "map" && (
              <div className="px-3 pt-3">
                <PantryDetailCard pantry={selectedPantry} onClose={() => { setSelectedPantry(null); setSelectionSource(null); }} />
                {filteredResources.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 mb-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">All resources</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
              </div>
            )}

            {loading && <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>}

            {!loading && filteredResources.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No resources match your filters.</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
                )}
              </div>
            )}

            {!loading && filteredResources.map(p => (
              <div key={p.id} className="px-3">
                {selectedPantry?.id === p.id && selectionSource === "list" ? (
                  <PantryDetailCard pantry={p} onClose={() => { setSelectedPantry(null); setSelectionSource(null); }} />
                ) : (
                  <PantryCard
                    pantry={p}
                    selected={selectedPantry?.id === p.id}
                    distance={searchCenter ? distanceMiles(searchCenter.lat, searchCenter.lng, p.latitude, p.longitude) : null}
                    onSelect={() => handleCardSelect(p)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Google Map */}
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            options={{
              scrollwheel: true,
              gestureHandling: "greedy",
              zoomControl: true,
              fullscreenControl: true,
              // Prevent zooming out past city level — API returns nothing at national zoom
              minZoom: MIN_MAP_ZOOM,
            }}
            onLoad={map => { setMapInstance(map); mapRef.current = map; }}
            onIdle={onIdle}
          >
            {searchCenter && (
              <Circle center={searchCenter} radius={radiusMiles * MILES_TO_METERS}
                options={{ fillColor: "#6366f1", fillOpacity: 0.07, strokeColor: "#6366f1", strokeOpacity: 0.4, strokeWeight: 2 }} />
            )}
            {searchCenter && (
              <Marker position={searchCenter}
                icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: "#6366f1", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2, scale: 8 }}
                title="Search location" />
            )}

            {mapMarkers.map(p => (
              <Marker key={p.id} position={{ lat: p.latitude, lng: p.longitude }}
                icon={getMarkerIcon(p.badge, p.ratingAverage, selectedPantry?.id === p.id)}
                onClick={() => handleMarkerClick(p)}>
                {selectedPantry?.id === p.id && (
                  <InfoWindow onCloseClick={() => { setSelectedPantry(null); setSelectionSource(null); }}>
                    <div className="w-52 text-sm">
                      <p className="font-semibold text-gray-900 mb-1">{p.name}</p>
                      <p className="text-xs text-gray-500 mb-1">{p.location}</p>
                      {p.isOpenNow !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.isOpenNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.isOpenNow ? "● Open Now" : "Closed"}
                        </span>
                      )}
                      {p.ratingAverage != null && (
                        <p className={`text-xs mt-0.5 font-medium ${ratingColor(p.ratingAverage)}`}>
                          ⭐ {p.ratingAverage.toFixed(1)}{p.reviewCount != null ? ` (${p.reviewCount} reviews)` : ""}
                        </p>
                      )}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 font-medium hover:underline">
                        Directions <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}

            {zipInfoWindow && (
              <InfoWindow position={{ lat: zipInfoWindow.lat, lng: zipInfoWindow.lng }} onCloseClick={() => setZipInfoWindow(null)}>
                <div className="text-xs text-gray-800 max-w-[200px] leading-relaxed">
                  <p className="font-semibold text-gray-900 mb-1">{zipInfoWindow.title}</p>
                  {zipInfoWindow.content}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* Zoom hint shown when at min zoom */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-lg shadow px-3 py-1.5 text-xs text-gray-500 pointer-events-none">
            Pan to any city in the US to load resources
          </div>

          {searchCenter && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-1.5 text-xs font-semibold text-gray-700 pointer-events-none">
              {mapMarkers.length} locations within {radiusMiles} mi
            </div>
          )}

          {/* Floating Legend */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 p-3 min-w-[152px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Marker Quality</p>
            {[
              { label: "Excellent", color: "#2E7D32", badge: "Excellent" },
              { label: "Good",      color: "#F9A825", badge: "Good"      },
              { label: "At Risk",   color: "#E53935", badge: "At Risk"   },
              { label: "No data",   color: "#42A5F5", badge: null        },
            ].map(({ label, color, badge }) => {
              if (!badge) return (
                <div key={label} className="flex items-center gap-2 mb-1.5 px-2 py-1">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              );
              const active = legendFilter.has(badge);
              return (
                <button key={label} onClick={() => toggleLegendFilter(badge)}
                  className={`w-full flex items-center gap-2 mb-1.5 px-2 py-1 rounded-lg transition-colors text-left ${
                    active ? "bg-slate-100 ring-1 ring-slate-300" : "hover:bg-gray-50 opacity-60"
                  }`}>
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    active ? "bg-violet-500 border-violet-500" : "border-gray-300 bg-white"
                  }`}>
                    {active && <span className="text-white text-[9px] font-bold">✓</span>}
                  </span>
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: color }} />
                  <span className={`text-xs font-semibold ${active ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                </button>
              );
            })}

            {showServiceGapLayer && (
              <>
                <div className="my-2.5 border-t border-gray-200" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Service Gap</p>
                <div className="h-2.5 w-full rounded-full mb-1"
                  style={{ background: "linear-gradient(to right, #C8E6C9, #FFB74D, #EF5350, #B71C1C)" }} />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium mb-2">
                  <span>Good</span><span>Critical</span>
                </div>
                {GAP_COLORS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2 mb-1">
                    <span className="w-3.5 h-2.5 rounded shrink-0 border border-gray-200" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </div>
                ))}
                <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">% resources unavailable per ZIP</p>
              </>
            )}

            {showTractLayer && (
              <>
                <div className="my-2.5 border-t border-gray-200" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Equity Gap Index</p>
                <div className="h-2.5 w-full rounded-full mb-1"
                  style={{ background: "linear-gradient(to right, #F3E5F5, #E1BEE7, #BA68C8, #7B1FA2)" }} />
                <div className="flex justify-between text-[9px] text-slate-400 font-medium mb-2">
                  <span>Low</span><span>High</span>
                </div>
                {POVERTY_COLORS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2 mb-1">
                    <span className="w-3.5 h-2.5 rounded shrink-0 border border-gray-200" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </div>
                ))}
                <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">% population with economic insecurity</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}