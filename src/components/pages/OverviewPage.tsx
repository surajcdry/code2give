"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  MapPin, Clock, AlertTriangle, Users, Star, BarChart3, TrendingDown, ChevronRight, Search
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
const TYPE_COLORS: Record<string, string> = {
  FOOD_PANTRY: "#2E7D32",
  SOUP_KITCHEN: "#42A5F5",
  COMMUNITY_FRIDGE: "#FFA726",
};
const STATUS_COLORS = { PUBLISHED: "#2E7D32", UNAVAILABLE: "#EF5350" };

// ── Sub-components ─────────────────────────────────────────────────────────────
/**
 * UPDATED: PantryMapCard - Professional CTA design with neutral background
 */
function PantryMapCard() {
  const { setPage } = useApp();

  return (
    <div className="col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group relative transition-all hover:shadow-xl hover:border-primary/40">
      {/* Background decoration - subtle gray */}
      <div className="absolute top-10 right-10 opacity-[0.02] pointer-events-none group-hover:scale-105 transition-transform duration-700 text-gray-900">
        <MapPin size={240} strokeWidth={1} />
      </div>

      <div className="flex flex-col items-center justify-center h-full min-h-80 p-10 text-center space-y-8 relative z-10">
        <div className="relative">
          {/* Neutral gray background for the icon instead of purple */}
          <div className="bg-gray-100 p-5 rounded-3xl relative">
            <MapPin className="w-12 h-12 text-primary" strokeWidth={2.5} />
          </div>
        </div>
        
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
            Active Pantry <span className="text-primary">Locations</span>
          </h2>
          <p className="text-gray-500 mt-2 font-medium">Explore the full network of food resources</p>
        </div>

        <button 
          onClick={() => setPage("map")} 
          className="group/btn bg-gray-900 text-[#FFCC10] px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-lg active:scale-95 border border-transparent"
        >
          <Search className="w-4 h-4" />
          Enter Interactive Map
          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
        
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Click to enter full resource view
        </p>
      </div>
    </div>
  );
}


function StatusCard({ insights }: { insights: Insights | null }) {
  if (!insights || !insights.summary) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-80 animate-pulse flex items-center justify-center">
        <div className="text-gray-300 font-bold uppercase tracking-widest text-xs">Loading Status...</div>
      </div>
    );
  }

  const { published, unavailable, total } = insights.summary;
  const publishedPct = total > 0 ? Math.round((published / total) * 100) : 0;
  const unavailablePct = total > 0 ? Math.round((unavailable / total) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-80">
      <div className="mb-2">
        <h3 className="text-gray-900 font-bold text-lg">Resource Status</h3>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Live Coverage Breakdown</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={[
                { name: "Published", value: published },
                { name: "Unavailable", value: unavailable },
              ]}
              cx="50%" cy="50%" innerRadius={40} outerRadius={55} dataKey="value" paddingAngle={8}
            >
              <Cell fill={STATUS_COLORS.PUBLISHED} stroke="none" />
              <Cell fill={STATUS_COLORS.UNAVAILABLE} stroke="none" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-100">
          <p className="text-2xl font-black text-green-700">{publishedPct}%</p>
          <p className="text-[9px] font-bold text-green-600 uppercase">Active</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center border border-red-100">
          <p className="text-2xl font-black text-red-600">{unavailablePct}%</p>
          <p className="text-[9px] font-bold text-red-500 uppercase">Gap</p>
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
        <BarChart data={data || []} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            formatter={(v) => [`${v} resources`, "Count"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {(data || []).map((_, i) => (
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
        <BarChart data={data || []} barSize={40}>
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
        <BarChart data={data || []} layout="vertical" barSize={20}>
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
            {(data || []).map((d, i) => (
              <Cell key={i} fill={TYPE_COLORS[d.type] ?? "#9ca3af"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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
          {((activeTable === "subscribers" ? insights.topBySubscribers : insights.topByReviews) || []).map((p, i) => (
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
      
      {/* Combined Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Resource Status by Borough */}
        <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">Resource Status by Borough</h3>
            <p className="text-[10px] text-gray-400">Published vs unavailable</p>
          </div>
          {trends ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={boroughStatusData} barSize={12} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="borough" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: 8 }} />
                <Bar dataKey="published" name="Pub" fill="#2E7D32" radius={[2, 2, 0, 0]} />
                <Bar dataKey="unavailable" name="Unav" fill="#EF5350" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-45 bg-gray-100 rounded animate-pulse" />}
        </div>

        {/* 2. Rating Distribution */}
        <RatingChart 
          data={insights.ratingDistribution} 
          title="Rating Distribution" 
          subtitle="Scale 1-5"
        />

        {/* 3. Wait Time Distribution */}
        <WaitTimeChart 
          data={insights.waitTimeDistribution} 
          title="Wait Time Distribution" 
          subtitle="Outliers excluded"
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

function KPIs({ role, insights }: { role: string | undefined; insights: any }) {
  if (!insights || !insights.summary) {
    return <div className="col-span-4 h-24 bg-gray-50 rounded-lg animate-pulse" />;
  }
  const { summary } = insights;
  const gap = Math.round((summary.unavailable / summary.total) * 100);

  const governmentKPIs = [
    { title: "Total Resources Mapped", value: summary.total.toLocaleString(), icon: MapPin, subtitle: "NYC Metro area" },
    { title: "Service Gaps", value: `${gap}%`, icon: TrendingDown, subtitle: `${summary.unavailable.toLocaleString()} unavailable` },
    { title: "Avg Community Rating", value: summary.avgRating.toFixed(2), icon: BarChart3, subtitle: "Out of 5.0" },
    { title: "Engagement", value: summary.hasSubscribers.toLocaleString(), icon: Users, subtitle: "Active followers" },
  ];

  const defaultKPIs = [
    { title: "Published Resources", value: (summary.published || 0).toLocaleString(), icon: MapPin, subtitle: "Active on map" },
    { title: "Gap", value: `${gap}%`, icon: AlertTriangle, subtitle: "Need review" },
    { title: "Rating", value: (summary.avgRating || 0).toFixed(2), icon: Star, subtitle: "Avg score" },
    { title: "Wait Time", value: `${summary.medianWaitMinutes || 0} min`, icon: Clock, subtitle: "Median" },
  ];

  const activeKPIs = role === "government" ? governmentKPIs : defaultKPIs;
  return <>{activeKPIs.map((k, i) => <KPICard key={i} {...k} />)}</>;
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
      setTrends({ boroughs: d.boroughs ?? [], topEngaged: d.topEngaged ?? [] });
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Cards Row */}
      <div className="grid grid-cols-4 gap-6">
        <KPIs role={role} insights={insights} />
      </div>

      {/* REMOVED: The grid containing PantryMapCard and StatusCard 
      */}

      {/* 2. Role-Specific Charts (System Health, Donor Intelligence, etc.) */}
      <RoleCharts role={role} insights={insights} trends={trends} />
    </div>
  );
}