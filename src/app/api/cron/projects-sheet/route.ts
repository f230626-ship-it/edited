import { NextRequest, NextResponse } from "next/server";
import { runProjectsSheetCronSync } from "@/actions/project-sync";

/**
 * Biweekly Projects Google Sheet sync.
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Vercel cron: 1st & 15th of each month at 04:00 UTC (09:00 AM Pakistan)
 * Plus in-code guard skipping if last successful sync < 12 days ago.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runProjectsSheetCronSync();
    if (result && "error" in result && result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
