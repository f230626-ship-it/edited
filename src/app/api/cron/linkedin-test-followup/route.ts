import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import {
  runFollowUpReminders,
  checkAllUploadedAndSendReport,
} from "@/actions/linkedin-outreach";

/**
 * ONE-TIME TEST ONLY — August 13, 2026 at 9:30 PM PKT (16:30 UTC).
 * Runs the same logic as the Thursday 3 PM Sales channel follow-up,
 * but for July 2026 instead of the current month.
 *
 * Performs a FRESH database check — only profiles STILL missing
 * after the 8:30 PM reminder are included.
 *
 * If all 7 profiles are now complete, triggers report generation
 * and does NOT send a follow-up reminder.
 *
 * vercel.json: 30 16 13 8 * (fires only on Aug 13)
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
