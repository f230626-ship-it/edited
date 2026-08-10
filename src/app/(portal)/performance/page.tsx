import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import {
  Star,
  Target,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";
import { PerformanceCharts } from "@/components/performance/performance-charts";
import { RefreshButton } from "@/components/performance/refresh-button";
import { StandupPerformanceSection } from "@/components/standup/standup-performance-section";

export default async function PerformancePage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  const [{ data: goals }, { data: reviews }, { data: salesLogs }] = await Promise.all([
    supabase.from("performance_goals").select("*").eq("employee_id", employee.id).order("created_at", { ascending: false }),
    supabase.from("performance_reviews").select("*").eq("employee_id", employee.id).order("created_at", { ascending: false }),
    supabase.from("sales_daily_log").select("*").eq("employee_id", employee.id).order("log_date", { ascending: true }).limit(30),
  ]);

  const totalGoals = goals?.length ?? 0;
  const completedGoals = goals?.filter((g) => g.completion_status === 100).length ?? 0;
  const inProgressGoals = goals?.filter((g) => g.completion_status > 0 && g.completion_status < 100).length ?? 0;
  const averageCompletion =
    totalGoals > 0
      ? Math.round((goals?.reduce((sum, g) => sum + g.completion_status, 0) ?? 0) / totalGoals)
      : 0;
  const latestReview = reviews?.[0];

  const kpis = [
    {
      label: "Total Goals",
      value: String(totalGoals),
      sub: "Active objectives",
      icon: Target,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Completed",
      value: String(completedGoals),
      sub: totalGoals > 0 ? `${Math.round((completedGoals / totalGoals) * 100)}% rate` : "No goals yet",
      icon: CheckCircle2,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "In Progress",
      value: String(inProgressGoals),
      sub: "Currently active",
      icon: Zap,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Latest Rating",
      value: latestReview?.rating ? `${latestReview.rating}/5` : "—",
      sub: latestReview ? latestReview.review_period : "No reviews yet",
      icon: Star,
      grad: "via-violet-500",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-7">

      {/* ── Premium Hero Header ───────────────────────────────── */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        {/* Ambient gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            {/* Left: Icon + Title */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Performance</h1>
                  <p className="text-sm text-muted-foreground font-medium mt-0.5">
                    Track your goals, reviews, and progress over time
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Date + Refresh */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <RefreshButton />
            </div>
          </div>

          {/* Overall progress */}
          {totalGoals > 0 && (
            <div className="mt-7 pt-5 border-t border-border/40">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Overall Goal Progress
                </span>
                <span className="text-sm font-black text-primary">{averageCompletion}%</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-primary/15 w-full" />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all duration-700"
                  style={{
                    width: `${averageCompletion}%`,
                    boxShadow: averageCompletion > 0 ? "0 0 12px rgba(229,161,88,0.4)" : "none",
                  }}
                />
              </div>
              {/* Completion stats row */}
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {completedGoals} Completed
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {inProgressGoals} In Progress
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {totalGoals - completedGoals - inProgressGoals} Not Started
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="group relative flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-border/80"
            >
              {/* Top gradient line */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent to-transparent opacity-80",
                  kpi.grad
                )}
              />
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center shrink-0">
                    <Icon className={cn("h-5 w-5 drop-shadow-sm", kpi.iconText)} strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {kpi.label}
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-black tabular-nums tracking-tight leading-none">
                    {kpi.value}
                  </span>
                  <p className="text-[11px] text-muted-foreground/70 font-medium mt-1.5">{kpi.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Performance Charts ────────────────────────────────── */}
      <StandupPerformanceSection />

      <PerformanceCharts goals={goals ?? []} reviews={reviews ?? []} salesLogs={salesLogs ?? []} />

      {/* ── Goals & Reviews ───────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Goals Panel */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shadow-sm">
              <Target className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Goals & KPIs</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Active objectives</p>
            </div>
          </div>

          <div className="flex-1 p-5 space-y-3">
            {goals && goals.length > 0 ? (
              goals.map((goal) => {
                const pct = goal.completion_status;
                const isComplete = pct >= 100;
                const isActive = pct > 0 && pct < 100;
                const badgeCls = isComplete
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                  : isActive
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20"
                  : "bg-muted text-muted-foreground ring-1 ring-border/40";
                const barColor = isComplete ? "#10b981" : isActive ? "#f59e0b" : "#6b7280";

                return (
                  <div
                    key={goal.id}
                    className="rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm truncate">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{goal.description}</p>
                        )}
                      </div>
                      <span className={cn("shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider", badgeCls)}>
                        {pct}%
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-border/50 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
                      />
                    </div>
                    {goal.target_date && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Target: {formatDate(goal.target_date)}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Target className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <h4 className="text-sm font-black">No goals set yet</h4>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-[200px]">
                  Admins can assign goals from Performance Management
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Panel */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shadow-sm">
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Performance Reviews</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Review history & feedback</p>
            </div>
          </div>

          <div className="flex-1 p-5 space-y-3">
            {reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors p-4 space-y-3"
                >
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h4 className="font-black text-sm">{review.review_period}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                    {review.rating && (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3.5 w-3.5",
                                i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-amber-500 tabular-nums">{review.rating}/5</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {review.strengths && (
                      <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-3.5 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                        <p className="text-xs text-muted-foreground">{review.strengths}</p>
                      </div>
                    )}
                    {review.improvement_areas && (
                      <div className="rounded-lg bg-amber-500/8 border border-amber-500/15 px-3.5 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Improvement Areas</p>
                        <p className="text-xs text-muted-foreground">{review.improvement_areas}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Star className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <h4 className="text-sm font-black">No reviews yet</h4>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-[200px]">
                  Quarterly reviews will appear here once completed
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
