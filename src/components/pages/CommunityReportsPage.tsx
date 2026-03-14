"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

type FeedbackItem = {
  id: string; text: string; sentiment: string;
  tags: string[]; createdAt: string;
};

function FeedbackCard({ fb }: { fb: FeedbackItem }) {
  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-card rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${
            fb.sentiment === "Positive" ? "bg-primary/10 text-primary" :
            fb.sentiment === "Negative" ? "bg-destructive/10 text-destructive" :
            "bg-gray-100 text-gray-700"
          }`}>{fb.sentiment}</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(fb.createdAt)}</span>
          </div>
        </div>

        <p className="text-sm text-gray-800">&ldquo;{fb.text}&rdquo;</p>

        <div className="flex gap-1.5 flex-wrap">
          {fb.tags?.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
              <CheckCircle className="w-3 h-3 text-primary" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CommunityReportsPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newText, setNewText] = useState("");

  const loadFeedback = () =>
    fetch("/api/analyze-feedback").then(r => r.json()).then(d => setFeedback(d.feedback || []));

  useEffect(() => { loadFeedback(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setIsAnalyzing(true);
    try {
      await fetch("/api/analyze-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
      setNewText("");
      await loadFeedback();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filtered = feedback.filter((fb) => {
    if (filter !== "all" && fb.sentiment !== filter) return false;
    if (search && !fb.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-gray-900">Community Reports</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-card text-gray-900 w-64 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30"
            />
          </div>
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-card text-gray-900 focus:outline-none"
          >
            <option value="all">All Sentiment</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
          </select>
        </div>
      </div>

      {/* AI Submit */}
      <div className="bg-card rounded-lg border-2 border-dashed border-[#2E7D32]/30 p-6">
        <h3 className="text-gray-900 mb-1">Submit New Feedback for AI Analysis</h3>
        <p className="text-sm text-gray-500 mb-4">Type a real feedback message and watch the AI categorize it.</p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder='Try: "The line was too long and they ran out of milk"'
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-card text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/30"
          />
          <button
            type="submit"
            disabled={isAnalyzing || !newText.trim()}
            className="px-5 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </form>
      </div>

      {/* Photo Upload */}
      <div className="bg-card rounded-lg border-2 border-dashed border-[#2E7D32]/30 p-6">
        <h3 className="text-gray-900 mb-1">Submit a Pantry Photo</h3>
        <p className="text-sm text-gray-500 mb-4">Upload a photo to help track pantry availability.</p>
        <ImageUpload />
      </div>

      {/* Grid */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-600 mb-4">Showing {filtered.length} of {feedback.length} reports</p>
        <div className="grid grid-cols-3 gap-6">
          {filtered.map((fb) => <FeedbackCard key={fb.id} fb={fb} />)}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No reports found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
