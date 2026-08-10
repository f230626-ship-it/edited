import { getStandupEntries, getPerformanceLeaderboard } from "@/actions/standup";
import { StandupDashboard } from "@/components/standup/standup-dashboard";
import { requireAuth } from "@/lib/auth";

export default async function StandupsPage() {
  await requireAuth();

  const [standupsData, leaderboard] = await Promise.all([
    getStandupEntries("monthly"),
    getPerformanceLeaderboard(),
  ]);

  // Map WeeklyScore[] to LeaderboardEntry[]
  const initialLeaderboard = leaderboard.map(item => ({
    employee_id: item.employee_id,
    employee_name: item.employee_name,
    total_standups: item.total_standups,
    total_tasks_completed: item.total_tasks_completed,
    total_blockers: item.total_blockers,
    avg_score: item.avg_score,
    consistency_pct: item.consistency_pct,
    trend: item.trend,
  }));

  return (
    <StandupDashboard 
      initialEntries={standupsData.entries} 
      initialLeaderboard={initialLeaderboard} 
    />
  );
}
