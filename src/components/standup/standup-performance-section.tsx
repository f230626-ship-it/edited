"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  MessageSquare, TrendingUp, CheckCircle2, AlertTriangle,
  Clock, Users, Zap, Activity, ChevronDown, ChevronRight,
  Flame,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { getStandupEntries, type StandupEntry, type Period } from "@/actions/standup";

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number) {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  if (score >= 40) return "Below Avg";
  return "Needs Work";
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const R = (size - 6) / 2;
  const circ = 2 * Math.PI * R;
  const offset = circ - (score / 100) * circ;
  const strokeColor = score >= 80 ? "#10b981" : score >= 60 ? "#e5a158" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={R}
        fill="none"
        stroke={strokeColor}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </svg>
  );
}

interface EnrichedEntry extends StandupEntry {
  employee_photo: string | null;
  employee_designation: string | null;
}

interface Props {
  initialEntries?: EnrichedEntry[];
  initialLabel?: string;
  initialStats?: { totalEntries: number; totalTasks: number; totalBlockers: number; avgScore: number };
}

export function StandupPerformanceSection({ initialEntries = [], initialLabel = "This Week", initialStats }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [period, setPeriod] = useState<Period>("weekly");
  const [entries, setEntries] = useState<EnrichedEntry[]>(initialEntries);
  const [label, setLabel] = useState(initialLabel);
  const [stats, setStats] = useState(initialStats || { totalEntries: 0, totalTasks: 0, totalBlockers: 0, avgScore: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async (p: Period) => {
    setLoading(true);
    try {
      const result = await getStandupEntries(p);
      setEntries(result.entries);
      setLabel(result.label);
      setStats(result.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(period); }, [period]);

  const employeeGroups = entries.reduce<Record<string, { name: string; photo: string | null; designation: string | null; entries: EnrichedEntry[]; avgScore: number; totalCompleted: number; totalBlockers: number; totalInProgress: number }>>((acc, e) => {
    const key = e.employee_id || "unknown";
    if (!acc[key]) acc[key] = { name: e.employee_name, photo: e.employee_photo, designation: e.employee_designation, entries: [], avgScore: 0, totalCompleted: 0, totalBlockers: 0, totalInProgress: 0 };
    acc[key].entries.push(e);
    acc[key].totalCompleted += e.completed.length;
    acc[key].totalBlockers += e.blockers.length;
    acc[key].totalInProgress += e.in_progress.length;
    return acc;
  }, {});

  Object.values(employeeGroups).forEach(g => {
    g.avgScore = g.entries.length > 0 ? Math.round(g.entries.reduce((s, e) => s + e.performance_score, 0) / g.entries.length) : 0;
  });

  const sortedEmployees = Object.entries(employeeGroups).sort(([, a], [, b]) => b.avgScore - a.avgScore);

  const chartData = sortedEmployees.map(([, g]) => ({
    name: g.name.split(" ")[0],
    score: g.avgScore,
    tasks: g.totalCompleted,
    standups: g.entries.length,
  }));

  const radarData = sortedEmployees.slice(0, 6).map(([, g]) => ({
    subject: g.name.split(" ")[0],
    score: g.avgScore,
    fullMark: 100,
  }));

  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const tickColor = isDark ? "#64748b" : "#94a3af";

  const standupStats = [
    { label: "Entries", value: stats.totalEntries, icon: Users, color: "text-emerald-500", glow: "glass-card-glow-green" },
    { label: "Tasks Done", value: stats.totalTasks, icon: CheckCircle2, color: "text-blue-500", glow: "glass-card-glow-blue" },
    { label: "Blockers", value: stats.totalBlockers, icon: AlertTriangle, color: "text-amber-500", glow: "glass-card-glow-amber" },
    { label: "Avg Score", value: stats.avgScore, icon: Zap, color: "text-violet-500", glow: "glass-card-glow-violet" },
  ];

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Standup Performance</h2>
            <p className="text-xs text-muted-foreground">AI-powered daily standup analysis</p>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="pm-tabs">
          {(["weekly", "monthly", "quarterly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn("pm-tab", period === p && "pm-tab-active")}
            >
              {p === "weekly" ? "Weekly" : p === "monthly" ? "Monthly" : "Quarterly"}
            </button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground self-center">{label}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {standupStats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn("rounded-xl p-4", s.glow)}>
              <div className="flex items-center gap-2.5 mb-2">
                <Icon className={cn("h-4 w-4", s.color)} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
              <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {sortedEmployees.length > 0 && (
        <div className={cn("grid gap-4", radarData.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
          <div className={cn("card-premium rounded-xl", radarData.length >= 3 && "lg:col-span-2")}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Performance Comparison</h3>
                <p className="text-[11px] text-muted-foreground">Employee scores</p>
              </div>
            </div>
            <div className="p-5" style={{ height: Math.max(120, sortedEmployees.length * 60 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tickColor }} width={60} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: isDark ? "#12171e" : "#ffffff",
                      border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <rect key={index} fill={entry.score >= 80 ? "#10b981" : entry.score >= 60 ? "#e5a158" : "#f59e0b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {radarData.length >= 3 && (
            <div className="card-premium rounded-xl">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Skill Radar</h3>
                  <p className="text-[11px] text-muted-foreground">Performance overview</p>
                </div>
              </div>
              <div className="p-5 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={gridColor} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: tickColor }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: tickColor }} />
                    <Radar name="Score" dataKey="score" stroke="#e5a158" fill="#e5a158" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Cards */}
      {sortedEmployees.length > 0 && (
        <div className={cn("grid gap-3 md:gap-4", sortedEmployees.length >= 2 ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
          {sortedEmployees.map(([empId, group]) => {
            const isExpanded = expandedId === empId;
            return (
              <div key={empId} className="card-premium rounded-xl">
                {/* Card Header */}
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="relative">
                    <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden border border-border/30">
                      {group.photo ? (
                        <img src={group.photo} alt={group.name} className="h-full w-full object-cover" />
                      ) : (
                        group.name.split(" ").map(n => n[0]).join("").slice(0, 2)
                      )}
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card", group.avgScore >= 80 ? "bg-emerald-500" : group.avgScore >= 60 ? "bg-primary" : "bg-red-500")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm truncate">{group.name}</h4>
                      {group.avgScore >= 80 && <Flame className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    {group.designation && <p className="text-xs text-muted-foreground truncate">{group.designation}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{group.entries.length} standups</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className={cn("text-[11px] font-medium", scoreColor(group.avgScore))}>{scoreLabel(group.avgScore)}</span>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center shrink-0">
                    <ScoreRing score={group.avgScore} size={52} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn("text-sm font-bold tabular-nums", scoreColor(group.avgScore))}>{group.avgScore}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="px-5 py-3 border-t border-border/20 grid grid-cols-3 gap-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold">{group.totalCompleted}</span>
                    <span className="text-[10px] text-muted-foreground">done</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold">{group.totalBlockers}</span>
                    <span className="text-[10px] text-muted-foreground">blocked</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold">{group.totalInProgress}</span>
                    <span className="text-[10px] text-muted-foreground">active</span>
                  </div>
                </div>

                {/* Expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : empId)}
                  className="w-full px-5 py-2.5 border-t border-border/20 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  {isExpanded ? "Hide" : `View ${group.entries.length} standups`}
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border/20 divide-y divide-border/15 max-h-[360px] overflow-y-auto scrollbar-modern">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md",
                            entry.performance_score >= 80 ? "bg-emerald-500/10 text-emerald-500" :
                            entry.performance_score >= 60 ? "bg-primary/10 text-primary" :
                            "bg-amber-500/10 text-amber-500"
                          )}>
                            {entry.performance_score}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {entry.completed.length > 0 && (
                          <div className="mb-1.5">
                            <div className="flex items-center gap-1 mb-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Completed</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {entry.completed.map((t, i) => (
                                <span key={i} className="text-[10px] bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/10">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.blockers.length > 0 && (
                          <div className="mb-1.5">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Blockers</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {entry.blockers.map((b, i) => (
                                <span key={i} className="text-[10px] bg-amber-500/8 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/10">{b}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {entry.in_progress.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-blue-500" />
                              <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">In Progress</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {entry.in_progress.map((t, i) => (
                                <span key={i} className="text-[10px] bg-blue-500/8 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/10">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {sortedEmployees.length === 0 && !loading && (
        <div className="card-premium rounded-xl py-16 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/25 mx-auto mb-3" />
          <h4 className="text-sm font-semibold">No standups yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
            Standup notes will appear when employees post in the configured Slack channel
          </p>
        </div>
      )}
    </div>
  );
}
