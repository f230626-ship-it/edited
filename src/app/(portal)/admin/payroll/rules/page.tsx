import { listCommissionRules } from "@/actions/payroll";
import { CommissionRulesClient } from "@/components/payroll/commission-rules-client";
import type { CommissionRule } from "@/types/database";

export default async function PayrollRulesPage() {
  const { rows } = await listCommissionRules();
  return <CommissionRulesClient rules={(rows || []) as CommissionRule[]} />;
}
