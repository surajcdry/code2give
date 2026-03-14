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
  reliabilityScore?: number;
  badge?: string;
  badgeColor?: string;
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

type TrendsData = {
  boroughs: {
    borough: string; total: number; published: number; unavailable: number;
    avgRating: number | null; avgWait: number | null;
  }[];
  topEngaged: {
    id: string; name: string; city: string | null; subscribers: number;
    reviews: number; rating: number | null; type: string | null;
  }[];
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

// ── Filter options ─────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: "default",         label: "Default (by priority)" },
  { value: "top_rated",       label: "Top Rated" },
  { value: "needs_attention", label: "Needs Attention (low rating)" },
  { value: "most_subscribed", label: "Most Subscribed" },
  { value: "most_reviewed",   label: "Most Reviewed" },
] as const;

type FilterValue = typeof FILTER_OPTIONS[number]["value"];

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Sub-components ─────────────────────────────────────────────────────────────
function PantryMapCard() {
  const [tab, setTab] = useState<"locations" | "coverage">("locations");
  const [selected, setSelected] = useState<Pantry | null>(null);
  const [filter, setFilter] = useState<FilterValue>("default");
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    fetch(`/api/map-data?filter=${filter}`)
      .then(r => r.json())
      .then(d => setPantries(d.pantries || []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="col-span-2 bg-card rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 gap-4">
        <div>
          <h2 className="text-gray-900">Active Pantry Locations</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? "Loading…" : `Top 500 · ${FILTER_OPTIONS.find(o => o.value === filter)?.label}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterValue)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
              icon={getMarkerIcon(p.badge)}
            >
              {selected?.id === p.id && (
                <InfoWindow onCloseClick={() => setSelected(null)}>
                  <div className="w-44">
                    <p className="font-semibold text-sm mb-1">{p.name}</p>
                    <p className="text-xs text-gray-500 mb-1">{p.description}</p>
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

function RatingChart({
  data, title, subtitle,
}: {
  data: Insights["ratingDistribution"];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">{title ?? "Rating Distribution"}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {subtitle ?? "Published resources with ratings (scale 1–5)"}
        </p>
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

function WaitTimeChart({
  data, title, subtitle,
}: {
  data: Insights["waitTimeDistribution"];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">{title ?? "Wait Time Distribution"}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {subtitle ?? "Published resources · outliers (>240 min) excluded"}
        </p>
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

function TypeBreakdownChart({
  data, title, subtitle,
}: {
  data: Insights["typeBreakdown"];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-gray-900">{title ?? "Resource Type Breakdown"}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {subtitle ?? "All NYC metro food resources"}
        </p>
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

// ── Role-specific chart sections ───────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function InternalCharts({ insights }: { insights: Insights }) {
  const [activeTable, setActiveTable] = useState<"reviews" | "subscribers">("subscribers");

  return (
    <>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">System Health View</p>
      <div className="grid grid-cols-3 gap-6">
        <TypeBreakdownChart data={insights.typeBreakdown} />
        <RatingChart data={insights.ratingDistribution} />
        <WaitTimeChart data={insights.waitTimeDistribution} />
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 mt-6">
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
    </>
  );
}

function DonorCharts({
  insights,
  trends,
}: {
  insights: Insights;
  trends: TrendsData | null;
}) {
  const boroughData = (trends?.boroughs ?? []).map(b => ({
    borough: b.borough,
    unavailable: b.unavailable,
  }));

  const zipRows = (insights.zipHotspots ?? []).slice(0, 8);
  const topSubscribers = (insights.topBySubscribers ?? []).slice(0, 5);

  return (
    <>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Donor Intelligence View</p>

      {/* Chart 1: Borough Availability Gap — full width */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-gray-900">Unavailable Resources by Borough</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Where food access gaps are largest — highest impact for donations
          </p>
        </div>
        {trends ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={boroughData} layout="vertical" barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis
                type="category"
                dataKey="borough"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                width={110}
              />
              <Tooltip
                formatter={(v) => [`${Number(v ?? 0).toLocaleString()} resources`, "Unavailable"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="unavailable" fill="#E53935" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] bg-gray-100 rounded animate-pulse" />
        )}
      </div>

      {/* Chart 2 + 3 side by side */}
      <div className="grid grid-cols-2 gap-6">
        {/* High-Need Zip Codes */}
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900">High-Activity Zip Codes</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Areas with the most food resources — indicating high demand
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-2 grid grid-cols-3 gap-4">
              <span className="text-xs font-medium text-gray-500">Zip Code</span>
              <span className="text-xs font-medium text-gray-500 text-center">Total Resources</span>
              <span className="text-xs font-medium text-gray-500 text-right">Activity</span>
            </div>
            {zipRows.map((z, i) => (
              <div key={i} className="px-6 py-2.5 grid grid-cols-3 gap-4 items-center hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium text-gray-900">{z.zip}</span>
                <span className="text-sm text-gray-700 text-center">{z.count.toLocaleString()}</span>
                <div className="flex justify-end">
                  {z.count > 5 ? (
                    <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      High Activity
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pantries by Community Trust */}
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900">Most Trusted Pantries</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Highest subscriber count — community-validated resources
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-2 grid grid-cols-3 gap-4">
              <span className="text-xs font-medium text-gray-500 col-span-1">Name</span>
              <span className="text-xs font-medium text-gray-500 text-center">Subscribers</span>
              <span className="text-xs font-medium text-gray-500 text-right">Rating</span>
            </div>
            {topSubscribers.map((p, i) => (
              <div key={i} className="px-6 py-2.5 grid grid-cols-3 gap-4 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.location}</p>
                </div>
                <span className="text-sm text-gray-700 text-center">{p.subscribers.toLocaleString()}</span>
                <div className="flex justify-end">
                  {p.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-gray-600">{p.rating}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function GovernmentCharts({
  insights,
  trends,
}: {
  insights: Insights;
  trends: TrendsData | null;
}) {
  const boroughStatusData = (trends?.boroughs ?? []).map(b => ({
    borough: b.borough,
    published: b.published,
    unavailable: b.unavailable,
  }));

  return (
    <>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Coverage &amp; Equity View</p>

      {/* Chart 1: Published vs Unavailable by Borough — full width */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-gray-900">Resource Status by Borough</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Published vs unavailable resources across NYC boroughs
          </p>
        </div>
        {trends ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={boroughStatusData} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="borough" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip
                formatter={(v, name) => [
                  `${Number(v ?? 0).toLocaleString()} resources`,
                  String(name).charAt(0).toUpperCase() + String(name).slice(1),
                ]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Bar dataKey="published" name="Published" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              <Bar dataKey="unavailable" name="Unavailable" fill="#EF5350" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] bg-gray-100 rounded animate-pulse" />
        )}
      </div>

      {/* Chart 2 + 3 side by side */}
      <div className="grid grid-cols-2 gap-6">
        <RatingChart
          data={insights.ratingDistribution}
          title="Rating Distribution Across NYC"
          subtitle="How evenly quality is distributed — low ratings indicate service gaps"
        />
        <WaitTimeChart
          data={insights.waitTimeDistribution}
          title="Wait Time Distribution"
          subtitle="Long wait times indicate understaffed or overloaded resources"
        />
      </div>
    </>
  );
}

function ProviderCharts({
  insights,
  trends,
}: {
  insights: Insights;
  trends: TrendsData | null;
}) {
  const avgRatingData = (trends?.boroughs ?? [])
    .filter(b => b.avgRating != null)
    .map(b => ({ borough: b.borough, avgRating: Number(b.avgRating!.toFixed(2)) }));

  const topEngaged = (trends?.topEngaged ?? []).slice(0, 5);

  return (
    <>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">NYC Benchmarks View</p>

      <div className="grid grid-cols-3 gap-6">
        {/* Chart 1: Average Rating by Borough */}
        <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-gray-900">Average Rating by Borough</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              How your community compares to NYC averages
            </p>
          </div>
          {trends ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={avgRatingData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="borough" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  formatter={(v) => [`${v} / 5`, "Avg Rating"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="avgRating" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] bg-gray-100 rounded animate-pulse" />
          )}
        </div>

        {/* Chart 3: Resource Type Breakdown */}
        <TypeBreakdownChart
          data={insights.typeBreakdown}
          title="NYC Resource Mix"
          subtitle="Types of food resources available across the city"
        />

        {/* Chart 2: Top Pantries by Engagement */}
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900">Community Engagement Leaders</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              The most active resources in NYC — benchmark targets
            </p>
          </div>
          {trends ? (
            <div className="divide-y divide-gray-100">
              <div className="px-4 py-2 grid grid-cols-5 gap-2">
                <span className="text-xs font-medium text-gray-500 col-span-2">Name</span>
                <span className="text-xs font-medium text-gray-500 text-center">City</span>
                <span className="text-xs font-medium text-gray-500 text-center">Subs</span>
                <span className="text-xs font-medium text-gray-500 text-right">Rating</span>
              </div>
              {topEngaged.map((p, i) => (
                <div key={i} className="px-4 py-2.5 grid grid-cols-5 gap-2 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-2 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.reviews} reviews</p>
                  </div>
                  <span className="text-xs text-gray-600 text-center truncate">{p.city ?? "—"}</span>
                  <span className="text-xs text-gray-700 text-center">{p.subscribers.toLocaleString()}</span>
                  <div className="flex justify-end">
                    {p.rating != null ? (
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-600">{p.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 bg-gray-100 rounded animate-pulse m-4" />
          )}
        </div>
      </div>
    </>
  );
}

function RoleCharts({
  role,
  insights,
  trends,
}: {
  role: string | undefined;
  insights: Insights | null;
  trends: TrendsData | null;
}) {
  if (!insights) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  switch (role) {
    case "internal":
      return <InternalCharts insights={insights} />;
    case "donor":
      return <DonorCharts insights={insights} trends={trends} />;
    case "government":
      return <GovernmentCharts insights={insights} trends={trends} />;
    case "provider":
      return <ProviderCharts insights={insights} trends={trends} />;
    default:
      return <InternalCharts insights={insights} />;
  }
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
  const [totalPantries, setTotalPantries] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);

  useEffect(() => {
    fetch("/api/map-data").then(r => r.json()).then(d => {
      setTotalPantries(d.totalPantries ?? d.pantries?.length ?? 0);
    });
    fetch("/api/insights").then(r => r.json()).then(setInsights);
    fetch("/api/trends").then(r => r.json()).then(d => {
      setTrends({
        boroughs: d.boroughs ?? [],
        topEngaged: d.topEngaged ?? [],
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6">
        <KPIs role={role} insights={insights} totalPantries={totalPantries} />
      </div>

      {/* Map + Status */}
      <div className="grid grid-cols-3 gap-6">
        <PantryMapCard />
        {insights && <StatusCard insights={insights} />}
      </div>

      {/* Role-specific charts */}
      <RoleCharts role={role} insights={insights} trends={trends} />
    </div>
  );
}
