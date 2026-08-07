/**
 * POST /api/linkedin/reprocess
 *
 * Reprocesses period stats from existing stored data.
 * Reads messages from DB columns (date, content, is_outbound) as fallback
 * when parser's sent_at is null. Recomputes monthly period stats and upserts.
 *
 * Body: { sales_profile_id?: string } — if omitted, reprocesses ALL profiles
 * Query: ?dry_run=true — preview without writing
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee, isSalesOwner } from "@/lib/auth";
import { buildMonthlyPeriodStats, classifyMessagesByConversation } from "@/lib/linkedin/period-rollup";

interface DBMessage {
  id: string;
  sales_profile_id: string | null;
  import_id: string | null;
  conversation_id: string | null;
  conversation_title: string | null;
  from_name: string | null;
  to_name: string | null;
  sender_profile_url: string | null;
  recipient_profile_urls: string | null;
  sent_at: string | null;
  subject: string | null;
  content_preview: string | null;
  folder: string | null;
  is_from_owner: boolean;
  date: string | null;
  message_date: string | null;
  content: string | null;
  is_outbound: boolean | null;
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!isSalesOwner(employee.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetProfileId: string | undefined = body.sales_profile_id;
    const dryRun = req.nextUrl.searchParams.get("dry_run") === "true";

    const supabase = createAdminClient();

    // Get all active LinkedIn profiles (or a specific one)
    let profilesQuery = supabase
      .from("sales_profiles")
      .select("id, name, employee_id, platform, is_active")
      .eq("is_active", true);

    if (targetProfileId) {
      profilesQuery = profilesQuery.eq("id", targetProfileId);
    }

    const { data: profiles, error: profErr } = await profilesQuery;
    if (profErr || !profiles?.length) {
      return NextResponse.json({
        error: profErr?.message || "No LinkedIn profiles found",
        profiles: [],
      }, { status: 404 });
    }

    const linkedInProfiles = profiles.filter(
      (p) => !p.platform || p.platform === "linkedin"
    );

    const results: Record<string, unknown>[] = [];

    for (const profile of linkedInProfiles) {
      // 1. Fetch invitations for this profile
      //    profile_id is TEXT in DB, not UUID — use filter to avoid type cast issues
      const { data: invitationsRaw } = await supabase
        .from("linkedin_invitations")
        .select("profile_id, direction, invitation_date, first_name, last_name, invitee_profile_url");
      const invitations = (invitationsRaw || []).filter((i: any) => i.profile_id === profile.id);

      // 2. Fetch connections for this profile (DB uses profile_id, url as fallback for profile_url)
      const { data: connectionsRaw } = await supabase
        .from("linkedin_connections")
        .select("profile_id, first_name, last_name, connected_on, profile_url, url");
      const connections = (connectionsRaw || [])
        .filter((c: any) => c.profile_id === profile.id)
        .map((c) => ({
          first_name: c.first_name,
          last_name: c.last_name,
          connected_on: c.connected_on,
          profile_url: c.profile_url || c.url || null,
        }));

      // 3. Fetch messages — use `date` column as fallback for `sent_at`
      const { data: rawMessagesAll } = await supabase
        .from("linkedin_messages")
        .select("id, sales_profile_id, conversation_id, conversation_title, from_name, to_name, sender_profile_url, recipient_profile_urls, sent_at, subject, content_preview, folder, is_from_owner, date, message_date, content, is_outbound");
      const rawMessages = (rawMessagesAll || []).filter((m: any) => m.sales_profile_id === profile.id);

      // Normalize messages: use `date` as fallback for `sent_at`, `is_outbound` as fallback for `is_from_owner`
      const messages = (rawMessages || []).map((m: any) => ({
        conversation_id: m.conversation_id,
        conversation_title: m.conversation_title,
        from_name: m.from_name,
        to_name: m.to_name,
        sender_profile_url: m.sender_profile_url,
        recipient_profile_urls: m.recipient_profile_urls,
        sent_at: m.sent_at || m.date || m.message_date || null,
        subject: m.subject,
        content_preview: m.content_preview || (m.content ? m.content.slice(0, 280) : null),
        folder: m.folder,
        is_from_owner: m.is_from_owner || m.is_outbound || false,
      }));

      const totalMessages = messages.length;
      const messagesWithDate = messages.filter((m) => m.sent_at).length;
      const messagesFromOwner = messages.filter((m) => m.is_from_owner).length;

      // 4. Build period stats
      const periodRows = buildMonthlyPeriodStats({
        invitations: invitations || [],
        connections: connections || [],
        messages,
        isPartial: false,
      });

      // 5. Classify for verification
      const classified = classifyMessagesByConversation(messages);

      const result: Record<string, unknown> = {
        profile_id: profile.id,
        profile_name: profile.name,
        total_messages: totalMessages,
        messages_with_date: messagesWithDate,
        messages_from_owner: messagesFromOwner,
        invitations_count: invitations?.length || 0,
        connections_count: connections?.length || 0,
        classified_messages: classified.length,
        initial_messages: classified.filter((c) => c.is_initial).length,
        follow_ups: classified.filter((c) => c.is_follow_up).length,
        replies: classified.filter((c) => c.is_reply).length,
        period_months: periodRows.length,
        periods: periodRows,
      };

      // 6. Upsert unless dry run
      if (!dryRun && periodRows.length > 0) {
        const payload = periodRows.map((row) => ({
          sales_profile_id: profile.id,
          period_year: row.period_year,
          period_month: row.period_month,
          invites_sent: row.invites_sent,
          connections_made: row.connections_made,
          acceptance_rate: row.acceptance_rate,
          messages_sent: row.messages_sent,
          initial_messages: row.initial_messages,
          follow_ups_sent: row.follow_ups_sent,
          replies_received: row.replies_received,
          reply_rate: row.reply_rate,
          is_partial: row.is_partial,
          synced_at: new Date().toISOString(),
        }));

        const { error: upErr } = await supabase
          .from("linkedin_profile_period_stats")
          .upsert(payload, { onConflict: "sales_profile_id,period_year,period_month" });

        result.upsert_error = upErr?.message ?? null;
        result.upserted = !upErr;
      } else {
        result.dry_run = true;
      }

      results.push(result);
    }

    return NextResponse.json({
      dry_run: dryRun,
      profiles_processed: results.length,
      results,
    });
  } catch (err: unknown) {
    console.error("[LinkedIn reprocess]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
