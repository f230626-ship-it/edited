"use server";

import { requirePayrollAccess } from "@/lib/payroll/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writePayrollAudit } from "@/lib/payroll/audit";

export async function createInvoiceAction(formData: FormData) {
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
  return { row: data };
}

export async function recordInvoicePaymentAction(formData: FormData) {
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

  const { data: invoice } = await admin.from("invoices").select("amount").eq("id", invoiceId).single();
  const { data: pays } = await admin.from("invoice_payments").select("amount").eq("invoice_id", invoiceId);
  const paidSum = (pays || []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
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
  return { row: data };
}
