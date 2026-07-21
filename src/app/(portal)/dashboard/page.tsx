import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { AnalyticsHeader } from "@/components/dashboard/analytics-header";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { TopPerformers } from "@/components/dashboard/top-performers";
import { getTeamHierarchy } from "@/lib/hierarchy";
import { getPendingLeavesForLead } from "@/actions/leaves";

export default async function DashboardPage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();
  const adminSupabase = createAdminClient();

  let myProjects: any[] = [];
  const isAdmin = employee.role === "admin" || employee.pm_role === "admin";
  
  if (!isAdmin) {
    try {
      const { data: resourceRows } = await adminSupabase
        .from("project_resources")
        .select("project_id")
        .eq("employee_id", employee.id);

      if (resourceRows && resourceRows.length > 0) {
        const projectIds = resourceRows.map((r) => r.project_id);
        const { data } = await adminSupabase
          .from("projects")
          .select("id, name, client_name, status, progress_percentage, value, currency, start_date, expected_delivery_date, manager:employees!manager_id(full_name)")
          .in("id", projectIds)
          .order("created_at", { ascending: false });
        myProjects = data ?? [];
      }
    } catch (e) {
      console.error("[MY_PROJECTS] Error:", e);
    }
  }

  const [
    { data: leaveBalance },
    { data: recentLeaves },
    { data: assignedAssets },
    { data: allEmployees },
    hierarchy,
    pendingForLead,
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
    supabase
      .from("employees")
      .select("id, full_name, role, department, created_at")
      .order("created_at", { ascending: false }),
    getTeamHierarchy(employee.id),
    getPendingLeavesForLead(),
  ]);

  const teamSize = hierarchy.directReports.length + hierarchy.leadTeam.length;

  // Calculate metrics
  const totalEmployees = allEmployees?.length ?? 0;
  const activeProjects = myProjects.filter(p => p.status === 'active').length;
  const pendingLeaves = pendingForLead.length;
  const totalAssets = assignedAssets?.length ?? 0;

  const annualRemaining = (leaveBalance?.annual_quota ?? 0) - (leaveBalance?.annual_used ?? 0);
  const sickRemaining = (leaveBalance?.sick_quota ?? 0) - (leaveBalance?.sick_used ?? 0);
  const casualRemaining = (leaveBalance?.casual_quota ?? 0) - (leaveBalance?.casual_used ?? 0);

  return (
    <div className="space-y-6 pb-8">
      <AnalyticsHeader 
        userName={employee.full_name}
        userCode={employee.employee_code}
      />

      <MetricsGrid
        metrics={{
          totalEmployees,
          activeProjects,
          pendingLeaves,
          totalAssets,
          teamSize,
          annualRemaining,
          sickRemaining,
          casualRemaining,
        }}
      />

      <PerformanceChart
        recentLeaves={recentLeaves ?? []}
        leaveBalance={leaveBalance}
      />

      <TopPerformers
        employees={allEmployees ?? []}
        projects={myProjects}
        isAdmin={isAdmin}
      />
    </div>
  );
}
