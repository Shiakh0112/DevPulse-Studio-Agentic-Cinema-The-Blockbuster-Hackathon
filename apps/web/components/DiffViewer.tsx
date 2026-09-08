"use client";

import React from "react";
import { GitCommit, RotateCcw } from "lucide-react";

interface DiffViewerProps {
  diff?: string;
  patch?: string;
  attemptNumber?: number;
  fileName?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  patch,
  attemptNumber,
  fileName,
}) => {
  const rawDiff = diff || patch || "";

  if (!rawDiff || rawDiff.trim().length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 font-mono text-sm">
        No diff preview available.
      </div>
    );
  }

  const lines = rawDiff.split("\n");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header section if attemptNumber > 1 or fileName provided */}
      {(attemptNumber && attemptNumber > 1) || fileName ? (
        <div className="bg-slate-800/80 border-b border-slate-700/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          {fileName && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <GitCommit className="w-4 h-4 text-indigo-400" />
              <span>{fileName}</span>
            </div>
          )}
          {attemptNumber && attemptNumber > 1 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <RotateCcw className="w-3.5 h-3.5" />
              Fix Attempt #{attemptNumber} (after self-healing retry)
            </div>
          )}
        </div>
      ) : null}

      {/* Code Block with Horizontal Scroll */}
      <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed bg-slate-950/80">
        <pre className="whitespace-pre">
          {lines.map((line, idx) => {
            let lineStyle = "text-slate-300 px-2 py-0.5";

            if (line.startsWith("@@")) {
              lineStyle = "bg-slate-800/90 text-cyan-400 font-bold px-2 py-1 rounded-sm my-1 border-l-2 border-cyan-500";
            } else if (line.startsWith("---") || line.startsWith("+++")) {
              lineStyle = "text-slate-500 font-semibold px-2 py-0.5";
            } else if (line.startsWith("+")) {
              lineStyle = "bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 font-medium";
            } else if (line.startsWith("-")) {
              lineStyle = "bg-rose-950/60 text-rose-300 border-l-2 border-rose-500 px-2 py-0.5 font-medium";
            }

            return (
              <div key={idx} className={`flex items-start ${lineStyle}`}>
                <span className="inline-block w-8 select-none text-slate-600 text-right pr-3 font-mono">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre">{line}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};

export default DiffViewer;
