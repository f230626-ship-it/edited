"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { fetchProjectsFromSheet } from "@/lib/google/projects-sheet";
import type { ProjectSheetRow } from "@/lib/projects/sheet-parse";
import type { ProjectSyncMeta } from "@/types/database";

const DEFAULT_PROJECTS_TAB = "Projects & Clients Sheet";

function resolveProjectsTabName(raw?: string | null) {
  const tab = (raw || "").trim();
  // Guard against the old incorrect default tab name
  if (!tab || tab === "Projects") return DEFAULT_PROJECTS_TAB;
  return tab;
}

/** Match sheet person labels to employees. Prefer `preferRoles` when set (e.g. closers = non-BD). */
function findEmployeeId(
  employees: { id: string; full_name: string; pm_role?: string | null }[],
  name: string | null | undefined,
  options?: { preferNonBd?: boolean }
): string | null {
  if (!name?.trim()) return null;
  const junk = /^(none|n\/a|na|null|tbd|-|reference|upsell|unassigned|unknown)$/i;
  if (junk.test(name.trim())) return null;
  // Never treat outsource notes as a person match for closers
  if (/\boutsource\b/i.test(name) && options?.preferNonBd) return null;

  const aliases: Record<string, string[]> = {
    moin: ["moin", "moeen"],
    moeen: ["moeen", "moin"],
  };

  const raw = name.toLowerCase().trim();
  const cleaned = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\s*%/g, " ")
    .replace(/\b(share|upsell|reference|outsource(d)?|to|looking for)\b/gi, " ")
    .replace(/[+/,;|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = new Set<string>([raw, cleaned].filter(Boolean));
  for (const t of [...tokens]) {
    for (const a of aliases[t] || []) tokens.add(a);
  }

  const ranked = [...employees].sort((a, b) => {
    if (!options?.preferNonBd) return 0;
    const score = (e: { pm_role?: string | null }) =>
      e.pm_role === "bd" ? 2 : e.pm_role === "developer" || e.pm_role === "admin" ? 0 : 1;
    return score(a) - score(b);
  });

  for (const candidate of tokens) {
    const exact = ranked.find((e) => e.full_name.toLowerCase().trim() === candidate);
    if (exact) return exact.id;

    const firstName = ranked.find(
      (e) => e.full_name.toLowerCase().split(/\s+/)[0] === candidate
    );
    if (firstName) return firstName.id;
  }

  // Longest name-part wins (avoid matching tiny tokens)
  let best: { id: string; len: number; rank: number } | null = null;
  for (const e of ranked) {
    const rank =
      options?.preferNonBd && e.pm_role === "bd"
        ? 2
        : options?.preferNonBd && (e.pm_role === "developer" || e.pm_role === "admin")
          ? 0
          : 1;
    for (const part of e.full_name.toLowerCase().split(/\s+/)) {
      if (part.length < 3) continue;
      const re = new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(cleaned || raw) && (!best || part.length > best.len || (part.length === best.len && rank < best.rank))) {
        best = { id: e.id, len: part.length, rank };
      }
    }
  }
  return best?.id ?? null;
}

function collectEmployeeIdsFromLabels(
  employees: { id: string; full_name: string; pm_role?: string | null }[],
  labels: (string | null | undefined)[],
  options?: { preferNonBd?: boolean }
): string[] {
  const ids = new Set<string>();
  for (const label of labels) {
    if (!label?.trim()) continue;
    // Split compound labels: "Fatima + Momina", "Upsell (Faizan + Asim)"
    const chunks = label
      .split(/[+/,;|&]|\band\b/i)
      .map((c) => c.replace(/[()]/g, " ").trim())
      .filter(Boolean);
    for (const chunk of chunks.length ? chunks : [label]) {
      const id = findEmployeeId(employees, chunk, options);
      if (id) ids.add(id);
    }
    // Also try the whole string once (e.g. "Fatima Amer")
    const whole = findEmployeeId(employees, label, options);
    if (whole) ids.add(whole);
  }
  return Array.from(ids);
}

