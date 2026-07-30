"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricGlowCard } from "@/components/sales/metric-glow-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Link2, MessageSquare, CalendarCheck, Trophy, TrendingUp, Zap, Target, ArrowUpRight, Filter } from "lucide-react";
import { pct, progressColor, scoreLabel } from "@/lib/sales/stats";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface ProgressData {
  weekTotals: {
    connections_sent: number;
    messages_sent: number;
    replies_received: number;
    meetings_booked: number;
    follow_ups_done: number;
  };
  target: {
    connections_daily: number;
    messages_daily: number;
    meetings_weekly: number;
  };
  score: number;
  trend: { date: string; connections: number; messages: number; meetings: number }[];
  snapshots: { active_leads: number; profile?: { name: string } }[];
}

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#e5a158" : "#ef4444";

  return (
    <div className="relative h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-white/[0.06]"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tracking-tight leading-none">{score}</span>
        <span className="text-[10px] font-medium text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

export function MyProgressClient({ data }: { data: ProgressData }) {
  const connTarget = data.target.connections_daily * 5;
  const connPct = pct(data.weekTotals.connections_sent, connTarget);
  const replyPct = pct(data.weekTotals.replies_received, data.weekTotals.messages_sent);
  const activeLeads = data.snapshots.reduce((s, x) => s + x.active_leads, 0);
  const msgPct = pct(data.weekTotals.messages_sent, data.target.messages_daily * 5);

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <Card className="relative overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl" />
        <CardContent className="relative flex items-center gap-6 p-6">
          <ScoreRing score={data.score} />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Performance Score
              </p>
            </div>
            <p className="text-lg font-bold">{scoreLabel(data.score)}</p>
            <p className="text-sm text-muted-foreground">
              {data.score >= 70
                ? "Great momentum — keep it up!"
                : data.score >= 40
                  ? "Solid progress — push a bit more"
                  : "Start logging daily to build your score"}
            </p>
          </div>
          <div className="hidden space-y-3 sm:block">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Connections: {data.weekTotals.connections_sent}/{connTarget}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Replies: {data.weekTotals.replies_received}/{data.weekTotals.messages_sent}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-violet-500" />
              Meetings: {data.weekTotals.meetings_booked}/{data.target.meetings_weekly}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <MetricGlowCard
          title="Connections"
          value={data.weekTotals.connections_sent}
          subtitle={`${connTarget} weekly goal`}
          icon={Link2}
          accent="emerald"
          progress={connPct}
          href="/sales/history"
        />
        <MetricGlowCard
          title="Messages sent"
          value={data.weekTotals.messages_sent}
          subtitle={`${data.weekTotals.replies_received} replies`}
          icon={MessageSquare}
          accent="blue"
          progress={msgPct}
          href="/sales/history"
        />
        <MetricGlowCard
          title="Meetings booked"
          value={data.weekTotals.meetings_booked}
          subtitle={`Target: ${data.target.meetings_weekly}/wk`}
          icon={CalendarCheck}
          accent="violet"
          progress={pct(data.weekTotals.meetings_booked, data.target.meetings_weekly)}
          href="/sales/meetings"
        />
        <MetricGlowCard
          title="Active leads"
          value={activeLeads}
          subtitle="Across your profiles"
          icon={Target}
          accent="amber"
          href="/sales/leads"
        />
      </div>

      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">ICP Filters</p>
              <p className="text-sm text-muted-foreground">
                Review geos, winning filters, and sync the Sales Navigator sheet.
              </p>
            </div>
          </div>
          <Link
            href="/sales/icp-filters"
            className={cn(buttonVariants({ size: "sm" }), "shrink-0 shadow-md shadow-primary/15")}
          >
            Open ICP Filters
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Weekly Progress */}
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Weekly target</CardTitle>
              <CardDescription>
                {data.weekTotals.connections_sent} of {connTarget} connections
              </CardDescription>
            </div>
            <Badge variant={connPct >= 100 ? "default" : "secondary"} className="text-xs">
              {connPct}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                progressColor(connPct)
              )}
              style={{ width: `${Math.min(connPct, 100)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{connPct >= 100 ? "Target reached!" : `${connTarget - data.weekTotals.connections_sent} more to go`}</span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-primary" />
              {data.weekTotals.follow_ups_done} follow-ups done
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Activity Trend */}
      {data.trend.length > 0 && (
        <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Activity trend</CardTitle>
                <CardDescription>Daily outreach this week</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  Connections
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                  Messages
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e5a158" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e5a158" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="connections"
                  stroke="#e5a158"
                  fill="url(#connGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#94a3b8"
                  fill="transparent"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
