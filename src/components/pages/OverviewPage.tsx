"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { GoogleMap, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import {
  MapPin, Clock, AlertTriangle, Users, Star, BarChart3, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
type Pantry = {
  id: string; name: string; latitude: number; longitude: number;
  hours: string; description: string; resourceTypeId?: string;
};

type Insights = {
  summary: {
    total: number; published: number; unavailable: number;
    rated: number; avgRating: number; medianWaitMinutes: number;
    hasReviews: number; hasSubscribers: number;
  };
  typeBreakdown: { type: string; name: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  ratingDistribution: { bucket: number; label: string; count: number }[];
  waitTimeDistribution: { bucket: string; count: number }[];
  topByReviews: {
    name: string; type: string; reviewCount: number;
    rating: string | null; subscribers: number; location: string;
  }[];
  topBySubscribers: {
    name: string; type: string; reviewCount: number;
    rating: string | null; subscribers: number; location: string;
  }[];
  zipHotspots: { zip: string; count: number }[];
};

// ── Constants ──────────────────────────────────────────────────────────────────
const NYC_CENTER = { lat: 40.7306, lng: -73.9352 };
const MAP_STYLE = { width: "100%", height: "100%" };
const COVERAGE_RADIUS_M = 800;
const TYPE_COLORS: Record<string, string> = {
  FOOD_PANTRY: "#2E7D32",
  SOUP_KITCHEN: "#42A5F5",
  COMMUNITY_FRIDGE: "#FFA726",
};
const STATUS_COLORS = { PUBLISHED: "#2E7D32", UNAVAILABLE: "#EF5350" };

// ── Sub-components ─────────────────────────────────────────────────────────────
function PantryMapCard({ pantries }: { pantries: Pantry[] }) {
  const [tab, setTab] = useState<"locations" | "coverage">("locations");
  const [selected, setSelected] = useState<Pantry | null>(null);

  return (
    <div className="col-span-2 bg-card rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-gray-900">Active Pantry Locations</h2>
          <p className="text-xs text-gray-400 mt-0.5">Top 500 by priority · NYC metro area</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(["locations", "coverage"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                tab === t ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "locations" ? "Locations" : "Coverage Area"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[380px]">
        <GoogleMap
          mapContainerStyle={MAP_STYLE}
          center={NYC_CENTER}
          zoom={11}
          options={{ scrollwheel: true, gestureHandling: "greedy", zoomControl: true }}
        >
          {tab === "locations" && pantries.map((p) => (
            <Marker
              key={p.id}
              position={{ lat: p.latitude, lng: p.longitude }}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
            >
              {selected?.id === p.id && (
                <InfoWindow onCloseClick={() => setSelected(null)}>
                  <div className="w-44">
                    <p className="font-semibold text-sm mb-1">{p.name}</p>
                    <p className="text-xs text-gray-500 mb-1">{p.description}</p>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{p.hours}</span>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}
          {tab === "coverage" && pantries.map((p) => (
            <Circle
              key={p.id}
              center={{ lat: p.latitude, lng: p.longitude }}
              radius={COVERAGE_RADIUS_M}
              options={{
                fillColor: TYPE_COLORS[p.resourceTypeId ?? ""] ?? "#2E7D32",
                fillOpacity: 0.12,
                strokeColor: TYPE_COLORS[p.resourceTypeId ?? ""] ?? "#2E7D32",
                strokeOpacity: 0.5,
                strokeWeight: 1.5,
              }}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
            />
          ))}
          {tab === "coverage" && selected && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="w-44">
                <p className="font-semibold text-sm mb-1">{selected.name}</p>
                <p className="text-xs text-gray-500">~{COVERAGE_RADIUS_M}m coverage radius</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

function StatusCard({ insights }: { insights: Insights }) {
  const { published, unavailable, total } = insights.summary;
  const publishedPct = Math.round((published / total) * 100);
  const unavailablePct = Math.round((unavailable / total) * 100);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-gray-900">Resource Status</h3>
        <p className="text-xs text-gray-400 mt-0.5">Published vs unavailable</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={[
                { name: "Published", value: published },
                { name: "Unavailable", value: unavailable },
              ]}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              dataKey="value"
            >
              <Cell fill={STATUS_COLORS.PUBLISHED} />
              <Cell fill={STATUS_COLORS.UNAVAILABLE} />
            </Pie>
            <Tooltip formatter={(v) => [`${Number(v ?? 0).toLocaleString()} resources`, ""]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{publishedPct}%</p>
          <p className="text-xs text-green-600 mt-0.5">Active</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{unavailablePct}%</p>
          <p className="text-xs text-red-500 mt-0.5">Unavailable</p>
        </div>
      </div>
    </div>
  );
}

function RatingChart({ data }: { data: Insights["ratingDistribution"] }) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Rating Distribution</h3>
        <p className="text-xs text-gray-400 mt-0.5">Published resources with ratings (scale 1–5)</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            formatter={(v) => [`${v} resources`, "Count"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i < 2 ? "#EF5350" : i < 4 ? "#FFA726" : "#2E7D32"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WaitTimeChart({ data }: { data: Insights["waitTimeDistribution"] }) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Wait Time Distribution</h3>
        <p className="text-xs text-gray-400 mt-0.5">Published resources · outliers (&gt;240 min) excluded</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            formatter={(v) => [`${v} resources`, "Count"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" fill="#42A5F5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopPantriesTable({
  title, subtitle, data, sortKey,
}: {
  title: string;
  subtitle: string;
  data: Insights["topByReviews"];
  sortKey: "reviewCount" | "subscribers";
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {data.map((p, i) => (
          <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-bold text-gray-300 w-5 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-400 truncate">{p.location}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {p.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-gray-600">{p.rating}</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {sortKey === "reviewCount"
                    ? p.reviewCount.toLocaleString()
                    : p.subscribers.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-400">
                  {sortKey === "reviewCount" ? "reviews" : "subscribers"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeBreakdownChart({ data }: { data: Insights["typeBreakdown"] }) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">Resource Type Breakdown</h3>
        <p className="text-xs text-gray-400 mt-0.5">All NYC metro food resources</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            width={130}
          />
          <Tooltip
            formatter={(v) => [`${Number(v ?? 0).toLocaleString()} resources`, "Count"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={TYPE_COLORS[d.type] ?? "#9ca3af"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── KPI sets per role ─────────────────────────────────────────────────────────
function KPIs({ role, insights, totalPantries }: {
  role: string | undefined;
  insights: Insights | null;
  totalPantries: number;
}) {
  if (!insights) return <div className="col-span-4 h-24 bg-gray-50 rounded-lg animate-pulse" />;

  const { summary } = insights;
  const unavailablePct = Math.round((summary.unavailable / summary.total) * 100);

  switch (role) {
    case "internal":
      return (
        <>
          <KPICard title="Published Resources" value={summary.published.toLocaleString()} icon={MapPin} subtitle="NYC metro area" />
          <KPICard title="Unavailable Resources" value={`${unavailablePct}%`} icon={AlertTriangle} subtitle={`${summary.unavailable.toLocaleString()} need review`} />
          <KPICard title="Avg Rating" value={summary.avgRating.toFixed(2)} icon={Star} subtitle={`${summary.rated.toLocaleString()} rated resources`} />
          <KPICard title="Median Wait Time" value={`${summary.medianWaitMinutes} min`} icon={Clock} subtitle="Among resources with data" />
        </>
      );
    case "government":
      return (
        <>
          <KPICard title="Total Resources Mapped" value={summary.total.toLocaleString()} icon={MapPin} subtitle="Food pantries, soup kitchens, fridges" />
          <KPICard title="Service Gaps" value={`${unavailablePct}%`} icon={TrendingDown} subtitle={`${summary.unavailable.toLocaleString()} unavailable resources`} />
          <KPICard title="Avg Community Rating" value={summary.avgRating.toFixed(2)} icon={BarChart3} subtitle="Out of 5.0" />
          <KPICard title="Resources w/ Subscribers" value={summary.hasSubscribers.toLocaleString()} icon={Users} subtitle="Active community followers" />
        </>
      );
    case "donor":
      return (
        <>
          <KPICard title="Active Food Resources" value={summary.published.toLocaleString()} icon={MapPin} subtitle="Currently published" />
          <KPICard title="Needing Support" value={summary.unavailable.toLocaleString()} icon={AlertTriangle} subtitle="Currently unavailable" />
          <KPICard title="Community Engagement" value={summary.hasSubscribers.toLocaleString()} icon={Users} subtitle="Resources with active followers" />
          <KPICard title="Avg Wait Time" value={`${summary.medianWaitMinutes} min`} icon={Clock} subtitle="Median across NYC" />
        </>
      );
    case "provider":
      return (
        <>
          <KPICard title="Active Pantries Nearby" value={totalPantries.toLocaleString()} icon={MapPin} subtitle="Published in NYC" />
          <KPICard title="Median Wait Time" value={`${summary.medianWaitMinutes} min`} icon={Clock} subtitle="Across all pantries" />
          <KPICard title="Avg Rating" value={summary.avgRating.toFixed(2)} icon={Star} subtitle={`${summary.rated.toLocaleString()} rated`} />
          <KPICard title="Resources w/ Reviews" value={summary.hasReviews.toLocaleString()} icon={BarChart3} subtitle="Community feedback exists" />
        </>
      );
    default:
      return null;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function OverviewPage() {
  const { role } = useApp();
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [totalPantries, setTotalPantries] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [activeTable, setActiveTable] = useState<"reviews" | "subscribers">("subscribers");

  useEffect(() => {
    fetch("/api/map-data").then(r => r.json()).then(d => {
      setPantries(d.pantries || []);
      setTotalPantries(d.totalPantries ?? d.pantries?.length ?? 0);
    });
    fetch("/api/insights").then(r => r.json()).then(setInsights);
  }, []);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6">
        <KPIs role={role} insights={insights} totalPantries={totalPantries} />
      </div>

      {/* Map + Status */}
      <div className="grid grid-cols-3 gap-6">
        <PantryMapCard pantries={pantries} />
        {insights && <StatusCard insights={insights} />}
      </div>

      {/* Charts row */}
      {insights && (
        <div className="grid grid-cols-3 gap-6">
          <TypeBreakdownChart data={insights.typeBreakdown} />
          <RatingChart data={insights.ratingDistribution} />
          <WaitTimeChart data={insights.waitTimeDistribution} />
        </div>
      )}

      {/* Top Pantries */}
      {insights && (
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-gray-900">Top Pantries by Engagement</h3>
              <p className="text-xs text-gray-400 mt-0.5">Published NYC resources</p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {(["subscribers", "reviews"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTable(t)}
                  className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                    activeTable === t
                      ? "bg-white shadow-sm text-gray-900 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  By {t === "subscribers" ? "Subscribers" : "Reviews"}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {(activeTable === "subscribers" ? insights.topBySubscribers : insights.topByReviews).map((p, i) => (
              <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-bold text-gray-300 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.location}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Subscribers</p>
                    <p className="text-sm font-semibold text-gray-900">{p.subscribers.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Reviews</p>
                    <p className="text-sm font-semibold text-gray-900">{p.reviewCount.toLocaleString()}</p>
                  </div>
                  {p.rating && (
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-medium text-amber-700">{p.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
