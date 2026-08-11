import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStandup } from "@/lib/standup/gemini-parser";
import { createHmac, timingSafeEqual } from "crypto";

const STANDUP_CHANNELS = (process.env.STANDUP_CHANNELS || "").split(",").filter(Boolean);
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";

function verifySlackRequest(
  timestamp: string,
  signature: string,
  body: string
): boolean {
  if (!SLACK_SIGNING_SECRET) {
    console.warn("[Slack] SLACK_SIGNING_SECRET not set — skipping verification (INSECURE)");
    return true;
  }

  const fiveMinAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinAgo) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest("hex");
  const computed = `v0=${hmac}`;

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function resolveEmployee(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  let { data: employee } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("slack_user_id", userId)
    .single();

  if (!employee) {
    const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
    if (SLACK_TOKEN) {
      try {
        const userRes = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
          headers: { Authorization: `Bearer ${SLACK_TOKEN}` },
        });
        const userData = await userRes.json();
        if (userData.ok && userData.user?.profile?.email) {
          const email = userData.user.profile.email;
          const { data: matchedEmployee } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("email", email)
            .single();
          if (matchedEmployee) {
            await supabase
              .from("employees")
              .update({ slack_user_id: userId })
              .eq("id", matchedEmployee.id);
            employee = matchedEmployee;
            console.log(`[Slack] Auto-mapped ${matchedEmployee.full_name} to Slack user ${userId}`);
          }
        }
      } catch (e) {
        console.error("[Slack] Failed to resolve Slack user:", e);
      }
    }
  }

  return employee;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    const slackSignature = req.headers.get("x-slack-signature") || "";
    const slackTimestamp = req.headers.get("x-slack-request-timestamp") || "0";

    if (SLACK_SIGNING_SECRET && !verifySlackRequest(slackTimestamp, slackSignature, rawBody)) {
      console.warn("[Slack] Invalid signature — rejected request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    if (body.type !== "event_callback") {
      return NextResponse.json({ ok: true });
    }

    const event = body.event;
    if (!event || event.type !== "message") {
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();

    // ── message_deleted ──────────────────────────────────────────────────
    if (event.subtype === "message_deleted") {
      const deletedTs = event.deleted_ts || event.ts;
      const { error } = await supabase
        .from("standup_entries")
        .delete()
        .eq("slack_message_ts", deletedTs);

      if (!error) {
        console.log(`[Slack] Deleted standup entry for message ${deletedTs}`);
      }
      return NextResponse.json({ ok: true });
    }

    // ── message_changed (edited) ─────────────────────────────────────────
    if (event.subtype === "message_changed") {
      const message = event.message;
      if (!message || message.subtype || message.bot_id) {
        return NextResponse.json({ ok: true });
      }

      const editedTs = message.ts;
      const newText = message.text;
      const editedBy = message.edited?.user || message.user;

      if (!newText || !editedTs) {
        return NextResponse.json({ ok: true });
      }

      const channelId = event.channel;

      const isStandupChannel =
        STANDUP_CHANNELS.length === 0 || STANDUP_CHANNELS.includes(channelId);
      if (!isStandupChannel) {
        return NextResponse.json({ ok: true });
      }

      const { data: existing } = await supabase
        .from("standup_entries")
        .select("id, employee_id")
        .eq("slack_message_ts", editedTs)
        .single();

      if (!existing) {
        console.log(`[Slack] Edited message ${editedTs} has no matching standup entry — treating as new`);
        const employee = await resolveEmployee(supabase, editedBy || "");
        const parsed = await parseStandup(newText);
        await supabase.from("standup_entries").insert({
          employee_id: employee?.id || null,
          slack_user_id: editedBy || null,
          slack_message_ts: editedTs,
          channel_id: channelId,
          raw_text: newText,
          completed: parsed.completed,
          blockers: parsed.blockers,
          in_progress: parsed.in_progress,
          performance_score: parsed.score,
          parsed_at: new Date().toISOString(),
        });
        console.log(`[Standup] Created from edit: score=${parsed.score}`);
        return NextResponse.json({ ok: true });
      }

      const parsed = await parseStandup(newText);
      await supabase
        .from("standup_entries")
        .update({
          raw_text: newText,
          completed: parsed.completed,
          blockers: parsed.blockers,
          in_progress: parsed.in_progress,
          performance_score: parsed.score,
          parsed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      console.log(`[Standup] Updated after edit: score=${parsed.score}, completed=${parsed.completed.length}`);
      return NextResponse.json({ ok: true });
    }

    // ── new message (no subtype) ─────────────────────────────────────────
    if (event.subtype || event.bot_id) {
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

    const { data: existing } = await supabase
      .from("standup_entries")
      .select("id")
      .eq("slack_message_ts", messageTs)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    const employee = await resolveEmployee(supabase, userId);
    const parsed = await parseStandup(text);

    if (!parsed.isStandup) {
      return NextResponse.json({ ok: true });
    }

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
