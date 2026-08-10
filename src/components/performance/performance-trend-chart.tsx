"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";

interface PerformanceTrendChartProps {
  data?: { name: string; score: number }[];
}

export function PerformanceTrendChart({ data = [] }: PerformanceTrendChartProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const tickColor = isDark ? "#64748b" : "#94a3af";
  const brandColor = "#6366f1"; // Indigo-500 matching the design

  // Group by Month if viewMode is "monthly"
  let chartData;
  if (viewMode === "monthly") {
    const monthlyMap = new Map<string, { sum: number; count: number }>();
    const sourceData = data.length > 0 ? data : [
      { name: "May 1", score: 62 },
      { name: "Jun 1", score: 75 },
      { name: "Jul 1", score: 88 },
      { name: "Aug 1", score: 80 },
    ];

    sourceData.forEach((item) => {
      const parts = item.name.split(" ");
      const monthName = parts[0];
      const existing = monthlyMap.get(monthName) || { sum: 0, count: 0 };
      monthlyMap.set(monthName, {
        sum: existing.sum + item.score,
        count: existing.count + 1,
      });
    });

    chartData = Array.from(monthlyMap.entries()).map(([month, val]) => ({
      month,
      score: Math.round(val.sum / val.count),
    }));
  } else {
    chartData = data.length > 0 
      ? data.map(item => ({ month: item.name, score: item.score }))
      : [
          { month: "Wk 1", score: 62 },
          { month: "Wk 2", score: 75 },
          { month: "Wk 3", score: 88 },
          { month: "Wk 4", score: 80 },
        ];
  }

  if (!mounted) {
    return (
      <div className="card-premium rounded-2xl animate-slide-up stagger-2 h-[380px] w-full flex items-center justify-center">
        <div className="text-muted-foreground/40 text-xs">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="card-premium rounded-2xl animate-slide-up stagger-2 relative z-40">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
        <h3 className="text-[15px] font-semibold">Performance Trend</h3>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground transition-all cursor-pointer select-none capitalize"
          >
            {viewMode} View
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          {open && (
            <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-border/40 bg-card/95 backdrop-blur-md p-1 shadow-lg z-50 animate-scale-in">
              {["weekly", "monthly"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode as "weekly" | "monthly");
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                    viewMode === mode
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={brandColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={brandColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: tickColor }} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              domain={[0, 100]} 
              ticks={[0, 20, 40, 60, 80, 100]} 
              tick={{ fontSize: 11, fill: tickColor }} 
              axisLine={false} 
              tickLine={false} 
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? "#12171e" : "#ffffff",
                border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}
              cursor={{ stroke: isDark ? '#334155' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="score"
              name="Score"
              stroke={brandColor}
              strokeWidth={2.5}
              fill="url(#gradTrend)"
              dot={{ r: 4, fill: isDark ? "#0a0e14" : "#ffffff", strokeWidth: 2, stroke: brandColor }}
              activeDot={{ r: 6, fill: brandColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
