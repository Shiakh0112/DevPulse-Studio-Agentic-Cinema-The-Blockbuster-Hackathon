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
    if (typeUpper.endsWith("...")) return <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />;
    if (typeUpper === "TRIAGED") return <Search className="w-4 h-4 text-[#3B82F6]" />;
    if (typeUpper === "DIAGNOSED") return <Stethoscope className="w-4 h-4 text-[#3B82F6]" />;
    if (typeUpper === "PROPOSED") return <FileEdit className="w-4 h-4 text-[#3B82F6]" />;
    if (typeUpper === "VERIFIED") return <CheckCircle className="w-4 h-4 text-[#22C55E]" />;
    if (typeUpper.includes("VERIFICATION_FAILED") || typeUpper.includes("VERIFICATION_FAILED_RETRYING") || typeUpper.includes("RETRYING"))
      return <RotateCcw className="w-4 h-4 text-[#FACC15] animate-spin-slow" />;
    if (typeUpper === "DECIDED" || typeUpper === "GOVERNANCE_DECISION") return <Gavel className="w-4 h-4 text-[#F59E0B]" />;
    if (typeUpper === "PR_CREATED") return <GitPullRequest className="w-4 h-4 text-[#C084FC]" />;
    if (typeUpper === "ALERT_SENT" || typeUpper === "CRASH_ALERT") return <Bell className="w-4 h-4 text-[#FACC15]" />;
    if (typeUpper === "EMERGENCY_FLAGGED") return <AlertTriangle className="w-4 h-4 text-[#EF4444] animate-bounce" />;
    if (typeUpper === "ROLLBACK_TRIGGERED" || typeUpper === "ROLLED_BACK") return <Undo2 className="w-4 h-4 text-[#EF4444]" />;
    if (typeUpper === "PIPELINE_ERROR") return <AlertOctagon className="w-4 h-4 text-rose-500" />;
    return <Clock className="w-4 h-4 text-[#A1A1AA]" />;
  };

  // Map events to styled timeline items
  const timelineNodes = events.map((ev, idx) => {
    const payload = parsePayload(ev.payload);
    const eventTypeUpper = ev.event_type.toUpperCase();
    const attempt = payload.attempt_number || 1;

    let title = ev.event_type;
    let description = "";
    let badgeStyle = "bg-[#111111] border-[#27272A] text-[#A1A1AA]";
    let iconBg = "bg-[#050505] border-[#27272A]";

    if (eventTypeUpper === "INGESTED") {
      title = "🚨 Incident Ingested";
      description = `Crash telemetry captured for service '${payload.service || "pipeline"}' with exit code ${payload.exit_code ?? "137"}`;
      badgeStyle = "bg-[#111111] text-[#A1A1AA] border-[#27272A]";
    } else if (eventTypeUpper === "TRIAGED") {
      title = "🔍 Triage Completed";
      description = `Classified crash as ${payload.error_type || "UNKNOWN"} (Severity: ${payload.severity || "MEDIUM"})`;
      badgeStyle = "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]";
      iconBg = "bg-[#1E3A5F] border-[#27272A]";
    } else if (eventTypeUpper === "DIAGNOSED") {
      title = "🩺 Root Cause Diagnosed";
      description = payload.root_cause_hypothesis || "Identified empirical root cause hypothesis.";
      badgeStyle = "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]";
      iconBg = "bg-[#1E3A5F] border-[#27272A]";
    } else if (eventTypeUpper === "PROPOSED") {
      title = `🛠️ Fix Proposed (Attempt #${attempt})`;
      description = `Generated ${payload.change_type || "CONFIG"} patch for file '${payload.file_path || "config.yaml"}' (Confidence: ${payload.confidence || 0.88}, Risk: ${payload.risk || "LOW"})`;
      badgeStyle = "bg-[#1E3A5F] text-[#3B82F6] border-[#27272A]";
      iconBg = "bg-[#1E3A5F] border-[#27272A]";
    } else if (eventTypeUpper.endsWith("...")) {
      title = `⏳ ${ev.event_type}`;
      description = payload.description || "Agent is processing in background...";
      badgeStyle = "bg-[#111111] text-[#3B82F6] border-[#27272A] animate-pulse";
      iconBg = "bg-[#050505] border-[#27272A]";
    } else if (eventTypeUpper.includes("VERIFICATION_FAILED") || eventTypeUpper === "VERIFICATION_FAILED_RETRYING") {
      title = `🔁 Attempt ${attempt} Failed — Retrying with error context`;
      description = `Deterministic sandbox tests failed. Extracting failure log context to feed back into Attempt #${attempt + 1}`;
      badgeStyle = "bg-[#451A03] text-[#EAB308] border-[#27272A] font-bold";
      iconBg = "bg-[#451A03] border-[#27272A]";
    } else if (eventTypeUpper === "VERIFIED") {
      title = attempt > 1 ? `Attempt ${attempt} Passed ✅` : "🧪 Sandbox Verification Passed ✅";
      description = `All deterministic tests passed cleanly on Attempt #${attempt}. Code patch validated for governance.`;
      badgeStyle = "bg-[#064E3B] text-[#22C55E] border-[#27272A] font-bold";
      iconBg = "bg-[#064E3B] border-[#27272A]";
    } else if (eventTypeUpper === "EMERGENCY_FLAGGED") {
      title = "🔴 EMERGENCY FLAGGED";
      description = `Critical severity + ${payload.affected_users_estimate || 500}+ users impacted triggered Auto-Rollback guardrail.`;
      badgeStyle = "bg-[#450A0A] text-[#EF4444] border-[#EF4444] animate-pulse font-bold";
      iconBg = "bg-[#450A0A] border-[#EF4444]";
    } else if (eventTypeUpper === "PR_CREATED") {
      title = "📦 GitHub Auto-Fix PR Created";
      description = `Created Pull Request for verified patch: ${payload.pr_url || "GitHub PR"}`;
      badgeStyle = "bg-[#3B0764] text-[#C084FC] border-[#27272A]";
      iconBg = "bg-[#3B0764] border-[#27272A]";
    } else if (eventTypeUpper === "ROLLED_BACK") {
      title = "⏪ Emergency Rollback Executed";
      description = `Rolled back deployment to previous stable version by ${payload.triggered_by || "system-auto"}`;
      badgeStyle = "bg-[#450A0A] text-[#EF4444] border-[#EF4444] font-bold";
      iconBg = "bg-[#450A0A] border-[#EF4444]";
    } else if (eventTypeUpper === "PIPELINE_ERROR") {
      title = "⚠️ Pipeline Execution Error";
      description = payload.error || "An exception occurred during pipeline processing.";
      badgeStyle = "bg-[#450A0A] text-[#EF4444] border-[#27272A] font-bold";
      iconBg = "bg-[#450A0A] border-[#EF4444]";
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
    <div className="bg-[#111111] border border-[#27272A] rounded-[12px] p-6 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-[#27272A] pb-4 mb-6">
        <h2 className="text-xl font-bold text-[#FFFFFF] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#FACC15]" />
          Incident Timeline & Audit Trail
        </h2>
        <span className="text-xs font-mono text-[#A1A1AA] bg-[#050505] px-3 py-1 rounded-full border border-[#27272A]">
          {events.length} Recorded Events
        </span>
      </div>

      {timelineNodes.length === 0 ? (
        <p className="text-sm text-[#A1A1AA] py-8 text-center font-mono">
          No audit timeline events recorded for this incident yet.
        </p>
      ) : (
        <div className="relative border-l-2 border-[#27272A] ml-4 space-y-8 my-2">
          {timelineNodes.map((node) => (
            <div key={node.id} className="relative pl-8 group">
              {/* Node Icon Circle */}
              <div
                className={`absolute -left-[17px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-xl shadow-black/30 transition-transform group-hover:scale-110 ${node.iconBg}`}
              >
                {getEventIcon(node.type)}
              </div>

              {/* Event Card Content */}
              <div className="bg-[#050505] rounded-[12px] p-4 border border-[#27272A] space-y-2 shadow-md hover:border-[#27272A] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${node.badgeStyle}`}>
                    {node.title}
                  </span>
                  <span className="text-xs text-[#A1A1AA] font-mono">
                    {new Date(node.timestamp).toLocaleString()}
                  </span>
                </div>

                {node.description && (
                  <p className="text-sm text-[#A1A1AA] font-medium leading-relaxed">
                    {node.description}
                  </p>
                )}

                {node.payload?.pr_url && (
                  <a
                    href={node.payload.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#FACC15] hover:text-[#EAB308] font-mono underline pt-1"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    Open Pull Request: {node.payload.pr_url}
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
