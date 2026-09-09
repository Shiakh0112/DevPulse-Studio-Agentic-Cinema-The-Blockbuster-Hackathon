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
    { id: 'viewer', label: 'Viewer', icon: <Eye className="w-4 h-4 text-text-secondary" />, color: 'text-text-secondary' },
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
            ? 'bg-bg-main border-accent-DEFAULT/80 ring-2 ring-amber-500/20 text-white shadow-amber-500/10 shadow-lg'
            : 'bg-bg-main/80 border-border-subtle/60 text-text-primary hover:border-accent-DEFAULT/50 hover:bg-bg-main'
        }`}
      >
        {currentConfig.icon}
        <span className="text-text-secondary font-mono uppercase tracking-wider">Role:</span>
        <span className={`${currentConfig.color} font-semibold`}>{currentConfig.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-accent-DEFAULT/80 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-accent-DEFAULT' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 z-50 bg-bg-main/95 backdrop-blur-xl border border-border-subtle/80 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-mono text-text-secondary uppercase tracking-widest border-b border-border-subtle/80">
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
                    ? 'bg-accent-DEFAULT/15 text-accent-DEFAULT font-bold border-l-2 border-accent-DEFAULT'
                    : 'text-text-secondary hover:bg-bg-card/80 hover:text-accent-DEFAULT'
                }`}
              >
                <div className="flex items-center gap-2">
                  {r.icon}
                  <span className={isSelected ? 'text-accent-DEFAULT' : r.color}>{r.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-accent-DEFAULT shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
