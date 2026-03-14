"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import ReliabilityScore from './ReliabilityScore';

type FeedbackItem = {
  id: string;
  text: string;
  sentiment: string;
  tags: string[];
  createdAt: string;
};

export default function AdminDashboard() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [newFeedback, setNewFeedback] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0 });

  // Fetch existing feedback on mount
  useEffect(() => {
    fetch('/api/analyze-feedback')
      .then(res => res.json())
      .then(data => {
        if (data.feedback) {
          setFeedbackList(data.feedback);
          const total = data.feedback.length;
          const positive = data.feedback.filter((f: FeedbackItem) => f.sentiment === "Positive").length;
          const negative = data.feedback.filter((f: FeedbackItem) => f.sentiment === "Negative").length;
          setStats({ total, positive, negative });
        }
      })
      .catch(err => console.error("Feedback fetch error:", err));
  }, []);

  // Submit new feedback for AI analysis
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newFeedback }),
      });
      const data = await res.json();
      if (data.feedback) {
        setFeedbackList(prev => [data.feedback, ...prev]);
        setStats(prev => ({
          total: prev.total + 1,
          positive: prev.positive + (data.feedback.sentiment === "Positive" ? 1 : 0),
          negative: prev.negative + (data.feedback.sentiment === "Negative" ? 1 : 0),
        }));
      }
      setNewFeedback("");
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-primaryxl font-bold tracking-tight text-slate-900">Lemontree Admin</h2>
        <div className="flex items-center gap-2 text-sm text-primary-foreground0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          AI Processing Active
        </div>
      </div>

      <p className="text-muted-foreground text-lg">
        Monitor real-time qualitative feedback analyzed by AI to discover operational bottlenecks.
      </p>

      {/* Live Metrics from DB */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="font-medium text-primary-foreground0 mb-1">Feedback Processed</div>
          <div className="text-primaryxl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-primary-foreground0 mt-2">Total in database</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="font-medium text-green-700 mb-1">Positive</div>
          <div className="text-primaryxl font-bold text-green-900">{stats.positive}</div>
          <div className="text-sm text-green-600 mt-2">{stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}% of all feedback</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="font-medium text-red-700 mb-1">Negative</div>
          <div className="text-primaryxl font-bold text-red-900">{stats.negative}</div>
          <div className="text-sm text-red-600 mt-2">{stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}% of all feedback</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="font-medium text-amber-800 mb-1">Needs Attention</div>
          <div className="text-primaryxl font-bold text-amber-900">2 Pantries</div>
          <div className="text-sm text-amber-700 mt-2">Reliability score &lt; 50</div>
        </div>
      </div>

      {/* Submit New Feedback - THE DEMO KILLER FEATURE */}
      <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-blue-900 mb-3">🧪 Live AI Demo: Submit Feedback</h3>
        <p className="text-sm text-blue-700 mb-4">Type a real feedback message below and watch the AI categorize it instantly.</p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            placeholder='Try: "The line was too long and they ran out of milk"'
            className="flex-1 px-4 py-3 rounded-lg border border-blue-200 bg-card text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            disabled={isAnalyzing}
          />
          <button
            type="submit"
            disabled={isAnalyzing || !newFeedback.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Analyzing...
              </span>
            ) : "Analyze with AI"}
          </button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Feedback Feed */}
        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col max-h-[500px]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-lg text-slate-900">AI Analyzed Feedback Stream</h3>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {feedbackList.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No feedback yet. Submit some above!</p>
            ) : (
              feedbackList.map((fb) => (
                <div key={fb.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50 shadow-sm transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-400">{new Date(fb.createdAt).toLocaleString()}</span>
                    <Badge variant={fb.sentiment === "Negative" ? "destructive" : fb.sentiment === "Positive" ? "default" : "secondary"}>
                      {fb.sentiment}
                    </Badge>
                  </div>
                  <p className="text-slate-800 italic mb-3">&ldquo;{fb.text}&rdquo;</p>
                  <div className="flex gap-2 flex-wrap">
                    {fb.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reliability Widget */}
        <div className="h-full">
          <ReliabilityScore />
        </div>
      </div>
    </div>
  );
}
