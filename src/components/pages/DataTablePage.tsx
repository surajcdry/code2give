"use client";




import { useEffect, useRef, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Search,
  ExternalLink,
  MessageSquare,
  Database,
  Download,
} from "lucide-react";
import { downloadFullReport } from "@/utils/exportReport";




// ─── Types ────────────────────────────────────────────────────────────────────




interface Alert {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}




type Resource = {
  id: string;
  name: string;
  city: string | null;
  zipCode: string | null;
  addressStreet1: string | null;
  location: string;
  type: string | null;
  resourceTypeId: string | null;
  status: string | null;
  ratingAverage: number | null;
  waitTimeMinutesAverage: number | null;
  reviewCount: number | null;
  subscriberCount: number | null;
  acceptingNewClients: boolean | null;
  openByAppointment: boolean | null;
  appointmentRequired: boolean | null;
  website: string | null;
  schedule: string;
  latitude: number | null;
  longitude: number | null;
  activeAlerts?: Alert[];
};




type MetaType = {
  id: string;
  name: string;
  count: number;
};




type FeedbackItem = {
  id: string;
  text: string;
  sentiment: string;
  tags: string[];
  createdAt: string;
};




type Tab = "resources" | "feedback";
type SortDir = "asc" | "desc";




// ─── Helpers ──────────────────────────────────────────────────────────────────




function typeBadge(typeId: string | null): string {
  const map: Record<string, string> = {
    FOOD_PANTRY: "bg-green-100 text-green-700",
    SOUP_KITCHEN: "bg-blue-100 text-blue-700",
    COMMUNITY_FRIDGE: "bg-purple-100 text-purple-700",
    SNAP_EBT: "bg-yellow-100 text-yellow-700",
    MEAL_DELIVERY: "bg-orange-100 text-orange-700",
  };
  return map[typeId ?? ""] ?? "bg-gray-100 text-gray-600";
}




function ratingColor(rating: number | null): string {
  if (rating === null) return "text-gray-400";
  if (rating >= 2.5) return "text-green-600";
  if (rating >= 2.0) return "text-yellow-600";
  return "text-red-600";
}




function sentimentColor(s: string): string {
  if (s === "Positive") return "bg-green-100 text-green-800";
  if (s === "Negative") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}




function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}




function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}




// ─── Sub-components ───────────────────────────────────────────────────────────




function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp className="w-3 h-3 text-gray-300" />;
  return dir === "asc" ? (
    <ChevronUp className="w-3 h-3 text-[#2E7D32]" />
  ) : (
    <ChevronDown className="w-3 h-3 text-[#2E7D32]" />
  );
}




function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}




// ─── Main Component ───────────────────────────────────────────────────────────




export function DataTablePage() {
  const [tab, setTab] = useState<Tab>("resources");




  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);




  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "PUBLISHED" | "UNAVAILABLE">("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);




  const [types, setTypes] = useState<MetaType[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);




  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);




  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);




  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
  }, [typeFilter, statusFilter, sortBy, sortDir]);




  useEffect(() => {
    fetch("/api/resources?meta=true")
      .then((r) => r.json())
      .then((data) => { if (data.types) setTypes(data.types); })
      .catch(console.error);
  }, []);




  useEffect(() => {
    fetch("/api/analyze-feedback")
      .then((r) => r.json())
      .then((data) => { setFeedback(data.feedback || []); })
      .catch(console.error);
  }, []);




  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);




    fetch(`/api/resources?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setResources(data.resources || []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [page, debouncedSearch, typeFilter, statusFilter, sortBy, sortDir]);




  function toggleSort(key: string) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }




  function ThBtn({ label, colKey }: { label: string; colKey: string }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap"
        onClick={() => toggleSort(colKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          <SortIcon active={sortBy === colKey} dir={sortDir} />
        </div>
      </th>
    );
  }




  const startItem = total === 0 ? 0 : (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);




  return (
    <div id="data-table-report" className="space-y-6 bg-white p-2">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Data Table</h2>
          <p className="text-sm text-gray-500 mt-1">Operational view with inline service alerts</p>
        </div>
       
        <div className="flex gap-2">
          <button
            onClick={() => downloadFullReport(tab === "resources" ? resources : feedback, tab)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-[#FFCC10] text-[#856404] hover:bg-[#F9A825] hover:text-[#705203] transition-all shadow-sm active:scale-95 group border border-[#FFCC10]/10"
          >
            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
            Export Report
          </button>
        </div>
      </div>




      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setTab("resources"); setSortBy("name"); setSortDir("asc"); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${tab === "resources" ? "bg-white text-[#2E7D32] shadow-sm font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            <Database className="w-4 h-4" /> Resources <span className="text-xs text-gray-400">({total.toLocaleString()})</span>
          </button>
          <button
            onClick={() => { setTab("feedback"); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${tab === "feedback" ? "bg-white text-[#2E7D32] shadow-sm font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            <MessageSquare className="w-4 h-4" /> Feedback <span className="text-xs text-gray-400">({feedback.length})</span>
          </button>
        </div>




        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30"
          />
        </div>
      </div>




      {tab === "resources" && (
        <div className="flex items-center gap-3">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 min-w-[200px] max-w-sm text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <option value="all">All Types</option>
            {types.map((t) => ( <option key={t.id} value={t.id}>{t.name} ({t.count.toLocaleString()})</option> ))}
          </select>




          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="flex-1 min-w-[150px] max-w-xs text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <option value="all">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>




          {!loading && ( <span className="text-xs text-gray-400 ml-auto">Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of {total.toLocaleString()} resources</span> )}
        </div>
      )}




      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {tab === "resources" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <ThBtn label="Name" colKey="name" />
                  <ThBtn label="City" colKey="city" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zip</th>
                  <ThBtn label="Status" colKey="resourceStatusId" />
                  <ThBtn label="Type" colKey="resourceTypeName" />
                  <ThBtn label="Rating" colKey="ratingAverage" />
                  <ThBtn label="Wait" colKey="waitTimeMinutesAverage" />
                  <ThBtn label="Subs" colKey="subscriberCount" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? ( <SkeletonRows cols={9} /> ) : resources.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No resources found</td></tr>
                ) : (
                  resources.map((r) => (
                    <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.activeAlerts?.length ? 'bg-red-50/20' : ''}`}>
                      <td className="px-4 py-3 max-w-[200px]"><div className="text-sm font-medium text-gray-900 truncate">{r.name}</div></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.city || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.zipCode || "—"}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${r.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status || '—'}</span></td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeBadge(r.resourceTypeId)}`}>{r.type || r.resourceTypeId}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm font-medium ${ratingColor(r.ratingAverage)}`}>{r.ratingAverage ? `⭐ ${r.ratingAverage.toFixed(1)}` : "—"}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.waitTimeMinutesAverage ? `${Math.round(r.waitTimeMinutesAverage)}m` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(r.subscriberCount)}</td>
                      <td className="px-4 py-3 text-center">{r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800"><ExternalLink className="w-4 h-4" /></a>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedback.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${sentimentColor(f.sentiment)}`}>{f.sentiment}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-md">{f.text}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{f.tags?.map((tag) => ( <span key={tag} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{tag}</span> ))}</div></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
     
      {!loading && total > 0 && tab === "resources" && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
           <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
           <div className="flex gap-2">
             <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded text-xs disabled:opacity-50">Prev</button>
             <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-xs disabled:opacity-50">Next</button>
           </div>
        </div>
      )}
    </div>
  );
}







