import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { AssetForm, AssignAssetForm } from "@/components/admin/asset-forms";
import { ReturnAssetButton } from "@/components/admin/return-asset-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSET_TYPE_LABELS, ASSET_STATUS_LABELS } from "@/lib/constants";
import { asAssets, asAssetAssignments } from "@/lib/supabase/cast";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/database";
import { Laptop, HardDrive, CheckCircle2, UserCheck, Package } from "lucide-react";

export default async function AdminAssetsPage() {
  await requireRole("admin");
  const supabase = createAdminClient();

  const [assetsRes, assignmentsRes, employeesRes] = await Promise.all([
    supabase.from("assets").select("*").order("created_at", { ascending: false }),
    supabase
      .from("asset_assignments")
      .select("*, asset:assets(*), employee:employees(full_name)")
      .is("return_date", null)
      .order("assigned_date", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name, email, profile_photo_url")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const assets = asAssets(assetsRes.data);
  const assignments = asAssetAssignments(assignmentsRes.data);
  const employees = employeesRes.data as Pick<Employee, "id" | "full_name" | "email" | "profile_photo_url">[] | null;

  const totalAssets = assets.length;
  const availableAssets = assets.filter((a) => a.status === "available").length;
  const assignedAssets = assets.filter((a) => a.status === "assigned").length;
  const activeAssignmentsCount = assignments.length;

  const kpis = [
    {
      label: "Total Inventory",
      value: String(totalAssets),
      sub: "Registered hardware",
      icon: Laptop,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Assigned Equipment",
      value: String(assignedAssets),
      sub: "Currently in use",
      icon: UserCheck,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "Available Stock",
      value: String(availableAssets),
      sub: "Ready for allocation",
      icon: CheckCircle2,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Active Assignments",
      value: String(activeAssignmentsCount),
      sub: "Open user records",
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <Laptop className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Asset Management</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Register hardware inventory and manage equipment allocations across staff members
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <AssetForm />
              <AssignAssetForm assets={assets ?? []} employees={employees ?? []} />
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

      {/* Main Tables Grid */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Asset Registry */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Asset Registry ({assets.length})</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Inventory master list</p>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <Table style={{ tableLayout: "fixed" }}>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40 bg-muted/20">
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-4 w-[35%]">Name</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-3 w-[25%]">Type</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-3 w-[22%] text-right">Serial</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-4 w-[18%]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4 font-bold text-xs truncate">{asset.name}</TableCell>
                    <TableCell className="py-3 px-3 text-xs text-muted-foreground font-medium">{ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}</TableCell>
                    <TableCell className="py-3 px-3 text-right tabular-nums font-mono text-xs text-muted-foreground">
                      {asset.serial_number ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                          asset.status === "available"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border/40"
                        )}
                      >
                        {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Active Assignments */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-muted/50 to-transparent">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Active Assignments ({assignments.length})</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Currently assigned to employees</p>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {assignments.length > 0 ? (
              <Table style={{ tableLayout: "fixed" }}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40 bg-muted/20">
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 pl-4 pr-2 w-[30%]">Asset</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-2 w-[30%]">Employee</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 px-2 w-[22%]">Since</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground py-3 pr-4 pl-2 w-[18%]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 pl-4 pr-2 font-bold text-xs truncate">
                        {a.asset?.name}
                      </TableCell>
                      <TableCell className="py-3 px-2 text-xs text-muted-foreground font-semibold truncate">
                        {a.employee?.full_name}
                      </TableCell>
                      <TableCell className="py-3 px-2 text-xs text-muted-foreground truncate">
                        {formatDate(a.assigned_date)}
                      </TableCell>
                      <TableCell className="py-3 pr-4 pl-2">
                        <ReturnAssetButton assignmentId={a.id} assetId={a.asset_id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm font-semibold">No active equipment assignments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
