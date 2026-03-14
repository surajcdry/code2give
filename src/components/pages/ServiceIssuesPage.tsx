"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface ServiceIssue {
  id: string;
  resourceName: string;
  issue: string;
  severity: "high" | "medium" | "low";
  reportedDate: string;
  status: "active" | "monitoring" | "resolved";
}

// Derived from DB feedback + static operational issues
const staticIssues: ServiceIssue[] = [
  {
    id: "d1",
    resourceName: "Bronx Community Pantry",
    issue: "High demand, low inventory — multiple reports of empty shelves",
    severity: "high",
    reportedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  },
  {
    id: "d2",
    resourceName: "Harlem Food Hub",
    issue: "Long wait times exceeding 60 minutes on weekday mornings",
    severity: "high",
    reportedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  },
  {
    id: "d3",
    resourceName: "Queens Boulevard Pantry",
    issue: "Staff shortage on Wednesdays — reduced service hours",
    severity: "medium",
    reportedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "monitoring",
  },
  {
    id: "d4",
    resourceName: "Brooklyn Bridge Fridge",
    issue: "Equipment maintenance — refrigeration unit repaired",
    severity: "low",
    reportedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "resolved",
  },
];

function getSeverityClass(severity: string) {
  switch (severity) {
    case "high":
      return "text-destructive bg-destructive/10";
    case "medium":
      return "text-destructive bg-destructive/20";
    case "low":
      return "text-yellow-800 bg-yellow-100";
    default:
      return "text-gray-800 bg-gray-100";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "active":
      return "border-red-300 bg-red-50";
    case "monitoring":
      return "border-orange-300 bg-orange-50";
    case "resolved":
      return "border-green-300 bg-green-50";
    default:
      return "border-gray-200 bg-gray-50";
  }
}

interface NegativeFeedback {
  id: number;
  text: string;
  location: string | null;
  sentiment: string;
  created_at: string;
}

export function ServiceIssuesPage() {
  const [negativeFeedback, setNegativeFeedback] = useState<NegativeFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyze-feedback")
      .then((r) => r.json())
      .then((data) => {
        const items: NegativeFeedback[] = (data.feedback || []).filter(
          (f: NegativeFeedback) =>
            f.sentiment === "negative" || f.sentiment === "critical"
        );
        setNegativeFeedback(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeIssues = staticIssues.filter((d) => d.status === "active");
  const monitoringIssues = staticIssues.filter((d) => d.status === "monitoring");
  const resolvedIssues = staticIssues.filter((d) => d.status === "resolved");

  const IssueCard = ({ issue }: { issue: ServiceIssue }) => (
    <div className={`p-6 border-l-4 ${getStatusClass(issue.status)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-gray-900">{issue.resourceName}</h4>
          <p className="text-sm text-gray-700 mt-1">{issue.issue}</p>
          <p className="text-xs text-gray-500 mt-2">
            Reported{" "}
            {new Date(issue.reportedDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs capitalize ${getSeverityClass(issue.severity)}`}
          >
            {issue.severity} severity
          </span>
          {issue.status === "resolved" ? (
            <span className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              resolved
            </span>
          ) : (
            <span className="text-xs text-gray-500 capitalize">{issue.status}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-gray-900">Service Issues</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-gray-600">Active Issues</p>
          </div>
          <p className="text-primaryxl text-gray-900">{activeIssues.length}</p>
          <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-gray-600">Monitoring</p>
          </div>
          <p className="text-primaryxl text-gray-900">{monitoringIssues.length}</p>
          <p className="text-xs text-gray-500 mt-1">Under observation</p>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Resolved This Week</p>
          </div>
          <p className="text-primaryxl text-gray-900">{resolvedIssues.length}</p>
          <p className="text-xs text-gray-500 mt-1">Successfully addressed</p>
        </div>
      </div>

      {/* Active Issues */}
      {activeIssues.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Active Issues</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {activeIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Issues */}
      {monitoringIssues.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Under Monitoring</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {monitoringIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Issues */}
      {resolvedIssues.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Recently Resolved</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {resolvedIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Negative Community Feedback */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">Negative Community Feedback</h3>
          <p className="text-sm text-gray-500 mt-1">
            AI-classified reports flagged as negative or critical
          </p>
        </div>
        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : negativeFeedback.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">No negative feedback in the system</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {negativeFeedback.map((fb) => (
              <div key={fb.id} className="p-6 border-l-4 border-red-300 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{fb.text}</p>
                    {fb.location && (
                      <p className="text-xs text-gray-500 mt-2">{fb.location}</p>
                    )}
                  </div>
                  <span className="ml-4 px-3 py-1 rounded-full text-xs text-destructive bg-destructive/10 capitalize shrink-0">
                    {fb.sentiment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
