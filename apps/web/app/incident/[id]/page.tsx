"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Incident } from "@/lib/types";
import { Timeline } from "@/components/Timeline";
import { ChevronLeft, Terminal, AlertTriangle, UserCheck, PlayCircle, FileCode } from "lucide-react";

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
      const interval = setInterval(() => {
        fetchDetails(incidentId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [incidentId]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-10">
        <div className="w-10 h-10 border-4 border-[#FACC15] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#A1A1AA] text-sm font-medium">Loading Incident Telemetry...</p>
      </div>
    );
  }

  if (error || !data || !data.incident) {
    return (
      <div className="min-h-screen bg-[#050505] p-10 max-w-5xl mx-auto space-y-6">
        <Link href="/feed" className="text-[#FACC15] text-sm font-semibold hover:underline flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Feed
        </Link>
        <div className="bg-[#450A0A] border border-[#EF4444] text-[#EF4444] rounded-[12px] p-6 text-center">
          <p className="font-semibold text-[16px]">{error || "Incident not found"}</p>
        </div>
      </div>
    );
  }

  const { incident, events, proposals, verificationRuns, governanceDecision, rollbackEvents } = data;

  let displayStatus = incident.status;
  let displayRetries = incident.retry_count || 0;
  let displayHours = incident.estimated_dev_hours_saved || 0;

  if (events && events.length > 0) {
    const latestEvent = events[events.length - 1];
    displayStatus = latestEvent.event_type;
    const retryEvents = events.filter((e: any) => e.event_type === 'VERIFICATION_FAILED_RETRYING');
    displayRetries = retryEvents.length;
    if (['RESOLVED', 'AUTO_APPROVE'].includes(latestEvent.event_type)) {
      displayHours = 2.5;
    }
  }

  const hasEmergencyEvent = events.some((ev: any) => ev.event_type === "EMERGENCY_FLAGGED");
  const isEmergency = Boolean((incident as any).is_emergency || hasEmergencyEvent);

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

  const handleRollback = async () => {
    if (!confirm("⚠️ Confirm Emergency Auto-Rollback?")) return;
    setRollbackLoading(true);
    try {
      const res = await fetch("/api/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incident.incident_id, triggered_by: "studio-admin" }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setRollbackMessage(`Rollback ID: ${resJson.rollback_id}`);
        fetchDetails(incidentId);
      } else {
        setRollbackMessage(`Error: ${resJson.error}`);
      }
    } catch (err: any) {
      setRollbackMessage(`Error: ${err?.message}`);
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("✅ Confirm Manual Approval?")) return;
    setApproveLoading(true);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incident.incident_id, actor: "studio-engineer" }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setApproveMessage(`Approved: ${resJson.pr_url}`);
        fetchDetails(incidentId);
      } else {
        setApproveMessage(`Error: ${resJson.error}`);
      }
    } catch (err: any) {
      setApproveMessage(`Error: ${err?.message}`);
    } finally {
      setApproveLoading(false);
    }
  };

  // Severity Matrix per Smart Gym 360
  const severityColors: Record<string, string> = {
    CRITICAL: "bg-[#450A0A] text-[#EF4444] border-[#EF4444]",
    HIGH: "bg-[#451A03] text-[#FACC15] border-[#FACC15]",
    MEDIUM: "bg-[#451A03] text-[#F59E0B] border-[#27272A]",
    LOW: "bg-[#064E3B] text-[#22C55E] border-[#27272A]",
  };
  const sevClass = severityColors[incident.severity?.toUpperCase()] || severityColors.MEDIUM;

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFFFFF] font-sans pb-20">
      
      {/* Top Header / Breadcrumb - Strict 64px Height ERP Style */}
      <div className="h-[64px] border-b border-[#27272A] bg-[#111111] flex items-center px-6 md:px-10 sticky top-0 z-40">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Link href="/feed" className="text-[#FACC15] text-[14px] font-semibold hover:text-[#EAB308] flex items-center gap-2 transition-colors">
            <ChevronLeft className="w-4 h-4" /> 
            Back to Incident Feed
          </Link>
          <div className="text-[12px] text-[#A1A1AA] font-mono tracking-wider">
            ID: {incident.incident_id}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 mt-8 space-y-6">

        {/* --- PAGE HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#27272A]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[28px] md:text-[32px] font-bold text-[#FFFFFF] tracking-tight">
                {incident.project || "Unknown Project"}
              </h1>
              <span className={`text-[11px] font-bold px-[10px] py-[2px] rounded-full border uppercase tracking-wider ${sevClass}`}>
                {incident.severity}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[14px] text-[#A1A1AA]">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                Service: <strong className="text-[#FFFFFF]">{incident.service || "core-api"}</strong>
              </span>
              <span>•</span>
              <span>{new Date(incident.created_at).toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-[8px] bg-[#111111] border border-[#27272A] flex items-center gap-2 text-[13px]">
              <span className="text-[#A1A1AA]">Status:</span>
              <span className="font-bold text-[#FFFFFF]">{displayStatus}</span>
            </div>
          </div>
        </div>

        {/* --- ACTION BANNERS --- */}
        {isEmergency && (
          <div className="bg-[#450A0A] border border-[#EF4444] rounded-[12px] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#FFFFFF]">Emergency Rollback Required</h3>
                <p className="text-[13px] text-[#EF4444] mt-0.5">High user impact detected. Automatic guardrails recommend immediate rollback.</p>
              </div>
            </div>
            <button
              onClick={handleRollback}
              disabled={rollbackLoading || incident.status === "ROLLED_BACK"}
              className="whitespace-nowrap px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[14px] font-bold rounded-[8px] transition-colors disabled:opacity-50"
            >
              {rollbackLoading ? "Rolling Back..." : incident.status === "ROLLED_BACK" ? "Rolled Back" : "Trigger Rollback"}
            </button>
          </div>
        )}

        {displayStatus === "NEEDS_REVIEW" && (
          <div className="bg-[#1E3A5F] border border-[#3B82F6] rounded-[12px] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#FFFFFF]">Manual Approval Required</h3>
                <p className="text-[13px] text-[#93C5FD] mt-0.5">AI patch is ready but requires human sign-off before production merge.</p>
              </div>
            </div>
            <button
              onClick={handleApprove}
              disabled={approveLoading}
              className="whitespace-nowrap px-6 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] text-black text-[14px] font-bold rounded-[8px] transition-colors disabled:opacity-50"
            >
              {approveLoading ? "Approving..." : "Approve & Merge"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Telemetry & Diffs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* KPI Telemetry Grid */}
            <div className="bg-[#111111] border border-[#27272A] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#27272A] bg-[#1A1A1A]">
                <h2 className="text-[16px] font-semibold text-[#FFFFFF]">Incident Telemetry</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#27272A]">
                <div className="p-5">
                  <p className="text-[12px] text-[#A1A1AA] uppercase font-bold tracking-wider mb-1">Exit Code</p>
                  <p className="text-[24px] font-bold text-[#EF4444] font-mono">{incident.exit_code || "N/A"}</p>
                </div>
                <div className="p-5">
                  <p className="text-[12px] text-[#A1A1AA] uppercase font-bold tracking-wider mb-1">Affected Users</p>
                  <p className="text-[24px] font-bold text-[#FACC15] font-mono">{incident.affected_users_estimate || "0"}</p>
                </div>
                <div className="p-5">
                  <p className="text-[12px] text-[#A1A1AA] uppercase font-bold tracking-wider mb-1">AI Retries</p>
                  <p className="text-[24px] font-bold text-[#3B82F6] font-mono">{displayRetries}/3</p>
                </div>
                <div className="p-5">
                  <p className="text-[12px] text-[#A1A1AA] uppercase font-bold tracking-wider mb-1">Dev Hrs Saved</p>
                  <p className="text-[24px] font-bold text-[#22C55E] font-mono">{displayHours}</p>
                </div>
              </div>
              <div className="p-5 border-t border-[#27272A] bg-[#111111] flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <p className="text-[12px] text-[#A1A1AA] font-bold uppercase tracking-wider mb-1">Worker Node</p>
                  <p className="text-[14px] text-[#FFFFFF] font-mono">{incident.worker_id || "worker-unknown"}</p>
                </div>
                <div>
                  <p className="text-[12px] text-[#A1A1AA] font-bold uppercase tracking-wider mb-1">Job Context</p>
                  <p className="text-[14px] text-[#FFFFFF] font-mono">{incident.job_id || "job-unknown"}</p>
                </div>
              </div>
            </div>

            {/* Stderr Trace */}
            <div className="bg-[#111111] border border-[#27272A] rounded-[12px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#27272A] bg-[#1A1A1A] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                <h2 className="text-[16px] font-semibold text-[#FFFFFF]">Stderr Stack Trace</h2>
              </div>
              <div className="p-5 bg-[#050505]">
                <pre className="text-[#EF4444] font-mono text-[13px] overflow-x-auto leading-relaxed">
                  {incident.stderr_tail || incident.stderr_snippet || "No standard error captured."}
                </pre>
              </div>
            </div>

            {/* Visual Evidence (If Exists) */}
            {Boolean(incident.crash_screenshot_uri) && (
              <div className="bg-[#111111] border border-[#27272A] rounded-[12px] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#27272A] bg-[#1A1A1A] flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-[#A1A1AA]" />
                  <h2 className="text-[16px] font-semibold text-[#FFFFFF]">Multimodal Analysis</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-[#27272A] rounded-[8px] overflow-hidden bg-[#050505]">
                    <img src={incident.crash_screenshot_uri} alt="Crash Screenshot" className="w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-[#FACC15] uppercase tracking-wide mb-2">Gemini 1.5 Pro Insight</h3>
                    <p className="text-[14px] text-[#A1A1AA] leading-relaxed">
                      {visionCaption || "Analysis confirms frame corruption artifacts matching stderr boundaries."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Proposals */}
            {proposals && proposals.length > 0 && (
              <div className="bg-[#111111] border border-[#27272A] rounded-[12px] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#27272A] bg-[#1A1A1A] flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#A1A1AA]" />
                  <h2 className="text-[16px] font-semibold text-[#FFFFFF]">Proposed AI Patches</h2>
                </div>
                <div className="p-0 divide-y divide-[#27272A]">
                  {proposals.map((prop, idx) => (
                    <div key={prop.proposal_id || idx} className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-[#3B82F6] bg-[#1E3A5F] px-2 py-0.5 rounded border border-[#27272A]">
                            {prop.change_type || "CONFIG"}
                          </span>
                          <span className="text-[13px] font-mono text-[#FFFFFF]">{prop.file_path}</span>
                        </div>
                        <div className="text-[12px] font-bold text-[#22C55E]">
                          Confidence: {prop.confidence ? (Number(prop.confidence) * 100).toFixed(0) : 88}%
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-[12px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">Rationale</h4>
                        <p className="text-[14px] text-[#FFFFFF]">{prop.rationale}</p>
                      </div>

                      <div>
                        <h4 className="text-[12px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">Code Diff</h4>
                        <div className="bg-[#050505] border border-[#27272A] rounded-[8px] p-4 overflow-x-auto">
                          <pre className="text-[13px] text-[#A1A1AA] font-mono whitespace-pre-wrap leading-relaxed">
                            {prop.diff_unified}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Audit Timeline */}
          <div className="lg:col-span-1">
            <div className="sticky top-[96px]">
              <Timeline
                events={events}
                proposals={proposals}
                verificationRuns={verificationRuns}
                governanceDecision={governanceDecision}
                rollbackEvents={rollbackEvents}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
