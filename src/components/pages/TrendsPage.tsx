"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
// ─── Types ────────────────────────────────────────────────────────────────────

interface Borough {
  borough: string;
  total: number;
  published: number;
  unavailable: number;
  avgRating: number | null;
  avgWait: number | null;
}

interface QuadrantPoint {
  id: string;
  name: string;
  city: string;
  rating: number;
  waitTime: number;
  subscribers: number;
  type: string;
}

interface TopEngaged {
  id: string;
  name: string;
  city: string;
  subscribers: number;
  reviews: number;
  rating: number | null;
  type: string;
}

interface ResourceType {
  type: string;
  count: number;
}

interface TrendsData {
  boroughs: Borough[];
  quadrant: QuadrantPoint[];
  topEngaged: TopEngaged[];
  resourceTypes: ResourceType[];
}

interface ReliabilityResource {
  id: string;
  name: string;
  city: string | null;
  ratingAverage: number | null;
  waitTime: number | null;
  subscribers: number;
  reliabilityScore: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getQuadrant(waitTime: number, rating: number) {
  const lowWait = waitTime <= 30;
  const highRating = rating >= 2.0;

  if (lowWait && highRating) return { label: "Model Pantries", color: "#2E7D32" };
  if (!lowWait && !highRating) return { label: "Crisis Zone", color: "#E53935" };
  if (!lowWait && highRating) return { label: "Busy but Valued", color: "#FB8C00" };
  return { label: "Fast but Poor", color: "#9E9E9E" };
}

// ─── Custom Scatter Dot ───────────────────────────────────────────────────────

function QuadrantDot(props: {
  cx?: number;
  cy?: number;
  payload?: QuadrantPoint;
  fill?: string;
}) {
  const { cx, cy, fill } = props;
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill={fill} fillOpacity={0.8} stroke="white" strokeWidth={1} />;
}

// ─── Tooltip render props shape (passed by Recharts) ─────────────────────────

interface RTooltipEntry {
  name?: string;
  color?: string;
  value?: number | string;
  payload?: QuadrantPoint;
}

interface RTooltipProps {
  active?: boolean;
  payload?: RTooltipEntry[];
  label?: string;
}

// ─── Custom Tooltip for Scatter ───────────────────────────────────────────────

function ScatterTooltip({ active, payload }: RTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const q = getQuadrant(d.waitTime, d.rating);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
      <p className="text-gray-500">{d.city}</p>
      <p className="text-gray-700 mt-1">Wait: <span className="font-medium">{d.waitTime} min</span></p>
      <p className="text-gray-700">Rating: <span className="font-medium">{Number(d.rating).toFixed(2)}</span></p>
      <p className="mt-1" style={{ color: q.color }}>{q.label}</p>
    </div>
  );
}

// ─── Custom Tooltip for Borough BarChart ──────────────────────────────────────

