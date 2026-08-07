import { createClient } from "@supabase/supabase-js";
import { buildMonthlyPeriodStats } from "../src/lib/linkedin/period-rollup";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH = 500;

async function batchUpdate(table: string, ids: string[], updates: Record<string, unknown>) {
  if (ids.length === 0) return 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    await supabase.from(table).update(updates).in("id", chunk);
  }
  return ids.length;
}

async function main() {
  console.log("=== LinkedIn Recompute Period Stats ===\n");

  const { data: profiles } = await supabase
    .from("sales_profiles")
    .select("id, name, employee_id, platform, is_active")
    .eq("platform", "linkedin");

  // Step 1: Link orphaned messages to correct profiles
  console.log("Step 1: Linking orphaned messages...");
  const { data: unlinkedMsgs } = await supabase
    .from("linkedin_messages")
    .select("id, import_id, from_name, is_from_owner")
    .is("sales_profile_id", null)
    .limit(10000);

  if (unlinkedMsgs?.length) {
    console.log(`  Found ${unlinkedMsgs.length} unlinked messages`);
    const { data: imports } = await supabase
      .from("linkedin_imports")
      .select("id, sales_profile_id")
      .not("sales_profile_id", "is", null);

    const importToProfile: Record<string, string> = {};
    imports?.forEach((i) => { importToProfile[i.import_id] = i.sales_profile_id; });

    const byImport: Record<string, string[]> = {};
    for (const msg of unlinkedMsgs) {
      if (!msg.import_id) continue;
      const pid = importToProfile[msg.import_id];
      if (pid) {
        if (!byImport[pid]) byImport[pid] = [];
        byImport[pid].push(msg.id);
      }
    }

    for (const [pid, ids] of Object.entries(byImport)) {
      await batchUpdate("linkedin_messages", ids, { sales_profile_id: pid });
      console.log(`  Linked ${ids.length} messages to ${pid.slice(0, 8)}`);
    }
  }

  // Step 2: Compute stats for each profile
  for (const profile of profiles || []) {
    console.log(`\n--- ${profile.name} (${profile.id.slice(0, 8)}) ---`);

    // Invitations: query by profile_id
    const { data: invitations } = await supabase
      .from("linkedin_invitations")
      .select("direction, invitation_date, first_name, last_name, invitee_profile_url")
      .eq("profile_id", profile.id);

    // Also try querying by employee_id if profile has one
    let allInvitations = invitations || [];
    if (profile.employee_id) {
      const { data: empInvs } = await supabase
        .from("linkedin_invitations")
        .select("direction, invitation_date, first_name, last_name, invitee_profile_url")
        .eq("employee_id", profile.employee_id)
        .is("profile_id", null);
      allInvitations = [...allInvitations, ...(empInvs || [])];
    }

    // Deduplicate by invitation_date + first_name + last_name
    const seenInv = new Set<string>();
    allInvitations = allInvitations.filter((inv) => {
      const key = `${inv.invitation_date}|${inv.first_name}|${inv.last_name}`;
      if (seenInv.has(key)) return false;
      seenInv.add(key);
      return true;
    });

    // Connections: query by profile_id
    const { data: connections } = await supabase
      .from("linkedin_connections")
      .select("first_name, last_name, connected_on, profile_url, url")
      .eq("profile_id", profile.id);

    // Normalize connections: use `url` as fallback for `profile_url`
    const normalizedConns = (connections || []).map((c) => ({
      first_name: c.first_name,
      last_name: c.last_name,
      connected_on: c.connected_on,
      profile_url: c.profile_url || c.url || null,
    }));

    // Messages: query by sales_profile_id, use DB `date` column as fallback
    const { data: rawMessages } = await supabase
      .from("linkedin_messages")
      .select("conversation_id, from_name, to_name, sent_at, content_preview, folder, is_from_owner, date, message_date, content, is_outbound")
      .eq("sales_profile_id", profile.id);

    const messages = (rawMessages || []).map((m) => ({
      conversation_id: m.conversation_id,
      conversation_title: null as string | null,
      from_name: m.from_name,
      to_name: m.to_name,
      sender_profile_url: null as string | null,
      recipient_profile_urls: null as string | null,
      sent_at: m.sent_at || m.date || m.message_date || null,
      subject: null as string | null,
      content_preview: m.content_preview || (m.content ? m.content.slice(0, 280) : null),
      folder: m.folder,
      is_from_owner: m.is_from_owner || m.is_outbound || false,
    }));

    const withDate = messages.filter((m) => m.sent_at).length;
    const fromOwner = messages.filter((m) => m.is_from_owner).length;

    console.log(`  Invitations: ${allInvitations.length}`);
    console.log(`  Connections: ${normalizedConns.length}`);
    console.log(`  Messages: ${messages.length} (${withDate} with date, ${fromOwner} from owner)`);

    // Build period stats
    const periodRows = buildMonthlyPeriodStats({
      invitations: allInvitations,
      connections: normalizedConns,
      messages,
      isPartial: false,
    });

    for (const p of periodRows) {
      console.log(`  ${p.period_year}-${String(p.period_month).padStart(2, "0")}: invites=${p.invites_sent} conns=${p.connections_made} msgs=${p.messages_sent} init=${p.initial_messages} fu=${p.follow_ups_sent} replies=${p.replies_received} acc=${p.acceptance_rate}% reply=${p.reply_rate}%`);
    }

    if (periodRows.length > 0) {
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

      const { error } = await supabase
        .from("linkedin_profile_period_stats")
        .upsert(payload, { onConflict: "sales_profile_id,period_year,period_month" });

      console.log(error ? `  Error: ${error.message}` : `  Upserted ${periodRows.length} months`);
    } else {
      console.log("  No periods to upsert");
    }
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
