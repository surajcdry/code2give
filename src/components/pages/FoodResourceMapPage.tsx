"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Filter, MapPin, Clock, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";

type Pantry = {
  id: string; name: string; location: string;
  latitude: number; longitude: number;
  hours: string; description: string;
  resourceTypeId?: string;
  reliabilityScore?: number;
  badge?: string;
  badgeColor?: string;
};

const FILTER_OPTIONS = [
  { value: "default",         label: "Default (by priority)" },
  { value: "top_rated",       label: "Top Rated" },
  { value: "needs_attention", label: "Needs Attention (low rating)" },
  { value: "most_subscribed", label: "Most Subscribed" },
  { value: "most_reviewed",   label: "Most Reviewed" },
] as const;

type FilterValue = typeof FILTER_OPTIONS[number]["value"];

const FILTER_DESCRIPTIONS: Record<FilterValue, string> = {
  default:         "Lemontree's internal priority ranking",
  top_rated:       "Highest community-rated resources first",
  needs_attention: "Lowest rated resources — where help is most needed",
  most_subscribed: "Resources with the most active community followers",
  most_reviewed:   "Most reviewed resources by community members",
};

const mapContainerStyle = { width: "100%", height: "100%" };
const center = { lat: 40.730610, lng: -73.935242 };

const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY: "Food Pantry",
  SOUP_KITCHEN: "Soup Kitchen",
  COMMUNITY_FRIDGE: "Community Fridge",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMarkerIcon(badge?: string): any {
  const colors: Record<string, string> = {
    Excellent: "#2E7D32",
    Good:      "#F9A825",
    "At Risk": "#E53935",
  };
  const color = colors[badge ?? ""] ?? "#42A5F5"; // blue default (no score)
  return {
    path: "M 0, 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0", // circle
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 1,
  };
}

