"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  GitPullRequest,
  Check,
  Clock,
  FileCode,
  Lock,
} from "lucide-react";
import { DiffViewer } from "@/components/DiffViewer";
import { useRole } from "@/lib/RoleContext";
import { Incident, FixProposal, VerificationRun, GovernanceDecision } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ApprovalPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;
  const router = useRouter();
  const { role } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [proposals, setProposals] = useState<FixProposal[]>([]);
  const [verificationRuns, setVerificationRuns] = useState<VerificationRun[]>([]);
  const [governanceDecision, setGovernanceDecision] = useState<GovernanceDecision | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/incidents/${incidentId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch incident data (${res.status})`);
        }
        const data = await res.json();
        setIncident(data.incident);
        setProposals(data.proposals || []);
        setVerificationRuns(data.verificationRuns || []);
        setGovernanceDecision(data.governanceDecision || null);
      } catch (err: any) {
        setError(err.message || "Failed to load approval data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [incidentId]);

  const finalProposal = proposals.length > 0 ? proposals[proposals.length - 1] : null;

  const handleApprove = async () => {
    try {
      setApproving(true);
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit approval");
      }

      setApprovedSuccess(data.pr_url || "PR created successfully!");
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-[#8A94A6] font-mono">
          <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
          <span>Loading proposed fix diff & verification results...</span>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          Incident Not Found
        </h2>
        <p className="text-sm font-mono">{error || "Could not retrieve incident details."}</p>
        <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-[#8A94A6] hover:text-white mt-4 underline">
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>
      </div>
    );
  }

  const decisionState = governanceDecision?.decision || "NEEDS_REVIEW";
  const isApproved = decisionState === "AUTO_APPROVE" || decisionState === "HUMAN_APPROVED";
  const isRejected = decisionState === "REJECTED";
  const isNeedsReview = decisionState === "NEEDS_REVIEW";

  const isRoleAuthorized = role === "engineer" || role === "admin";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-[#1F293D] pb-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/incident/${incidentId}`}
            className="p-2 bg-[#121824] hover:bg-slate-700 text-[#8A94A6] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#FFFFFF] flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-indigo-400" />
                Patch Governance Approval
              </h1>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#121824] text-[#6366F1] border border-[#1F293D]">
                {incident.incident_id.substring(0, 8)}
              </span>
            </div>
            <p className="text-sm text-[#8A94A6] mt-1">
              Review empirical patch diff, sandbox verification runs, and execute governance decision.
            </p>
          </div>
        </div>
      </div>

      {approvedSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-200 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-[#FFFFFF]">Human Approval Recorded</div>
              <div className="text-xs font-mono text-emerald-300">
                Pull Request generated: {approvedSuccess}
              </div>
            </div>
          </div>
          <a
            href={approvedSuccess}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            <GitPullRequest className="w-4 h-4" /> View PR
          </a>
        </div>
      )}

      {/* Rationale & Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rationale Card */}
        <div className="md:col-span-2 bg-[#121824]/80 border border-[#1F293D]/60 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F293D]/60 pb-3">
            <h3 className="text-lg font-bold text-[#FFFFFF] flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              Fix Rationale & Strategy
            </h3>
            {finalProposal && (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {finalProposal.change_type}
              </span>
            )}
          </div>
          <p className="text-sm text-[#8A94A6] leading-relaxed">
            {finalProposal?.rationale || "No rationale specified by the Fix Agent for this patch proposal."}
          </p>
          {finalProposal?.file_path && (
            <div className="text-xs font-mono text-[#8A94A6] bg-[#0B0E14] px-3 py-2 rounded-lg border border-[#1F293D] flex items-center gap-2">
              <span className="text-[#8A94A6]">Target File:</span>
              <span className="text-[#FFFFFF]">{finalProposal.file_path}</span>
            </div>
          )}
        </div>

        {/* Confidence & Risk Card */}
        <div className="bg-[#121824]/80 border border-[#1F293D]/60 rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <h3 className="text-lg font-bold text-[#FFFFFF] border-b border-[#1F293D]/60 pb-3">
            Risk & AI Confidence
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-[#8A94A6] mb-1">
                <span>Agent Confidence</span>
                <span className="font-mono text-emerald-400">
                  {Math.round((finalProposal?.confidence || 0.88) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#0B0E14] h-2 rounded-full overflow-hidden border border-[#1F293D]">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.round((finalProposal?.confidence || 0.88) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1F293D]/60">
              <span className="text-xs text-[#8A94A6]">Risk Assessment</span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  finalProposal?.risk === "HIGH"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : finalProposal?.risk === "MEDIUM"
                    ? "bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]/40"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                }`}
              >
                {finalProposal?.risk || "LOW"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1F293D]/60">
              <span className="text-xs text-[#8A94A6]">Governance Status</span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  isApproved
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : isRejected
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : "bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]/40 animate-pulse"
                }`}
              >
                {decisionState}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Code Diff Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-[#FFFFFF] flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-[#6366F1]" />
          Proposed Code Patch Preview
        </h2>
        {finalProposal ? (
          <DiffViewer
            diff={finalProposal.diff_unified}
            attemptNumber={finalProposal.attempt_number}
            fileName={finalProposal.file_path}
          />
        ) : (
          <div className="p-6 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono">
            No patch diff available for approval.
          </div>
        )}
      </div>

      {/* Verification Results Panel */}
      <div className="bg-[#121824]/80 border border-[#1F293D]/60 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1F293D]/60 pb-3">
          <h3 className="text-lg font-bold text-[#FFFFFF] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Sandbox Verification Results
          </h3>
          <span className="text-xs font-mono text-[#8A94A6]">
            {verificationRuns.length} Tests Executed
          </span>
        </div>

        {verificationRuns.length === 0 ? (
          <div className="text-sm text-[#8A94A6] py-4 text-center font-mono">
            No verification runs recorded for this proposal attempt.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {verificationRuns.map((run) => (
              <div
                key={run.run_id}
                className="bg-[#0B0E14] border border-[#1F293D] rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {run.passed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-[#FFFFFF]">{run.test_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#8A94A6]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{run.duration_seconds}s</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-[#0B0E14] border border-[#1F293D] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
            <span>Governance Action Bar</span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-[#121824] text-[#8A94A6] border border-[#1F293D] font-mono">
              Current Role: {role}
            </span>
          </div>
          <p className="text-xs text-[#8A94A6]">
            {!isRoleAuthorized
              ? "Your current role ('" + role + "') is not authorized to execute patch approvals. Switch role to 'engineer' or 'admin'."
              : !isNeedsReview
              ? `Decision already settled (${decisionState}). Action disabled.`
              : "Review complete. Approving will create a GitHub Pull Request and log a HUMAN_APPROVED governance record."}
          </p>
        </div>

        <div>
          {isRoleAuthorized && isNeedsReview ? (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {approving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Recording Approval...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Approve & Apply</span>
                </>
              )}
            </button>
          ) : (
            <button
              disabled
              className="px-6 py-3 bg-[#121824] text-[#8A94A6] font-bold text-sm rounded-xl cursor-not-allowed border border-[#1F293D]/60 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {isApproved
                  ? "Already Approved ✅"
                  : isRejected
                  ? "Fix Rejected ❌"
                  : "Approval Restricted (" + role + ")"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
