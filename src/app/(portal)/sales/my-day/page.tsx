import { createAdminClient } from "@/lib/supabase/admin";
import { requireSalesAccess, isSalesOwner } from "@/lib/auth";
import { ProfilePickerCards } from "@/components/sales/profile-picker-cards";
import { AdminSalesQuickLinks } from "@/components/sales/admin-sales-quick-links";
import { todayISO } from "@/lib/sales/stats";
import { cn } from "@/lib/utils";
import { CalendarDays, TrendingUp, CheckCircle2, UserCheck, Layers } from "lucide-react";

export default async function MyDayPage() {
  const employee = await requireSalesAccess();
  const owner = isSalesOwner(employee.role);
  const supabase = createAdminClient();
  const today = todayISO();

  const [{ data: profiles }, { data: logs }] = await Promise.all([
    supabase
      .from("sales_profiles")
      .select("id, name, platform")
      .eq("employee_id", employee.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("sales_daily_logs")
      .select("profile_id, connections_sent")
      .eq("employee_id", employee.id)
      .eq("log_date", today),
  ]);

  const loggedCount = logs?.length ?? 0;
  const total = profiles?.length ?? 0;
  const completionPct = total > 0 ? Math.round((loggedCount / total) * 100) : 0;

  const kpis = [
    {
      label: "Today's Progress",
      value: `${loggedCount}/${total}`,
      sub: `${completionPct}% completed`,
      icon: CheckCircle2,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "Active Profiles",
      value: String(total),
      sub: "Outreach channels",
      icon: UserCheck,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Pending Profiles",
      value: String(Math.max(0, total - loggedCount)),
      sub: "Awaiting logs",
      icon: Layers,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-7">
      {owner && <AdminSalesQuickLinks />}

      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <TrendingUp className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Sales Outreach</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Select a profile below to record your daily connections and outreach logs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

      {/* Profile Picker Section */}
      <ProfilePickerCards
        profiles={profiles ?? []}
        todayLogs={logs ?? []}
        isOwner={owner}
      />
    </div>
  );
}
