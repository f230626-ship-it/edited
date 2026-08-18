/**
 * Deterministic payroll calculation engine.
 * AI must never call this for arithmetic authority — only this code writes amounts.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getCompensationForDate } from "./compensation";
import {
  calculateCommissionsForPeriod,
  upsertCommissionLedger,
} from "./commission-engine";
import { detectPayrollAnomalies } from "./anomalies";

export type PayrollCalculateResult = {
  ok: boolean;
  error?: string;
  employeesProcessed: number;
  totalBase: number;
  totalCommissions: number;
  totalDeductions: number;
  totalNet: number;
  anomalyCount: number;
};

export async function calculatePayrollPeriod(
  periodId: string
): Promise<PayrollCalculateResult> {
  const admin = createAdminClient();

  const { data: period, error: periodError } = await admin
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();

  if (periodError || !period) {
    return { ok: false, error: "Payroll period not found", employeesProcessed: 0, totalBase: 0, totalCommissions: 0, totalDeductions: 0, totalNet: 0, anomalyCount: 0 };
  }

  if (["APPROVED", "PROCESSING", "COMPLETED"].includes(period.status)) {
    return {
      ok: false,
      error: "Cannot recalculate an approved/completed payroll",
      employeesProcessed: 0,
      totalBase: 0,
      totalCommissions: 0,
      totalDeductions: 0,
      totalNet: 0,
      anomalyCount: 0,
    };
  }

  await admin
    .from("payroll_periods")
    .update({ status: "CALCULATING", updated_at: new Date().toISOString() })
    .eq("id", periodId);

  try {
    // Clear prior draft calculation for this period
    await admin.from("payroll_anomalies").delete().eq("payroll_period_id", periodId);
    const { data: existingRecords } = await admin
      .from("payroll_records")
      .select("id")
      .eq("payroll_period_id", periodId);
    const recordIds = (existingRecords || []).map((r) => r.id);
    if (recordIds.length) {
      await admin.from("payroll_line_items").delete().in("payroll_record_id", recordIds);
    }
    await admin.from("payroll_records").delete().eq("payroll_period_id", periodId);

    // Reset PENDING ledger rows for this period (keep PAID/APPROVED from older runs)
    await admin
      .from("commission_ledger")
      .delete()
      .eq("payroll_period_id", periodId)
      .eq("status", "PENDING");

    const { results: commissionResults, warnings } =
      await calculateCommissionsForPeriod({
        startDate: period.start_date,
        endDate: period.end_date,
      });

    await upsertCommissionLedger(periodId, commissionResults);

    const commissionByEmployee = new Map<
      string,
      { total: number; lines: typeof commissionResults }
    >();
    for (const c of commissionResults) {
      const cur = commissionByEmployee.get(c.employeeId) || {
        total: 0,
        lines: [],
      };
      cur.total = parseFloat((cur.total + c.commissionAmount).toFixed(2));
      cur.lines.push(c);
      commissionByEmployee.set(c.employeeId, cur);
    }

    const { data: employees } = await admin
      .from("employees")
      .select("id, full_name, email, status, employee_code, designation")
      .eq("status", "active");

    let totalBase = 0;
    let totalCommissions = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let processed = 0;

    for (const emp of employees || []) {
      const comp = await getCompensationForDate(emp.id, period.end_date);
      const base = comp ? Number(comp.basic_salary) || 0 : 0;
      const allowances = comp ? Number(comp.allowances) || 0 : 0;
      const commissions = commissionByEmployee.get(emp.id)?.total ?? 0;
      const bonus = 0;
      const deductions = 0;
      const gross = parseFloat((base + allowances + commissions + bonus).toFixed(2));
      const net = parseFloat((gross - deductions).toFixed(2));

      const { data: record, error: recErr } = await admin
        .from("payroll_records")
        .insert({
          payroll_period_id: periodId,
          employee_id: emp.id,
          base_salary: base,
          allowances,
          commission_total: commissions,
          bonus,
          deductions,
          gross_pay: gross,
          net_pay: net,
          currency: comp?.currency || period.currency || "USD",
          compensation_id: comp?.id ?? null,
          status: "calculated",
        })
        .select("id")
        .single();

      if (recErr || !record) {
        console.error("[payroll] record insert", recErr?.message);
        continue;
      }

      const lineItems: {
        payroll_record_id: string;
        line_type: string;
        description: string;
        amount: number;
        currency: string;
        meta: Record<string, unknown>;
        sort_order: number;
      }[] = [
        {
          payroll_record_id: record.id,
          line_type: "base_salary",
          description: "Base salary",
          amount: base,
          currency: comp?.currency || "USD",
          meta: { compensation_id: comp?.id ?? null },
          sort_order: 1,
        },
      ];

      if (allowances > 0) {
        lineItems.push({
          payroll_record_id: record.id,
          line_type: "allowance",
          description: "Allowances",
          amount: allowances,
          currency: comp?.currency || "USD",
          meta: {},
          sort_order: 2,
        });
      }

      const empCommissions = commissionByEmployee.get(emp.id)?.lines || [];
      empCommissions.forEach((c, idx) => {
        lineItems.push({
          payroll_record_id: record.id,
          line_type: "commission",
          description: c.notes || `Commission (${c.percentage}%)`,
          amount: c.commissionAmount,
          currency: c.currency,
          meta: {
            project_id: c.projectId,
            invoice_id: c.invoiceId,
            payment_id: c.paymentId,
            rule_id: c.ruleId,
            revenue_basis: c.revenueBasis,
            revenue_amount: c.revenueAmount,
            percentage: c.percentage,
          },
          sort_order: 10 + idx,
        });
      });

      if (deductions > 0) {
        lineItems.push({
          payroll_record_id: record.id,
          line_type: "deduction",
          description: "Deductions",
          amount: deductions,
          currency: comp?.currency || "USD",
          meta: {},
          sort_order: 100,
        });
      }

      await admin.from("payroll_line_items").insert(lineItems);

      totalBase += base + allowances;
      totalCommissions += commissions;
      totalDeductions += deductions;
      totalNet += net;
      processed += 1;
    }

    // Persist commission-engine warnings as anomalies
    if (warnings.length) {
      await admin.from("payroll_anomalies").insert(
        warnings.map((w) => ({
          payroll_period_id: periodId,
          employee_id: w.employeeId ?? null,
          severity: "WARNING",
          code: w.code,
          message: w.message,
          entity_type: w.projectId ? "project" : null,
          entity_id: w.projectId ?? null,
        }))
      );
    }

    const anomalyCount = await detectPayrollAnomalies(periodId);

    const hasCritical = await admin
      .from("payroll_anomalies")
      .select("id", { count: "exact", head: true })
      .eq("payroll_period_id", periodId)
      .eq("severity", "CRITICAL")
      .is("resolved_at", null);

    const nextStatus =
      (hasCritical.count ?? 0) > 0 ? "REVIEW_REQUIRED" : "READY_FOR_APPROVAL";

    await admin
      .from("payroll_periods")
      .update({
        status: nextStatus,
        total_gross: parseFloat(totalBase.toFixed(2)),
        total_commissions: parseFloat(totalCommissions.toFixed(2)),
        total_deductions: parseFloat(totalDeductions.toFixed(2)),
        total_net: parseFloat(totalNet.toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", periodId);

    return {
      ok: true,
      employeesProcessed: processed,
      totalBase: parseFloat(totalBase.toFixed(2)),
      totalCommissions: parseFloat(totalCommissions.toFixed(2)),
      totalDeductions: parseFloat(totalDeductions.toFixed(2)),
      totalNet: parseFloat(totalNet.toFixed(2)),
      anomalyCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("payroll_periods")
      .update({ status: "DRAFT", updated_at: new Date().toISOString() })
      .eq("id", periodId);
    return {
      ok: false,
      error: msg,
      employeesProcessed: 0,
      totalBase: 0,
      totalCommissions: 0,
      totalDeductions: 0,
      totalNet: 0,
      anomalyCount: 0,
    };
  }
}
