import { NextResponse } from "next/server";

/**
 * DEPRECATED — LinkedIn export reminders now only fire via production cron:
 * - /api/cron/linkedin-weekly-reminder (last Friday of month)
 * - /api/cron/linkedin-followup-reminder (Saturday after)
 *
 * This manual trigger endpoint has been disabled to prevent spam.
 */
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint has been disabled. Reminders only fire via production cron on the last Friday of each month." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been disabled. Reminders only fire via production cron on the last Friday of each month." },
    { status: 410 }
  );
}
