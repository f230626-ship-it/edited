"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee, requireAuth, isBdEmployee } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Employee } from "@/types/database";

const PROJECT_WRITE_COLUMNS = [
  "name",
  "client_name",
  "company_name",
  "client_email",
  "client_contact_number",
  "description",
  "industry",
  "bd_id",
  "lead_source",
  "closing_developer_id",
  "manager_id",
  "value",
  "currency",
  "is_monthly_retainer",
  "retainer_amount",
  "expected_profit",
  "payment_status",
  "start_date",
  "expected_delivery_date",
  "actual_delivery_date",
  "status",
  "priority",
  "progress_percentage",
  "project_type",
  "payment_structure",
  "project_rate",
  "expected_monthly_revenue",
  "profile_name",
  "business_model",
  "assigned_bd_label",
  "assigned_resource_label",
  "closer_label",
] as const;

const INDUSTRY_VALUES = new Set([
  "Real Estate",
  "Healthcare",
  "Restaurant",
  "Hotel",
  "E-commerce",
  "Other",
]);
const LEAD_SOURCE_VALUES = new Set([
  "Fiverr",
  "Upwork",
  "LinkedIn",
  "Website",
  "Referral",
  "Cold Email",
  "Other",
]);
const PAYMENT_STATUS_VALUES = new Set(["Pending", "Partial", "Paid", "Overdue"]);
const STATUS_VALUES = new Set([
  "Lead Won",
  "Onboarding",
  "In Progress",
  "On Hold",
  "Completed",
  "Maintenance",
  "Paused",
  "Cancelled",
  "Archived",
]);
const PRIORITY_VALUES = new Set(["Low", "Medium", "High"]);

function canWriteProjects(employee: {
  role: string;
  pm_role: string | null;
}): boolean {
  return (
    employee.role === "admin" ||
    employee.pm_role === "admin" ||
    employee.pm_role === "coordinator"
  );
}

function canDeleteProjects(employee: {
  role: string;
  pm_role: string | null;
}): boolean {
  return employee.role === "admin" || employee.pm_role === "admin";
}

const MY_PROJECTS_SELECT = `
  id, name, client_name, status, progress_percentage, value, currency,
  start_date, expected_delivery_date, bd_id, assigned_bd_label,
  manager:employees!manager_id(full_name)
`;

/**
 * Projects visible to a non-admin employee on their dashboard.
 * - BD: only deals assigned to them (`bd_id`), plus label fallback when FK is null
 * - Everyone else: only projects where they are a resource
 */
export async function fetchAssignedProjectsForEmployee(
  employee: Pick<Employee, "id" | "full_name" | "designation" | "pm_role" | "role">
) {
  const admin = createAdminClient();

  if (isBdEmployee(employee)) {
    const byBdId = await admin
      .from("projects")
      .select(MY_PROJECTS_SELECT)
      .eq("bd_id", employee.id)
      .order("created_at", { ascending: false });

    if (byBdId.error) {
      console.error("[MY_PROJECTS] BD query error:", byBdId.error.message);
    }

    const map = new Map<string, NonNullable<typeof byBdId.data>[number]>();
    for (const p of byBdId.data ?? []) map.set(p.id, p);

    // Sheet sync can leave bd_id null while still storing the BD name on the label
    const name = (employee.full_name || "").trim();
    if (name.length >= 3) {
      const byLabel = await admin
        .from("projects")
        .select(MY_PROJECTS_SELECT)
        .is("bd_id", null)
        .ilike("assigned_bd_label", `%${name}%`)
        .order("created_at", { ascending: false });

      if (byLabel.error) {
        console.error("[MY_PROJECTS] BD label query error:", byLabel.error.message);
      }
      for (const p of byLabel.data ?? []) {
        if (!map.has(p.id)) map.set(p.id, p);
      }
    }

    return Array.from(map.values());
  }

  const { data: resourceRows, error: resourceError } = await admin
    .from("project_resources")
    .select("project_id")
    .eq("employee_id", employee.id);

  if (resourceError) {
    console.error("[MY_PROJECTS] Resource query error:", resourceError.message);
    return [];
  }
  if (!resourceRows?.length) return [];

  const projectIds = [...new Set(resourceRows.map((r) => r.project_id))];
  const { data, error } = await admin
    .from("projects")
    .select(MY_PROJECTS_SELECT)
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[MY_PROJECTS] Projects query error:", error.message);
    return [];
  }
  return data ?? [];
}

