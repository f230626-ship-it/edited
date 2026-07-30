import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import ProjectsClient from "./projects-client";
import { checkApproachingDeliveries } from "@/actions/projects";
import { getProjectSyncMeta } from "@/actions/project-sync";
import type { ProjectSyncMeta } from "@/types/database";

export default async function ProjectsPage() {
  const employee = await requireRole("admin");
  const supabase = createAdminClient();

  // Run the approaching delivery date check in the background
  checkApproachingDeliveries().catch((err) => {
    console.error("Failed to run approaching delivery check:", err);
  });

  // Query projects with relations, using RLS to filter automatically based on roles
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(`
      *,
      bd:employees!bd_id(id, full_name, email),
      closing_developer:employees!closing_developer_id(id, full_name, email),
      manager:employees!manager_id(id, full_name, email),
      resources:project_resources(
        *,
        employee:employees(id, full_name, email)
      )
    `)
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Failed to query projects:", projectsError.message);
  }

  // Query all employees (for filters and resource assignments)
  const { data: allEmployees, error: employeesError } = await supabase
    .from("employees")
    .select("*")
    .order("full_name");

  if (employeesError) {
    console.error("Failed to query employees:", employeesError.message);
  }

  let syncMeta: ProjectSyncMeta | null = null;
  try {
    syncMeta = await getProjectSyncMeta();
  } catch (err) {
    console.error("Failed to load project sync meta:", err);
  }

  return (
    <ProjectsClient
      initialProjects={(projects as unknown as Parameters<typeof ProjectsClient>[0]["initialProjects"]) ?? []}
      allEmployees={allEmployees ?? []}
      currentEmployee={employee}
      syncMeta={syncMeta}
    />
  );
}
