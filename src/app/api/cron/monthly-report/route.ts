import { NextResponse } from "next/server";
import { generateAndSendMonthlyReport } from "@/actions/monthly-report";

/**
 * Cron: runs daily at 9 AM UTC (2 PM PKT) — same schedule as the reminder.
 * 24 hours after the first reminder is sent, this generates and emails the report.
 *
 * Idempotent: won't send twice for the same month unless ?force=1 is passed.
 */
export async function GET(req: Request) {
  // Verify Vercel cron secret to prevent unauthorized calls
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers ? new Headers(req.headers).get("authorization") : null;
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await generateAndSendMonthlyReport(force);

    if (result.alreadySent) {
      return NextResponse.json({
        ok: true,
        message: `Report already sent for ${result.month}`,
        alreadySent: true,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { ok: false, month: result.month, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      month: result.month,
      profilesIncluded: result.profilesIncluded,
      message: `Report sent to admin for ${result.month} (${result.profilesIncluded} profiles)`,
    });
  } catch (err) {
    console.error("[cron/monthly-report]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
