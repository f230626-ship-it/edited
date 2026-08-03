"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  getLinkedInOutreachData,
  sendLinkedInExportReminders,
  type OutreachDashboardData,
  type OutreachProfile,
} from "@/actions/linkedin-outreach";
import { LinkedInUploadDialog } from "@/components/linkedin/upload-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, Bell, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

type Granularity = "weekly" | "monthly" | "quarterly";

const KPI_DEFS = [
  { key: "invitesSent" as const, label: "Invites Sent", color: "#f59e0b" },
  { key: "connectionsMade" as const, label: "Connections Made", color: "#0d9488" },
  { key: "acceptanceRate" as const, label: "Acceptance Rate", color: "#10b981", suffix: "%" },
  { key: "messagesSent" as const, label: "Messages Sent", color: "#8b5cf6" },
  { key: "followUpsSent" as const, label: "Follow-ups Sent", color: "#d97706" },
  { key: "repliesReceived" as const, label: "Replies Received", color: "#ec4899" },
  { key: "replyRate" as const, label: "Reply Rate", color: "#f43f5e", suffix: "%" },
];

export function LinkedInStatsDashboard({
  initialData,
}: {
  initialData: OutreachDashboardData;
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [selectedId, setSelectedId] = useState(initialData.selectedProfileId);
  const [compareId, setCompareId] = useState<string | null>(initialData.compareProfileId);
  const [granularity, setGranularity] = useState<Granularity>(initialData.granularity);
  const [monthKey, setMonthKey] = useState(initialData.selectedMonthKey || "all");
  const [compareMode, setCompareMode] = useState(Boolean(initialData.compareProfileId));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("upload") === "1") setUploadOpen(true);
  }, [searchParams]);

  const refresh = (
    profileId: string,
    gran: Granularity,
    compare: string | null,
    month = monthKey
  ) => {
    startTransition(async () => {
      const next = await getLinkedInOutreachData(profileId, gran, compare, month);
      setData(next);
      setMonthKey(next.selectedMonthKey);
    });
  };

  const selected = data.profiles.find((p) => p.id === selectedId) || data.profiles[0];
  const compareProfile = compareId
    ? data.profiles.find((p) => p.id === compareId) || null
    : null;

  const mergedChart = useMemo(() => {
    if (!compareMode || !compareProfile) return data.chartData as unknown as Array<Record<string, string | number>>;
    const map = new Map<string, Record<string, string | number>>();
    for (const row of data.chartData) {
      map.set(row.period, {
        period: row.period,
        invitesA: row.invitesSent,
        connectionsA: row.connectionsMade,
        acceptanceA: row.acceptanceRate,
        messagesA: row.messagesSent,
        followUpsA: row.followUpsSent,
        repliesA: row.repliesReceived,
        replyRateA: row.replyRate,
        invitesSent: row.invitesSent,
        connectionsMade: row.connectionsMade,
        acceptanceRate: row.acceptanceRate,
        messagesSent: row.messagesSent,
        initialMessages: row.initialMessages,
        followUpsSent: row.followUpsSent,
        repliesReceived: row.repliesReceived,
        replyRate: row.replyRate,
      });
    }
    for (const row of data.compareChartData) {
      const prev = map.get(row.period) || { period: row.period };
      map.set(row.period, {
        ...prev,
        invitesB: row.invitesSent,
        connectionsB: row.connectionsMade,
        acceptanceB: row.acceptanceRate,
        messagesB: row.messagesSent,
        followUpsB: row.followUpsSent,
        repliesB: row.repliesReceived,
        replyRateB: row.replyRate,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period))
    );
  }, [compareMode, compareProfile, data.chartData, data.compareChartData]);

  const handleSendReminder = () => {
    startTransition(async () => {
      const result = await sendLinkedInExportReminders(true);
      if (result.sent === 0) {
        const detail = [
          result.reason,
          ...result.errors.slice(0, 3),
        ]
          .filter(Boolean)
          .join(" · ");
        toast.error(detail || "No reminders sent");
        return;
      }
      toast.success(
        `Reminders sent: ${result.sent}${
          result.errors.length ? ` (${result.errors.length} failed)` : ""
        }`
      );
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      <header className="flex flex-col gap-4 border-b border-border/50 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#F59E0B]">
            LinkedIn Outreach
          </span>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Profile Stats
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly ZIP exports → invites, acceptance, messages & reply rates. Compare profiles and keep history by month/quarter.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.isAdmin && (
            <Button variant="outline" size="sm" onClick={handleSendReminder} disabled={isPending}>
              <Bell className="mr-2 h-4 w-4" />
              Send reminder now
            </Button>
          )}
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const next = !compareMode;
              setCompareMode(next);
              if (!next) {
                setCompareId(null);
                refresh(selectedId, granularity, null, monthKey);
              }
            }}
          >
            <GitCompareArrows className="mr-2 h-4 w-4" />
            Compare
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload ZIP
          </Button>
        </div>
      </header>

      {/* Profiles */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {data.profiles.map((p) => (
            <ProfileChip
              key={p.id}
              profile={p}
              active={p.id === selectedId}
              onClick={() => {
                setSelectedId(p.id);
                const nextCompare = compareMode && compareId === p.id ? null : compareId;
                refresh(p.id, granularity, nextCompare, monthKey);
              }}
            />
          ))}
          {data.profiles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No LinkedIn sales profiles yet. Ask an admin to create them under Sales → Profiles.
            </p>
          )}
        </div>

        {compareMode && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Compare with:</span>
            {data.profiles
              .filter((p) => p.id !== selectedId)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCompareId(p.id);
                    refresh(selectedId, granularity, p.id, monthKey);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    compareId === p.id
                      ? "border-violet-500 bg-violet-500/15 text-violet-300"
                      : "border-border/60 text-muted-foreground hover:border-violet-500/40"
                  )}
                >
                  {p.name}
                </button>
              ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing: <span className="font-semibold text-foreground">{selected?.name || "—"}</span>
            {selected?.handlerName ? ` · Handler: ${selected.handlerName}` : ""}
            {compareProfile ? (
              <>
                {" "}
                vs <span className="font-semibold text-violet-300">{compareProfile.name}</span>
              </>
            ) : null}
            {data.reportingWindow.startDate ? (
              <span className="ml-2 text-xs">
                · {data.reportingWindow.startDate}
                {data.reportingWindow.endDate && data.reportingWindow.endDate !== data.reportingWindow.startDate
                  ? ` → ${data.reportingWindow.endDate}`
                  : ""}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Month
            </label>
            <select
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground [color-scheme:dark]"
              value={monthKey}
              disabled={isPending}
              onChange={(e) => {
                const next = e.target.value;
                setMonthKey(next);
                refresh(selectedId, granularity, compareMode ? compareId : null, next);
              }}
            >
              <option value="all">All months</option>
              {data.availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="inline-flex rounded-lg border border-border/60 p-0.5">
              {(["weekly", "monthly", "quarterly"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGranularity(g);
                    refresh(selectedId, g, compareMode ? compareId : null, monthKey);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold capitalize",
                    granularity === g
                      ? "bg-[#F59E0B] text-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {KPI_DEFS.map((kpi) => (
          <div
            key={kpi.key}
            className="rounded-xl border border-border/50 bg-card/80 p-3 sm:p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1 text-xl font-bold sm:text-2xl" style={{ color: kpi.color }}>
              {formatKpi(data.kpis[kpi.key], kpi.suffix)}
            </p>
            {compareMode && data.compareKpis && (
              <p className="mt-1 text-xs text-violet-300">
                vs {formatKpi(data.compareKpis[kpi.key], kpi.suffix)}
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {monthKey === "all" ? "all months" : "selected month"}
            </p>
          </div>
        ))}
      </div>

      {/* All profiles glance */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-4 sm:p-5 overflow-x-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">All profiles at a glance</h3>
          <p className="text-xs text-muted-foreground">
            {monthKey === "all"
              ? "All-time from imported exports"
              : data.availableMonths.find((m) => m.key === monthKey)?.label || monthKey}
          </p>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Profile</th>
              <th className="py-2 px-2 font-semibold">Invites sent</th>
              <th className="py-2 px-2 font-semibold">Connections made</th>
              <th className="py-2 px-2 font-semibold">Acceptance rate</th>
              <th className="py-2 px-2 font-semibold">Messages sent</th>
              <th className="py-2 px-2 font-semibold">Follow-ups</th>
              <th className="py-2 px-2 font-semibold">Replies</th>
              <th className="py-2 pl-2 font-semibold">Reply rate</th>
            </tr>
          </thead>
          <tbody>
            {(data.glanceRows || []).map((row) => (
              <tr
                key={row.profileId}
                className={cn(
                  "border-b border-border/30 cursor-pointer hover:bg-muted/30",
                  row.profileId === selectedId && "bg-[#F59E0B]/5"
                )}
                onClick={() => {
                  setSelectedId(row.profileId);
                  refresh(row.profileId, granularity, compareMode ? compareId : null, monthKey);
                }}
              >
                <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                <td className="py-2.5 px-2">{row.invitesSent.toLocaleString()}</td>
                <td className="py-2.5 px-2">{row.connectionsMade.toLocaleString()}</td>
                <td className="py-2.5 px-2">{row.acceptanceRate.toFixed(1)}%</td>
                <td className="py-2.5 px-2">{row.messagesSent.toLocaleString()}</td>
                <td className="py-2.5 px-2">{row.followUpsSent.toLocaleString()}</td>
                <td className="py-2.5 px-2">{row.repliesReceived.toLocaleString()}</td>
                <td className="py-2.5 pl-2">{row.replyRate.toFixed(1)}%</td>
              </tr>
            ))}
            {(data.glanceRows || []).length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No period stats yet — upload LinkedIn ZIP exports.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Invites sent vs. connections made">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mergedChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {compareMode && compareProfile ? (
                <>
                  <Bar dataKey="invitesA" name={`${selected?.name} invites`} fill="#f59e0b" radius={4} />
                  <Bar dataKey="connectionsA" name={`${selected?.name} connections`} fill="#0d9488" radius={4} />
                  <Bar dataKey="invitesB" name={`${compareProfile.name} invites`} fill="#fbbf24" radius={4} />
                  <Bar dataKey="connectionsB" name={`${compareProfile.name} connections`} fill="#2dd4bf" radius={4} />
                </>
              ) : (
                <>
                  <Bar dataKey="invitesSent" name="Invites sent" fill="#f59e0b" radius={4} />
                  <Bar dataKey="connectionsMade" name="Connections made" fill="#0d9488" radius={4} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Acceptance rate" subtitle="Connections made ÷ invites sent">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mergedChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {compareMode && compareProfile ? (
                <>
                  <Line type="monotone" dataKey="acceptanceA" name={selected?.name} stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="acceptanceB" name={compareProfile.name} stroke="#a78bfa" strokeWidth={2} />
                </>
              ) : (
                <Line type="monotone" dataKey="acceptanceRate" name="Acceptance %" stroke="#10b981" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Messages: initial outreach vs. follow-ups">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mergedChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {compareMode && compareProfile ? (
                <>
                  <Bar dataKey="messagesA" name={`${selected?.name} messages`} fill="#8b5cf6" stackId="a" radius={4} />
                  <Bar dataKey="followUpsA" name={`${selected?.name} follow-ups`} fill="#d97706" stackId="a" radius={4} />
                  <Bar dataKey="messagesB" name={`${compareProfile.name} messages`} fill="#c4b5fd" stackId="b" radius={4} />
                  <Bar dataKey="followUpsB" name={`${compareProfile.name} follow-ups`} fill="#fbbf24" stackId="b" radius={4} />
                </>
              ) : (
                <>
                  <Bar dataKey="initialMessages" name="Initial" fill="#8b5cf6" stackId="m" radius={4} />
                  <Bar dataKey="followUpsSent" name="Follow-ups" fill="#d97706" stackId="m" radius={4} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Replies received & reply rate" subtitle="Replies ÷ messages sent">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mergedChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {compareMode && compareProfile ? (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="repliesA" name={`${selected?.name} replies`} stroke="#ec4899" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="replyRateA" name={`${selected?.name} rate`} stroke="#f43f5e" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="repliesB" name={`${compareProfile.name} replies`} stroke="#f9a8d4" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="replyRateB" name={`${compareProfile.name} rate`} stroke="#fb7185" strokeWidth={2} />
                </>
              ) : (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="repliesReceived" name="Replies" stroke="#ec4899" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="replyRate" name="Reply %" stroke="#f43f5e" strokeWidth={2} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <LinkedInUploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) refresh(selectedId, granularity, compareMode ? compareId : null, monthKey);
        }}
        profiles={data.profiles}
      />
    </div>
  );
}

function ProfileChip({
  profile,
  active,
  onClick,
}: {
  profile: OutreachProfile;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
        active
          ? "border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]"
          : "border-border/60 bg-card/40 text-muted-foreground hover:border-[#F59E0B]/40 hover:text-foreground"
      )}
    >
      {profile.name}
    </button>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function formatKpi(value: number, suffix?: string) {
  if (suffix === "%") return `${Number(value).toFixed(1)}%`;
  return Number(value).toLocaleString();
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};
