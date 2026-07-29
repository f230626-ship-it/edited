"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  aggregateInvitations,
  aggregateConnections,
  mergePeriodMetrics,
  computeReportingWindow,
} from "@/lib/linkedin/outreach-metrics";

export interface OutreachProfile {
  id: string;
  name: string;
  isPartialData: boolean;
  employeeId?: string;
}

export interface PeriodMetric {
  period: string; // e.g. "'26Q1", "'26 Jan", "W1 Jan"
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number; // percentage float 0-100
  messagesSent: number;
  initialMessages: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number; // percentage float 0-100
}

export interface OutreachDashboardData {
  reportingWindow: {
    startDate: string;
    endDate: string;
  };
  profiles: OutreachProfile[];
  selectedProfileId: string;
  granularity: "weekly" | "monthly" | "quarterly";
  kpis: {
    invitesSent: number;
    connectionsMade: number;
    acceptanceRate: number;
    messagesSent: number;
    followUpsSent: number;
    repliesReceived: number;
    replyRate: number;
  };
  chartData: PeriodMetric[];
}

// Fixed baseline profiles matching reference dataset
const BASELINE_PROFILES: OutreachProfile[] = [
  { id: "fiza-s", name: "Fiza S.", isPartialData: true },
  { id: "usama-s", name: "M. Usama (Sam)", isPartialData: true },
  { id: "abdul-h", name: "Abdul Hafeez", isPartialData: false },
  { id: "abdullah-s", name: "Abdullah S.", isPartialData: false },
];

export async function getLinkedInOutreachData(
  selectedProfileId: string = "abdullah-s",
  granularity: "weekly" | "monthly" | "quarterly" = "quarterly"
): Promise<OutreachDashboardData> {
  const supabase = createAdminClient();

  // Fetch available profiles from sales_profiles & linkedin_imports if available
  let profiles: OutreachProfile[] = [...BASELINE_PROFILES];

  try {
    const { data: dbProfiles } = await supabase
      .from("sales_profiles")
      .select("id, name, employee_id")
      .eq("is_active", true);

    if (dbProfiles && dbProfiles.length > 0) {
      const mapped = dbProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        isPartialData: false,
        employeeId: p.employee_id,
      }));
      // Merge with baseline without duplicates
      const existingNames = new Set(mapped.map((m) => m.name.toLowerCase()));
      const extraBaseline = BASELINE_PROFILES.filter(
        (b) => !existingNames.has(b.name.toLowerCase())
      );
      profiles = [...mapped, ...extraBaseline];
    }
  } catch (e) {
    console.error("Error fetching db profiles:", e);
  }

  // Ensure selectedProfileId is valid
  const currentProfile =
    profiles.find((p) => p.id === selectedProfileId) || profiles[profiles.length - 1];

  // Try fetching actual data for this profile from Supabase
  let logs: any[] = [];
  let invitations: any[] = [];
  let connections: any[] = [];
  if (currentProfile.employeeId || currentProfile.id) {
    try {
      const [logsRes, invRes, connRes] = await Promise.all([
        supabase
          .from("sales_daily_logs")
          .select("*")
          .or(`profile_id.eq.${currentProfile.id},employee_id.eq.${currentProfile.employeeId || currentProfile.id}`),
        supabase
          .from("linkedin_invitations")
          .select("*")
          .or(`employee_id.eq.${currentProfile.employeeId || currentProfile.id}`),
        supabase
          .from("linkedin_connections")
          .select("*")
          .or(`employee_id.eq.${currentProfile.employeeId || currentProfile.id}`),
      ]);
      logs = logsRes.data || [];
      invitations = invRes.data || [];
      connections = connRes.data || [];
    } catch (e) {
      console.error("Error querying data:", e);
    }
  }

  // Generate periods and metrics from real data
  const chartData = generateMetricsForProfile(
    granularity,
    logs,
    invitations,
    connections
  );

  // Compute aggregate KPIs from chartData
  const invitesSent = chartData.reduce((acc, curr) => acc + curr.invitesSent, 0);
  const connectionsMade = chartData.reduce((acc, curr) => acc + curr.connectionsMade, 0);
  const acceptanceRate =
    invitesSent > 0 ? parseFloat(((connectionsMade / invitesSent) * 100).toFixed(1)) : 0;

  const followUpsSent = chartData.reduce((acc, curr) => acc + curr.followUpsSent, 0);
  const initialMessages = chartData.reduce((acc, curr) => acc + curr.initialMessages, 0);
  const messagesSent = chartData.reduce(
    (acc, curr) => acc + curr.messagesSent,
    0
  );
  const repliesReceived = chartData.reduce((acc, curr) => acc + curr.repliesReceived, 0);
  const replyRate =
    messagesSent > 0 ? parseFloat(((repliesReceived / messagesSent) * 100).toFixed(1)) : 0;

  // Compute actual reporting window from available data
  const reportingWindow = computeReportingWindow(logs, invitations, connections);

  return {
    reportingWindow,
    profiles,
    selectedProfileId: currentProfile.id,
    granularity,
    kpis: {
      invitesSent,
      connectionsMade,
      acceptanceRate,
      messagesSent,
      followUpsSent,
      repliesReceived,
      replyRate,
    },
    chartData,
  };
}

