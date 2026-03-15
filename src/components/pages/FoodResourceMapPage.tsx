"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapPin, Clock, Search, X, ExternalLink, Phone,
  Navigation, Download, Timer, Filter, LocateFixed, AlertCircle, Star,
  Layers
} from "lucide-react";
import { GoogleMap, Marker, Circle, InfoWindow } from "@react-google-maps/api";
import { Button } from "@/components/ui/Button";

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
const DEFAULT_CENTER  = { lat: 40.73061, lng: -73.935242 };
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

const LEGEND_MARKERS = [
  { label: "Excellent (≥2.5)", color: "#2E7D32", badge: "Excellent" },
  { label: "Good (1.5–2.4)",   color: "#F9A825", badge: "Good"      },
  { label: "At Risk (<1.5)",   color: "#E53935", badge: "At Risk"   },
  { label: "No data",          color: "#42A5F5", badge: null        },
] as const;

type SortOption = "default" | "distance" | "rating" | "open_now";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default",  label: "Default"        },
  { value: "distance", label: "Nearest first"  },
  { value: "rating",   label: "Highest rated"  },
  { value: "open_now", label: "Open now first" },
];

const GAP_COLORS = [
  { label: "Critical ≥80%",   color: "#B71C1C" },
  { label: "High 50–79%",     color: "#EF5350" },
  { label: "Moderate 20–49%", color: "#FFB74D" },
  { label: "Good <20%",       color: "#C8E6C9" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEffectiveBadge(badge?: string, rating?: number | null): string | undefined {
  if (rating != null) {
    if (rating >= 2.5) return "Excellent";
    if (rating >= 1.5) return "Good";
    return "At Risk";
  }
  return badge;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkerIcon(badge?: string, rating?: number | null, selected = false): any {
  const effectiveBadge = getEffectiveBadge(badge, rating);
  const color = MARKER_COLORS[effectiveBadge ?? ""] ?? "#42A5F5";
  return {
    path: "M 0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0",
    fillColor: color, fillOpacity: 0.9,
    strokeColor: selected ? "#1e293b" : "#ffffff",
    strokeWeight: selected ? 3 : 2,
    scale: selected ? 0.9 : 0.6,
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

function ratingColor(rating?: number | null, badge?: string | null) {
  const effectiveBadge = getEffectiveBadge(badge ?? undefined, rating);
  if (effectiveBadge === "Excellent") return "text-green-600";
  if (effectiveBadge === "Good")      return "text-yellow-600";
  if (effectiveBadge === "At Risk")   return "text-red-600";
  return "text-gray-400";
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
  const headers = ["Name", "Address", "Type", "Badge", "Rating", "Published"];
  const lines = rows.map(p => {
    const effBadge = getEffectiveBadge(p.badge, p.ratingAverage);
    return [p.name, p.location, TYPE_LABELS[p.resourceTypeId ?? ""] ?? "",
      effBadge ?? "", p.ratingAverage ?? "",
      p.isPublished !== false ? "Yes" : "No"]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  });
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Pantry Detail Card (pinned/inline) ────────────────────────────────────────
function PantryDetailCard({ pantry, onClose }: { pantry: Pantry; onClose: () => void }) {
  const mapsUrl   = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pantry.location)}`;
  const effBadge  = getEffectiveBadge(pantry.badge, pantry.ratingAverage);
  const bs        = effBadge ? BADGE_STYLES[effBadge] : null;
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
                  {[1, 2, 3].map(i => (
                    <Star key={i}
                      className={`w-3 h-3 ${pantry.ratingAverage! >= i ? ratingColor(pantry.ratingAverage, pantry.badge).replace("text-", "text-") : "text-gray-300"}`}
                      fill={pantry.ratingAverage! >= i ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className={`text-sm font-bold ${ratingColor(pantry.ratingAverage, pantry.badge)}`}>
                  {pantry.ratingAverage.toFixed(1)}
                  <span className="text-[10px] font-normal opacity-60">/3</span>
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
      </div>

      <div className="px-4 pb-4">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="default" size="sm" className="w-full gap-1.5 h-8 bg-violet-500 hover:bg-violet-600 text-white font-bold">
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
  const effBadge = getEffectiveBadge(pantry.badge, pantry.ratingAverage);
  const bs       = effBadge ? BADGE_STYLES[effBadge] : null;

  return (
    <div onClick={onSelect}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md
        ${selected ? "border-primary bg-primary/5 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm leading-snug truncate">{pantry.name}</h4>
          <p className="text-[11px] text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
            {TYPE_LABELS[pantry.resourceTypeId ?? ""] ?? "Resource"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {pantry.isOpenNow !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pantry.isOpenNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {pantry.isOpenNow ? "● Open" : "Closed"}
            </span>
          )}
          {bs && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bs.bg} ${bs.text}`}>{effBadge}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-2.5">
        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{pantry.location}</span>
        {distance !== null && (
          <span className="flex items-center gap-1 text-indigo-600 font-medium shrink-0">
            <Navigation className="w-3 h-3" />{distance.toFixed(1)} mi
          </span>
        )}
        {pantry.ratingAverage != null && (
          <span className={`flex items-center gap-1 shrink-0 font-medium ${ratingColor(pantry.ratingAverage, pantry.badge)}`}>
            ⭐ {pantry.ratingAverage.toFixed(1)}<span className="text-gray-400 font-normal">/3</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          <Button variant="default" size="sm" className="h-7 text-xs gap-1 bg-violet-500 hover:bg-violet-600 text-white font-bold">
            <MapPin className="w-3 h-3" /> Get Directions
          </Button>
        </a>
        <span className={`ml-auto text-[10px] font-medium ${pantry.isPublished !== false ? "text-green-600" : "text-gray-400"}`}>
          {pantry.isPublished !== false ? "✓ Published" : "Unpublished"}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function FoodResourceMapPage() {
  const [allPantries, setAllPantries]       = useState<Pantry[]>([]);
  const [loading, setLoading]                = useState(false);
  const [selectedPantry, setSelectedPantry] = useState<Pantry | null>(null);
  const [selectionSource, setSelectionSource] = useState<"map" | "list" | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter]     = useState(DEFAULT_CENTER);

  const [showServiceGapLayer, setShowServiceGapLayer] = useState(false);
  const [zipStats, setZipStats]                       = useState<Record<string, ZipStat>>({});
  const [geoJson, setGeoJson]                          = useState<object | null>(null);
  const [geoJsonLoaded, setGeoJsonLoaded]             = useState(false);
  const [zipInfoWindow, setZipInfoWindow]             = useState<{ lat: number; lng: number; content: string } | null>(null);
  const dataListenerRef                                = useRef<google.maps.MapsEventListener | null>(null);

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

  const [legendFilter, setLegendFilter] = useState<Set<string>>(new Set(["Excellent", "Good", "At Risk"]));

  const toggleLegendFilter = (key: string) =>
    setLegendFilter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) { setActiveTag(null); setSearchQuery(""); setSearchInput(""); }
    else { setActiveTag(tag); setSearchQuery(tag); setSearchInput(tag); }
  };

  const activeFilterCount = [!!searchQuery, typeFilter !== "all", openNowOnly, statusFilter !== "all"].filter(Boolean).length;

  useEffect(() => {
    setLoading(true); setSelectedPantry(null); setSelectionSource(null);
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    fetch(`/api/map-data?${params}`)
      .then(r => r.json())
      .then(d => setAllPantries(d.pantries ?? d.resources ?? []))
      .catch(() => setAllPantries([]))
      .finally(() => setLoading(false));
  }, [searchQuery]);

  useEffect(() => {
    fetch("/api/zip-stats").then(r => r.json()).then(d => setZipStats(d.zipStats ?? {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showServiceGapLayer || geoJsonLoaded) return;
    setGeoJsonLoaded(true);
    fetch("/nyc-zips.geojson").then(r => r.json()).then(d => setGeoJson(d)).catch(err => console.error(err));
  }, [showServiceGapLayer, geoJsonLoaded]);

  useEffect(() => {
    if (!mapInstance) return;
    mapInstance.data.forEach(f => mapInstance.data.remove(f));
    if (dataListenerRef.current) { google.maps.event.removeListener(dataListenerRef.current); dataListenerRef.current = null; }
    setZipInfoWindow(null);
    if (!showServiceGapLayer || !geoJson) { mapInstance.data.setStyle({}); return; }
    mapInstance.data.addGeoJson(geoJson as object);
    mapInstance.data.setStyle(feature => {
      const zip  = String(getZipFromFeature(feature)).trim();
      const stat = zip ? zipStats[zip] : undefined;
      if (!stat) return { fillOpacity: 0 };
      return { fillColor: gapFillColor(stat.pctUnavailable), fillOpacity: 0.55, strokeColor: "#ffffff", strokeWeight: 1.5, strokeOpacity: 1, zIndex: 0 };
    });
    dataListenerRef.current = mapInstance.data.addListener("click", (e: google.maps.Data.MouseEvent) => {
      if (!e.latLng) return;
      const zip  = String(getZipFromFeature(e.feature)).trim();
      const stat = zip ? zipStats[zip] : undefined;
      setZipInfoWindow({
        lat: e.latLng.lat(), lng: e.latLng.lng(),
        content: stat ? `ZIP ${zip}: ${stat.pctUnavailable}% unavailable.` : `ZIP ${zip}: no data.`,
      });
    });
  }, [showServiceGapLayer, geoJson, mapInstance, zipStats]);

  const allChecked = legendFilter.has("Excellent") && legendFilter.has("Good") && legendFilter.has("At Risk");

  const filteredResources = allPantries
    .filter(p => {
      const effBadge = getEffectiveBadge(p.badge, p.ratingAverage);
      if (searchCenter && distanceMiles(searchCenter.lat, searchCenter.lng, p.latitude, p.longitude) > radiusMiles) return false;
      if (openNowOnly && !p.isOpenNow) return false;
      if (typeFilter !== "all" && p.resourceTypeId !== typeFilter) return false;
      if (statusFilter === "published"   && p.isPublished === false) return false;
      if (statusFilter === "unpublished" && p.isPublished !== false) return false;
      if (!allChecked && legendFilter.size > 0) {
        if (!effBadge || !legendFilter.has(effBadge)) return false;
      }
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

  const zoomTo = (lat: number, lng: number, miles: number) => {
    setSearchCenter({ lat, lng }); setMapCenter({ lat, lng }); setSelectedPantry(null); setSelectionSource(null);
    if (mapInstance) {
      mapInstance.panTo({ lat, lng });
      mapInstance.setZoom(miles <= 1 ? 15 : miles <= 2 ? 14 : miles <= 5 ? 13 : 12);
    }
  };

  const handleZipSearch = async () => {
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) { setZipError("Enter a valid 5-digit ZIP."); return; }
    setZipError(null); setZipLoading(true);
    try {
      const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${zip}|country:US&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
      const data = await res.json();
      if (data.status !== "OK" || !data.results[0]) { setZipError("ZIP not found."); return; }
      const { lat, lng } = data.results[0].geometry.location;
      zoomTo(lat, lng, radiusMiles);
    } catch { setZipError("Look up failed."); }
    finally { setZipLoading(false); }
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) { setZipError("Not supported."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { zoomTo(pos.coords.latitude, pos.coords.longitude, radiusMiles); setGpsLoading(false); },
      ()  => { setZipError("Location failed."); setGpsLoading(false); }
    );
  };

  const resetAll = () => {
    setTypeFilter("all"); setOpenNowOnly(false); setStatusFilter("all");
    setSearchQuery(""); setSearchInput(""); setActiveTag(null);
    setLegendFilter(new Set(["Excellent", "Good", "At Risk"]));
    setShowServiceGapLayer(false); setShowFilters(false);
    setSortBy("default"); setZipInfoWindow(null);
    setZipInput(""); setZipError(null); setSearchCenter(null);
    setMapCenter(DEFAULT_CENTER); setSelectedPantry(null); setSelectionSource(null);
    if (mapInstance) { mapInstance.panTo(DEFAULT_CENTER); mapInstance.setZoom(11); }
  };

  const handleCardSelect = (p: Pantry) => {
    if (selectedPantry?.id === p.id && selectionSource === "list") {
      setSelectedPantry(null); setSelectionSource(null);
    } else {
      setSelectedPantry(p); setSelectionSource("list");
      if (mapInstance) { mapInstance.panTo({ lat: p.latitude, lng: p.longitude }); mapInstance.setZoom(15); }
    }
  };

  const handleMarkerClick = (p: Pantry) => {
    if (selectedPantry?.id === p.id && selectionSource === "map") {
      setSelectedPantry(null); setSelectionSource(null);
    } else {
      setSelectedPantry(p); setSelectionSource("map");
      if (mapInstance) { mapInstance.panTo({ lat: p.latitude, lng: p.longitude }); mapInstance.setZoom(15); }
    }
  };

  useEffect(() => {
    if (selectionSource === "map" && selectedPantry) {
      listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedPantry, selectionSource]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Food Resource Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${allPantries.length.toLocaleString()} resources`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => exportToCSV(filteredResources, "food-resources.csv")} className="gap-1.5">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-sm p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Navigation className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <input type="text" inputMode="numeric" maxLength={5} placeholder="ZIP code" value={zipInput}
              onChange={e => { setZipInput(e.target.value.replace(/\D/g, "")); setZipError(null); }}
              onKeyDown={e => e.key === "Enter" && handleZipSearch()}
              className="w-20 bg-transparent text-sm focus:outline-none" />
          </div>

          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {RADIUS_OPTIONS.map(m => (
              <button key={m} onClick={() => setRadiusMiles(m)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${radiusMiles === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {m < 1 ? "½" : m}mi
              </button>
            ))}
          </div>

          <Button variant="default" size="sm" onClick={handleZipSearch} disabled={zipLoading}
            className="h-8 gap-1.5 bg-violet-500 hover:bg-violet-600 text-white font-bold">
            <Search className="w-3.5 h-3.5" /> Search
          </Button>

          <Button variant="ghost" size="sm" onClick={handleNearMe} disabled={gpsLoading}
            className="h-8 gap-1.5 text-violet-600 border border-violet-200 font-semibold">
            <LocateFixed className="w-3.5 h-3.5" /> Near Me
          </Button>

          <button onClick={() => setShowServiceGapLayer(v => !v)}
            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
              showServiceGapLayer ? "bg-[#FFD700] border-yellow-400 text-slate-900" : "bg-white border-gray-200 text-gray-600 hover:border-yellow-300"
            }`}>
            <span className={`w-3 h-3 rounded-sm inline-block border ${showServiceGapLayer ? "bg-red-500 border-red-600" : "bg-gray-200 border-gray-300"}`} />
            Service Gap Layer
          </button>

          <button onClick={resetAll}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 bg-white hover:bg-red-50 hover:text-red-600">
            <X className="w-3.5 h-3.5" /> Reset
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Button variant={showFilters || activeFilterCount > 0 ? "default" : "ghost"} size="sm" onClick={() => setShowFilters(v => !v)}
              className={`h-8 gap-1.5 font-bold ${showFilters || activeFilterCount > 0 ? "bg-violet-500 hover:bg-violet-600 text-white" : ""}`}>
              <Filter className="w-3.5 h-3.5" /> Filters
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="pt-2 border-t border-gray-100">
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
        )}
      </div>

      <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-md" style={{ height: "750px" }}>
        <div className="flex flex-col border-r border-gray-200 bg-gray-50" style={{ width: "28%" }}>
          <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0">
             <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {loading ? "Loading…" : `${filteredResources.length} results`}
              </span>
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 flex-1 max-w-[160px]">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input type="text" placeholder="Search…" value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { setSearchQuery(searchInput); setActiveTag(null); } }}
                  className="bg-transparent text-xs focus:outline-none w-full" />
              </div>
            </div>
          </div>

          <div ref={listScrollRef} className="flex-1 overflow-y-auto pb-3 space-y-2">
            {selectedPantry && selectionSource === "map" && (
              <div className="px-3 pt-3">
                <PantryDetailCard pantry={selectedPantry} onClose={() => { setSelectedPantry(null); setSelectionSource(null); }} />
                <div className="flex items-center gap-2 mt-3 mb-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">All resources</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>
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

        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter} zoom={11}
            options={{ scrollwheel: true, gestureHandling: "greedy", zoomControl: true }}
            onLoad={map => setMapInstance(map)}
          >
            {searchCenter && (
              <Circle center={searchCenter} radius={radiusMiles * MILES_TO_METERS}
                options={{ fillColor: "#6366f1", fillOpacity: 0.07, strokeColor: "#6366f1", strokeOpacity: 0.4, strokeWeight: 2 }} />
            )}
            {filteredResources.map(p => (
              <Marker key={p.id} position={{ lat: p.latitude, lng: p.longitude }}
                icon={getMarkerIcon(p.badge, p.ratingAverage, selectedPantry?.id === p.id)}
                onClick={() => handleMarkerClick(p)}
              />
            ))}
            {zipInfoWindow && (
              <InfoWindow position={{ lat: zipInfoWindow.lat, lng: zipInfoWindow.lng }} onCloseClick={() => setZipInfoWindow(null)}>
                <div className="text-xs text-gray-800 max-w-[200px] leading-relaxed">
                  <p className="font-semibold text-gray-900 mb-1">Service Gap</p>
                  {zipInfoWindow.content}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 p-3 min-w-[160px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Marker Quality</p>
            {LEGEND_MARKERS.map(({ label, color, badge }) => {
              const key = badge ?? "no-data";
              const active = legendFilter.has(key);
              const isNoData = badge === null;

              if (isNoData) return (
                <div key={label} className="flex items-center gap-2 mb-1.5 px-2 py-1">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              );

              return (
                <button key={label} onClick={() => toggleLegendFilter(key)}
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
                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                  <span>Good</span><span>Critical</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}