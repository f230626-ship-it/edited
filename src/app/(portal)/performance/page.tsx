import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/performance/refresh-button";
import { StandupPerformanceSection } from "@/components/standup/standup-performance-section";
import { PerformanceOverview } from "@/components/performance/performance-overview";

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
    { label: "Total Goals", value: totalGoals, sub: "Active objectives" },
    { label: "Completed", value: completedGoals, sub: totalGoals > 0 ? `${Math.round((completedGoals / totalGoals) * 100)}% completion rate` : "No goals yet" },
    { label: "In Progress", value: inProgressGoals, sub: "Currently active" },
    { label: "Avg Completion", value: `${averageCompletion}%`, sub: "Overall progress" },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="pm-hero animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Performance</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track team goals, reviews, and standup analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/40 border border-border/40 text-xs font-medium text-muted-foreground">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <RefreshButton />
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-slide-up stagger-1">
        {kpis.map((kpi, i) => {
          const glows = ["glass-card-glow-amber", "glass-card-glow-green", "glass-card-glow-blue", "glass-card-glow-violet"];
          return (
            <div
              key={kpi.label}
              className={cn("rounded-xl p-4 md:p-5", glows[i])}
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl md:text-3xl font-bold mt-1.5 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts & Data ───────────────────────────────────────── */}
      <PerformanceOverview
        goals={goals ?? []}
        reviews={reviews ?? []}
        salesLogs={salesLogs ?? []}
        averageCompletion={averageCompletion}
      />

      {/* ── Standup Performance ──────────────────────────────────── */}
      <div className="animate-slide-up stagger-3">
        <StandupPerformanceSection />
      </div>
    </div>
  );
}
