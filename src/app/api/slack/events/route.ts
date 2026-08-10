import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStandup } from "@/lib/standup/gemini-parser";

export const runtime = "nodejs";

function verifySlackSignature(
  signingSecret: string,
  signature: string | null,
  timestamp: string | null,
  rawBody: string
): boolean {
  if (!signature || !timestamp) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  // Reject requests older than 5 minutes (replay protection)
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSec > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const digest = createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${digest}`;

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error("[Slack events] SLACK_SIGNING_SECRET is not set");
      return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
    }

    const standupChannels = (process.env.STANDUP_CHANNELS || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (standupChannels.length === 0) {
      console.error("[Slack events] STANDUP_CHANNELS is empty — refusing events");
      return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-slack-signature");
    const timestamp = req.headers.get("x-slack-request-timestamp");

    if (!verifySlackSignature(signingSecret, signature, timestamp, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      type?: string;
      challenge?: string;
      event?: {
        type?: string;
        subtype?: string;
        channel?: string;
        user?: string;
        text?: string;
        ts?: string;
      };
    };

    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    if (body.type !== "event_callback") {
      return NextResponse.json({ ok: true });
    }

    const event = body.event;
    if (!event || event.type !== "message" || event.subtype) {
      return NextResponse.json({ ok: true });
    }

    const channelId = event.channel;
    const userId = event.user;
    const text = event.text;
    const messageTs = event.ts;

    if (!text || !userId || !messageTs || !channelId) {
      return NextResponse.json({ ok: true });
    }

    if (!standupChannels.includes(channelId)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("standup_entries")
      .select("id")
      .eq("slack_message_ts", messageTs)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("slack_user_id", userId)
      .maybeSingle();

    const parsed = await parseStandup(text);

    await supabase.from("standup_entries").insert({
      employee_id: employee?.id || null,
      slack_user_id: userId,
      slack_message_ts: messageTs,
      channel_id: channelId,
      raw_text: text,
      completed: parsed.completed,
      blockers: parsed.blockers,
      in_progress: parsed.in_progress,
      performance_score: parsed.score,
      parsed_at: new Date().toISOString(),
    });

    console.log(
      `[Standup] Parsed from ${employee?.full_name || userId}: score=${parsed.score}, completed=${parsed.completed.length}, blockers=${parsed.blockers.length}`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Slack events] Error:", err);
    // Acknowledge to avoid Slack retries storms when our parser fails
    return NextResponse.json({ ok: true });
  }
}
