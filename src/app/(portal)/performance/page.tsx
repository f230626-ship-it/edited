import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { PerformanceOverview } from "@/components/performance/performance-overview";
import {
  consistencyFromUniqueDays,
  preferCanonicalEmployee,
  rollingExpectedDays,
  uniqueStandupDays,
} from "@/lib/standup/consistency";

export default async function PerformancePage() {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  const isAdmin = employee.role === "admin" || employee.role === "hr";

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

  const { data: perfScores } = await supabase
    .from("performance_scores")
    .select("employee_id, avg_score, total_standups, total_tasks_completed, consistency_pct, trend, week_start")
    .order("week_start", { ascending: false })
    .limit(200);

  const employeeRows: {
    employee_id: string;
    employee_name: string;
    employee_photo: string | null;
    avg_score: number;
    total_standups: number;
    consistency_pct: number;
    total_tasks_completed: number;
    trend: string;
    has_slack?: boolean;
  }[] = [];

  const empList = employees || [];
  for (const emp of empList) {
    if (!isAdmin && emp.id !== employee.id) continue;

    const empStandups = (standupEntries || []).filter((e) => e.employee_id === emp.id);
    const empScores = (perfScores || []).filter((s) => s.employee_id === emp.id);
    const hasSlack = Boolean(emp.slack_user_id);

    // Team view: skip shadow accounts with no Slack link and no standups
    if (isAdmin && emp.id !== employee.id && !hasSlack && empStandups.length === 0) continue;

    const totalStandups = empStandups.length;
    const totalTasks = empStandups.reduce(
      (sum, e) => sum + (Array.isArray(e.completed) ? e.completed.length : 0),
      0
    );
    const avgScore =
      empStandups.length > 0
        ? Math.round(empStandups.reduce((s, e) => s + (e.performance_score || 0), 0) / empStandups.length)
        : empScores.length > 0
          ? empScores[0].avg_score
          : 0;

    const uniqueDays = uniqueStandupDays(empStandups);
    const consistencyPct =
      uniqueDays > 0
        ? consistencyFromUniqueDays(uniqueDays, expectedDays)
        : empScores.length > 0
          ? empScores[0].consistency_pct
          : 0;

    const taskCompletionPct =
      totalStandups > 0
        ? Math.min(100, Math.round((totalTasks / (totalStandups * 3)) * 100))
        : empScores.length > 0
          ? empScores[0].total_tasks_completed
          : 0;

    const trend = empScores.length > 0 ? empScores[0].trend : "stable";

    employeeRows.push({
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_photo: emp.profile_photo_url,
      avg_score: avgScore,
      total_standups: totalStandups,
      consistency_pct: consistencyPct,
      total_tasks_completed: taskCompletionPct,
      trend,
      has_slack: hasSlack,
    });
  }

  const dedupedRows = preferCanonicalEmployee(employeeRows).sort((a, b) => b.avg_score - a.avg_score);

  const overallScore =
    dedupedRows.length > 0
      ? Math.round(dedupedRows.reduce((s, e) => s + e.avg_score, 0) / dedupedRows.length)
      : 0;

  const standupScore = overallScore;

  const taskCompletion =
    dedupedRows.length > 0
      ? Math.round(dedupedRows.reduce((s, e) => s + e.total_tasks_completed, 0) / dedupedRows.length)
      : 0;

  const weekBuckets = new Map<string, number[]>();
  for (const entry of standupEntries || []) {
    const d = new Date(entry.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1);
    const key = weekStart.toISOString().split("T")[0];
    if (!weekBuckets.has(key)) weekBuckets.set(key, []);
    weekBuckets.get(key)!.push(entry.performance_score || 0);
  }

  const trendData = Array.from(weekBuckets.entries())
    .slice(-4)
    .map(([weekStart, scores]) => ({
      month: new Date(weekStart + "T00:00:00Z").toLocaleDateString("en-US", { month: "short" }),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));

  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  while (trendData.length < 4) {
    const monthIdx = (now.getMonth() - (3 - trendData.length) + 12) % 12;
    trendData.unshift({ month: labels[monthIdx], score: overallScore });
  }

  const overallScoreTrend =
    trendData.length >= 2 ? trendData[trendData.length - 1].score - trendData[trendData.length - 2].score : 0;
  const standupScoreTrend = overallScoreTrend;
  const taskCompletionTrend = overallScoreTrend;

  const insights: { type: "positive" | "warning"; title: string; description: string }[] = [];

  const activeEmployees = dedupedRows.filter((e) => e.total_standups > 0);
  if (activeEmployees.length > 0) {
    insights.push({
      type: "positive",
      title: "Consistent stand-up reporting",
      description: "Team is regularly sharing updates and maintaining transparency.",
    });
  }

  if (taskCompletion >= 80) {
    insights.push({
      type: "positive",
      title: "Strong task completion",
      description: "Great job! Task completion rate is above team average.",
    });
  }

  const recentScores = dedupedRows.filter((e) => e.trend === "down");
  if (recentScores.length > 0) {
    insights.push({
      type: "warning",
      title: "Some employees showing declining scores",
      description: `${recentScores.length} employee${recentScores.length > 1 ? "s" : ""} show${recentScores.length === 1 ? "s" : ""} a downward trend compared to last period.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "positive",
      title: "Team performance is stable",
      description: "No significant changes detected across the team.",
    });
  }

  const dateRange = `${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <PerformanceOverview
        employees={dedupedRows}
        trendData={trendData}
        overallScore={overallScore}
        overallScoreTrend={overallScoreTrend}
        standupScore={standupScore}
        standupScoreTrend={standupScoreTrend}
        taskCompletion={taskCompletion}
        taskCompletionTrend={taskCompletionTrend}
        insights={insights}
        dateRange={dateRange}
        isDark={false}
      />
    </div>
  );
}
