import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStandup } from "@/lib/standup/gemini-parser";

const STANDUP_CHANNELS = (process.env.STANDUP_CHANNELS || "").split(",").filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    if (!text || !userId || !messageTs) {
      return NextResponse.json({ ok: true });
    }

    const isStandupChannel =
      STANDUP_CHANNELS.length === 0 || STANDUP_CHANNELS.includes(channelId);

    if (!isStandupChannel) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("standup_entries")
      .select("id")
      .eq("slack_message_ts", messageTs)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("slack_user_id", userId)
      .single();

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
    return NextResponse.json({ ok: true });
  }
}