function buildProjectPayload(formData: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(formData.entries());
  const payload: Record<string, unknown> = {};

  for (const key of PROJECT_WRITE_COLUMNS) {
    if (!(key in raw)) continue;
    const value = raw[key];
    if (value === "" || value === undefined) {
      payload[key] = null;
    } else {
      payload[key] = value;
    }
  }

  // Always allow clearing optional FKs when keys are present (including empty)
  if (formData.has("bd_id")) {
    const v = formData.get("bd_id");
    payload.bd_id = v && String(v).trim() ? String(v) : null;
  }
  if (formData.has("closing_developer_id")) {
    const v = formData.get("closing_developer_id");
    payload.closing_developer_id = v && String(v).trim() ? String(v) : null;
  }
  if (formData.has("manager_id")) {
    const v = formData.get("manager_id");
    payload.manager_id = v && String(v).trim() ? String(v) : null;
  }

  if (payload.progress_percentage != null) {
    payload.progress_percentage = Number(payload.progress_percentage) || 0;
  }
  if (payload.value != null) {
    payload.value = Number(payload.value) || 0;
  }
  if (payload.expected_monthly_revenue != null) {
    payload.expected_monthly_revenue = Number(payload.expected_monthly_revenue) || null;
  }
  if (payload.retainer_amount != null) {
    payload.retainer_amount = Number(payload.retainer_amount) || null;
  }
  if (payload.expected_profit != null) {
    payload.expected_profit = Number(payload.expected_profit) || null;
  }
  if (payload.is_monthly_retainer != null) {
    payload.is_monthly_retainer =
      payload.is_monthly_retainer === true || payload.is_monthly_retainer === "true";
  }

  // Normalize CHECK-constrained enums so sheet free-text doesn't blow up updates
  if (payload.industry != null && !INDUSTRY_VALUES.has(String(payload.industry))) {
    payload.industry = "Other";
  }
  if (payload.lead_source != null && !LEAD_SOURCE_VALUES.has(String(payload.lead_source))) {
    payload.lead_source = "Other";
  }
  if (
    payload.payment_status != null &&
    !PAYMENT_STATUS_VALUES.has(String(payload.payment_status))
  ) {
    payload.payment_status = "Pending";
  }
  if (payload.status != null && !STATUS_VALUES.has(String(payload.status))) {
    payload.status = "Lead Won";
  }
  if (payload.priority != null && !PRIORITY_VALUES.has(String(payload.priority))) {
    payload.priority = "Medium";
  }

  return payload;
}

export async function createProject(formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) return { error: "Not authenticated" };
  if (!canWriteProjects(employee)) {
    return { error: "Only admins or project coordinators can create projects" };
  }

  const payload = buildProjectPayload(formData);
  if (!payload.name) return { error: "Project name is required" };
  if (payload.value == null) payload.value = 0;
  if (!payload.industry) payload.industry = "Other";
  if (!payload.lead_source) payload.lead_source = "Other";
  if (!payload.payment_status) payload.payment_status = "Pending";
  if (!payload.status) payload.status = "Lead Won";
  if (!payload.currency) payload.currency = "USD";
  if (payload.is_monthly_retainer == null) payload.is_monthly_retainer = false;
  if (!payload.start_date) {
    payload.start_date = new Date().toISOString().slice(0, 10);
  }
  if (!payload.expected_delivery_date) {
    payload.expected_delivery_date = payload.start_date;
  }

  // Admin client: portal admins may have role=admin but pm_role=developer (RLS would block)
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  return { project: data };
}

