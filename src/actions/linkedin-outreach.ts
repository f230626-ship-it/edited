"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee, canAccessSales, isSalesOwner } from "@/lib/auth";
import {
  aggregateInvitations,
  aggregateConnections,
  mergePeriodMetrics,
  computeKpis,
  computeReportingWindow,
  type Granularity,
  type PeriodMetric,
} from "@/lib/linkedin/outreach-metrics";
import { classifyMessagesByConversation } from "@/lib/linkedin/period-rollup";
import { postSlackMessage } from "@/lib/slack";
import { currentKarachiYearMonth } from "@/lib/linkedin/reminder-schedule";

export interface OutreachProfile {
  id: string;
  name: string;
  isPartialData: boolean;
  employeeId?: string | null;
  handlerName?: string | null;
  lastSyncedAt?: string | null;
}

export interface OutreachDashboardData {
  reportingWindow: { startDate: string; endDate: string };
  profiles: OutreachProfile[];
  selectedProfileId: string;
  compareProfileId: string | null;
  granularity: Granularity;
  /** "all" or "YYYY-MM" */
  selectedMonthKey: string;
  availableMonths: { key: string; label: string; year: number; month: number }[];
  kpis: ReturnType<typeof computeKpis>;
  compareKpis: ReturnType<typeof computeKpis> | null;
  chartData: PeriodMetric[];
  compareChartData: PeriodMetric[];
  glanceRows: {
    profileId: string;
    name: string;
    invitesSent: number;
    connectionsMade: number;
    acceptanceRate: number;
    messagesSent: number;
    followUpsSent: number;
    repliesReceived: number;
    replyRate: number;
  }[];
  isAdmin: boolean;
}

type PeriodStatRow = {
  sales_profile_id: string;
  period_year: number;
  period_month: number;
  invites_sent: number;
  connections_made: number;
  acceptance_rate: number;
  messages_sent: number;
  initial_messages: number;
  follow_ups_sent: number;
  replies_received: number;
  reply_rate: number;
  is_partial: boolean;
  synced_at: string;
};

function monthLabel(year: number, month: number): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `'${String(year).slice(2)} ${names[month - 1]}`;
}

function quarterLabel(year: number, month: number): string {
  const q = Math.floor((month - 1) / 3) + 1;
  return `'${String(year).slice(2)}Q${q}`;
}

