import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runMonthlyReportGeneration } from "@/lib/linkedin/monthly-report";

/**
 * Monthly LinkedIn PDF report → admin email.
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const result = await runMonthlyReportGeneration(force);
    return NextResponse.json({ ok: result.success, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
