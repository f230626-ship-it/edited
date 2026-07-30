import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./project-detail-client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const employee = await requireRole("admin");
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      *,
      bd:employees!bd_id(id, full_name, email),
      manager:employees!manager_id(id, full_name, email),
      closing_developer:employees!closing_developer_id(id, full_name, email),
      resources:project_resources(
        *,
        employee:employees(id, full_name, email, designation, profile_photo_url)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Drop resource rows whose employee was deleted / missing (avoids client crash)
  if (Array.isArray(project.resources)) {
    project.resources = project.resources.filter((r: { employee: unknown }) => r.employee != null);
  }

  const { data: allEmployees } = await supabase
    .from("employees")
    .select("*")
    .eq("status", "active")
    .order("full_name");

  const { data: teams } = await supabase
    .from("teams")
    .select(`
      id, name, code, color,
      members:team_members(
        employee_id,
        employee:employees(id, full_name, email, designation, status)
      )
    `)
    .eq("status", "active");

  // Filter active members
  const enrichedTeams = (teams ?? []).map((t: any) => ({
    ...t,
    members: (t.members ?? []).filter((m: any) => m.employee?.status === "active"),
  }));

  return (
    <ProjectDetailClient
      project={project as any}
      allEmployees={allEmployees ?? []}
      currentEmployee={employee}
      canEdit={true}
      canUpdateProgress={true}
      teams={enrichedTeams}
    />
  );
}
