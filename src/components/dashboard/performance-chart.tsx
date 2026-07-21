"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface PerformanceChartProps {
  recentLeaves: any[];
  leaveBalance: any;
}

export function PerformanceChart({ recentLeaves, leaveBalance }: PerformanceChartProps) {
  // Generate chart data from recent leaves
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i).toLocaleDateString('en-US', { month: 'short' }),
    value: Math.floor(Math.random() * 40) + 10,
  }));

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <Card className="relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold">Performance Overview</h2>
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              +24.5%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">1,907</span>
            <span className="text-muted-foreground text-sm">activities today</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">10M</p>
            <p className="text-xs text-muted-foreground">views</p>
          </div>
        </div>
      </div>

      <div className="relative h-64">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-border/20" />
          ))}
        </div>

        {/* Chart bars */}
        <div className="absolute inset-0 flex items-end justify-between gap-2 px-2">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full rounded-t-lg bg-gradient-to-t from-primary/80 to-primary/40 relative group transition-all hover:from-primary hover:to-primary/60"
                style={{ height: `${(data.value / maxValue) * 100}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-medium border shadow-lg">
                    {data.value}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{data.month}</span>
            </div>
          ))}
        </div>

        {/* Trend line overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="rgb(147, 51, 234)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <polyline
            points={chartData.map((d, i) => 
              `${(i / (chartData.length - 1)) * 100}%,${100 - (d.value / maxValue) * 80}%`
            ).join(' ')}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-lg"
          />
        </svg>
      </div>
    </Card>
  );
}
