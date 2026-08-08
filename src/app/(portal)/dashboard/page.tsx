import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, canAccessSales } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CalendarDays, Package, LayoutDashboard, Filter, ClipboardList, TrendingUp, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTeamHierarchy } from "@/lib/hierarchy";
import { getPendingLeavesForLead } from "@/actions/leaves";
import { PendingLeaveApprovals } from "@/components/leave/pending-approvals";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { MyProjects } from "@/components/dashboard/my-projects";
import { DashboardTrendChart } from "@/components/dashboard/dashboard-trend-chart";
import { getDashboardAnalyticsData } from "@/actions/dashboard";
import { fetchAssignedProjectsForEmployee } from "@/actions/projects";

export default async function DashboardPage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  let myProjects: Awaited<ReturnType<typeof fetchAssignedProjectsForEmployee>> = [];
  const isAdmin = employee.role === "admin" || employee.pm_role === "admin";
  if (!isAdmin) {
    try {
      myProjects = await fetchAssignedProjectsForEmployee(employee);
    } catch (e) {
      console.error("[MY_PROJECTS] Error:", e);
    }
  }

  const [
    { data: leaveBalance },
    { data: recentLeaves },
    { data: assignedAssets },
    hierarchy,
    pendingForLead,
    analyticsData,
  ] = await Promise.all([
    supabase.from("leave_balances").select("*").eq("employee_id", employee.id).maybeSingle(),
    supabase
      .from("leaves")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("asset_assignments")
      .select("*, asset:assets(*)")
      .eq("employee_id", employee.id)
      .is("return_date", null),
    getTeamHierarchy(employee.id),
    getPendingLeavesForLead(),
    getDashboardAnalyticsData("daily").catch(() => undefined),
  ]);

  const teamSize = hierarchy.directReports.length + hierarchy.leadTeam.length;
  const showSalesShortcuts = canAccessSales(employee) && employee.role !== "admin";

  const annualRemaining = (leaveBalance?.annual_quota ?? 0) - (leaveBalance?.annual_used ?? 0);
  const sickRemaining = (leaveBalance?.sick_quota ?? 0) - (leaveBalance?.sick_used ?? 0);
  const casualRemaining = (leaveBalance?.casual_quota ?? 0) - (leaveBalance?.casual_used ?? 0);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Welcome back, <span className="font-bold text-foreground">{employee.full_name}</span>
                  {employee.employee_code && ` · #${employee.employee_code}`}
                  {employee.designation && ` · ${employee.designation}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {showSalesShortcuts && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-amber-500/5 shadow-lg shadow-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold tracking-tight">Sales shortcuts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Jump into outreach tools — including ICP Filters and sheet sync.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/sales/my-day", label: "Daily Log", icon: ClipboardList },
              { href: "/sales/my-progress", label: "My Progress", icon: TrendingUp },
              { href: "/sales/icp-filters", label: "ICP Filters", icon: Filter },
              { href: "/sales/leads", label: "My Leads", icon: UserCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-auto justify-start gap-3 border-border/50 bg-background/70 px-4 py-3 hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Clickable Stat Cards — handled by client component */}
      <DashboardClient
        leaveBalance={leaveBalance}
        recentLeaves={recentLeaves}
        assignedAssets={assignedAssets}
        teamSize={teamSize}
        annualRemaining={annualRemaining}
        sickRemaining={sickRemaining}
        casualRemaining={casualRemaining}
      />

      {/* Campaign / Sales Trend Analytics AreaChart */}
      <div className="mt-4 sm:mt-5 md:mt-6">
        <DashboardTrendChart initialData={analyticsData} />
      </div>

      <div className="mt-4 sm:mt-5 md:mt-6">
        <MyProjects projects={myProjects} />
      </div>

      {pendingForLead.length > 0 && (
        <Card className="glass-card-glow-amber border-none overflow-hidden pt-0 mt-4 sm:mt-5 md:mt-6">
          <CardHeader className="border-b border-border/30 py-(--card-spacing)">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-foreground font-bold tracking-tight">
              <div className="relative flex items-center justify-center p-1">
                <div className="absolute inset-0 rounded-full blur-md bg-amber-500 opacity-30" />
                <Bell className="h-4 w-4 text-amber-400 relative z-10 animate-bounce" />
              </div>
              Leave Approvals Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <PendingLeaveApprovals leaves={pendingForLead} />
          </CardContent>
        </Card>
      )}

      <div className="mt-4 sm:mt-5 md:mt-6 grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="glass-card-glow-amber border-none overflow-hidden pt-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/30 py-(--card-spacing)">
            <CardTitle className="text-sm sm:text-base text-foreground font-bold tracking-tight">Recent Leave Requests</CardTitle>
            <Link href="/leave" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-border/40 hover:bg-amber-500/10 hover:border-amber-500/30")}>
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-3">
            {recentLeaves && recentLeaves.length > 0 ? (
              <div className="space-y-2 sm:space-y-2.5">
                {recentLeaves.slice(0, 5).map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 backdrop-blur-md p-3 transition-colors hover:bg-card/70">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold truncate">{LEAVE_TYPE_LABELS[leave.leave_type]}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                        {formatDate(leave.start_date)} – {formatDate(leave.end_date)} ({leave.days_count}d)
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[leave.status]} variant="secondary">
                      {LEAVE_STATUS_LABELS[leave.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">No leave requests yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card-glow-green border-none overflow-hidden pt-0">
          <CardHeader className="border-b border-border/30 py-(--card-spacing)">
            <CardTitle className="text-sm sm:text-base text-foreground font-bold tracking-tight">Assigned Assets</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {assignedAssets && assignedAssets.length > 0 ? (
              <div className="space-y-2">
                {assignedAssets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 backdrop-blur-md p-3 text-xs sm:text-sm hover:bg-card/70 transition-colors">
                    <span className="font-semibold truncate min-w-0 flex-1">{a.asset?.name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0 font-mono text-xs">{a.asset?.serial_number ?? "—"}</span>
                  </div>
                ))}
                <Link href="/assets" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full border-border/40 hover:bg-emerald-500/10 hover:border-emerald-500/30")}>
                  View all assets
                </Link>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">No assets assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 sm:mt-5 md:mt-6 glass-card-glow-primary border-none overflow-hidden pt-0">
        <CardHeader className="border-b border-border/30 py-(--card-spacing)">
          <CardTitle className="text-sm sm:text-base text-foreground font-bold tracking-tight">Leave Balance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {[
            { label: "Annual", remaining: annualRemaining, total: leaveBalance?.annual_quota ?? 0, color: "bg-blue-500" },
            { label: "Sick", remaining: sickRemaining, total: leaveBalance?.sick_quota ?? 0, color: "bg-red-500" },
            { label: "Casual", remaining: casualRemaining, total: leaveBalance?.casual_quota ?? 0, color: "bg-emerald-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex justify-between text-xs sm:text-sm font-semibold">
                <span>{item.label}</span>
                <span className="text-muted-foreground font-medium">
                  <strong className="text-foreground">{item.remaining}</strong> / {item.total} remaining
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${item.color} shadow-sm transition-all duration-500`}
                  style={{ width: `${item.total ? (item.remaining / item.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
