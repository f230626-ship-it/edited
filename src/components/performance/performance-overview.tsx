"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle,
  Activity, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeRow {
  employee_id: string;
  employee_name: string;
  employee_photo: string | null;
  avg_score: number;
  total_standups: number;
  consistency_pct: number;
  total_tasks_completed: number;
}

interface TrendPoint {
  month: string;
  score: number;
}

interface Insight {
  type: "positive" | "warning";
  title: string;
  description: string;
}

interface Props {
  employees: EmployeeRow[];
  trendData: TrendPoint[];
  weeklyTrendData?: TrendPoint[];
  overallScore: number;
  overallScoreTrend: number;
  standupScore: number;
  standupScoreTrend: number;
  taskCompletion: number;
  taskCompletionTrend: number;
  insights: Insight[];
  dateRange: string;
  isDark: boolean;
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500">
        <TrendingDown className="h-3 w-3" />{Math.abs(value)}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

export function PerformanceOverview({
  employees, trendData, weeklyTrendData, overallScore, overallScoreTrend,
  standupScore, standupScoreTrend, taskCompletion, taskCompletionTrend,
  insights, dateRange, isDark,
}: Props) {
  const [trendGranularity, setTrendGranularity] = useState<"Monthly" | "Weekly">("Weekly");

  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const tickColor = isDark ? "#64748b" : "#94a3b9";
  const lineColor = isDark ? "#818cf8" : "#6366f1";

  const statCards = [
    { label: "Overall Performance", value: overallScore, trend: overallScoreTrend, icon: Activity, iconBg: "bg-indigo-500", ringBg: "bg-indigo-500/10" },
    { label: "Stand-up Score", value: standupScore, trend: standupScoreTrend, icon: BarChart3, iconBg: "bg-emerald-500", ringBg: "bg-emerald-500/10" },
    { label: "Task Completion", value: taskCompletion, trend: taskCompletionTrend, icon: CheckCircle2, iconBg: "bg-orange-500", ringBg: "bg-orange-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Performance Overview</h2>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground">
            {dateRange}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className={cn("h-11 w-11 rounded-full flex items-center justify-center shrink-0", card.ringBg)}>
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", card.iconBg)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{card.label}</p>
                  <p className="text-2xl font-bold tabular-nums">{card.value}%</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendBadge value={card.trend} />
                    <span className="text-[11px] text-muted-foreground">vs last period</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Performance Trend</h3>
          <select
            value={trendGranularity}
            onChange={(e) => setTrendGranularity(e.target.value as "Monthly" | "Weekly")}
            className="appearance-none px-3 py-1.5 pr-8 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold text-foreground cursor-pointer"
          >
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
          </select>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={trendGranularity === "Weekly" && weeklyTrendData?.length ? weeklyTrendData : trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: isDark ? "#12171e" : "#ffffff",
                  border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                  borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                }}
              />
              <Line type="monotone" dataKey="score" stroke={lineColor} strokeWidth={3}
                dot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: isDark ? "#0f172a" : "#ffffff" }}
                activeDot={{ r: 7, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div id="employee-performance" className="rounded-2xl border border-border/50 bg-card overflow-hidden scroll-mt-20">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-bold tracking-tight">Employee Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stand-ups</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consistency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {employees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <a href={`/performance/employee/${emp.employee_id}`} className="flex items-center gap-3 no-underline">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden border border-border/30 shrink-0">
                        {emp.employee_photo ? (
                          <img src={emp.employee_photo} alt={emp.employee_name} className="h-full w-full object-cover" />
                        ) : (
                          emp.employee_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
                        )}
                      </div>
                      <span className="font-semibold text-sm text-foreground">{emp.employee_name}</span>
                    </a>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className={cn("text-sm font-bold tabular-nums",
                      emp.avg_score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                      emp.avg_score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-500"
                    )}>{emp.avg_score}%</span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {emp.total_standups}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {emp.total_tasks_completed}%
                    </span>
                  </td>
                  <td className="text-center px-4 py-3.5">
                    <span className={cn("text-sm font-semibold tabular-nums",
                      emp.consistency_pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                      emp.consistency_pct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-500"
                    )}>{emp.consistency_pct}%</span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">No employee data available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h3 className="text-lg font-bold tracking-tight">Performance Insights</h3>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border/30 bg-muted/20 p-4">
              <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                insight.type === "positive" ? "bg-emerald-500" : "bg-amber-500"
              )}>
                {insight.type === "positive" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          ))}
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Insights will appear as more data is collected.</p>
          )}
        </div>
      </div>

      <a
        href="/performance/employees"
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        View Employee Performance
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
    </div>
  );
}
