import { createAdminClient } from "@/lib/supabase/admin";

export interface WeeklyScore {
  employee_id: string;
  employee_name: string;
  employee_photo?: string | null;
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

    // Calculate consistency based on unique calendar days submitted
    const uniqueDays = new Set(entries.map(e => new Date(e.created_at).toDateString())).size;
    const workingDays = 5;
    const consistencyPct = Math.min(100, Math.round((uniqueDays / workingDays) * 100));

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
    .select("*, employee:employees(id, full_name, profile_photo_url)")
    .order("week_start", { ascending: false })
    .limit(50);

  if (scores && scores.length > 0) {
    const employeeMap = new Map<string, WeeklyScore>();

    for (const s of scores) {
      const emp = s.employee as { id: string; full_name: string; profile_photo_url: string | null } | null;
      if (!emp) continue;
      if (!employeeMap.has(emp.id)) {
        employeeMap.set(emp.id, {
          employee_id: emp.id,
          employee_name: emp.full_name,
          employee_photo: emp.profile_photo_url,
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

  // Fallback: If performance_scores is empty, query all active employees and calculate real-time metrics from standup_entries
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, profile_photo_url")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (!employees || employees.length === 0) return [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const employeeIds = employees.map((emp) => emp.id);

  // Fetch all standup entries for all active employees in a single query
  const { data: allEntries } = await supabase
    .from("standup_entries")
    .select("employee_id, performance_score, completed, blockers, in_progress, created_at")
    .in("employee_id", employeeIds)
    .gte("created_at", startOfMonth);

  // Group entries by employee ID in memory
  const entriesMap = new Map<string, typeof allEntries>();
  if (allEntries) {
    allEntries.forEach((entry) => {
      if (!entry.employee_id) return;
      const list = entriesMap.get(entry.employee_id) || [];
      list.push(entry);
      entriesMap.set(entry.employee_id, list);
    });
  }

  const leaderboard: WeeklyScore[] = [];

  for (const emp of employees) {
    const entries = entriesMap.get(emp.id) || [];

    const totalStandups = entries.length;
    const avgScore = totalStandups > 0
      ? Math.round(entries.reduce((sum, e) => sum + (e.performance_score || 0), 0) / totalStandups)
      : 0;
    const totalTasks = entries.reduce((sum, e) => sum + (Array.isArray(e.completed) ? e.completed.length : 0), 0);
    const totalBlockers = entries.reduce((sum, e) => sum + (Array.isArray(e.blockers) ? e.blockers.length : 0), 0);
    
    // Calculate consistency based on unique calendar days submitted
    const uniqueDays = new Set(entries.map(e => new Date(e.created_at).toDateString())).size;
    const consistencyPct = Math.min(100, Math.round((uniqueDays / 20) * 100));

    leaderboard.push({
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_photo: emp.profile_photo_url,
      total_standups: totalStandups,
      total_tasks_completed: totalTasks,
      total_blockers: totalBlockers,
      avg_score: avgScore,
      consistency_pct: consistencyPct,
      trend: "stable",
    });
  }

  return leaderboard.sort((a, b) => b.avg_score - a.avg_score);
}
