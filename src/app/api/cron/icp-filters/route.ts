import { NextRequest, NextResponse } from "next/server";
import { runIcpFiltersCronSync } from "@/actions/icp-filters";

/**
 * Scheduled sync for ICP filters from Google Sheets.
 * Protect with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 *
 * Vercel cron (vercel.json):
 *   { "path": "/api/cron/icp-filters", "schedule": "0 4 * * 6" }
 *   → every Saturday 04:00 UTC = 09:00 AM Pakistan time
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIcpFiltersCronSync();
    if (result.error) {
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
