import { createAdminClient } from "@/lib/supabase/admin";
import { AllEmployeesPerformance } from "@/components/performance/all-employees-performance";
import {
  consistencyFromUniqueDays,
  preferCanonicalEmployee,
  rollingExpectedDays,
  uniqueStandupDays,
} from "@/lib/standup/consistency";

export const dynamic = "force-dynamic";

export default async function AllEmployeesPage() {
  const supabase = createAdminClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, profile_photo_url, status, slack_user_id")
    .eq("status", "active");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const expectedDays = rollingExpectedDays(30, now);

  const { data: standupEntries } = await supabase
    .from("standup_entries")
    .select("employee_id, performance_score, completed, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const empList = employees || [];
  const employeeRows = empList.flatMap((emp) => {
    const empStandups = (standupEntries || []).filter((e) => e.employee_id === emp.id);
    const hasSlack = Boolean(emp.slack_user_id);
    if (!hasSlack && empStandups.length === 0) return [];

    const totalStandups = empStandups.length;
    const totalTasks = empStandups.reduce(
      (sum, e) => sum + (Array.isArray(e.completed) ? e.completed.length : 0),
      0
    );
    const avgScore =
      empStandups.length > 0
        ? Math.round(empStandups.reduce((s, e) => s + (e.performance_score || 0), 0) / empStandups.length)
        : 0;

    const uniqueDays = uniqueStandupDays(empStandups);
    const consistencyPct = consistencyFromUniqueDays(uniqueDays, expectedDays);

    const taskCompletionPct =
      empStandups.length > 0
        ? Math.min(100, Math.round((totalTasks / (empStandups.length * 3)) * 100))
        : 0;

    return [{
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_photo: emp.profile_photo_url,
      avg_score: avgScore,
      total_standups: totalStandups,
      consistency_pct: consistencyPct,
      total_tasks_completed: taskCompletionPct,
      has_slack: hasSlack,
    }];
  });

  return <AllEmployeesPerformance employees={preferCanonicalEmployee(employeeRows)} />;
}
