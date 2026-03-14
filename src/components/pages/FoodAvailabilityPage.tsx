"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Calendar, MapPin } from "lucide-react";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABELS: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

const DAY_INDEX_MAP: Record<number, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
};

type HeatmapRow = {
  borough: string;
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
  Friday: number;
  Saturday: number;
  Sunday: number;
};

type OpenTodayResource = {
  id: string;
  name: string;
  city: string;
  address: string;
  type: string;
};

type AvailabilityData = {
  heatmap: HeatmapRow[];
  openToday: OpenTodayResource[];
  summary: Record<string, number>;
};

function getCellStyle(count: number, max: number): React.CSSProperties {
  if (max === 0) return { backgroundColor: "rgba(46, 125, 50, 0.1)" };
  const opacity = (count / max) * 0.9 + 0.1;
  return { backgroundColor: `rgba(46, 125, 50, ${opacity})` };
}

function getCellTextClass(count: number, max: number): string {
  if (max === 0) return "text-gray-700";
  const opacity = (count / max) * 0.9 + 0.1;
  return opacity > 0.5 ? "text-white" : "text-gray-800";
}

function TypeBadge({ type }: { type: string }) {
  if (!type) return null;
  const lower = type.toLowerCase();
  let cls = "bg-gray-100 text-gray-600";
  if (lower.includes("pantry")) cls = "bg-green-100 text-green-700";
  else if (lower.includes("kitchen") || lower.includes("soup")) cls = "bg-blue-100 text-blue-700";
  else if (lower.includes("fridge")) cls = "bg-orange-100 text-orange-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {type}
    </span>
  );
}

export function FoodAvailabilityPage() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const todayName = DAY_INDEX_MAP[new Date().getDay()];

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Compute max across all heatmap cells
  const max = data
    ? Math.max(
        0,
        ...data.heatmap.flatMap((row) =>
          DAYS.map((day) => (row as unknown as Record<string, number>)[day] ?? 0)
        )
      )
    : 0;

  // Build chart data from summary
  const summaryChartData = data
    ? DAYS.map((day) => ({
        day: DAY_LABELS[day],
        count: data.summary[day] ?? 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Food Availability</h1>
        <p className="text-sm text-gray-500 mt-1">
          Weekly coverage and open resources across NYC boroughs
        </p>
      </div>

      {/* Section 1: Heatmap */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-1">
          <h2 className="text-gray-900">Weekly Coverage Heatmap</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Number of food resources open each day by borough
          </p>
        </div>

        {loading ? (
          <div className="h-48 bg-gray-50 rounded-lg animate-pulse mt-4" />
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-2 py-1 w-32">
                      Borough
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className={`text-center text-xs font-medium px-2 py-1 ${
                          day === todayName ? "text-green-700" : "text-gray-500"
                        }`}
                      >
                        {DAY_LABELS[day]}
                        {day === todayName && (
                          <span className="block text-[9px] text-green-600 font-semibold">Today</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.heatmap ?? []).map((row) => (
                    <tr key={row.borough}>
                      <td className="text-xs font-medium text-gray-700 px-2 py-1">
                        {row.borough}
                      </td>
                      {DAYS.map((day) => {
                        const count = (row as unknown as Record<string, number>)[day] ?? 0;
                        return (
                          <td
                            key={day}
                            className="text-center rounded-md"
                            style={getCellStyle(count, max)}
                          >
                            <span
                              className={`text-xs font-semibold block px-2 py-2 ${getCellTextClass(count, max)}`}
                            >
                              {count}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-gray-500">Coverage Intensity:</span>
              <div className="flex items-center gap-1">
                {[0.1, 0.25, 0.4, 0.6, 0.75, 0.9, 1.0].map((o) => (
                  <div
                    key={o}
                    className="w-6 h-4 rounded"
                    style={{ backgroundColor: `rgba(46, 125, 50, ${o})` }}
                    title={`Opacity ${o}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">Low → High</span>
            </div>
          </>
        )}
      </div>

      {/* Citywide Summary Bar Chart */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-gray-900">Citywide Daily Coverage</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Total NYC resources open each day of the week
          </p>
        </div>
        {loading ? (
          <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summaryChartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => [`${v} resources`, "Open"]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#2E7D32" radius={[6, 6, 0, 0]} name="Resources Open" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Section 2: Open Today */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-green-700" />
          <div>
            <h2 className="text-gray-900">
              Open Today — {todayName}
            </h2>
            {!loading && data && (
              <p className="text-xs text-gray-400 mt-0.5">
                {data.openToday.length} resource{data.openToday.length !== 1 ? "s" : ""} open today across NYC
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data || data.openToday.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No scheduled resources found for today.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
            <div className="divide-y divide-gray-100">
              {data.openToday.map((resource) => (
                <div
                  key={resource.id}
                  className="px-6 py-3 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {resource.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[resource.address, resource.city].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <TypeBadge type={resource.type} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
