import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runLinkedInExportReminderCron } from "@/actions/linkedin-outreach";

/**
 * Monthly last-Friday reminder: Sales channel message listing who still needs to upload.
 * GitHub Actions: 0 10 * * 5 (10:00 UTC ≈ 15:00 PKT) — every Friday.
 * The function internally checks isOnOrAfterLastFridayOfMonth() and skips if not the last Friday.
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

  console.log("[linkedin-weekly-reminder] Running last-Friday-of-month production reminder...");
  // force=false: respects the isOnOrAfterLastFridayOfMonth() date guard.
  // GitHub Actions fires this every Friday; only the last Friday of the month passes the guard.
  const result = await runLinkedInExportReminderCron(false);
  console.log("[linkedin-weekly-reminder] Result:", JSON.stringify(result));
  return NextResponse.json(result);
}
