"use client";

import React from "react";
import Link from "next/link";
import { Incident } from "@/lib/types";

interface IncidentCardProps {
  incident: Incident & { is_emergency?: boolean; isEmergency?: boolean; has_emergency_event?: boolean };
  isEmergency?: boolean;
}

function getRelativeTimeString(dateInput?: string | Date): string {
  if (!dateInput) return "just now";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "just now";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 10) return "just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ incident, isEmergency }) => {
  const severityColors: Record<string, string> = {
    LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    HIGH: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    CRITICAL: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  };

  const statusColors: Record<string, string> = {
    RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    AUTO_APPROVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    VERIFIED: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    PROPOSED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40",
    DIAGNOSED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    TRIAGED: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    NEEDS_REVIEW: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    REJECTED: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    ROLLED_BACK: "bg-rose-950/90 text-rose-400 border-rose-500/80 animate-pulse font-bold shadow-rose-500/20 shadow-lg",
    PENDING: "bg-slate-500/20 text-slate-400 border-slate-500/40",
  };

  const isEmergencyIncident =
    isEmergency ||
    incident.is_emergency ||
    incident.isEmergency ||
    incident.has_emergency_event ||
    (incident.severity === "CRITICAL" && (incident.affected_users_estimate || 0) >= 500) ||
    incident.status === "ROLLED_BACK";

  const sevClass = severityColors[incident.severity?.toUpperCase()] || severityColors.MEDIUM;
  const statusClass = statusColors[incident.status?.toUpperCase()] || statusColors.PENDING;
  const relativeTime = getRelativeTimeString(incident.created_at);

  const truncatedStderr = (incident.stderr_tail || incident.stderr_snippet || "")
    .trim()
    .slice(0, 140);

  return (
    <Link
      href={`/incident/${incident.incident_id}`}
      className="block bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl overflow-hidden hover:border-amber-500/50 transition-all shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 group cursor-pointer"
    >
      {/* Emergency Pulsing Red Banner Strip */}
      {isEmergencyIncident && (
        <div className="bg-rose-950 text-rose-200 border-b border-rose-600/80 px-4 py-1.5 text-xs font-bold font-mono tracking-wider flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            🚨 EMERGENCY — Rollback Available
          </span>
          <span className="text-[10px] bg-rose-900/90 px-2 py-0.5 rounded text-rose-100 border border-rose-700">
            AUTO-GUARDRAIL
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-100 text-base group-hover:text-amber-400 transition-colors">
              {incident.project || "Unknown Project"}
            </span>
            <span className="text-xs text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/50 font-mono">
              {incident.service || "pipeline"}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Retry Badge */}
            {incident.retry_count > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1">
                🔁 Retry {incident.retry_count}
              </span>
            )}
            {/* Severity Pill */}
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${sevClass}`}>
              {incident.severity}
            </span>
            {/* Status Badge (Pulsing Red for ROLLED_BACK) */}
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusClass}`}>
              {incident.status}
            </span>
          </div>
        </div>

        {/* Incident ID & Error Type */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-slate-300">
              ID: {incident.incident_id ? incident.incident_id.slice(0, 8) : "N/A"}...
            </span>
            <span className="text-slate-400">{relativeTime}</span>
          </div>

          {incident.error_type && (
            <p className="text-xs font-mono text-amber-400 font-semibold">
              [{incident.error_type}]
            </p>
          )}
        </div>

        {/* Stderr Preview */}
        {truncatedStderr && (
          <div className="mb-4 bg-slate-950/90 rounded-lg p-2.5 border border-slate-800 font-mono text-xs text-slate-300 line-clamp-2">
            {truncatedStderr}
          </div>
        )}

        {/* Footer Metrics */}
        <div className="flex items-center justify-between border-t border-slate-700/40 pt-3 text-xs text-slate-400">
          <div>
            Exit Code: <code className="text-rose-400 font-mono font-semibold">{incident.exit_code ?? "N/A"}</code>
          </div>
          <div className="flex items-center space-x-3">
            <span>Users: <strong className="text-slate-200">{incident.affected_users_estimate || 0}</strong></span>
            <span className="text-amber-400 font-semibold group-hover:translate-x-1 transition-transform inline-block">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
