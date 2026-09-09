"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  options: (Option | string)[];
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: Option[] = options.map((opt) =>
    typeof opt === "string" ? { label: opt, value: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 shadow-md ${
          isOpen
            ? "bg-bg-main border-accent-DEFAULT/80 text-accent-DEFAULT ring-2 ring-amber-500/20 shadow-amber-500/10 shadow-lg"
            : "bg-bg-main/80 border-border-subtle/60 text-text-primary hover:border-accent-DEFAULT/50 hover:bg-bg-main hover:text-white"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-accent-DEFAULT/80 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent-DEFAULT" : ""
          }`}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-bg-main/95 backdrop-blur-xl border border-border-subtle/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-150">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-accent-DEFAULT/15 text-accent-DEFAULT font-semibold border-l-2 border-accent-DEFAULT"
                    : "text-text-secondary hover:bg-bg-card/80 hover:text-accent-DEFAULT"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-accent-DEFAULT shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
