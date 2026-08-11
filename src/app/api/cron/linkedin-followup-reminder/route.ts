import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import {
  runFollowUpReminders,
  checkAllUploadedAndSendReport,
} from "@/actions/linkedin-outreach";

/**
 * Thursday follow-up: individual reminders + optional report when all uploaded.
 * vercel.json: 0 10 * * 4 (10:00 UTC ≈ 15:00 PKT)
 */
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  console.log("[linkedin-followup-reminder] Running Thursday follow-up...");

  const followUpResult = await runFollowUpReminders();
  console.log("[linkedin-followup-reminder] Follow-up result:", JSON.stringify(followUpResult));

  const reportResult = await checkAllUploadedAndSendReport();
  console.log("[linkedin-followup-reminder] Report check result:", JSON.stringify(reportResult));

  return NextResponse.json({
    followUp: followUpResult,
    report: reportResult,
  });
}
