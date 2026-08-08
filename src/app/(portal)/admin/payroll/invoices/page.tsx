import { listInvoices } from "@/actions/payroll";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicesClient } from "@/components/payroll/invoices-client";

export default async function PayrollInvoicesPage() {
  const [{ rows }, admin] = await Promise.all([
    listInvoices(),
    Promise.resolve(createAdminClient()),
  ]);
  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .order("name")
    .limit(500);

  return (
    <InvoicesClient
      invoices={(rows || []) as Parameters<typeof InvoicesClient>[0]["invoices"]}
      projects={projects || []}
    />
  );
}
