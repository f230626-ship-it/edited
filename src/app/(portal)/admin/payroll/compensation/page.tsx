import { createAdminClient } from "@/lib/supabase/admin";
import { requirePayrollAccess } from "@/lib/payroll/auth";
import { CompensationClient } from "@/components/payroll/compensation-client";
import type { EmployeeCompensation } from "@/types/database";

export default async function PayrollCompensationPage() {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data: employees } = await admin
    .from("employees")
    .select("id, full_name, basic_salary")
    .eq("status", "active")
    .order("full_name");

  const { data: comps } = await admin
    .from("employee_compensation")
    .select("*")
    .order("effective_from", { ascending: false });

  const historyByEmployee: Record<string, EmployeeCompensation[]> = {};
  for (const c of (comps || []) as EmployeeCompensation[]) {
    if (!historyByEmployee[c.employee_id]) historyByEmployee[c.employee_id] = [];
    historyByEmployee[c.employee_id].push(c);
  }

  return (
    <CompensationClient
      employees={employees || []}
      historyByEmployee={historyByEmployee}
    />
  );
}
