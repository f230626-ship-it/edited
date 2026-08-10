import { requireAuth } from "@/lib/auth";
import { ChevronDown, ArrowRight } from "lucide-react";
import { PerformanceKpiCards } from "@/components/performance/performance-kpi-cards";
import { PerformanceTrendChart } from "@/components/performance/performance-trend-chart";
import { EmployeePerformanceTable } from "@/components/performance/employee-performance-table";
import { PerformanceInsights } from "@/components/performance/performance-insights";
import { getPerformanceLeaderboard, getStandupEntries, getPerformanceTrend, getPerformanceInsightsAction } from "@/actions/standup";
import { PeriodSelector } from "@/components/performance/period-selector";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function PerformancePage({ searchParams }: PageProps) {
  const employee = await requireAuth();
  
  const params = await searchParams;
  const period = (params.period || "monthly") as "weekly" | "monthly" | "quarterly";

  // Fetch real database records based on period
  const [leaderboard, standupsData, trendData, insightsData] = await Promise.all([
    getPerformanceLeaderboard(),
    getStandupEntries(period),
    getPerformanceTrend(),
    getPerformanceInsightsAction()
  ]);

  // Compute KPI values from real database data if it exists, otherwise fall back to design mockup defaults.
  const totalEmployees = leaderboard.length || 1;
  const avgPerformance = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((acc, curr) => acc + curr.avg_score, 0) / totalEmployees)
    : 87;
  const avgStandup = standupsData?.stats?.avgScore || 91;
  
  // Task completion calculation
  const totalTasks = standupsData?.stats?.totalTasks || 0;
  const totalBlockers = standupsData?.stats?.totalBlockers || 0;
  const completionPct = totalTasks > 0 
    ? Math.round((totalTasks / (totalTasks + totalBlockers)) * 100) 
    : 92;

  const overallPerformanceStr = `${avgPerformance}%`;
  const standupScoreStr = `${avgStandup}%`;
  const taskCompletionStr = `${completionPct}%`;

  const ctaHref = "/performance/standups";

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in relative z-50">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Performance Overview</h1>
        
        <PeriodSelector currentPeriod={period} />
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <PerformanceKpiCards 
        overallPerformance={overallPerformanceStr}
        standupScore={standupScoreStr}
        taskCompletion={taskCompletionStr}
      />

      {/* ── Trend Chart ────────────────────────────────────── */}
      <PerformanceTrendChart data={trendData} />

      {/* ── Employee Table ─────────────────────────────────── */}
      <EmployeePerformanceTable leaderboard={leaderboard} />

      {/* ── Insights ───────────────────────────────────────── */}
      <PerformanceInsights insights={insightsData} />

      {/* ── CTA Button ─────────────────────────────────────── */}
      <div className="animate-slide-up stagger-5 pt-2">
        <Link 
          href={ctaHref}
          className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          View Detailed Standups
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