export function FoodResourceMapPage() {
  // Map data — top 500 pins for performance
  const [mapPantries, setMapPantries] = useState<Pantry[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Pantry | null>(null);
  const [filter, setFilter] = useState<FilterValue>("default");
  const [mapLoading, setMapLoading] = useState(false);

  // List data — full paginated dataset
  const [resources, setResources] = useState<Pantry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [listLoading, setListLoading] = useState(false);

  // Food Desert Overlay
  const [showDesertOverlay, setShowDesertOverlay] = useState(false);
  const [zipStats, setZipStats] = useState<Record<string, { pctUnavailable: number }>>({});
  const [geoJson, setGeoJson] = useState<object | null>(null);
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const geoJsonLoaded = useRef(false);

  // Load map pins — re-fetch when filter changes
  useEffect(() => {
    setMapLoading(true);
    setSelectedMarker(null);
    fetch(`/api/map-data?filter=${filter}`)
      .then(r => r.json())
      .then(d => setMapPantries(d.pantries || []))
      .finally(() => setMapLoading(false));
  }, [filter]);

  // Load paginated list
  const fetchList = useCallback((p: number, s: string) => {
    setListLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (s) params.set("search", s);
    fetch(`/api/resources?${params}`)
      .then(r => r.json())
      .then(d => {
        setResources(d.resources || []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 0);
      })
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => { fetchList(page, search); }, [page, search, fetchList]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // Fetch overlay data when first enabled
  useEffect(() => {
    if (!showDesertOverlay) return;
    if (geoJsonLoaded.current) return;
    geoJsonLoaded.current = true;

    // Fetch zip stats
    fetch("/api/zip-stats")
      .then(r => r.json())
      .then(d => setZipStats(d.zipStats ?? {}))
      .catch(() => {});

    // Fetch GeoJSON
    fetch("https://raw.githubusercontent.com/fedhere/PUI2015_EC/master/mvogt_hw4/data/nyc-zip-code-tabulation-areas-polygons.geojson")
      .then(r => {
        if (!r.ok) throw new Error("Failed to load GeoJSON");
        return r.json();
      })
      .then(data => setGeoJson(data))
      .catch(() => setGeoJsonError("Could not load food desert overlay data."));
  }, [showDesertOverlay]);

  // Apply/remove overlay on the map instance
  useEffect(() => {
    if (!mapInstance) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapInstance.data.forEach((feature: any) => mapInstance.data.remove(feature));
    if (showDesertOverlay && geoJson) {
      mapInstance.data.addGeoJson(geoJson as object);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapInstance.data.setStyle((feature: any) => {
        const zip = feature.getProperty("postalCode")
          ?? feature.getProperty("ZIPCODE")
          ?? feature.getProperty("zcta5ce10")
          ?? feature.getProperty("ZCTA5CE10")
          ?? "";
        const stats = zipStats[String(zip)];
        const pct = stats?.pctUnavailable ?? 0;
        const fillColor = pct >= 80 ? "#B71C1C"
          : pct >= 60 ? "#E53935"
          : pct >= 40 ? "#FF7043"
          : pct >= 20 ? "#FFA726"
          : "#E8F5E9";
        return { fillColor, fillOpacity: 0.45, strokeColor: "#ffffff", strokeWeight: 1 };
      });
    }
  }, [showDesertOverlay, geoJson, mapInstance, zipStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-gray-900">Food Resource Map</h1>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500 shrink-0" />
            <span className="text-sm text-gray-600">
              {total.toLocaleString()} NYC resources in database
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="map-filter" className="text-sm text-gray-600 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="map-filter"
                value={filter}
                onChange={e => setFilter(e.target.value as FilterValue)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowDesertOverlay(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showDesertOverlay
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: showDesertOverlay ? "#E53935" : "#9CA3AF" }} />
              Food Desert Overlay
            </button>
          </div>
          <p className="text-xs text-gray-400 italic">{FILTER_DESCRIPTIONS[filter]}</p>
        </div>
      </div>

      {geoJsonError && (
        <p className="text-xs text-red-500">{geoJsonError}</p>
      )}

      {/* Map — top 500 filtered */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            {mapLoading
              ? "Loading locations…"
              : `Showing top ${mapPantries.length} locations · ${FILTER_OPTIONS.find(o => o.value === filter)?.label}`}
          </p>
        </div>
        <div className="h-[500px] rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={11}
            options={{ scrollwheel: true, gestureHandling: "greedy", zoomControl: true }}
            onLoad={(map) => setMapInstance(map)}
          >
            {mapPantries.map((p) => (
              <Marker
                key={p.id}
                position={{ lat: p.latitude, lng: p.longitude }}
                onClick={() => setSelectedMarker(p)}
                icon={getMarkerIcon(p.badge)}
              >
                {selectedMarker?.id === p.id && (
                  <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                    <div className="w-52">
                      <strong className="block mb-1 text-sm">{p.name}</strong>
                      <p className="text-xs text-gray-500 mb-1">{p.location}</p>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{p.description}</p>
                      {p.badge && (
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            style={{ color: p.badgeColor === "green" ? "#2E7D32" : p.badgeColor === "yellow" ? "#F9A825" : "#E53935" }}
                            className="text-xs font-semibold"
                          >
                            ● {p.badge}
                          </span>
                          <span className="text-xs text-gray-500">({p.reliabilityScore})</span>
                        </div>
                      )}
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[p.resourceTypeId ?? ""] ?? p.hours}
                      </span>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
        </div>
        {/* Marker color legend */}
        <div className="flex items-center gap-4 px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
          <span className="font-medium text-gray-700">Marker color:</span>
          {[
            { label: "Excellent", color: "#2E7D32" },
            { label: "Good", color: "#F9A825" },
            { label: "At Risk", color: "#E53935" },
            { label: "No data", color: "#42A5F5" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
        {/* Food Desert choropleth legend */}
        {showDesertOverlay && (
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-600 border-t border-gray-100 bg-gray-50 flex-wrap">
            <span className="font-medium text-gray-700">Food Desert Overlay — % Unavailable:</span>
            {[
              { label: "≥80%", color: "#B71C1C" },
              { label: "60–79%", color: "#E53935" },
              { label: "40–59%", color: "#FF7043" },
              { label: "20–39%", color: "#FFA726" },
              { label: "<20%", color: "#E8F5E9", dark: true },
            ].map(({ label, color, dark }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="inline-block w-4 h-3 rounded border border-gray-300" style={{ backgroundColor: color }} />
                <span className={dark ? "text-gray-800" : "text-gray-600"}>{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Full Resource List */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">
          <h3 className="text-gray-900 shrink-0">
            All Resources ({search ? `${total.toLocaleString()} results` : `${total.toLocaleString()} total`})
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by name or address…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleSearch}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {listLoading && (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          )}
          {!listLoading && resources.map((p) => (
            <div
              key={p.id}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedMarker(p)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-gray-900">{p.name}</h4>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{p.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{TYPE_LABELS[p.resourceTypeId ?? ""] ?? p.hours}</span>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary shrink-0 ml-4">Active</span>
              </div>
            </div>
          ))}
          {!listLoading && resources.length === 0 && (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No resources found matching your search.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages.toLocaleString()} — {total.toLocaleString()} resources
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 px-2">{page}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
