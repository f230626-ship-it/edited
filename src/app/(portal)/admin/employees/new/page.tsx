import { requireAdminAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/page-header";
import { NewEmployeeForm } from "@/components/admin/new-employee-form";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";

export default async function NewEmployeePage() {
  await requireAdminAccess();
  const supabase = createAdminClient();

  const [{ data: departments }, { data: managers }] = await Promise.all([
    supabase.from("departments").select("*").neq("name", "Operations").order("name"),
    supabase
      .from("employees")
      .select("id, full_name, employee_code")
      .order("full_name"),
  ]);

  return (
    <div>
      <PageBreadcrumb
        segments={[{ label: "Employees", href: "/admin/employees" }]}
        current="Add New"
      />
      <PageHeader
        title="Add New Employee"
        description="Create a new employee account"
      />

      <NewEmployeeForm
        departments={departments ?? []}
        managers={managers ?? []}
      />
    </div>
  );
}