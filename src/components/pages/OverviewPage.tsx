"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import ImpactMap from "@/components/dashboard/ImpactMap";
import { ReportCard, FeedbackReport } from "@/components/dashboard/ReportCard";
import {
  FileText, MapPin, Clock, AlertTriangle,
  Users, TrendingUp, DollarSign, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type Pantry = { id: string; name: string; latitude: number; longitude: number; hours: string; description: string };

const waitTimeTrends = [
  { date: "Mar 6", avgWait: 25, reports: 45 },
  { date: "Mar 7", avgWait: 28, reports: 52 },
  { date: "Mar 8", avgWait: 22, reports: 48 },
  { date: "Mar 9", avgWait: 30, reports: 55 },
  { date: "Mar 10", avgWait: 27, reports: 50 },
  { date: "Mar 11", avgWait: 32, reports: 58 },
  { date: "Mar 12", avgWait: 29, reports: 54 },
  { date: "Mar 13", avgWait: 31, reports: 60 },
];

export function OverviewPage() {
  const { role } = useApp();
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport[]>([]);

  useEffect(() => {
    fetch("/api/map-data").then(r => r.json()).then(d => setPantries(d.pantries || []));
    fetch("/api/analyze-feedback").then(r => r.json()).then(d => setFeedback(d.feedback || []));
  }, []);

  const positive = feedback.filter(f => f.sentiment === "Positive").length;
  const negative = feedback.filter(f => f.sentiment === "Negative").length;
  const issues = feedback.filter(f => f.sentiment === "Negative").length;

  const renderKPIs = () => {
    switch (role) {
      case "internal":
        return (
          <>
            <KPICard title="Feedback Processed" value={feedback.length} icon={FileText} trend={{ value: 24, isPositive: true }} />
            <KPICard title="Active Pantries" value={pantries.length} icon={MapPin} />
            <KPICard title="Positive Sentiment" value={`${feedback.length > 0 ? Math.round((positive / feedback.length) * 100) : 0}%`} icon={BarChart3} trend={{ value: 8, isPositive: true }} />
            <KPICard title="Needs Attention" value={negative} icon={AlertTriangle} subtitle="Negative feedback" />
          </>
        );
      case "government":
        return (
          <>
            <KPICard title="Pantries Mapped" value={pantries.length} icon={MapPin} />
            <KPICard title="Demand Growth" value="18%" icon={TrendingUp} trend={{ value: 18, isPositive: true }} />
            <KPICard title="Feedback Reports" value={feedback.length} icon={BarChart3} />
            <KPICard title="Service Gaps" value={issues} icon={AlertTriangle} />
          </>
        );
      case "donor":
        return (
          <>
            <KPICard title="Communities Served" value="12 Neighborhoods" icon={Users} />
            <KPICard title="Demand Growth" value="18%" icon={TrendingUp} trend={{ value: 18, isPositive: true }} />
            <KPICard title="Satisfaction Rate" value={`${feedback.length > 0 ? Math.round((positive / feedback.length) * 100) : 0}%`} icon={BarChart3} />
            <KPICard title="Funding Opportunities" value={issues} icon={DollarSign} subtitle="High-need sites" />
          </>
        );
      case "provider":
        return (
          <>
            <KPICard title="Reports This Week" value={60} icon={FileText} trend={{ value: 12, isPositive: true }} />
            <KPICard title="Avg Wait Time" value="31 min" icon={Clock} trend={{ value: 8, isPositive: false }} />
            <KPICard title="Satisfaction Rate" value={`${feedback.length > 0 ? Math.round((positive / feedback.length) * 100) : 0}%`} icon={BarChart3} />
            <KPICard title="Active Alerts" value={negative} icon={AlertTriangle} />
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">{renderKPIs()}</div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ImpactMap
            title="Food Resource Map"
            subtitle="Interactive map of pantry locations and demand layers"
            pantries={pantries}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-gray-900">Recent Reports</h3>
              <span className="text-xs text-gray-500">Showing latest feedback</span>
            </div>

            <div className="mt-4 space-y-4 max-h-[520px] overflow-y-auto">
              {feedback.slice(0, 4).map((fb) => (
                <ReportCard key={fb.id} report={fb} />
              ))}
              {feedback.length === 0 && (
                <p className="text-sm text-gray-500">No recent reports yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="mb-4 text-gray-900">Wait Time & Report Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={waitTimeTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
            <Line type="monotone" dataKey="avgWait" stroke="#2E7D32" strokeWidth={2} name="Avg Wait (min)" dot={{ fill: "#2E7D32" }} />
            <Line type="monotone" dataKey="reports" stroke="#42A5F5" strokeWidth={2} name="Reports" dot={{ fill: "#42A5F5" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
