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
    period_year: period.period_year,
    period_month: period.period_month,
  };
}

export async function get_employee_payroll(employeeId: string, periodId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("payroll_records")
    .select(
      "*, employee:employees(full_name, designation, employee_code), line_items:payroll_line_items(*), period:payroll_periods(label, status, period_year, period_month)"
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
    .select("id, label, status, total_net, total_commissions, total_gross, period_year, period_month")
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

export async function get_all_employees_payroll(periodId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("payroll_records")
    .select("employee_id, base_salary, allowances, commission_total, bonus, deductions, gross_pay, net_pay, employee:employees(full_name, designation)")
    .order("commission_total", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(50);
  if (error) return { error: error.message };
  const totalCommission = (data || []).reduce((s, r) => s + Number(r.commission_total), 0);
  const totalNet = (data || []).reduce((s, r) => s + Number(r.net_pay), 0);
  return { rows: data || [], totalCommission, totalNet, count: (data || []).length };
}

export async function get_project_commissions(periodId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("commission_ledger")
    .select("project_id, payroll_period_id, project:projects(name), commission_amount, revenue_amount, commission_percentage, revenue_basis, employee:employees(full_name)")
    .order("commission_amount", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(200);
  if (error) return { error: error.message };
  if (!data?.length) {
    if (!periodId) return { error: "No commission ledger entries found in any period. Run Calculate Payroll first." };
    return { error: `No commission ledger entries found for period ${periodId}. Run Calculate Payroll first.` };
  }
  const byProject = new Map<string, { name: string; total: number; entries: typeof data }>();
  for (const row of data || []) {
    const pid = row.project_id || "unknown";
    const proj = Array.isArray(row.project) ? row.project[0] : row.project;
    if (!byProject.has(pid)) {
      byProject.set(pid, { name: proj?.name || "Unknown", total: 0, entries: [] });
    }
    const g = byProject.get(pid)!;
    g.total += Number(row.commission_amount);
    g.entries.push(row);
  }
  return { byProject: Array.from(byProject.values()).sort((a, b) => b.total - a.total) };
}

export type PayrollToolName =
  | "get_payroll_summary"
  | "get_employee_payroll"
  | "get_employee_commissions"
  | "get_pending_commissions"
  | "get_payroll_anomalies"
  | "get_invoice_commissions"
  | "get_payroll_history"
  | "get_compensation_history"
  | "get_all_employees_payroll"
  | "get_project_commissions";

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
    case "get_all_employees_payroll":
      return get_all_employees_payroll(args.periodId);
    case "get_project_commissions":
      return get_project_commissions(args.periodId);
    default:
      return { error: "Unknown tool" };
  }
}

/**
 * Deterministic NL answers — grounded in real DB data.
 * The AI layer rephrases this into natural language.
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

  if (q.includes("highest commission") || q.includes("who received") || q.includes("top commission") || q.includes("top earner")) {
    const summary = await get_payroll_summary();
    if ("error" in summary) return String(summary.error);
    const admin = createAdminClient();
    const { data } = await admin
      .from("payroll_records")
      .select("commission_total, base_salary, net_pay, employee:employees(full_name, designation)")
      .eq("payroll_period_id", (summary as { id: string }).id)
      .order("commission_total", { ascending: false })
      .limit(10);
    if (!data?.length) return "No commission records for the latest payroll.";
    return [
      `Top commission earners in ${(summary as { label: string }).label}:`,
      ...data.map((r, i) => {
        const emp = r.employee as unknown as { full_name: string; designation: string } | null;
        return `${i + 1}. ${emp?.full_name || "—"} (${emp?.designation || "—"}): commission ${Number(r.commission_total).toLocaleString()}, net ${Number(r.net_pay).toLocaleString()}`;
      }),
    ].join("\n");
  }

  if (q.includes("employee") && (q.includes("pay") || q.includes("salary") || q.includes("record"))) {
    const summary = await get_payroll_summary();
    if ("error" in summary) return String(summary.error);
    const all = await get_all_employees_payroll((summary as { id: string }).id);
    if ("error" in all && all.error) return `Error: ${all.error}`;
    const rows = (all as { rows: Array<{ base_salary: number; commission_total: number; net_pay: number; employee: { full_name: string; designation: string } }> }).rows;
    return [
      `All employees in ${(summary as { label: string }).label} (${rows.length} employees):`,
      ...rows.map((r) => `• ${r.employee?.full_name || "—"} (${r.employee?.designation || "—"}): base ${Number(r.base_salary).toLocaleString()}, commission ${Number(r.commission_total).toLocaleString()}, net ${Number(r.net_pay).toLocaleString()}`),
    ].join("\n");
  }

  if (q.includes("project") && q.includes("commission")) {
    const data = await get_project_commissions();
    if (data.error) return String(data.error);
    if (!data.byProject.length) return "No project commissions found. Run Calculate Payroll first.";
    const summary = await get_payroll_summary();
    const periodLabel = "label" in summary ? summary.label : "all periods";
    return [
      `Project commissions (${periodLabel}):`,
      ...data.byProject.map((p) => `• ${p.name}: ${Number(p.total).toLocaleString()} (${p.entries.length} entries)`),
    ].join("\n");
  }

  if (q.includes("compare") || q.includes("comparison") || q.includes("vs") || q.includes("versus")) {
    const history = await get_payroll_history(6);
    if ("error" in history) return String(history.error);
    const rows = (history as { rows: Array<{ label: string; status: string; total_net: number; total_commissions: number; total_gross: number }> }).rows;
    if (rows.length < 2) return "Need at least 2 periods for comparison.";
    return [
      "Period comparison (most recent first):",
      ...rows.map((r) => `• ${r.label} (${r.status}): gross ${Number(r.total_gross).toLocaleString()}, commission ${Number(r.total_commissions).toLocaleString()}, net ${Number(r.total_net).toLocaleString()}`),
    ].join("\n");
  }

  if (q.includes("summary") || q.includes("prepare") || q.includes("payroll") || q.includes("overview")) {
    const summary = await get_payroll_summary();
    if ("error" in summary) return String(summary.error);
    const s = summary as {
      label: string;
      status: string;
      total_gross: number;
      total_commissions: number;
      total_deductions: number;
      total_net: number;
    };
    const all = await get_all_employees_payroll(s.id);
    return [
      `${s.label} (${s.status})`,
      `Employees: ${all.count}`,
      `Base/gross: ${Number(s.total_gross).toLocaleString()}`,
      `Commissions: ${Number(s.total_commissions).toLocaleString()}`,
      `Deductions: ${Number(s.total_deductions).toLocaleString()}`,
      `Net payroll: ${Number(s.total_net).toLocaleString()}`,
    ].join("\n");
  }

  if (q.includes("history") || q.includes("past period") || q.includes("previous")) {
    const history = await get_payroll_history(6);
    if ("error" in history) return String(history.error);
    const rows = (history as { rows: Array<{ label: string; status: string; total_net: number; total_commissions: number }> }).rows;
    return [
      "Recent payroll periods:",
      ...rows.map((r) => `• ${r.label}: ${r.status} · commission ${Number(r.total_commissions).toLocaleString()} · net ${Number(r.total_net).toLocaleString()}`),
    ].join("\n");
  }

  if (q.includes("deduction")) {
    const summary = await get_payroll_summary();
    if ("error" in summary) return String(summary.error);
    const all = await get_all_employees_payroll((summary as { id: string }).id);
    const rows = (all as { rows: Array<{ deductions: number; employee: { full_name: string } }> }).rows;
    const withDeductions = rows.filter((r) => Number(r.deductions) > 0);
    if (!withDeductions.length) return "No deductions found in the latest period.";
    return [
      `Employees with deductions in ${(summary as { label: string }).label}:`,
      ...withDeductions.map((r) => `• ${r.employee?.full_name || "—"}: ${Number(r.deductions).toLocaleString()}`),
    ].join("\n");
  }

  const history = await get_payroll_history(6);
  if ("error" in history) return String(history.error);
  const rows = (history as { rows: Array<{ label: string; status: string; total_net: number }> }).rows;
  return [
    "I can help with payroll questions. Try asking about:",
    "• Payroll summary or overview",
    "• Employee salaries and commissions",
    "• Project commissions",
    "• Anomalies or warnings",
    "• Pending/unpaid commissions",
    "• Top commission earners",
    "• Period comparisons",
    "• Payroll history",
    "",
    "Recent periods:",
    ...rows.map((r) => `• ${r.label}: ${r.status} · net ${Number(r.total_net).toLocaleString()}`),
  ].join("\n");
}
