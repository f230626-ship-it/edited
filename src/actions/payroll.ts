"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canApprovePayroll,
  requirePayrollAccess,
  requirePayrollApprover,
} from "@/lib/payroll/auth";
import { writePayrollAudit } from "@/lib/payroll/audit";
import { monthBounds } from "@/lib/payroll/compensation";
import { calculatePayrollPeriod } from "@/lib/payroll/payroll-engine";
import { renderSalarySlipPdf } from "@/lib/payroll/salary-slip";
import { sendEmail } from "@/lib/email";

function revalidatePayroll(periodId?: string) {
  revalidatePath("/admin/payroll");
  if (periodId) revalidatePath(`/admin/payroll/${periodId}`);
}

// ─── Compensation ────────────────────────────────────────────────────────────

export async function listCompensationHistory(employeeId: string) {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("employee_compensation")
    .select("*")
    .eq("employee_id", employeeId)
    .order("effective_from", { ascending: false });
  if (error) return { error: error.message, rows: [] as unknown[] };
  return { rows: data || [] };
}

export async function createCompensationVersion(input: {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  currency: string;
  salaryFrequency: string;
  commissionEligible: boolean;
  commissionRole: string | null;
  effectiveFrom: string;
  notes?: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
}) {
  const actor = await requirePayrollAccess();
  const admin = createAdminClient();

  // Close previous open-ended version the day before
  const dayBefore = new Date(input.effectiveFrom + "T00:00:00Z");
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const until = dayBefore.toISOString().slice(0, 10);

  const { data: current } = await admin
    .from("employee_compensation")
    .select("id")
    .eq("employee_id", input.employeeId)
    .is("effective_until", null)
    .maybeSingle();

  if (current) {
    await admin
      .from("employee_compensation")
      .update({ effective_until: until, updated_at: new Date().toISOString() })
      .eq("id", current.id);
  }

  const { data, error } = await admin
    .from("employee_compensation")
    .insert({
      employee_id: input.employeeId,
      basic_salary: input.basicSalary,
      allowances: input.allowances,
      currency: input.currency,
      salary_frequency: input.salaryFrequency,
      commission_eligible: input.commissionEligible,
      commission_role: input.commissionRole,
      bank_name: input.bankName ?? null,
      bank_account_number: input.bankAccountNumber ?? null,
      effective_from: input.effectiveFrom,
      effective_until: null,
      notes: input.notes ?? null,
      created_by: actor.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Keep legacy employee columns in sync with current version
  await admin
    .from("employees")
    .update({
      basic_salary: input.basicSalary,
      allowances: input.allowances,
      currency: input.currency,
      payment_cycle: input.salaryFrequency,
      bank_name: input.bankName ?? null,
      bank_account_number: input.bankAccountNumber ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.employeeId);

  await writePayrollAudit({
    actorId: actor.id,
    action: "compensation.create",
    entityType: "employee_compensation",
    entityId: data.id,
    newValue: data as unknown as Record<string, unknown>,
  });

  revalidatePath(`/admin/employees/${input.employeeId}`);
  revalidatePath("/admin/payroll/compensation");
  return { row: data };
}

// ─── Commission rules ────────────────────────────────────────────────────────

export async function listCommissionRules() {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commission_rules")
    .select("*")
    .order("role")
    .order("effective_from", { ascending: false });
  if (error) return { error: error.message, rows: [] as unknown[] };
  return { rows: data || [] };
}

export async function upsertCommissionRule(formData: FormData) {
  const actor = await requirePayrollAccess();
  const admin = createAdminClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    name: String(formData.get("name") || ""),
    role: String(formData.get("role") || ""),
    commission_percentage: Number(formData.get("commission_percentage") || 0),
    fixed_commission: Number(formData.get("fixed_commission") || 0),
    commission_basis: String(formData.get("commission_basis") || "PAID"),
    effective_from: String(formData.get("effective_from") || new Date().toISOString().slice(0, 10)),
    effective_until: (formData.get("effective_until") as string) || null,
    is_active: formData.get("is_active") === "true" || formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
    created_by: actor.id,
  };
  if (!payload.name || !payload.role) return { error: "Name and role are required" };

  if (id) {
    const { error } = await admin.from("commission_rules").update(payload).eq("id", id);
    if (error) return { error: error.message };
    await writePayrollAudit({
      actorId: actor.id,
      action: "commission_rule.update",
      entityType: "commission_rules",
      entityId: id,
      newValue: payload,
    });
  } else {
    const { data, error } = await admin.from("commission_rules").insert(payload).select("id").single();
    if (error) return { error: error.message };
    await writePayrollAudit({
      actorId: actor.id,
      action: "commission_rule.create",
      entityType: "commission_rules",
      entityId: data.id,
      newValue: payload,
    });
  }
  revalidatePath("/admin/payroll/rules");
  return { success: true };
}

// ─── Invoices / payments ─────────────────────────────────────────────────────

export async function listInvoices() {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invoices")
    .select("*, project:projects(id, name), payments:invoice_payments(*)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { error: error.message, rows: [] as unknown[] };
  return { rows: data || [] };
}

export async function createInvoice(formData: FormData) {
  const actor = await requirePayrollAccess();
  const admin = createAdminClient();
  const payload = {
    project_id: (formData.get("project_id") as string) || null,
    invoice_number: String(formData.get("invoice_number") || "").trim(),
    client_name: (formData.get("client_name") as string) || null,
    invoice_date: (formData.get("invoice_date") as string) || null,
    due_date: (formData.get("due_date") as string) || null,
    amount: Number(formData.get("amount") || 0),
    currency: String(formData.get("currency") || "USD"),
    status: String(formData.get("status") || "sent"),
    notes: (formData.get("notes") as string) || null,
    created_by: actor.id,
  };
  if (!payload.invoice_number) return { error: "Invoice number is required" };
  const { data, error } = await admin.from("invoices").insert(payload).select().single();
  if (error) return { error: error.message };
  await writePayrollAudit({
    actorId: actor.id,
    action: "invoice.create",
    entityType: "invoices",
    entityId: data.id,
    newValue: payload,
  });
  revalidatePath("/admin/payroll/invoices");
  return { row: data };
}

export async function recordInvoicePayment(formData: FormData) {
  const actor = await requirePayrollAccess();
  const admin = createAdminClient();
  const invoiceId = String(formData.get("invoice_id") || "");
  const amount = Number(formData.get("amount") || 0);
  const paidAt = String(formData.get("paid_at") || new Date().toISOString().slice(0, 10));
  const currency = String(formData.get("currency") || "USD");
  const externalRef = (formData.get("external_ref") as string) || `pay-${invoiceId}-${paidAt}-${amount}`;

  if (!invoiceId || amount <= 0) return { error: "Invoice and positive amount required" };

  const { data, error } = await admin
    .from("invoice_payments")
    .insert({
      invoice_id: invoiceId,
      amount,
      currency,
      paid_at: paidAt,
      external_ref: externalRef,
      notes: (formData.get("notes") as string) || null,
      created_by: actor.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Update invoice status based on total paid
  const { data: invoice } = await admin.from("invoices").select("amount").eq("id", invoiceId).single();
  const { data: pays } = await admin.from("invoice_payments").select("amount").eq("invoice_id", invoiceId);
  const paidSum = (pays || []).reduce((s, p) => s + Number(p.amount), 0);
  const invAmount = Number(invoice?.amount) || 0;
  const status =
    paidSum <= 0 ? "sent" : paidSum >= invAmount ? "paid" : "partially_paid";
  await admin.from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", invoiceId);

  await writePayrollAudit({
    actorId: actor.id,
    action: "invoice_payment.create",
    entityType: "invoice_payments",
    entityId: data.id,
    newValue: data as unknown as Record<string, unknown>,
  });
  revalidatePath("/admin/payroll/invoices");
  return { row: data };
}

// ─── Payroll periods ─────────────────────────────────────────────────────────

export async function listPayrollPeriods() {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payroll_periods")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (error) return { error: error.message, periods: [] as unknown[] };
  return { periods: data || [] };
}

export async function createPayrollPeriod(input: {
  year: number;
  month: number;
  payDate?: string;
}) {
  const actor = await requirePayrollAccess();
  const admin = createAdminClient();
  const bounds = monthBounds(input.year, input.month);
  const payDate =
    input.payDate ||
    bounds.end;

  const { data, error } = await admin
    .from("payroll_periods")
    .insert({
      label: bounds.label,
      period_year: input.year,
      period_month: input.month,
      start_date: bounds.start,
      end_date: bounds.end,
      pay_date: payDate,
      status: "DRAFT",
      created_by: actor.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll_period.create",
    entityType: "payroll_periods",
    entityId: data.id,
    newValue: { year: input.year, month: input.month },
  });
  revalidatePayroll(data.id);
  return { period: data };
}

export async function runPayrollCalculation(periodId: string) {
  const actor = await requirePayrollAccess();
  const result = await calculatePayrollPeriod(periodId);
  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll.calculate",
    entityType: "payroll_periods",
    entityId: periodId,
    newValue: result as unknown as Record<string, unknown>,
  });
  revalidatePayroll(periodId);
  return result;
}

export async function getPayrollPeriodDetail(periodId: string) {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data: period, error } = await admin
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();
  if (error || !period) return { error: error?.message || "Not found" };

  const { data: records } = await admin
    .from("payroll_records")
    .select(
      "*, employee:employees(id, full_name, email, employee_code, designation)"
    )
    .eq("payroll_period_id", periodId)
    .order("net_pay", { ascending: false });

  const { data: anomalies } = await admin
    .from("payroll_anomalies")
    .select("*, employee:employees(id, full_name)")
    .eq("payroll_period_id", periodId)
    .order("severity")
    .order("created_at", { ascending: false });

  return { period, records: records || [], anomalies: anomalies || [] };
}

export async function getPayrollRecordCalculation(recordId: string) {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data: record, error } = await admin
    .from("payroll_records")
    .select(
      "*, employee:employees(id, full_name, email, employee_code, designation), line_items:payroll_line_items(*)"
    )
    .eq("id", recordId)
    .single();
  if (error) return { error: error.message };
  const lines = (record.line_items || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  return { record: { ...record, line_items: lines } };
}

export async function approvePayrollPeriod(periodId: string, confirmed: boolean) {
  const actor = await requirePayrollApprover();
  if (!confirmed) return { error: "Confirmation required" };
  const admin = createAdminClient();

  const { data: period } = await admin
    .from("payroll_periods")
    .select("status")
    .eq("id", periodId)
    .single();
  if (!period) return { error: "Period not found" };
  if (!["READY_FOR_APPROVAL", "REVIEW_REQUIRED"].includes(period.status)) {
    return { error: `Cannot approve from status ${period.status}` };
  }

  const { count } = await admin
    .from("payroll_anomalies")
    .select("id", { count: "exact", head: true })
    .eq("payroll_period_id", periodId)
    .eq("severity", "CRITICAL")
    .is("resolved_at", null);

  if ((count ?? 0) > 0) {
    return { error: "Resolve all CRITICAL anomalies before approval" };
  }

  const { error } = await admin
    .from("payroll_periods")
    .update({
      status: "APPROVED",
      approved_by: actor.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodId);

  if (error) return { error: error.message };

  await admin
    .from("commission_ledger")
    .update({ status: "APPROVED", updated_at: new Date().toISOString() })
    .eq("payroll_period_id", periodId)
    .eq("status", "PENDING");

  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll.approve",
    entityType: "payroll_periods",
    entityId: periodId,
  });
  revalidatePayroll(periodId);
  return { success: true };
}

export async function rejectPayrollPeriod(periodId: string, reason: string) {
  const actor = await requirePayrollApprover();
  const admin = createAdminClient();
  const { error } = await admin
    .from("payroll_periods")
    .update({
      status: "REJECTED",
      rejected_by: actor.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || "Rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", periodId);
  if (error) return { error: error.message };
  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll.reject",
    entityType: "payroll_periods",
    entityId: periodId,
    newValue: { reason },
  });
  revalidatePayroll(periodId);
  return { success: true };
}

