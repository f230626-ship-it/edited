import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, Users, UserCheck, Shield, Network } from "lucide-react";
import type { Employee } from "@/types/database";
import { TeamHierarchyDirectory } from "@/components/team/team-hierarchy-directory";

interface DepartmentWithEmployees {
  id: string;
  name: string;
  employees: Pick<
    Employee,
    | "id"
    | "full_name"
    | "email"
    | "phone"
    | "designation"
    | "role"
    | "profile_photo_url"
    | "employee_code"
  >[];
}

export default async function TeamPage() {
  const currentEmployee = await requireAuth();
  const supabase = createAdminClient();

  // Get hierarchy-based team
  const { directReports, leadTeam } = await (async () => {
    const { data: allEmployees } = await supabase
      .from("employees")
      .select("id, full_name, designation, employee_code, manager_id, lead_id, status, profile_photo_url")
      .eq("status", "active")
      .order("full_name");

    if (!allEmployees) return { directReports: [], leadTeam: [] };

    const directReports = allEmployees.filter((e) => e.manager_id === currentEmployee.id);
    const leadTeam = allEmployees.filter(
      (e) => e.lead_id === currentEmployee.id && e.manager_id !== currentEmployee.id
    );

    return { directReports, leadTeam };
  })();

  const teamMemberIds = [
    ...directReports.map((e) => e.id),
    ...leadTeam.map((e) => e.id),
  ];

  const hasHierarchy = teamMemberIds.length > 0;

  if (!hasHierarchy) {
    return (
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
          <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <Users className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Team</h1>
                <p className="text-muted-foreground text-sm font-medium mt-1">
                  View team members who report directly to you
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-16 text-center shadow-sm">
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            <div className="flex items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12 opacity-50" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold">No Direct Reports Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You do not currently have any direct reports or team members assigned to you.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get departments for hierarchy view
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, email, phone, designation, role, profile_photo_url, employee_code, department_id")
    .in("id", teamMemberIds)
    .eq("status", "active")
    .order("full_name");

  const departmentsWithEmployees: DepartmentWithEmployees[] = [];
  departments?.forEach((dept) => {
    const deptEmployees = employees?.filter((emp) => emp.department_id === dept.id) ?? [];
    if (deptEmployees.length > 0) {
      departmentsWithEmployees.push({ id: dept.id, name: dept.name, employees: deptEmployees });
    }
  });
  const noDeptEmployees = employees?.filter((emp) => !emp.department_id) ?? [];
  if (noDeptEmployees.length > 0) {
    departmentsWithEmployees.push({ id: "no-dept", name: "Unassigned", employees: noDeptEmployees });
  }

  const totalHierarchy = employees?.length ?? 0;

  const kpis = [
    {
      label: "Direct Reports",
      value: String(directReports.length),
      sub: "Reporting directly",
      icon: UserCheck,
      grad: "via-emerald-500",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
    },
    {
      label: "Lead Team",
      value: String(leadTeam.length),
      sub: "Lead assignments",
      icon: Shield,
      grad: "via-blue-500",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-500",
    },
    {
      label: "Departments",
      value: String(departmentsWithEmployees.length),
      sub: "Teams covered",
      icon: Building2,
      grad: "via-amber-500",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-500",
    },
    {
      label: "Total Team",
      value: String(totalHierarchy),
      sub: "Active members",
      icon: Network,
      grad: "via-violet-500",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-7">
      {/* Hero Header */}
      <div className="relative rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center shrink-0">
                <Users className="h-10 w-10 text-primary drop-shadow-sm" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Team</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  {totalHierarchy} active team member{totalHierarchy !== 1 ? "s" : ""} under your reporting structure
                </p>
              </div>
            </div>

            <Link
              href="/team/hierarchy"
              className={cn(
                buttonVariants({ variant: "default" }),
                "rounded-xl shadow-md font-bold shrink-0 flex items-center gap-2"
              )}
            >
              <Network className="h-4 w-4" />
              View Interactive Org Chart
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
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

      {/* Hierarchy Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-primary" />
            Department Breakdown
          </h2>
        </div>
        <TeamHierarchyDirectory departments={departmentsWithEmployees} />
      </div>
    </div>
  );
}
