"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, ShieldCheck, Zap, Menu, X } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/feed", label: "Live Incident Feed", icon: <Activity className="w-4 h-4 text-[#6366F1]" /> },
    { href: "/analytics", label: "Analytics & MTTR", icon: <BarChart3 className="w-4 h-4 text-emerald-400" /> },
    { href: "/audit", label: "Governance & Audit", icon: <ShieldCheck className="w-4 h-4 text-indigo-400" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-[#0B0E14] text-[#FFFFFF]">
      {/* Mobile Top Navbar Header (< md) */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0B0E14]/95 backdrop-blur-lg border-b border-[#1F293D] px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-[#8A94A6] hover:text-white rounded-lg bg-[#0B0E14] border border-[#1F293D] cursor-pointer transition-colors"
            aria-label="Open Navigation Sidebar Drawer"
          >
            <Menu className="w-5 h-5 text-[#6366F1]" />
          </button>
          <Link href="/feed" className="flex items-center gap-2">
            <div className="p-1.5 bg-[#6366F1]/10 rounded-md border border-[#6366F1]/30 text-[#6366F1]">
              <Zap className="w-4 h-4 fill-amber-500/20" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#FFFFFF]">
              DevPulse <span className="text-[#6366F1]">Studio</span>
            </span>
          </Link>
        </div>

        <RoleSwitcher />
      </header>

      {/* Mobile Soft Slide-Out Sidebar Drawer Container (Persistent in DOM for smooth open & close CSS transitions) */}
      <div
        className={`md:hidden fixed inset-0 z-50 flex transition-all duration-300 ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Soft Backdrop Overlay (Fades in / out softly) */}
        <div
          className={`fixed inset-0 bg-[#0B0E14]/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Left Soft Slide Drawer Panel (Slides in / out softly) */}
        <div
          className={`relative w-72 max-w-[80vw] bg-[#0B0E14] border-r border-[#1F293D] h-full p-5 shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300 ease-in-out transform ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1F293D]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#6366F1]/10 rounded-lg border border-[#6366F1]/30 text-[#6366F1]">
                  <Zap className="w-5 h-5 fill-amber-500/20" />
                </div>
                <div>
                  <h2 className="font-bold text-base tracking-tight text-[#FFFFFF] leading-none">
                    DevPulse <span className="text-[#6366F1]">Studio</span>
                  </h2>
                  <span className="text-[9px] uppercase font-mono text-[#8A94A6]">AIOps Engine</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#8A94A6] hover:text-white rounded-lg bg-[#0B0E14] border border-[#1F293D] cursor-pointer transition-colors"
                aria-label="Close Mobile Sidebar Drawer"
              >
                <X className="w-4 h-4 text-[#6366F1]" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1 font-medium">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-[#6366F1]/15 text-[#6366F1] font-semibold border-l-2 border-[#6366F1]"
                        : "text-[#8A94A6] hover:text-[#FFFFFF] hover:bg-[#121824]/60"
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom MCP Status Box */}
          <div className="p-3 bg-[#0B0E14] border border-[#1F293D] rounded-xl text-xs text-[#8A94A6] space-y-1">
            <div className="font-semibold text-[#8A94A6] flex items-center justify-between">
              <span>ClickHouse MCP</span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Agent Platform Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar (>= md) */}
      <aside className="hidden md:flex w-64 bg-[#0B0E14] border-r border-[#1F293D] flex-col justify-between p-4 shrink-0 h-screen sticky top-0">
        <div>
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-[#1F293D]">
            <div className="p-2 bg-[#6366F1]/10 rounded-lg border border-[#6366F1]/30 text-[#6366F1]">
              <Zap className="w-6 h-6 fill-amber-500/20" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-[#FFFFFF] leading-none">
                DevPulse <span className="text-[#6366F1] font-extrabold">Studio</span>
              </h1>
              <span className="text-[10px] uppercase font-mono text-[#8A94A6] tracking-wider">AIOps Engine</span>
            </div>
          </div>

          <nav className="space-y-1 font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#6366F1]/15 text-[#6366F1] font-semibold border-l-2 border-[#6366F1]"
                      : "text-[#8A94A6] hover:text-[#FFFFFF] hover:bg-[#121824]/60"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 bg-[#0B0E14] border border-[#1F293D] rounded-lg text-xs text-[#8A94A6] space-y-1">
          <div className="font-semibold text-[#8A94A6] flex items-center justify-between">
            <span>ClickHouse MCP</span>
            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Agent Platform Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar Header (>= md) */}
        <header className="hidden md:flex h-16 border-b border-[#1F293D] bg-[#0B0E14]/50 backdrop-blur px-6 items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8A94A6]">
            <span className="px-2 py-0.5 rounded bg-[#121824] text-[#8A94A6]">ENV: Production</span>
            <span>/</span>
            <span className="text-[#6366F1]">Media Pipeline Watcher</span>
          </div>

          <RoleSwitcher />
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
