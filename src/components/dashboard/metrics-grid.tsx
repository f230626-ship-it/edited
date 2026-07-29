"use client";

import { TrendingUp, TrendingDown, Users, Briefcase, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsGridProps {
  metrics: {
    totalEmployees: number;
    activeProjects: number;
    pendingLeaves: number;
    totalAssets: number;
    teamSize: number;
    annualRemaining: number;
    sickRemaining: number;
    casualRemaining: number;
  };
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const metricCards = [
    {
      icon: Users,
      label: "Total Employees",
      value: metrics.totalEmployees.toLocaleString(),
      change: "+5.2%",
      trending: "up" as const,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      icon: Briefcase,
      label: "Active Projects",
      value: metrics.activeProjects.toLocaleString(),
      change: "+12.5%",
      trending: "up" as const,
      gradient: "from-green-500/20 to-emerald-500/20",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400",
    },
    {
      icon: Clock,
      label: "Pending Leaves",
      value: metrics.pendingLeaves.toString(),
      change: "-2.4%",
      trending: "down" as const,
      gradient: "from-orange-500/20 to-amber-500/20",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-400",
    },
    {
      icon: Package,
      label: "Total Assets",
      value: metrics.totalAssets.toLocaleString(),
      change: "+8.1%",
      trending: "up" as const,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-400",
    },
  ];

  const smallCards = [
    { label: "Team Members", value: metrics.teamSize.toString() },
    { label: "Annual Leave", value: metrics.annualRemaining.toString() },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trending === "up" ? TrendingUp : TrendingDown;
        
        return (
          <div
            key={index}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6",
              "hover:border-border/60 transition-all duration-300 hover:shadow-lg group"
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", card.gradient)} />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-xl", card.iconBg)}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  card.trending === "up" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                )}>
                  <TrendIcon className="h-3 w-3" />
                  {card.change}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
