"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Target, Award, Activity, Star } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface PerformanceChartsProps {
  goals: any[];
  reviews: any[];
  salesLogs?: any[];
}

// ── Premium custom tooltip ────────────────────────────────────────
function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl px-4 py-3 min-w-[150px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 pb-2 border-b border-border/40">
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-xs text-muted-foreground flex-1">{p.name}</span>
          <span className="text-xs font-black tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Premium chart card wrapper ────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  icon,
  accent,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col", className)}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent shrink-0">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm shrink-0"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 p-5 sm:p-6">{children}</div>
    </div>
  );
}

export function PerformanceCharts({ goals, reviews, salesLogs = [] }: PerformanceChartsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const axisColor = isDark ? "#374151" : "#e5e7eb";
  const tickColor = isDark ? "#6b7280" : "#9ca3af";

  // ── Data prep ──
  const ratingHistoryData = reviews
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((r) => ({ period: r.review_period, rating: r.rating }));

  const salesTrendData = salesLogs
    .slice()
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
    .map((log) => ({
      date: log.log_date,
      connections: log.connections_sent || 0,
      meetings: log.meetings_booked || 0,
      leads: log.leads_added || 0,
    }));

  const goalCompletionData = [
    { name: "Done", value: goals.filter((g) => g.completion_status >= 100).length, color: "#10b981" },
    { name: "Active", value: goals.filter((g) => g.completion_status > 0 && g.completion_status < 100).length, color: "#f59e0b" },
    { name: "Pending", value: goals.filter((g) => g.completion_status === 0).length, color: "#6b7280" },
  ].filter((item) => item.value > 0);

  const latestReview = reviews?.[0];
  const latestRating = latestReview?.rating || 0;

  // ── Radial Rating SVG ──────────────────────────────────────────
  const RadialRating = ({ rating }: { rating: number }) => {
    const pct = (rating / 5) * 100;
    const R = 40;
    const circ = 2 * Math.PI * R;
    const offset = circ - (pct / 100) * circ;

    return (
      <div className="flex flex-col items-center justify-center gap-6 py-6">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* SVG gradient defined inline */}
            <defs>
              <linearGradient id="ratingGradPerf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e5a158" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx="50" cy="50" r={R}
              fill="none"
              stroke={isDark ? "#1f2937" : "#f3f4f6"}
              strokeWidth="9"
            />
            {/* Progress */}
            {rating > 0 && (
              <circle
                cx="50" cy="50" r={R}
                fill="none"
                stroke="url(#ratingGradPerf)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            )}
          </svg>
          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black leading-none tabular-nums">
              {rating || "—"}
            </span>
            {rating > 0 && (
              <span className="text-sm font-bold text-muted-foreground mt-1">/5</span>
            )}
          </div>
        </div>

        {/* Stars */}
        {rating > 0 && (
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-5 w-5",
                  i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                )}
              />
            ))}
          </div>
        )}

        {/* Review info */}
        <div className="text-center">
          {latestReview ? (
            <>
              <p className="text-sm font-black">{latestReview.review_period}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Latest Review Period</p>
            </>
          ) : (
            <p className="text-sm font-bold text-muted-foreground">No reviews yet</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ── Rating Trend (Area Chart) ── */}
      {ratingHistoryData.length > 0 && (
        <ChartCard
          title="Performance Rating Trend"
          subtitle="Ratings across review periods"
          icon={<Award className="h-4 w-4" />}
          accent="#f59e0b"
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ratingHistoryData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaRatingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="90%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={axisColor} vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PremiumTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rating"
                  name="Rating"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fill="url(#areaRatingFill)"
                  dot={{
                    r: ratingHistoryData.length === 1 ? 8 : 5,
                    fill: "#f59e0b",
                    strokeWidth: 3,
                    stroke: isDark ? "#0f172a" : "#ffffff",
                  }}
                  activeDot={{ r: 8 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* ── Radial Current Rating ── */}
      <ChartCard
        title="Current Rating"
        subtitle="Latest performance score"
        icon={<Star className="h-4 w-4" />}
        accent="#e5a158"
      >
        <RadialRating rating={latestRating} />
      </ChartCard>

      {/* ── Sales Activity (Line Chart) ── */}
      {salesTrendData.length > 0 && (
        <ChartCard
          title="Sales Activity Trend"
          subtitle="Last 30 days metrics"
          icon={<Activity className="h-4 w-4" />}
          accent="#3b82f6"
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={axisColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PremiumTooltip />} />
                <Line type="monotone" dataKey="connections" name="Connections" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="meetings" name="Meetings" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Custom legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border/30">
            {[
              { name: "Connections", color: "#3b82f6" },
              { name: "Meetings", color: "#10b981" },
              { name: "Leads", color: "#8b5cf6" },
            ].map(({ name, color }) => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="h-[3px] w-6 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] font-semibold text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* ── Goal Completion (Bar Chart) ── */}
      {goalCompletionData.length > 0 && (
        <ChartCard
          title="Goal Completion"
          subtitle="Breakdown of current goals"
          icon={<Target className="h-4 w-4" />}
          accent="#10b981"
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalCompletionData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={axisColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: tickColor, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PremiumTooltip />} />
                <Bar dataKey="value" name="Goals" radius={[8, 8, 0, 0]} barSize={52}>
                  {goalCompletionData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.88} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Custom legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-border/30">
            {goalCompletionData.map(({ name, color }) => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] font-semibold text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* ── Goals Progress Bars (full-width) ── */}
      {goals.length > 0 && (
        <ChartCard
          title="Goals Progress"
          subtitle="Latest objectives at a glance"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#8b5cf6"
          className={cn(
            (salesTrendData.length > 0 || goalCompletionData.length > 0) ? "lg:col-span-2" : ""
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.slice(0, 6).map((goal) => {
              const pct = Math.min(100, goal.completion_status);
              const color = pct >= 100 ? "#10b981" : pct > 0 ? "#f59e0b" : "#6b7280";
              const labelColor = pct >= 100 ? "text-emerald-500" : pct > 0 ? "text-amber-500" : "text-muted-foreground";
              return (
                <div
                  key={goal.id}
                  className="rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors p-4 space-y-3"
                >
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-sm font-bold truncate flex-1">{goal.title}</span>
                    <span className={cn("text-sm font-black shrink-0 tabular-nums", labelColor)}>
                      {pct}%
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-border/60 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
