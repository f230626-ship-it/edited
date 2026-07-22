import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { GoalForm, ReviewForm } from "@/components/admin/performance-forms";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { Activity, Target, Award, Star, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { DeleteGoalButton } from "@/components/performance/delete-goal-button";
import { AdminRefreshButton } from "@/components/performance/admin-refresh-button";

export default async function AdminPerformancePage() {
  await requireRole("admin");
  const supabase = createAdminClient();

  const [{ data: goals }, { data: reviews }, { data: employeesList }] = await Promise.all([
    supabase
      .from("performance_goals")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("performance_reviews")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const employees = employeesList ?? [];
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.full_name]));

  const totalGoals = goals?.length ?? 0;
  const completedGoals = goals?.filter((g) => g.completion_status === 100).length ?? 0;
  const totalReviews = reviews?.length ?? 0;
  const avgRating =
    totalReviews > 0
      ? (
          reviews?.reduce((sum, r) => sum + (r.rating ?? 0), 0) / totalReviews
        ).toFixed(1)
      : "—";

  const kpis = [
    {
      label: "Goals Assigned",
      value: String(totalGoals),
      sub: "Active objectives",
      icon: Target,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Completed Goals",
      value: String(completedGoals),
      sub: `${totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}% completion`,
      icon: CheckCircle2,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "Reviews Logged",
      value: String(totalReviews),
      sub: "Evaluations recorded",
      icon: Award,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Avg Rating",
      value: `${avgRating}${avgRating !== "—" ? "/5" : ""}`,
      sub: "Overall org score",
      icon: Star,
      grad: "via-violet-500",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <TrendingUp className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Performance Management</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5 max-w-xl">
                  Assign auto-tracked goals and record quarterly performance evaluations across your organization
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <AdminRefreshButton />
              <GoalForm employees={employees} />
              <ReviewForm employees={employees} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="group relative flex flex-col justify-center w-full rounded-2xl border border-border/50 bg-card/40 px-5 py-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-border/80"
            >
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

      {/* Main Tabs */}
      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="p-1 rounded-xl bg-card border border-border/50 inline-flex">
          <TabsTrigger value="goals" className="rounded-lg font-bold text-xs px-4 py-2">
            Goals ({totalGoals})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg font-bold text-xs px-4 py-2">
            Reviews ({totalReviews})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Active Employee Goals</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                  Auto-updated from sales, attendance, and project data
                </p>
              </div>
            </div>

            <div className="p-6">
              {goals && goals.length > 0 ? (
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
                  {goals.map((goal) => {
                    const pct = goal.completion_status;
                    const isComplete = pct >= 100;
                    const isActive = pct > 0 && pct < 100;
                    const barColor = isComplete ? "#10b981" : isActive ? "#f59e0b" : "#6b7280";

                    return (
                      <div
                        key={goal.id}
                        className="group relative flex flex-col justify-between rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors p-5 space-y-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-base truncate">{goal.title}</h4>
                              <p className="text-xs font-semibold text-primary mt-0.5">
                                {employeeMap[goal.employee_id] ?? "Employee"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                                Auto-tracked
                              </span>
                              <DeleteGoalButton goalId={goal.id} />
                            </div>
                          </div>

                          {goal.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/30">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                              {isComplete ? "Completed" : isActive ? "In Progress" : "Not Started"}
                            </span>
                            <span className="tabular-nums" style={{ color: barColor }}>
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
                            <p className="text-[10px] font-semibold text-muted-foreground text-right">
                              Target: {formatDate(goal.target_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm font-semibold">No goals set yet</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Performance Reviews History</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                  Logged evaluations and employee feedback
                </p>
              </div>
            </div>

            <div className="p-6">
              {reviews && reviews.length > 0 ? (
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-base">{employeeMap[review.employee_id] ?? "Employee"}</h4>
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5">{review.review_period}</p>
                        </div>
                        {review.rating && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-xs">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {review.rating}/5
                          </div>
                        )}
                      </div>

                      {review.strengths && (
                        <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                            Strengths
                          </p>
                          <p className="text-xs text-muted-foreground">{review.strengths}</p>
                        </div>
                      )}

                      <p className="text-[10px] font-semibold text-muted-foreground pt-1">
                        Submitted on {formatDate(review.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm font-semibold">No reviews submitted yet</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
