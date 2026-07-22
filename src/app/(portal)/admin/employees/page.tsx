import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Users, UserCheck, Building2, Shield } from "lucide-react";
import { EmployeesClient } from "@/components/admin/employees-client";

export default async function AdminEmployeesPage() {
  await requireAdminAccess();
  const supabase = createAdminClient();

  const [{ data: employees }, { data: departments }, { data: managers }] = await Promise.all([
    supabase
      .from("employees")
      .select("*, department:departments(name)")
      .order("full_name"),
    supabase.from("departments").select("*").order("name"),
    supabase
      .from("employees")
      .select("id, full_name, employee_code")
      .order("full_name"),
  ]);

  const employeeIds = (employees ?? []).map((e) => e.id);
  const managerIds = [...new Set((employees ?? []).map((e) => e.manager_id).filter(Boolean))] as string[];
  const leadIds = [...new Set((employees ?? []).map((e) => e.lead_id).filter(Boolean))] as string[];

  const uniqueRelatedIds = [...new Set([...managerIds, ...leadIds])].filter((id) => !employeeIds.includes(id));

  let relatedEmployees: Record<string, { id: string; full_name: string; employee_code: string | null }> = {};
  if (uniqueRelatedIds.length > 0) {
    const { data: related } = await supabase
      .from("employees")
      .select("id, full_name, employee_code")
      .in("id", uniqueRelatedIds);
    if (related) {
      relatedEmployees = Object.fromEntries(related.map((e) => [e.id, e]));
    }
  }

  const enrichedEmployees = (employees ?? []).map((emp) => ({
    ...emp,
    manager: emp.manager_id
      ? relatedEmployees[emp.manager_id] ?? employees?.find((e) => e.id === emp.manager_id) ?? null
      : null,
    lead: emp.lead_id
      ? relatedEmployees[emp.lead_id] ?? employees?.find((e) => e.id === emp.lead_id) ?? null
      : null,
  }));

  const totalStaff = enrichedEmployees.length;
  const activeStaff = enrichedEmployees.filter((e) => e.status === "active").length;
  const totalDepts = departments?.length ?? 0;
  const totalAdmins = enrichedEmployees.filter((e) => e.role === "admin").length;

  const kpis = [
    {
      label: "Total Staff",
      value: String(totalStaff),
      sub: "Registered workforce",
      icon: Users,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Active Status",
      value: String(activeStaff),
      sub: `${totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0}% active rate`,
      icon: UserCheck,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "Departments",
      value: String(totalDepts),
      sub: "Active org units",
      icon: Building2,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "System Admins",
      value: String(totalAdmins),
      sub: "Privileged accounts",
      icon: Shield,
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
                <Users className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Employee Directory</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Manage organization workforce, employee cards, designations, and profiles
                </p>
              </div>
            </div>

            <Link href="/admin/employees/new">
              <Button className="rounded-xl shadow-md font-bold shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* Directory Client */}
      <EmployeesClient
        employees={enrichedEmployees ?? []}
        departments={departments ?? []}
        managers={managers ?? []}
      />
    </div>
  );
}
