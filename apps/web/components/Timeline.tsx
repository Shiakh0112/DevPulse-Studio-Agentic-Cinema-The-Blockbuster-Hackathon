"use client";

import React from "react";
import {
  Search,
  Stethoscope,
  FileEdit,
  CheckCircle,
  RotateCcw,
  Gavel,
  GitPullRequest,
  Bell,
  AlertTriangle,
  Undo2,
  Clock,
  ShieldCheck,
  AlertOctagon,
} from "lucide-react";
import { FixProposal, VerificationRun, GovernanceDecision, RollbackEvent } from "@/lib/types";

interface IncidentEvent {
  event_id: string;
  incident_id: string;
  event_type: string;
  payload: string | Record<string, any>;
  created_at: string;
}

interface TimelineProps {
  events: IncidentEvent[];
  proposals?: FixProposal[];
  verificationRuns?: VerificationRun[];
  governanceDecision?: GovernanceDecision | null;
  rollbackEvents?: RollbackEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({
  events = [],
  proposals = [],
  verificationRuns = [],
  governanceDecision,
  rollbackEvents = [],
}) => {
  // Helper to parse payload safely
  const parsePayload = (payload: string | Record<string, any>): Record<string, any> => {
    if (typeof payload === "string") {
      try {
        return JSON.parse(payload);
      } catch {
        return { raw: payload };
      }
    }
    return payload || {};
  };

  // Helper to render Lucide icon per event type
  const getEventIcon = (eventType: string) => {
    const typeUpper = eventType.toUpperCase();
    if (typeUpper.endsWith("...")) return <div className="w-[18px] h-[18px] border-[2px] border-[#3B82F6] border-t-transparent rounded-full motion-safe:animate-spin" />;
    if (typeUpper === "TRIAGED") return <Search size={18} strokeWidth={2} className="text-[#3B82F6]" />;
    if (typeUpper === "DIAGNOSED") return <Stethoscope size={18} strokeWidth={2} className="text-[#3B82F6]" />;
    if (typeUpper === "PROPOSED") return <FileEdit size={18} strokeWidth={2} className="text-[#3B82F6]" />;
    if (typeUpper === "VERIFIED") return <CheckCircle size={18} strokeWidth={2} className="text-[#22C55E]" />;
    if (typeUpper.includes("VERIFICATION_FAILED") || typeUpper.includes("VERIFICATION_FAILED_RETRYING") || typeUpper.includes("RETRYING"))
      return <RotateCcw size={18} strokeWidth={2} className="text-[#F59E0B] motion-safe:animate-spin" />;
    if (typeUpper === "DECIDED" || typeUpper === "GOVERNANCE_DECISION") return <Gavel size={18} strokeWidth={2} className="text-[#F59E0B]" />;
    if (typeUpper === "PR_CREATED") return <GitPullRequest size={18} strokeWidth={2} className="text-[#C084FC]" />;
    if (typeUpper === "ALERT_SENT" || typeUpper === "CRASH_ALERT") return <Bell size={18} strokeWidth={2} className="text-[#FACC15]" />;
    if (typeUpper === "EMERGENCY_FLAGGED") return <AlertTriangle size={18} strokeWidth={2} className="text-[#EF4444] motion-safe:animate-pulse" />;
    if (typeUpper === "ROLLBACK_TRIGGERED" || typeUpper === "ROLLED_BACK") return <Undo2 size={18} strokeWidth={2} className="text-[#EF4444]" />;
    if (typeUpper === "PIPELINE_ERROR") return <AlertOctagon size={18} strokeWidth={2} className="text-[#EF4444]" />;
    return <Clock size={18} strokeWidth={2} className="text-[#A1A1AA]" />;
  };

  // Map events to styled timeline items
  const timelineNodes = events.map((ev, idx) => {
    const payload = parsePayload(ev.payload);
    const eventTypeUpper = ev.event_type.toUpperCase();
    const attempt = payload.attempt_number || 1;

    let title = ev.event_type;
    let description = "";
    let badgeStyle = "bg-[#111111] text-[#A1A1AA]";
    let iconBg = "bg-[#050505] border-[#27272A]";

    if (eventTypeUpper === "INGESTED") {
      title = "🚨 Incident Ingested";
      description = `Crash telemetry captured for service '${payload.service || "pipeline"}' with exit code ${payload.exit_code ?? "137"}`;
      badgeStyle = "bg-[#111111] text-[#A1A1AA]";
    } else if (eventTypeUpper === "TRIAGED") {
      title = "🔍 Triage Completed";
      description = `Classified crash as ${payload.error_type || "UNKNOWN"} (Severity: ${payload.severity || "MEDIUM"})`;
      badgeStyle = "bg-[#1E3A5F] text-[#3B82F6]";
      iconBg = "bg-[#1E3A5F] border-[#3B82F6]/30";
    } else if (eventTypeUpper === "DIAGNOSED") {
      title = "🩺 Root Cause Diagnosed";
      description = payload.root_cause_hypothesis || "Identified empirical root cause hypothesis.";
      badgeStyle = "bg-[#1E3A5F] text-[#3B82F6]";
      iconBg = "bg-[#1E3A5F] border-[#3B82F6]/30";
    } else if (eventTypeUpper === "PROPOSED") {
      title = `🛠️ Fix Proposed (Attempt #${attempt})`;
      description = `Generated ${payload.change_type || "CONFIG"} patch for file '${payload.file_path || "config.yaml"}' (Confidence: ${payload.confidence || 0.88}, Risk: ${payload.risk || "LOW"})`;
      badgeStyle = "bg-[#1E3A5F] text-[#3B82F6]";
      iconBg = "bg-[#1E3A5F] border-[#3B82F6]/30";
    } else if (eventTypeUpper.endsWith("...")) {
      title = `⏳ ${ev.event_type}`;
      description = payload.description || "Agent is processing in background...";
      badgeStyle = "bg-[#111111] text-[#3B82F6]";
      iconBg = "bg-[#050505] border-[#27272A]";
    } else if (eventTypeUpper.includes("VERIFICATION_FAILED") || eventTypeUpper === "VERIFICATION_FAILED_RETRYING") {
      title = `🔁 Attempt ${attempt} Failed — Retrying with error context`;
      description = `Deterministic sandbox tests failed. Extracting failure log context to feed back into Attempt #${attempt + 1}`;
      badgeStyle = "bg-[#451A03] text-[#F59E0B]";
      iconBg = "bg-[#451A03] border-[#F59E0B]/30";
    } else if (eventTypeUpper === "VERIFIED") {
      title = attempt > 1 ? `Attempt ${attempt} Passed ✅` : "🧪 Sandbox Verification Passed ✅";
      description = `All deterministic tests passed cleanly on Attempt #${attempt}. Code patch validated for governance.`;
      badgeStyle = "bg-[#064E3B] text-[#22C55E]";
      iconBg = "bg-[#064E3B] border-[#22C55E]/30";
    } else if (eventTypeUpper === "EMERGENCY_FLAGGED") {
      title = "🔴 EMERGENCY FLAGGED";
      description = `Critical severity + ${payload.affected_users_estimate || 500}+ users impacted triggered Auto-Rollback guardrail.`;
      badgeStyle = "bg-[#450A0A] text-[#EF4444]";
      iconBg = "bg-[#450A0A] border-[#EF4444]/30";
    } else if (eventTypeUpper === "PR_CREATED") {
      title = "📦 GitHub Auto-Fix PR Created";
      description = `Created Pull Request for verified patch: ${payload.pr_url || "GitHub PR"}`;
      badgeStyle = "bg-[#3B0764] text-[#C084FC]";
      iconBg = "bg-[#3B0764] border-[#C084FC]/30";
    } else if (eventTypeUpper === "ROLLED_BACK") {
      title = "⏪ Emergency Rollback Executed";
      description = `Rolled back deployment to previous stable version by ${payload.triggered_by || "system-auto"}`;
      badgeStyle = "bg-[#450A0A] text-[#EF4444]";
      iconBg = "bg-[#450A0A] border-[#EF4444]/30";
    } else if (eventTypeUpper === "PIPELINE_ERROR") {
      title = "⚠️ Pipeline Execution Error";
      description = payload.error || "An exception occurred during pipeline processing.";
      badgeStyle = "bg-[#450A0A] text-[#EF4444]";
      iconBg = "bg-[#450A0A] border-[#EF4444]/30";
    }

    return {
      id: ev.event_id || `ev-${idx}`,
      type: ev.event_type,
      title,
      description,
      timestamp: ev.created_at || new Date().toISOString(),
      badgeStyle,
      iconBg,
      payload,
    };
  });

  return (
    <div className="bg-[#111111] border border-[#27272A] rounded-[12px] p-6">
      <div className="flex items-center justify-between border-b border-[#27272A] pb-4 mb-6">
        <h2 className="text-[16px] font-semibold text-[#FFFFFF] flex items-center gap-2">
          <ShieldCheck size={18} strokeWidth={2} className="text-[#FACC15]" />
          Incident Timeline & Audit Trail
        </h2>
        <span className="text-[11px] font-semibold text-[#A1A1AA] bg-[#050505] px-2 py-0.5 rounded-[999px] border border-[#27272A] uppercase tracking-wide">
          {events.length} Events
        </span>
      </div>

      {timelineNodes.length === 0 ? (
        <p className="text-[14px] text-[#A1A1AA] py-8 text-center">
          No audit timeline events recorded for this incident yet.
        </p>
      ) : (
        <div className="relative border-l-[2px] border-[#27272A] ml-4 space-y-6 my-2">
          {timelineNodes.map((node) => (
            <div key={node.id} className="relative pl-6 group">
              {/* Node Icon Circle */}
              <div
                className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border flex items-center justify-center motion-safe:transition-all motion-safe:duration-200 motion-safe:group-hover:scale-110 ${node.iconBg}`}
              >
                {getEventIcon(node.type)}
              </div>

              {/* Event Card Content */}
              <div className="bg-[#050505] rounded-[12px] p-4 border border-[#27272A] space-y-2 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-[#FACC15]/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[999px] border border-[#27272A] ${node.badgeStyle}`}>
                    {node.title}
                  </span>
                  <span className="text-[12px] text-[#A1A1AA] font-bold">
                    {new Date(node.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </div>

                {node.description && (
                  <p className="text-[14px] text-[#FFFFFF] font-normal leading-relaxed">
                    {node.description}
                  </p>
                )}

                {node.payload?.pr_url && (
                  <a
                    href={node.payload.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14px] text-[#FACC15] hover:text-[#EAB308] underline mt-2"
                  >
                    <GitPullRequest size={16} strokeWidth={2} />
                    Open Pull Request
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
