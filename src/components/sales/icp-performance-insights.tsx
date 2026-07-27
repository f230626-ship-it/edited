"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IcpFilter } from "@/types/database";
import {
  extractGeographies,
  monthLabel,
  parseProjectsClosed,
} from "@/lib/icp/matching";
import { profileColor } from "@/lib/icp/geo";
import { Trophy, TrendingDown, Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type GeoPerformance = {
  geo: string;
  filters: number;
  closed: number;
  pipeline: number;
  winRate: number;
  profiles: string[];
};

export type WinningFilter = {
  filter: IcpFilter;
  closed: number;
  pipeline: number;
  names: string[];
};

export function buildGeoPerformance(filters: IcpFilter[]): GeoPerformance[] {
  const map = new Map<
    string,
    { geo: string; filters: number; closed: number; pipeline: number; profiles: Set<string> }
  >();

  for (const f of filters) {
    const outcome = parseProjectsClosed(f.projects_closed);
    const geos = extractGeographies(f.regions);
    const targets = geos.length > 0 ? geos : ["(no geography)"];
    for (const geo of targets) {
      const entry =
        map.get(geo) ??
        { geo, filters: 0, closed: 0, pipeline: 0, profiles: new Set<string>() };
      entry.filters += 1;
      entry.closed += outcome.effectiveClosed || outcome.closedCount;
      entry.pipeline += outcome.pipelineCount;
      entry.profiles.add(f.profile_name);
      map.set(geo, entry);
    }
  }

  return Array.from(map.values())
    .map((g) => ({
      geo: g.geo,
      filters: g.filters,
      closed: g.closed,
      pipeline: g.pipeline,
      winRate: g.filters > 0 ? g.closed / g.filters : 0,
      profiles: Array.from(g.profiles).sort(),
    }))
    .sort((a, b) => b.closed - a.closed || b.winRate - a.winRate || b.filters - a.filters);
}

export function buildWinningFilters(filters: IcpFilter[]): WinningFilter[] {
  return filters
    .map((filter) => {
      const parsed = parseProjectsClosed(filter.projects_closed);
      return {
        filter,
        closed: parsed.effectiveClosed || parsed.closedCount,
        pipeline: parsed.pipelineCount,
        names: parsed.names,
      };
    })
    .filter((w) => w.closed > 0 || w.pipeline > 0)
    .sort((a, b) => b.closed - a.closed || b.pipeline - a.pipeline);
}

export function IcpPerformanceInsights({
  filters,
  profiles,
}: {
  filters: IcpFilter[];
  profiles: string[];
}) {
  const geoPerf = useMemo(() => buildGeoPerformance(filters), [filters]);
  const winners = useMemo(() => geoPerf.filter((g) => g.closed > 0).slice(0, 8), [geoPerf]);
  const cold = useMemo(
    () =>
      geoPerf
        .filter((g) => g.closed === 0 && g.filters >= 2 && g.geo !== "(no geography)")
        .slice(0, 8),
    [geoPerf]
  );
  const winningFilters = useMemo(() => buildWinningFilters(filters).slice(0, 6), [filters]);
  const totalClosed = useMemo(
    () => filters.reduce((sum, f) => sum + parseProjectsClosed(f.projects_closed).closedCount, 0),
    [filters]
  );
  const chartData = useMemo(
    () =>
      winners.map((g) => ({
        name: g.geo.length > 22 ? `${g.geo.slice(0, 22)}…` : g.geo,
        closed: g.closed,
        filters: g.filters,
      })),
    [winners]
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden border-emerald-500/20 bg-linear-to-br from-card via-card to-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-emerald-500" />
              States / geos that worked
            </CardTitle>
            <CardDescription>
              Geographies that produced closed projects ({totalClosed} closed in current view)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {winners.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No closed-project outcomes logged yet for this view. Sync the sheet or add outcomes when deals close.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="h-[200px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-24} textAnchor="end" height={52} interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                      <Tooltip />
                      <Bar dataKey="closed" name="Closed" fill="#10b981" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2">
                  {winners.map((g) => (
                    <li
                      key={g.geo}
                      className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize">{g.geo}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {g.filters} filter run(s) · {g.profiles.join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {g.closed} closed
                        </p>
                        {g.pipeline > 0 && (
                          <p className="text-[11px] text-muted-foreground">{g.pipeline} last-stage</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-rose-500/20 bg-linear-to-br from-card via-card to-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              States / geos that underperformed
            </CardTitle>
            <CardDescription>
              Tried 2+ times with zero closed projects — deprioritize unless strategy changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cold.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No clear cold geos yet (need repeated runs with no closes).
              </p>
            ) : (
              <ul className="space-y-2">
                {cold.map((g) => (
                  <li
                    key={g.geo}
                    className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">{g.geo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {g.profiles.join(", ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-rose-500/30 text-rose-600">
                      {g.filters} runs · 0 closed
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden border-amber-500/20 bg-linear-to-br from-card via-card to-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-amber-500" />
            Winning filters (what actually closed)
          </CardTitle>
          <CardDescription>
            Use these as templates — or re-run on the same profile only if enough months have passed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {winningFilters.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No winning filters with closed/pipeline outcomes in this view yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {winningFilters.map((w) => (
                <div
                  key={w.filter.id}
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: profileColor(w.filter.profile_name, profiles) }}
                      />
                      <p className="font-semibold">{w.filter.profile_name}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                        {w.closed} closed
                      </Badge>
                      {w.pipeline > 0 && (
                        <Badge variant="secondary">{w.pipeline} last-stage</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {w.filter.filter_date_raw || monthLabel(w.filter.period_year, w.filter.period_month)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm capitalize">
                    <Target className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    {w.filter.regions || "—"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {w.filter.job_titles || "No titles logged"}
                  </p>
                  {w.names.length > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Outcomes: {w.names.slice(0, 3).join(" · ")}
                      {w.names.length > 3 ? ` +${w.names.length - 3}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OutcomeBadge({ raw }: { raw: string | null | undefined }) {
  const parsed = parseProjectsClosed(raw);
  if (!raw?.trim()) {
    return <span className="text-xs text-muted-foreground">No outcome</span>;
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {parsed.closedCount > 0 && (
          <Badge
            className={cn(
              "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            )}
          >
            {parsed.closedCount} closed
          </Badge>
        )}
        {parsed.pipelineCount > 0 && (
          <Badge variant="secondary">{parsed.pipelineCount} last-stage</Badge>
        )}
        {parsed.closedCount === 0 && parsed.pipelineCount === 0 && (
          <Badge variant="outline" className="text-[11px]">
            Noted
          </Badge>
        )}
      </div>
      <p className="line-clamp-2 text-[11px] text-muted-foreground" title={raw}>
        {raw}
      </p>
    </div>
  );
}
