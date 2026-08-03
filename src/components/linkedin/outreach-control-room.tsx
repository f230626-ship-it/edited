"use client";

import { useState, useTransition } from "react";
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
import {
  OutreachDashboardData,
  OutreachProfile,
  getLinkedInOutreachData,
} from "@/actions/linkedin-outreach";
import type { PeriodMetric } from "@/lib/linkedin/outreach-metrics";
import { LinkedInUploadButton } from "./upload-button";

interface OutreachControlRoomProps {
  initialData: OutreachDashboardData;
  employeeId?: string;
}

export function OutreachControlRoom({
  initialData,
  employeeId,
}: OutreachControlRoomProps) {
  const [data, setData] = useState<OutreachDashboardData>(initialData);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    initialData.selectedProfileId
  );
  const [granularity, setGranularity] = useState<
    "weekly" | "monthly" | "quarterly"
  >(initialData.granularity);
  const [isPending, startTransition] = useTransition();

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    startTransition(async () => {
      const updated = await getLinkedInOutreachData(profileId, granularity);
      setData(updated);
    });
  };

  const handleGranularityChange = (
    newGranularity: "weekly" | "monthly" | "quarterly"
  ) => {
    setGranularity(newGranularity);
    startTransition(async () => {
      const updated = await getLinkedInOutreachData(
        selectedProfileId,
        newGranularity
      );
      setData(updated);
    });
  };

  const currentProfile =
    data.profiles.find((p) => p.id === selectedProfileId) || data.profiles[0];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 font-sans bg-background text-foreground transition-colors duration-200">
      {/* ==================================================================== */}
      {/* SECTION 1: Page Header                                               */}
      {/* ==================================================================== */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <span className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase text-[#F59E0B]">
            LINKEDIN OUTREACH
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mt-0.5">
            Outreach Control Room
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Connection requests, acceptance rate, messaging & follow-ups across
            every tracked profile
          </p>
        </div>

        <div className="flex items-center gap-4 self-start md:self-auto">
          {employeeId && (
            <LinkedInUploadButton
              profiles={data.profiles}
              defaultProfileId={selectedProfileId}
            />
          )}
          <div className="text-left md:text-right">
            <span className="text-xs text-muted-foreground block font-medium">
              Reporting window
            </span>
            <span className="text-sm font-mono font-bold tracking-tight text-foreground">
              {data.reportingWindow.startDate} → {data.reportingWindow.endDate}
            </span>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* SECTION 2 & 3: Profile Selector Row & Time Granularity Toggle      */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        {/* Profile Pill Buttons Row */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {data.profiles.map((profile: OutreachProfile) => {
            const isSelected = profile.id === selectedProfileId;
            return (
              <button
                key={profile.id}
                onClick={() => handleProfileChange(profile.id)}
                disabled={isPending}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "border-[#F59E0B] bg-[#F59E0B]/10 text-foreground ring-1 ring-[#F59E0B]/40 font-semibold shadow-xs"
                    : "border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isSelected ? "bg-[#F59E0B]" : "bg-muted-foreground/40"
                  }`}
                />
                <span>{profile.name}</span>
              </button>
            );
          })}
        </div>

        {/* Showing Label & Time Granularity Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-sm text-muted-foreground">
            Showing:{" "}
            <strong className="text-foreground font-semibold">
              {currentProfile?.name}
            </strong>
          </div>

          <div className="inline-flex items-center bg-muted/60 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
            {(["weekly", "monthly", "quarterly"] as const).map((g) => {
              const active = granularity === g;
              const label =
                g.charAt(0).toUpperCase() + g.slice(1);
              return (
                <button
                  key={g}
                  onClick={() => handleGranularityChange(g)}
                  disabled={isPending}
                  className={`px-3.5 py-1 text-xs sm:text-sm rounded-md font-medium transition-all cursor-pointer ${
                    active
                      ? "bg-[#F59E0B] text-slate-950 font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: KPI Stat Row (7 Cards)                                    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* 1. Invites Sent */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            INVITES SENT
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F59E0B] my-1">
            {data.kpis.invitesSent.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>

        {/* 2. Connections Made */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            CONNECTIONS MADE
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#14B8A6] dark:text-[#2DD4BF] my-1">
            {data.kpis.connectionsMade.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>

        {/* 3. Acceptance Rate */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            ACCEPTANCE RATE
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#14B8A6] dark:text-[#2DD4BF] my-1">
            {data.kpis.acceptanceRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>

        {/* 4. Messages Sent */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            MESSAGES SENT
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#8B5CF6] dark:text-[#A78BFA] my-1">
            {data.kpis.messagesSent.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>

        {/* 5. Follow-ups Sent */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            FOLLOW-UPS SENT
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F59E0B] my-1">
            {data.kpis.followUpsSent.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>

        {/* 6. Replies Received */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            REPLIES RECEIVED
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F43F5E] dark:text-[#FB7185] my-1">
            {data.kpis.repliesReceived.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>

        {/* 7. Reply Rate */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            REPLY RATE
          </span>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F43F5E] dark:text-[#FB7185] my-1">
            {data.kpis.replyRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-muted-foreground font-normal">
            over selected window
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 5: Chart Grid (2x2)                                          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Invites sent vs. connections made */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Invites sent vs. connections made
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              New connection requests sent, and new 1st-degree connections formed,
              per period
            </p>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground mt-3 mb-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#F59E0B] inline-block" />
                Invites sent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#14B8A6] inline-block" />
                Connections made
              </span>
            </div>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-border/40"
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                  tickFormatter={(val) => val.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="invitesSent"
                  name="Invites sent"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="connectionsMade"
                  name="Connections made"
                  fill="#14B8A6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Acceptance rate */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Acceptance rate
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Connections made ÷ invites sent, per period (approximation — see
              note below)
            </p>
            <div className="h-4 mt-3 mb-4" />
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.chartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAcceptance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-border/40"
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, (dataMax: number) => Math.max(35, Math.ceil(dataMax / 5) * 5)]}
                />
                <Tooltip content={<CustomPercentTooltip />} />
                <Area
                  type="monotone"
                  dataKey="acceptanceRate"
                  name="Acceptance rate"
                  stroke="#14B8A6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAcceptance)"
                  dot={{ r: 4, fill: "#14B8A6", strokeWidth: 1.5, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Messages: initial outreach vs. follow-ups */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Messages: initial outreach vs. follow-ups
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              First message sent per conversation vs. subsequent follow-up
              messages you sent
            </p>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground mt-3 mb-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#8B5CF6] inline-block" />
                Initial message
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#F59E0B] inline-block" />
                Follow-ups
              </span>
            </div>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-border/40"
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                  tickFormatter={(val) => val.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="initialMessages"
                  name="Initial message"
                  stackId="messages"
                  fill="#8B5CF6"
                  maxBarSize={55}
                />
                <Bar
                  dataKey="followUpsSent"
                  name="Follow-ups"
                  stackId="messages"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={55}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Replies received & reply rate */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Replies received & reply rate
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Inbound messages from prospects, and replies ÷ messages sent, per
              period
            </p>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs font-medium text-muted-foreground mt-3 mb-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#F43F5E] inline-block" />
                Replies received
              </span>
            </div>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-border/40"
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                  tick={{ fontSize: 12, fill: "currentColor", className: "text-muted-foreground" }}
                  tickFormatter={(val) => val.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="repliesReceived"
                  name="Replies received"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={55}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 6: Methodology Footnote                                      */}
      {/* ==================================================================== */}
      <footer className="pt-6 border-t border-border/80">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-semibold">
            How these numbers are computed
          </strong>{" "}
          —{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/40 text-foreground">
            &quot;Invites sent&quot;
          </code>{" "}
          and{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/40 text-foreground">
            &quot;connections made&quot;
          </code>{" "}
          come directly from your LinkedIn{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/40 text-foreground">
            Invitations.csv
          </code>{" "}
          and{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/40 text-foreground">
            Connections.csv
          </code>{" "}
          exports.{" "}
          <strong className="text-foreground font-semibold">
            Acceptance rate
          </strong>{" "}
          divides connections made by invites sent within the same period —
          LinkedIn&apos;s export doesn&apos;t link a specific invite to the connection it
          produced, and acceptances can land in a later period than the invite, so
          treat this as a directional trend rather than an exact per-invite
          rate.
        </p>
      </footer>
    </div>
  );
}

// Custom Tooltip Components
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-md text-xs space-y-1.5">
        <p className="font-bold text-foreground mb-1">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="w-2.5 h-2.5 rounded-xs inline-block"
                style={{ backgroundColor: item.color || item.fill }}
              />
              {item.name}:
            </span>
            <span className="font-mono font-bold text-foreground">
              {item.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function CustomPercentTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-md text-xs space-y-1.5">
        <p className="font-bold text-foreground mb-1">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="w-2.5 h-2.5 rounded-xs inline-block"
                style={{ backgroundColor: item.color || item.stroke }}
              />
              {item.name}:
            </span>
            <span className="font-mono font-bold text-foreground">
              {Number(item.value).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
