const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const pid = "ff53efe8-b26d-4b7a-b7d-34707c43bb2f";

  // 1. Check ALL tables row counts
  console.log("=== RAW ROW COUNTS ===");
  for (const table of ["linkedin_invitations", "linkedin_connections", "linkedin_messages"]) {
    const { count } = await s.from(table).select("id", { count: "exact", head: true }).eq(table === "linkedin_messages" ? "sales_profile_id" : "profile_id", pid);
    console.log(table + ":", count);
  }

  // 2. Invitations - the FULL export should have ~4401 outgoing
  // Check if there are invitations with NULL dates
  const { data: allInv } = await s.from("linkedin_invitations").select("invitation_date, direction").eq("profile_id", pid);
  const invNullDate = (allInv || []).filter((i) => !i.invitation_date);
  console.log("\n=== INVITATIONS DATE CHECK ===");
  console.log("Total:", allInv?.length, "Null date:", invNullDate.length);

  // 3. Connections - check matched vs unmatched
  const { data: allConn } = await s.from("linkedin_connections").select("id, first_name, last_name, connected_on").eq("profile_id", pid);
  const connNullDate = (allConn || []).filter((c) => !c.connected_on);
  console.log("\n=== CONNECTIONS DATE CHECK ===");
  console.log("Total:", allConn?.length, "Null date:", connNullDate.length);

  // 4. Check what the original full period stats look like (before recompute)
  const { data: stats } = await s.from("linkedin_profile_period_stats").select("*").eq("sales_profile_id", pid).order("period_year");
  console.log("\n=== PERIOD STATS DETAIL ===");
  let totalInv = 0, totalConn = 0, totalMsg = 0, totalInit = 0, totalFU = 0, totalRep = 0;
  for (const r of stats || []) {
    totalInv += r.invites_sent;
    totalConn += r.connections_made;
    totalMsg += r.messages_sent;
    totalInit += r.initial_messages;
    totalFU += r.follow_ups_sent;
    totalRep += r.replies_received;
    console.log(`${r.period_year}-${String(r.period_month).padStart(2, "0")}: inv=${r.invites_sent} conn=${r.connections_made} msg=${r.messages_sent} init=${r.initial_messages} fu=${r.follow_ups_sent} rep=${r.replies_received} acc=${r.acceptance_rate}% reply=${r.reply_rate}%`);
  }
  console.log("TOTALS: inv=" + totalInv + " conn=" + totalConn + " msg=" + totalMsg + " init=" + totalInit + " fu=" + totalFU + " rep=" + totalRep);

  // 5. Messages - check date distribution to understand the 14 missing
  const { data: msgs } = await s.from("linkedin_messages").select("sent_at, date, is_from_owner, is_outbound, conversation_id, from_name").eq("sales_profile_id", pid);
  const msgByMonthOwner = {};
  const msgByMonthReply = {};
  for (const m of msgs || []) {
    const mo = (m.sent_at || m.date || "").slice(0, 7);
    if (m.is_from_owner || m.is_outbound) {
      msgByMonthOwner[mo] = (msgByMonthOwner[mo] || 0) + 1;
    } else {
      msgByMonthReply[mo] = (msgByMonthReply[mo] || 0) + 1;
    }
  }
  console.log("\n=== MESSAGES BY MONTH (owner vs reply) ===");
  console.log("Owner:", JSON.stringify(msgByMonthOwner));
  console.log("Reply:", JSON.stringify(msgByMonthReply));

  // 6. Check if messages without conversation_id (standalone) affect counting
  const msgsNoConv = (msgs || []).filter((m) => !m.conversation_id);
  console.log("\nMessages without conversation_id:", msgsNoConv.length);
}

main().catch(console.error);
