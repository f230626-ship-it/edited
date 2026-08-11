import { NextRequest, NextResponse } from "next/server";
import { runLinkedInExportReminderCron } from "@/actions/linkedin-outreach";

/**
 * Manual trigger for LinkedIn export reminders.
 * Can be called directly for testing: POST /api/cron/linkedin-export-reminder?force=1
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
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runLinkedInExportReminderCron(true);
  return NextResponse.json(result);
}
