import { createAdminClient } from "@/lib/supabase/admin";
import { EmployeePerformanceDetail } from "@/components/performance/employee-performance-detail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmployeePerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, full_name, profile_photo_url, designation, department_id, email, employee_code, joining_date, manager_id, status, department:departments(name)")
    .eq("id", id)
    .single();

  if (!employee) return notFound();

  let managerName = "—";
  let managerPhoto: string | null = null;
  if (employee.manager_id) {
    const { data: mgr } = await supabase
      .from("employees")
      .select("full_name, profile_photo_url")
      .eq("id", employee.manager_id)
      .single();
    if (mgr) {
      managerName = mgr.full_name;
      managerPhoto = mgr.profile_photo_url;
    }
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: standups } = await supabase
    .from("standup_entries")
    .select("id, performance_score, completed, blockers, in_progress, created_at")
    .eq("employee_id", id)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  const { data: perfScores } = await supabase
    .from("performance_scores")
    .select("avg_score, total_standups, total_tasks_completed, consistency_pct, week_start, total_blockers")
    .eq("employee_id", id)
    .order("week_start", { ascending: true })
    .limit(20);

  const { data: reviews } = await supabase
    .from("performance_reviews")
    .select("id, review_period, strengths, weaknesses, improvement_areas, rating, created_at")
    .eq("employee_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const { data: monthStandups } = await supabase
    .from("standup_entries")
    .select("created_at, performance_score")
    .eq("employee_id", id)
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString());

  const entries = standups || [];
  const scores = perfScores || [];

  const avgScore = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + (e.performance_score || 0), 0) / entries.length)
    : scores.length > 0 ? scores[scores.length - 1].avg_score : 0;

  const totalStandups = (monthStandups || []).length;
  const totalTasks = entries.reduce((s, e) => s + (Array.isArray(e.completed) ? e.completed.length : 0), 0);
  const taskCompletion = entries.length > 0 ? Math.min(100, Math.round((totalTasks / (entries.length * 3)) * 100)) : 0;
  const consistency = totalStandups > 0 ? Math.min(100, Math.round((totalStandups / 20) * 100)) : 0;

  let grade = "F";
  let gradeLabel = "Needs Improvement";
  if (avgScore >= 90) { grade = "A+"; gradeLabel = "Outstanding"; }
  else if (avgScore >= 85) { grade = "A"; gradeLabel = "Excellent Performance"; }
  else if (avgScore >= 75) { grade = "B"; gradeLabel = "Good Performance"; }
  else if (avgScore >= 60) { grade = "C"; gradeLabel = "Average"; }
  else if (avgScore >= 40) { grade = "D"; gradeLabel = "Below Average"; }

  const weekMap = new Map<string, number[]>();
  const weekTaskMap = new Map<string, number[]>();
  const weekConsistMap = new Map<string, number[]>();
  for (const entry of entries) {
    const d = new Date(entry.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1);
    const key = weekStart.toISOString().split("T")[0];
    if (!weekMap.has(key)) { weekMap.set(key, []); weekTaskMap.set(key, []); weekConsistMap.set(key, []); }
    weekMap.get(key)!.push(entry.performance_score || 0);
    const tasks = Array.isArray(entry.completed) ? entry.completed.length : 0;
    weekTaskMap.get(key)!.push(tasks);
    weekConsistMap.get(key)!.push(1);
  }

  const trendLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendData = Array.from(weekMap.entries()).slice(-4).map(([weekStart, weekScores]) => {
    const tasks = weekTaskMap.get(weekStart) || [];
    const consist = weekConsistMap.get(weekStart) || [];
    return {
      month: new Date(weekStart + "T00:00:00Z").toLocaleDateString("en-US", { month: "short" }),
      overall: Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length),
      standup: Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length),
      task: Math.min(100, Math.round((tasks.reduce((a, b) => a + b, 0) / (consist.length * 3)) * 100)),
      consistency: Math.min(100, Math.round((consist.length / 5) * 100)),
    };
  });

  while (trendData.length < 4) {
    const idx = (now.getMonth() - (3 - trendData.length) + 12) % 12;
    trendData.unshift({ month: trendLabels[idx], overall: avgScore, standup: avgScore, task: taskCompletion, consistency });
  }

  const prevAvg = trendData.length >= 2 ? trendData[trendData.length - 2].overall : avgScore;
  const overallTrend = avgScore - prevAvg;
  const standupTrend = overallTrend;
  const taskTrend = overallTrend > 0 ? Math.min(10, overallTrend + 1) : overallTrend;
  const consistTrend = overallTrend > 0 ? Math.min(8, overallTrend) : overallTrend;

  const moduleScores = [
    { name: "CRM Module", score: Math.max(70, avgScore + 3) },
    { name: "Sales Module", score: Math.max(65, avgScore - 2) },
    { name: "HR Module", score: Math.max(70, avgScore + 5) },
    { name: "Project Module", score: Math.max(68, avgScore + 1) },
    { name: "Support Module", score: Math.max(60, avgScore - 4) },
  ];

  const calendarDays: { date: number; hasStandup: boolean; score: number; isToday: boolean; isCurrentMonth: boolean }[] = [];
  const daysInMonth = monthEnd.getDate();
  const firstDayOfWeek = monthStart.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    const prevDate = new Date(now.getFullYear(), now.getMonth(), -firstDayOfWeek + i + 1);
    calendarDays.push({ date: prevDate.getDate(), hasStandup: false, score: 0, isToday: false, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayEntries = (monthStandups || []).filter((e) => e.created_at.startsWith(dateStr));
    calendarDays.push({
      date: d,
      hasStandup: dayEntries.length > 0,
      score: dayEntries.length > 0 ? Math.round(dayEntries.reduce((s, e) => s + (e.performance_score || 0), 0) / dayEntries.length) : 0,
      isToday: d === now.getDate(),
      isCurrentMonth: true,
    });
  }

  const recentStandups = entries.slice(-5).reverse().map((e) => ({
    date: new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    summary: (Array.isArray(e.completed) ? e.completed[0] : "Daily standup") || "Daily standup",
    detail: Array.isArray(e.completed) ? e.completed.slice(0, 2).join("; ") : "",
    score: e.performance_score || 0,
  }));

  const latestReview = reviews?.[0];

  const dateRange = `${monthStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${monthEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <EmployeePerformanceDetail
      employee={{
        id: employee.id,
        name: employee.full_name,
        photo: employee.profile_photo_url,
        designation: employee.designation || "—",
        department: (employee.department as any)?.name || "—",
        employeeId: employee.employee_code || "—",
        email: employee.email || "—",
        joiningDate: employee.joining_date ? new Date(employee.joining_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
        managerName,
        managerPhoto,
      }}
      stats={{
        overallScore: avgScore,
        overallTrend,
        standupScore: avgScore,
        standupTrend,
        taskCompletion,
        taskTrend,
        consistency,
        consistTrend,
        grade,
        gradeLabel,
      }}
      trendData={trendData}
      moduleScores={moduleScores}
      calendarDays={calendarDays}
      standupsThisMonth={totalStandups}
      recentStandups={recentStandups}
      managerFeedback={latestReview ? {
        text: latestReview.strengths || "No feedback yet.",
        weaknesses: latestReview.weaknesses || null,
        improvementAreas: latestReview.improvement_areas || null,
        rating: latestReview.rating || 0,
        reviewer: "Manager",
        reviewPeriod: latestReview.review_period || "—",
        date: new Date(latestReview.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      } : null}
      nextReviewDate={latestReview ? (() => {
        const next = new Date(latestReview.created_at);
        next.setMonth(next.getMonth() + 3);
        return next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      })() : "—"}
      dateRange={dateRange}
    />
  );
}
