import { getPayrollSettings } from "@/actions/payroll";
import { canApprovePayroll, requirePayrollAccess } from "@/lib/payroll/auth";
import { PayrollSettingsClient } from "@/components/payroll/payroll-settings-client";
import type { PayrollSettings } from "@/types/database";

export default async function PayrollSettingsPage() {
  const employee = await requirePayrollAccess();
  const { settings } = await getPayrollSettings();
  return (
    <PayrollSettingsClient
      settings={(settings || null) as PayrollSettings | null}
      canEdit={canApprovePayroll(employee)}
    />
  );
}
