import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runLinkedInExportReminderCron } from "@/actions/linkedin-outreach";

/**
 * Daily check: Slack/email handlers on/after last working day (Asia/Karachi).
 * vercel.json: { "path": "/api/cron/linkedin-export-reminder", "schedule": "0 9 * * *" }
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

  const force = req.nextUrl.searchParams.get("force") === "1";
  const result = await runLinkedInExportReminderCron(force);
  return NextResponse.json(result);
}
