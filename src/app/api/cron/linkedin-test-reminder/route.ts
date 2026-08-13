import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import {
  runLinkedInExportReminderCron,
  checkAllUploadedAndSendReport,
} from "@/actions/linkedin-outreach";

/**
 * LinkedIn Export Reminder — AI Testing Channel (C0BNR2HLVA6).
 * Triggered by GitHub Actions on a recurring schedule (Hobby plan workaround):
 *   - Wednesday 3:00 PM PKT (10:00 UTC) — same cadence as production reminder
 *   - Thursday 3:00 PM PKT (10:00 UTC) — follow-up cadence
 *
 * See: .github/workflows/linkedin-test-reminder.yml
 * Production Sales channel reminders are handled separately.
 */
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// Test parameters — July 2026
const TEST_YEAR = 2026;
const TEST_MONTH = 7;

async function handle(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  console.log(
    `[linkedin-test-reminder] Running ONE-TIME test reminder for July 2026...`
  );

  // 1. Send initial reminder for July 2026 (force=true bypasses duplicate reminder check)
  const reminderResult = await runLinkedInExportReminderCron(
    true,
    TEST_YEAR,
    TEST_MONTH
  );
  console.log(
    "[linkedin-test-reminder] Reminder result:",
    JSON.stringify(reminderResult)
  );

  // 2. If all profiles already uploaded, check and trigger report immediately
  const reportResult = await checkAllUploadedAndSendReport(TEST_YEAR, TEST_MONTH);
  console.log(
    "[linkedin-test-reminder] Report check result:",
    JSON.stringify(reportResult)
  );

  return NextResponse.json({
    ok: true,
    test: true,
    month: "July 2026",
    reminder: reminderResult,
    report: reportResult,
  });
}
