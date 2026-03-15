"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Clock, CheckCircle, AlertTriangle, Star, Camera, 
  Send as SendIcon, BarChart3, Bot, Sparkles, 
  MessageSquare as MessageSquareIcon, Calendar, Filter,
  ChevronDown, Info
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import ImageUpload from "@/components/ImageUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackItem = {
  id: string; text: string; sentiment: string;
  tags: string[]; createdAt: string;
};

type ReliabilitySummary = {
  excellent: number; good: number; atRisk: number; avgScore: number;
  histogram: { range: string; count: number }[];
};

interface Alert {
  type: string; severity: "high" | "medium" | "low";
  title: string; description: string; count: number; zipCode?: string;
}

type ActiveTab = "reports" | "feedback_history" | "reliability" | "alerts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBarColor = (range: string) => {
  const start = parseInt(range.split("-")[0], 10);
  if (start < 40) return "#EF5350";
  if (start < 60) return "#FFA726";
  return "#2E7D32";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeedbackCard({ fb }: { fb: FeedbackItem }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
          fb.sentiment === "Positive" ? "bg-green-50 text-green-700" : 
          fb.sentiment === "Negative" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
        }`}>{fb.sentiment}</span>
        <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/>{fb.createdAt}</span>
      </div>
      <p className="text-sm text-gray-700 italic mb-3">"{fb.text}"</p>
      <div className="flex flex-wrap gap-1">
        {fb.tags?.map(t => <span key={t} className="text-[9px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100">{t}</span>)}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const isHigh = alert.severity === "high";
  return (
    <div className={`p-4 rounded-lg border-l-4 ${isHigh ? "border-red-500 bg-red-50/50" : "border-yellow-500 bg-yellow-50/50"}`}>
      <div className="flex items-start gap-3">
        {isHigh ? <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5"/> : <Info className="w-5 h-5 text-yellow-600 mt-0.5"/>}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-bold text-gray-900">{alert.title}</h4>
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{alert.type.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommunityHubPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("reports");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [reliability, setReliability] = useState<ReliabilitySummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [newText, setNewText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/analyze-feedback").then(r => r.json()),
      fetch("/api/reliability").then(r => r.json()),
      fetch("/api/alerts").then(r => r.json())
    ]).then(([fbData, relData, alData]) => {
      setFeedback(fbData.feedback || []);
      setReliability(relData.summary || null);
      setAlerts(alData.alerts || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredFeedback = useMemo(() => {
    if (timeFilter === "all") return feedback;
    if (timeFilter === "custom" && selectedDate) {
      return feedback.filter(f => f.createdAt.includes(selectedDate));
    }
    return feedback;
  }, [feedback, timeFilter, selectedDate]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setIsAnalyzing(true);
    await fetch("/api/analyze-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    const updated = await fetch("/api/analyze-feedback").then(r => r.json());
    setFeedback(updated.feedback || []);
    setNewText("");
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Community Hub</h1>
        <p className="text-sm text-gray-500">Merged view of citizen reports, resource reliability, and urgent alerts</p>
      </header>

      {/* ── Tabs Navigation ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "reports", label: "Citizen Reports", icon: MessageSquareIcon },
          { id: "feedback_history", label: "Feedback History", icon: Calendar },
          { id: "reliability", label: "Reliability Scores", icon: Star },
          { id: "alerts", label: "Operational Alerts", icon: AlertTriangle }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as ActiveTab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-[#FFCC10]' : ''}`} />
            {t.label}
            {t.id === "alerts" && alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full ml-1">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content: REPORTS ── */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-1">AI Feedback Analysis</h3>
              <p className="text-xs text-gray-400 mb-4">Input raw community feedback to categorize sentiment and issues instantly.</p>
              <form onSubmit={handleFeedbackSubmit} className="flex gap-3">
                <input 
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="e.g., 'The pantry on 4th was closed even though it said open...'"
                  className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#FFCC10]"
                />
                <button disabled={isAnalyzing} className="bg-black text-[#FFCC10] px-6 rounded-xl font-bold flex items-center gap-2">
                  {isAnalyzing ? "..." : <><SendIcon className="w-4 h-4"/> Analyze</>}
                </button>
              </form>
            </section>
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-gray-400"/>
                <h3 className="font-bold">Live Photo Evidence</h3>
              </div>
              <ImageUpload />
            </section>
          </div>
          <div className="space-y-6">
            <div className="bg-black text-white rounded-2xl p-6">
              <BarChart3 className="w-8 h-8 text-[#FFCC10] mb-4"/>
              <h3 className="text-xl font-bold">Quick Insights</h3>
              <p className="text-sm text-gray-400 mt-2">Overall sentiment is <span className="text-green-400 font-bold">Positive</span>.</p>
            </div>
            {/* Assistant Sidebar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="bg-black p-4 flex items-center gap-3">
                <div className="bg-[#FFCC10] p-1.5 rounded-lg"><Bot size={18} className="text-black" /></div>
                <h3 className="text-white text-sm font-bold">Assistant</h3>
              </div>
              <div className="flex-1 p-4 bg-gray-50/50"><div className="bg-white border p-3 rounded-xl text-xs">Hello! How can I help you today?</div></div>
              <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                <input type="text" placeholder="Ask..." className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs border-none outline-none focus:ring-1 focus:ring-[#FFCC10]" />
                <button className="bg-black text-[#FFCC10] p-2 rounded-lg"><SendIcon size={12}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content: FEEDBACK HISTORY ── */}
      {activeTab === "feedback_history" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-xs font-bold text-gray-600"><Filter className="w-3.5 h-3.5" /><span>Timeframe</span></div>
              <div className="relative">
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="appearance-none bg-gray-50 border border-gray-200 text-xs rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#FFCC10] outline-none font-medium cursor-pointer">
                  <option value="all">All Feedback</option>
                  <option value="custom">Select Specific Date...</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              </div>
              {timeFilter === "custom" && (
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#FFCC10] outline-none font-medium" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)}
          </div>
        </div>
      )}

      {/* ── Tab Content: RELIABILITY ── */}
      {activeTab === "reliability" && reliability && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase">Excellent</p><p className="text-3xl font-black text-green-600">{reliability.excellent}</p></div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase">Good</p><p className="text-3xl font-black text-yellow-500">{reliability.good}</p></div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase">At Risk</p><p className="text-3xl font-black text-red-500">{reliability.atRisk}</p></div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-gray-400 text-xs font-bold uppercase">Avg Score</p><p className="text-3xl font-black text-gray-900">{reliability.avgScore}</p></div>
          </div>
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold mb-6 text-gray-900">Reliability Score Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reliability.histogram}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f9f9f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {reliability.histogram.map((entry, index) => (<Cell key={`cell-${index}`} fill={getBarColor(entry.range)} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab Content: ALERTS ── */}
      {activeTab === "alerts" && (
        <div className="max-w-3xl space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed"><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4"/><h3 className="font-bold">System All Clear</h3><p className="text-sm text-gray-500">No high-priority issues detected.</p></div>
          ) : (
            alerts.map((a, i) => <AlertCard key={i} alert={a} />)
          )}
        </div>
      )}
    </div>
  );
}