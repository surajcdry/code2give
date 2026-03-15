"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from "recharts";
import { Star, TrendingUp, AlertCircle, BarChart3 } from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const boroughData = [
  { name: "Manhattan", rating: 4.2 },
  { name: "Brooklyn", rating: 3.8 },
  { name: "Queens", rating: 3.5 },
  { name: "Bronx", rating: 2.1 },
  { name: "Staten Island", rating: 4.0 },
];

const resourceMix = [
  { name: 'Community Fridge', value: 15, color: '#2E7D32' },
  { name: 'Food Pantry', value: 45, color: '#FFCC10' },
  { name: 'SNAP Center', value: 10, color: '#42A5F5' },
  { name: 'Soup Kitchen', value: 30, color: '#000000' },
];

const reliabilityData = {
  excellent: 42,
  good: 28,
  atRisk: 12,
  avgScore: 78,
  histogram: [
    { range: "0-20", count: 5 },
    { range: "21-40", count: 8 },
    { range: "41-60", count: 15 },
    { range: "61-80", count: 35 },
    { range: "81-100", count: 20 },
  ]
};

const getRelColor = (range: string) => {
  const start = parseInt(range.split("-")[0], 10);
  if (start < 40) return "#EF5350";
  if (start < 60) return "#FFA726";
  return "#2E7D32";
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Excellent', val: reliabilityData.excellent, color: 'text-green-600' },
              { label: 'Good', val: reliabilityData.good, color: 'text-yellow-500' },
              { label: 'At Risk', val: reliabilityData.atRisk, color: 'text-red-500' },
              { label: 'Avg Score', val: reliabilityData.avgScore, color: 'text-black', bg: 'bg-gray-50' },
            ].map((stat) => (
              <div key={stat.label} className={`p-5 rounded-2xl border border-gray-50 ${stat.bg || 'bg-white'}`}>
                <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.val}</p>
              </div>
            ))}
          </div>

          {/* Histogram Distribution */}
          <div className="lg:col-span-2 h-48">
            <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-4">Score Distribution</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reliabilityData.histogram}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {reliabilityData.histogram.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getRelColor(entry.range)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Borough & Mix Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-8 text-gray-900">Avg Rating by Borough</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={boroughData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} domain={[0, 5]} />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Bar dataKey="rating" fill="#2E7D32" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold mb-8 text-gray-900">Resource Type Mix</h3>
          <div className="h-64 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={resourceMix} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {resourceMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {resourceMix.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Operational Analysis Table ── */}
      <section className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-end">
          <div>
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tighter">Wait Time vs. Rating</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Identifying sites requiring immediate intervention</p>
          </div>
          <TrendingUp className="text-gray-200" size={32} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                {['Pantry Name', 'Avg Wait', 'Rating', 'Operational Status'].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-6 font-bold text-gray-800">Bethany Gospel Chapel</td>
                <td className="px-8 py-6 font-black text-red-500 italic">55 min</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-xl w-fit text-xs font-black">
                    <Star size={12} fill="currentColor" /> 2.1
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-red-600 font-black italic text-[10px] uppercase flex items-center gap-2 bg-red-50 w-fit px-3 py-1 rounded-full">
                    <AlertCircle size={14} /> Crisis Zone
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}