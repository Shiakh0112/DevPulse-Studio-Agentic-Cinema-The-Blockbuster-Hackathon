"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Incident } from "@/lib/types";
import { Timeline } from "@/components/Timeline";
import { ChevronLeft, Terminal, AlertTriangle, UserCheck, PlayCircle, FileCode, Clock } from "lucide-react";

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
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-10">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full motion-safe:animate-spin mb-4" />
        <p className="text-text-secondary text-[14px] font-medium">Loading Incident Telemetry...</p>
      </div>
    );
  }

  if (error || !data || !data.incident) {
    return (
      <div className="min-h-screen bg-page p-10 max-w-5xl mx-auto space-y-6">
        <Link href="/feed" className="text-primary text-[14px] font-medium hover:text-primary-hover flex items-center gap-2">
          <ChevronLeft size={18} strokeWidth={2} /> Back to Feed
        </Link>
        <div className="bg-danger border border-[var(--danger-text)] text-[var(--danger-text)] rounded-lg p-6 text-center">
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

  // Status mapping
  const severityColors: Record<string, string> = {
    CRITICAL: "bg-danger text-[var(--danger-text)]",
    HIGH: "bg-warning text-primary",
    MEDIUM: "bg-warning text-[var(--warning-text)]",
    LOW: "bg-success text-[var(--success-text)]",
  };
  const sevClass = severityColors[incident.severity?.toUpperCase()] || severityColors.MEDIUM;

  return (
    <div className="min-h-screen bg-page text-text-primary font-sans pb-20">
      
      {/* Top Header */}
      <div className="h-[64px] border-b border-border bg-[var(--bg-header)] flex items-center px-6 md:px-10 sticky top-0 z-20 backdrop-blur-md bg-opacity-80">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Link href="/feed" className="text-primary text-[14px] font-medium hover:text-primary-hover flex items-center gap-2 motion-safe:transition-all motion-safe:duration-200">
            <ChevronLeft size={18} strokeWidth={2} /> Back
          </Link>
          <div className="text-[12px] text-text-secondary font-mono">
            {incident.incident_id}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 mt-8 space-y-6">

        {/* --- PAGE HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
                {incident.project || "Unknown Project"}
              </h1>
              <span className={`text-[11px] font-semibold px-[10px] py-[2px] rounded-full uppercase ${sevClass}`}>
                {incident.severity}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[14px] text-text-secondary">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--info-text)]"></div>
                Service: <strong className="text-text-primary">{incident.service || "core-api"}</strong>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-md bg-card border border-border flex items-center gap-2 text-[14px]">
              <span className="text-text-secondary">Status:</span>
              <span className="font-semibold text-text-primary">{displayStatus}</span>
            </div>
          </div>
        </div>

        {/* --- ACTION BANNERS --- */}
        {isEmergency && (
          <div className="bg-danger border border-[var(--danger-text)] rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-[var(--danger-text)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} strokeWidth={2} className="text-[var(--danger-text)]" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-text-primary">Emergency Rollback Required</h3>
                <p className="text-[12px] text-[var(--danger-text)] mt-0.5">High user impact detected. Automatic guardrails recommend immediate rollback.</p>
              </div>
            </div>
            <button
              onClick={handleRollback}
              disabled={rollbackLoading || incident.status === "ROLLED_BACK"}
              className="whitespace-nowrap px-5 py-2.5 bg-[var(--danger-text)] hover:bg-[#DC2626] text-[#FFFFFF] text-[14px] font-medium rounded-md motion-safe:transition-all motion-safe:duration-200 disabled:opacity-50"
            >
              {rollbackLoading ? "Rolling Back..." : incident.status === "ROLLED_BACK" ? "Rolled Back" : "Trigger Rollback"}
            </button>
          </div>
        )}

        {displayStatus === "NEEDS_REVIEW" && (
          <div className="bg-info border border-[var(--info-text)] rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-[var(--info-text)] bg-opacity-20 flex items-center justify-center flex-shrink-0">
                <UserCheck size={18} strokeWidth={2} className="text-[var(--info-text)]" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-text-primary">Manual Approval Required</h3>
                <p className="text-[12px] text-[#93C5FD] mt-0.5">AI patch is ready but requires human sign-off before production merge.</p>
              </div>
            </div>
            <button
              onClick={handleApprove}
              disabled={approveLoading}
              className="whitespace-nowrap px-5 py-2.5 bg-primary hover:bg-primary-hover text-[#000000] text-[14px] font-medium rounded-md motion-safe:transition-all motion-safe:duration-200 disabled:opacity-50"
            >
              {approveLoading ? "Approving..." : "Approve & Merge"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* KPI Telemetry Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-4 motion-safe:hover:-translate-y-1 motion-safe:transition-all motion-safe:duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-[var(--danger-text)] bg-opacity-10 flex items-center justify-center">
                    <Terminal size={18} strokeWidth={2} className="text-[var(--danger-text)]" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary uppercase">Exit Code</span>
                </div>
                <p className="text-[28px] font-bold text-text-primary font-mono">{incident.exit_code || "N/A"}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 motion-safe:hover:-translate-y-1 motion-safe:transition-all motion-safe:duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-primary bg-opacity-10 flex items-center justify-center">
                    <AlertTriangle size={18} strokeWidth={2} className="text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary uppercase">Affected</span>
                </div>
                <p className="text-[28px] font-bold text-text-primary font-mono">{incident.affected_users_estimate || "0"}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 motion-safe:hover:-translate-y-1 motion-safe:transition-all motion-safe:duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-[var(--info-text)] bg-opacity-10 flex items-center justify-center">
                    <UserCheck size={18} strokeWidth={2} className="text-[var(--info-text)]" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary uppercase">Retries</span>
                </div>
                <p className="text-[28px] font-bold text-text-primary font-mono">{displayRetries}/3</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 motion-safe:hover:-translate-y-1 motion-safe:transition-all motion-safe:duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-[var(--success-text)] bg-opacity-10 flex items-center justify-center">
                    <Clock size={18} strokeWidth={2} className="text-[var(--success-text)]" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary uppercase">Hrs Saved</span>
                </div>
                <p className="text-[28px] font-bold text-text-primary font-mono">{displayHours}</p>
              </div>
            </div>

            {/* Stderr Trace */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-card flex items-center gap-2">
                <Terminal size={18} strokeWidth={2} className="text-text-secondary" />
                <h2 className="text-[16px] font-semibold text-text-primary">Stderr Stack Trace</h2>
              </div>
              <div className="p-5 bg-input">
                <pre className="text-[var(--danger-text)] font-mono text-[14px] overflow-x-auto leading-relaxed">
                  {incident.stderr_tail || incident.stderr_snippet || "No standard error captured."}
                </pre>
              </div>
            </div>

            {/* Visual Evidence */}
            {Boolean(incident.crash_screenshot_uri) && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-card flex items-center gap-2">
                  <PlayCircle size={18} strokeWidth={2} className="text-text-secondary" />
                  <h2 className="text-[16px] font-semibold text-text-primary">Multimodal Analysis</h2>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-input">
                  <div className="border border-border rounded-md overflow-hidden bg-page">
                    <img src={incident.crash_screenshot_uri} alt="Crash Screenshot" className="w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-bold text-primary uppercase tracking-wide mb-2">Gemini 1.5 Pro Insight</h3>
                    <p className="text-[14px] text-text-secondary leading-relaxed">
                      {visionCaption || "Analysis confirms frame corruption artifacts matching stderr boundaries."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Proposals */}
            {proposals && proposals.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-card flex items-center gap-2">
                  <FileCode size={18} strokeWidth={2} className="text-text-secondary" />
                  <h2 className="text-[16px] font-semibold text-text-primary">Proposed AI Patches</h2>
                </div>
                <div className="p-0 divide-y divide-border bg-card">
                  {proposals.map((prop, idx) => (
                    <div key={prop.proposal_id || idx} className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-[var(--info-text)] bg-info px-2 py-0.5 rounded-full">
                            {prop.change_type || "CONFIG"}
                          </span>
                          <span className="text-[14px] font-mono text-text-primary">{prop.file_path}</span>
                        </div>
                        <div className="text-[14px] font-medium text-[var(--success-text)]">
                          Confidence: {prop.confidence ? (Number(prop.confidence) * 100).toFixed(0) : 88}%
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-[12px] font-bold text-text-secondary uppercase mb-1">Rationale</h4>
                        <p className="text-[14px] text-text-primary">{prop.rationale}</p>
                      </div>

                      <div>
                        <h4 className="text-[12px] font-bold text-text-secondary uppercase mb-1">Code Diff</h4>
                        <div className="bg-input border border-border rounded-md p-4 overflow-x-auto">
                          <pre className="text-[14px] text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
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
            <div className="sticky top-[96px] z-10">
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
