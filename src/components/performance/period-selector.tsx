"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Calendar } from "lucide-react";

export function PeriodSelector({ currentPeriod }: { currentPeriod: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { value: "weekly", label: "This Week" },
    { value: "monthly", label: "This Month" },
    { value: "quarterly", label: "This Quarter" },
  ];

  const activeLabel = options.find((o) => o.value === currentPeriod)?.label || "This Month";

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/50 text-[13px] font-semibold text-foreground hover:bg-muted/30 transition-all shadow-sm active:scale-95"
      >
        <Calendar className="h-4 w-4 text-primary" />
        <span>{activeLabel}</span>
        <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border/40 bg-card/95 backdrop-blur-md p-1.5 shadow-xl z-50 animate-scale-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentPeriod === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