function periodStatsToMetrics(
  rows: PeriodStatRow[],
  granularity: Granularity
): PeriodMetric[] {
  if (granularity === "monthly") {
    return rows.map((r) => ({
      period: monthLabel(r.period_year, r.period_month),
      invitesSent: r.invites_sent,
      connectionsMade: r.connections_made,
      acceptanceRate: Number(r.acceptance_rate),
      messagesSent: r.messages_sent,
      initialMessages: r.initial_messages,
      followUpsSent: r.follow_ups_sent,
      repliesReceived: r.replies_received,
      replyRate: Number(r.reply_rate),
    }));
  }

  // quarterly: roll months up
  const map = new Map<
    string,
    {
      invitesSent: number;
      connectionsMade: number;
      messagesSent: number;
      initialMessages: number;
      followUpsSent: number;
      repliesReceived: number;
    }
  >();

  for (const r of rows) {
    const key = quarterLabel(r.period_year, r.period_month);
    if (!map.has(key)) {
      map.set(key, {
        invitesSent: 0,
        connectionsMade: 0,
        messagesSent: 0,
        initialMessages: 0,
        followUpsSent: 0,
        repliesReceived: 0,
      });
    }
    const item = map.get(key)!;
    item.invitesSent += r.invites_sent;
    item.connectionsMade += r.connections_made;
    item.messagesSent += r.messages_sent;
    item.initialMessages += r.initial_messages;
    item.followUpsSent += r.follow_ups_sent;
    item.repliesReceived += r.replies_received;
  }

  return Array.from(map.entries())
    .map(([period, data]) => {
      const acceptanceRate =
        data.invitesSent > 0
          ? parseFloat(((data.connectionsMade / data.invitesSent) * 100).toFixed(1))
          : 0;
      const replyRate =
        data.messagesSent > 0
          ? parseFloat(((data.repliesReceived / data.messagesSent) * 100).toFixed(1))
          : 0;
      return { period, ...data, acceptanceRate, replyRate };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

async function loadWeeklyFromRaw(
  supabase: ReturnType<typeof createAdminClient>,
  salesProfileId: string
): Promise<PeriodMetric[]> {
  const { data: latestImport } = await supabase
    .from("linkedin_imports")
    .select("id")
    .eq("sales_profile_id", salesProfileId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestImport) return [];

  const [{ data: invitations }, { data: connections }, { data: messages }] = await Promise.all([
    supabase
      .from("linkedin_invitations")
      .select("direction, invitation_date")
      .eq("import_id", latestImport.id),
    supabase
      .from("linkedin_connections")
      .select("connected_on")
      .eq("import_id", latestImport.id),
    supabase
      .from("linkedin_messages")
      .select(
        "conversation_id, from_name, to_name, sent_at, is_from_owner, folder, content_preview, conversation_title, sender_profile_url, recipient_profile_urls, subject"
      )
      .eq("import_id", latestImport.id),
  ]);

  const invMetrics = aggregateInvitations(
    (invitations || []).map((i) => ({
      direction: i.direction,
      invitation_date: i.invitation_date,
    })),
    "weekly"
  );
  const connMetrics = aggregateConnections(
    (connections || []).map((c) => ({ connected_on: c.connected_on })),
    "weekly"
  );

  const classified = classifyMessagesByConversation(
    (messages || []).map((m) => ({
      conversation_id: m.conversation_id,
      conversation_title: m.conversation_title,
      from_name: m.from_name,
      to_name: m.to_name,
      sender_profile_url: m.sender_profile_url,
      recipient_profile_urls: m.recipient_profile_urls,
      sent_at: m.sent_at,
      subject: m.subject,
      content_preview: m.content_preview,
      folder: m.folder,
      is_from_owner: m.is_from_owner,
    }))
  );

  const msgMap = new Map<
    string,
    {
      messagesSent: number;
      initialMessages: number;
      followUpsSent: number;
      repliesReceived: number;
      invitesSent: number;
      connectionsMade: number;
    }
  >();

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (const msg of classified) {
    const d = new Date(msg.sent_at);
    if (Number.isNaN(d.getTime())) continue;
    const weekNum = Math.ceil(d.getUTCDate() / 7);
    const key = `W${weekNum} ${monthNames[d.getUTCMonth()]}`;
    if (!msgMap.has(key)) {
      msgMap.set(key, {
        messagesSent: 0,
        initialMessages: 0,
        followUpsSent: 0,
        repliesReceived: 0,
        invitesSent: 0,
        connectionsMade: 0,
      });
    }
    const item = msgMap.get(key)!;
    if (msg.is_initial || msg.is_follow_up) {
      item.messagesSent += 1;
      if (msg.is_initial) item.initialMessages += 1;
      if (msg.is_follow_up) item.followUpsSent += 1;
    }
    if (msg.is_reply) item.repliesReceived += 1;
  }

  const msgMetrics: PeriodMetric[] = Array.from(msgMap.entries()).map(([period, data]) => ({
    period,
    invitesSent: 0,
    connectionsMade: 0,
    acceptanceRate: 0,
    messagesSent: data.messagesSent,
    initialMessages: data.initialMessages,
    followUpsSent: data.followUpsSent,
    repliesReceived: data.repliesReceived,
    replyRate:
      data.messagesSent > 0
        ? parseFloat(((data.repliesReceived / data.messagesSent) * 100).toFixed(1))
        : 0,
  }));

  return mergePeriodMetrics(invMetrics, connMetrics, msgMetrics);
}

export async function listLinkedInUploadProfiles(): Promise<OutreachProfile[]> {
  const employee = await getCurrentEmployee();
  if (!employee || !canAccessSales(employee)) return [];

  const supabase = createAdminClient();
  const isAdmin = isSalesOwner(employee.role);

  // Avoid ambiguous embed: sales_profiles has multiple FKs to employees
  // (employee_id + created_by). Select without join first.
  let query = supabase
    .from("sales_profiles")
    .select("id, name, employee_id, is_active, platform")
    .eq("is_active", true)
    .order("name");

  if (!isAdmin) {
    query = query.eq("employee_id", employee.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[listLinkedInUploadProfiles]", error.message);
    return [];
  }

  let rows = (data || []).filter(
    (p) => !p.platform || p.platform === "linkedin"
  );

  const handlerIds = Array.from(
    new Set(rows.map((p) => p.employee_id).filter(Boolean))
  ) as string[];
  const handlerNames = new Map<string, string>();
  if (handlerIds.length > 0) {
    const { data: handlers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", handlerIds);
    for (const h of handlers || []) handlerNames.set(h.id, h.full_name);
  }

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    isPartialData: false,
    employeeId: p.employee_id,
    handlerName: p.employee_id ? handlerNames.get(p.employee_id) ?? null : null,
  }));
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function sumPeriodRows(rows: PeriodStatRow[]): PeriodMetric {
  const invitesSent = rows.reduce((s, r) => s + r.invites_sent, 0);
  const connectionsMade = rows.reduce((s, r) => s + r.connections_made, 0);
  const messagesSent = rows.reduce((s, r) => s + r.messages_sent, 0);
  const initialMessages = rows.reduce((s, r) => s + r.initial_messages, 0);
  const followUpsSent = rows.reduce((s, r) => s + r.follow_ups_sent, 0);
  const repliesReceived = rows.reduce((s, r) => s + r.replies_received, 0);
  return {
    period: rows.length === 1 ? monthLabel(rows[0].period_year, rows[0].period_month) : "All",
    invitesSent,
    connectionsMade,
    acceptanceRate:
      invitesSent > 0
        ? parseFloat(((connectionsMade / invitesSent) * 100).toFixed(1))
        : 0,
    messagesSent,
    initialMessages,
    followUpsSent,
    repliesReceived,
    replyRate:
      messagesSent > 0
        ? parseFloat(((repliesReceived / messagesSent) * 100).toFixed(1))
        : 0,
  };
}

export async function getLinkedInOutreachData(
  selectedProfileId?: string,
  granularity: Granularity = "monthly",
  compareProfileId: string | null = null,
  selectedMonthKey?: string
): Promise<OutreachDashboardData> {
  const employee = await getCurrentEmployee();
  const empty: OutreachDashboardData = {
    reportingWindow: { startDate: "", endDate: "" },
    profiles: [],
    selectedProfileId: selectedProfileId || "",
    compareProfileId,
    granularity,
    selectedMonthKey: selectedMonthKey || "all",
    availableMonths: [],
    kpis: computeKpis([]),
    compareKpis: null,
    chartData: [],
    compareChartData: [],
    glanceRows: [],
    isAdmin: employee ? isSalesOwner(employee.role) : false,
  };

  if (!employee || !canAccessSales(employee)) return empty;

  const supabase = createAdminClient();
  const isAdmin = isSalesOwner(employee.role);

  let profileQuery = supabase
    .from("sales_profiles")
    .select("id, name, employee_id, is_active, platform")
    .eq("is_active", true)
    .order("name");

  if (!isAdmin) {
    profileQuery = profileQuery.eq("employee_id", employee.id);
  }

  const { data: dbProfiles, error: profileLoadError } = await profileQuery;
  if (profileLoadError) {
    console.error("[getLinkedInOutreachData] profiles", profileLoadError.message);
  }

  let profilesRaw = (dbProfiles || []).filter(
    (p) => !p.platform || p.platform === "linkedin"
  );

  const handlerIds = Array.from(
    new Set(profilesRaw.map((p) => p.employee_id).filter(Boolean))
  ) as string[];
  const handlerNames = new Map<string, string>();
  if (handlerIds.length > 0) {
    const { data: handlers } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", handlerIds);
    for (const h of handlers || []) handlerNames.set(h.id, h.full_name);
  }

  const profileIds = profilesRaw.map((p) => p.id);

  const { data: periodStats } = profileIds.length
    ? await supabase
        .from("linkedin_profile_period_stats")
        .select("*")
        .in("sales_profile_id", profileIds)
    : { data: [] as PeriodStatRow[] };

  const stats = (periodStats || []) as PeriodStatRow[];
  const partialByProfile = new Map<string, boolean>();
  const lastSyncByProfile = new Map<string, string>();
  for (const row of stats) {
    if (row.is_partial) partialByProfile.set(row.sales_profile_id, true);
    const prev = lastSyncByProfile.get(row.sales_profile_id);
    if (!prev || row.synced_at > prev) lastSyncByProfile.set(row.sales_profile_id, row.synced_at);
  }

  const { data: imports } = profileIds.length
    ? await supabase
        .from("linkedin_imports")
        .select("sales_profile_id, is_partial, completed_at")
        .in("sales_profile_id", profileIds)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
    : { data: [] as { sales_profile_id: string; is_partial: boolean; completed_at: string }[] };

  const seenImport = new Set<string>();
  for (const imp of imports || []) {
    if (!imp.sales_profile_id || seenImport.has(imp.sales_profile_id)) continue;
    seenImport.add(imp.sales_profile_id);
    if (imp.is_partial) partialByProfile.set(imp.sales_profile_id, true);
    if (imp.completed_at) lastSyncByProfile.set(imp.sales_profile_id, imp.completed_at);
  }

  const profiles: OutreachProfile[] = profilesRaw.map((p) => ({
    id: p.id,
    name: p.name,
    isPartialData: false,
    employeeId: p.employee_id,
    handlerName: p.employee_id ? handlerNames.get(p.employee_id) ?? null : null,
    lastSyncedAt: lastSyncByProfile.get(p.id) ?? null,
  }));

  const selected =
    profiles.find((p) => p.id === selectedProfileId)?.id || profiles[0]?.id || "";

  const monthMap = new Map<string, { year: number; month: number }>();
  for (const row of stats) {
    monthMap.set(monthKey(row.period_year, row.period_month), {
      year: row.period_year,
      month: row.period_month,
    });
  }
  const availableMonths = Array.from(monthMap.entries())
    .map(([key, v]) => ({
      key,
      year: v.year,
      month: v.month,
      label: monthLabel(v.year, v.month),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));

  // Default to latest month with data so the dashboard is not empty
  const defaultMonthKey = availableMonths[0]?.key || "all";
  const monthKeySelected =
    selectedMonthKey &&
    (selectedMonthKey === "all" || availableMonths.some((m) => m.key === selectedMonthKey))
      ? selectedMonthKey
      : defaultMonthKey;

  const filterRows = (profileId: string) => {
    let rows = stats.filter((s) => s.sales_profile_id === profileId);
    if (monthKeySelected !== "all") {
      rows = rows.filter(
        (s) => monthKey(s.period_year, s.period_month) === monthKeySelected
      );
    }
    return rows;
  };

  async function metricsFor(profileId: string): Promise<PeriodMetric[]> {
    if (!profileId) return [];
    if (granularity === "weekly") {
      return loadWeeklyFromRaw(supabase, profileId);
    }
    const rows =
      monthKeySelected === "all"
        ? stats.filter((s) => s.sales_profile_id === profileId)
        : filterRows(profileId);
    // For a single-month filter with monthly granularity, still return that month as one bar
    return periodStatsToMetrics(rows, granularity);
  }

  const chartData = await metricsFor(selected);
  const compareId =
    compareProfileId && compareProfileId !== selected ? compareProfileId : null;
  const compareChartData = compareId ? await metricsFor(compareId) : [];

  const selectedKpiMetric = sumPeriodRows(filterRows(selected));
  const compareKpiMetric = compareId
    ? sumPeriodRows(filterRows(compareId))
    : null;

  const glanceRows = profiles.map((p) => {
    const m = sumPeriodRows(filterRows(p.id));
    return {
      profileId: p.id,
      name: p.name,
      invitesSent: m.invitesSent,
      connectionsMade: m.connectionsMade,
      acceptanceRate: m.acceptanceRate,
      messagesSent: m.messagesSent,
      followUpsSent: m.followUpsSent,
      repliesReceived: m.repliesReceived,
      replyRate: m.replyRate,
    };
  });

  const windowDates =
    monthKeySelected !== "all"
      ? {
          startDate: `${monthKeySelected}-01`,
          endDate: monthKeySelected,
        }
      : chartData.length
        ? computeReportingWindow(
            [],
            stats
              .filter((s) => s.sales_profile_id === selected)
              .map((s) => ({
                direction: "OUTGOING",
                invitation_date: `${s.period_year}-${String(s.period_month).padStart(2, "0")}-01`,
              })),
            []
          )
        : { startDate: "", endDate: "" };

  return {
    reportingWindow: windowDates,
    profiles,
    selectedProfileId: selected,
    compareProfileId: compareId,
    granularity,
    selectedMonthKey: monthKeySelected,
    availableMonths,
    kpis: computeKpis([selectedKpiMetric]),
    compareKpis: compareKpiMetric ? computeKpis([compareKpiMetric]) : null,
    chartData,
    compareChartData,
    glanceRows,
    isAdmin,
  };
}

/**
 * Get the authoritative upload status for the current month.
 * Returns which required profiles have/haven't uploaded.
 * Tracks at the PROFILE level, not the handler level.
 */
async function getUploadStatus(year: number, month: number): Promise<{
  required: { employeeId: string; name: string; profileId: string; profileName: string }[];
  uploadedProfileIds: Set<string>;
  missing: { employeeId: string; name: string; profileId: string; profileName: string }[];
}> {
  const supabase = createAdminClient();

  // All active LinkedIn sales profiles with assigned employees
  const { data: profiles } = await supabase
    .from("sales_profiles")
    .select("id, name, employee_id, platform")
    .eq("is_active", true);

  const linkedInProfiles = (profiles || []).filter(
    (p) => (!p.platform || p.platform === "linkedin") && p.employee_id
  );

  // Get employee (handler) names
  const handlerIds = [...new Set(linkedInProfiles.map((p) => p.employee_id))] as string[];
  const handlersById = new Map<string, string>();
  if (handlerIds.length > 0) {
    const { data: emps } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", handlerIds);
    for (const e of emps || []) handlersById.set(e.id, e.full_name || "Unknown");
  }

  // Build required list: one entry per PROFILE (not per handler)
  const required = linkedInProfiles.map((p) => ({
    employeeId: p.employee_id!,
    name: handlersById.get(p.employee_id!) || "Unknown",
    profileId: p.id,
    profileName: p.name,
  }));

  // Get profiles that already have period stats for this month
  const { data: existingStats } = await supabase
    .from("linkedin_profile_period_stats")
    .select("sales_profile_id")
    .eq("period_year", year)
    .eq("period_month", month);

  const uploadedProfileIds = new Set((existingStats || []).map((s) => s.sales_profile_id));

  // A profile is "uploaded" if it has period stats for this month
  const missing: typeof required = [];
  for (const r of required) {
    if (!uploadedProfileIds.has(r.profileId)) {
      missing.push(r);
    }
  }

  return { required, uploadedProfileIds, missing };
}

/**
 * Check if ALL required profiles have uploaded for the current month.
 * If yes AND report not already sent → generate report and email admin.
 * Called after every successful upload.
 */
export async function checkAllUploadedAndSendReport(): Promise<{
  allUploaded: boolean;
  reportSent: boolean;
  uploadedCount: number;
  requiredCount: number;
  missingProfiles: string[];
  error?: string;
}> {
  const { year, month } = currentKarachiYearMonth(new Date());
  const supabase = createAdminClient();

  const status = await getUploadStatus(year, month);

  // All uploaded = every required profile has period stats
  const allUploaded = status.required.length > 0 && status.missing.length === 0;

  if (!allUploaded) {
    return {
      allUploaded: false,
      reportSent: false,
      uploadedCount: status.required.length - status.missing.length,
      requiredCount: status.required.length,
      missingProfiles: status.missing.map((m) => m.profileName),
    };
  }

  // Check if report already sent
  const { data: existingReport } = await supabase
    .from("monthly_report_log")
    .select("id")
    .eq("period_year", year)
    .eq("period_month", month)
    .eq("status", "sent")
    .maybeSingle();

  if (existingReport) {
    return {
      allUploaded: true,
      reportSent: true,
      uploadedCount: status.required.length,
      requiredCount: status.required.length,
      missingProfiles: [],
    };
  }

  // Generate and send the report immediately
  try {
    const { generateAndSendMonthlyReport } = await import("@/actions/monthly-report");
    const result = await generateAndSendMonthlyReport(true);
    return {
      allUploaded: true,
      reportSent: result.success,
      uploadedCount: status.required.length,
      requiredCount: status.required.length,
      missingProfiles: [],
      error: result.error,
    };
  } catch (e: any) {
    return {
      allUploaded: true,
      reportSent: false,
      uploadedCount: status.required.length,
      requiredCount: status.required.length,
      missingProfiles: [],
      error: e.message || "Report generation failed",
    };
  }
}

/**
 * Wednesday 3PM initial reminder: ONE message in the Sales channel
 * listing missing profiles and their responsible handlers.
 */
export async function runLinkedInExportReminderCron(force = false): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
  reason?: string;
}> {
  const { year, month } = currentKarachiYearMonth(new Date());
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hrms.mindvista.io";

  const hasSlack = !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_CHANNEL_ID;
  if (!hasSlack) {
    return { sent: 0, skipped: 0, errors: [], reason: "Slack not configured" };
  }

  const status = await getUploadStatus(year, month);

  if (status.required.length === 0) {
    return { sent: 0, skipped: 0, errors: [], reason: "No active LinkedIn sales profiles" };
  }

  if (status.missing.length === 0) {
    return { sent: 0, skipped: status.required.length, errors: [], reason: "All profiles already uploaded" };
  }

  const monthLabel = `${["January","February","March","April","May","June","July","August","September","October","November","December"][month - 1]} ${year}`;
  const completedCount = status.required.length - status.missing.length;

  // Build missing profiles list with handler names
  const missingList = status.missing.map((m) => `• *${m.profileName}* — handled by ${m.name}`).join("\n");

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 LinkedIn Export Reminder — ${monthLabel}`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hi team 👋\n\nPlease upload the remaining LinkedIn exports for the following profiles:\n\n${missingList}\n\n*Upload status:* ${completedCount}/${status.required.length} profiles completed\n\nPlease upload the required LinkedIn exports to the dashboard. Once all required profiles are uploaded successfully, the monthly Sales report will be generated automatically and sent to the admin.`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Upload LinkedIn Export", emoji: true },
          url: `${appUrl}/sales/linkedin?upload=1`,
          style: "primary",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "_Go to LinkedIn Settings > Data Privacy > Get a copy of your data > Request archive. Once ready, download the ZIP and upload it via the button above._",
        },
      ],
    },
  ];

  const channelText = `LinkedIn Export Reminder — ${monthLabel}\n${completedCount}/${status.required.length} profiles uploaded.\nStill need:\n${status.missing.map((m) => `- ${m.profileName} (${m.name})`).join("\n")}\nUpload: ${appUrl}/sales/linkedin?upload=1`;

  let delivered = false;
  let deliveryError = "";

  try {
    const ts = await postSlackMessage(process.env.SLACK_CHANNEL_ID!, channelText, blocks as any);
    if (ts) delivered = true;
    else deliveryError = "Slack postMessage returned null";
  } catch (e: any) {
    deliveryError = e.message || "slack request failed";
  }

  // Log for all missing handlers
  for (const m of status.missing) {
    await supabase.from("linkedin_export_reminders").upsert(
      {
        employee_id: m.employeeId,
        period_year: year,
        period_month: month,
        profile_ids: [m.profileId],
        status: delivered ? "sent" : "failed",
        message: delivered ? "Wednesday channel reminder" : deliveryError,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,period_year,period_month" }
    );
  }

  return {
    sent: delivered ? 1 : 0,
    skipped: completedCount,
    errors: delivered ? [] : [deliveryError || "Slack post failed"],
  };
}

