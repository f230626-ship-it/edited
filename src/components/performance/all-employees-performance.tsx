"use client";

import { BarChart3, Activity, CheckCircle2, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeRow {
  employee_id: string;
  employee_name: string;
  employee_photo: string | null;
  avg_score: number;
  total_standups: number;
  consistency_pct: number;
  total_tasks_completed: number;
  trend?: string;
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      <TrendingUp className="h-3 w-3" />+{value}%
    </span>
  );
  if (value < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500">
      <TrendingDown className="h-3 w-3" />{value}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (s >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}

function scoreBg(s: number) {
  if (s >= 80) return "bg-emerald-500";
  if (s >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function grade(s: number) {
  if (s >= 90) return "A+";
  if (s >= 85) return "A";
  if (s >= 75) return "B";
  if (s >= 60) return "C";
  if (s >= 40) return "D";
  return "F";
}

export function AllEmployeesPerformance({ employees }: { employees: EmployeeRow[] }) {
  const sorted = [...employees].sort((a, b) => b.avg_score - a.avg_score);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <a href="/performance" className="hover:text-foreground transition-colors">My Performance</a>
            <span>/</span>
            <span className="font-semibold text-foreground">All Employees</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Performance</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          {employees.length} Employees
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((emp) => (
          <a
            key={emp.employee_id}
            href={`/performance/employee/${emp.employee_id}`}
            className="group rounded-2xl border border-border/50 bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-base font-bold text-muted-foreground overflow-hidden border border-border/30 shrink-0">
                  {emp.employee_photo ? (
                    <img src={emp.employee_photo} alt={emp.employee_name} className="h-full w-full object-cover" />
                  ) : (
                    emp.employee_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{emp.employee_name}</h3>
                  <span className={cn("text-lg font-black", scoreColor(emp.avg_score))}>{emp.avg_score}%</span>
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                emp.avg_score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                emp.avg_score >= 60 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                "bg-red-500/10 text-red-500"
              )}>
                {grade(emp.avg_score)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Stand-ups</p>
                <p className="text-sm font-bold tabular-nums">{emp.total_standups}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Tasks</p>
                <p className="text-sm font-bold tabular-nums">{emp.total_tasks_completed}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Consistency</p>
                <p className="text-sm font-bold tabular-nums">{emp.consistency_pct}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground">Performance trend</span>
              <TrendBadge value={emp.avg_score - 50} />
            </div>
          </a>
        ))}
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No employee data available yet.
        </div>
      )}
    </div>
  );
}
