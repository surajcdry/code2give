import React from 'react';

export default function ReliabilityScore() {
  // Demonstration numbers
  const avgFeedback = 8.5; // Out of 10
  const consistencyScore = 9.2; // Out of 10
  
  // Formula: (Avg Feedback * 0.6) + (Hours * 0.4)
  const reliabilityRaw = (avgFeedback * 0.6) + (consistencyScore * 0.4);
  const reliabilityScaled = Math.round(reliabilityRaw * 10); // scale to 100

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-lg text-slate-900">InsightEngine AI Analysis</h3>
        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded border border-amber-200">
          Proprietary Metric
        </span>
      </div>
      
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
        
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            {/* SVG Donut Chart representation */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray="351.858"
                strokeDashoffset={351.858 - (351.858 * (reliabilityScaled / 100))}
                className="text-emerald-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-slate-900">{reliabilityScaled}</span>
              <span className="text-xs text-primary-foreground0 font-medium">/ 100</span>
            </div>
          </div>
          <h4 className="font-bold text-slate-900 mt-4 text-xl">Operating Reliability Score</h4>
        </div>

        <div className="w-full bg-slate-50 rounded-lg p-4 border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Qualitative AI Grade (60% weight)</span>
            <span className="text-sm font-bold text-slate-900">{avgFeedback}/10</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mb-4">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${avgFeedback * 10}%` }}></div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Hours Consistency (40% weight)</span>
            <span className="text-sm font-bold text-slate-900">{consistencyScore}/10</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${consistencyScore * 10}%` }}></div>
          </div>
        </div>
        
        <p className="text-xs text-slate-400 text-center px-4">
          Score is actively calculated by layering Google Gemini sentiment extraction with tracked pantry operating timestamps.
        </p>
      </div>
    </div>
  );
}
