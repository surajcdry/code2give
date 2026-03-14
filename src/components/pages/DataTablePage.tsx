"use client";

import { useEffect, useState } from "react";
import { MapPin, MessageSquare, ChevronUp, ChevronDown, Search } from "lucide-react";

type Pantry = {
  id: string;
  name: string;
  location: string;
  hours: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

type FeedbackItem = {
  id: string;
  text: string;
  sentiment: string;
  tags: string[];
  createdAt: string;
};

type Tab = "pantries" | "feedback";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp className="w-3 h-3 text-gray-300" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-[#2E7D32]" />
    : <ChevronDown className="w-3 h-3 text-[#2E7D32]" />;
}

function sentimentColor(s: string) {
  if (s === "Positive") return "bg-green-100 text-green-800";
  if (s === "Negative") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DataTablePage() {
  const [tab, setTab] = useState<Tab>("pantries");
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/map-data").then(r => r.json()),
      fetch("/api/analyze-feedback").then(r => r.json()),
    ]).then(([mapData, fbData]) => {
      setPantries(mapData.pantries || []);
      setFeedback(fbData.feedback || []);
      setLoading(false);
    });
  }, []);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredPantries = pantries
    .filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey] as string ?? "";
      const bv = (b as Record<string, unknown>)[sortKey] as string ?? "";
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  const filteredFeedback = feedback
    .filter(f =>
      f.text?.toLowerCase().includes(search.toLowerCase()) ||
      f.sentiment?.toLowerCase().includes(search.toLowerCase()) ||
      f.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortKey === "createdAt") {
        const av = new Date(a.createdAt).getTime();
        const bv = new Date(b.createdAt).getTime();
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const av = (a as Record<string, unknown>)[sortKey] as string ?? "";
      const bv = (b as Record<string, unknown>)[sortKey] as string ?? "";
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  function ThBtn({ label, colKey }: { label: string; colKey: string }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={() => toggleSort(colKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          <SortIcon active={sortKey === colKey} dir={sortDir} />
        </div>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Data Table</h2>
        <p className="text-sm text-gray-500 mt-1">View and sort all pantry and feedback data</p>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setTab("pantries"); setSortKey("name"); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
              tab === "pantries" ? "bg-white text-[#2E7D32] shadow-sm font-medium" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Pantries <span className="text-xs text-gray-400">({pantries.length})</span>
          </button>
          <button
            onClick={() => { setTab("feedback"); setSortKey("createdAt"); setSortDir("desc"); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
              tab === "feedback" ? "bg-white text-[#2E7D32] shadow-sm font-medium" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Feedback <span className="text-xs text-gray-400">({feedback.length})</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30 w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading...</div>
        ) : tab === "pantries" ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <ThBtn label="Name" colKey="name" />
                  <ThBtn label="Location" colKey="location" />
                  <ThBtn label="Hours" colKey="hours" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPantries.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No pantries found</td></tr>
                ) : filteredPantries.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.location || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{p.hours || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {p.latitude && p.longitude ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{p.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filteredPantries.length} of {pantries.length} pantries
            </div>
          </>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <ThBtn label="Sentiment" colKey="sentiment" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                  <ThBtn label="Date" colKey="createdAt" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFeedback.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No feedback found</td></tr>
                ) : filteredFeedback.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${sentimentColor(f.sentiment)}`}>{f.sentiment}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-md">{f.text}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {f.tags?.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filteredFeedback.length} of {feedback.length} feedback entries
            </div>
          </>
        )}
      </div>
    </div>
  );
}
