import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runLinkedInExportReminderCron } from "@/actions/linkedin-outreach";

/**
 * Weekly Wednesday reminder: Sales channel message listing who still needs to upload.
 * vercel.json: 0 10 * * 3 (10:00 UTC ≈ 15:00 PKT)
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

  console.log("[linkedin-weekly-reminder] Running Wednesday reminder cron...");
  const result = await runLinkedInExportReminderCron(true);
  console.log("[linkedin-weekly-reminder] Result:", JSON.stringify(result));
  return NextResponse.json(result);
}
