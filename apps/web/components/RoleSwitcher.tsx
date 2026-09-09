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
    { id: 'viewer', label: 'Viewer', icon: <Eye className="w-4 h-4 text-[#8A94A6]" />, color: 'text-[#8A94A6]' },
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
            ? 'bg-[#0B0E14] border-[#6366F1]/80 ring-2 ring-amber-500/20 text-white shadow-amber-500/10 shadow-lg'
            : 'bg-[#0B0E14]/80 border-[#1F293D]/60 text-[#FFFFFF] hover:border-[#6366F1]/50 hover:bg-[#0B0E14]'
        }`}
      >
        {currentConfig.icon}
        <span className="text-[#8A94A6] font-mono uppercase tracking-wider">Role:</span>
        <span className={`${currentConfig.color} font-semibold`}>{currentConfig.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#6366F1]/80 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#6366F1]' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 z-50 bg-[#0B0E14]/95 backdrop-blur-xl border border-[#1F293D]/80 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-mono text-[#8A94A6] uppercase tracking-widest border-b border-[#1F293D]/80">
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
                    ? 'bg-[#6366F1]/15 text-[#6366F1] font-bold border-l-2 border-[#6366F1]'
                    : 'text-[#8A94A6] hover:bg-[#121824]/80 hover:text-[#6366F1]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {r.icon}
                  <span className={isSelected ? 'text-[#6366F1]' : r.color}>{r.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#6366F1] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
