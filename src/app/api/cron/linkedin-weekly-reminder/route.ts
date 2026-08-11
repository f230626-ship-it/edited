import { NextRequest, NextResponse } from "next/server";
import { runLinkedInExportReminderCron } from "@/actions/linkedin-outreach";

/**
 * Weekly Wednesday reminder: sends channel message to Sales channel
 * listing employees who still need to upload their LinkedIn export.
 * vercel.json: { "path": "/api/cron/linkedin-weekly-reminder", "schedule": "0 10 * * 3" }
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
    console.error("[linkedin-weekly-reminder] CRON_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[linkedin-weekly-reminder] Running Wednesday reminder cron...");
  const result = await runLinkedInExportReminderCron(true);
  console.log("[linkedin-weekly-reminder] Result:", JSON.stringify(result));
  return NextResponse.json(result);
}
