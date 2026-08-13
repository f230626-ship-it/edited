import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import {
  runLinkedInExportReminderCron,
  checkAllUploadedAndSendReport,
} from "@/actions/linkedin-outreach";

/**
 * ONE-TIME TEST ONLY — August 13, 2026 at 8:30 PM PKT (15:30 UTC).
 * Runs the same logic as the Wednesday 3 PM Sales channel reminder,
 * but for July 2026 instead of the current month.
 *
 * vercel.json: 30 15 13 8 * (fires only on Aug 13)
 *
 * Production schedule (Wed 3 PM / Thu 3 PM) is NOT affected.
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
