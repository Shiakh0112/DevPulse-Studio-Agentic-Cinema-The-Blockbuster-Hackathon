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
    if (typeUpper === "TRIAGED") return <Search className="w-4 h-4 text-blue-400" />;
    if (typeUpper === "DIAGNOSED") return <Stethoscope className="w-4 h-4 text-cyan-400" />;
    if (typeUpper === "PROPOSED") return <FileEdit className="w-4 h-4 text-indigo-400" />;
    if (typeUpper === "VERIFIED") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (typeUpper.includes("VERIFICATION_FAILED") || typeUpper.includes("VERIFICATION_FAILED_RETRYING") || typeUpper.includes("RETRYING"))
      return <RotateCcw className="w-4 h-4 text-amber-400 animate-spin-slow" />;
    if (typeUpper === "DECIDED" || typeUpper === "GOVERNANCE_DECISION") return <Gavel className="w-4 h-4 text-yellow-400" />;
    if (typeUpper === "PR_CREATED") return <GitPullRequest className="w-4 h-4 text-purple-400" />;
    if (typeUpper === "ALERT_SENT" || typeUpper === "CRASH_ALERT") return <Bell className="w-4 h-4 text-amber-400" />;
    if (typeUpper === "EMERGENCY_FLAGGED") return <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />;
    if (typeUpper === "ROLLBACK_TRIGGERED" || typeUpper === "ROLLED_BACK") return <Undo2 className="w-4 h-4 text-rose-300" />;
    if (typeUpper === "PIPELINE_ERROR") return <AlertOctagon className="w-4 h-4 text-rose-500" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  // Map events to styled timeline items
  const timelineNodes = events.map((ev, idx) => {
    const payload = parsePayload(ev.payload);
    const eventTypeUpper = ev.event_type.toUpperCase();
    const attempt = payload.attempt_number || 1;

    let title = ev.event_type;
    let description = "";
    let badgeStyle = "bg-slate-800 border-slate-700 text-slate-300";
    let iconBg = "bg-slate-900 border-slate-700";

    if (eventTypeUpper === "INGESTED") {
      title = "🚨 Incident Ingested";
      description = `Crash telemetry captured for service '${payload.service || "pipeline"}' with exit code ${payload.exit_code ?? "137"}`;
      badgeStyle = "bg-slate-800 text-slate-300 border-slate-700";
    } else if (eventTypeUpper === "TRIAGED") {
      title = "🔍 Triage Completed";
      description = `Classified crash as ${payload.error_type || "UNKNOWN"} (Severity: ${payload.severity || "MEDIUM"})`;
      badgeStyle = "bg-blue-500/20 text-blue-400 border-blue-500/40";
      iconBg = "bg-blue-950 border-blue-700";
    } else if (eventTypeUpper === "DIAGNOSED") {
      title = "🩺 Root Cause Diagnosed";
      description = payload.root_cause_hypothesis || "Identified empirical root cause hypothesis.";
      badgeStyle = "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
      iconBg = "bg-cyan-950 border-cyan-700";
    } else if (eventTypeUpper === "PROPOSED") {
      title = `🛠️ Fix Proposed (Attempt #${attempt})`;
      description = `Generated ${payload.change_type || "CONFIG"} patch for file '${payload.file_path || "config.yaml"}' (Confidence: ${payload.confidence || 0.88}, Risk: ${payload.risk || "LOW"})`;
      badgeStyle = "bg-indigo-500/20 text-indigo-400 border-indigo-500/40";
      iconBg = "bg-indigo-950 border-indigo-700";
    } else if (eventTypeUpper.endsWith("...")) {
      title = `⏳ ${ev.event_type}`;
      description = payload.description || "Agent is processing in background...";
      badgeStyle = "bg-slate-800/80 text-indigo-300 border-indigo-500/40 animate-pulse";
      iconBg = "bg-slate-900 border-indigo-700";
    } else if (eventTypeUpper.includes("VERIFICATION_FAILED") || eventTypeUpper === "VERIFICATION_FAILED_RETRYING") {
      title = `🔁 Attempt ${attempt} Failed — Retrying with error context`;
      description = `Deterministic sandbox tests failed. Extracting failure log context to feed back into Attempt #${attempt + 1}`;
      badgeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold";
      iconBg = "bg-amber-950 border-amber-600";
    } else if (eventTypeUpper === "VERIFIED") {
      title = attempt > 1 ? `Attempt ${attempt} Passed ✅` : "🧪 Sandbox Verification Passed ✅";
      description = `All deterministic tests passed cleanly on Attempt #${attempt}. Code patch validated for governance.`;
      badgeStyle = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold";
      iconBg = "bg-emerald-950 border-emerald-600";
    } else if (eventTypeUpper === "EMERGENCY_FLAGGED") {
      title = "🔴 EMERGENCY FLAGGED";
      description = `Critical severity + ${payload.affected_users_estimate || 500}+ users impacted triggered Auto-Rollback guardrail.`;
      badgeStyle = "bg-rose-950 text-rose-400 border-rose-500/80 animate-pulse font-bold";
      iconBg = "bg-rose-950 border-rose-600";
    } else if (eventTypeUpper === "PR_CREATED") {
      title = "📦 GitHub Auto-Fix PR Created";
      description = `Created Pull Request for verified patch: ${payload.pr_url || "GitHub PR"}`;
      badgeStyle = "bg-purple-500/20 text-purple-400 border-purple-500/40";
      iconBg = "bg-purple-950 border-purple-700";
    } else if (eventTypeUpper === "ROLLED_BACK") {
      title = "⏪ Emergency Rollback Executed";
      description = `Rolled back deployment to previous stable version by ${payload.triggered_by || "system-auto"}`;
      badgeStyle = "bg-rose-950 text-rose-300 border-rose-600 font-bold";
      iconBg = "bg-rose-950 border-rose-600";
    } else if (eventTypeUpper === "PIPELINE_ERROR") {
      title = "⚠️ Pipeline Execution Error";
      description = payload.error || "An exception occurred during pipeline processing.";
      badgeStyle = "bg-rose-950/80 text-rose-400 border-rose-800 font-bold";
      iconBg = "bg-rose-950 border-rose-700";
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
    <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Incident Timeline & Audit Trail
        </h2>
        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
          {events.length} Recorded Events
        </span>
      </div>

      {timelineNodes.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center font-mono">
          No audit timeline events recorded for this incident yet.
        </p>
      ) : (
        <div className="relative border-l-2 border-slate-700 ml-4 space-y-8 my-2">
          {timelineNodes.map((node) => (
            <div key={node.id} className="relative pl-8 group">
              {/* Node Icon Circle */}
              <div
                className={`absolute -left-[17px] top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${node.iconBg}`}
              >
                {getEventIcon(node.type)}
              </div>

              {/* Event Card Content */}
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/80 space-y-2 shadow-md hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${node.badgeStyle}`}>
                    {node.title}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(node.timestamp).toLocaleString()}
                  </span>
                </div>

                {node.description && (
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">
                    {node.description}
                  </p>
                )}

                {node.payload?.pr_url && (
                  <a
                    href={node.payload.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono underline pt-1"
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
