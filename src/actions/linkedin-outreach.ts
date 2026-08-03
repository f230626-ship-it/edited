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
import { sendEmail } from "@/lib/email";
import { isLastWorkingDayOfMonth, currentKarachiYearMonth } from "@/lib/linkedin/reminder-schedule";

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

export async function sendLinkedInExportReminders(force = false): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
  reason?: string;
}> {
  const employee = await getCurrentEmployee();
  if (!employee || !isSalesOwner(employee.role)) {
    return { sent: 0, skipped: 0, errors: ["Only admins can send reminders"] };
  }

  return runLinkedInExportReminderCron(force);
}

export async function runLinkedInExportReminderCron(force = false): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
  reason?: string;
}> {
  if (!force && !isLastWorkingDayOfMonth(new Date())) {
    return { sent: 0, skipped: 0, errors: [], reason: "Not last working day of month" };
  }

  const { year, month } = currentKarachiYearMonth(new Date());
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hrms.mindvista.io";

  // Same path as password-reset: src/lib/email → Brevo/Resend.
  // Note: forgot-password can still work without these vars (Supabase SMTP fallback).
  // LinkedIn reminders cannot — they are custom transactional emails.
  const emailProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  const hasProviderKey =
    (emailProvider === "brevo" && !!process.env.BREVO_API_KEY) ||
    (emailProvider === "resend" && !!process.env.RESEND_API_KEY);
  if (!emailProvider || !hasProviderKey || !process.env.EMAIL_FROM) {
    const missing = [
      !emailProvider ? "EMAIL_PROVIDER" : null,
      emailProvider === "brevo" && !process.env.BREVO_API_KEY ? "BREVO_API_KEY" : null,
      emailProvider === "resend" && !process.env.RESEND_API_KEY ? "RESEND_API_KEY" : null,
      !process.env.EMAIL_FROM ? "EMAIL_FROM" : null,
    ].filter(Boolean);
    return {
      sent: 0,
      skipped: 0,
      errors: [
        `Missing email env in this runtime: ${missing.join(", ") || "unknown"}. ` +
          `Forgot-password can work via Supabase alone; LinkedIn reminders need the same Brevo vars (EMAIL_PROVIDER, BREVO_API_KEY, EMAIL_FROM) available here — copy them into .env.local for local, or confirm they exist on Vercel for production, then restart/redeploy.`,
      ],
      reason: "Email provider not available in this environment",
    };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("sales_profiles")
    .select("id, name, employee_id, platform")
    .eq("is_active", true);

  if (profilesError) {
    return { sent: 0, skipped: 0, errors: [profilesError.message], reason: "Failed to load profiles" };
  }

  const linkedInProfiles = (profiles || []).filter(
    (p) => !p.platform || p.platform === "linkedin"
  );

  if (!linkedInProfiles.length) {
    return {
      sent: 0,
      skipped: 0,
      errors: [],
      reason: "No active LinkedIn sales profiles — create or upload a ZIP first",
    };
  }

  // Cron skips profiles that already have this month's stats.
  // Force ("Send reminder now") always emails handlers for all assigned profiles.
  const covered = new Set<string>();
  if (!force) {
    const { data: existingStats } = await supabase
      .from("linkedin_profile_period_stats")
      .select("sales_profile_id")
      .eq("period_year", year)
      .eq("period_month", month);
    for (const s of existingStats || []) covered.add(s.sales_profile_id);
  }

  const handlerIds = Array.from(
    new Set(linkedInProfiles.map((p) => p.employee_id).filter(Boolean))
  ) as string[];
  const handlersById = new Map<string, { full_name: string; email: string }>();
  if (handlerIds.length > 0) {
    const { data: emps } = await supabase
      .from("employees")
      .select("id, full_name, email")
      .in("id", handlerIds);
    for (const e of emps || []) {
      if (e.email) handlersById.set(e.id, { full_name: e.full_name, email: e.email });
    }
  }

  type HandlerGroup = {
    employeeId: string;
    email: string;
    name: string;
    profiles: { id: string; name: string }[];
  };

  const byHandler = new Map<string, HandlerGroup>();
  let unassigned = 0;
  let alreadyCovered = 0;
  let missingEmail = 0;

  for (const p of linkedInProfiles) {
    if (!p.employee_id) {
      unassigned += 1;
      continue;
    }
    if (covered.has(p.id)) {
      alreadyCovered += 1;
      continue;
    }
    const emp = handlersById.get(p.employee_id);
    if (!emp?.email) {
      missingEmail += 1;
      continue;
    }
    if (!byHandler.has(p.employee_id)) {
      byHandler.set(p.employee_id, {
        employeeId: p.employee_id,
        email: emp.email,
        name: emp.full_name || "there",
        profiles: [],
      });
    }
    byHandler.get(p.employee_id)!.profiles.push({ id: p.id, name: p.name });
  }

  if (byHandler.size === 0) {
    const unassignedNames = linkedInProfiles
      .filter((p) => !p.employee_id)
      .map((p) => p.name);
    const parts = [
      alreadyCovered ? `${alreadyCovered} already uploaded this month` : null,
      unassigned
        ? `${unassigned} unassigned${
            unassignedNames.length
              ? ` (${unassignedNames.slice(0, 5).join(", ")}${unassignedNames.length > 5 ? "…" : ""}) — set a Rep on Sales → Profiles`
              : ""
          }`
        : null,
      missingEmail ? `${missingEmail} missing handler email` : null,
    ].filter(Boolean);
    return {
      sent: 0,
      skipped: alreadyCovered + unassigned + missingEmail,
      errors: [],
      reason: parts.length
        ? `Nothing to send: ${parts.join("; ")}`
        : "No handlers to email",
    };
  }

  let sent = 0;
  let skipped = alreadyCovered + unassigned + missingEmail;
  const errors: string[] = [];

  for (const handler of byHandler.values()) {
    if (handler.profiles.length === 0) {
      skipped += 1;
      continue;
    }

    const profileList = handler.profiles
      .map((p) => `<li><strong>${p.name}</strong></li>`)
      .join("");

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
        <p>Hi ${handler.name},</p>
        <p>This is your monthly LinkedIn export reminder from MindVista HRMS.</p>
        <p>Please download the LinkedIn data export for each profile you handle and upload the ZIP in HRMS:</p>
        <ul>${profileList}</ul>
        <p><strong>Steps</strong></p>
        <ol>
          <li>Open LinkedIn → Settings &amp; Privacy → Data privacy → Get a copy of your data</li>
          <li>Request the archive (include Connections, Invitations, and Messages)</li>
          <li>When LinkedIn emails the ZIP, download it</li>
          <li>Upload it in HRMS → Sales → LinkedIn (select the matching profile)</li>
        </ol>
        <p><a href="${appUrl}/sales/linkedin?upload=1" style="display:inline-block;padding:10px 16px;background:#f59e0b;color:#111;border-radius:8px;text-decoration:none;font-weight:600">Open LinkedIn Stats upload</a></p>
        <p style="color:#666;font-size:12px">Period: ${year}-${String(month).padStart(2, "0")}</p>
      </div>
    `;

    const text = [
      `Hi ${handler.name},`,
      "",
      "This is your monthly LinkedIn export reminder from MindVista HRMS.",
      "Please download the LinkedIn data export for each profile you handle and upload the ZIP in HRMS:",
      ...handler.profiles.map((p) => `- ${p.name}`),
      "",
      `Upload: ${appUrl}/sales/linkedin?upload=1`,
      `Period: ${year}-${String(month).padStart(2, "0")}`,
    ].join("\n");

    const result = await sendEmail({
      to: handler.email,
      subject: `Reminder: Upload LinkedIn stats for ${handler.profiles.map((p) => p.name).join(", ")}`,
      text,
      html,
    });

    await supabase.from("linkedin_export_reminders").upsert(
      {
        employee_id: handler.employeeId,
        period_year: year,
        period_month: month,
        profile_ids: handler.profiles.map((p) => p.id),
        status: result.ok ? "sent" : "failed",
        message: result.error || `Emailed ${handler.profiles.length} profile(s)`,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,period_year,period_month" }
    );

    if (result.ok) sent += 1;
    else errors.push(`${handler.email}: ${result.error || "send failed"}`);
  }

  return { sent, skipped, errors };
}
