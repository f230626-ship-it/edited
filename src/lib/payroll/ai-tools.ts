/**
 * Read-only payroll tools for the AI assistant.
 * NEVER mutate salary, commission, approvals, or emails here.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function get_payroll_summary(periodId?: string) {
  const admin = createAdminClient();
  let period;
  if (periodId) {
    const { data } = await admin.from("payroll_periods").select("*").eq("id", periodId).single();
    period = data;
  } else {
    const { data } = await admin
      .from("payroll_periods")
      .select("*")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    period = data;
  }
  if (!period) return { error: "No payroll period found" };
  return {
    id: period.id,
    label: period.label,
    status: period.status,
    total_gross: period.total_gross,
    total_commissions: period.total_commissions,
    total_deductions: period.total_deductions,
    total_net: period.total_net,
    pay_date: period.pay_date,
  };
}

export async function get_employee_payroll(employeeId: string, periodId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("payroll_records")
    .select(
      "*, employee:employees(full_name), line_items:payroll_line_items(*), period:payroll_periods(label, status, period_year, period_month)"
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "No payroll record found" };
  return data;
}

export async function get_employee_commissions(employeeId: string, periodId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("commission_ledger")
    .select("*, project:projects(name), rule:commission_rules(name, role)")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(100);
  if (error) return { error: error.message };
  return { rows: data || [] };
}

export async function get_pending_commissions() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commission_ledger")
    .select("*, employee:employees(full_name), project:projects(name)")
    .eq("status", "PENDING")
    .limit(200);
  if (error) return { error: error.message };
  const total = (data || []).reduce((s, r) => s + Number(r.commission_amount), 0);
  return { rows: data || [], total };
}

export async function get_payroll_anomalies(periodId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("payroll_anomalies")
    .select("*, employee:employees(full_name)")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(100);
  if (error) return { error: error.message };
  return { rows: data || [] };
}

export async function get_invoice_commissions(invoiceId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commission_ledger")
    .select("*, employee:employees(full_name)")
    .eq("invoice_id", invoiceId);
  if (error) return { error: error.message };
  return { rows: data || [] };
}

export async function get_payroll_history(limit = 12) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payroll_periods")
    .select("id, label, status, total_net, total_commissions, period_year, period_month")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };
  return { rows: data || [] };
}

export async function get_compensation_history(employeeId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("employee_compensation")
    .select("*")
    .eq("employee_id", employeeId)
    .order("effective_from", { ascending: false });
  if (error) return { error: error.message };
  return { rows: data || [] };
}

export type PayrollToolName =
  | "get_payroll_summary"
  | "get_employee_payroll"
  | "get_employee_commissions"
  | "get_pending_commissions"
  | "get_payroll_anomalies"
  | "get_invoice_commissions"
  | "get_payroll_history"
  | "get_compensation_history";

export async function runPayrollTool(
  name: PayrollToolName,
  args: Record<string, string>
): Promise<unknown> {
  switch (name) {
    case "get_payroll_summary":
      return get_payroll_summary(args.periodId);
    case "get_employee_payroll":
      return get_employee_payroll(args.employeeId, args.periodId);
    case "get_employee_commissions":
      return get_employee_commissions(args.employeeId, args.periodId);
    case "get_pending_commissions":
      return get_pending_commissions();
    case "get_payroll_anomalies":
      return get_payroll_anomalies(args.periodId);
    case "get_invoice_commissions":
      return get_invoice_commissions(args.invoiceId);
    case "get_payroll_history":
      return get_payroll_history();
    case "get_compensation_history":
      return get_compensation_history(args.employeeId);
    default:
      return { error: "Unknown tool" };
  }
}

/**
 * Deterministic NL answers without LLM (works offline).
 * When OPENAI_API_KEY is set, the action layer may enrich later.
 */
export async function answerPayrollQuestion(question: string): Promise<string> {
  const q = question.toLowerCase();

  if (q.includes("anomal") || q.includes("warning") || q.includes("critical")) {
    const data = await get_payroll_anomalies();
    if ("error" in data && data.error) return `Error: ${data.error}`;
    const rows = (data as { rows: Array<{ severity: string; message: string }> }).rows;
    if (!rows.length) return "There are no unresolved payroll anomalies.";
    return [
      `${rows.length} unresolved anomalies:`,
      ...rows.slice(0, 10).map((r) => `• [${r.severity}] ${r.message}`),
    ].join("\n");
  }

  if (q.includes("pending commission") || q.includes("unpaid commission")) {
    const data = await get_pending_commissions();
    if ("error" in data && data.error) return `Error: ${data.error}`;
    const d = data as { total: number; rows: unknown[] };
    return `Pending commissions: ${d.rows.length} entries totaling ${d.total.toLocaleString()}.`;
  }

  if (q.includes("highest commission") || q.includes("who received")) {
    const summary = await get_payroll_summary();
    if ("error" in summary) return String(summary.error);
    const admin = createAdminClient();
    const { data } = await admin
      .from("payroll_records")
      .select("commission_total, employee:employees(full_name)")
      .eq("payroll_period_id", (summary as { id: string }).id)
      .order("commission_total", { ascending: false })
      .limit(5);
    if (!data?.length) return "No commission records for the latest payroll.";
    return [
      `Top commissions in ${(summary as { label: string }).label}:`,
      ...data.map((r, i) => {
        const emp = r.employee as unknown as { full_name: string } | null;
        return `${i + 1}. ${emp?.full_name || "—"}: ${Number(r.commission_total).toLocaleString()}`;
      }),
    ].join("\n");
  }

  if (q.includes("summary") || q.includes("prepare") || q.includes("august") || q.includes("payroll")) {
    const summary = await get_payroll_summary();
    if ("error" in summary) return String(summary.error);
    const s = summary as {
      label: string;
      status: string;
      total_gross: number;
      total_commissions: number;
      total_net: number;
    };
    return [
      `${s.label} (${s.status})`,
      `Base/gross components: ${Number(s.total_gross).toLocaleString()}`,
      `Commissions: ${Number(s.total_commissions).toLocaleString()}`,
      `Net payroll: ${Number(s.total_net).toLocaleString()}`,
      ``,
      `I can only explain data from stored records. I cannot approve payroll or send emails — use the admin workflow for that.`,
    ].join("\n");
  }

  const history = await get_payroll_history(6);
  if ("error" in history) return String(history.error);
  const rows = (history as { rows: Array<{ label: string; status: string; total_net: number }> }).rows;
  return [
    "Ask about: payroll summary, anomalies, pending commissions, or highest commission.",
    "Recent periods:",
    ...rows.map((r) => `• ${r.label}: ${r.status} · net ${Number(r.total_net).toLocaleString()}`),
    "",
    "Safety: I never modify salaries, commissions, approvals, or emails.",
  ].join("\n");
}
