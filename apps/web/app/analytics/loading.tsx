import React from "react";

export default function AnalyticsLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-border-subtle pb-4 space-y-2">
        <div className="h-8 w-80 bg-bg-card rounded-lg"></div>
        <div className="h-4 w-96 bg-bg-card/60 rounded"></div>
      </div>

      {/* ROI Widget Skeleton */}
      <div className="h-40 bg-bg-card/80 border border-border-subtle rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-bg-main/80 rounded-xl p-4 space-y-2">
            <div className="h-3 w-24 bg-slate-700/60 rounded"></div>
            <div className="h-7 w-20 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* 3 Chart Section Skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-48 bg-bg-card rounded"></div>
          <div className="h-64 bg-bg-card/60 border border-border-subtle rounded-xl"></div>
        </div>
      ))}
    </div>
  );
}
