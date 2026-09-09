"use client";

import React, { useState } from "react";
import { AlertOctagon, RotateCcw, ShieldAlert, CheckCircle, X } from "lucide-react";
import { useRole } from "@/lib/RoleContext";

interface EmergencyRollbackButtonProps {
  incidentId: string;
  isEmergency?: boolean;
  affectedUsers?: number;
  onRollbackSuccess?: (rollbackId: string) => void;
}

export const EmergencyRollbackButton: React.FC<EmergencyRollbackButtonProps> = ({
  incidentId,
  isEmergency = false,
  affectedUsers = 500,
  onRollbackSuccess,
}) => {
  const { currentRole, role } = useRole();
  const activeRole = currentRole || role;

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Render ONLY if isEmergency is true
  if (!isEmergency) {
    return null;
  }

  const isAdmin = activeRole === "admin";

  const handleRollbackClick = () => {
    if (!isAdmin) return;
    setShowModal(true);
  };

  const executeRollback = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: incidentId,
          actor: activeRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger emergency rollback");
      }

      setShowModal(false);
      const toastText = "Rollback simulation triggered — traffic would shift to previous stable revision";
      setToastMessage(toastText);

      if (onRollbackSuccess) {
        onRollbackSuccess(data.rollback_id || "rb-simulated");
      }

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setToastMessage(null);
      }, 6000);
    } catch (err: any) {
      alert(`Rollback Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-950 border-2 border-rose-500 text-rose-100 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce max-w-md">
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold">{toastMessage}</div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-rose-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 1-Click Rollback Action Button */}
      <div className="inline-block">
        <button
          onClick={handleRollbackClick}
          disabled={!isAdmin || loading}
          title={
            !isAdmin
              ? "Emergency Rollback requires Admin role (current role: " + activeRole + ")"
              : "Execute immediate traffic shift rollback"
          }
          className={`px-5 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2.5 shadow-lg transition-all transform ${
            isAdmin
              ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse hover:scale-105 active:scale-95 shadow-rose-900/50 border border-rose-400"
              : "bg-bg-card text-text-secondary border border-border-subtle cursor-not-allowed opacity-60"
          }`}
        >
          <AlertOctagon className="w-5 h-5 text-accent-DEFAULT animate-spin-slow" />
          <span>🚨 1-Click Emergency Rollback</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-md">
          <div className="bg-bg-main border border-rose-500/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 border-b border-rose-900/60 pb-3">
              <div className="p-2 bg-rose-950 rounded-lg text-rose-400 border border-rose-800">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Confirm Emergency Rollback
                </h3>
                <span className="text-xs font-mono text-rose-400">
                  Incident ID: {incidentId.substring(0, 8)}
                </span>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed font-medium">
              This will roll back to the previous stable version —{" "}
              <strong className="text-accent-DEFAULT">{affectedUsers} users</strong> are
              currently affected. Confirm?
            </p>

            <div className="bg-bg-main p-3 rounded-lg border border-border-subtle text-xs text-text-secondary space-y-1 font-mono">
              <div className="text-text-secondary font-semibold">Simulation Parameters:</div>
              <div>• Target Version: v1.4.2-stable</div>
              <div>• Triggered By: {activeRole}</div>
              <div>• Action: Immediate Traffic Shift</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-4 py-2 bg-bg-card hover:bg-slate-700 text-text-secondary text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeRollback}
                disabled={loading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Rolling Back...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Rollback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyRollbackButton;
