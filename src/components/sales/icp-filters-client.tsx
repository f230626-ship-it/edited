"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  checkIcpFilterDuplicates,
  createIcpFilter,
  deleteIcpFilter,
  syncIcpFiltersFromSheet,
  updateIcpSyncSettings,
} from "@/actions/icp-filters";
import type { IcpFilter, IcpFilterSyncMeta } from "@/types/database";
import { monthLabel } from "@/lib/icp/matching";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";

type CoverageRow = {
  profile: string;
  year: number;
  month: number;
  label: string;
  regions: string[];
  count: number;
};

type DupMatch = {
  score: number;
  reasons: string[];
  filter: IcpFilter;
};

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
  const [coverage, setCoverage] = useState(initialCoverage);
  const [profile, setProfile] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pendingMatches, setPendingMatches] = useState<DupMatch[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetId, setSheetId] = useState(syncMeta?.google_sheet_id ?? "");
  const [sheetTab, setSheetTab] = useState(syncMeta?.sheet_tab_name ?? "Sales Filter's");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return filters.filter((f) => {
      if (profile !== "all" && f.profile_name.toLowerCase() !== profile.toLowerCase()) return false;
      if (year !== "all" && f.period_year !== Number(year)) return false;
      if (month !== "all" && f.period_month !== Number(month)) return false;
      if (region !== "all" && !(f.regions || "").toLowerCase().includes(region.toLowerCase())) return false;
      if (search) {
        const hay = `${f.past_companies} ${f.job_titles} ${f.industry} ${f.regions}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [filters, profile, year, month, region, search]);

  const stats = useMemo(() => {
    const profileCount = new Set(filtered.map((f) => f.profile_name)).size;
    const geoCount = new Set(
      filtered.flatMap((f) => (f.regions || "").split(/[,|;]/).map((x) => x.trim().toLowerCase()).filter(Boolean))
    ).size;
    return {
      total: filtered.length,
      profiles: profileCount,
      geos: geoCount,
    };
  }, [filtered]);

  function openNew(prefillProfile?: string) {
    setForm({ ...emptyForm, profile_name: prefillProfile || (profile !== "all" ? profile : "") });
    setPendingMatches([]);
    setFormOpen(true);
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

  function runDuplicatePreview() {
    startTransition(async () => {
      const { matches } = await checkIcpFilterDuplicates(form);
      setPendingMatches(matches as DupMatch[]);
      if (matches.length === 0) toast.success("No strong duplicates found");
      else toast.message(`Found ${matches.length} similar filter(s)`);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ICP Filters</h2>
          <p className="text-sm text-muted-foreground">
            Track which outreach filters each profile used by month, week, and geography — and catch duplicates before you re-run them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <Button variant="outline" onClick={() => setSettingsOpen(true)} disabled={isPending}>
              Sheet settings
            </Button>
          )}
          <Button variant="outline" onClick={handleSync} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Sync from Sheet
          </Button>
          <Button onClick={() => openNew()} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Log new filter
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <div>
              <p className="font-medium">Could not load ICP filters from the database</p>
              <p className="text-muted-foreground">{error}</p>
              <p className="mt-1 text-muted-foreground">
                Apply migration <code className="text-xs">020_icp_filters.sql</code> on Supabase, then refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filters shown</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profiles</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.profiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Geographies touched</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.geos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Profile</Label>
            <Select value={profile} onValueChange={setProfile}>
              <SelectTrigger><SelectValue placeholder="All profiles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All profiles</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue placeholder="All months" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {monthLabel(2026, m).split(" ")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Geography</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue placeholder="All regions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {geographies.slice(0, 80).map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Company, title, industry…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4 text-primary" />
            Geography coverage by profile & month
          </CardTitle>
          <CardDescription>
            Quick view of where each profile has already run filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coverage data yet. Sync the sheet or log a filter.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coverage
                .filter((c) => {
                  if (profile !== "all" && c.profile.toLowerCase() !== profile.toLowerCase()) return false;
                  if (year !== "all" && c.year !== Number(year)) return false;
                  if (month !== "all" && c.month !== Number(month)) return false;
                  return true;
                })
                .slice(0, 24)
                .map((c) => (
                  <div
                    key={`${c.profile}-${c.year}-${c.month}`}
                    className="rounded-xl border border-border/60 bg-card/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-semibold">{c.profile}</p>
                      <Badge variant="secondary">{c.label}</Badge>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{c.count} filter(s)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.regions.slice(0, 8).map((r) => (
                        <Badge key={r} variant="outline" className="text-[11px] font-normal">
                          {r}
                        </Badge>
                      ))}
                      {c.regions.length > 8 && (
                        <Badge variant="outline" className="text-[11px]">+{c.regions.length - 8}</Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter log</CardTitle>
          <CardDescription>
            {syncMeta?.last_synced_at
              ? `Last sync: ${new Date(syncMeta.last_synced_at).toLocaleString()} — ${syncMeta.last_sync_message ?? ""}`
              : "Not synced from Google Sheets yet"}
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
                <TableHead>Source</TableHead>
                {isOwner && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    No ICP filters match these filters yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      <div>{f.filter_date_raw || f.filter_date || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {monthLabel(f.period_year, f.period_month)}
                        {f.period_week ? ` · W${f.period_week}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{f.profile_name}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm" title={f.regions ?? ""}>
                      {f.regions || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{f.company_headcount || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm" title={f.job_titles ?? ""}>
                      {f.job_titles || "—"}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm" title={f.industry ?? ""}>
                      {f.industry || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">{f.source}</Badge>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log a new ICP filter</DialogTitle>
            <DialogDescription>
              We&apos;ll warn you if a similar filter was already used on this profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["profile_name", "Profile *", "Asim"],
                ["filter_date_raw", "Date / period", "15 June or July 2026"],
                ["company_headcount", "Company headcount", "1-10 & 11-50"],
                ["years_experience", "Years of experience", "< 1 year & 1-2 years"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            {(
              [
                ["regions", "Region & states", "Seattle, San Francisco Bay Area"],
                ["job_titles", "Job titles", "CEO, CTO, Founder"],
                ["past_companies", "Past companies", "Google, Amazon, Meta"],
                ["industry", "Industry", "Software Development"],
                ["projects_closed", "Projects closed / outcomes", "1 Closed: ..."],
                ["notes", "Notes", "Optional"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5 sm:col-span-2">
                <Label>{label}</Label>
                <Textarea
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  rows={key === "past_companies" || key === "job_titles" ? 3 : 2}
                />
              </div>
            ))}
          </div>

          {pendingMatches.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Similar filters already on this profile
              </p>
              <ul className="space-y-2 text-sm">
                {pendingMatches.slice(0, 4).map((m, i) => (
                  <li key={i} className="rounded-lg border border-border/50 bg-background/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {m.filter.filter_date_raw || monthLabel(m.filter.period_year ?? null, m.filter.period_month ?? null)}
                      </span>
                      <Badge variant="secondary">{Math.round(m.score * 100)}% match</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.reasons.join(" · ")}</p>
                    <p className="mt-1 line-clamp-2 text-xs">{m.filter.regions}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={runDuplicatePreview} disabled={isPending || !form.profile_name}>
              Check duplicates
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
              This looks similar to a filter already run on {form.profile_name}. You can still save if it&apos;s intentional.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => submitForm(true)} disabled={isPending}>Save anyway</Button>
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
            <Button onClick={handleSaveSettings} disabled={isPending}>Save settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