/**
 * Thursday 3PM follow-up: ONE message in the Sales channel
 * listing ONLY profiles that are STILL missing after 24 hours.
 * Also checks if all uploaded and triggers report.
 */
export async function runFollowUpReminders(): Promise<{
  sent: number;
  errors: string[];
  allUploaded: boolean;
  reportSent: boolean;
}> {
  const { year, month } = currentKarachiYearMonth(new Date());
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hrms.mindvista.io";

  const hasSlack = !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_CHANNEL_ID;
  if (!hasSlack) return { sent: 0, errors: ["Slack not configured"], allUploaded: false, reportSent: false };

  const status = await getUploadStatus(year, month);

  if (status.required.length === 0) {
    return { sent: 0, errors: [], allUploaded: false, reportSent: false };
  }

  // Check if all uploaded (profile-level check)
  const allUploaded = status.missing.length === 0;

  if (allUploaded) {
    // All uploaded — generate report immediately
    const reportResult = await checkAllUploadedAndSendReport();
    return { sent: 0, errors: [], allUploaded: true, reportSent: reportResult.reportSent };
  }

  const monthLabel = `${["January","February","March","April","May","June","July","August","September","October","November","December"][month - 1]} ${year}`;

  // Build follow-up list with handler names
  const missingList = status.missing.map((m) => `• *${m.profileName}* — handled by ${m.name}`).join("\n");

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 LinkedIn Export Follow-up — ${monthLabel}`, emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `The following LinkedIn exports are still pending:\n\n${missingList}\n\nPlease upload the remaining exports to complete this month's Sales report.`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Upload LinkedIn Export", emoji: true },
          url: `${appUrl}/sales/linkedin?upload=1`,
          style: "primary",
        },
      ],
    },
  ];

  const channelText = `LinkedIn Export Follow-up — ${monthLabel}\nStill pending:\n${status.missing.map((m) => `- ${m.profileName} (${m.name})`).join("\n")}\nUpload: ${appUrl}/sales/linkedin?upload=1`;

  let delivered = false;
  let deliveryError = "";

  try {
    const ts = await postSlackMessage(process.env.SLACK_CHANNEL_ID!, channelText, blocks as any);
    if (ts) delivered = true;
    else deliveryError = "Slack postMessage returned null";
  } catch (e: any) {
    deliveryError = e.message || "slack request failed";
  }

  // Log follow-ups
  for (const m of status.missing) {
    await supabase.from("linkedin_export_reminders").upsert(
      {
        employee_id: m.employeeId,
        period_year: year,
        period_month: month,
        profile_ids: [m.profileId],
        status: delivered ? "sent" : "failed",
        message: delivered ? "Thursday channel follow-up" : deliveryError,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,period_year,period_month" }
    );
  }

  return {
    sent: delivered ? 1 : 0,
    errors: delivered ? [] : [deliveryError || "Slack post failed"],
    allUploaded: false,
    reportSent: false,
  };
}
