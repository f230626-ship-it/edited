"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useOutreachTheme } from "@/hooks/use-outreach-theme";
import {
  computeCountAxis,
  computePercentAxis,
  maxOfKeys,
  maxStackTotal,
} from "@/lib/linkedin/outreach-chart-utils";
import {
  aggregateInvitations,
  aggregateConnections,
  mergePeriodMetrics,
  computeKpis,
  computeReportingWindow,
  type Granularity,
  type PeriodMetric,
} from "@/lib/linkedin/outreach-metrics";
import type {
  LinkedInInvitation,
  LinkedInConnection,
  LinkedInProfile,
  LinkedInImport,
} from "@/types/linkedin";
import { getLinkedInAnalytics } from "@/actions/linkedin";

export interface ProfileIntelligenceData {
  import: LinkedInImport;
  profile: LinkedInProfile | null;
  invitations: LinkedInInvitation[];
  connections: LinkedInConnection[];
}

export interface ProfileIntelligenceDashboardProps {
  employeeId: string;
  initialData: ProfileIntelligenceData | null;
}

type GranularityOption = "weekly" | "monthly" | "quarterly";

const GRANULARITY_OPTIONS: GranularityOption[] = ["weekly", "monthly", "quarterly"];
const GRANULARITY_LABELS: Record<GranularityOption, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const KPI_DEFS = [
  { key: "invitesSent"     as const, label: "INVITES SENT",       suffix: false, color: "#f59e0b" },
  { key: "connectionsMade" as const, label: "CONNECTIONS MADE",   suffix: false, color: "#0d9488" },
  { key: "acceptanceRate"  as const, label: "ACCEPTANCE RATE",    suffix: "%",   color: "#10b981" },
  { key: "messagesSent"    as const, label: "MESSAGES SENT",      suffix: false, color: "#8b5cf6" },
  { key: "followUpsSent"   as const, label: "FOLLOW-UPS SENT",    suffix: false, color: "#d97706" },
  { key: "repliesReceived" as const, label: "REPLIES RECEIVED",   suffix: false, color: "#ec4899" },
  { key: "replyRate"       as const, label: "REPLY RATE",         suffix: "%",   color: "#f43f5e" },
];

function buildChartData(
  invitations: LinkedInInvitation[],
  connections: LinkedInConnection[],
  granularity: Granularity
): PeriodMetric[] {
  const invRows = invitations.map((i) => ({
    direction: i.direction,
    invitation_date: i.invitation_date ?? null,
  }));
  const connRows = connections.map((c) => ({
    connected_on: c.connected_on ?? null,
  }));
  return mergePeriodMetrics(
    aggregateInvitations(invRows, granularity),
    aggregateConnections(connRows, granularity)
  );
}

function buildReportingWindow(
  invitations: LinkedInInvitation[],
  connections: LinkedInConnection[]
) {
  return computeReportingWindow(
    [],
    invitations.map((i) => ({
      direction: i.direction,
      invitation_date: i.invitation_date ?? null,
    })),
    connections.map((c) => ({ connected_on: c.connected_on ?? null }))
  );
}

function axisProps() {
  return {
    tickLine: false as const,
    axisLine: false as const,
    tick: { fontSize: 11, fill: "var(--outreach-axis)" },
  };
}

function gridEl() {
  return (
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outreach-grid)" />
  );
}

function CountTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; fill?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-2xl dark:border-white/10 dark:bg-[#0f172a]/95">
      <p className="mb-2 font-bold text-slate-900 dark:text-white">{label}</p>
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: item.color || item.fill }} />
            {item.name}
          </span>
          <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
            {item.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function PercentTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; stroke?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-2xl dark:border-white/10 dark:bg-[#0f172a]/95">
      <p className="mb-2 font-bold text-slate-900 dark:text-white">{label}</p>
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: item.color || item.stroke }} />
            {item.name}
          </span>
          <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
            {Number(item.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title, description, legend, children,
}: {
  title: string;
  description: string;
  legend?: { color: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[340px] flex-col rounded-2xl border border-border bg-white p-6 shadow-md dark:border-white/[0.06] dark:bg-[#161f2e]">
      <div className="shrink-0 pb-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground dark:text-white">{title}</h3>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground dark:text-slate-400">{description}</p>
        {legend && legend.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-muted-foreground dark:text-slate-400">
            {legend.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function UploadState({ employeeId }: { employeeId: string }) {
  return (
    <div className="mx-auto max-w-[1280px] px-8 pb-12 pt-6 space-y-6">
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400/80">
          LinkedIn Outreach
        </span>
        <h1 className="text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Outreach Control Room
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Connection requests, acceptance rate, messaging &amp; follow-ups across every tracked profile
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-16 text-center space-y-5 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <svg className="h-6 w-6 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Upload your LinkedIn Data Export</h3>
          <p className="max-w-sm mx-auto text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Export your LinkedIn data from Settings → Data Privacy → Get a copy of your data,
            then upload the ZIP here to see your outreach analytics.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProfileIntelligenceDashboard({
  employeeId,
  initialData,
}: ProfileIntelligenceDashboardProps) {
  const colors = useOutreachTheme();
  const [data, setData] = useState<ProfileIntelligenceData | null>(initialData);
  const [granularity, setGranularity] = useState<GranularityOption>("quarterly");
  const [isPending, startTransition] = useTransition();

  const invitations = data?.invitations ?? [];
  const connections = data?.connections ?? [];

  const chartData = useMemo(
    () => buildChartData(invitations, connections, granularity as Granularity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invitations, connections, granularity]
  );

  const kpis = useMemo(() => computeKpis(chartData), [chartData]);

  const reportingWindow = useMemo(
    () => buildReportingWindow(invitations, connections),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invitations, connections]
  );

  const invitesAxis    = useMemo(() => computeCountAxis(maxOfKeys(chartData as unknown as Record<string, unknown>[], ["invitesSent", "connectionsMade"])), [chartData]);
  const messagesAxis   = useMemo(() => computeCountAxis(maxStackTotal(chartData as unknown as Record<string, unknown>[], ["initialMessages", "followUpsSent"])), [chartData]);
  const repliesAxis    = useMemo(() => computeCountAxis(maxOfKeys(chartData as unknown as Record<string, unknown>[], ["repliesReceived"])), [chartData]);
  const acceptanceAxis = useMemo(() => computePercentAxis(maxOfKeys(chartData as unknown as Record<string, unknown>[], ["acceptanceRate"])), [chartData]);

  const handleGranularityChange = (next: GranularityOption) => {
    startTransition(() => setGranularity(next));
  };

  if (!data) return <UploadState employeeId={employeeId} />;

  const profileName = data.profile
    ? [data.profile.first_name, data.profile.last_name].filter(Boolean).join(" ") || "Your Profile"
    : "Your Profile";

  function kpiDisplay(key: (typeof KPI_DEFS)[number]["key"], suffix: false | string): string {
    const raw = kpis[key] as number;
    if (suffix) return `${raw.toFixed(1)}${suffix}`;
    return raw === 0 ? "—" : raw.toLocaleString();
  }

  const gradientAcceptance = "pi-grad-acceptance";
  const gradientReplies    = "pi-grad-replies";

  return (
    <div className="mx-auto max-w-[1280px] px-8 pb-12 pt-6 space-y-6">

      {/* ── 1. HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400/80">
            LinkedIn Outreach
          </span>
          <h1 className="text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Outreach Control Room
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Connection requests, acceptance rate, messaging &amp; follow-ups across every tracked profile
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 self-start pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-500">
              Reporting Window
            </span>
            <span className="whitespace-nowrap font-mono text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {reportingWindow.startDate} → {reportingWindow.endDate}
            </span>
          </div>
      </div>

      {/* ── 2. PROFILE CHIP ── */}
      <div className="flex flex-wrap gap-2">
        <div className="flex h-10 items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-900 dark:text-white ring-1 ring-amber-500/20">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          {profileName}
        </div>
      </div>

      {/* ── 3. SHOWING + GRANULARITY ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Showing: <span className="font-bold text-slate-900 dark:text-white">{profileName}</span>
        </p>
        <div
          className="inline-flex h-9 self-start overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:self-auto dark:border-white/[0.06] dark:bg-white/[0.04]"
          role="group"
          aria-label="Time granularity"
        >
          {GRANULARITY_OPTIONS.map((g) => {
            const active = granularity === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleGranularityChange(g)}
                disabled={isPending}
                className={[
                  "flex-1 px-4 text-xs font-semibold transition-all duration-150 disabled:opacity-50",
                  active
                    ? "rounded-md bg-amber-500 text-slate-900 shadow-sm dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                ].join(" ")}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. KPI CARDS ── */}
      <div className="grid grid-cols-7 gap-4">
        {KPI_DEFS.map((kpi) => (
          <div
            key={kpi.key}
            className="flex flex-col justify-between rounded-2xl border border-border bg-white p-5 shadow-md dark:border-white/[0.06] dark:bg-[#161f2e]"
          >
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: kpi.color }}
            >
              {kpi.label}
            </span>
            <span
              className="mt-3 text-[1.6rem] font-extrabold tabular-nums leading-none"
              style={{ color: kpi.color }}
            >
              {kpiDisplay(kpi.key, kpi.suffix === false ? false : String(kpi.suffix))}
            </span>
            <span className="mt-2 text-[11px] text-muted-foreground dark:text-slate-500">
              over selected window
            </span>
          </div>
        ))}
      </div>

      {/* ── 5. CHARTS 2×2 ── */}
      <div className="grid grid-cols-2 gap-5">

        <ChartCard
          title="Invites sent vs. connections made"
          description="New connection requests sent, and new 1st-degree connections formed, per period"
          legend={[
            { color: colors.accent, label: "Invites sent" },
            { color: colors.teal,   label: "Connections made" },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={6}>
              {gridEl()}
              <XAxis dataKey="period" {...axisProps()} dy={8} />
              <YAxis {...axisProps()} ticks={invitesAxis.ticks} domain={invitesAxis.domain} tickFormatter={(v) => v.toLocaleString()} width={48} />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
              <Bar dataKey="invitesSent"     name="Invites sent"     fill={colors.accent} radius={[4,4,0,0]} maxBarSize={36} />
              <Bar dataKey="connectionsMade" name="Connections made" fill={colors.teal}   radius={[4,4,0,0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Acceptance rate"
          description="Connections made ÷ invites sent, per period (approximation — see note below)"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientAcceptance} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colors.teal} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={colors.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              {gridEl()}
              <XAxis dataKey="period" {...axisProps()} dy={8} />
              <YAxis {...axisProps()} ticks={acceptanceAxis.ticks} domain={acceptanceAxis.domain} tickFormatter={(v) => `${v}%`} width={48} />
              <Tooltip content={<PercentTooltip />} />
              <Area
                type="monotone" dataKey="acceptanceRate" name="Acceptance Rate"
                stroke={colors.teal} strokeWidth={2} fill={`url(#${gradientAcceptance})`}
                dot={{ r: 3, fill: colors.teal, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: colors.teal, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Messages: initial outreach vs. follow-ups"
          description="First message sent per conversation vs. subsequent follow-up messages you sent"
          legend={[
            { color: colors.purple, label: "Initial message" },
            { color: colors.accent, label: "Follow-ups" },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
              {gridEl()}
              <XAxis dataKey="period" {...axisProps()} dy={8} />
              <YAxis {...axisProps()} ticks={messagesAxis.ticks} domain={messagesAxis.domain} tickFormatter={(v) => v.toLocaleString()} width={48} />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
              <Bar dataKey="initialMessages" name="Initial message" stackId="msgs" fill={colors.purple} maxBarSize={48} />
              <Bar dataKey="followUpsSent"   name="Follow-ups"      stackId="msgs" fill={colors.accent} radius={[4,4,0,0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Replies received &amp; reply rate"
          description="Inbound messages from prospects, and replies ÷ messages sent, per period"
          legend={[{ color: colors.rose, label: "Replies received" }]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
              <defs>
                <linearGradient id={gradientReplies} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={colors.rose} stopOpacity={0.30} />
                  <stop offset="95%" stopColor={colors.rose} stopOpacity={0.08} />
                </linearGradient>
              </defs>
              {gridEl()}
              <XAxis dataKey="period" {...axisProps()} dy={8} />
              <YAxis {...axisProps()} ticks={repliesAxis.ticks} domain={repliesAxis.domain} tickFormatter={(v) => v.toLocaleString()} width={48} />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
              <Bar
                dataKey="repliesReceived" name="Replies received"
                fill={`url(#${gradientReplies})`} stroke={colors.rose} strokeWidth={1}
                radius={[4,4,0,0]} maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── 6. FOOTER ── */}
      <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-md dark:border-white/[0.06] dark:bg-[#161f2e]">
        <h4 className="text-sm font-bold tracking-tight text-foreground dark:text-white">
          How these numbers are computed
        </h4>
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground dark:text-slate-400">
          <p>
            <strong className="font-semibold text-foreground/80 dark:text-slate-200">Invites Sent</strong> and{" "}
            <strong className="font-semibold text-foreground/80 dark:text-slate-200">connections made</strong> come directly from your LinkedIn{" "}
            <code className="text-amber-600 dark:text-amber-400/80">Invitations.csv</code> and{" "}
            <code className="text-amber-600 dark:text-amber-400/80">Connections.csv</code> exports.{" "}
            <strong className="font-semibold text-foreground/80 dark:text-slate-200">Acceptance rate</strong> divides connections made by invites
            sent within the same period — LinkedIn&apos;s export doesn&apos;t link a specific invite to the connection it
            produced, so treat this as a directional trend rather than an exact per-invite rate.
          </p>
          <p>
            <strong className="font-semibold text-foreground/80 dark:text-slate-200">Messages, follow-ups, and replies</strong> require daily
            CRM activity logs which are entered separately under Sales → Daily Log. The charts above show invite and
            connection data from your ZIP export only.
          </p>
          <p className="pt-1 text-[11px] text-muted-foreground dark:text-slate-500">
            Last import: <span className="font-mono">{data.import.filename}</span> —{" "}
            {data.import.completed_at
              ? new Date(data.import.completed_at).toLocaleDateString()
              : new Date(data.import.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
