"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  await requireAuth();

  const rawData = Object.fromEntries(formData.entries());
  
  // Clean up empty strings to null
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (value === "") {
      payload[key] = null;
    } else {
      payload[key] = value;
    }
  }

  // Handle specific types
  if (payload.progress_percentage) {
    payload.progress_percentage = Number(payload.progress_percentage);
  }
  if (payload.value) {
    payload.value = Number(payload.value);
  }
  if (payload.expected_monthly_revenue) {
    payload.expected_monthly_revenue = Number(payload.expected_monthly_revenue);
  }
  if (payload.is_monthly_retainer) {
    payload.is_monthly_retainer = payload.is_monthly_retainer === "true";
  }

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
  const supabase = await createClient();
  await requireAuth();

  const rawData = Object.fromEntries(formData.entries());
  
  // Clean up empty strings to null
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (value === "") {
      payload[key] = null;
    } else {
      payload[key] = value;
    }
  }

  // Handle specific types
  if (payload.progress_percentage) {
    payload.progress_percentage = Number(payload.progress_percentage);
  }
  if (payload.value) {
    payload.value = Number(payload.value);
  }
  if (payload.expected_monthly_revenue) {
    payload.expected_monthly_revenue = Number(payload.expected_monthly_revenue);
  }
  if (payload.is_monthly_retainer) {
    payload.is_monthly_retainer = payload.is_monthly_retainer === "true";
  }

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
    "profile_name", "business_model", "assigned_bd_label", "assigned_resource_label",
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

  const { data: resourceProjects } = await supabase
    .from("project_resources")
    .select("project_id")
    .eq("employee_id", employeeId);

  if (!resourceProjects || resourceProjects.length === 0) {
    return [];
  }

  const projectIds = resourceProjects.map((r) => r.project_id);

  const { data: projects } = await supabase
    .from("projects")
    .select(`
      *,
      manager:employees!manager_id(id, full_name, email),
      resources:project_resources(
        *, employee:employees(id, full_name, email)
      )
    `)
    .in("id", projectIds)
    .order("created_at", { ascending: false });

  return projects ?? [];
}