function BoroughTooltip({ active, payload, label }: RTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="mt-0.5">
          {entry.name}: <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Quadrant Legend ──────────────────────────────────────────────────────────

const QUADRANT_LEGEND = [
  { label: "Model Pantries", color: "#2E7D32", desc: "Low wait, high rating" },
  { label: "Busy but Valued", color: "#FB8C00", desc: "High wait, high rating" },
  { label: "Crisis Zone", color: "#E53935", desc: "High wait, low rating" },
  { label: "Fast but Poor", color: "#9E9E9E", desc: "Low wait, low rating" },
];

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ChartSkeleton({ height = 350 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-lg bg-gray-100 animate-pulse"
      style={{ height }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrendsPage() {
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [reliability, setReliability] = useState<ReliabilityResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/trends").then((r) => r.json()),
      fetch("/api/reliability").then((r) => r.json()),
    ])
      .then(([trendsData, reliabilityData]) => {
        setTrends(trendsData);
        setReliability(reliabilityData.resources ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build quadrant scatter data from reliability resources (has both rating and waitTime)
  const quadrantPoints: QuadrantPoint[] = (trends?.quadrant ?? [])
    .filter((r) => r.rating != null && r.waitTime != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city ?? "",
      rating: Number(r.rating),
      waitTime: Number(r.waitTime),
      subscribers: Number(r.subscribers) ?? 0,
      type: r.type ?? "",
    }));

  const modelPantries = quadrantPoints.filter((p) => p.waitTime <= 30 && p.rating >= 2.0);
  const busyButValued = quadrantPoints.filter((p) => p.waitTime > 30 && p.rating >= 2.0);
  const crisisZone = quadrantPoints.filter((p) => p.waitTime > 30 && p.rating < 2.0);
  const fastButPoor = quadrantPoints.filter((p) => p.waitTime <= 30 && p.rating < 2.0);

  // Borough chart data: only include boroughs with both rating and wait data
  const boroughData = (trends?.boroughs ?? []).filter(
    (b) => b.avgRating != null && b.avgWait != null
  );

  // Resource types for horizontal bar chart — top 10
  const resourceTypes = (trends?.resourceTypes ?? []).slice(0, 10);

  // Top engaged table
  const topEngaged = (trends?.topEngaged ?? []).slice(0, 10);

  function ratingBadge(rating: number | null) {
    if (rating == null) return <span className="text-xs text-gray-400">—</span>;
    const r = Number(rating);
    let cls = "text-xs px-2 py-0.5 rounded-full font-medium";
    if (r >= 2.5) cls += " bg-green-100 text-green-800";
    else if (r >= 2.0) cls += " bg-yellow-100 text-yellow-800";
    else cls += " bg-red-100 text-red-800";
    return <span className={cls}>{r.toFixed(2)}</span>;
  }

  void reliability; // used via quadrantPoints above

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Trends &amp; Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Live insights from NYC food resource data</p>
      </div>

      {/* ── Section 1: Borough Comparison Bar Chart ── */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-gray-900">Borough Performance Comparison</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">Average rating and wait time by borough</p>

        {loading ? (
          <ChartSkeleton height={350} />
        ) : boroughData.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No borough data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={boroughData} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="borough" stroke="#6b7280" tick={{ fontSize: 13 }} />
              <YAxis
                yAxisId="rating"
                domain={[0, 3.5]}
                stroke="#2E7D32"
                tick={{ fontSize: 12, fill: "#2E7D32" }}
                label={{ value: "Avg Rating", angle: -90, position: "insideLeft", fill: "#2E7D32", fontSize: 12, dy: 40 }}
              />
              <YAxis
                yAxisId="wait"
                orientation="right"
                stroke="#42A5F5"
                tick={{ fontSize: 12, fill: "#42A5F5" }}
                label={{ value: "Avg Wait (min)", angle: 90, position: "insideRight", fill: "#42A5F5", fontSize: 12, dy: -50 }}
              />
              <Tooltip content={(props) => <BoroughTooltip {...(props as unknown as RTooltipProps)} />} />
              <Legend />
              <Bar
                yAxisId="rating"
                dataKey="avgRating"
                name="Avg Rating"
                fill="#2E7D32"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                yAxisId="wait"
                dataKey="avgWait"
                name="Avg Wait (min)"
                fill="#42A5F5"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section 2: Quadrant Scatter Plot ── */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-gray-900">Wait Time vs. Rating Quadrant</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">Identify which pantries need intervention</p>

        {loading ? (
          <ChartSkeleton height={420} />
        ) : (
          <>
            {/* Quadrant legend */}
            <div className="flex flex-wrap gap-4 mb-4">
              {QUADRANT_LEGEND.map((q) => (
                <div key={q.label} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: q.color }}
                  />
                  <span className="text-xs text-gray-700 font-medium">{q.label}</span>
                  <span className="text-xs text-gray-400">{q.desc}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ top: 16, right: 32, bottom: 24, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  dataKey="waitTime"
                  name="Wait Time"
                  domain={[0, 120]}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Wait Time (min)", position: "insideBottom", offset: -8, fill: "#6b7280", fontSize: 13 }}
                />
                <YAxis
                  type="number"
                  dataKey="rating"
                  name="Rating"
                  domain={[0, 3.5]}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Rating", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 13, dy: 30 }}
                />
                <Tooltip content={(props) => <ScatterTooltip {...(props as unknown as RTooltipProps)} />} cursor={{ strokeDasharray: "3 3" }} />

                {/* Reference lines */}
                <ReferenceLine
                  x={30}
                  yAxisId={0}
                  stroke="#9E9E9E"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: "30 min", position: "top", fill: "#9E9E9E", fontSize: 11 }}
                />
                <ReferenceLine
                  y={2.0}
                  stroke="#9E9E9E"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: "2.0 ★", position: "right", fill: "#9E9E9E", fontSize: 11 }}
                />

                <Scatter
                  name="Model Pantries"
                  data={modelPantries}
                  fill="#2E7D32"
                  shape={<QuadrantDot fill="#2E7D32" />}
                />
                <Scatter
                  name="Busy but Valued"
                  data={busyButValued}
                  fill="#FB8C00"
                  shape={<QuadrantDot fill="#FB8C00" />}
                />
                <Scatter
                  name="Crisis Zone"
                  data={crisisZone}
                  fill="#E53935"
                  shape={<QuadrantDot fill="#E53935" />}
                />
                <Scatter
                  name="Fast but Poor"
                  data={fastButPoor}
                  fill="#9E9E9E"
                  shape={<QuadrantDot fill="#9E9E9E" />}
                />
              </ScatterChart>
            </ResponsiveContainer>

            <p className="text-xs text-gray-400 mt-2 text-right">
              {quadrantPoints.length} published resources plotted
            </p>
          </>
        )}
      </div>

      {/* ── Section 3: Resource Type Breakdown ── */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-gray-900">Resource Type Breakdown</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">Published NYC resources by category</p>

        {loading ? (
          <ChartSkeleton height={280} />
        ) : resourceTypes.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No resource type data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, resourceTypes.length * 36)}>
            <BarChart
              layout="vertical"
              data={resourceTypes}
              margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="type"
                width={140}
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: 13 }}
              />
              <Bar
                dataKey="count"
                name="Count"
                fill="#FFCC10"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section 4: Top 10 Most Engaged Pantries ── */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-gray-900">Top Pantries by Community Engagement</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">Ranked by subscriber count</p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : topEngaged.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No engagement data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4 w-10">Rank</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">City</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Subscribers</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3 pr-4">Reviews</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide pb-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topEngaged.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-3 pr-4 text-gray-900 font-medium max-w-[220px] truncate">{row.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{row.city ?? "—"}</td>
                    <td className="py-3 pr-4 text-right text-gray-800 font-medium">
                      {row.subscribers != null ? Number(row.subscribers).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-600">
                      {row.reviews != null ? Number(row.reviews).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 text-right">{ratingBadge(row.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
