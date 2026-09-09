import React from "react";

export default function AnalyticsLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-[#1F293D] pb-4 space-y-2">
        <div className="h-8 w-80 bg-[#121824] rounded-lg"></div>
        <div className="h-4 w-96 bg-[#121824]/60 rounded"></div>
      </div>

      {/* ROI Widget Skeleton */}
      <div className="h-40 bg-[#121824]/80 border border-[#1F293D] rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#0B0E14]/80 rounded-xl p-4 space-y-2">
            <div className="h-3 w-24 bg-slate-700/60 rounded"></div>
            <div className="h-7 w-20 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* 3 Chart Section Skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-48 bg-[#121824] rounded"></div>
          <div className="h-64 bg-[#121824]/60 border border-[#1F293D] rounded-xl"></div>
        </div>
      ))}
    </div>
  );
}
