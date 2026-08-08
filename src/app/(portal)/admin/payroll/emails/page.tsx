import { listPayrollEmailQueue } from "@/actions/payroll";
import { canApprovePayroll, requirePayrollAccess } from "@/lib/payroll/auth";
import { PayrollEmailsClient } from "@/components/payroll/payroll-emails-client";
import type { PayrollEmailQueueItem } from "@/types/database";

export default async function PayrollEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const employee = await requirePayrollAccess();
  const { period } = await searchParams;
  const { rows } = await listPayrollEmailQueue(period || undefined);
  return (
    <PayrollEmailsClient
      rows={(rows || []) as PayrollEmailQueueItem[]}
      periodId={period || (rows?.[0] as { payroll_period_id?: string } | undefined)?.payroll_period_id || null}
      isApprover={canApprovePayroll(employee)}
    />
  );
}
