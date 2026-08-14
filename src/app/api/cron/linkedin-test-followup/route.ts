import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import {
  runFollowUpReminders,
  checkAllUploadedAndSendReport,
} from "@/actions/linkedin-outreach";

/**
 * ONE-TIME TEST ONLY — August 14, 2026 at 5:30 PM PKT (12:30 UTC).
 * Fires exactly 1 hour after the 4:30 PM PKT test reminder.
 * Runs the same logic as the production follow-up,
 * but for July 2026 instead of the current month.
 *
 * Performs a FRESH database check — only profiles STILL missing
 * after the 4:30 PM reminder are included in the follow-up message.
 *
 * If all 7 profiles are now complete, triggers report generation
 * and does NOT send a follow-up reminder.
 *
 * Production schedule (last Friday of month) is NOT affected.
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
    `[linkedin-test-followup] Running ONE-TIME test follow-up for July 2026...`
  );

  // 1. Fresh DB check — runFollowUpReminders internally re-queries the DB
  //    and only lists profiles that are STILL missing (not stale from 8:30 PM)
  const followUpResult = await runFollowUpReminders(TEST_YEAR, TEST_MONTH);
  console.log(
    "[linkedin-test-followup] Follow-up result:",
    JSON.stringify(followUpResult)
  );

  // 2. Check if all uploaded now (may have completed between 8:30 and 9:30 PM)
  //    If yes, this triggers report generation + email to admin
  const reportResult = await checkAllUploadedAndSendReport(TEST_YEAR, TEST_MONTH);
  console.log(
    "[linkedin-test-followup] Report check result:",
    JSON.stringify(reportResult)
  );

  return NextResponse.json({
    ok: true,
    test: true,
    month: "July 2026",
    followup: followUpResult,
    report: reportResult,
  });
}
