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
    LOW: "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]",
    MEDIUM: "bg-[#451A03] text-[#F59E0B] border-[#27272A]",
    HIGH: "bg-[#450A0A] text-[#EF4444] border-[#27272A]",
    CRITICAL: "bg-[#450A0A] text-[#EF4444] border-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.3)]",
  };

  const statusColors: Record<string, string> = {
    RESOLVED: "bg-[#064E3B] text-[#22C55E] border-[#27272A]",
    AUTO_APPROVE: "bg-[#064E3B] text-[#22C55E] border-[#27272A]",
    VERIFIED: "bg-[#064E3B] text-[#22C55E] border-[#27272A]",
    PROPOSED: "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]",
    DIAGNOSED: "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]",
    TRIAGED: "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]",
    NEEDS_REVIEW: "bg-[#451A03] text-[#F59E0B] border-[#27272A]",
    REJECTED: "bg-[#450A0A] text-[#EF4444] border-[#27272A]",
    ROLLED_BACK: "bg-[#450A0A] text-[#EF4444] border-[#EF4444] animate-pulse font-bold",
    PENDING: "bg-[#451A03] text-[#F59E0B] border-[#27272A]",
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
      className="block block bg-[#111111] border border-[#27272A] rounded-[12px] overflow-hidden hover:border-[#FACC15] transition-all duration-200 shadow-2xl shadow-black/50 hover:shadow-[0_10px_25px_rgba(0,0,0,0.8)] hover:-translate-y-1 group cursor-pointer motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1"
    >
      {/* Emergency Pulsing Red Banner Strip */}
      {isEmergencyIncident && (
        <div className="bg-[#450A0A] text-[#FFFFFF] border-b border-[#EF4444] px-4 py-1.5 text-xs font-bold font-mono tracking-wider flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping"></span>
            🚨 EMERGENCY — Rollback Available
          </span>
          <span className="text-[10px] bg-[#450A0A] px-2 py-0.5 rounded text-[#FFFFFF] border border-[#EF4444]">
            AUTO-GUARDRAIL
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#FFFFFF] text-base group-hover:text-[#FACC15] transition-colors">
              {incident.project || "Unknown Project"}
            </span>
            <span className="text-xs text-[#A1A1AA] bg-[#050505] px-2 py-0.5 rounded border border-[#27272A] font-mono">
              {incident.service || "pipeline"}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Retry Badge */}
            {incident.retry_count > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-[#451A03] text-[#F59E0B] border-[#27272A] flex items-center gap-1">
                🔁 Retry {incident.retry_count}
              </span>
            )}
            {/* Severity Pill */}
            <span className={`text-[11px] font-semibold px-[10px] py-[2px] rounded-full border ${sevClass}`}>
              {incident.severity}
            </span>
            {/* Status Badge (Pulsing Red for ROLLED_BACK) */}
            <span className={`text-[11px] font-semibold px-[10px] py-[2px] rounded-full border ${statusClass}`}>
              {incident.status}
            </span>
          </div>
        </div>

        {/* Incident ID & Error Type */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span className="font-mono text-[#A1A1AA]">
              ID: {incident.incident_id ? incident.incident_id.slice(0, 8) : "N/A"}...
            </span>
            <span className="text-[#A1A1AA]">{relativeTime}</span>
          </div>

          {incident.error_type && (
            <p className="text-xs font-mono text-[#FACC15] font-semibold">
              [{incident.error_type}]
            </p>
          )}
        </div>

        {/* Stderr Preview */}
        {truncatedStderr && (
          <div className="mb-4 bg-[#1A1A1A] rounded-lg p-2.5 border border-[#27272A] font-mono text-xs text-[#A1A1AA] line-clamp-2">
            {truncatedStderr}
          </div>
        )}

        {/* Footer Metrics */}
        <div className="flex items-center justify-between border-t border-[#27272A] pt-3 text-xs text-[#A1A1AA]">
          <div>
            Exit Code: <code className="text-[#EF4444] font-mono font-semibold">{incident.exit_code ?? "N/A"}</code>
          </div>
          <div className="flex items-center space-x-3">
            <span>Users: <strong className="text-[#FFFFFF]">{incident.affected_users_estimate || 0}</strong></span>
            <span className="text-[#FACC15] font-semibold group-hover:translate-x-1 transition-transform inline-block">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
