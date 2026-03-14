"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Info, CheckCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Alert {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count: number;
  zipCode?: string;
  id?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AlertIcon({ type, severity }: { type: string; severity: string }) {
  const cls = "w-5 h-5 shrink-0 mt-0.5";
  if (type === "DATA_GAP" || type === "COVERAGE_GAP") {
    return <Info className={`${cls} text-yellow-500`} />;
  }
  if (severity === "high") {
    return <AlertTriangle className={`${cls} text-red-500`} />;
  }
  return <Clock className={`${cls} text-yellow-500`} />;
}

function leftBorderClass(severity: string) {
  if (severity === "high") return "border-l-4 border-red-400 bg-red-50";
  return "border-l-4 border-yellow-400 bg-yellow-50";
}

function typePill(type: string) {
  const label = type.replace(/_/g, " ");
  return (
    <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
      {label}
    </span>
  );
}

// ─── Individual Alert Card ────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: Alert }) {
  const isHighUnavailability = alert.type === "HIGH_UNAVAILABILITY";
  const isLowRatedHighTraffic = alert.type === "LOW_RATED_HIGH_TRAFFIC";

  // For HIGH_UNAVAILABILITY, parse pct from title e.g. "75% of resources unavailable in zip 10001"
  let pct: number | null = null;
  if (isHighUnavailability && alert.title) {
    const m = alert.title.match(/^(\d+)%/);
    if (m) pct = parseInt(m[1], 10);
  }

  // For LOW_RATED_HIGH_TRAFFIC, parse rating from description
  let rating: number | null = null;
  let subscribers: number | null = null;
  if (isLowRatedHighTraffic && alert.description) {
    const ratingMatch = alert.description.match(/Rating\s+([\d.]+)/);
    const subMatch = alert.description.match(/([\d,]+)\s+subscribers/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
    if (subMatch) subscribers = parseInt(subMatch[1].replace(/,/g, ""), 10);
  }

  return (
    <div className={`p-5 rounded-lg ${leftBorderClass(alert.severity)}`}>
      <div className="flex items-start gap-3">
        <AlertIcon type={alert.type} severity={alert.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{alert.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              {typePill(alert.type)}
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>

          {/* HIGH_UNAVAILABILITY: zip + progress bar */}
          {isHighUnavailability && alert.zipCode && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">Zip Code</span>
                <span className="text-xs font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  {alert.zipCode}
                </span>
              </div>
              {pct != null && (
                <>
                  <div className="flex items-center justify-between mb-1 mt-2">
                    <span className="text-xs text-gray-500">Unavailability rate</span>
                    <span className="text-xs font-semibold text-red-700">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-red-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* LOW_RATED_HIGH_TRAFFIC: rating badge + subscriber count */}
          {isLowRatedHighTraffic && (
            <div className="flex items-center gap-3 mt-2">
              {rating != null && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  ★ {rating.toFixed(1)}
                </span>
              )}
              {subscribers != null && (
                <span className="text-xs text-gray-500">
                  <span className="font-medium text-gray-800">{subscribers.toLocaleString()}</span> subscribers
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-20 rounded-lg bg-gray-100 animate-pulse border-l-4 border-gray-200"
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ServiceIssuesPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const highAlerts = alerts.filter((a) => a.severity === "high");
  const mediumAlerts = alerts.filter((a) => a.severity === "medium");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Service Issues &amp; Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time alerts derived from live database analysis
        </p>
      </div>

      {/* ── Summary KPI row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">High Severity</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">
                {loading ? "—" : highAlerts.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Require immediate attention</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium Severity</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">
                {loading ? "—" : mediumAlerts.length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Data gaps &amp; coverage issues</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert list ── */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">Active Alerts</h3>
        </div>

        <div className="p-6">
          {loading ? (
            <AlertSkeleton />
          ) : alerts.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <CheckCircle className="w-12 h-12 text-[#2E7D32] mb-4" />
              <p className="text-gray-700 font-medium text-base">No active alerts detected</p>
              <p className="text-gray-400 text-sm mt-1">All systems are operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <AlertCard key={`${alert.type}-${alert.zipCode ?? alert.id ?? i}`} alert={alert} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
