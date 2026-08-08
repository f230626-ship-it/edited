import { getPayrollPeriodDetail } from "@/actions/payroll";
import { canApprovePayroll, requirePayrollAccess } from "@/lib/payroll/auth";
import { PayrollPeriodClient } from "@/components/payroll/payroll-period-client";
import { notFound } from "next/navigation";
import type { PayrollAnomaly, PayrollPeriod, PayrollRecord } from "@/types/database";

export default async function PayrollPeriodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const employee = await requirePayrollAccess();
  const { id } = await params;
  const detail = await getPayrollPeriodDetail(id);
  if (detail.error || !detail.period) notFound();

  return (
    <PayrollPeriodClient
      period={detail.period as PayrollPeriod}
      records={(detail.records || []) as PayrollRecord[]}
      anomalies={(detail.anomalies || []) as PayrollAnomaly[]}
      isApprover={canApprovePayroll(employee)}
    />
  );
}
