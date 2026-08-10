"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Activity,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StandupEntry } from "@/actions/standup";

interface LeaderboardEntry {
  employee_id: string;
  employee_name: string;
  total_standups: number;
  total_tasks_completed: number;
  total_blockers: number;
  avg_score: number;
  consistency_pct: number;
  trend: "up" | "down" | "stable";
}

interface Props {
  initialEntries: StandupEntry[];
  initialLeaderboard: LeaderboardEntry[];
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/20";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function StandupDashboard({ initialEntries, initialLeaderboard }: Props) {
  const [entries, setEntries] = useState<StandupEntry[]>(initialEntries);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayEntries = entries.filter((e) => e.created_at.startsWith(today));
  const todayAvgScore =
    todayEntries.length > 0
      ? Math.round(todayEntries.reduce((s, e) => s + e.performance_score, 0) / todayEntries.length)
      : 0;
  const todayBlockers = todayEntries.reduce((s, e) => s + e.blockers.length, 0);
  const todayTasks = todayEntries.reduce((s, e) => s + e.completed.length, 0);

  const chartData = leaderboard.map((e) => ({
    name: e.employee_name.split(" ")[0],
    score: e.avg_score,
    tasks: e.total_tasks_completed,
    standups: e.total_standups,
  }));

  return (
    <div className="space-y-7">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                  <MessageSquare className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Standup Performance</h1>
                  <p className="text-sm text-muted-foreground font-medium mt-0.5">
                    AI-powered analysis of daily stand-ups
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground"
              />
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600">
                <Activity className="h-3.5 w-3.5" />
                Live
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative group flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-80" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <Users className="h-5 w-5 text-emerald-500" strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Today</span>
          </div>
          <span className="text-2xl font-black tabular-nums tracking-tight">{todayEntries.length}</span>
          <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">employees posted</p>
        </div>

        <div className="relative group flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-blue-500 to-blue-400 opacity-80" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <CheckCircle2 className="h-5 w-5 text-blue-500" strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tasks Done</span>
          </div>
          <span className="text-2xl font-black tabular-nums tracking-tight">{todayTasks}</span>
          <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">completed today</p>
        </div>

        <div className="relative group flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-amber-500 to-amber-400 opacity-80" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Blockers</span>
          </div>
          <span className="text-2xl font-black tabular-nums tracking-tight">{todayBlockers}</span>
          <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">reported today</p>
        </div>

        <div className="relative group flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-violet-500 to-violet-400 opacity-80" />
          <div className="flex items-center gap-2.5 mb-2.5">
            <Zap className="h-5 w-5 text-violet-500" strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Avg Score</span>
          </div>
          <span className={cn("text-2xl font-black tabular-nums tracking-tight", scoreColor(todayAvgScore))}>
            {todayAvgScore}
          </span>
          <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">out of 100</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Leaderboard Chart */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Team Performance</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                Weekly scores comparison
              </p>
            </div>
          </div>
          <div className="p-5 h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="score" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No standup data yet
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shadow-sm">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Leaderboard</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                Top performers this week
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {leaderboard.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">#</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employee</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasks</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.employee_id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-sm font-black text-muted-foreground">{i + 1}</td>
                      <td className="px-6 py-3 text-sm font-bold">{entry.employee_name}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black border", scoreBg(entry.avg_score), scoreColor(entry.avg_score))}>
                          {entry.avg_score}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center text-sm font-bold tabular-nums">{entry.total_tasks_completed}</td>
                      <td className="px-6 py-3 text-center"><TrendIcon trend={entry.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                No leaderboard data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Standups Feed */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shadow-sm">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Live Standup Feed</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              Real-time standup entries
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/30 max-h-[600px] overflow-auto">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold">{entry.employee_name}</span>
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md border", scoreBg(entry.performance_score), scoreColor(entry.performance_score))}>
                        {entry.performance_score}/100
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{entry.raw_text}</p>

                    <div className="flex flex-wrap gap-3">
                      {entry.completed.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-[11px] font-semibold text-emerald-600">{entry.completed.length} done</span>
                        </div>
                      )}
                      {entry.blockers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span className="text-[11px] font-semibold text-amber-600">{entry.blockers.length} blocker{entry.blockers.length > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {entry.in_progress.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-blue-500" />
                          <span className="text-[11px] font-semibold text-blue-600">{entry.in_progress.length} in progress</span>
                        </div>
                      )}
                    </div>

                    {(entry.completed.length > 0 || entry.blockers.length > 0 || entry.in_progress.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.completed.map((task, i) => (
                          <span key={`c-${i}`} className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md">{task}</span>
                        ))}
                        {entry.blockers.map((b, i) => (
                          <span key={`b-${i}`} className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md">{b}</span>
                        ))}
                        {entry.in_progress.map((t, i) => (
                          <span key={`p-${i}`} className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-md">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <h4 className="text-sm font-black">No standups yet</h4>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-[200px]">
                Employees need to post stand-ups in the configured Slack channel
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
