import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import {
  runLinkedInExportReminderCron,
  checkAllUploadedAndSendReport,
} from "@/actions/linkedin-outreach";

/**
 * LinkedIn Export Reminder — Sales Channel (July 2026 Test).
 * Triggered by GitHub Actions at 4:30 PM PKT (11:30 UTC) on Aug 14, 2026.
 * Reports for July 2026 — uses force=true + explicit year/month to bypass date guard.
 *
 * Follow-up fires 1 hour later (5:30 PM PKT = 12:30 UTC) via linkedin-test-followup route.
 * See: .github/workflows/linkedin-test-reminder.yml
 * Production Sales channel reminders use linkedin-weekly-reminder (last Friday of month).
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
