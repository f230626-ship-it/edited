"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSalesAccess, isSalesOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { fetchIcpFiltersFromSheet } from "@/lib/google/icp-filters-sheet";
import {
  extractGeographies,
  monthLabel,
  parseFilterPeriod,
  rowHash,
  scoreDuplicate,
  type IcpFilterInput,
} from "@/lib/icp/matching";
import type { IcpFilter, IcpFilterSyncMeta } from "@/types/database";

export interface IcpFiltersQuery {
  profile?: string;
  year?: number;
  month?: number;
  region?: string;
  search?: string;
}

export async function getIcpFilters(query: IcpFiltersQuery = {}) {
  await requireSalesAccess();
  const supabase = await createClient();

  let q = supabase
    .from("icp_filters")
    .select("*")
    .order("filter_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (query.profile) q = q.ilike("profile_name", query.profile);
  if (query.year) q = q.eq("period_year", query.year);
  if (query.month) q = q.eq("period_month", query.month);
  if (query.region) q = q.ilike("regions", `%${query.region}%`);
  if (query.search) {
    q = q.or(
      `past_companies.ilike.%${query.search}%,job_titles.ilike.%${query.search}%,industry.ilike.%${query.search}%,regions.ilike.%${query.search}%`
    );
  }

  const { data, error } = await q.limit(500);
  if (error) return { filters: [] as IcpFilter[], error: error.message };
  return { filters: (data ?? []) as IcpFilter[], error: null };
}

export async function getIcpFilterDashboard() {
  await requireSalesAccess();
  const supabase = await createClient();

  const [{ data: filters, error }, { data: syncMeta }] = await Promise.all([
    supabase
      .from("icp_filters")
      .select("*")
      .order("filter_date", { ascending: false, nullsFirst: false })
      .limit(1000),
    supabase.from("icp_filter_sync_meta").select("*").eq("id", "default").maybeSingle(),
  ]);

  if (error) {
    return {
      filters: [] as IcpFilter[],
      syncMeta: null as IcpFilterSyncMeta | null,
      coverage: [],
      profiles: [] as string[],
      years: [] as number[],
      geographies: [] as string[],
      error: error.message,
    };
  }

  const rows = (filters ?? []) as IcpFilter[];
  const profiles = Array.from(new Set(rows.map((r) => r.profile_name))).sort();
  const years = Array.from(
    new Set(rows.map((r) => r.period_year).filter((y): y is number => !!y))
  ).sort((a, b) => b - a);

  const geoSet = new Set<string>();
  for (const r of rows) {
    for (const g of extractGeographies(r.regions)) geoSet.add(g);
  }
  const geographies = Array.from(geoSet).sort();

  // Coverage matrix: profile × month → regions used
  const coverageMap = new Map<string, { profile: string; year: number; month: number; regions: Set<string>; count: number }>();
  for (const r of rows) {
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
      };
    entry.count += 1;
    for (const g of extractGeographies(r.regions)) entry.regions.add(g);
    coverageMap.set(key, entry);
  }

  const coverage = Array.from(coverageMap.values())
    .map((c) => ({
      profile: c.profile,
      year: c.year,
      month: c.month,
      label: monthLabel(c.year, c.month),
      regions: Array.from(c.regions).sort(),
      count: c.count,
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month || a.profile.localeCompare(b.profile));

  return {
    filters: rows,
    syncMeta: (syncMeta as IcpFilterSyncMeta | null) ?? null,
    coverage,
    profiles,
    years,
    geographies,
    error: null,
  };
}

export async function checkIcpFilterDuplicates(input: IcpFilterInput) {
  await requireSalesAccess();
  const supabase = await createClient();

  const { data } = await supabase
    .from("icp_filters")
    .select("*")
    .ilike("profile_name", input.profile_name)
    .limit(300);

  const matches = (data as IcpFilter[] | null)?.flatMap((row) => {
    const match = scoreDuplicate(input, row);
    return match ? [match] : [];
  }) ?? [];

  matches.sort((a, b) => b.score - a.score);
  return { matches: matches.slice(0, 8) };
}

export async function createIcpFilter(input: IcpFilterInput & { force?: boolean }) {
  const employee = await requireSalesAccess();
  const supabase = await createClient();

  if (!input.profile_name?.trim()) {
    return { error: "Profile name is required" };
  }

  if (!input.force) {
    const { matches } = await checkIcpFilterDuplicates(input);
    if (matches.length > 0 && matches[0].score >= 0.45) {
      const top = matches[0];
      const freshnessNote = top.freshness?.label ? ` ${top.freshness.label}.` : "";
      const closedNote =
        top.closed?.closedCount > 0
          ? ` That prior run closed ${top.closed.closedCount} project(s).`
          : "";
      return {
        error: null,
        needsConfirmation: true,
        matches,
        message: `Similar filter already used on ${input.profile_name}.${freshnessNote}${closedNote}`,
      };
    }
  }

  const period = parseFilterPeriod(
    input.filter_date_raw || input.filter_date || null,
    new Date().getFullYear()
  );

  const payload = {
    profile_name: input.profile_name.trim(),
    filter_date_raw: input.filter_date_raw ?? null,
    filter_date: period.filter_date ?? input.filter_date ?? null,
    period_year: period.period_year,
    period_month: period.period_month,
    period_week: period.period_week,
    company_headcount: input.company_headcount ?? null,
    past_companies: input.past_companies ?? null,
    regions: input.regions ?? null,
    job_titles: input.job_titles ?? null,
    industry: input.industry ?? null,
    years_experience: input.years_experience ?? null,
    projects_closed: input.projects_closed ?? null,
    notes: input.notes ?? null,
    source: "manual" as const,
    external_row_hash: rowHash(input),
    created_by: employee.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("icp_filters").insert(payload).select("*").single();
  if (error) return { error: error.message };

  revalidatePath("/sales/icp-filters");
  return { filter: data as IcpFilter, error: null };
}

export async function deleteIcpFilter(id: string) {
  const employee = await requireSalesAccess();
  if (!isSalesOwner(employee.role)) {
    return { error: "Only admins can delete ICP filters" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("icp_filters").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sales/icp-filters");
  return { success: true };
}

export async function syncIcpFiltersFromSheet(options?: {
  spreadsheetId?: string;
  tabName?: string;
}) {
  const employee = await requireSalesAccess();
  const admin = createAdminClient();

  const { data: meta } = await admin
    .from("icp_filter_sync_meta")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const spreadsheetId =
    options?.spreadsheetId ||
    meta?.google_sheet_id ||
    process.env.ICP_FILTERS_GOOGLE_SHEET_ID ||
    "";
  const tabName =
    options?.tabName ||
    meta?.sheet_tab_name ||
    process.env.ICP_FILTERS_SHEET_TAB ||
    "Sales Filter's";

  if (!spreadsheetId) {
    return {
      error:
        "Google Sheet ID not configured. Set ICP_FILTERS_GOOGLE_SHEET_ID or save it in sync settings.",
    };
  }

  try {
    const rows = await fetchIcpFiltersFromSheet(spreadsheetId, tabName);
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const { data: existing } = await admin
        .from("icp_filters")
        .select("id")
        .eq("external_row_hash", row.external_row_hash)
        .maybeSingle();

      if (existing) {
        skipped += 1;
        continue;
      }

      const { error } = await admin.from("icp_filters").insert({
        profile_name: row.profile_name,
        filter_date_raw: row.filter_date_raw,
        filter_date: row.filter_date,
        period_year: row.period_year,
        period_month: row.period_month,
        period_week: row.period_week,
        company_headcount: row.company_headcount,
        past_companies: row.past_companies,
        regions: row.regions,
        job_titles: row.job_titles,
        industry: row.industry,
        years_experience: row.years_experience,
        projects_closed: row.projects_closed,
        notes: row.notes,
        source: "sheet_sync",
        external_row_hash: row.external_row_hash,
        created_by: employee.id,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("ICP sync insert failed:", error.message);
        continue;
      }
      inserted += 1;
    }

    await admin.from("icp_filter_sync_meta").upsert({
      id: "default",
      google_sheet_id: spreadsheetId,
      sheet_tab_name: tabName,
      last_synced_at: new Date().toISOString(),
      last_sync_status: "ok",
      last_sync_message: `Imported ${inserted} new rows, skipped ${skipped} duplicates`,
      last_sync_count: inserted,
      updated_at: new Date().toISOString(),
    });

    revalidatePath("/sales/icp-filters");
    return { inserted, skipped, total: rows.length, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("icp_filter_sync_meta").upsert({
      id: "default",
      google_sheet_id: spreadsheetId,
      sheet_tab_name: tabName,
      last_synced_at: new Date().toISOString(),
      last_sync_status: "error",
      last_sync_message: message,
      last_sync_count: 0,
      updated_at: new Date().toISOString(),
    });
    return { error: message };
  }
}

export async function updateIcpSyncSettings(input: {
  google_sheet_id: string;
  sheet_tab_name: string;
}) {
  const employee = await requireSalesAccess();
  if (!isSalesOwner(employee.role)) {
    return { error: "Only admins can update sync settings" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("icp_filter_sync_meta").upsert({
    id: "default",
    google_sheet_id: input.google_sheet_id.trim(),
    sheet_tab_name: input.sheet_tab_name.trim() || "Sales Filter's",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/sales/icp-filters");
  return { success: true };
}

/** Cron-friendly sync using service role (no user session). */
export async function runIcpFiltersCronSync() {
  const admin = createAdminClient();
  const { data: meta } = await admin
    .from("icp_filter_sync_meta")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const spreadsheetId =
    meta?.google_sheet_id || process.env.ICP_FILTERS_GOOGLE_SHEET_ID || "";
  const tabName =
    meta?.sheet_tab_name || process.env.ICP_FILTERS_SHEET_TAB || "Sales Filter's";

  if (!spreadsheetId) {
    return { error: "ICP_FILTERS_GOOGLE_SHEET_ID not configured" };
  }

  const rows = await fetchIcpFiltersFromSheet(spreadsheetId, tabName);
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const { data: existing } = await admin
      .from("icp_filters")
      .select("id")
      .eq("external_row_hash", row.external_row_hash)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }
    const { error } = await admin.from("icp_filters").insert({
      ...row,
      source: "sheet_sync",
      updated_at: new Date().toISOString(),
    });
    if (!error) inserted += 1;
  }

  await admin.from("icp_filter_sync_meta").upsert({
    id: "default",
    google_sheet_id: spreadsheetId,
    sheet_tab_name: tabName,
    last_synced_at: new Date().toISOString(),
    last_sync_status: "ok",
    last_sync_message: `Cron: imported ${inserted}, skipped ${skipped}`,
    last_sync_count: inserted,
    updated_at: new Date().toISOString(),
  });

  return { inserted, skipped, total: rows.length };
}
