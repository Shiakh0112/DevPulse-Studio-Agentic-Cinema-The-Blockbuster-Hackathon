import React from "react";

export default function FeedLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-10 space-y-8 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-96 bg-slate-800/60 rounded"></div>
          </div>
          <div className="h-9 w-32 bg-slate-800 rounded-lg"></div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-slate-700/60 rounded"></div>
              <div className="h-10 bg-slate-900/80 rounded-lg border border-slate-800"></div>
            </div>
          ))}
        </div>

        {/* Grid Card Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <div className="h-5 w-32 bg-slate-700 rounded"></div>
                <div className="h-5 w-20 bg-slate-700/80 rounded-full"></div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-40 bg-slate-700/50 rounded"></div>
                <div className="h-3 w-28 bg-slate-700/40 rounded"></div>
              </div>
              <div className="h-16 bg-slate-950/80 rounded-lg border border-slate-800"></div>
              <div className="flex justify-between pt-2 border-t border-slate-700/40">
                <div className="h-3 w-20 bg-slate-700/50 rounded"></div>
                <div className="h-3 w-24 bg-slate-700/50 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
