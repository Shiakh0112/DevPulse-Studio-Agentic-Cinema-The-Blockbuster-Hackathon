"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[Global App Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl">
        <div className="p-4 bg-rose-950/80 text-rose-400 border border-rose-800 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center shadow-lg">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Something went wrong</h2>
          <p className="text-sm text-slate-400">
            An unexpected error occurred while rendering this page or processing real-time telemetry.
          </p>
          {error.message && (
            <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-rose-300 text-left overflow-x-auto max-h-32">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Operation</span>
          </button>
          <Link
            href="/feed"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors border border-slate-700"
          >
            <Home className="w-4 h-4" />
            <span>Return to Feed</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
