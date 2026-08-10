"use client";

import { Activity, MessageSquare, CheckCircle, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceKpiCardsProps {
  overallPerformance?: string;
  standupScore?: string;
  taskCompletion?: string;
}

export function PerformanceKpiCards({
  overallPerformance = "87%",
  standupScore = "91%",
  taskCompletion = "92%"
}: PerformanceKpiCardsProps) {
  const cards = [
    {
      title: "Overall Performance",
      value: overallPerformance,
      trend: "6%",
      trendLabel: "vs last period",
      icon: Activity,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10",
      borderClass: "border-blue-500/20",
    },
    {
      title: "Stand-up Score",
      value: standupScore,
      trend: "7%",
      trendLabel: "vs last period",
      icon: MessageSquare,
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/20",
    },
    {
      title: "Task Completion",
      value: taskCompletion,
      trend: "5%",
      trendLabel: "vs last period",
      icon: CheckCircle,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-500/10",
      borderClass: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-slide-up stagger-1">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className="card-premium rounded-2xl p-5 md:p-8 flex flex-col items-center justify-center text-center shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4 w-full justify-center">
            <div
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center border",
                card.bgClass,
                card.borderClass
              )}
            >
              <card.icon className={cn("h-4 w-4", card.colorClass)} />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground/90">{card.title}</h3>
          </div>
          <div className="text-4xl md:text-[40px] font-bold tracking-tight mb-3">
            {card.value}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="flex items-center text-emerald-500 font-medium">
              <ArrowUp className="h-3 w-3 mr-0.5" />
              {card.trend}
            </span>
            <span className="text-muted-foreground">{card.trendLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
