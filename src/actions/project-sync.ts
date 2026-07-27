"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { fetchProjectsFromSheet } from "@/lib/google/projects-sheet";
import type { ProjectSheetRow } from "@/lib/projects/sheet-parse";
import type { ProjectSyncMeta } from "@/types/database";

function findEmployeeId(
  employees: { id: string; full_name: string }[],
  name: string | null | undefined
): string | null {
  if (!name?.trim()) return null;
  const match = employees.find(
    (e) => e.full_name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  return match?.id ?? null;
}

async function upsertProjectFromSheetRow(
  admin: ReturnType<typeof createAdminClient>,
  row: ProjectSheetRow,
  employees: { id: string; full_name: string }[],
  actorId: string | null
) {
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
    payment_structure: row.payment_structure,
    project_rate: row.project_rate,
    expected_monthly_revenue: row.expected_monthly_revenue,
    profile_name: row.profile_name,
    is_monthly_retainer: row.is_monthly_retainer,
    retainer_amount: row.retainer_amount,
    expected_profit: row.expected_profit,
    manager_id: findEmployeeId(employees, row.manager_name),
    bd_id: findEmployeeId(employees, row.bd_name),
    closing_developer_id: findEmployeeId(employees, row.dev_name),
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
    return { id: byHash.id as string, action: "updated" as const };
  }

  const { data: byName } = await admin
    .from("projects")
    .select("id")
    .ilike("name", row.name)
    .ilike("client_name", row.client_name)
    .maybeSingle();

  if (byName?.id) {
    const { error } = await admin.from("projects").update(payload).eq("id", byName.id);
    if (error) throw new Error(error.message);
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

  // Optional resource assignment from Assigned Resource / team members
  const teamNames = [
    ...(row.dev_name ? [row.dev_name] : []),
    ...((row.team_members_raw || "").split(/[,;|]/).map((n) => n.trim()).filter(Boolean)),
  ];
  const teamIds = Array.from(
    new Set(
      teamNames
        .map((n) => findEmployeeId(employees, n))
        .filter((id): id is string => !!id)
    )
  );

  if (inserted?.id && teamIds.length > 0) {
    await admin.from("project_resources").insert(
      teamIds.map((empId) => ({
        project_id: inserted.id,
        employee_id: empId,
        role: "Full Stack Developer",
        allocation_percentage: Math.floor(100 / teamIds.length),
        start_date: row.start_date,
        end_date: row.expected_delivery_date,
      }))
    );
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
    sheet_tab_name: input.sheet_tab_name.trim() || "Projects & Clients Sheet",
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
  const tabName =
    options?.tabName ||
    meta?.sheet_tab_name ||
    process.env.PROJECTS_SHEET_TAB ||
    "Projects & Clients Sheet";

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
      .select("id, full_name")
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

    await admin.from("project_sync_meta").upsert({
      id: "default",
      google_sheet_id: spreadsheetId,
      sheet_tab_name: tabName,
      last_synced_at: new Date().toISOString(),
      last_sync_status: "ok",
      last_sync_message: `Synced ${rows.length} rows — ${inserted} new, ${updated} updated${failed ? `, ${failed} failed` : ""}`,
      last_sync_count: inserted + updated,
      updated_at: new Date().toISOString(),
    });

    revalidatePath("/projects");
    return { inserted, updated, failed, total: rows.length, error: null };
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
  const tabName =
    meta?.sheet_tab_name || process.env.PROJECTS_SHEET_TAB || "Projects & Clients Sheet";

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
    .select("id, full_name")
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

  await admin.from("project_sync_meta").upsert({
    id: "default",
    google_sheet_id: spreadsheetId,
    sheet_tab_name: tabName,
    last_synced_at: new Date().toISOString(),
    last_sync_status: "ok",
    last_sync_message: `Cron: ${inserted} new, ${updated} updated${failed ? `, ${failed} failed` : ""}`,
    last_sync_count: inserted + updated,
    updated_at: new Date().toISOString(),
  });

  return { inserted, updated, failed, total: rows.length };
}
