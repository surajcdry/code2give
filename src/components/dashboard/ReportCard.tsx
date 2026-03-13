"use client";

import { AlertCircle, Clock, Tag, Trash2, Smile, Frown } from "lucide-react";

export interface FeedbackReport {
  id: string;
  text: string;
  sentiment: "Positive" | "Negative" | "Neutral";
  tags: string[];
  createdAt: string;
}

interface ReportCardProps {
  report: FeedbackReport;
}

function formatRelativeDate(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ReportCard({ report }: ReportCardProps) {
  const sentimentColor =
    report.sentiment === "Positive" ? "text-emerald-800 bg-emerald-100" :
    report.sentiment === "Negative" ? "text-orange-800 bg-orange-100" :
    "text-gray-700 bg-gray-100";

  const SentimentIcon =
    report.sentiment === "Positive" ? Smile :
    report.sentiment === "Negative" ? Frown :
    Tag;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video w-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
        No image available
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <SentimentIcon className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">{report.sentiment} feedback</p>
              <p className="text-xs text-slate-500">{formatRelativeDate(report.createdAt)}</p>
            </div>
          </div>
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${sentimentColor}`}>{report.sentiment}</div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{report.text}</p>

        <div className="flex flex-wrap gap-2">
          {report.tags?.map((tag) => (
            <span key={tag} className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{report.tags.length} tag{report.tags.length === 1 ? "" : "s"}</span>
          </div>
          <button className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
