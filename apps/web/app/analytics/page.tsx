"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Activity, Clock, ShieldAlert, AlertCircle, Info } from "lucide-react";
import { RoiWidget } from "@/components/RoiWidget";
import { CrashRateChart } from "@/components/CrashRateChart";
import { MttrChart } from "@/components/MttrChart";
import { ErrorTypeChart } from "@/components/ErrorTypeChart";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [roiData, setRoiData] = useState<any[]>([]);
  const [crashRateData, setCrashRateData] = useState<any[]>([]);
  const [mttrData, setMttrData] = useState<any[]>([]);
  const [errorTypesData, setErrorTypesData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const [roiRes, crashRes, mttrRes, errorRes] = await Promise.all([
          fetch("/api/analytics/roi-summary"),
          fetch("/api/analytics/crash-rate"),
          fetch("/api/analytics/mttr"),
          fetch("/api/analytics/error-types"),
        ]);

        if (roiRes.ok) setRoiData(await roiRes.json());
        if (crashRes.ok) setCrashRateData(await crashRes.json());
        if (mttrRes.ok) setMttrData(await mttrRes.json());
        if (errorRes.ok) setErrorTypesData(await errorRes.json());
      } catch (err) {
        console.error("[Analytics Load Error]", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  const hasAnyData =
    roiData.length > 0 ||
    crashRateData.length > 0 ||
    mttrData.length > 0 ||
    errorTypesData.length > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Title & Banner */}
      <div className="flex items-center justify-between border-b border-[#1F293D] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#FFFFFF] flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-400" />
            Analytics & Autonomous System Performance
          </h1>
          <p className="text-sm text-[#8A94A6] mt-1">
            Real-time telemetry, developer MTTR trends, and cost efficiency savings computed from ClickHouse Materialized Views.
          </p>
        </div>
      </div>

      {/* TOP SECTION: ROI Summary Widget (Most Prominent Position) */}
      <section className="space-y-3">
        <RoiWidget data={roiData} />
        {/* Note under empty or live RoiWidget */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#8A94A6] font-mono pt-1">
          <Info className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>ROI numbers will populate once incidents are resolved.</span>
        </div>
      </section>

      {/* Empty State Banner if no telemetry data */}
      {!loading && !hasAnyData && (
        <div className="p-8 bg-[#0B0E14] border border-[#1F293D] rounded-2xl text-center space-y-3 shadow-xl">
          <AlertCircle className="w-10 h-10 text-[#6366F1] mx-auto animate-bounce" />
          <h3 className="text-lg font-bold text-[#FFFFFF]">No data yet — trigger a crash to see analytics</h3>
          <p className="text-xs text-[#8A94A6] font-mono">
            Execute a pipeline crash trigger to populate ClickHouse telemetry and Materialized Views.
          </p>
        </div>
      )}

      {/* Stacked Vertical Chart Sections */}
      <div className="space-y-8">
        {/* Section 1: Hourly Crash Rate */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1F293D]/80 pb-2">
            <Activity className="w-5 h-5 text-[#6366F1]" />
            <div>
              <h2 className="text-lg font-bold text-[#FFFFFF]">Hourly Crash Rate</h2>
              <p className="text-xs text-[#8A94A6]">
                Tracks total rendering pipeline crash occurrences aggregated by hourly time bins over the last 24 hours.
              </p>
            </div>
          </div>
          {loading ? (
            <div className="p-8 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono text-xs">
              Loading hourly crash telemetry...
            </div>
          ) : crashRateData.length === 0 ? (
            <div className="p-8 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono text-xs">
              No data yet — trigger a crash to see analytics
            </div>
          ) : (
            <CrashRateChart data={crashRateData} />
          )}
        </section>

        {/* Section 2: Mean Time To Resolution Trend */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1F293D]/80 pb-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-[#FFFFFF]">Mean Time To Resolution Trend</h2>
              <p className="text-xs text-[#8A94A6]">
                Measures average minutes required to diagnose, patch, and verify crashes across pipeline services.
              </p>
            </div>
          </div>
          {loading ? (
            <div className="p-8 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono text-xs">
              Loading resolution velocity metrics...
            </div>
          ) : mttrData.length === 0 ? (
            <div className="p-8 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono text-xs">
              No data yet — trigger a crash to see analytics
            </div>
          ) : (
            <MttrChart data={mttrData} />
          )}
        </section>

        {/* Section 3: Top Error Types (24h) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1F293D]/80 pb-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-[#FFFFFF]">Top Error Types (24h)</h2>
              <p className="text-xs text-[#8A94A6]">
                Breakdown of crash root cause categories (OOM, missing dependencies, shader compilation failures, exit code 137).
              </p>
            </div>
          </div>
          {loading ? (
            <div className="p-8 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono text-xs">
              Loading error category breakdown...
            </div>
          ) : errorTypesData.length === 0 ? (
            <div className="p-8 bg-[#0B0E14] rounded-xl border border-[#1F293D] text-center text-[#8A94A6] font-mono text-xs">
              No data yet — trigger a crash to see analytics
            </div>
          ) : (
            <ErrorTypeChart data={errorTypesData} />
          )}
        </section>
      </div>
    </div>
  );
}
