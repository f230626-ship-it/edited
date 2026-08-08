import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/**
 * Daily payroll reminder: notify admins when pay date is approaching
 * and current-month payroll is not yet APPROVED/COMPLETED.
 */
export async function GET(request: NextRequest) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const admin = createAdminClient();
    const { data: settings } = await admin
      .from("payroll_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const payDay = Math.min(settings?.pay_day_of_month ?? 31, daysInMonth(year, month));
    const payDate = new Date(Date.UTC(year, month - 1, payDay));
    const daysUntil = Math.round((payDate.getTime() - Date.UTC(year, now.getUTCMonth(), now.getUTCDate())) / 86400000);

    const reminderDays: number[] = settings?.reminder_days_before || [7, 3, 1, 0];
    if (!reminderDays.includes(daysUntil)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Not a reminder day", daysUntil });
    }

    const { data: period } = await admin
      .from("payroll_periods")
      .select("id, label, status")
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();

    if (period && ["APPROVED", "PROCESSING", "COMPLETED"].includes(period.status)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Payroll already approved" });
    }

    const monthName = payDate.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const title =
      daysUntil === 0
        ? `Payroll Reminder: ${monthName} payroll is due today`
        : `Payroll Reminder: ${monthName} payroll is due in ${daysUntil} day(s)`;
    const message = period
      ? `${period.label} is currently ${period.status} and has not been approved.`
      : `${monthName} payroll has not been created yet.`;

    const { data: admins } = await admin
      .from("employees")
      .select("id, email")
      .eq("role", "admin")
      .eq("status", "active");

    for (const a of admins || []) {
      await admin.from("notifications").insert({
        recipient_id: a.id,
        type: "payroll_reminder",
        title,
        message,
        entity_type: "payroll_period",
        entity_id: period?.id ?? null,
      });
    }

    const notifyEmail = settings?.admin_notify_email || admins?.[0]?.email;
    if (notifyEmail) {
      await sendEmail({
        to: notifyEmail,
        subject: title,
        text: message,
        html: `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://hrms.mindvista.io"}/admin/payroll">Open Payroll</a></p>`,
      });
    }

    return NextResponse.json({ ok: true, daysUntil, notified: (admins || []).length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
