"use client";

import { useState, useEffect } from "react";
import { MetricGlowCard } from "@/components/sales/metric-glow-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Link2,
  MessageSquare,
  CalendarCheck,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Target,
  Zap,
  Filter,
} from "lucide-react";
import { pct, progressColor, sumSnapshots } from "@/lib/sales/stats";
import { cn } from "@/lib/utils";
import { SnapshotSyncDialog } from "@/components/sales/snapshot-sync-dialog";
import { getLeaderboard, getSalesAlerts } from "@/actions/sales-analytics";
import type { SalesProfile, SalesSheetSnapshot } from "@/types/database";

interface CommandData {
  teamToday: {
    connections_sent: number;
    connections_accepted: number;
    messages_sent: number;
    replies_received: number;
    follow_ups_done: number;
    meetings_booked: number;
    leads_added: number;
    proposals_sent: number;
  };
  repStats: {
    id: string;
    full_name: string;
    email: string;
    target: { connections_daily: number; messages_daily: number; follow_ups_daily: number; meetings_weekly: number };
    weekTotals: { connections_sent: number; connections_accepted: number; messages_sent: number; replies_received: number; meetings_booked: number; follow_ups_done: number; leads_added: number };
    todayLogged: boolean;
    todayTotals: { connections_sent: number } | null;
    score: number;
    connectionsPct: number;
  }[];
  profiles: (SalesProfile & { snapshot?: SalesSheetSnapshot | null })[];
  snapshots: SalesSheetSnapshot[];
  targets: { employee_id: string }[];
}

interface LeaderboardData {
  topPerformer: { name: string; score: number; totals: { connections_sent: number; meetings_booked: number } } | null;
  mostMeetings: { name: string; totals: { meetings_booked: number } } | null;
  highestReplyRate: { name: string; replyRate: number } | null;
  overall: { id: string; name: string; score: number; daysLogged: number }[];
}

interface AlertData {
  id: string;
  type: "warning" | "danger" | "info";
  title: string;
  message: string;
  module: string;
}

