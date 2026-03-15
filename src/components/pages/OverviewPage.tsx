"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { GoogleMap, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import {
  MapPin, Clock, AlertTriangle, Users, Star, BarChart3, TrendingDown, Maximize2, Search
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { OpenMapButton } from "@/components/dashboard/OpenMapButton";

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
function getMarkerIcon(badge?: string): any {
  const colors: Record<string, string> = {
    Excellent: "#2E7D32",
    Good:      "#F9A825",
    "At Risk": "#E53935",
  };
  const color = colors[badge ?? ""] ?? "#42A5F5";
  return {
    path: "M 0, 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0",
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 0.8, // Slightly smaller for preview
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * UPDATED: PantryMapCard now functions as an interactive preview box
 * clicking the map triggers navigation to the full map page.
 */
function PantryMapCard() {
  const { setPage } = useApp();
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/map-data?filter=default`)
      .then(r => r.json())
      .then(d => setPantries(d.pantries?.slice(0, 40) || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="col-span-2 bg-card rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col group relative transition-all hover:border-primary/50">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 z-20 bg-white">
        <div>
          <h2 className="text-gray-900 font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Active Pantry Locations
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Click map to enter full interactive resource view
          </p>
        </div>
        <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
          <Maximize2 className="w-4 h-4 text-gray-400 group-hover:text-primary" />
        </div>
      </div>

      {/* Clickable Action Layer */}
      <button 
        onClick={() => setPage("map")} 
        className="absolute inset-0 z-30 w-full h-full cursor-pointer flex items-center justify-center"
        aria-label="Open full map"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/5 absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-white px-6 py-3 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-gray-900">Explore Interactive Map</span>
          </div>
        </div>
      </button>

      {/* Visual Background Map */}
      <div className="h-95 pointer-events-none grayscale-30 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
        <GoogleMap
          mapContainerStyle={MAP_STYLE}
          center={NYC_CENTER}
          zoom={11}
          options={{ 
            disableDefaultUI: true, 
            gestureHandling: "none",
            styles: [{ featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] }] 
          }}
        >
          {pantries.map((p) => (
            <Marker
              key={p.id}
              position={{ lat: p.latitude, lng: p.longitude }}
              icon={getMarkerIcon(p.badge)}
            />
          ))}
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
        <h3 className="text-gray-900 font-bold">Resource Status</h3>
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
        <h3 className="text-gray-900 font-bold">{title ?? "Rating Distribution"}</h3>
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
        <h3 className="text-gray-900 font-bold">{title ?? "Wait Time Distribution"}</h3>
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
        <h3 className="text-gray-900 font-bold">{title ?? "Resource Type Breakdown"}</h3>
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
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-bold">System Health View</p>
      <div className="grid grid-cols-3 gap-6">
        <TypeBreakdownChart data={insights.typeBreakdown} />
        <RatingChart data={insights.ratingDistribution} />
        <WaitTimeChart data={insights.waitTimeDistribution} />
      </div>
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900 font-bold">Top Pantries by Engagement</h3>
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
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-bold">Donor Intelligence View</p>
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-gray-900 font-bold">Unavailable Resources by Borough</h3>
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
          <div className="h-55 bg-gray-100 rounded animate-pulse" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900 font-bold">High-Activity Zip Codes</h3>
            <p className="text-xs text-gray-400 mt-0.5">Areas indication high demand</p>
          </div>
          <div className="divide-y divide-gray-100">
            {zipRows.map((z, i) => (
              <div key={i} className="px-6 py-2.5 grid grid-cols-3 gap-4 items-center hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium text-gray-900">{z.zip}</span>
                <span className="text-sm text-gray-700 text-center">{z.count.toLocaleString()}</span>
                <div className="flex justify-end">
                  {z.count > 5 ? (
                    <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">High Activity</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900 font-bold">Most Trusted Pantries</h3>
            <p className="text-xs text-gray-400 mt-0.5">Community-validated resources</p>
          </div>
          <div className="divide-y divide-gray-100">
            {topSubscribers.map((p, i) => (
              <div key={i} className="px-6 py-2.5 grid grid-cols-3 gap-4 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                </div>
                <span className="text-sm text-gray-700 text-center">{p.subscribers.toLocaleString()}</span>
                <div className="flex justify-end">
                  {p.rating ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-gray-600">{p.rating}</span>
                    </div>
                  ) : <span className="text-xs text-gray-400">—</span>}
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
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-bold">Coverage & Equity View</p>
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-gray-900 font-bold">Resource Status by Borough</h3>
          <p className="text-xs text-gray-400 mt-0.5">Published vs unavailable resources across NYC</p>
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
        ) : <div className="h-60 bg-gray-100 rounded animate-pulse" />}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <RatingChart data={insights.ratingDistribution} />
        <WaitTimeChart data={insights.waitTimeDistribution} />
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
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-bold">NYC Benchmarks View</p>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-gray-900 font-bold">Average Rating by Borough</h3>
          </div>
          {trends ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={avgRatingData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="borough" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="avgRating" fill="#2E7D32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-50 bg-gray-100 rounded animate-pulse" />}
        </div>
        <TypeBreakdownChart data={insights.typeBreakdown} />
        <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-gray-900 font-bold mb-4">Engagement Leaders</h3>
          {trends ? (
            <div className="space-y-3">
              {topEngaged.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="truncate w-32 font-medium">{p.name}</span>
                  <span className="text-gray-500">{p.subscribers} subs</span>
                </div>
              ))}
            </div>
          ) : <div className="h-48 bg-gray-100 rounded animate-pulse" />}
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
  if (!insights) return <ChartSkeleton />;
  switch (role) {
    case "internal": return <InternalCharts insights={insights} />;
    case "donor": return <DonorCharts insights={insights} trends={trends} />;
    case "government": return <GovernmentCharts insights={insights} trends={trends} />;
    case "provider": return <ProviderCharts insights={insights} trends={trends} />;
    default: return <InternalCharts insights={insights} />;
  }
}

function KPIs({ role, insights, totalPantries }: {
  role: string | undefined;
  insights: Insights | null;
  totalPantries: number;
}) {
  if (!insights) return <div className="col-span-4 h-24 bg-gray-50 rounded-lg animate-pulse" />;
  const { summary } = insights;
  const gap = Math.round((summary.unavailable / summary.total) * 100);

  const governmentKPIs = [
    { title: "Total Resources Mapped", value: summary.total.toLocaleString(), icon: MapPin, subtitle: "NYC Metro area" },
    { title: "Service Gaps", value: `${gap}%`, icon: TrendingDown, subtitle: `${summary.unavailable.toLocaleString()} unavailable` },
    { title: "Avg Community Rating", value: summary.avgRating.toFixed(2), icon: BarChart3, subtitle: "Out of 5.0" },
    { title: "Engagement", value: summary.hasSubscribers.toLocaleString(), icon: Users, subtitle: "Active followers" },
  ];

  const defaultKPIs = [
    { title: "Published Resources", value: summary.published.toLocaleString(), icon: MapPin, subtitle: "Active on map" },
    { title: "Gap", value: `${gap}%`, icon: AlertTriangle, subtitle: "Need review" },
    { title: "Rating", value: summary.avgRating.toFixed(2), icon: Star, subtitle: "Avg score" },
    { title: "Wait Time", value: `${summary.medianWaitMinutes} min`, icon: Clock, subtitle: "Median" },
  ];

  const activeKPIs = role === "government" ? governmentKPIs : defaultKPIs;

  return (
    <>
      {activeKPIs.map((k, i) => <KPICard key={i} {...k} />)}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function OverviewPage() {
  const { role } = useApp();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);

  useEffect(() => {
    fetch("/api/insights").then(r => r.json()).then(setInsights);
    fetch("/api/trends").then(r => r.json()).then(d => {
      setTrends({ boroughs: d.boroughs ?? [], topEngaged: d.topEngaged ?? [] });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <KPIs role={role} insights={insights} totalPantries={insights?.summary?.total ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <PantryMapCard />
        {insights && <StatusCard insights={insights} />}
      </div>

      <RoleCharts role={role} insights={insights} trends={trends} />
    </div>
  );
}