export type Granularity = "weekly" | "monthly" | "quarterly";

export interface PeriodMetric {
  period: string;
  invitesSent: number;
  connectionsMade: number;
  acceptanceRate: number;
  messagesSent: number;
  initialMessages: number;
  followUpsSent: number;
  repliesReceived: number;
  replyRate: number;
}

interface DailyLogRow {
  log_date: string;
  connections_sent?: number | null;
  connections_accepted?: number | null;
  messages_sent?: number | null;
  follow_ups_done?: number | null;
  replies_received?: number | null;
}

interface InvitationRow {
  direction: string;
  invitation_date?: string | null;
}

interface ConnectionRow {
  connected_on?: string | null;
}

function periodKey(date: Date, granularity: Granularity): string {
  if (granularity === "quarterly") {
    const q = Math.floor(date.getMonth() / 3) + 1;
    const yr = String(date.getFullYear()).slice(2);
    return `'${yr}Q${q}`;
  }

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  if (granularity === "monthly") {
    const yr = String(date.getFullYear()).slice(2);
    return `'${yr} ${monthNames[date.getMonth()]}`;
  }

  const weekNum = Math.ceil(date.getDate() / 7);
  return `W${weekNum} ${monthNames[date.getMonth()]}`;
}

function emptyBucket() {
  return {
    invitesSent: 0,
    connectionsMade: 0,
    messagesSent: 0,
    initialMessages: 0,
    followUpsSent: 0,
    repliesReceived: 0,
  };
}

function finalizePeriod(
  period: string,
  data: ReturnType<typeof emptyBucket>
): PeriodMetric {
  const acceptanceRate =
    data.invitesSent > 0
      ? parseFloat(((data.connectionsMade / data.invitesSent) * 100).toFixed(1))
      : 0;
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
    initialMessages: data.initialMessages,
    followUpsSent: data.followUpsSent,
    repliesReceived: data.repliesReceived,
    replyRate,
  };
}

function sortPeriods(a: PeriodMetric, b: PeriodMetric): number {
  return a.period.localeCompare(b.period);
}

/** Aggregate daily CRM logs — primary source for profile-specific outreach metrics. */
export function aggregateDailyLogs(
  logs: DailyLogRow[],
  granularity: Granularity
): PeriodMetric[] {
  const map = new Map<string, ReturnType<typeof emptyBucket>>();

  for (const log of logs) {
    if (!log.log_date) continue;
    const d = new Date(log.log_date);
    if (Number.isNaN(d.getTime())) continue;

    const key = periodKey(d, granularity);
    if (!map.has(key)) map.set(key, emptyBucket());

    const item = map.get(key)!;
    item.invitesSent += log.connections_sent || 0;
    item.connectionsMade += log.connections_accepted || 0;
    item.initialMessages += log.messages_sent || 0;
    item.followUpsSent += log.follow_ups_done || 0;
    item.messagesSent += (log.messages_sent || 0) + (log.follow_ups_done || 0);
    item.repliesReceived += log.replies_received || 0;
  }

  return Array.from(map.entries())
    .map(([period, data]) => finalizePeriod(period, data))
    .sort(sortPeriods);
}

/** Aggregate LinkedIn Invitations.csv rows (employee-level, not profile-specific). */
export function aggregateInvitations(
  invitations: InvitationRow[],
  granularity: Granularity
): PeriodMetric[] {
  const map = new Map<string, ReturnType<typeof emptyBucket>>();

  for (const inv of invitations) {
    const dir = inv.direction?.toUpperCase();
    if ((dir !== "OUTGOING" && dir !== "SENT") || !inv.invitation_date) continue;
    const d = new Date(inv.invitation_date);
    if (Number.isNaN(d.getTime())) continue;

    const key = periodKey(d, granularity);
    if (!map.has(key)) map.set(key, emptyBucket());
    map.get(key)!.invitesSent += 1;
  }

  return Array.from(map.entries())
    .map(([period, data]) => finalizePeriod(period, data))
    .sort(sortPeriods);
}

/** Aggregate LinkedIn Connections.csv rows (employee-level). */
export function aggregateConnections(
  connections: ConnectionRow[],
  granularity: Granularity
): PeriodMetric[] {
  const map = new Map<string, ReturnType<typeof emptyBucket>>();

  for (const conn of connections) {
    if (!conn.connected_on) continue;
    const d = new Date(conn.connected_on);
    if (Number.isNaN(d.getTime())) continue;

    const key = periodKey(d, granularity);
    if (!map.has(key)) map.set(key, emptyBucket());
    map.get(key)!.connectionsMade += 1;
  }

  return Array.from(map.entries())
    .map(([period, data]) => finalizePeriod(period, data))
    .sort(sortPeriods);
}

/** Merge period metrics, summing counts and recomputing rates. */
export function mergePeriodMetrics(
  ...sources: PeriodMetric[][]
): PeriodMetric[] {
  const map = new Map<string, ReturnType<typeof emptyBucket>>();

  for (const source of sources) {
    for (const row of source) {
      if (!map.has(row.period)) map.set(row.period, emptyBucket());
      const item = map.get(row.period)!;
      item.invitesSent += row.invitesSent;
      item.connectionsMade += row.connectionsMade;
      item.messagesSent += row.messagesSent;
      item.initialMessages += row.initialMessages;
      item.followUpsSent += row.followUpsSent;
      item.repliesReceived += row.repliesReceived;
    }
  }

  return Array.from(map.entries())
    .map(([period, data]) => finalizePeriod(period, data))
    .sort(sortPeriods);
}

export function computeKpis(chartData: PeriodMetric[]) {
  const invitesSent = chartData.reduce((acc, curr) => acc + curr.invitesSent, 0);
  const connectionsMade = chartData.reduce((acc, curr) => acc + curr.connectionsMade, 0);
  const acceptanceRate =
    invitesSent > 0
      ? parseFloat(((connectionsMade / invitesSent) * 100).toFixed(1))
      : 0;
  const followUpsSent = chartData.reduce((acc, curr) => acc + curr.followUpsSent, 0);
  const messagesSent = chartData.reduce((acc, curr) => acc + curr.messagesSent, 0);
  const repliesReceived = chartData.reduce((acc, curr) => acc + curr.repliesReceived, 0);
  const replyRate =
    messagesSent > 0
      ? parseFloat(((repliesReceived / messagesSent) * 100).toFixed(1))
      : 0;

  return {
    invitesSent,
    connectionsMade,
    acceptanceRate,
    messagesSent,
    followUpsSent,
    repliesReceived,
    replyRate,
  };
}

export function computeReportingWindow(
  logs: DailyLogRow[],
  invitations: InvitationRow[],
  connections: ConnectionRow[]
): { startDate: string; endDate: string } {
  const dates: Date[] = [];

  for (const log of logs) {
    if (log.log_date) {
      const d = new Date(log.log_date);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
  }
  for (const inv of invitations) {
    if (inv.invitation_date) {
      const d = new Date(inv.invitation_date);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
  }
  for (const conn of connections) {
    if (conn.connected_on) {
      const d = new Date(conn.connected_on);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
  }

  if (dates.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const yearStart = `${new Date().getFullYear()}-01-01`;
    return { startDate: yearStart, endDate: today };
  }

  dates.sort((a, b) => a.getTime() - b.getTime());
  return {
    startDate: dates[0].toISOString().slice(0, 10),
    endDate: dates[dates.length - 1].toISOString().slice(0, 10),
  };
}
