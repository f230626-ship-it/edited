"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isBdEmployee } from "@/lib/auth";

export interface AnalyticsDataPoint {
  name: string;
  [key: string]: any; // Allow dynamic metrics based on role
}

export interface DashboardAnalyticsResponse {
  period: "daily" | "weekly" | "monthly";
  todayFormatted: string;
  role: "admin" | "bd" | "engineering";
  totals: Record<string, number>;
  chartData: AnalyticsDataPoint[];
}

export async function getDashboardAnalyticsData(
  period: "daily" | "weekly" | "monthly" = "daily"
): Promise<DashboardAnalyticsResponse> {
  const employee = await requireAuth();
  const supabase = createAdminClient();

  const isBD = isBdEmployee(employee);
  const isAdmin = employee.role === "admin" || employee.pm_role === "admin";
  const role: "admin" | "bd" | "engineering" = isAdmin ? "admin" : isBD ? "bd" : "engineering";

  const now = new Date();
  const todayFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate start date based on selected period
  const startDate = new Date();
  if (period === "daily") {
    startDate.setDate(now.getDate() - 13); // Last 14 days
  } else if (period === "weekly") {
    startDate.setDate(now.getDate() - 7 * 7); // Last 8 weeks
  } else {
    startDate.setMonth(now.getMonth() - 11); // Last 12 months
  }
  const startDateISO = startDate.toISOString().split("T")[0];

  // Previous period start date for comparison calculation
  const prevStartDate = new Date(startDate);
  if (period === "daily") {
    prevStartDate.setDate(prevStartDate.getDate() - 14);
  } else if (period === "weekly") {
    prevStartDate.setDate(prevStartDate.getDate() - 7 * 8);
  } else {
    prevStartDate.setMonth(prevStartDate.getMonth() - 12);
  }
  const prevStartDateISO = prevStartDate.toISOString().split("T")[0];

  // Build time buckets for chart
  const bucketsMap = new Map<string, AnalyticsDataPoint>();

  if (period === "daily") {
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      bucketsMap.set(key, { name: label });
    }
  } else if (period === "weekly") {
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i * 7);
      const key = d.toISOString().split("T")[0];
      const label = `Wk of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      bucketsMap.set(key, { name: label });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      bucketsMap.set(key, { name: label });
    }
  }

  const totals: Record<string, number> = {};

  if (role === "bd") {
    // ─────────────── BUSINESS DEVELOPMENT ROLE ───────────────
    const [{ data: logs }, { data: leads }] = await Promise.all([
      supabase
        .from("sales_daily_logs")
        .select("log_date, connections_sent, messages_sent, meetings_booked, leads_added")
        .gte("log_date", startDateISO)
        .eq("employee_id", employee.id),
      supabase
        .from("sales_leads")
        .select("created_at, value, status")
        .gte("created_at", startDateISO)
        .eq("employee_id", employee.id),
    ]);

    const [{ data: prevLogs }, { data: prevLeads }] = await Promise.all([
      supabase
        .from("sales_daily_logs")
        .select("connections_sent, messages_sent, meetings_booked, leads_added")
        .gte("log_date", prevStartDateISO)
        .lt("log_date", startDateISO)
        .eq("employee_id", employee.id),
      supabase
        .from("sales_leads")
        .select("value, status")
        .gte("created_at", prevStartDateISO)
        .lt("created_at", startDateISO)
        .eq("employee_id", employee.id),
    ]);

    // Initialize buckets
    for (const key of bucketsMap.keys()) {
      bucketsMap.set(key, {
        ...bucketsMap.get(key)!,
        sales: 0,
        leads: 0,
        meetings: 0,
        deals: 0,
      });
    }

    let salesTotal = 0;
    let leadsTotal = 0;
    let meetingsTotal = 0;
    let dealsTotal = 0;

    // Populate logs
    for (const log of logs ?? []) {
      const logDate = log.log_date;
      const salesVol = log.connections_sent + log.messages_sent;
      salesTotal += salesVol;
      meetingsTotal += log.meetings_booked;
      leadsTotal += log.leads_added;

      const bucketKey = getBucketKey(logDate, period, Array.from(bucketsMap.keys()));
      if (bucketKey && bucketsMap.has(bucketKey)) {
        const item = bucketsMap.get(bucketKey)!;
        item.sales += salesVol;
        item.meetings += log.meetings_booked;
        item.leads += log.leads_added;
      }
    }

    // Populate leads/deals
    for (const lead of leads ?? []) {
      const leadDate = lead.created_at.split("T")[0];
      const isWon = lead.status === "closed" || lead.status === "won";
      if (isWon) {
        dealsTotal += lead.value || 0;
      }

      const bucketKey = getBucketKey(leadDate, period, Array.from(bucketsMap.keys()));
      if (bucketKey && bucketsMap.has(bucketKey) && isWon) {
        const item = bucketsMap.get(bucketKey)!;
        item.deals += lead.value || 0;
      }
    }

    totals.sales = salesTotal;
    totals.leads = leadsTotal;
    totals.meetings = meetingsTotal;
    totals.deals = dealsTotal;

    // Calculate previous period totals for growth
    let prevSales = 0;
    let prevLeadsVal = 0;
    let prevMeetings = 0;
    let prevDeals = 0;

    for (const log of prevLogs ?? []) {
      prevSales += log.connections_sent + log.messages_sent;
      prevMeetings += log.meetings_booked;
      prevLeadsVal += log.leads_added;
    }
    for (const lead of prevLeads ?? []) {
      if (lead.status === "closed" || lead.status === "won") {
        prevDeals += lead.value || 0;
      }
    }

    // Dynamic growths per metric
    totals.growth_sales = prevSales > 0 ? Math.round(((salesTotal - prevSales) / prevSales) * 100) : 0;
    totals.growth_leads = prevLeadsVal > 0 ? Math.round(((leadsTotal - prevLeadsVal) / prevLeadsVal) * 100) : 0;
    totals.growth_meetings = prevMeetings > 0 ? Math.round(((meetingsTotal - prevMeetings) / prevMeetings) * 100) : 0;
    totals.growth_deals = prevDeals > 0 ? Math.round(((dealsTotal - prevDeals) / prevDeals) * 100) : 0;
    totals.growthPct = totals.growth_sales;

  } else if (role === "engineering") {
    // ─────────────── ENGINEERING ROLE ───────────────
    const { data: resourceRows } = await supabase
      .from("project_resources")
      .select("project_id")
      .eq("employee_id", employee.id);

    const projectIds = resourceRows?.map((r) => r.project_id) ?? [];

    let userProjects: any[] = [];
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from("projects")
        .select("id, status, start_date, actual_delivery_date, progress_percentage")
        .in("id", projectIds);
      userProjects = data ?? [];
    }

    // Fetch timesheet tasks for Completed Tasks & Bugs Fixed
    const [{ data: timesheets }, { data: prevTimesheets }] = await Promise.all([
      supabase
        .from("timesheets")
        .select("date, task_description")
        .eq("employee_id", employee.id)
        .gte("date", startDateISO),
      supabase
        .from("timesheets")
        .select("date, task_description")
        .eq("employee_id", employee.id)
        .gte("date", prevStartDateISO)
        .lt("date", startDateISO),
    ]);

    const isBugFix = (desc: string) => {
      const d = desc.toLowerCase();
      return d.includes("bug") || d.includes("fix") || d.includes("issue") || d.includes("error") || d.includes("defect");
    };

    // Populate buckets chronologically
    for (const key of bucketsMap.keys()) {
      const bucketEndDate = getBucketEndDate(key, period);

      // Cumulative projects started before end of this bucket
      const assignedCount = userProjects.filter(p => p.start_date && new Date(p.start_date) <= bucketEndDate).length;
      const activeCount = userProjects.filter(p => 
        p.start_date && 
        new Date(p.start_date) <= bucketEndDate && 
        (p.status !== "Completed" || !p.actual_delivery_date || new Date(p.actual_delivery_date) > bucketEndDate)
      ).length;

      // Incremental tasks & bugs inside this bucket
      const bucketTimesheets = timesheets?.filter(t => {
        const bucketKey = getBucketKey(t.date, period, Array.from(bucketsMap.keys()));
        return bucketKey === key;
      }) ?? [];

      const completedTasks = bucketTimesheets.length;
      const bugsFixed = bucketTimesheets.filter(t => isBugFix(t.task_description)).length;

      bucketsMap.set(key, {
        ...bucketsMap.get(key)!,
        assigned_projects: assignedCount,
        active_projects: activeCount,
        completed_tasks: completedTasks,
        bugs_fixed: bugsFixed,
      });
    }

    // Current period totals
    const currentCompletedTasks = timesheets?.length ?? 0;
    const currentBugsFixed = timesheets?.filter(t => isBugFix(t.task_description)).length ?? 0;

    totals.assigned_projects = userProjects.length;
    totals.active_projects = userProjects.filter(p => p.status !== "Completed").length;
    totals.completed_tasks = currentCompletedTasks;
    totals.bugs_fixed = currentBugsFixed;

    // Previous period totals
    const prevCompletedTasks = prevTimesheets?.length ?? 0;
    const prevBugsFixed = prevTimesheets?.filter(t => isBugFix(t.task_description)).length ?? 0;

    // Previous projects totals
    const prevAssigned = userProjects.filter(p => p.start_date && new Date(p.start_date) < new Date(startDateISO)).length;
    const prevActive = userProjects.filter(p => 
      p.start_date && 
      new Date(p.start_date) < new Date(startDateISO) && 
      (p.status !== "Completed" || !p.actual_delivery_date || new Date(p.actual_delivery_date) >= new Date(startDateISO))
    ).length;

    totals.growth_assigned_projects = prevAssigned > 0 ? Math.round(((totals.assigned_projects - prevAssigned) / prevAssigned) * 100) : 0;
    totals.growth_active_projects = prevActive > 0 ? Math.round(((totals.active_projects - prevActive) / prevActive) * 100) : 0;
    totals.growth_completed_tasks = prevCompletedTasks > 0 ? Math.round(((currentCompletedTasks - prevCompletedTasks) / prevCompletedTasks) * 100) : 0;
    totals.growth_bugs_fixed = prevBugsFixed > 0 ? Math.round(((currentBugsFixed - prevBugsFixed) / prevBugsFixed) * 100) : 0;
    totals.growthPct = totals.growth_completed_tasks;

  } else {
    // ─────────────── ADMIN ROLE ───────────────
    const [{ count: totalProjects }, { data: allLogs }, { data: allProjects }] = await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("sales_daily_logs").select("log_date, connections_sent, connections_accepted").gte("log_date", prevStartDateISO),
      supabase.from("projects").select("start_date, status, actual_delivery_date, progress_percentage"),
    ]);

    const currentLogs = allLogs?.filter(l => l.log_date >= startDateISO) ?? [];
    const prevLogs = allLogs?.filter(l => l.log_date < startDateISO) ?? [];

    const getProjectProgress = (p: any) => {
      if (p.progress_percentage !== undefined && p.progress_percentage !== null) {
        return p.progress_percentage;
      }
      switch (p.status) {
        case "Completed": return 100;
        case "Maintenance": return 90;
        case "In Progress": return 50;
        case "Onboarding": return 25;
        case "On Hold": return 20;
        default: return 0;
      }
    };

    let avgSalesProgress = 0;
    let avgEngineeringProgress = 0;
    
    for (const key of bucketsMap.keys()) {
      const bucketEndDate = getBucketEndDate(key, period);

      // 1. Projects began before or during this bucket
      const bucketProjects = allProjects?.filter(p => p.start_date && new Date(p.start_date) <= bucketEndDate) ?? [];
      const totalBucketProj = bucketProjects.length;

      // 2. Engineering progress (average of progress)
      let sumProgress = 0;
      for (const p of bucketProjects) {
        sumProgress += getProjectProgress(p);
      }
      const engProg = totalBucketProj > 0 ? Math.round(sumProgress / totalBucketProj) : 0;

      // 3. Sales progress (connection acceptance rate of all daily logs in this bucket)
      const bucketLogs = currentLogs.filter(l => {
        const bucketKey = getBucketKey(l.log_date, period, Array.from(bucketsMap.keys()));
        return bucketKey === key;
      });

      let sentSum = 0;
      let acceptedSum = 0;
      for (const l of bucketLogs) {
        sentSum += l.connections_sent || 0;
        acceptedSum += l.connections_accepted || 0;
      }
      const salesProg = sentSum > 0 ? Math.round((acceptedSum / sentSum) * 100) : 0;

      avgSalesProgress += salesProg;
      avgEngineeringProgress += engProg;

      bucketsMap.set(key, {
        ...bucketsMap.get(key)!,
        total_projects: totalBucketProj,
        sales_progress: salesProg,
        engineering_progress: engProg,
      });
    }

    const bucketCount = bucketsMap.size;
    totals.total_projects = totalProjects ?? 0;
    totals.sales_progress = bucketCount > 0 ? Math.round(avgSalesProgress / bucketCount) : 0;
    totals.engineering_progress = bucketCount > 0 ? Math.round(avgEngineeringProgress / bucketCount) : 0;

    // Previous period calculations for comparison
    const prevProjects = allProjects?.filter(p => p.start_date && new Date(p.start_date) < new Date(startDateISO)) ?? [];
    let prevSumProgress = 0;
    for (const p of prevProjects) {
      prevSumProgress += getProjectProgress(p);
    }
    const prevEngProg = prevProjects.length > 0 ? Math.round(prevSumProgress / prevProjects.length) : 0;

    let prevSentSum = 0;
    let prevAcceptedSum = 0;
    for (const l of prevLogs) {
      prevSentSum += l.connections_sent || 0;
      prevAcceptedSum += l.connections_accepted || 0;
    }
    const prevSalesProg = prevSentSum > 0 ? Math.round((prevAcceptedSum / prevSentSum) * 100) : 0;

    totals.growth_total_projects = prevProjects.length > 0 ? Math.round(((totals.total_projects - prevProjects.length) / prevProjects.length) * 100) : 0;
    totals.growth_sales_progress = prevSalesProg > 0 ? Math.round(((totals.sales_progress - prevSalesProg) / prevSalesProg) * 100) : 0;
    totals.growth_engineering_progress = prevEngProg > 0 ? Math.round(((totals.engineering_progress - prevEngProg) / prevEngProg) * 100) : 0;
    totals.growthPct = totals.growth_engineering_progress;
  }

  const chartData = Array.from(bucketsMap.values());

  return {
    period,
    todayFormatted,
    role,
    totals,
    chartData,
  };
}

// Helper to determine bucket key for matching log records
function getBucketKey(dateStr: string, period: string, keys: string[]): string {
  if (period === "daily") {
    return dateStr;
  } else if (period === "weekly") {
    const logD = new Date(dateStr);
    let minDiff = Infinity;
    let bucketKey = "";
    for (const k of keys) {
      const diff = Math.abs(new Date(k).getTime() - logD.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        bucketKey = k;
      }
    }
    return bucketKey;
  } else {
    return dateStr.substring(0, 7);
  }
}

// Helper to get end date of a bucket
function getBucketEndDate(key: string, period: string): Date {
  if (period === "daily") {
    return new Date(key + "T23:59:59");
  } else if (period === "weekly") {
    const d = new Date(key);
    d.setDate(d.getDate() + 7);
    return d;
  } else {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m, 0, 23, 59, 59);
  }
}
