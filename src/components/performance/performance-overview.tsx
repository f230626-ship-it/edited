"use client";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Target, Award, Star, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Props {
  goals: any[];
  reviews: any[];
  salesLogs: any[];
  averageCompletion: number;
}

function RatingRing({ rating, size = 140 }: { rating: number; size?: number }) {
  const R = (size - 12) / 2;
  const circ = 2 * Math.PI * R;
  const pct = rating / 5;
  const offset = circ - pct * circ;

  const getColor = (r: number) => {
    if (r >= 4) return { stroke: "#e5a158", bg: "#e5a158", label: "Excellent" };
    if (r >= 3) return { stroke: "#10b981", bg: "#10b981", label: "Good" };
    if (r >= 2) return { stroke: "#f59e0b", bg: "#f59e0b", label: "Average" };
    return { stroke: "#94a3b8", bg: "#94a3b8", label: "Needs Work" };
  };
  const c = getColor(rating);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          {rating > 0 && (
            <circle
              cx={size / 2} cy={size / 2} r={R}
              fill="none"
              stroke={c.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">{rating > 0 ? rating : "—"}</span>
          {rating > 0 && <span className="text-sm text-muted-foreground font-medium">/5</span>}
        </div>
      </div>
      {rating > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={cn("h-4 w-4", i < rating ? "fill-primary text-primary" : "text-muted-foreground/20")} />
          ))}
        </div>
      )}
      <p className="text-sm font-semibold text-muted-foreground mt-2">{c.label}</p>
    </div>
  );
}

function GoalDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[140px] h-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              dataKey="value"
              strokeWidth={0}
              animationBegin={200}
              animationDuration={800}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{total}</span>
          <span className="text-[10px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="space-y-2.5 flex-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-muted-foreground flex-1">{d.name}</span>
            <span className="text-sm font-semibold tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PerformanceOverview({ goals, reviews, salesLogs, averageCompletion }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "#1e293b" : "#f1f5f9";
  const tickColor = isDark ? "#64748b" : "#94a3af";
  const brandColor = "#e5a158";

  // ── Chart data ──
  const ratingHistory = reviews
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((r) => ({ period: r.review_period, rating: r.rating }));

  const salesTrend = salesLogs
    .slice()
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
    .map((log) => ({
      date: new Date(log.log_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      connections: log.connections_sent || 0,
      meetings: log.meetings_booked || 0,
      leads: log.leads_added || 0,
    }));

  const goalBreakdown = [
    { name: "Completed", value: goals.filter((g) => g.completion_status >= 100).length, color: "#10b981" },
    { name: "In Progress", value: goals.filter((g) => g.completion_status > 0 && g.completion_status < 100).length, color: brandColor },
    { name: "Not Started", value: goals.filter((g) => g.completion_status === 0).length, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const latestReview = reviews?.[0];
  const latestRating = latestReview?.rating || 0;

  // ── Trend indicator ──
  let trend: "up" | "down" | "neutral" = "neutral";
  if (reviews.length >= 2) {
    const prev = reviews[1]?.rating || 0;
    const curr = reviews[0]?.rating || 0;
    if (curr > prev) trend = "up";
    else if (curr < prev) trend = "down";
  }

  const hasWideSales = salesTrend.length > 0;
  const hasWideRating = ratingHistory.length > 0;
  const hasWideCharts = hasWideSales || hasWideRating;

  return (
    <div className={cn(
      "gap-4 md:gap-5 animate-slide-up stagger-2",
      hasWideCharts ? "grid lg:grid-cols-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    )}>

      {/* ── Sales Activity Trend (wide) ── */}
      {hasWideSales && (
        <div className="lg:col-span-2 card-premium rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Sales Activity</h3>
                <p className="text-[11px] text-muted-foreground">Last 30 days</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-muted-foreground">Connections</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-muted-foreground">Meetings</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-violet-500" /><span className="text-muted-foreground">Leads</span></div>
            </div>
          </div>
          <div className="p-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradConn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMeet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#12171e" : "#ffffff",
                    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  }}
                />
                <Area type="monotone" dataKey="connections" name="Connections" stroke="#3b82f6" strokeWidth={2} fill="url(#gradConn)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="meetings" name="Meetings" stroke="#10b981" strokeWidth={2} fill="url(#gradMeet)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradLead)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Current Rating Ring ── */}
      <div className="card-premium rounded-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <Award className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Current Rating</h3>
            <p className="text-[11px] text-muted-foreground">Latest review</p>
          </div>
        </div>
        <div className="p-5 flex flex-col items-center justify-center">
          <RatingRing rating={latestRating} size={latestRating > 0 ? 120 : 80} />
          {latestReview ? (
            <div className="text-center mt-3">
              <p className="text-sm font-semibold">{latestReview.review_period}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
                {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                {trend === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={cn("text-xs font-medium", trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground")}>
                  {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">No reviews yet</p>
          )}
        </div>
      </div>

      {/* ── Goal Completion Donut ── */}
      <div className="card-premium rounded-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Goal Status</h3>
            <p className="text-[11px] text-muted-foreground">Completion breakdown</p>
          </div>
        </div>
        <div className="p-4">
          {goalBreakdown.length > 0 ? (
            <GoalDonut data={goalBreakdown} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <Target className="h-8 w-8 text-muted-foreground/25 mb-2" />
              <p className="text-xs text-muted-foreground">No goals yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Average Completion Progress ── */}
      <div className="card-premium rounded-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Avg Completion</h3>
            <p className="text-[11px] text-muted-foreground">Across all goals</p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold tabular-nums">{averageCompletion}%</span>
            <span className="text-xs text-muted-foreground mb-1">target 85%</span>
          </div>
          <div className="pm-progress-track">
            <div className="pm-progress-fill" style={{ width: `${Math.min(100, averageCompletion)}%` }} />
          </div>
        </div>
      </div>

      {/* ── Rating History (wide) ── */}
      {hasWideRating && (
        <div className={cn("card-premium rounded-xl", !useTightGrid && "lg:col-span-2")}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Rating History</h3>
              <p className="text-[11px] text-muted-foreground">Performance across review periods</p>
            </div>
          </div>
          <div className="p-5 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ratingHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRating" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brandColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={brandColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#12171e" : "#ffffff",
                    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rating"
                  name="Rating"
                  stroke={brandColor}
                  strokeWidth={2.5}
                  fill="url(#gradRating)"
                  dot={{ r: 4, fill: brandColor, strokeWidth: 2, stroke: isDark ? "#0a0e14" : "#ffffff" }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Goals List ── */}
      {goals.length > 0 && (
        <div className="card-premium rounded-xl">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Goals</h3>
              <p className="text-[11px] text-muted-foreground">Latest objectives</p>
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto scrollbar-modern">
            {goals.slice(0, 5).map((goal) => {
              const pct = Math.min(100, goal.completion_status);
              const done = pct >= 100;
              const active = pct > 0 && pct < 100;
              return (
                <div key={goal.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium truncate pr-2">{goal.title}</span>
                    <span className={cn(
                      "text-[11px] font-bold tabular-nums shrink-0",
                      done ? "text-emerald-500" : active ? "text-primary" : "text-muted-foreground"
                    )}>{pct}%</span>
                  </div>
                  <div className="pm-progress-track-sm">
                    <div
                      className="pm-progress-fill-sm"
                      style={{
                        width: `${pct}%`,
                        background: done ? "#10b981" : active ? `linear-gradient(90deg, ${brandColor}, #f0c078)` : "#94a3b8",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
