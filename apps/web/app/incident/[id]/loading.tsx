import React from "react";

export default function IncidentDetailLoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-border-subtle pb-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-bg-card rounded-lg"></div>
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-bg-card rounded-full"></div>
            <div className="h-6 w-24 bg-bg-card rounded-full"></div>
          </div>
        </div>
        <div className="h-4 w-96 bg-bg-card/60 rounded"></div>
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 h-48 bg-bg-card/60 rounded-xl border border-border-subtle"></div>
        <div className="h-48 bg-bg-card/60 rounded-xl border border-border-subtle"></div>
      </div>

      {/* Timeline Skeleton */}
      <div className="h-64 bg-bg-card/60 rounded-xl border border-border-subtle"></div>
    </div>
  );
}
