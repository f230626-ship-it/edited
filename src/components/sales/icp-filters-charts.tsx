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
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IcpFilter } from "@/types/database";
import { extractGeographies } from "@/lib/icp/matching";
import { MONTH_NAMES, PROFILE_COLORS, profileColor, resolveGeoPoint } from "@/lib/icp/geo";
import { BarChart3, MapPinned, Layers3 } from "lucide-react";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-muted-foreground">
          {p.name ? `${p.name}: ` : ""}
          <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full min-w-0">{children}</div>;
}

export function IcpFiltersCharts({
  filters,
  profiles,
}: {
  filters: IcpFilter[];
  profiles: string[];
}) {
  const byProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of filters) {
      map.set(f.profile_name, (map.get(f.profile_name) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, fill: profileColor(name, profiles) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [filters, profiles]);

  const byGeo = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of filters) {
      for (const g of extractGeographies(f.regions)) {
        const key = g.length > 24 ? `${g.slice(0, 24)}…` : g;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filters]);

  const heatmap = useMemo(() => {
    const months = Array.from(
      new Set(filters.map((f) => f.period_month).filter((m): m is number => !!m))
    ).sort((a, b) => a - b);
    const profileList = Array.from(new Set(filters.map((f) => f.profile_name))).sort();
    const cells: Record<string, number> = {};
    let max = 1;
    for (const f of filters) {
      if (!f.period_month) continue;
      const key = `${f.profile_name}|${f.period_month}`;
      cells[key] = (cells[key] ?? 0) + 1;
      max = Math.max(max, cells[key]);
    }
    return { months, profileList, cells, max };
  }, [filters]);

  const mapPoints = useMemo(() => {
    type Agg = {
      key: string;
      label: string;
      lat: number;
      lng: number;
      profiles: string[];
      count: number;
    };
    const map = new Map<string, Agg>();
    for (const f of filters) {
      for (const g of extractGeographies(f.regions)) {
        const point = resolveGeoPoint(g);
        if (!point) continue;
        const key = `${point.lat.toFixed(1)},${point.lng.toFixed(1)}`;
        const entry =
          map.get(key) ??
          ({
            key,
            label: point.name,
            lat: point.lat,
            lng: point.lng,
            profiles: [],
            count: 0,
          } satisfies Agg);
        entry.count += 1;
        if (!entry.profiles.some((p) => p.toLowerCase() === f.profile_name.toLowerCase())) {
          entry.profiles.push(f.profile_name);
        }
        if (entry.label.length > point.name.length) entry.label = point.name;
        map.set(key, entry);
      }
    }
    return Array.from(map.values()).slice(0, 80);
  }, [filters]);

  const scatterByProfile = useMemo(() => {
    return profiles
      .slice(0, 8)
      .map((profile) => {
        const points = mapPoints
          .filter((p) => p.profiles.some((x) => x.toLowerCase() === profile.toLowerCase()))
          .map((p) => ({
            x: p.lng,
            y: p.lat,
            z: Math.min(200, 60 + p.profiles.length * 30),
            label: p.label,
            profiles: p.profiles.join(", "),
            overlap: p.profiles.length,
            count: p.count,
          }));
        return { profile, color: profileColor(profile, profiles), points };
      })
      .filter((s) => s.points.length > 0);
  }, [mapPoints, profiles]);

  const overlapHotspots = useMemo(
    () =>
      mapPoints
        .filter((p) => p.profiles.length > 1)
        .sort((a, b) => b.profiles.length - a.profiles.length || b.count - a.count)
        .slice(0, 6),
    [mapPoints]
  );

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card className="min-w-0 overflow-hidden border-border/50 bg-linear-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Filters by profile
          </CardTitle>
          <CardDescription>How much each profile has logged</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] min-w-0">
          {byProfile.length === 0 ? (
            <Empty />
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProfile} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={56} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Filters" radius={[8, 8, 0, 0]}>
                    {byProfile.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden border-border/50 bg-linear-to-br from-card via-card to-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers3 className="h-4 w-4 text-blue-500" />
            Top geographies covered
          </CardTitle>
          <CardDescription>Most-used locations in the current view</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] min-w-0">
          {byGeo.length === 0 ? (
            <Empty />
          ) : (
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byGeo} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 9 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Touches" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden border-border/50 bg-linear-to-br from-card via-card to-emerald-500/5 xl:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPinned className="h-4 w-4 text-emerald-500" />
                Geography overlap map
              </CardTitle>
              <CardDescription>
                Each color is a profile. Overlapping dots mean multiple profiles already covered that area.
              </CardDescription>
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
              {profiles.slice(0, 8).map((p, i) => (
                <Badge key={p} variant="outline" className="max-w-[140px] truncate gap-1.5 font-normal">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: PROFILE_COLORS[i % PROFILE_COLORS.length] }}
                  />
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="h-[320px] min-w-0 overflow-hidden rounded-xl border border-border/40 bg-muted/20">
              {scatterByProfile.length === 0 ? (
                <Empty />
              ) : (
                <ChartFrame>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Lng"
                        domain={[-140, 40]}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Lat"
                        domain={[20, 60]}
                        tick={{ fontSize: 10 }}
                        width={36}
                      />
                      <ZAxis type="number" dataKey="z" range={[50, 180]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload as {
                            label: string;
                            profiles: string;
                            overlap: number;
                            count: number;
                          };
                          return (
                            <div className="max-w-[240px] rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-lg">
                              <p className="font-semibold capitalize">{d.label}</p>
                              <p className="wrap-break-word text-muted-foreground">Profiles: {d.profiles}</p>
                              <p className="text-muted-foreground">
                                Overlap: {d.overlap} · Touches: {d.count}
                              </p>
                            </div>
                          );
                        }}
                      />
                      {scatterByProfile.map((series) => (
                        <Scatter
                          key={series.profile}
                          name={series.profile}
                          data={series.points}
                          fill={series.color}
                          fillOpacity={0.75}
                          isAnimationActive={false}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartFrame>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Overlap hotspots
              </p>
              {overlapHotspots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No multi-profile overlaps in this view.</p>
              ) : (
                <ul className="space-y-2">
                  {overlapHotspots.map((h) => (
                    <li
                      key={h.key}
                      className="rounded-xl border border-border/50 bg-background/60 p-3"
                    >
                      <p className="truncate text-sm font-medium capitalize">{h.label}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {h.profiles.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="max-w-full truncate text-[10px]"
                            style={{
                              borderColor: profileColor(p, profiles),
                              color: profileColor(p, profiles),
                            }}
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden border-border/50 xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile × month heatmap</CardTitle>
          <CardDescription>Darker cells = more filters run that month</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-x-auto">
          {heatmap.profileList.length === 0 || heatmap.months.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">Profile</th>
                  {heatmap.months.map((m) => (
                    <th key={m} className="px-1 py-1 text-center text-[11px] font-medium text-muted-foreground">
                      {MONTH_NAMES[m].slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.profileList.map((p) => (
                  <tr key={p}>
                    <td className="max-w-[120px] truncate whitespace-nowrap px-2 py-1 text-xs font-medium">{p}</td>
                    {heatmap.months.map((m) => {
                      const v = heatmap.cells[`${p}|${m}`] ?? 0;
                      const intensity = v === 0 ? 0 : 0.2 + (v / heatmap.max) * 0.8;
                      const color = profileColor(p, profiles);
                      return (
                        <td key={m} className="p-1">
                          <div
                            className="flex h-9 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums"
                            style={{
                              backgroundColor:
                                v === 0 ? "var(--muted)" : color,
                              opacity: v === 0 ? 0.45 : intensity,
                              color: v === 0 ? "var(--muted-foreground)" : "#fff",
                            }}
                            title={`${p} · ${MONTH_NAMES[m]}: ${v}`}
                          >
                            {v || "·"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-muted-foreground">
      No data for the current filters
    </div>
  );
}