async function syncProjectResources(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  row: ProjectSheetRow,
  employees: { id: string; full_name: string }[]
) {
  const teamIds = collectEmployeeIdsFromLabels(employees, [
    row.dev_name,
    row.team_members_raw,
  ]);
  if (teamIds.length === 0) return;

  const { data: existing } = await admin
    .from("project_resources")
    .select("employee_id")
    .eq("project_id", projectId);

  const have = new Set((existing ?? []).map((r) => r.employee_id as string));
  const toAdd = teamIds.filter((id) => !have.has(id));
  if (toAdd.length === 0) return;

  await admin.from("project_resources").insert(
    toAdd.map((empId) => ({
      project_id: projectId,
      employee_id: empId,
      role: "Full Stack Developer",
      allocation_percentage: Math.floor(100 / teamIds.length),
      start_date: row.start_date,
      end_date: row.expected_delivery_date,
    }))
  );
}

async function upsertProjectFromSheetRow(
  admin: ReturnType<typeof createAdminClient>,
  row: ProjectSheetRow,
  employees: { id: string; full_name: string; pm_role?: string | null }[],
  actorId: string | null
) {
  const bdIds = collectEmployeeIdsFromLabels(employees, [row.bd_name]);
  // Closer = closing developer only (Abdullah / Fatima / Moeen). Never fall back to
  // Assigned Resource or BD — those columns are a different role.
  const closerId = findEmployeeId(employees, row.closer_name, { preferNonBd: true });

  const payload = {
    name: row.name,
    client_name: row.client_name,
    client_email: row.client_email,
    client_contact_number: row.client_contact_number,
    company_name: row.company_name,
    description: row.description,
    industry: row.industry,
    lead_source: row.lead_source,
    start_date: row.start_date,
    expected_delivery_date: row.expected_delivery_date,
    status: row.status,
    priority: row.priority,
    value: row.value,
    currency: row.currency,
    payment_status: row.payment_status,
    progress_percentage: row.progress_percentage,
    project_type: row.project_type,
    business_model: row.business_model,
    payment_structure: row.payment_structure,
    project_rate: row.project_rate,
    expected_monthly_revenue: row.expected_monthly_revenue,
    profile_name: row.profile_name,
    assigned_bd_label: row.bd_name,
    assigned_resource_label: row.dev_name,
    closer_label: row.closer_name || null,
    is_monthly_retainer: row.is_monthly_retainer,
    retainer_amount: row.retainer_amount,
    expected_profit: row.expected_profit,
    manager_id: findEmployeeId(employees, row.manager_name),
    bd_id: bdIds[0] ?? findEmployeeId(employees, row.bd_name),
    closing_developer_id: closerId,
    source: "sheet_sync" as const,
    external_row_hash: row.external_row_hash,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  };

  const { data: byHash } = await admin
    .from("projects")
    .select("id")
    .eq("external_row_hash", row.external_row_hash)
    .maybeSingle();

  if (byHash?.id) {
    const { error } = await admin.from("projects").update(payload).eq("id", byHash.id);
    if (error) throw new Error(error.message);
    await syncProjectResources(admin, byHash.id, row, employees);
    return { id: byHash.id as string, action: "updated" as const };
  }

  // Fallback match: same client + project name (handles hash changes after parser fixes)
  const { data: byName } = await admin
    .from("projects")
    .select("id")
    .ilike("name", row.name)
    .ilike("client_name", row.client_name)
    .maybeSingle();

  if (byName?.id) {
    const { error } = await admin.from("projects").update(payload).eq("id", byName.id);
    if (error) throw new Error(error.message);
    await syncProjectResources(admin, byName.id, row, employees);
    return { id: byName.id as string, action: "updated" as const };
  }

  const { data: inserted, error } = await admin
    .from("projects")
    .insert({
      ...payload,
      created_by: actorId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (inserted?.id) {
    await syncProjectResources(admin, inserted.id, row, employees);
  }

  return { id: inserted.id as string, action: "inserted" as const };
}

export async function getProjectSyncMeta() {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_sync_meta")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  return (data as ProjectSyncMeta | null) ?? null;
}

export async function updateProjectSyncSettings(input: {
  google_sheet_id: string;
  sheet_tab_name: string;
}) {
  await requireRole("admin");
  const admin = createAdminClient();
  const { error } = await admin.from("project_sync_meta").upsert({
    id: "default",
    google_sheet_id: input.google_sheet_id.trim(),
    sheet_tab_name: resolveProjectsTabName(input.sheet_tab_name),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/projects");
  return { success: true };
}

export async function syncProjectsFromSheet(options?: {
  spreadsheetId?: string;
  tabName?: string;
}) {
  const employee = await requireRole("admin");
  const admin = createAdminClient();

  const { data: meta } = await admin
    .from("project_sync_meta")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const spreadsheetId =
    options?.spreadsheetId ||
    meta?.google_sheet_id ||
    process.env.PROJECTS_GOOGLE_SHEET_ID ||
    "";
  const tabName = resolveProjectsTabName(
    options?.tabName ||
      meta?.sheet_tab_name ||
      process.env.PROJECTS_SHEET_TAB
  );

  if (!spreadsheetId) {
    return {
      error:
        "Google Sheet ID not configured. Set PROJECTS_GOOGLE_SHEET_ID or save it in Sheet settings.",
    };
  }

  try {
    const rows = await fetchProjectsFromSheet(spreadsheetId, tabName);
    const { data: employees } = await admin
      .from("employees")
      .select("id, full_name, pm_role")
      .eq("status", "active");

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const result = await upsertProjectFromSheetRow(
          admin,
          row,
          employees ?? [],
          employee.id
        );
        if (result.action === "inserted") inserted += 1;
        else updated += 1;
      } catch (err) {
        failed += 1;
        console.error("Project sheet sync row failed:", row.name, err);
      }
    }

    const status =
      failed === 0 ? "ok" : inserted + updated === 0 ? "error" : "partial";

    await admin.from("project_sync_meta").upsert({
      id: "default",
      google_sheet_id: spreadsheetId,
      sheet_tab_name: tabName,
      last_synced_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_message: `Synced ${rows.length} rows — ${inserted} new, ${updated} updated${failed ? `, ${failed} failed` : ""}`,
      last_sync_count: inserted + updated,
      updated_at: new Date().toISOString(),
    });

    revalidatePath("/projects");
    return {
      inserted,
      updated,
      failed,
      total: rows.length,
      error:
        status === "error"
          ? `All ${failed} rows failed to sync. Check server logs (often a DB trigger issue).`
          : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("project_sync_meta").upsert({
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

/** Cron-friendly biweekly sync (service role, no user session). */
export async function runProjectsSheetCronSync() {
  const admin = createAdminClient();
  const { data: meta } = await admin
    .from("project_sync_meta")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const spreadsheetId =
    meta?.google_sheet_id || process.env.PROJECTS_GOOGLE_SHEET_ID || "";
  const tabName = resolveProjectsTabName(
    meta?.sheet_tab_name || process.env.PROJECTS_SHEET_TAB
  );

  if (!spreadsheetId) {
    return { error: "PROJECTS_GOOGLE_SHEET_ID not configured" };
  }

  // Guard: skip if last successful sync was < 12 days ago (keeps ~biweekly even if cron fires more often)
  if (meta?.last_synced_at && meta?.last_sync_status === "ok") {
    const last = new Date(meta.last_synced_at).getTime();
    const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
    if (days < 12) {
      return {
        skipped: true,
        message: `Last sync was ${days.toFixed(1)} days ago — waiting for ~2 weeks`,
      };
    }
  }

  const rows = await fetchProjectsFromSheet(spreadsheetId, tabName);
  const { data: employees } = await admin
    .from("employees")
      .select("id, full_name, pm_role")
      .eq("status", "active");

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await upsertProjectFromSheetRow(admin, row, employees ?? [], null);
      if (result.action === "inserted") inserted += 1;
      else updated += 1;
    } catch {
      failed += 1;
    }
  }

  const status =
    failed === 0 ? "ok" : inserted + updated === 0 ? "error" : "partial";

  await admin.from("project_sync_meta").upsert({
    id: "default",
    google_sheet_id: spreadsheetId,
    sheet_tab_name: tabName,
    last_synced_at: new Date().toISOString(),
    last_sync_status: status,
    last_sync_message: `Cron: ${inserted} new, ${updated} updated${failed ? `, ${failed} failed` : ""}`,
    last_sync_count: inserted + updated,
    updated_at: new Date().toISOString(),
  });

  return { inserted, updated, failed, total: rows.length, status };
}