export function CommandCenterClient({ data }: { data: CommandData }) {
  const [syncOpen, setSyncOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const { teamToday, repStats, profiles, snapshots } = data;

  const connPct = pct(teamToday.connections_sent, repStats.reduce((s, r) => s + r.target.connections_daily, 0) || 1);
  const replyPct = pct(teamToday.replies_received, teamToday.messages_sent);
  const sheetTotals = sumSnapshots(snapshots);

  // Fetch leaderboard and alerts on mount
  useEffect(() => {
    getLeaderboard().then(setLeaderboard).catch(() => {});
    getSalesAlerts().then((r) => setAlerts(r.alerts)).catch(() => {});
  }, []);

  // Pipeline from daily logs
  const totalConnections = repStats.reduce((s, r) => s + r.weekTotals.connections_sent, 0);
  const totalAccepted = repStats.reduce((s, r) => s + r.weekTotals.connections_accepted, 0);
  const totalMessages = repStats.reduce((s, r) => s + r.weekTotals.messages_sent, 0);
  const totalReplies = repStats.reduce((s, r) => s + r.weekTotals.replies_received, 0);
  const totalMeetings = repStats.reduce((s, r) => s + r.weekTotals.meetings_booked, 0);
  const totalLeads = repStats.reduce((s, r) => s + r.weekTotals.leads_added, 0);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
      {/* Top KPI Cards */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <MetricGlowCard
          title="Connections"
          value={teamToday.connections_sent}
          subtitle={`${connPct}% of team target`}
          icon={Link2}
          accent="primary"
          href="/sales/history"
        />
        <MetricGlowCard
          title="Accepted"
          value={teamToday.connections_accepted}
          subtitle={`${pct(teamToday.connections_accepted, teamToday.connections_sent)}% rate`}
          icon={Users}
          accent="emerald"
          href="/sales/history"
        />
        <MetricGlowCard
          title="Reply rate"
          value={`${replyPct}%`}
          subtitle={`${teamToday.replies_received}/${teamToday.messages_sent}`}
          icon={MessageSquare}
          accent="blue"
          href="/sales/history"
        />
        <MetricGlowCard
          title="Meetings"
          value={teamToday.meetings_booked}
          subtitle={`${teamToday.follow_ups_done} follow-ups`}
          icon={CalendarCheck}
          accent="violet"
          href="/sales/meetings"
        />
        <MetricGlowCard
          title="Active leads"
          value={sheetTotals.active_leads}
          subtitle={`${profiles.length} profiles`}
          icon={FileSpreadsheet}
          href="/sales/leads"
        />
        <MetricGlowCard
          title="Team score"
          value={repStats.length > 0 ? Math.round(repStats.reduce((s, r) => s + r.score, 0) / repStats.length) : 0}
          subtitle="Avg performance"
          icon={Zap}
          accent="emerald"
          href="/sales/my-progress"
        />
        <MetricGlowCard
          title="ICP Filters"
          value="Open"
          subtitle="Sheet sync & geos"
          icon={Filter}
          accent="amber"
          href="/sales/icp-filters"
        />
      </div>

      {/* Pipeline Funnel */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Weekly Pipeline
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Funnel from connections to meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3">
            {[
              { label: "Connections Sent", value: totalConnections, color: "bg-primary" },
              { label: "Accepted", value: totalAccepted, color: "bg-emerald-500", parent: totalConnections },
              { label: "Messages Sent", value: totalMessages, color: "bg-blue-500", parent: totalAccepted },
              { label: "Replies Received", value: totalReplies, color: "bg-amber-500", parent: totalMessages },
              { label: "Meetings Booked", value: totalMeetings, color: "bg-violet-500", parent: totalReplies },
            ].map((stage, i) => {
              const widthPct = totalConnections > 0 ? (stage.value / totalConnections) * 100 : 0;
              const convPct = stage.parent ? pct(stage.value, stage.parent) : 100;
              return (
                <div key={stage.label} className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium">{stage.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {stage.value} {stage.parent ? <span className="text-[10px] sm:text-xs">({convPct}% conv.)</span> : null}
                    </span>
                  </div>
                  <div className="h-2 sm:h-3 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn("h-full rounded-full transition-all", stage.color)}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              Leaderboard
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Top performers this week</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard?.overall && leaderboard.overall.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {leaderboard.overall.slice(0, 5).map((rep, i) => (
                  <div key={rep.id} className="flex items-center gap-2 sm:gap-3 rounded-xl border border-border/60 p-2 sm:p-3">
                    <div className={cn(
                      "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold",
                      i === 0 ? "bg-amber-500/15 text-amber-600" :
                      i === 1 ? "bg-slate-400/15 text-slate-500" :
                      i === 2 ? "bg-orange-500/15 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs sm:text-sm truncate">{rep.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{rep.daysLogged} days logged</p>
                    </div>
                    <Badge className="text-[10px] sm:text-xs">{rep.score}/100</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground py-6 sm:py-8 text-center">No data yet this week.</p>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              Alerts
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="py-6 sm:py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 sm:h-8 sm:w-8 text-green-500/60" />
                <p className="text-xs sm:text-sm text-muted-foreground">All clear — no alerts.</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-2 sm:gap-3 rounded-xl border p-2 sm:p-3",
                      alert.type === "danger" ? "border-red-500/20 bg-red-500/5" :
                      alert.type === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                      "border-blue-500/20 bg-blue-500/5"
                    )}
                  >
                    <AlertTriangle className={cn(
                      "mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0",
                      alert.type === "danger" ? "text-red-500" :
                      alert.type === "warning" ? "text-amber-500" :
                      "text-blue-500"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold">{alert.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Google Sheets Pipeline Table */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Pipeline by profile
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Google Sheet snapshots</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Sync snapshot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          {profiles.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">No profiles configured.</p>
          ) : (
            <Table style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-2.5 px-2 sm:px-3 w-[30%]">Profile</TableHead>
                  <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-2.5 px-2 sm:px-3 w-[20%]">Rep</TableHead>
                  <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-2.5 px-2 sm:px-3 w-[15%] text-right">Active</TableHead>
                  <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-2.5 px-2 sm:px-3 w-[15%] text-right">Follow-up</TableHead>
                  <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-2.5 px-2 sm:px-3 w-[10%] text-right">Intro</TableHead>
                  <TableHead className="font-semibold text-[10px] sm:text-xs tracking-wider uppercase text-muted-foreground py-2 sm:py-2.5 px-2 sm:px-3 w-[10%] text-right">Won MTD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const snap = snapshots.find((s) => s.profile_id === p.id);
                  return (
                    <TableRow key={p.id} className="border-b border-border/30">
                      <TableCell className="py-2 sm:py-2.5 px-2 sm:px-3 font-medium text-xs sm:text-sm truncate">{p.name}</TableCell>
                      <TableCell className="py-2 sm:py-2.5 px-2 sm:px-3 text-muted-foreground text-[10px] sm:text-sm truncate">
                        {(p.employee as { full_name: string })?.full_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 px-2 sm:px-3 text-right font-semibold text-primary tabular-nums text-xs sm:text-sm">
                        {snap?.active_leads ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-2 sm:py-2.5 px-2 sm:px-3 text-right tabular-nums text-xs sm:text-sm">{snap?.follow_up ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="py-2 sm:py-2.5 px-2 sm:px-3 text-right tabular-nums text-xs sm:text-sm">{snap?.intro_call ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="py-2 sm:py-2.5 px-2 sm:px-3 text-right tabular-nums text-xs sm:text-sm">{snap?.won_mtd ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Team Scorecard */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Team scorecard</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Today&apos;s progress vs individual targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {repStats.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">No sales reps with BD role yet.</p>
          ) : (
            repStats.map((rep) => (
              <div key={rep.id} className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold text-xs sm:text-sm">{rep.full_name}</span>
                    {rep.todayLogged ? (
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge className="text-[10px] sm:text-xs">{rep.score}/100</Badge>
                    <span className="text-[10px] sm:text-sm text-muted-foreground tabular-nums">
                      {rep.todayTotals?.connections_sent ?? 0}/{rep.target.connections_daily} conn.
                    </span>
                  </div>
                </div>
                <Progress value={rep.connectionsPct}>
                  <ProgressTrack className="h-2 sm:h-2.5 rounded-full">
                    <ProgressIndicator
                      className={cn("h-2 sm:h-2.5 rounded-full bg-gradient-to-r", progressColor(rep.connectionsPct))}
                    />
                  </ProgressTrack>
                </Progress>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <SnapshotSyncDialog profiles={profiles} open={syncOpen} onOpenChange={setSyncOpen} />
    </div>
  );
}