export async function resolvePayrollAnomaly(anomalyId: string, note?: string) {
  const actor = await requirePayrollAccess();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payroll_anomalies")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: actor.id,
      resolution_note: note || "Resolved",
    })
    .eq("id", anomalyId)
    .select("payroll_period_id")
    .single();
  if (error) return { error: error.message };
  await writePayrollAudit({
    actorId: actor.id,
    action: "anomaly.resolve",
    entityType: "payroll_anomalies",
    entityId: anomalyId,
  });
  revalidatePayroll(data.payroll_period_id);
  return { success: true };
}

// ─── Salary slips ────────────────────────────────────────────────────────────

export async function generateSalarySlips(periodId: string) {
  const actor = await requirePayrollApprover();
  const admin = createAdminClient();

  const { data: period } = await admin
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();
  if (!period) return { error: "Period not found" };
  if (!["APPROVED", "PROCESSING", "COMPLETED"].includes(period.status)) {
    return { error: "Approve payroll before generating slips" };
  }

  const { data: settings } = await admin
    .from("payroll_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const { data: records } = await admin
    .from("payroll_records")
    .select(
      "*, employee:employees(id, full_name, email, employee_code, designation), line_items:payroll_line_items(*)"
    )
    .eq("payroll_period_id", periodId);

  let generated = 0;
  for (const r of records || []) {
    const emp = r.employee as {
      full_name: string;
      employee_code: string | null;
      designation: string;
    };
    const lines = (r.line_items || []) as {
      line_type: string;
      description: string;
      amount: number;
    }[];
    const earnings = lines
      .filter((l) => ["base_salary", "allowance", "commission", "bonus", "other"].includes(l.line_type))
      .map((l) => ({ description: l.description, amount: Number(l.amount) }));
    const deductions = lines
      .filter((l) => l.line_type === "deduction")
      .map((l) => ({ description: l.description, amount: Number(l.amount) }));

    const pdf = await renderSalarySlipPdf({
      companyName: settings?.company_name || "MindVista",
      companyAddress: settings?.company_address,
      footer: settings?.slip_footer,
      employeeName: emp.full_name,
      employeeCode: emp.employee_code,
      designation: emp.designation,
      periodLabel: period.label,
      payDate: period.pay_date,
      currency: r.currency || "USD",
      earnings,
      deductions,
      netPay: Number(r.net_pay),
    });

    const { data: slip, error } = await admin
      .from("salary_slips")
      .upsert(
        {
          payroll_period_id: periodId,
          payroll_record_id: r.id,
          employee_id: r.employee_id,
          pdf_base64: pdf.toString("base64"),
          generated_at: new Date().toISOString(),
        },
        { onConflict: "payroll_period_id,employee_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[salary-slip]", error.message);
      continue;
    }

    // Prepare email draft
    const toEmail = (r.employee as { email?: string }).email;
    if (toEmail && slip) {
      const idempotencyKey = `payroll-email:${periodId}:${r.employee_id}`;
      await admin.from("payroll_email_queue").upsert(
        {
          payroll_period_id: periodId,
          employee_id: r.employee_id,
          salary_slip_id: slip.id,
          to_email: toEmail,
          subject: `Your Salary Slip – ${period.label}`,
          body_text: [
            `Hello ${emp.full_name},`,
            ``,
            `Your salary slip for ${period.label} is attached.`,
            ``,
            `Net Salary: ${r.currency} ${Number(r.net_pay).toLocaleString()}`,
            `Pay Date: ${period.pay_date}`,
            ``,
            `Regards,`,
            `${settings?.company_name || "MindVista"} HR`,
          ].join("\n"),
          body_html: `<p>Hello ${emp.full_name},</p><p>Your salary slip for <strong>${period.label}</strong> is attached.</p><p>Net Salary: <strong>${r.currency} ${Number(r.net_pay).toLocaleString()}</strong><br/>Pay Date: ${period.pay_date}</p><p>Regards,<br/>${settings?.company_name || "MindVista"} HR</p>`,
          status: "READY",
          idempotency_key: idempotencyKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "idempotency_key" }
      );
    }
    generated += 1;
  }

  await admin
    .from("payroll_periods")
    .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
    .eq("id", periodId);

  await writePayrollAudit({
    actorId: actor.id,
    action: "salary_slips.generate",
    entityType: "payroll_periods",
    entityId: periodId,
    newValue: { generated },
  });
  revalidatePayroll(periodId);
  revalidatePath("/admin/payroll/emails");
  return { success: true, generated };
}

// ─── Email queue ─────────────────────────────────────────────────────────────

export async function listPayrollEmailQueue(periodId?: string) {
  await requirePayrollAccess();
  const admin = createAdminClient();
  let q = admin
    .from("payroll_email_queue")
    .select("*, employee:employees(id, full_name, email)")
    .order("created_at", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(500);
  if (error) return { error: error.message, rows: [] as unknown[] };
  return { rows: data || [] };
}

export async function approvePayrollEmails(ids: string[]) {
  const actor = await requirePayrollApprover();
  const admin = createAdminClient();
  const { error } = await admin
    .from("payroll_email_queue")
    .update({
      status: "APPROVED",
      approved_by: actor.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .in("status", ["READY", "DRAFT", "FAILED"]);
  if (error) return { error: error.message };
  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll_email.approve",
    entityType: "payroll_email_queue",
    newValue: { ids },
  });
  revalidatePath("/admin/payroll/emails");
  return { success: true };
}

export async function approveAllPayrollEmails(periodId: string) {
  const actor = await requirePayrollApprover();
  const admin = createAdminClient();
  const { data } = await admin
    .from("payroll_email_queue")
    .select("id")
    .eq("payroll_period_id", periodId)
    .in("status", ["READY", "DRAFT", "FAILED"]);
  const ids = (data || []).map((d) => d.id);
  if (!ids.length) return { success: true, count: 0 };
  const res = await approvePayrollEmails(ids);
  if (res.error) return res;
  return { success: true, count: ids.length };
}

export async function sendApprovedPayrollEmails(periodId: string) {
  const actor = await requirePayrollApprover();
  if (!canApprovePayroll(actor)) return { error: "Only admins can send" };
  const admin = createAdminClient();

  const { data: queue } = await admin
    .from("payroll_email_queue")
    .select("*, salary_slip:salary_slips(pdf_base64)")
    .eq("payroll_period_id", periodId)
    .eq("status", "APPROVED");

  let sent = 0;
  let failed = 0;

  for (const item of queue || []) {
    // Idempotency: skip if already SENT
    const slip = item.salary_slip as { pdf_base64?: string } | null;
    const result = await sendEmail({
      to: item.to_email,
      subject: item.subject,
      text: item.body_text,
      html: item.body_html || undefined,
      attachments: slip?.pdf_base64
        ? [
            {
              name: `salary-slip.pdf`,
              content: slip.pdf_base64,
              contentType: "application/pdf",
            },
          ]
        : undefined,
    });

    if (!result.ok) {
      failed += 1;
      await admin
        .from("payroll_email_queue")
        .update({
          status: "FAILED",
          error: result.error || "Send failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      continue;
    }

    sent += 1;
    await admin
      .from("payroll_email_queue")
      .update({
        status: "SENT",
        sent_at: new Date().toISOString(),
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);
  }

  // Mark commissions paid + period completed when all sent
  const { count: remaining } = await admin
    .from("payroll_email_queue")
    .select("id", { count: "exact", head: true })
    .eq("payroll_period_id", periodId)
    .neq("status", "SENT");

  if ((remaining ?? 0) === 0) {
    await admin
      .from("payroll_periods")
      .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
      .eq("id", periodId);
    await admin
      .from("commission_ledger")
      .update({ status: "PAID", updated_at: new Date().toISOString() })
      .eq("payroll_period_id", periodId)
      .eq("status", "APPROVED");
  }

  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll_email.send",
    entityType: "payroll_periods",
    entityId: periodId,
    newValue: { sent, failed },
  });
  revalidatePayroll(periodId);
  revalidatePath("/admin/payroll/emails");
  return { success: true, sent, failed };
}

export async function retryPayrollEmail(emailId: string) {
  const actor = await requirePayrollApprover();
  const admin = createAdminClient();
  await admin
    .from("payroll_email_queue")
    .update({
      status: "APPROVED",
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", emailId)
    .eq("status", "FAILED");

  const { data: item } = await admin
    .from("payroll_email_queue")
    .select("payroll_period_id")
    .eq("id", emailId)
    .single();

  if (!item) return { error: "Not found" };
  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll_email.retry",
    entityType: "payroll_email_queue",
    entityId: emailId,
  });
  return sendApprovedPayrollEmails(item.payroll_period_id);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getPayrollSettings() {
  await requirePayrollAccess();
  const admin = createAdminClient();
  const { data } = await admin
    .from("payroll_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  return { settings: data };
}

export async function updatePayrollSettings(formData: FormData) {
  const actor = await requirePayrollApprover();
  const admin = createAdminClient();
  const reminderRaw = String(formData.get("reminder_days_before") || "7,3,1,0");
  const reminder_days_before = reminderRaw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));

  const payload = {
    pay_day_of_month: Number(formData.get("pay_day_of_month") || 31),
    reminder_days_before,
    company_name: String(formData.get("company_name") || "MindVista"),
    company_address: (formData.get("company_address") as string) || null,
    slip_footer: (formData.get("slip_footer") as string) || null,
    default_currency: String(formData.get("default_currency") || "USD"),
    admin_notify_email: (formData.get("admin_notify_email") as string) || null,
    updated_at: new Date().toISOString(),
    updated_by: actor.id,
  };

  const { error } = await admin
    .from("payroll_settings")
    .upsert({ id: "default", ...payload });
  if (error) return { error: error.message };
  await writePayrollAudit({
    actorId: actor.id,
    action: "payroll_settings.update",
    entityType: "payroll_settings",
    entityId: null,
    newValue: payload,
  });
  revalidatePath("/admin/payroll/settings");
  return { success: true };
}

export async function listCommissions(periodId?: string) {
  await requirePayrollAccess();
  const admin = createAdminClient();
  let q = admin
    .from("commission_ledger")
    .select(
      "*, employee:employees(id, full_name), project:projects(id, name), rule:commission_rules(id, name, role)"
    )
    .order("created_at", { ascending: false });
  if (periodId) q = q.eq("payroll_period_id", periodId);
  const { data, error } = await q.limit(500);
  if (error) return { error: error.message, rows: [] as unknown[] };
  return { rows: data || [] };
}
