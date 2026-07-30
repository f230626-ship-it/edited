"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface MetricItem {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  color: string;
}

// Modern semantic colors
const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-amber-500/10", text: "text-amber-500", ring: "ring-amber-500/20" },
  blue:    { bg: "bg-blue-500/10",  text: "text-blue-500",  ring: "ring-blue-500/20" },
  amber:   { bg: "bg-orange-500/10", text: "text-orange-500", ring: "ring-orange-500/20" },
  green:   { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/20" },
  violet:  { bg: "bg-indigo-500/10", text: "text-indigo-500", ring: "ring-indigo-500/20" },
};

export function MetricStrip({
  metrics,
  activeFilter,
  onFilterChange,
}: {
  metrics: MetricItem[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}) {
  const filterMap: Record<number, string | null> = {
    0: "active",
    1: null,
    2: "retainers",
    3: null,
    4: "on_hold",
    5: "completed",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 w-full">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        const filter = filterMap[i];
        const isClickable = true;
        const isActive = activeFilter === filter;
        const colors = COLOR_MAP[m.color] ?? COLOR_MAP.primary;

        return (
          <button
            key={m.label}
            onClick={() => {
              onFilterChange(isActive ? null : filter);
            }}
            className={cn(
              "group relative flex flex-col justify-center text-left w-full rounded-xl border bg-card/40 px-4 py-3.5 sm:px-4 sm:py-4 backdrop-blur-xl transition-all duration-300",
              isClickable ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : "cursor-default",
              isActive 
                ? "border-primary/40 shadow-[0_4px_20px_rgb(229,161,88,0.12)] ring-1 ring-primary/20 bg-primary/[0.03]" 
                : "border-border/50 hover:border-border/80 shadow-sm hover:bg-card/60"
            )}
          >
            {/* Active Top Bar Indicator */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
            )}

            <div className="flex flex-col w-full gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-300",
                  isActive ? colors.bg : "bg-muted group-hover:bg-muted/80"
                )}>
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 transition-colors duration-300",
                      isActive ? colors.text : "text-muted-foreground group-hover:text-foreground/80"
                    )}
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {m.label}
                </span>
              </div>
              
              <div className="flex items-end">
                <span className={cn(
                  "text-2xl font-black tabular-nums tracking-tight leading-none",
                  isActive ? colors.text : "text-foreground"
                )}>
                  {m.value}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
