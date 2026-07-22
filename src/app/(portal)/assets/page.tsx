import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ASSET_TYPE_LABELS, ASSET_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/date";
import { Laptop, Package, CheckCircle2, History, Shield, HardDrive, Calendar } from "lucide-react";

export default async function AssetsPage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  const { data: assignments } = await supabase
    .from("asset_assignments")
    .select("*, asset:assets(*)")
    .eq("employee_id", employee.id)
    .order("assigned_date", { ascending: false });

  const active = assignments?.filter((a) => !a.return_date) ?? [];
  const history = assignments?.filter((a) => a.return_date) ?? [];

  const kpis = [
    {
      label: "Active Assets",
      value: String(active.length),
      sub: "Currently assigned to you",
      icon: Laptop,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "Historical Assets",
      value: String(history.length),
      sub: "Returned equipment",
      icon: History,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Total Allocated",
      value: String(assignments?.length ?? 0),
      sub: "All time records",
      icon: Package,
      grad: "via-violet-500",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <Laptop className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Assets</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Track and manage company equipment and hardware allocated to you
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold text-muted-foreground shrink-0">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Verified Equipment Tracking
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
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

      {/* Active Assets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            Currently Assigned Equipment
          </h2>
        </div>

        {active.length > 0 ? (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {active.map((assignment) => (
              <div
                key={assignment.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm">
                      <Laptop className="h-5.5 w-5.5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                      {ASSET_STATUS_LABELS[assignment.asset?.status ?? "assigned"] ?? "Assigned"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {assignment.asset?.name ?? "Unnamed Asset"}
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {ASSET_TYPE_LABELS[assignment.asset?.asset_type ?? "other"] ?? "Hardware"}
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 mt-4 border-t border-border/30 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5" />
                      Serial Number
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {assignment.asset?.serial_number ?? "—"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Assigned Date
                    </span>
                    <span className="font-bold text-foreground">
                      {formatDate(assignment.assigned_date)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Condition
                    </span>
                    <span className="capitalize font-bold text-foreground">
                      {assignment.asset?.condition ?? "Good"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-16 text-center shadow-sm">
            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
              <div className="flex items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12 opacity-50" strokeWidth={1.5} />
            </div>
              <div>
                <h3 className="text-lg font-bold">No Assets Assigned</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Company equipment assigned to you will appear here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assignment History */}
      {history.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2 px-1">
            <History className="h-4.5 w-4.5 text-muted-foreground" />
            Previous Allocations
          </h3>

          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            {history.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-2 opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm truncate">{assignment.asset?.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted">
                    Returned
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(assignment.assigned_date)} – {formatDate(assignment.return_date!)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
