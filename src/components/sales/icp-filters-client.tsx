"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  checkIcpFilterDuplicates,
  createIcpFilter,
  deleteIcpFilter,
  syncIcpFiltersFromSheet,
  updateIcpSyncSettings,
} from "@/actions/icp-filters";
import type { IcpFilter, IcpFilterSyncMeta } from "@/types/database";
import {
  extractGeographies,
  monthLabel,
  parseProjectsClosed,
  tokenizeList,
  type FreshnessInfo,
  type ParsedProjectsClosed,
} from "@/lib/icp/matching";
import { MONTH_NAMES, profileColor } from "@/lib/icp/geo";
import { IcpFiltersCharts } from "@/components/sales/icp-filters-charts";
import {
  IcpPerformanceInsights,
  OutcomeBadge,
  buildGeoPerformance,
} from "@/components/sales/icp-performance-insights";
import { IcpChartErrorBoundary } from "@/components/sales/icp-chart-error-boundary";
import { MetricGlowCard } from "@/components/sales/metric-glow-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Filter,
  Globe2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Settings2,
  Lightbulb,
  Trophy,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CoverageRow = {
  profile: string;
  year: number;
  month: number;
  label: string;
  regions: string[];
  count: number;
  closed: number;
};

type DupMatch = {
  score: number;
  reasons: string[];
  freshness?: FreshnessInfo;
  closed?: ParsedProjectsClosed;
  filter: IcpFilter;
};

function freshnessBadgeClass(advice?: FreshnessInfo["advice"]) {
  if (advice === "avoid") return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (advice === "caution") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (advice === "safe") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "";
}

const emptyForm = {
  profile_name: "",
  filter_date_raw: "",
  company_headcount: "",
  past_companies: "",
  regions: "",
  job_titles: "",
  industry: "",
  years_experience: "",
  projects_closed: "",
  notes: "",
};

function regionMatches(haystack: string | null | undefined, needle: string): boolean {
  if (!needle || needle === "all") return true;
  const tokens = extractGeographies(haystack);
  const n = needle.toLowerCase().trim();
  if (tokens.some((t) => t === n || t.includes(n) || n.includes(t))) return true;
  return (haystack || "").toLowerCase().includes(n);
}

