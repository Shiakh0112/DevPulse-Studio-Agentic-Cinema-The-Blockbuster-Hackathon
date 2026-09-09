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

  const getEventIcon = (eventType: string) => {
    const typeUpper = eventType.toUpperCase();
    if (typeUpper.endsWith("...")) return <div className="w-[18px] h-[18px] border-2 border-[var(--info-text)] border-t-transparent rounded-full motion-safe:animate-spin" />;
    if (typeUpper === "TRIAGED") return <Search size={18} strokeWidth={2} className="text-[var(--info-text)]" />;
    if (typeUpper === "DIAGNOSED") return <Stethoscope size={18} strokeWidth={2} className="text-[var(--info-text)]" />;
    if (typeUpper === "PROPOSED") return <FileEdit size={18} strokeWidth={2} className="text-[var(--info-text)]" />;
    if (typeUpper === "VERIFIED") return <CheckCircle size={18} strokeWidth={2} className="text-[var(--success-text)]" />;
    if (typeUpper.includes("VERIFICATION_FAILED") || typeUpper.includes("VERIFICATION_FAILED_RETRYING") || typeUpper.includes("RETRYING"))
      return <RotateCcw size={18} strokeWidth={2} className="text-[var(--warning-text)] motion-safe:animate-spin" />;
    if (typeUpper === "DECIDED" || typeUpper === "GOVERNANCE_DECISION") return <Gavel size={18} strokeWidth={2} className="text-[var(--warning-text)]" />;
    if (typeUpper === "PR_CREATED") return <GitPullRequest size={18} strokeWidth={2} className="text-[var(--purple-text)]" />;
    if (typeUpper === "ALERT_SENT" || typeUpper === "CRASH_ALERT") return <Bell size={18} strokeWidth={2} className="text-primary" />;
    if (typeUpper === "EMERGENCY_FLAGGED") return <AlertTriangle size={18} strokeWidth={2} className="text-[var(--danger-text)] motion-safe:animate-pulse" />;
    if (typeUpper === "ROLLBACK_TRIGGERED" || typeUpper === "ROLLED_BACK") return <Undo2 size={18} strokeWidth={2} className="text-[var(--danger-text)]" />;
    if (typeUpper === "PIPELINE_ERROR") return <AlertOctagon size={18} strokeWidth={2} className="text-[var(--danger-text)]" />;
    return <Clock size={18} strokeWidth={2} className="text-text-secondary" />;
  };

  const timelineNodes = events.map((ev, idx) => {
    const payload = parsePayload(ev.payload);
    const eventTypeUpper = ev.event_type.toUpperCase();
    const attempt = payload.attempt_number || 1;

    let title = ev.event_type;
    let description = "";
    let badgeStyle = "bg-page text-text-secondary";
    let iconBg = "bg-page border-border";

    if (eventTypeUpper === "INGESTED") {
      title = "🚨 Incident Ingested";
      description = `Crash telemetry captured for service '${payload.service || "pipeline"}' with exit code ${payload.exit_code ?? "137"}`;
    } else if (eventTypeUpper === "TRIAGED") {
      title = "🔍 Triage Completed";
      description = `Classified crash as ${payload.error_type || "UNKNOWN"} (Severity: ${payload.severity || "MEDIUM"})`;
      badgeStyle = "bg-info text-[var(--info-text)]";
      iconBg = "bg-info border-[var(--info-text)]";
    } else if (eventTypeUpper === "DIAGNOSED") {
      title = "🩺 Root Cause Diagnosed";
      description = payload.root_cause_hypothesis || "Identified empirical root cause hypothesis.";
      badgeStyle = "bg-info text-[var(--info-text)]";
      iconBg = "bg-info border-[var(--info-text)]";
    } else if (eventTypeUpper === "PROPOSED") {
      title = `🛠️ Fix Proposed (Attempt #${attempt})`;
      description = `Generated ${payload.change_type || "CONFIG"} patch for file '${payload.file_path || "config.yaml"}'`;
      badgeStyle = "bg-info text-[var(--info-text)]";
      iconBg = "bg-info border-[var(--info-text)]";
    } else if (eventTypeUpper.endsWith("...")) {
      title = `⏳ ${ev.event_type}`;
      description = payload.description || "Agent is processing in background...";
      badgeStyle = "bg-page text-[var(--info-text)]";
    } else if (eventTypeUpper.includes("VERIFICATION_FAILED") || eventTypeUpper === "VERIFICATION_FAILED_RETRYING") {
      title = `🔁 Attempt ${attempt} Failed — Retrying`;
      description = `Deterministic sandbox tests failed. Extracting failure log context to feed back into Attempt #${attempt + 1}`;
      badgeStyle = "bg-warning text-[var(--warning-text)]";
      iconBg = "bg-warning border-[var(--warning-text)]";
    } else if (eventTypeUpper === "VERIFIED") {
      title = attempt > 1 ? `Attempt ${attempt} Passed ✅` : "🧪 Sandbox Verification Passed ✅";
      description = `All deterministic tests passed cleanly on Attempt #${attempt}. Code patch validated.`;
      badgeStyle = "bg-success text-[var(--success-text)]";
      iconBg = "bg-success border-[var(--success-text)]";
    } else if (eventTypeUpper === "EMERGENCY_FLAGGED") {
      title = "🔴 EMERGENCY FLAGGED";
      description = `Critical severity + users impacted triggered Auto-Rollback guardrail.`;
      badgeStyle = "bg-danger text-[var(--danger-text)]";
      iconBg = "bg-danger border-[var(--danger-text)]";
    } else if (eventTypeUpper === "PR_CREATED") {
      title = "📦 GitHub Auto-Fix PR Created";
      description = `Created Pull Request for verified patch.`;
      badgeStyle = "bg-purple text-[var(--purple-text)]";
      iconBg = "bg-purple border-[var(--purple-text)]";
    } else if (eventTypeUpper === "ROLLED_BACK") {
      title = "⏪ Emergency Rollback Executed";
      description = `Rolled back deployment to previous stable version by ${payload.triggered_by || "system-auto"}`;
      badgeStyle = "bg-danger text-[var(--danger-text)]";
      iconBg = "bg-danger border-[var(--danger-text)]";
    } else if (eventTypeUpper === "PIPELINE_ERROR") {
      title = "⚠️ Pipeline Execution Error";
      description = payload.error || "An exception occurred during pipeline processing.";
      badgeStyle = "bg-danger text-[var(--danger-text)]";
      iconBg = "bg-danger border-[var(--danger-text)]";
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
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <h2 className="text-[16px] font-semibold text-text-primary flex items-center gap-2">
          <ShieldCheck size={18} strokeWidth={2} className="text-primary" />
          Incident Timeline
        </h2>
        <span className="text-[11px] font-semibold text-text-secondary bg-page px-2 py-0.5 rounded-full border border-border uppercase">
          {events.length} Events
        </span>
      </div>

      {timelineNodes.length === 0 ? (
        <p className="text-[14px] text-text-secondary py-8 text-center">
          No audit timeline events recorded for this incident yet.
        </p>
      ) : (
        <div className="relative border-l-[2px] border-border ml-4 space-y-6 my-2">
          {timelineNodes.map((node) => (
            <div key={node.id} className="relative pl-6 group">
              <div
                className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border flex items-center justify-center motion-safe:transition-all motion-safe:duration-200 motion-safe:group-hover:scale-110 ${node.iconBg}`}
              >
                {getEventIcon(node.type)}
              </div>

              <div className="bg-page rounded-lg p-4 border border-border space-y-2 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:border-primary">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border ${node.badgeStyle}`}>
                    {node.title}
                  </span>
                  <span className="text-[12px] text-text-secondary font-bold">
                    {new Date(node.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>

                {node.description && (
                  <p className="text-[14px] text-text-primary font-normal leading-relaxed">
                    {node.description}
                  </p>
                )}

                {node.payload?.pr_url && (
                  <a
                    href={node.payload.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14px] text-primary hover:text-primary-hover underline mt-2"
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
