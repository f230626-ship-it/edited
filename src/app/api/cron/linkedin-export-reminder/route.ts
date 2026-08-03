import { NextRequest, NextResponse } from "next/server";
import { runLinkedInExportReminderCron } from "@/actions/linkedin-outreach";

/**
 * Daily check: emails handlers on the last working day of the month (Asia/Karachi).
 * vercel.json: { "path": "/api/cron/linkedin-export-reminder", "schedule": "0 9 * * *" }
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
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const result = await runLinkedInExportReminderCron(force);
  return NextResponse.json(result);
}
