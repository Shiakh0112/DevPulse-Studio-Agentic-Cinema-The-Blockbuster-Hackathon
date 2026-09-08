"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Filter,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Bot,
  Shield,
  Eye,
  Lock,
  Clock,
} from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { CustomSelect } from "@/components/CustomSelect";

interface AuditRecord {
  id: string;
  incident_id: string;
  created_at: string;
  action_type: "GOVERNANCE_DECISION" | "EMERGENCY_ROLLBACK";
  decision_status: string;
  actor: string;
  reason: string;
  policy_version: string;
  project?: string;
  service?: string;
  error_type?: string;
  severity?: string;
}

export default function AuditPage() {
  const { currentRole, role } = useRole();
  const activeRole = currentRole || role || "viewer";

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");
  const [actorFilter, setActorFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchAuditData() {
      try {
        setLoading(true);
        const res = await fetch("/api/audit");
        if (res.ok) {
          const data = await res.json();
          setRecords(data || []);
        }
      } catch (err) {
        console.error("[Audit Page Fetch Error]", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditData();
  }, []);

  const isViewer = activeRole === "viewer";

  // Filter records
  const filteredRecords = records.filter((rec) => {
    if (decisionFilter !== "ALL") {
      const recDecision = rec.decision_status.toUpperCase();
      const targetFilter = decisionFilter.toUpperCase();
      if (targetFilter === "ROLLBACK" && !recDecision.includes("ROLLBACK")) {
        return false;
      } else if (targetFilter !== "ROLLBACK" && !recDecision.includes(targetFilter)) {
        return false;
      }
    }

    if (actorFilter !== "ALL") {
      if (rec.actor !== actorFilter) {
        return false;
      }
    }

    return true;
  });

  const getStatusBadge = (status: string, actionType: string) => {
    const stUpper = status.toUpperCase();

    if (stUpper.includes("AUTO") || stUpper.includes("APPROVED")) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          {status}
        </span>
      );
    }
    if (stUpper.includes("REVIEW") || stUpper.includes("NEEDS")) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          {status}
        </span>
      );
    }
    if (stUpper.includes("REJECT")) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
          {status}
        </span>
      );
    }
    if (actionType === "EMERGENCY_ROLLBACK" || stUpper.includes("ROLLBACK")) {
      return (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-600 font-bold">
          {status}
        </span>
      );
    }

    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
        {status}
      </span>
    );
  };

  const getActorBadge = (actor: string) => {
    if (actor === "system-auto" || actor.includes("auto")) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
          <Bot className="w-3 h-3" /> system-auto
        </span>
      );
    }
    if (actor === "studio-admin" || actor.includes("admin")) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
          <Shield className="w-3 h-3" /> studio-admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
        <UserCheck className="w-3 h-3" /> {actor}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
              Governance & Audit Trail
            </h1>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Immutable Policy Records
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete audit trail of AI patch approvals, deterministic sandbox verifications, and 1-Click emergency rollbacks.
          </p>
        </div>

        {/* Viewer Role Warning Banner */}
        {isViewer && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-mono">
            <Lock className="w-4 h-4" />
            <span>Read-Only Viewer Mode (Actions Restricted)</span>
          </div>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span>Audit Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Decision Type Filter */}
          <div className="w-48">
            <CustomSelect
              label="Decision"
              value={decisionFilter}
              onChange={setDecisionFilter}
              options={[
                { label: "ALL DECISIONS", value: "ALL" },
                { label: "AUTO_APPROVE", value: "AUTO_APPROVE" },
                { label: "NEEDS_REVIEW", value: "NEEDS_REVIEW" },
                { label: "HUMAN_APPROVED", value: "HUMAN_APPROVED" },
                { label: "REJECTED", value: "REJECTED" },
                { label: "ROLLBACK", value: "ROLLBACK" },
              ]}
            />
          </div>

          {/* Actor Type Filter */}
          <div className="w-48">
            <CustomSelect
              label="Actor"
              value={actorFilter}
              onChange={setActorFilter}
              options={[
                { label: "ALL ACTORS", value: "ALL" },
                { label: "system-auto", value: "system-auto" },
                { label: "studio-engineer", value: "studio-engineer" },
                { label: "studio-admin", value: "studio-admin" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Audit Trail Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching governance audit trail from ClickHouse...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-sm">
            No audit records match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Incident ID</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Decision / Status</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Reason / Details</th>
                  <th className="py-3.5 px-4">Policy Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(rec.created_at).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Incident ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold">
                      <Link
                        href={`/incident/${rec.incident_id}`}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline"
                      >
                        <span>{rec.incident_id.substring(0, 8)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>

                    {/* Action Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {rec.action_type === "EMERGENCY_ROLLBACK" ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5" /> Emergency Rollback
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" /> Governance Decision
                        </span>
                      )}
                    </td>

                    {/* Decision / Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(rec.decision_status, rec.action_type)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActorBadge(rec.actor)}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={rec.reason}>
                      {rec.reason || "No explicit reason specified"}
                    </td>

                    {/* Policy Version */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                        {rec.policy_version || "v2.1-deterministic"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
