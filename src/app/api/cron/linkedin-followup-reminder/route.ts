import { NextRequest, NextResponse } from "next/server";
import { runFollowUpReminders, checkAllUploadedAndSendReport } from "@/actions/linkedin-outreach";

/**
 * Thursday follow-up: sends individual reminders to employees who
 * haven't uploaded after the Wednesday reminder. Also checks if all
 * employees uploaded and triggers the monthly report to admin.
 * vercel.json: { "path": "/api/cron/linkedin-followup-reminder", "schedule": "0 10 * * 4" }
 * 10AM UTC = 3PM Pakistan (Asia/Karachi, UTC+5)
 */
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[linkedin-followup-reminder] CRON_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[linkedin-followup-reminder] Running Thursday follow-up...");

  // 1. Send individual follow-up reminders
  const followUpResult = await runFollowUpReminders();
  console.log("[linkedin-followup-reminder] Follow-up result:", JSON.stringify(followUpResult));

  // 2. Check if all uploaded and send report if so
  const reportResult = await checkAllUploadedAndSendReport();
  console.log("[linkedin-followup-reminder] Report check result:", JSON.stringify(reportResult));

  return NextResponse.json({
    followUp: followUpResult,
    report: reportResult,
  });
}
