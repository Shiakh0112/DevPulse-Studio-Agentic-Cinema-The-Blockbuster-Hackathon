'use client';

/**
 * DevPulse Studio - Role Switcher UI Component
 *
 * UI-LEVEL ROLE SIMULATION NOTE:
 * This component provides a live role-switching dropdown in the top navigation bar for demo purposes.
 * It enables the presenter to demonstrate RBAC guardrails (Viewer vs Engineer vs Admin) seamlessly.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRole, UserRole } from '../lib/RoleContext';
import { Shield, UserCheck, Eye, ChevronDown, Check } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, role, setRole } = useRole();
  const activeRole = (currentRole || role || 'viewer') as UserRole;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const rolesList: { id: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'viewer', label: 'Viewer', icon: <Eye className="w-4 h-4 text-slate-400" />, color: 'text-slate-300' },
    { id: 'engineer', label: 'Engineer', icon: <UserCheck className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-300' },
    { id: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4 text-rose-400" />, color: 'text-rose-300' },
  ];

  const currentConfig = rolesList.find((r) => r.id === activeRole) || rolesList[0];

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 shadow-md cursor-pointer ${
          isOpen
            ? 'bg-slate-900 border-amber-500/80 ring-2 ring-amber-500/20 text-white shadow-amber-500/10 shadow-lg'
            : 'bg-slate-950/80 border-slate-700/60 text-slate-200 hover:border-amber-500/50 hover:bg-slate-900'
        }`}
      >
        {currentConfig.icon}
        <span className="text-slate-400 font-mono uppercase tracking-wider">Role:</span>
        <span className={`${currentConfig.color} font-semibold`}>{currentConfig.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-amber-400/80 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 z-50 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-800/80">
            Switch RBAC Role
          </div>
          {rolesList.map((r) => {
            const isSelected = r.id === activeRole;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 text-amber-300 font-bold border-l-2 border-amber-400'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {r.icon}
                  <span className={isSelected ? 'text-amber-300' : r.color}>{r.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
