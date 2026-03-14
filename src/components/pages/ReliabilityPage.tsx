"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Star, AlertTriangle, TrendingUp, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Resource = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  zipCode: string | null;
  type: string | null;
  ratingAverage: number | null;
  waitTime: number | null;
  subscribers: number;
  reviews: number;
  daysCovered: number;
  feedbackScore: number;
  consistencyScore: number;
  reliabilityScore: number;
  badge: string;
  badgeColor: string;
  highPriority?: boolean;
};

type HistogramBucket = {
  range: string;
  count: number;
};

type Summary = {
  excellent: number;
  good: number;
  atRisk: number;
  avgScore: number;
  histogram: HistogramBucket[];
};

type ReliabilityData = {
  resources: Resource[];
  summary: Summary;
};

const PAGE_SIZE = 20;

function getBarColor(range: string): string {
  const start = parseInt(range.split("-")[0], 10);
  if (start < 40) return "#EF5350";
  if (start < 60) return "#FFA726";
  return "#2E7D32";
}

function ScoreBadge({ score, badge }: { score: number; badge: string }) {
  let cls = "bg-green-100 text-green-700";
  if (badge === "Good") cls = "bg-yellow-100 text-yellow-700";
  if (badge === "At Risk") cls = "bg-red-100 text-red-700";
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {score}
    </span>
  );
}

function KPICard({
  title,
  value,
  badgeLabel,
  badgeCls,
  icon: Icon,
  sub,
}: {
  title: string;
  value: number | string;
  badgeLabel?: string;
  badgeCls?: string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-400" />
        <p className="text-sm text-gray-600">{title}</p>
        {badgeLabel && (
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
            {badgeLabel}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function ReliabilityPage() {
  const [data, setData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/reliability")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const highPriority = useMemo(
    () => (data?.resources ?? []).filter((r) => r.highPriority === true),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.resources ?? [];
    return (data?.resources ?? []).filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Reliability Scores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resource reliability based on community feedback and consistency of service
        </p>
      </div>

      {/* Section 1: KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-4 gap-6">
          <KPICard
            title="Excellent"
            value={data.summary.excellent.toLocaleString()}
            badgeLabel="≥ 75"
            badgeCls="bg-green-100 text-green-700"
            icon={TrendingUp}
            sub="Score 75–100"
          />
          <KPICard
            title="Good"
            value={data.summary.good.toLocaleString()}
            badgeLabel="50–74"
            badgeCls="bg-yellow-100 text-yellow-700"
            icon={Star}
            sub="Score 50–74"
          />
          <KPICard
            title="At Risk"
            value={data.summary.atRisk.toLocaleString()}
            badgeLabel="< 50"
            badgeCls="bg-red-100 text-red-700"
            icon={AlertTriangle}
            sub="Score below 50"
          />
          <KPICard
            title="Average Score"
            value={data.summary.avgScore.toFixed(1)}
            icon={Star}
            sub="Across all resources"
          />
        </div>
      )}

      {/* Section 2: Score Distribution Histogram */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-gray-900">Reliability Score Distribution</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Count of resources in each score band (0–100)
          </p>
        </div>
        {loading ? (
          <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.summary.histogram ?? []} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="range" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [`${v} resources`, "Count"]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {(data?.summary.histogram ?? []).map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.range)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section 3: High Priority Interventions */}
      {!loading && highPriority.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-gray-900">High Priority — High Need, Low Reliability</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Resources with 100+ subscribers but score below 50. These need immediate attention.
              </p>
            </div>
            <span className="ml-auto text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {highPriority.length} flagged
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">City</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Score</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Subscribers</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {highPriority.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{r.name}</p>
                      {r.type && (
                        <p className="text-xs text-gray-400 mt-0.5">{r.type}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.city ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {r.reliabilityScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {r.subscribers.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {r.ratingAverage != null ? (
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-sm text-gray-700">{r.ratingAverage.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Full Leaderboard */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-gray-900">Full Reliability Leaderboard</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              All resources sorted by reliability score — highest first
            </p>
          </div>
          <div className="relative flex-shrink-0 w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or city…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-3 w-12">Rank</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">City / Borough</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Score</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Rating</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Days Covered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageSlice.map((r, idx) => {
                    const rank = (page - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <span className="text-sm font-bold text-gray-300">{rank}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 max-w-xs truncate">{r.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.city ?? "—"}</td>
                        <td className="px-4 py-3">
                          {r.type ? (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {r.type}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={r.reliabilityScore} badge={r.badge} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.ratingAverage != null ? (
                            <div className="flex items-center justify-end gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-sm text-gray-700">{r.ratingAverage.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-gray-600">
                          {r.daysCovered} / 7
                        </td>
                      </tr>
                    );
                  })}
                  {pageSlice.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                        No resources match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length.toLocaleString()} resources
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
