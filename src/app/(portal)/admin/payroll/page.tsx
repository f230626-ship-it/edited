import { listPayrollPeriods } from "@/actions/payroll";
import { PayrollOverviewClient } from "@/components/payroll/payroll-overview-client";
import type { PayrollPeriod } from "@/types/database";

export default async function PayrollOverviewPage() {
  const { periods } = await listPayrollPeriods();
  return <PayrollOverviewClient periods={(periods || []) as PayrollPeriod[]} />;
}
