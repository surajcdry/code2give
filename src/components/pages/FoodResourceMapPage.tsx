"use client";

import { useEffect, useState, useCallback } from "react";
import { Filter, MapPin, Clock, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";

type Pantry = {
  id: string; name: string; location: string;
  latitude: number; longitude: number;
  hours: string; description: string;
  resourceTypeId?: string;
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
          </div>
          <p className="text-xs text-gray-400 italic">{FILTER_DESCRIPTIONS[filter]}</p>
        </div>
      </div>

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
          >
            {mapPantries.map((p) => (
              <Marker
                key={p.id}
                position={{ lat: p.latitude, lng: p.longitude }}
                onClick={() => setSelectedMarker(p)}
              >
                {selectedMarker?.id === p.id && (
                  <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                    <div className="w-52">
                      <strong className="block mb-1 text-sm">{p.name}</strong>
                      <p className="text-xs text-gray-500 mb-1">{p.location}</p>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{p.description}</p>
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
