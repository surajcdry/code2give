"use client";

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Clock } from "lucide-react";

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

const demandByDistrict = [
  { district: "Brooklyn", demand: 85, population: 45000 },
  { district: "Bronx", demand: 120, population: 38000 },
  { district: "Manhattan", demand: 65, population: 52000 },
  { district: "Queens", demand: 95, population: 41000 },
];

const foodAvailabilityTrends = [
  { week: "Week 1", produce: 85, meat: 70, staples: 95 },
  { week: "Week 2", produce: 78, meat: 65, staples: 92 },
  { week: "Week 3", produce: 82, meat: 72, staples: 90 },
  { week: "Week 4", produce: 75, meat: 68, staples: 88 },
];

export function TrendsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-gray-900">Trends & Analytics</h1>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <p className="text-sm text-gray-600">Report Volume</p>
          </div>
          <p className="text-primaryxl text-gray-900">+24%</p>
          <p className="text-xs text-gray-500 mt-1">vs last week</p>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-[#FF8F00]" />
            <p className="text-sm text-gray-600">Avg Wait Time</p>
          </div>
          <p className="text-primaryxl text-gray-900">+8%</p>
          <p className="text-xs text-gray-500 mt-1">Increasing trend</p>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#42A5F5]" />
            <p className="text-sm text-gray-600">Peak Day</p>
          </div>
          <p className="text-primaryxl text-gray-900">Tuesday</p>
          <p className="text-xs text-gray-500 mt-1">Highest demand</p>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            <p className="text-sm text-gray-600">Food Availability</p>
          </div>
          <p className="text-primaryxl text-gray-900">-12%</p>
          <p className="text-xs text-gray-500 mt-1">Produce declining</p>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="mb-4 text-gray-900">Wait Time & Report Volume Trends</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={waitTimeTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis yAxisId="left" stroke="#6b7280" />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avgWait" stroke="#FF8F00" strokeWidth={3} name="Avg Wait Time (min)" dot={{ fill: "#FF8F00", r: 5 }} />
            <Line yAxisId="right" type="monotone" dataKey="reports" stroke="#42A5F5" strokeWidth={3} name="Total Reports" dot={{ fill: "#42A5F5", r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="mb-4 text-gray-900">Demand by Borough</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={demandByDistrict}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="district" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
            <Legend />
            <Bar dataKey="demand" fill="#2E7D32" name="Weekly Reports" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {demandByDistrict.map((d) => (
            <div key={d.district} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{d.district}</p>
              <p className="text-xl text-gray-900 mt-1">{d.demand} reports</p>
              <p className="text-xs text-gray-500 mt-1">Pop: {(d.population / 1000).toFixed(0)}k</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="mb-4 text-gray-900">Food Availability Trends (% Available)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={foodAvailabilityTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" stroke="#6b7280" />
            <YAxis stroke="#6b7280" domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
            <Legend />
            <Line type="monotone" dataKey="produce" stroke="#2E7D32" strokeWidth={2} name="Produce" dot={{ fill: "#2E7D32" }} />
            <Line type="monotone" dataKey="meat" stroke="#FF8F00" strokeWidth={2} name="Meat" dot={{ fill: "#FF8F00" }} />
            <Line type="monotone" dataKey="staples" stroke="#42A5F5" strokeWidth={2} name="Pantry Staples" dot={{ fill: "#42A5F5" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
