import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStandup } from "@/lib/standup/gemini-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLACK_API = "https://slack.com/api";

const STANDUP_CHANNELS = () =>
  (process.env.STANDUP_CHANNELS || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

async function slackFetch(method: string, params: Record<string, string>) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not set");

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SLACK_API}/${method}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Slack ${method} HTTP ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = STANDUP_CHANNELS();
  if (channels.length === 0) {
    return NextResponse.json({ error: "STANDUP_CHANNELS not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();

  // Load employee map
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, slack_user_id");

  const empBySlackId = new Map<string, { id: string; full_name: string }>();
  (employees || []).forEach((e) => {
    if (e.slack_user_id) empBySlackId.set(e.slack_user_id, { id: e.id, full_name: e.full_name });
  });

  // Load existing timestamps to skip duplicates
  const { data: existing } = await supabase
    .from("standup_entries")
    .select("slack_message_ts");
  const existingTs = new Set((existing || []).map((e) => e.slack_message_ts));

  // Fetch last 24 hours of messages
  const oldest = ((Date.now() / 1000) - 86400).toString();

  let totalNew = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const channelId of channels) {
    try {
      const result = await slackFetch("conversations.history", {
        channel: channelId,
        oldest,
        limit: "100",
      });

      if (!result.ok) {
        errors.push(`${channelId}: ${result.error}`);
        continue;
      }

      const messages = (result.messages as any[]) || [];

      for (const msg of messages) {
        if (!msg.user || msg.subtype || msg.bot_id) continue;
        if (existingTs.has(msg.ts)) { totalSkipped++; continue; }

        const parsed = await parseStandup(msg.text || "");
        if (!parsed.isStandup && parsed.completed.length === 0 && parsed.in_progress.length === 0) continue;

        const emp = empBySlackId.get(msg.user);

        const { error } = await supabase.from("standup_entries").insert({
          employee_id: emp?.id || null,
          slack_user_id: msg.user,
          slack_message_ts: msg.ts,
          channel_id: channelId,
          raw_text: msg.text,
          completed: parsed.completed,
          blockers: parsed.blockers,
          in_progress: parsed.in_progress,
          performance_score: parsed.score,
          parsed_at: new Date().toISOString(),
        });

        if (error) {
          if (error.code === "23505") totalSkipped++;
          else errors.push(`insert: ${error.message}`);
        } else {
          totalNew++;
        }
      }
    } catch (err) {
      errors.push(`${channelId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[Standup sync] inserted=${totalNew}, skipped=${totalSkipped}, errors=${errors.length}`);

  return NextResponse.json({
    success: true,
    inserted: totalNew,
    skipped: totalSkipped,
    errors,
  });
}
