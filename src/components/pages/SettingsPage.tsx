"use client";

import { useApp } from "@/components/layout/AppLayout";
import { User, Bell, Shield, Database } from "lucide-react";

const roleLabels: Record<string, string> = {
  internal: "Lemontree Team",
  government: "Government Agency",
  donor: "Donor / Foundation",
  provider: "Food Provider",
};

export function SettingsPage() {
  const { role } = useApp();

  return (
    <div className="space-y-6">
      <h1 className="text-gray-900">Settings</h1>

      {/* Current Session */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-gray-900">Current Session</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Active Role</span>
            <span className="text-sm font-medium text-gray-900">{roleLabels[role]}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Dashboard View</span>
            <span className="text-sm font-medium text-gray-900 capitalize">{role}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-600">Data Refresh</span>
            <span className="text-sm font-medium text-gray-900">Live (on page load)</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-[#FF8F00]" />
          <h3 className="text-gray-900">Notifications</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "Critical service alerts", enabled: true },
            { label: "New community reports", enabled: true },
            { label: "Weekly digest", enabled: false },
            { label: "Inventory low warnings", enabled: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{item.label}</span>
              <div
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
                  item.enabled ? "bg-primary" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-card shadow-sm transition-transform ${
                    item.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#42A5F5]" />
          <h3 className="text-gray-900">Data & Privacy</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>All community reports are anonymized before storage. No personally identifiable information is collected.</p>
          <p>Feedback text is processed by Gemini AI for sentiment classification only — it is never used for advertising or shared with third parties.</p>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-gray-400" />
          <h3 className="text-gray-900">System</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>App</span>
            <span className="text-gray-700">Lemontree InsightEngine v1.0</span>
          </div>
          <div className="flex justify-between">
            <span>Stack</span>
            <span className="text-gray-700">Next.js 16 · Prisma · PostgreSQL · Gemini AI</span>
          </div>
          <div className="flex justify-between">
            <span>Built for</span>
            <span className="text-gray-700">Morgan Stanley Code to Give 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
