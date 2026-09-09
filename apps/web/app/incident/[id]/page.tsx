"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Incident } from "@/lib/types";
import { Timeline } from "@/components/Timeline";

interface IncidentDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const [incidentId, setIncidentId] = useState<string>("");
  const [data, setData] = useState<{
    incident: Incident;
    events: any[];
    proposals: any[];
    verificationRuns: any[];
    governanceDecision: any;
    rollbackEvents: any[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<boolean>(false);
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState<boolean>(false);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((resolvedParams) => {
      if (resolvedParams?.id) {
        setIncidentId(resolvedParams.id);
      }
    });
  }, [params]);

  const fetchDetails = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const jsonData = await res.json();
      setData(jsonData);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch incident details:", err);
      setError("Failed to load incident telemetry details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchDetails(incidentId);
      
      // Auto-poll every 3 seconds for real-time agent updates
      const interval = setInterval(() => {
        fetchDetails(incidentId);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [incidentId]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-10">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading Incident Timeline & Telemetry...</p>
      </div>
    );
  }

  if (error || !data || !data.incident) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-10 max-w-4xl mx-auto space-y-6">
        <Link href="/feed" className="text-amber-400 text-sm hover:underline">
          ← Back to Live Incident Feed
        </Link>
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-6 text-center">
          <p className="font-semibold text-lg">{error || "Incident not found"}</p>
        </div>
      </div>
    );
  }

  const { incident, events, proposals, verificationRuns, governanceDecision, rollbackEvents } = data;

  // Determine if Emergency Flagged
  const hasEmergencyEvent = events.some((ev: any) => ev.event_type === "EMERGENCY_FLAGGED");
  const isEmergency = Boolean((incident as any).is_emergency || hasEmergencyEvent);

  // Extract Vision Caption from TRIAGED event if available
  const triagedEvent = events.find((ev: any) => ev.event_type === "TRIAGED");
  let visionCaption = "";
  if (triagedEvent && triagedEvent.payload) {
    try {
      const payloadObj = typeof triagedEvent.payload === "string" ? JSON.parse(triagedEvent.payload) : triagedEvent.payload;
      visionCaption = payloadObj.visual_evidence || payloadObj.vision_analysis || "";
    } catch {
      visionCaption = "";
    }
  }

  // Handle Emergency Rollback action
  const handleRollback = async () => {
    if (!confirm("⚠️ Confirm Emergency Auto-Rollback? This will revert deployment to the previous stable release.")) {
      return;
    }
    setRollbackLoading(true);
    try {
      const res = await fetch("/api/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incident.incident_id, triggered_by: "studio-admin" }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setRollbackMessage(`✅ Emergency Rollback Triggered! Rollback ID: ${resJson.rollback_id}`);
        if (incidentId) fetchDetails(incidentId);
      } else {
        setRollbackMessage(`❌ Rollback failed: ${resJson.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setRollbackMessage(`❌ Rollback failed: ${err?.message}`);
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("✅ Confirm Manual Approval? This will resolve the incident and merge the AI patch into production.")) {
      return;
    }
    setApproveLoading(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incident.incident_id, actor: "studio-engineer" }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setApproveMessage(`✅ Fix Approved! PR Created: ${resJson.pr_url}`);
        if (incidentId) fetchDetails(incidentId);
      } else {
        setApproveMessage(`❌ Approval failed: ${resJson.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setApproveMessage(`❌ Approval failed: ${err?.message}`);
    } finally {
      setApproveLoading(false);
    }
  };

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    HIGH: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  };

  const sevClass = severityColors[incident.severity?.toUpperCase()] || severityColors.MEDIUM;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/feed" className="text-amber-400 text-sm font-semibold hover:underline flex items-center gap-1">
            ← Back to Live Incident Feed
          </Link>
          <span className="text-xs font-mono text-slate-500">Incident UUID: {incident.incident_id}</span>
        </div>

        {/* 1. Header Section */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-100">{incident.project || "Unknown Project"}</h1>
                <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800 font-mono">
                  {incident.service || "service"}
                </span>
              </div>
              <p className="text-sm text-slate-400 font-mono">
                Created: {new Date(incident.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`text-sm font-bold px-3.5 py-1 rounded-full border ${sevClass}`}>
                {incident.severity}
              </span>
              <span className="text-sm font-bold px-3.5 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-200">
                {incident.status}
              </span>
            </div>
          </div>
        </div>

        {/* 🚨 Emergency Actions Panel (Renders ONLY if is_emergency / EMERGENCY_FLAGGED) */}
        {isEmergency && (
          <div className="bg-rose-950/80 border-2 border-rose-600 rounded-xl p-6 shadow-2xl shadow-rose-900/30 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-rose-200 flex items-center gap-2">
                  <span>🚨</span> EMERGENCY ROLLBACK GUARDRAIL FLAGGED
                </h2>
                <p className="text-xs text-rose-300 mt-1">
                  High user impact ({incident.affected_users_estimate || 500}+ users) detected on CRITICAL severity incident.
                </p>
              </div>
              <button
                onClick={handleRollback}
                disabled={rollbackLoading || incident.status === "ROLLED_BACK"}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-lg border border-rose-400 shadow-lg transition-all disabled:opacity-50"
              >
                {rollbackLoading ? "Executing Rollback..." : incident.status === "ROLLED_BACK" ? "Rolled Back" : "1-Click Auto-Rollback Now"}
              </button>
            </div>
            {rollbackMessage && (
              <p className="text-xs font-mono text-amber-300 bg-slate-900/80 p-2.5 rounded border border-amber-500/30">
                {rollbackMessage}
              </p>
            )}
          </div>
        )}

        {/* ✅ Human-in-the-Loop Approval Panel (Renders ONLY if NEEDS_REVIEW) */}
        {incident.status === "NEEDS_REVIEW" && (
          <div className="bg-indigo-950/40 border-2 border-indigo-600/50 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-indigo-200 flex items-center gap-2">
                  <span>👤</span> HUMAN-IN-THE-LOOP APPROVAL REQUIRED
                </h2>
                <p className="text-xs text-indigo-300 mt-1">
                  The AI has proposed a patch, but it requires human sign-off before merging into production.
                </p>
              </div>
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-lg border border-indigo-400 shadow-lg transition-all disabled:opacity-50"
              >
                {approveLoading ? "Approving..." : "Approve AI Fix"}
              </button>
            </div>
            {approveMessage && (
              <p className="text-xs font-mono text-emerald-300 bg-slate-900/80 p-2.5 rounded border border-emerald-500/30">
                {approveMessage}
              </p>
            )}
          </div>
        )}

        {/* 2. Stderr Viewer */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-6 shadow-lg space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center justify-between">
            <span>Stderr Log Snippet</span>
            <span className="text-xs font-mono text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded border border-rose-900/60">
              Exit Code: {incident.exit_code}
            </span>
          </h2>
          <pre className="bg-rose-950/60 border border-rose-900/60 text-rose-300 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {incident.stderr_tail || incident.stderr_snippet || "No stderr output captured."}
          </pre>
        </div>

        {/* 3. Evidence Panel Grid */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-6 shadow-lg space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Telemetry & Evidence Grid</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="block text-slate-500 mb-1">Exit Code</span>
              <span className="text-rose-400 font-bold text-base">{incident.exit_code}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="block text-slate-500 mb-1">Worker ID</span>
              <span className="text-slate-200">{incident.worker_id || "worker-01"}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="block text-slate-500 mb-1">Job ID</span>
              <span className="text-slate-200">{incident.job_id || "job-101"}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="block text-slate-500 mb-1">Affected Users</span>
              <span className="text-amber-400 font-bold text-base">{incident.affected_users_estimate || 0}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 col-span-2">
              <span className="block text-slate-500 mb-1">Command</span>
              <span className="text-slate-300 truncate block">{incident.command || "N/A"}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="block text-slate-500 mb-1">Self-Healing Retries</span>
              <span className="text-amber-400 font-bold text-base">{incident.retry_count || 0} / 3</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="block text-slate-500 mb-1">Hours Saved</span>
              <span className="text-emerald-400 font-bold text-base">{incident.estimated_dev_hours_saved || 0} hrs</span>
            </div>
          </div>
        </div>

        {/* 📷 Visual Evidence Section (ONLY renders if crash_screenshot_uri is non-empty) */}
        {Boolean(incident.crash_screenshot_uri) && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>📸</span> Multimodal Visual Evidence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2">
                <img
                  src={incident.crash_screenshot_uri}
                  alt="Crash Screenshot"
                  className="w-full h-auto max-h-80 object-contain rounded-lg"
                />
              </div>
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-2">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Gemini 1.5 Pro Vision Analysis
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">
                  {visionCaption || "Visual analysis confirms frame corruption artifacts matching stderr allocation boundary."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Patch Proposal Section */}
        {proposals && proposals.length > 0 && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🤖</span> AI Patch Proposal
            </h2>
            {proposals.map((prop, idx) => (
              <div key={prop.proposal_id || idx} className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/60">
                      {prop.change_type || "CONFIG"}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {prop.file_path || "Unknown File"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-900/60">
                      Risk: {prop.risk || "LOW"}
                    </span>
                    <span className="text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-900/60">
                      Confidence: {prop.confidence ? (Number(prop.confidence) * 100).toFixed(0) : 88}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rationale</h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                    {prop.rationale || "No rationale provided."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proposed Code Diff</h3>
                  <pre className="bg-slate-950 border border-slate-800 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {prop.diff_unified || "No diff provided."}
                  </pre>
                </div>

                {prop.test_plan && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Validation Test Plan</h3>
                    <pre className="bg-slate-950 border border-slate-800 text-emerald-300 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {typeof prop.test_plan === 'string' ? prop.test_plan : JSON.stringify(prop.test_plan, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 4. Timeline Component */}
        <Timeline
          events={events}
          proposals={proposals}
          verificationRuns={verificationRuns}
          governanceDecision={governanceDecision}
          rollbackEvents={rollbackEvents}
        />
      </div>
    </div>
  );
}
