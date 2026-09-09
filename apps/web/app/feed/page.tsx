"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Incident } from "@/lib/types";
import { IncidentCard } from "../components/IncidentCard";
import { CustomSelect } from "@/components/CustomSelect";
import { AlertOctagon, RefreshCw, Inbox, Terminal, Filter, ChevronDown } from "lucide-react";

export default function IncidentFeedPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showEmergenciesFirst, setShowEmergenciesFirst] = useState<boolean>(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedProject !== "ALL") count++;
    if (selectedService !== "ALL") count++;
    if (selectedSeverity !== "ALL") count++;
    if (selectedStatus !== "ALL") count++;
    if (sortOrder !== "desc") count++;
    return count;
  }, [selectedProject, selectedService, selectedSeverity, selectedStatus, sortOrder]);

  // Fetch incidents from /api/incidents
  const fetchIncidents = async () => {
    try {
      const res = await fetch("/api/incidents");
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data: Incident[] = await res.json();
      setIncidents(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch incidents:", err);
      setError("Failed to fetch live incidents. Ensure ClickHouse/API is reachable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const intervalId = setInterval(() => {
      fetchIncidents();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Compute unique dropdown options
  const projects = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach((inc) => {
      if (inc.project) set.add(inc.project);
    });
    return Array.from(set);
  }, [incidents]);

  const services = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach((inc) => {
      if (inc.service) set.add(inc.service);
    });
    return Array.from(set);
  }, [incidents]);

  // Helper to check if an incident is emergency-flagged
  const isEmergencyIncident = (inc: any) => {
    return (
      inc.is_emergency ||
      inc.isEmergency ||
      inc.has_emergency_event ||
      inc.status === "ROLLED_BACK" ||
      (inc.severity === "CRITICAL" && (inc.affected_users_estimate || 0) >= 500)
    );
  };

  // Filter and sort logic with Show Emergencies First support
  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (selectedProject !== "ALL" && inc.project !== selectedProject) return false;
        if (selectedService !== "ALL" && inc.service !== selectedService) return false;
        if (selectedSeverity !== "ALL" && inc.severity?.toUpperCase() !== selectedSeverity) return false;
        if (selectedStatus !== "ALL" && inc.status?.toUpperCase() !== selectedStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (showEmergenciesFirst) {
          const aEmergency = isEmergencyIncident(a);
          const bEmergency = isEmergencyIncident(b);
          if (aEmergency && !bEmergency) return -1;
          if (!aEmergency && bEmergency) return 1;
        }

        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [incidents, selectedProject, selectedService, selectedSeverity, selectedStatus, sortOrder, showEmergenciesFirst]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Incident Feed
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time automated incident telemetry, AI triage state, self-healing loop retries, and governance updates.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700">
            <span>Auto-Refreshing (5s)</span>
            <button
              onClick={fetchIncidents}
              className="text-amber-400 hover:text-amber-300 font-semibold underline ml-2 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Now
            </button>
          </div>
        </div>

        {/* Filters & Emergency Toggle Bar */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-4 sm:p-5 space-y-4">
          {/* Mobile Filter Toggle Button (< md) */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-md ${
                mobileFiltersOpen || activeFiltersCount > 0
                  ? "bg-slate-900 border-amber-500/80 text-amber-300 ring-2 ring-amber-500/20 shadow-amber-500/10"
                  : "bg-slate-950/80 border-slate-700/60 text-slate-200 hover:border-amber-500/50 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>Filter & Sort Controls</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold font-mono">
                    {activeFiltersCount} ACTIVE
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-amber-400 transition-transform duration-200 ${
                  mobileFiltersOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Filter Dropdowns Grid (hidden on mobile unless expanded, always visible on md+) */}
          <div className={`${mobileFiltersOpen ? "grid" : "hidden md:grid"} grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4`}>
            {/* Project Filter */}
            <CustomSelect
              label="Project"
              value={selectedProject}
              onChange={setSelectedProject}
              options={[
                { label: "All Projects", value: "ALL" },
                ...projects.map((proj) => ({ label: proj, value: proj })),
              ]}
            />

            {/* Service Filter */}
            <CustomSelect
              label="Service"
              value={selectedService}
              onChange={setSelectedService}
              options={[
                { label: "All Services", value: "ALL" },
                ...services.map((svc) => ({ label: svc, value: svc })),
              ]}
            />

            {/* Severity Filter */}
            <CustomSelect
              label="Severity"
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              options={[
                { label: "All Severities", value: "ALL" },
                { label: "CRITICAL", value: "CRITICAL" },
                { label: "HIGH", value: "HIGH" },
                { label: "MEDIUM", value: "MEDIUM" },
                { label: "LOW", value: "LOW" },
              ]}
            />

            {/* Status Filter */}
            <CustomSelect
              label="Status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { label: "All Statuses", value: "ALL" },
                { label: "PENDING", value: "PENDING" },
                { label: "TRIAGED", value: "TRIAGED" },
                { label: "DIAGNOSED", value: "DIAGNOSED" },
                { label: "PROPOSED", value: "PROPOSED" },
                { label: "VERIFIED", value: "VERIFIED" },
                { label: "RESOLVED", value: "RESOLVED" },
                { label: "NEEDS_REVIEW", value: "NEEDS_REVIEW" },
                { label: "REJECTED", value: "REJECTED" },
                { label: "ROLLED_BACK", value: "ROLLED_BACK" },
              ]}
            />

            {/* Sort Order */}
            <CustomSelect
              label="Sort Order"
              value={sortOrder}
              onChange={(val) => setSortOrder(val as "desc" | "asc")}
              options={[
                { label: "Newest First", value: "desc" },
                { label: "Oldest First", value: "asc" },
              ]}
            />
          </div>

          {/* Show Emergencies First Toggle */}
          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
            <button
              onClick={() => setShowEmergenciesFirst(!showEmergenciesFirst)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                showEmergenciesFirst
                  ? "bg-rose-950 text-rose-300 border border-rose-600 shadow-md shadow-rose-950/50"
                  : "bg-slate-900 text-slate-400 border border-slate-700 hover:text-slate-200"
              }`}
            >
              <AlertOctagon className={`w-4 h-4 ${showEmergenciesFirst ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
              <span>Show Emergencies First</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${showEmergenciesFirst ? "bg-rose-900 text-white" : "bg-slate-800 text-slate-400"}`}>
                {showEmergenciesFirst ? "ON" : "OFF"}
              </span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredIncidents.length} of {incidents.length} Recorded Incidents
            </span>
          </div>
        </div>

        {/* Content Area */}
        {loading && incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p>Loading live incident stream...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-5 text-center">
            <p>{error}</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          /* Proper Empty-State UI with Inbox Icon and Code Snippet */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-slate-800/80 border border-slate-700 text-amber-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-100">
                No incidents yet — trigger a test crash using demo/simulate_crash.sh to see the pipeline in action
              </h3>
              <p className="text-xs text-slate-400">
                Run the simulation script or trigger an synthetic pipeline exception to observe live AI triage, self-healing, and governance.
              </p>
            </div>

            {/* Code Snippet Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-2 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Command to trigger synthetic crash:</span>
              </div>
              <pre className="font-mono text-xs text-amber-300 overflow-x-auto whitespace-pre pt-1">
                demo/simulate_crash.sh
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIncidents.map((incident) => (
              <IncidentCard key={incident.incident_id} incident={incident} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
