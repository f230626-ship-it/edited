"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowLeft, Calendar, Download, TrendingUp, TrendingDown, Minus,
  CheckCircle2, AlertTriangle, Activity, BarChart3, ClipboardCheck,
  Target, Star, Quote, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  employee: {
    id: string; name: string; photo: string | null;
    designation: string; department: string; employeeId: string;
    email: string; joiningDate: string; managerName: string; managerPhoto: string | null;
  };
  stats: {
    overallScore: number; overallTrend: number;
    standupScore: number; standupTrend: number;
    taskCompletion: number; taskTrend: number;
    consistency: number; consistTrend: number;
    grade: string; gradeLabel: string;
  };
  trendData: { month: string; overall: number; standup: number; task: number; consistency: number }[];
  moduleScores: { name: string; score: number }[];
  calendarDays: { date: number; hasStandup: boolean; score: number; isToday: boolean; isCurrentMonth: boolean }[];
  standupsThisMonth: number;
  recentStandups: { date: string; summary: string; detail: string; score: number }[];
  managerFeedback: { text: string; weaknesses: string | null; improvementAreas: string | null; rating: number; reviewer: string; reviewPeriod: string; date: string } | null;
  nextReviewDate: string;
  dateRange: string;
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

const MODULE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

export function EmployeePerformanceDetail({
  employee, stats, trendData, moduleScores, calendarDays,
  standupsThisMonth, recentStandups, managerFeedback, nextReviewDate, dateRange,
}: Props) {
  const [calMonth] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Date Range + Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/performance" className="hover:text-foreground transition-colors">My Performance</a>
          <span>/</span>
          <span className="font-semibold text-foreground">Employee Performance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {dateRange}
          </span>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" />
            Download Report
          </button>
        </div>
      </div>

      {/* Employee Profile Card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground overflow-hidden border border-border/30 shrink-0">
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="h-full w-full object-cover" />
              ) : (
                employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{employee.name}</h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Employee</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{employee.designation} | {employee.department}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div><span className="font-semibold text-foreground">Employee ID</span><br />{employee.employeeId}</div>
                <div><span className="font-semibold text-foreground">Email</span><br />{employee.email}</div>
                <div><span className="font-semibold text-foreground">Joining Date</span><br />{employee.joiningDate}</div>
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-semibold text-foreground">Manager</span><br />{employee.managerName}
                  </div>
                  {employee.managerPhoto && (
                    <div className="h-6 w-6 rounded-full bg-muted overflow-hidden border border-border/30">
                      <img src={employee.managerPhoto} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <a href="/performance" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Overview
          </a>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Overall Performance", value: stats.overallScore, trend: stats.overallTrend, icon: Activity, bg: "bg-indigo-500" },
          { label: "Stand-up Score", value: stats.standupScore, trend: stats.standupTrend, icon: BarChart3, bg: "bg-emerald-500" },
          { label: "Task Completion", value: stats.taskCompletion, trend: stats.taskTrend, icon: ClipboardCheck, bg: "bg-orange-500" },
          { label: "Consistency", value: stats.consistency, trend: stats.consistTrend, icon: Target, bg: "bg-purple-500" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", card.bg)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{card.value}%</p>
              <div className="flex items-center gap-1">
                <TrendBadge value={card.trend} />
                <span className="text-[10px] text-muted-foreground">vs last period</span>
              </div>
            </div>
          );
        })}
        {/* Grade Card */}
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Performance Grade</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.grade}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{stats.gradeLabel}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Keep up the great work!</p>
        </div>
      </div>

      {/* Trend Chart + Module Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Performance Trend</h3>
            <select className="appearance-none px-2 py-1 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold cursor-pointer">
              <option>Monthly</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />Overall Performance</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Stand-up Score</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />Task Completion</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" />Consistency</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b9" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b9" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                <Line type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="standup" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="task" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }} />
                <Line type="monotone" dataKey="consistency" stroke="#a855f7" strokeWidth={2} dot={{ r: 4, fill: "#a855f7", strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Module Performance */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <h3 className="text-sm font-bold">Module Performance</h3>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moduleScores}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="score"
                  stroke="none"
                  paddingAngle={2}
                >
                  {moduleScores.map((_, i) => (
                    <Cell key={i} fill={MODULE_COLORS[i % MODULE_COLORS.length]} />
                  ))}
                </Pie>
                <text x="50%" y="44%" textAnchor="middle" className="fill-muted-foreground" fontSize={11} fontWeight={600}>Avg. Score</text>
                <text x="50%" y="58%" textAnchor="middle" className="fill-foreground" fontSize={22} fontWeight={800}>{stats.overallScore}%</text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {moduleScores.map((mod, i) => (
              <div key={mod.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MODULE_COLORS[i] }} />
                  <span className="font-medium">{mod.name}</span>
                </div>
                <span className={cn("font-bold tabular-nums", scoreColor(mod.score))}>{mod.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stand-up Activity + Recent Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendar Heatmap */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Stand-up Activity</h3>
            <span className="text-[10px] text-muted-foreground flex items-center gap-2">
              Less <span className="flex gap-0.5"><span className="h-2.5 w-2.5 rounded bg-emerald-100" /><span className="h-2.5 w-2.5 rounded bg-emerald-300" /><span className="h-2.5 w-2.5 rounded bg-emerald-500" /><span className="h-2.5 w-2.5 rounded bg-emerald-700" /></span> More
            </span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{calMonth}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "h-8 w-full rounded flex items-center justify-center text-[11px] font-medium",
                  !day.isCurrentMonth && "text-muted-foreground/30",
                  day.isCurrentMonth && !day.hasStandup && "bg-muted/40 text-muted-foreground",
                  day.isCurrentMonth && day.hasStandup && day.score >= 80 && "bg-emerald-500 text-white",
                  day.isCurrentMonth && day.hasStandup && day.score >= 60 && day.score < 80 && "bg-emerald-300 text-foreground",
                  day.isCurrentMonth && day.hasStandup && day.score < 60 && "bg-emerald-200 text-foreground",
                  day.isToday && "ring-2 ring-primary ring-offset-1",
                )}
              >
                {day.date}
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{standupsThisMonth} / 20 stand-ups submitted this month</p>
        </div>

        {/* Recent Stand-up Notes */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Recent Stand-up Notes</h3>
            <a href={`/performance/standups?employee=${employee.id}`} className="text-xs font-semibold text-primary hover:underline">View All</a>
          </div>
          {recentStandups.length > 0 ? recentStandups.map((note, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-bold", scoreBg(note.score))}>
                {note.score}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{note.summary}</p>
                {note.detail && <p className="text-[11px] text-muted-foreground truncate">{note.detail}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{note.date}</span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground text-center py-8">No standups recorded yet.</p>
          )}
        </div>
      </div>

      {/* Manager Feedback + Next Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Manager Feedback</h3>
            {managerFeedback && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{managerFeedback.reviewPeriod}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={cn("h-3.5 w-3.5", star <= managerFeedback.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </div>
            )}
          </div>
          {managerFeedback ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Strengths</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{managerFeedback.text}</p>
                </div>
              </div>
              {managerFeedback.weaknesses && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Areas for Improvement</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{managerFeedback.weaknesses}</p>
                  </div>
                </div>
              )}
              {managerFeedback.improvementAreas && (
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Action Items</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{managerFeedback.improvementAreas}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border/30">
                  {managerFeedback.reviewer[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold">{managerFeedback.reviewer}</p>
                  <p className="text-[10px] text-muted-foreground">{managerFeedback.date}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No feedback yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-3">
          <h3 className="text-sm font-bold">Next Review Date</h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{nextReviewDate}</p>
              <p className="text-[11px] text-muted-foreground">Upcoming review</p>
            </div>
          </div>
          {managerFeedback && (
            <div className="pt-3 border-t border-border/30 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Last review</span>
                <span className="font-semibold">{managerFeedback.date}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Period</span>
                <span className="font-semibold">{managerFeedback.reviewPeriod}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Rating</span>
                <span className="font-semibold">{managerFeedback.rating}/5</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
