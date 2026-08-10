import { createAdminClient } from "@/lib/supabase/admin";

export interface WeeklyScore {
  employee_id: string;
  employee_name: string;
  total_standups: number;
  total_tasks_completed: number;
  total_blockers: number;
  avg_score: number;
  consistency_pct: number;
  trend: "up" | "down" | "stable";
}

export async function calculateWeeklyScores(
  weekStart: string,
  weekEnd: string
): Promise<void> {
  const supabase = createAdminClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("status", "active");

  if (!employees) return;

  for (const emp of employees) {
    const { data: entries } = await supabase
      .from("standup_entries")
      .select("performance_score, completed, blockers, in_progress, created_at")
      .eq("employee_id", emp.id)
      .gte("created_at", weekStart + "T00:00:00Z")
      .lte("created_at", weekEnd + "T23:59:59Z");

    if (!entries || entries.length === 0) continue;

    const totalStandups = entries.length;
    const totalTasksCompleted = entries.reduce(
      (sum, e) => sum + (Array.isArray(e.completed) ? e.completed.length : 0),
      0
    );
    const totalBlockers = entries.reduce(
      (sum, e) => sum + (Array.isArray(e.blockers) ? e.blockers.length : 0),
      0
    );
    const avgScore = Math.round(
      entries.reduce((sum, e) => sum + (e.performance_score || 0), 0) / totalStandups
    );

    const workingDays = 5;
    const consistencyPct = Math.min(100, Math.round((totalStandups / workingDays) * 100));

    const { data: prevScores } = await supabase
      .from("performance_scores")
      .select("avg_score")
      .eq("employee_id", emp.id)
      .order("week_start", { ascending: false })
      .limit(1);

    const prevScore = prevScores?.[0]?.avg_score ?? avgScore;
    let trend: "up" | "down" | "stable" = "stable";
    if (avgScore > prevScore + 3) trend = "up";
    else if (avgScore < prevScore - 3) trend = "down";

    await supabase.from("performance_scores").upsert(
      {
        employee_id: emp.id,
        week_start: weekStart,
        week_end: weekEnd,
        total_standups: totalStandups,
        total_tasks_completed: totalTasksCompleted,
        total_blockers: totalBlockers,
        avg_score: avgScore,
        consistency_pct: consistencyPct,
        trend,
      },
      { onConflict: "employee_id,week_start" }
    );
  }
}

export async function getLatestScores(): Promise<WeeklyScore[]> {
  const supabase = createAdminClient();

  const { data: scores } = await supabase
    .from("performance_scores")
    .select("*, employee:employees(id, full_name)")
    .order("week_start", { ascending: false })
    .limit(50);

  if (!scores) return [];

  const employeeMap = new Map<string, WeeklyScore>();

  for (const s of scores) {
    const emp = s.employee as { id: string; full_name: string } | null;
    if (!emp) continue;
    if (!employeeMap.has(emp.id)) {
      employeeMap.set(emp.id, {
        employee_id: emp.id,
        employee_name: emp.full_name,
        total_standups: s.total_standups,
        total_tasks_completed: s.total_tasks_completed,
        total_blockers: s.total_blockers,
        avg_score: s.avg_score,
        consistency_pct: s.consistency_pct,
        trend: s.trend,
      });
    }
  }

  return Array.from(employeeMap.values());
}
