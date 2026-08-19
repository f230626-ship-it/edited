import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderInvoicePdf } from "@/lib/payroll/invoice-pdf";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: invoice, error } = await admin
    .from("invoices")
    .select("id, pdf_base64, invoice_pdf_name, client_name, amount, currency, employee_id, payroll_period_id")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message || "Invoice not found" }, { status: 404 });
  }

  if (invoice.pdf_base64) {
    const pdfBuf = Buffer.from(invoice.pdf_base64, "base64");
    return new NextResponse(pdfBuf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoice_pdf_name || "invoice.pdf"}"`,
      },
    });
  }

  if (!invoice.payroll_period_id || !invoice.employee_id) {
    return NextResponse.json({ error: "No linked payroll data" }, { status: 400 });
  }

  const { data: settings } = await admin
    .from("payroll_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const { data: record } = await admin
    .from("payroll_records")
    .select("*, employee:employees(id, full_name, designation), line_items:payroll_line_items(*)")
    .eq("payroll_period_id", invoice.payroll_period_id)
    .eq("employee_id", invoice.employee_id)
    .single();

  if (!record) return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });

  const emp = record.employee as { full_name: string; designation: string };
  const period = await admin.from("payroll_periods").select("label, pay_date").eq("id", invoice.payroll_period_id).single();

  const lines = (record.line_items || []) as { line_type: string; description: string; amount: number }[];
  const earningsLines = lines
    .filter((l) => ["base_salary", "allowance", "commission", "bonus"].includes(l.line_type))
    .map((l) => ({ description: l.description, amount: Number(l.amount) }));
  const total = earningsLines.reduce((sum, item) => sum + item.amount, 0);

  const pdfBuffer = await renderInvoicePdf({
    companyName: settings?.company_name || "MindVista",
    companyAddress: settings?.company_address,
    employeeName: emp.full_name,
    designation: emp.designation,
    periodLabel: period.data?.label || "Payroll",
    payDate: period.data?.pay_date || "",
    currency: invoice.currency || "USD",
    lineItems: earningsLines,
    total,
  });

  const pdfBase64 = pdfBuffer.toString("base64");
  await admin
    .from("invoices")
    .update({ pdf_base64: pdfBase64, invoice_pdf_name: `invoice-${invoice.id}.pdf`, updated_at: new Date().toISOString() })
    .eq("id", id);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.id}.pdf"`,
    },
  });
}
