"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Star, TrendingUp, AlertCircle, Search, X, Download } from "lucide-react";
import { downloadFullReport } from "@/utils/exportReport";
// ─── Types ────────────────────────────────────────────────────────────────────

type ReliabilitySummary = {
  excellent: number;
  good: number;
  atRisk: number;
  avgScore: number;
  histogram: { range: string; count: number }[];
};

type ResourceRow = {
  id: string;
  name: string;
  waitTime: number | null;
  ratingAverage: number | null;
  reliabilityScore: number;
  badge: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  FOOD_PANTRY:      "#FFCC10",
  SOUP_KITCHEN:     "#000000",
  COMMUNITY_FRIDGE: "#2E7D32",
};

const getRelColor = (range: string) => {
  const start = parseInt(range.split("-")[0], 10);
  if (start < 40) return "#EF5350";
  if (start < 60) return "#FFA726";
  return "#2E7D32";
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [reliability, setReliability] = useState<ReliabilitySummary | null>(null);
  const [allResources, setAllResources] = useState<ResourceRow[]>([]);
  const [boroughData, setBoroughData] = useState<{ name: string; rating: number }[]>([]);
  const [resourceMix, setResourceMix] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pantrySearch, setPantrySearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/reliability").then(r => r.json()),
      fetch("/api/trends").then(r => r.json()),
      fetch("/api/insights").then(r => r.json()),
    ]).then(([relData, trendsData, insightsData]) => {
      setReliability(relData.summary ?? null);

      const rows: ResourceRow[] = (relData.resources ?? [])
        .filter((r: ResourceRow) => r.waitTime != null)
        .sort((a: ResourceRow, b: ResourceRow = { waitTime: 0 } as any) => (b.waitTime ?? 0) - (a.waitTime ?? 0));
      setAllResources(rows);

      const boroughs = (trendsData.boroughs ?? [])
        .filter((b: any) => b.avgRating != null)
        .map((b: any) => ({ name: b.borough, rating: parseFloat(b.avgRating.toFixed(2)) }));
      setBoroughData(boroughs);

      const mix = (insightsData.typeBreakdown ?? []).map((t: any) => ({
        name: t.name,
        value: t.count,
        color: TYPE_COLORS[t.type] ?? "#9ca3af",
      }));
      setResourceMix(mix);

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const displayedResources = useMemo(() => {
    if (pantrySearch.trim()) {
      return allResources.filter(r =>
        r.name.toLowerCase().includes(pantrySearch.toLowerCase())
      );
    }
    return allResources.slice(0, 5);
  }, [allResources, pantrySearch]);

  return (
    <div id="analytics-report-content" className="space-y-8 p-6 bg-white">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics</h1>
        
        {/* PDF Download Button - Added here */}
        <button 
          onClick={() => downloadFullReport(displayedResources, "Analytics")}
          className="flex items-center gap-2 bg-black text-[#FFCC10] px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all active:scale-95"
        >
          <Download size={18} />
          Export PDF
        </button>
      </header>

      {/* ── Reliability Dashboard ── */}
      <section className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFCC10] p-2 rounded-xl">
            <Star className="w-5 h-5 text-black" fill="currentColor" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Reliability Infrastructure</h2>
            <p className="text-xs text-gray-400 font-medium">Real-time scoring of resource uptime and community trust</p>
          </div>
        </div>

        {loading || !reliability ? (
          <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Excellent", val: reliability.excellent, color: "text-green-600" },
                { label: "Good",      val: reliability.good,      color: "text-yellow-500" },
                { label: "At Risk",   val: reliability.atRisk,    color: "text-red-500" },
                { label: "Avg Score", val: reliability.avgScore,  color: "text-black", bg: "bg-gray-50" },
              ].map(stat => (
                <div key={stat.label} className={`p-5 rounded-2xl border border-gray-50 ${stat.bg ?? "bg-white"}`}>
                  <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 h-48">
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-4">Score Distribution</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reliability.histogram}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {reliability.histogram.map((entry, i) => (
                      <Cell key={i} fill={getRelColor(entry.range)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ── Borough & Mix Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-8 text-gray-900">Avg Rating by Borough</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={boroughData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} domain={[0, 5]} />
                  <Tooltip cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="rating" fill="#2E7D32" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-8 text-gray-900">Resource Type Mix</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <div className="h-64 flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={resourceMix} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {resourceMix.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {resourceMix.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Wait Time vs Rating Table ── */}
      <section className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tighter">Wait Time vs. Rating</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Identifying sites requiring immediate intervention</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search pantry…"
                value={pantrySearch}
                onChange={e => setPantrySearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none w-full placeholder:text-gray-400"
              />
              {pantrySearch && (
                <button onClick={() => setPantrySearch("")}>
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <TrendingUp className="text-gray-200 shrink-0" size={32} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                {["Pantry Name", "Avg Wait", "Rating", "Operational Status"].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : displayedResources.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-sm text-gray-400">
                  {pantrySearch ? `No pantries found matching "${pantrySearch}".` : "No data available."}
                </td></tr>
              ) : displayedResources.map(r => {
                const isCrisis = r.badge === "At Risk";
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-6 font-bold text-gray-800">{r.name}</td>
                    <td className={`px-8 py-6 font-black italic ${isCrisis ? "text-red-500" : "text-gray-700"}`}>
                      {r.waitTime != null ? `${Math.round(r.waitTime)} min` : "—"}
                    </td>
                    <td className="px-8 py-6">
                      {r.ratingAverage != null ? (
                        <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-xl w-fit text-xs font-black">
                          <Star size={12} fill="currentColor" /> {r.ratingAverage.toFixed(1)}
                        </div>
                      ) : <span className="text-gray-400 text-xs">No rating</span>}
                    </td>
                    <td className="px-8 py-6">
                      {isCrisis ? (
                        <span className="text-red-600 font-black italic text-[10px] uppercase flex items-center gap-2 bg-red-50 w-fit px-3 py-1 rounded-full">
                          <AlertCircle size={14} /> Crisis Zone
                        </span>
                      ) : (
                        <span className={`font-black italic text-[10px] uppercase flex items-center gap-2 w-fit px-3 py-1 rounded-full ${
                          r.badge === "Excellent" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
                        }`}>
                          {r.badge}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!pantrySearch && allResources.length > 5 && (
            <p className="text-center text-[11px] text-gray-400 py-4">
              Showing top 5 — search by name to find any pantry
            </p>
          )}
        </div>
      </section>
    </div>
  );
}