export async function updateProject(id: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) return { error: "Not authenticated" };
  if (!canWriteProjects(employee)) {
    return { error: "Only admins or project coordinators can edit projects" };
  }

  const payload = buildProjectPayload(formData);
  if (Object.keys(payload).length === 0) {
    return { error: "No project fields to update" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { project: data };
}

export async function deleteProject(id: string) {
  const employee = await getCurrentEmployee();
  if (!employee) return { error: "Not authenticated" };
  if (!canDeleteProjects(employee)) {
    return { error: "Only admins can delete projects" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function assignResource(
  projectId: string,
  data: {
    employeeId: string;
    role: string;
    allocationPercentage: number;
    startDate?: string;
    endDate?: string;
  }
) {
  const supabase = createAdminClient();
  await requireAuth();

  const { error } = await supabase.from("project_resources").insert({
    project_id: projectId,
    employee_id: data.employeeId,
    role: data.role,
    allocation_percentage: data.allocationPercentage,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
  });

  if (error) {
    console.error("Error assigning resource:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function bulkImportProjects(payload: Record<string, unknown>[]) {
  const supabase = createAdminClient();
  await requireAuth();

  const allowedColumns = [
    "name", "client_name", "company_name", "client_email", "client_contact_number",
    "description", "industry", "bd_id", "lead_source", "closing_developer_id",
    "manager_id", "value", "currency", "is_monthly_retainer", "retainer_amount",
    "expected_profit", "payment_status", "start_date", "expected_delivery_date",
    "actual_delivery_date", "status", "priority", "progress_percentage",
    "project_type", "payment_structure", "project_rate", "expected_monthly_revenue",
    "profile_name", "business_model", "assigned_bd_label", "assigned_resource_label", "closer_label",
  ];

  let successCount = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < payload.length; i++) {
    const row = payload[i];
    const projectData: Record<string, unknown> = {};

    for (const key of allowedColumns) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        projectData[key] = row[key];
      }
    }

    if (!projectData.name) {
      errors.push({ row: i + 2, error: "Missing project name" });
      continue;
    }

    projectData.currency = projectData.currency || "USD";
    projectData.is_monthly_retainer = projectData.is_monthly_retainer ?? false;
    projectData.industry = projectData.industry || "Other";
    projectData.lead_source = projectData.lead_source || "Other";
    projectData.payment_status = projectData.payment_status || "Pending";
    projectData.status = projectData.status || "Lead Won";
    projectData.value = Number(projectData.value) || 0;
    projectData.source = "excel_import";

    if (!projectData.start_date) {
      projectData.start_date = new Date().toISOString().split("T")[0];
    }
    if (!projectData.expected_delivery_date) {
      projectData.expected_delivery_date = projectData.start_date;
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select("id")
      .single();

    if (error) {
      console.error(`Error importing row ${i + 2} ("${projectData.name}"):`, error.message);
      errors.push({ row: i + 2, error: error.message });
      continue;
    }

    const teamIds = row.team_employee_ids as string[] | undefined;
    if (project && teamIds && teamIds.length > 0) {
      const resourceInserts = teamIds.map((empId) => ({
        project_id: project.id,
        employee_id: empId,
        role: "Full Stack Developer" as const,
        allocation_percentage: Math.floor(100 / teamIds.length),
        start_date: row.start_date || null,
        end_date: row.expected_delivery_date || null,
      }));

      await supabase.from("project_resources").insert(resourceInserts);
    }

    successCount++;
  }

  revalidatePath("/projects");
  return { success: successCount > 0, successCount, errors };
}

export async function checkApproachingDeliveries() {
  const supabase = await createClient();
  return { success: true };
}

export async function updateResource(
  resourceId: string,
  data: {
    role: string;
    allocationPercentage: number;
    startDate?: string;
    endDate?: string;
  }
) {
  const supabase = createAdminClient();
  await requireAuth();

  const { error } = await supabase
    .from("project_resources")
    .update({
      role: data.role,
      allocation_percentage: data.allocationPercentage,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
    })
    .eq("id", resourceId);

  if (error) {
    console.error("Error updating resource:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function removeResource(resourceId: string) {
  const supabase = createAdminClient();
  await requireAuth();

  const { error } = await supabase
    .from("project_resources")
    .delete()
    .eq("id", resourceId);

  if (error) {
    console.error("Error removing resource:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function updateProjectProgress(projectId: string, progress: number) {
  const supabase = createAdminClient();
  await requireAuth();

  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

  const { error } = await supabase
    .from("projects")
    .update({ progress_percentage: clampedProgress })
    .eq("id", projectId);

  if (error) {
    console.error("Error updating progress:", error);
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function getMyProjects(employeeId: string) {
  const supabase = createAdminClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("id, full_name, designation, pm_role, role")
    .eq("id", employeeId)
    .maybeSingle();

  if (!emp) return [];
  return fetchAssignedProjectsForEmployee(emp);
}