function generateMetricsForProfile(
  granularity: "weekly" | "monthly" | "quarterly",
  logs: any[],
  invitations: any[],
  connections: any[]
): PeriodMetric[] {
  // Collect metrics from all available real data sources
  const sources: PeriodMetric[][] = [];

  const hasInvitations = invitations && invitations.length > 0;
  const hasConnections = connections && connections.length > 0;
  const hasLogs = logs && logs.length > 0;

  if (hasInvitations) {
    sources.push(aggregateInvitations(invitations, granularity));
  }
  if (hasConnections) {
    sources.push(aggregateConnections(connections, granularity));
  }
  if (hasLogs) {
    sources.push(aggregateLogs(logs, granularity));
  }

  return mergePeriodMetrics(...sources);
}

function aggregateLogs(logs: any[], granularity: "weekly" | "monthly" | "quarterly"): PeriodMetric[] {
  const map = new Map<string, {
    invitesSent: number;
    connectionsMade: number;
    messagesSent: number;
    followUpsSent: number;
    repliesReceived: number;
  }>();

  for (const log of logs) {
    if (!log.log_date) continue;
    const d = new Date(log.log_date);
    let key = "";
    if (granularity === "quarterly") {
      const q = Math.floor(d.getMonth() / 3) + 1;
      const yr = String(d.getFullYear()).slice(2);
      key = `'${yr}Q${q}`;
    } else if (granularity === "monthly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const yr = String(d.getFullYear()).slice(2);
      key = `'${yr} ${monthNames[d.getMonth()]}`;
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const weekNum = Math.ceil(d.getDate() / 7);
      key = `W${weekNum} ${monthNames[d.getMonth()]}`;
    }

    if (!map.has(key)) {
      map.set(key, {
        invitesSent: 0,
        connectionsMade: 0,
        messagesSent: 0,
        followUpsSent: 0,
        repliesReceived: 0,
      });
    }

    const item = map.get(key)!;
    item.invitesSent += log.connections_sent || 0;
    item.connectionsMade += log.connections_accepted || 0;
    item.messagesSent += (log.messages_sent || 0) + (log.follow_ups_done || 0);
    item.followUpsSent += log.follow_ups_done || 0;
    item.repliesReceived += log.replies_received || 0;
  }

  return Array.from(map.entries()).map(([period, data]) => {
    const acceptanceRate =
      data.invitesSent > 0
        ? parseFloat(((data.connectionsMade / data.invitesSent) * 100).toFixed(1))
        : 0;
    const initialMessages = Math.max(0, data.messagesSent - data.followUpsSent);
    const replyRate =
      data.messagesSent > 0
        ? parseFloat(((data.repliesReceived / data.messagesSent) * 100).toFixed(1))
        : 0;

    return {
      period,
      invitesSent: data.invitesSent,
      connectionsMade: data.connectionsMade,
      acceptanceRate,
      messagesSent: data.messagesSent,
      initialMessages,
      followUpsSent: data.followUpsSent,
      repliesReceived: data.repliesReceived,
      replyRate,
    };
  });
}