function SuggestionChips({
  label,
  suggestions,
  onPick,
  mode = "append",
}: {
  label: string;
  suggestions: string[];
  onPick: (value: string) => void;
  mode?: "append" | "replace";
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Lightbulb className="h-3 w-3 text-amber-500" />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 10).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-foreground transition hover:border-primary/40 hover:bg-primary/10"
            title={mode === "append" ? `Add "${s}"` : `Use "${s}"`}
          >
            {s.length > 42 ? `${s.slice(0, 42)}…` : s}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full min-w-0 max-w-full truncate rounded-lg border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function IcpFiltersClient({
  filters: initialFilters,
  coverage: initialCoverage,
  profiles,
  years,
  geographies,
  syncMeta,
  isOwner,
  error,
}: {
  filters: IcpFilter[];
  coverage: CoverageRow[];
  profiles: string[];
  years: number[];
  geographies: string[];
  syncMeta: IcpFilterSyncMeta | null;
  isOwner: boolean;
  error?: string | null;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [profile, setProfile] = useState("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [region, setRegion] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingMatches, setPendingMatches] = useState<DupMatch[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetId, setSheetId] = useState(syncMeta?.google_sheet_id ?? "");
  const [sheetTab, setSheetTab] = useState(syncMeta?.sheet_tab_name ?? "Sales Filter's");
  const [isPending, startTransition] = useTransition();
  const [dupChecking, setDupChecking] = useState(false);

  const filtered = useMemo(() => {
    return filters.filter((f) => {
      if (profile !== "all" && f.profile_name.toLowerCase() !== profile.toLowerCase()) return false;
      if (year !== "all" && Number(f.period_year) !== Number(year)) return false;
      if (month !== "all" && Number(f.period_month) !== Number(month)) return false;
      if (!regionMatches(f.regions, region)) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const hay = [
          f.past_companies,
          f.job_titles,
          f.industry,
          f.regions,
          f.company_headcount,
          f.profile_name,
          f.notes,
          f.projects_closed,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filters, profile, year, month, region, search]);

  const coverage = useMemo(() => {
    const coverageMap = new Map<
      string,
      {
        profile: string;
        year: number;
        month: number;
        regions: Set<string>;
        count: number;
        closed: number;
      }
    >();
    for (const r of filtered) {
      if (!r.period_year || !r.period_month) continue;
      const key = `${r.profile_name}|${r.period_year}|${r.period_month}`;
      const entry =
        coverageMap.get(key) ??
        {
          profile: r.profile_name,
          year: r.period_year,
          month: r.period_month,
          regions: new Set<string>(),
          count: 0,
          closed: 0,
        };
      entry.count += 1;
      entry.closed += parseProjectsClosed(r.projects_closed).closedCount;
      for (const g of extractGeographies(r.regions)) entry.regions.add(g);
      coverageMap.set(key, entry);
    }
    return Array.from(coverageMap.values())
      .map((c) => ({
        profile: c.profile,
        year: c.year,
        month: c.month,
        label: monthLabel(c.year, c.month),
        regions: Array.from(c.regions).sort(),
        count: c.count,
        closed: c.closed,
      }))
      .sort((a, b) => b.year - a.year || b.month - a.month || a.profile.localeCompare(b.profile));
  }, [filtered]);

  const stats = useMemo(() => {
    const profileCount = new Set(filtered.map((f) => f.profile_name)).size;
    const geoCount = new Set(filtered.flatMap((f) => extractGeographies(f.regions))).size;
    const closed = filtered.reduce(
      (sum, f) => sum + parseProjectsClosed(f.projects_closed).closedCount,
      0
    );
    const withOutcomes = filtered.filter((f) => (f.projects_closed || "").trim()).length;
    return { total: filtered.length, profiles: profileCount, geos: geoCount, closed, withOutcomes };
  }, [filtered]);

  const winningGeos = useMemo(
    () => buildGeoPerformance(filtered).filter((g) => g.closed > 0).map((g) => g.geo),
    [filtered]
  );

  const chartProfiles = useMemo(
    () => Array.from(new Set(filtered.map((f) => f.profile_name))).sort(),
    [filtered]
  );

  const suggestions = useMemo(() => {
    const pool = form.profile_name
      ? filters.filter((f) => f.profile_name.toLowerCase() === form.profile_name.toLowerCase())
      : filters;

    const collect = (picker: (f: IcpFilter) => string | null | undefined, split = false) => {
      const counts = new Map<string, number>();
      for (const f of pool) {
        const raw = picker(f);
        const items = split ? tokenizeList(raw) : raw?.trim() ? [raw.trim()] : [];
        for (const item of items) {
          const key = item;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([v]) => v);
    };

    return {
      profiles,
      headcounts: collect((f) => f.company_headcount),
      regions: [
        ...winningGeos.filter((g) =>
          !form.profile_name ||
          filters.some(
            (f) =>
              f.profile_name.toLowerCase() === form.profile_name.toLowerCase() &&
              regionMatches(f.regions, g)
          )
        ),
        ...collect((f) => f.regions, true).filter((g) => !winningGeos.includes(g)),
      ].filter((v, i, arr) => arr.indexOf(v) === i),
      titles: collect((f) => f.job_titles, true),
      companies: collect((f) => f.past_companies, true),
      industries: collect((f) => f.industry),
      yearsExp: collect((f) => f.years_experience),
      winningGeos,
    };
  }, [filters, form.profile_name, profiles, winningGeos]);

  // Live duplicate preview while typing in the form
  useEffect(() => {
    if (!formOpen || !form.profile_name.trim()) {
      setPendingMatches([]);
      return;
    }
    if (!form.regions && !form.job_titles && !form.past_companies) return;

    const t = setTimeout(() => {
      setDupChecking(true);
      checkIcpFilterDuplicates(form)
        .then(({ matches }) => setPendingMatches((matches as DupMatch[]) ?? []))
        .catch(() => setPendingMatches([]))
        .finally(() => setDupChecking(false));
    }, 450);
    return () => clearTimeout(t);
  }, [
    formOpen,
    form.profile_name,
    form.regions,
    form.job_titles,
    form.past_companies,
    form.company_headcount,
    form.industry,
  ]);

  const activeFilterCount = [profile, year, month, region].filter((v) => v !== "all").length + (search ? 1 : 0);

  function clearFilters() {
    setProfile("all");
    setYear("all");
    setMonth("all");
    setRegion("all");
    setSearch("");
  }

  function openNew(prefillProfile?: string) {
    setForm({
      ...emptyForm,
      profile_name: prefillProfile || (profile !== "all" ? profile : ""),
      filter_date_raw: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
    setPendingMatches([]);
    setFormOpen(true);
  }

  function appendField(key: keyof typeof emptyForm, value: string) {
    setForm((f) => {
      const current = f[key]?.trim() ?? "";
      if (!current) return { ...f, [key]: value };
      const parts = tokenizeList(current);
      if (parts.some((p) => p.toLowerCase() === value.toLowerCase())) return f;
      return { ...f, [key]: `${current}, ${value}` };
    });
  }

  function submitForm(force = false) {
    startTransition(async () => {
      const payload = {
        ...form,
        force,
        filter_date_raw: form.filter_date_raw || null,
      };
      const result = await createIcpFilter(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.needsConfirmation && result.matches) {
        setPendingMatches(result.matches as DupMatch[]);
        setConfirmOpen(true);
        toast.message("Similar filters found", { description: result.message });
        return;
      }
      if (result.filter) {
        setFilters((prev) => [result.filter as IcpFilter, ...prev]);
        toast.success("ICP filter saved");
        setFormOpen(false);
        setConfirmOpen(false);
        setPendingMatches([]);
      }
    });
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncIcpFiltersFromSheet({
        spreadsheetId: sheetId || undefined,
        tabName: sheetTab || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Synced ${result.inserted} new rows (${result.skipped} skipped)`);
      window.location.reload();
    });
  }

  function handleSaveSettings() {
    startTransition(async () => {
      const result = await updateIcpSyncSettings({
        google_sheet_id: sheetId,
        sheet_tab_name: sheetTab,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Sync settings saved");
        setSettingsOpen(false);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteIcpFilter(id);
      if (result.error) toast.error(result.error);
      else {
        setFilters((prev) => prev.filter((f) => f.id !== id));
        toast.success("Deleted");
      }
    });
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-orange-500/10 via-card to-blue-500/10 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              BD outreach intelligence
            </div>
            <h2 className="text-3xl font-bold tracking-tight">ICP Filters</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              See which geos closed deals, which ones went cold, and whether a filter is too recent to repeat — or old enough to safely re-run on the same profile.
            </p>
            {syncMeta?.last_synced_at && (
              <p className="text-xs text-muted-foreground">
                Last sheet sync: {new Date(syncMeta.last_synced_at).toLocaleString()}
                {syncMeta.last_sync_message ? ` · ${syncMeta.last_sync_message}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button variant="outline" className="bg-background/70" onClick={() => setSettingsOpen(true)} disabled={isPending}>
                <Settings2 className="mr-2 h-4 w-4" />
                Sheet settings
              </Button>
            )}
            <Button variant="outline" className="bg-background/70" onClick={handleSync} disabled={isPending}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
              Sync from Sheet
            </Button>
            <Button onClick={() => openNew()} disabled={isPending} className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Log new filter
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <div>
              <p className="font-medium">Could not load ICP filters from the database</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricGlowCard title="Filters shown" value={stats.total} icon={Filter} accent="primary" />
        <MetricGlowCard title="Profiles" value={stats.profiles} icon={Sparkles} accent="violet" />
        <MetricGlowCard title="Geographies" value={stats.geos} icon={Globe2} accent="blue" />
        <MetricGlowCard title="Projects closed" value={stats.closed} icon={Trophy} accent="emerald" subtitle={`${stats.withOutcomes} filters with outcomes`} />
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-primary" />
              Refine view
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount} active
                </Badge>
              )}
            </CardTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="mr-1 h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect
            label="Profile"
            value={profile}
            onChange={setProfile}
            allLabel="All profiles"
            options={profiles.map((p) => ({ value: p, label: p }))}
          />
          <FilterSelect
            label="Year"
            value={year}
            onChange={setYear}
            allLabel="All years"
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
          <FilterSelect
            label="Month"
            value={month}
            onChange={setMonth}
            allLabel="All months"
            options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
              value: String(m),
              label: MONTH_NAMES[m],
            }))}
          />
          <FilterSelect
            label="Geography"
            value={region}
            onChange={setRegion}
            allLabel="All regions"
            options={geographies.slice(0, 80).map((g) => ({
              value: g,
              label: g.length > 36 ? `${g.slice(0, 36)}…` : g,
            }))}
          />
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative min-w-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 min-w-0 pl-8"
                placeholder="Company, title, industry…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <IcpChartErrorBoundary>
        <IcpFiltersCharts filters={filtered} profiles={chartProfiles.length ? chartProfiles : profiles} />
      </IcpChartErrorBoundary>

      <IcpChartErrorBoundary>
        <IcpPerformanceInsights filters={filtered} profiles={chartProfiles.length ? chartProfiles : profiles} />
      </IcpChartErrorBoundary>

      {/* Coverage cards */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" />
            Geography coverage by profile & month
          </CardTitle>
          <CardDescription>
            Updates instantly with the filters above — {coverage.length} period card(s) in view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverage.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              No coverage for the current filters. Clear filters or sync the sheet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coverage.slice(0, 36).map((c) => (
                <div
                  key={`${c.profile}-${c.year}-${c.month}`}
                  className="group rounded-2xl border border-border/60 bg-linear-to-br from-background to-muted/20 p-4 transition hover:border-primary/30 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: profileColor(c.profile, profiles) }}
                      />
                      <p className="font-semibold">{c.profile}</p>
                    </div>
                    <Badge variant="secondary">{c.label}</Badge>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {c.count} filter(s) · {c.regions.length} geo(s)
                    {c.closed > 0 ? ` · ${c.closed} closed` : ""}
                  </p>
                  {c.closed > 0 && (
                    <Badge className="mb-2 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                      <Trophy className="mr-1 h-3 w-3" />
                      {c.closed} project(s) closed
                    </Badge>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {c.regions.slice(0, 10).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegion(r)}
                        className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] capitalize transition hover:border-primary/40"
                      >
                        {r}
                      </button>
                    ))}
                    {c.regions.length > 10 && (
                      <Badge variant="outline" className="text-[11px]">
                        +{c.regions.length - 10}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Filter log</CardTitle>
          <CardDescription>
            Showing {filtered.length} of {filters.length} filters
            {initialCoverage.length ? ` · ${initialCoverage.length} profile-months tracked` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Geography</TableHead>
                <TableHead>Headcount</TableHead>
                <TableHead>Titles</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Outcomes</TableHead>
                <TableHead>Source</TableHead>
                {isOwner && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 9 : 8} className="py-10 text-center text-muted-foreground">
                    No ICP filters match these filters yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f) => (
                  <TableRow key={f.id} className="align-top">
                    <TableCell className="whitespace-nowrap text-sm">
                      <div>{f.filter_date_raw || f.filter_date || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {monthLabel(f.period_year, f.period_month)}
                        {f.period_week ? ` · W${f.period_week}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: profileColor(f.profile_name, profiles) }}
                        />
                        {f.profile_name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm" title={f.regions ?? ""}>
                      <span className="line-clamp-2">{f.regions || "—"}</span>
                    </TableCell>
                    <TableCell className="text-sm">{f.company_headcount || "—"}</TableCell>
                    <TableCell className="max-w-[200px] text-sm" title={f.job_titles ?? ""}>
                      <span className="line-clamp-2">{f.job_titles || "—"}</span>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm" title={f.industry ?? ""}>
                      {f.industry || "—"}
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <OutcomeBadge raw={f.projects_closed} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {f.source}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(f.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New filter dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Log a new ICP filter
            </DialogTitle>
            <DialogDescription>
              Suggestions come from past filters{form.profile_name ? ` on ${form.profile_name}` : ""}. We also check for duplicates as you type.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Profile *</Label>
              <Input
                list="icp-profile-suggestions"
                placeholder="Asim / ABD. Shafiq / Fiza…"
                value={form.profile_name}
                onChange={(e) => setForm((f) => ({ ...f, profile_name: e.target.value }))}
              />
              <datalist id="icp-profile-suggestions">
                {suggestions.profiles.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <SuggestionChips
                label="Known profiles"
                suggestions={suggestions.profiles}
                mode="replace"
                onPick={(v) => setForm((f) => ({ ...f, profile_name: v }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date / period</Label>
              <Input
                placeholder="15 June or July 2026"
                value={form.filter_date_raw}
                onChange={(e) => setForm((f) => ({ ...f, filter_date_raw: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company headcount</Label>
              <Input
                placeholder="1-10 & 11-50"
                value={form.company_headcount}
                onChange={(e) => setForm((f) => ({ ...f, company_headcount: e.target.value }))}
              />
              <SuggestionChips
                label="Suggested headcounts"
                suggestions={suggestions.headcounts}
                mode="replace"
                onPick={(v) => setForm((f) => ({ ...f, company_headcount: v }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Region & states</Label>
              <Textarea
                placeholder="Seattle, San Francisco Bay Area"
                value={form.regions}
                onChange={(e) => setForm((f) => ({ ...f, regions: e.target.value }))}
                rows={2}
              />
              <SuggestionChips
                label={
                  suggestions.winningGeos.length
                    ? "Suggested geographies (winners first)"
                    : "Suggested geographies"
                }
                suggestions={suggestions.regions}
                onPick={(v) => appendField("regions", v)}
              />
              {suggestions.winningGeos.length > 0 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Geos with past closes are listed first — still check re-run freshness for this profile below.
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Job titles</Label>
              <Textarea
                placeholder="CEO, CTO, Founder"
                value={form.job_titles}
                onChange={(e) => setForm((f) => ({ ...f, job_titles: e.target.value }))}
                rows={2}
              />
              <SuggestionChips
                label="Suggested titles"
                suggestions={suggestions.titles}
                onPick={(v) => appendField("job_titles", v)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Past companies</Label>
              <Textarea
                placeholder="Google, Amazon, Meta"
                value={form.past_companies}
                onChange={(e) => setForm((f) => ({ ...f, past_companies: e.target.value }))}
                rows={2}
              />
              <SuggestionChips
                label="Suggested companies"
                suggestions={suggestions.companies}
                onPick={(v) => appendField("past_companies", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input
                placeholder="Software Development"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              />
              <SuggestionChips
                label="Suggested industries"
                suggestions={suggestions.industries}
                mode="replace"
                onPick={(v) => setForm((f) => ({ ...f, industry: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Years of experience</Label>
              <Input
                placeholder="< 1 year & 1-2 years"
                value={form.years_experience}
                onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))}
              />
              <SuggestionChips
                label="Suggested tenure filters"
                suggestions={suggestions.yearsExp}
                mode="replace"
                onPick={(v) => setForm((f) => ({ ...f, years_experience: v }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Projects closed / outcomes</Label>
              <Textarea
                placeholder="1 Closed: ..."
                value={form.projects_closed}
                onChange={(e) => setForm((f) => ({ ...f, projects_closed: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {(dupChecking || pendingMatches.length > 0) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {dupChecking
                  ? "Checking similar filters & re-run freshness…"
                  : "Similar filters on this profile — decide whether to skip or re-run"}
              </p>
              {!dupChecking && (
                <ul className="space-y-2 text-sm">
                  {pendingMatches.slice(0, 5).map((m, i) => (
                    <li key={i} className="rounded-lg border border-border/50 bg-background/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {m.filter.filter_date_raw ||
                            monthLabel(m.filter.period_year ?? null, m.filter.period_month ?? null)}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{Math.round(m.score * 100)}% match</Badge>
                          {m.freshness && (
                            <Badge variant="outline" className={cn("gap-1", freshnessBadgeClass(m.freshness.advice))}>
                              <Clock3 className="h-3 w-3" />
                              {m.freshness.advice === "safe"
                                ? "Safe to re-run"
                                : m.freshness.advice === "caution"
                                  ? "Caution"
                                  : m.freshness.advice === "avoid"
                                    ? "Too recent"
                                    : "Unknown"}
                            </Badge>
                          )}
                          {(m.closed?.closedCount ?? 0) > 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              {m.closed!.closedCount} closed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{m.reasons.join(" · ")}</p>
                      <p className="mt-1 line-clamp-2 text-xs">{m.filter.regions}</p>
                      {m.filter.projects_closed && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          Outcome: {m.filter.projects_closed}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => submitForm(false)} disabled={isPending || !form.profile_name}>
              Save filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save anyway?</DialogTitle>
            <DialogDescription>
              This looks similar to a filter already run on {form.profile_name}.
              {pendingMatches[0]?.freshness?.advice === "safe"
                ? " It was long enough ago that a re-run can make sense."
                : pendingMatches[0]?.freshness?.advice === "avoid"
                  ? " It was used very recently — usually better to pick a different geo or wait."
                  : " Review the match details before confirming."}
              {(pendingMatches[0]?.closed?.closedCount ?? 0) > 0
                ? ` Prior run closed ${pendingMatches[0]!.closed!.closedCount} project(s).`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => submitForm(true)} disabled={isPending}>
              Save anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Sheet sync</DialogTitle>
            <DialogDescription>
              Point at the Software Development workbook tab <strong>Sales Filter&apos;s</strong>. Share the sheet with your Google service account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Spreadsheet ID</Label>
              <Input value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="1BxiM..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tab name</Label>
              <Input value={sheetTab} onChange={(e) => setSheetTab(e.target.value)} placeholder="Sales Filter's" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings} disabled={isPending}>
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
