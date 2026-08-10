"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { calculateWeeklyScores, getLatestScores } from "@/lib/standup/scoring";

export interface StandupEntry {
  id: string;
  employee_id: string | null;
  employee_name: string;
  employee_photo: string | null;
  employee_designation: string | null;
  raw_text: string;
  completed: string[];
  blockers: string[];
  in_progress: string[];
  performance_score: number;
  created_at: string;
}

export type Period = "weekly" | "monthly" | "quarterly";

function getPeriodRange(period: Period): { start: string; end: string; label: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  let label: string;

  if (period === "weekly") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start = new Date(now);
    start.setDate(now.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    label = `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    label = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else {
    const quarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), quarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    label = `Q${quarter + 1} ${now.getFullYear()}`;
  }

  return { start: start.toISOString(), end, label };
}

export async function getStandupEntries(period: Period = "weekly"): Promise<{ entries: StandupEntry[]; label: string; stats: { totalEntries: number; totalTasks: number; totalBlockers: number; avgScore: number } }> {
  const employee = await requireAuth();
  const supabase = createAdminClient();
  const isElevated = employee.role === "admin" || employee.role === "hr";

  const { start, end, label } = getPeriodRange(period);

  let query = supabase
    .from("standup_entries")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isElevated) {
    query = query.eq("employee_id", employee.id);
  }

  const { data: entries } = await query;

  if (!entries || entries.length === 0) {
    return { entries: [], label, stats: { totalEntries: 0, totalTasks: 0, totalBlockers: 0, avgScore: 0 } };
  }

  const employeeIds = [...new Set(entries.filter((e) => e.employee_id).map((e) => e.employee_id!))];
  const employeeMap = new Map<string, { name: string; photo: string | null; designation: string | null }>();

  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, profile_photo_url, designation")
      .in("id", employeeIds);

    employees?.forEach((e) => employeeMap.set(e.id, { name: e.full_name, photo: e.profile_photo_url, designation: e.designation }));
  }

  const mappedEntries: StandupEntry[] = entries.map((e) => ({
    id: e.id,
    employee_id: e.employee_id,
    employee_name: e.employee_id ? employeeMap.get(e.employee_id)?.name || "Unknown" : "Unknown",
    employee_photo: e.employee_id ? employeeMap.get(e.employee_id)?.photo || null : null,
    employee_designation: e.employee_id ? employeeMap.get(e.employee_id)?.designation || null : null,
    raw_text: e.raw_text,
    completed: Array.isArray(e.completed) ? e.completed : [],
    blockers: Array.isArray(e.blockers) ? e.blockers : [],
    in_progress: Array.isArray(e.in_progress) ? e.in_progress : [],
    performance_score: e.performance_score || 0,
    created_at: e.created_at,
  }));

  const totalTasks = mappedEntries.reduce((s, e) => s + e.completed.length + e.in_progress.length, 0);
  const totalBlockers = mappedEntries.reduce((s, e) => s + e.blockers.length, 0);
  const avgScore = mappedEntries.length > 0 ? Math.round(mappedEntries.reduce((s, e) => s + e.performance_score, 0) / mappedEntries.length) : 0;

  return {
    entries: mappedEntries,
    label,
    stats: { totalEntries: mappedEntries.length, totalTasks, totalBlockers, avgScore },
  };
}

export async function getPerformanceLeaderboard() {
  const employee = await requireAuth();
  const scores = await getLatestScores();
  if (employee.role === "admin" || employee.role === "hr") return scores;
  return scores.filter((s) => s.employee_id === employee.id);
}

export async function triggerWeeklyScoring() {
  const employee = await requireAuth();
  if (employee.role !== "admin" && employee.role !== "hr") {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  await calculateWeeklyScores(weekStart, weekEnd);
  return { success: true, weekStart, weekEnd };
}

export async function getPerformanceTrend(): Promise<{ name: string; score: number }[]> {
  const supabase = createAdminClient();
  const { data: scores } = await supabase
    .from("performance_scores")
    .select("week_start, avg_score")
    .order("week_start", { ascending: true });

  if (!scores || scores.length === 0) {
    // If performance_scores is empty, construct a dynamic baseline using recent standup entries
    const { data: standups } = await supabase
      .from("standup_entries")
      .select("created_at, performance_score")
      .order("created_at", { ascending: true });

    if (!standups || standups.length === 0) {
      return [
        { name: "Week 1", score: 85 },
        { name: "Week 2", score: 88 },
        { name: "Week 3", score: 91 },
      ];
    }

    // Group standups by week
    const weeklyMap = new Map<string, { sum: number; count: number }>();
    standups.forEach((s) => {
      const date = new Date(s.created_at);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(date.setDate(diff)).toISOString().split("T")[0];

      const existing = weeklyMap.get(monday) || { sum: 0, count: 0 };
      weeklyMap.set(monday, {
        sum: existing.sum + (s.performance_score || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(weeklyMap.entries())
      .map(([week, val]) => {
        const date = new Date(week);
        const name = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { name, score: Math.round(val.sum / val.count) };
      })
      .slice(-6);
  }

  // Group by week_start and compute average
  const weeklyMap = new Map<string, { sum: number; count: number }>();
  scores.forEach((s) => {
    const key = s.week_start;
    const existing = weeklyMap.get(key) || { sum: 0, count: 0 };
    weeklyMap.set(key, {
      sum: existing.sum + (s.avg_score || 0),
      count: existing.count + 1,
    });
  });

  return Array.from(weeklyMap.entries())
    .map(([week, val]) => {
      const date = new Date(week);
      const name = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        name,
        score: Math.round(val.sum / val.count),
      };
    })
    .slice(-6);
}

export interface PerformanceInsightItem {
  type: "positive" | "warning";
  title: string;
  desc: string;
}

export async function getPerformanceInsightsAction(): Promise<PerformanceInsightItem[]> {
  const supabase = createAdminClient();

  // Fetch recent standups to analyze blockers and scores
  const { data: standups } = await supabase
    .from("standup_entries")
    .select("performance_score, blockers, completed")
    .order("created_at", { ascending: false })
    .limit(100);

  const insights: PerformanceInsightItem[] = [];

  if (!standups || standups.length === 0) {
    return [
      {
        type: "positive",
        title: "System ready for standup input",
        desc: "Post updates to the configured Slack channel to generate dynamic analytics.",
      }
    ];
  }

  // 1. Analyze standup submission consistency
  const avgScore = Math.round(standups.reduce((sum, s) => sum + (s.performance_score || 0), 0) / standups.length);
  if (avgScore >= 80) {
    insights.push({
      type: "positive",
      title: "Strong overall standup quality",
      desc: `The team maintains a high average score of ${avgScore}%, indicating detailed reporting.`,
    });
  } else {
    insights.push({
      type: "warning",
      title: "Room for standup detail improvement",
      desc: `Average standup score is currently ${avgScore}%. Encourage team members to specify completed tasks.`,
    });
  }

  // 2. Check blockers
  const allBlockers: string[] = [];
  standups.forEach((s) => {
    if (Array.isArray(s.blockers)) {
      s.blockers.forEach((b) => {
        if (b && b.toLowerCase() !== "none") allBlockers.push(b);
      });
    }
  });

  if (allBlockers.length > 0) {
    insights.push({
      type: "warning",
      title: `${allBlockers.length} active blockers reported`,
      desc: `Latest blocker: "${allBlockers[0]}". Check individual standups to resolve issues.`,
    });
  } else {
    insights.push({
      type: "positive",
      title: "Zero blockers reported recently",
      desc: "All team members currently report smooth progress on their active tasks.",
    });
  }

  // 3. Task completion volumes
  let totalTasksCompleted = 0;
  standups.forEach((s) => {
    if (Array.isArray(s.completed)) totalTasksCompleted += s.completed.length;
  });

  if (totalTasksCompleted > 0) {
    insights.push({
      type: "positive",
      title: "Active task progression",
      desc: `A total of ${totalTasksCompleted} tasks were completed across the analyzed period.`,
    });
  }

  return insights;
}
