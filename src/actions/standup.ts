"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, canAccessSales } from "@/lib/auth";
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
  await requireAuth();
  const supabase = createAdminClient();

  const { start, end, label } = getPeriodRange(period);

  const { data: entries } = await supabase
    .from("standup_entries")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false })
    .limit(200);

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
  await requireAuth();
  return getLatestScores();
}

export async function triggerWeeklyScoring() {
  const employee = await requireAuth();
  if (!canAccessSales(employee)) {
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
