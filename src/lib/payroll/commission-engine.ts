/**
 * Deterministic commission engine.
 * Prefers invoice payments; falls back to project value when no invoices exist.
 */

import { computeCommissionAmount, partialProjectRevenue } from "./math";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CommissionRule } from "@/types/database";

export type CommissionCalcResult = {
  employeeId: string;
  projectId: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  ruleId: string;
  revenueBasis: string;
  revenueAmount: number;
  percentage: number;
  commissionAmount: number;
  currency: string;
  notes: string;
};

function pickRule(
  rules: CommissionRule[],
  role: string,
  onDate: string
): CommissionRule | null {
  const candidates = rules.filter(
    (r) =>
      r.is_active &&
      r.role === role &&
      r.effective_from <= onDate &&
      (!r.effective_until || r.effective_until >= onDate)
  );
  return candidates.sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null;
}

function computeAmount(rule: CommissionRule, revenue: number): number {
  return computeCommissionAmount(
    revenue,
    Number(rule.commission_percentage) || 0,
    Number(rule.fixed_commission) || 0
  );
}

/**
 * Calculate commissions for payments in [startDate, endDate] plus project-value fallback.
 * Does not write to DB — caller inserts ledger rows.
 */
export async function calculateCommissionsForPeriod(params: {
  startDate: string;
  endDate: string;
}): Promise<{
  results: CommissionCalcResult[];
  warnings: { code: string; message: string; employeeId?: string; projectId?: string }[];
}> {
  const admin = createAdminClient();
  const warnings: {
    code: string;
    message: string;
    employeeId?: string;
    projectId?: string;
  }[] = [];

  const { data: rulesData } = await admin
    .from("commission_rules")
    .select("*")
    .eq("is_active", true);
  const rules = (rulesData || []) as CommissionRule[];

  if (!rules.length) {
    warnings.push({
      code: "NO_COMMISSION_RULES",
      message: "No active commission rules configured.",
    });
  }

  const { data: employeesData } = await admin.from("employees").select("id, full_name");
  const employeesList = employeesData || [];

  function findEmployeesByLabel(label?: string | null): string[] {
    if (!label || label === "—" || label === "None") return [];
    const names = label.split(/[\+&,]| and /).map(s => s.trim()).filter(Boolean);
    const ids: string[] = [];
    for (const name of names) {
      const lower = name.toLowerCase();
      const exact = employeesList.find(e => e.full_name.toLowerCase() === lower);
      if (exact) {
        ids.push(exact.id);
        continue;
      }
      const partial = employeesList.find(e => e.full_name.toLowerCase().includes(lower));
      if (partial) ids.push(partial.id);
    }
    return ids;
  }

  const results: CommissionCalcResult[] = [];

  // ── Payment-based commissions ────────────────────────────────────────────
  const { data: payments } = await admin
    .from("invoice_payments")
    .select(
      `
      id, amount, currency, paid_at, invoice_id,
      invoice:invoices(
        id, project_id, amount, currency, status, invoice_number,
        project:projects(id, name, bd_id, closing_developer_id, closer_label, assigned_resource_label, value, payment_status, currency)
      )
    `
    )
    .gte("paid_at", params.startDate)
    .lte("paid_at", params.endDate);

  for (const pay of payments || []) {
    const invoice = Array.isArray(pay.invoice) ? pay.invoice[0] : pay.invoice;
    if (!invoice) continue;
    if (invoice.status === "cancelled") continue;

    const project = Array.isArray(invoice.project)
      ? invoice.project[0]
      : invoice.project;

    const assignments: { employeeId: string; role: string }[] = [];
    if (project?.bd_id) {
      assignments.push({ employeeId: project.bd_id, role: "bd" });
    }
    if (project?.closing_developer_id) {
      assignments.push({
        employeeId: project.closing_developer_id,
        role: "closer",
      });
    }
    if (project?.closer_label) {
      const closerIds = findEmployeesByLabel(project.closer_label);
      for (const closerId of closerIds) {
        if (!assignments.some(a => a.employeeId === closerId && a.role === "closer")) {
          assignments.push({ employeeId: closerId, role: "closer" });
        }
      }
    }
    
    // Auto-extract assigned resources for developer commission
    if (project?.assigned_resource_label) {
      const resourceIds = findEmployeesByLabel(project.assigned_resource_label);
      for (const resId of resourceIds) {
        assignments.push({ employeeId: resId, role: "developer" });
      }
    }

    if (!assignments.length) {
      warnings.push({
        code: "MISSING_PROJECT_ASSIGNMENT",
        message: `Invoice ${invoice.invoice_number} has no BD/Closer assignment.`,
        projectId: invoice.project_id ?? undefined,
      });
      continue;
    }

    for (const a of assignments) {
      const rule = pickRule(rules, a.role, pay.paid_at);
      if (!rule) {
        warnings.push({
          code: "MISSING_COMMISSION_RULE",
          message: `No active commission rule for role "${a.role}".`,
          employeeId: a.employeeId,
          projectId: invoice.project_id ?? undefined,
        });
        continue;
      }

      let revenueAmount = Number(pay.amount) || 0;
      let basis = rule.commission_basis;

      if (rule.commission_basis === "INVOICED") {
        revenueAmount = Number(invoice.amount) || 0;
        basis = "INVOICED";
      } else if (rule.commission_basis === "PROJECT_VALUE") {
        revenueAmount = Number(project?.value) || 0;
        basis = "PROJECT_VALUE";
      } else {
        basis = "PAID";
      }

      if (pay.currency !== (invoice.currency || "USD")) {
        warnings.push({
          code: "CURRENCY_MISMATCH",
          message: `Payment currency ${pay.currency} differs from invoice ${invoice.currency}.`,
          employeeId: a.employeeId,
          projectId: invoice.project_id ?? undefined,
        });
      }

      const amount = computeAmount(rule, revenueAmount);
      results.push({
        employeeId: a.employeeId,
        projectId: invoice.project_id,
        invoiceId: invoice.id,
        paymentId: pay.id,
        ruleId: rule.id,
        revenueBasis: basis,
        revenueAmount,
        percentage: Number(rule.commission_percentage) || 0,
        commissionAmount: amount,
        currency: pay.currency || "USD",
        notes: `Invoice ${invoice.invoice_number} payment ${pay.paid_at}`,
      });
    }
  }

  // ── Project-value fallback for projects with no invoices ─────────────────
  const { data: projects, error: projectsError } = await admin
    .from("projects")
    .select(
      "id, name, bd_id, closing_developer_id, closer_label, assigned_resource_label, value, payment_status, currency, updated_at"
    )
    .or("closer_label.not.is.null,assigned_resource_label.not.is.null");

  if (projectsError) {
    warnings.push({
      code: "PROJECTS_QUERY_ERROR",
      message: `Failed to fetch projects: ${projectsError.message}`,
    });
  }

  const projectIdsWithInvoices = new Set(
    (payments || [])
      .map((p) => (p.invoice as { project_id?: string } | null)?.project_id)
      .filter(Boolean) as string[]
  );

  // Also load any invoices to exclude those projects from fallback
  const { data: invoicedProjects } = await admin
    .from("invoices")
    .select("project_id")
    .not("project_id", "is", null);
  for (const row of invoicedProjects || []) {
    if (row.project_id) projectIdsWithInvoices.add(row.project_id);
  }

  for (const project of projects || []) {
    if (projectIdsWithInvoices.has(project.id)) continue;
    if (!project.value || Number(project.value) <= 0) continue;

    const revenue = Number(project.value) || 0;
    if (revenue <= 0) continue;

    const assignments: { employeeId: string; role: string }[] = [];
    if (project.bd_id) assignments.push({ employeeId: project.bd_id, role: "bd" });
    if (project.closing_developer_id) {
      assignments.push({
        employeeId: project.closing_developer_id,
        role: "closer",
      });
    }
    if (project.closer_label) {
      const closerIds = findEmployeesByLabel(project.closer_label);
      for (const closerId of closerIds) {
        if (!assignments.some(a => a.employeeId === closerId && a.role === "closer")) {
          assignments.push({ employeeId: closerId, role: "closer" });
        }
      }
    }
    
    // Auto-extract assigned resources for developer commission
    if (project.assigned_resource_label) {
      const resourceIds = findEmployeesByLabel(project.assigned_resource_label);
      for (const resId of resourceIds) {
        assignments.push({ employeeId: resId, role: "developer" });
      }
    }

    for (const a of assignments) {
      const roleRule = pickRule(rules, a.role, params.endDate);
      if (!roleRule) continue;

      warnings.push({
        code: "PROJECT_VALUE_FALLBACK",
        message: `Project "${project.name}" — commission based on project value (${project.payment_status}).`,
        employeeId: a.employeeId,
        projectId: project.id,
      });

      const amount = computeAmount(roleRule, revenue);
      results.push({
        employeeId: a.employeeId,
        projectId: project.id,
        invoiceId: null,
        paymentId: null,
        ruleId: roleRule.id,
        revenueBasis: "PROJECT_VALUE",
        revenueAmount: revenue,
        percentage: Number(roleRule.commission_percentage) || 0,
        commissionAmount: amount,
        currency: project.currency || "USD",
        notes: `Project value — ${project.payment_status} status`,
      });
    }
  }

  return { results, warnings };
}

/** Persist commission results into ledger (idempotent via unique indexes). */
export async function upsertCommissionLedger(
  periodId: string,
  results: CommissionCalcResult[]
): Promise<{ inserted: number; skipped: number }> {
  const admin = createAdminClient();
  let inserted = 0;
  let skipped = 0;

  for (const r of results) {
    const row = {
      employee_id: r.employeeId,
      project_id: r.projectId,
      invoice_id: r.invoiceId,
      payment_id: r.paymentId,
      commission_rule_id: r.ruleId,
      revenue_basis: r.revenueBasis,
      revenue_amount: r.revenueAmount,
      commission_percentage: r.percentage,
      commission_amount: r.commissionAmount,
      currency: r.currency,
      payroll_period_id: periodId,
      status: "PENDING",
      notes: r.notes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("commission_ledger").insert(row);
    if (error) {
      // unique violation = already paid/pending for this payment
      if (error.code === "23505") {
        skipped += 1;
        continue;
      }
      console.error("[commission-ledger]", error.message);
      skipped += 1;
      continue;
    }
    inserted += 1;
  }

  return { inserted, skipped };
}
