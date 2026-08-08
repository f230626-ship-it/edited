/**
 * Rule-based payroll anomaly detection (deterministic).
 * LLM may later enrich messages but must not invent amounts.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function detectPayrollAnomalies(periodId: string): Promise<number> {
  const admin = createAdminClient();
  let created = 0;

  const { data: period } = await admin
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();
  if (!period) return 0;

  const { data: records } = await admin
    .from("payroll_records")
    .select(
      "*, employee:employees(id, full_name, email), compensation_id"
    )
    .eq("payroll_period_id", periodId);

  const anomalies: {
    payroll_period_id: string;
    employee_id: string | null;
    severity: "INFO" | "WARNING" | "CRITICAL";
    code: string;
    message: string;
    entity_type?: string;
    entity_id?: string;
  }[] = [];

  for (const r of records || []) {
    const name = (r.employee as { full_name?: string } | null)?.full_name || "Employee";
    const email = (r.employee as { email?: string } | null)?.email;

    if (!r.compensation_id || Number(r.base_salary) <= 0) {
      anomalies.push({
        payroll_period_id: periodId,
        employee_id: r.employee_id,
        severity: "CRITICAL",
        code: "MISSING_COMPENSATION",
        message: `${name} has no effective salary record for this period.`,
        entity_type: "payroll_record",
        entity_id: r.id,
      });
    }

    if (Number(r.net_pay) < 0) {
      anomalies.push({
        payroll_period_id: periodId,
        employee_id: r.employee_id,
        severity: "CRITICAL",
        code: "NEGATIVE_NET",
        message: `${name} has a negative net salary (${r.net_pay}).`,
        entity_type: "payroll_record",
        entity_id: r.id,
      });
    }

    if (!email) {
      anomalies.push({
        payroll_period_id: periodId,
        employee_id: r.employee_id,
        severity: "CRITICAL",
        code: "MISSING_EMAIL",
        message: `${name} has no email address for salary slip delivery.`,
        entity_type: "employee",
        entity_id: r.employee_id,
      });
    }

    // MoM commission change
    const prevMonth = period.period_month === 1 ? 12 : period.period_month - 1;
    const prevYear =
      period.period_month === 1 ? period.period_year - 1 : period.period_year;
    const { data: prevPeriod } = await admin
      .from("payroll_periods")
      .select("id")
      .eq("period_year", prevYear)
      .eq("period_month", prevMonth)
      .maybeSingle();

    if (prevPeriod) {
      const { data: prevRec } = await admin
        .from("payroll_records")
        .select("commission_total, net_pay, base_salary")
        .eq("payroll_period_id", prevPeriod.id)
        .eq("employee_id", r.employee_id)
        .maybeSingle();

      if (prevRec) {
        const prevC = Number(prevRec.commission_total) || 0;
        const curC = Number(r.commission_total) || 0;
        if (prevC > 0) {
          const pct = ((curC - prevC) / prevC) * 100;
          if (pct >= 180) {
            anomalies.push({
              payroll_period_id: periodId,
              employee_id: r.employee_id,
              severity: "WARNING",
              code: "COMMISSION_SPIKE",
              message: `${name}'s commission increased from ${prevC} to ${curC} (${pct.toFixed(0)}% increase).`,
              entity_type: "payroll_record",
              entity_id: r.id,
            });
          } else if (pct >= 20) {
            anomalies.push({
              payroll_period_id: periodId,
              employee_id: r.employee_id,
              severity: "INFO",
              code: "COMMISSION_UP",
              message: `${name}'s commission increased from ${prevC} to ${curC} (${pct.toFixed(0)}%).`,
              entity_type: "payroll_record",
              entity_id: r.id,
            });
          }
        }

        const prevBase = Number(prevRec.base_salary) || 0;
        const curBase = Number(r.base_salary) || 0;
        if (prevBase > 0 && curBase !== prevBase) {
          anomalies.push({
            payroll_period_id: periodId,
            employee_id: r.employee_id,
            severity: "WARNING",
            code: "SALARY_CHANGED",
            message: `${name}'s base salary changed from ${prevBase} to ${curBase}.`,
            entity_type: "payroll_record",
            entity_id: r.id,
          });
        }
      }
    }
  }

  // Employees unexpectedly absent — already all active included; flag zero-pay with commission eligibility
  const { data: eligible } = await admin
    .from("employee_compensation")
    .select("employee_id")
    .eq("commission_eligible", true)
    .is("effective_until", null);

  const recordEmpIds = new Set((records || []).map((r) => r.employee_id));
  for (const e of eligible || []) {
    if (!recordEmpIds.has(e.employee_id)) {
      anomalies.push({
        payroll_period_id: periodId,
        employee_id: e.employee_id,
        severity: "WARNING",
        code: "ABSENT_FROM_PAYROLL",
        message: `Commission-eligible employee missing from payroll run.`,
        entity_type: "employee",
        entity_id: e.employee_id,
      });
    }
  }

  if (anomalies.length) {
    const { error } = await admin.from("payroll_anomalies").insert(anomalies);
    if (error) console.error("[anomalies]", error.message);
    else created = anomalies.length;
  }

  return created;
}
