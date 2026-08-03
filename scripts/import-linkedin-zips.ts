/**
 * Import LinkedIn complete-export ZIPs into linkedin_profile_period_stats.
 * Usage: npx tsx scripts/import-linkedin-zips.ts
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  detectDatasetType,
  parseCSV,
  parseInvitationsData,
  parseConnectionsData,
  parseMessagesData,
  detectPartialExport,
  extractOwnerDisplayName,
} from "../src/lib/linkedin/parser";
import { buildMonthlyPeriodStats } from "../src/lib/linkedin/period-rollup";
import { matchSalesProfileId } from "../src/lib/linkedin/profile-match";

function loadEnv() {
  const content = readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const LLM_REFERENCE: Record<
  string,
  {
    invites: number;
    conn: number;
    acc: number;
    msgs: number;
    fu: number;
    replies: number;
    reply: number;
  }
> = {
  "Fiza S.": { invites: 4185, conn: 1537, acc: 36.7, msgs: 7141, fu: 5570, replies: 1095, reply: 15.3 },
  "M Usama (Sam)": { invites: 2879, conn: 1035, acc: 35.9, msgs: 4891, fu: 3784, replies: 741, reply: 15.2 },
  "Abdullah S.": { invites: 4266, conn: 1312, acc: 30.8, msgs: 8672, fu: 7265, replies: 1039, reply: 12.0 },
  "Abdul Hafeez": { invites: 4444, conn: 1327, acc: 29.9, msgs: 6851, fu: 5553, replies: 986, reply: 14.4 },
  "Asim A.": { invites: 2010, conn: 551, acc: 27.4, msgs: 1823, fu: 1412, replies: 248, reply: 13.6 },
};

const HANDLERS: Record<string, string> = {
  // name patterns → employee email
  "fiza": "asimtassaduqwork@gmail.com",
  "usama": "asimtassaduqwork@gmail.com",
  "sam": "asimtassaduqwork@gmail.com",
  "abdullah": "work.faizan81@gmail.com",
  "hafeez": "work.faizan81@gmail.com",
  "asim": "abdullahharoon681@gmail.com",
};

async function parseZip(filePath: string) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(readFileSync(filePath));
  const datasets: { type: string; data: Record<string, unknown>[] }[] = [];

  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    if (!name.toLowerCase().endsWith(".csv")) continue;
    const bas = name.split("/").pop()?.split("\\").pop() || name;
    const type = detectDatasetType(bas);
    if (type === "unknown") continue;
    const text = await zip.files[name].async("text");
    datasets.push({ type, data: parseCSV(text) });
  }

  const profile = datasets.find((d) => d.type === "profile");
  const owner =
    extractOwnerDisplayName((profile?.data?.[0] as Record<string, unknown>) ?? null) ||
    path.basename(filePath, ".zip");

  const invitations = datasets.find((d) => d.type === "invitations");
  const connections = datasets.find((d) => d.type === "connections");
  const messages = datasets.find((d) => d.type === "messages");

  const parsedInv = invitations ? parseInvitationsData(invitations.data) : [];
  const parsedConn = connections ? parseConnectionsData(connections.data) : [];
  const parsedMsg = messages ? parseMessagesData(messages.data, [owner]) : [];
  const isPartial = detectPartialExport(datasets.map((d) => d.type));

  const months = buildMonthlyPeriodStats({
    invitations: parsedInv,
    connections: parsedConn,
    messages: parsedMsg,
    isPartial,
  });

  return { owner, months, isPartial, filename: path.basename(filePath) };
}

function sumMonths(months: ReturnType<typeof buildMonthlyPeriodStats>) {
  const sum = months.reduce(
    (a, m) => ({
      invites: a.invites + m.invites_sent,
      conn: a.conn + m.connections_made,
      msgs: a.msgs + m.messages_sent,
      fu: a.fu + m.follow_ups_sent,
      replies: a.replies + m.replies_received,
    }),
    { invites: 0, conn: 0, msgs: 0, fu: 0, replies: 0 }
  );
  return {
    ...sum,
    acceptance: sum.invites ? Number(((sum.conn / sum.invites) * 100).toFixed(1)) : 0,
    reply: sum.msgs ? Number(((sum.replies / sum.msgs) * 100).toFixed(1)) : 0,
  };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, key);

  const dir = path.resolve("fixtures/linkedin-exports/complete-2026-08");
  const files = readdirSync(dir).filter((f) => f.endsWith(".zip"));

  const { data: employees } = await sb.from("employees").select("id, email, full_name");
  const empByEmail = new Map(
    (employees || []).map((e) => [e.email.toLowerCase(), e.id as string])
  );

  const { data: existingProfiles } = await sb
    .from("sales_profiles")
    .select("id, name, employee_id, is_active, platform");

  // Prefer renaming active linkedin profiles to ZIP owner names
  for (const f of files) {
    const parsed = await parseZip(path.join(dir, f));
    const totals = sumMonths(parsed.months);
    const july = parsed.months.find((m) => m.period_year === 2026 && m.period_month === 7);
    const ref = LLM_REFERENCE[parsed.owner];

    console.log(`\n=== ${parsed.owner} (${parsed.filename}) ===`);
    console.log(
      `months=${parsed.months.length} july2026=`,
      july
        ? `invites=${july.invites_sent} conn=${july.connections_made} msgs=${july.messages_sent} fu=${july.follow_ups_sent} replies=${july.replies_received}`
        : "NONE"
    );
    console.log("parser all-time:", totals);
    if (ref) {
      console.log("LLM screenshot ref:", ref);
      console.log(
        `delta invites=${totals.invites - ref.invites} conn=${totals.conn - ref.conn} msgs=${totals.msgs - ref.msgs} fu=${totals.fu - ref.fu} replies=${totals.replies - ref.replies}`
      );
    }

    let profileId = matchSalesProfileId(parsed.owner, existingProfiles || []);
    let profile = (existingProfiles || []).find((p) => p.id === profileId);

    const lower = parsed.owner.toLowerCase();
    let handlerEmail: string | undefined;
    if (lower.includes("hafeez")) handlerEmail = HANDLERS.hafeez;
    else if (lower.includes("abdullah")) handlerEmail = HANDLERS.abdullah;
    else if (lower.includes("usama") || lower.includes("sam")) handlerEmail = HANDLERS.usama;
    else if (lower.includes("fiza")) handlerEmail = HANDLERS.fiza;
    else if (lower.includes("asim")) handlerEmail = HANDLERS.asim;

    const employeeId = handlerEmail ? empByEmail.get(handlerEmail) || null : null;

    if (!profile) {
      const { data: created, error } = await sb
        .from("sales_profiles")
        .insert({
          name: parsed.owner,
          employee_id: employeeId,
          platform: "linkedin",
          is_active: true,
        })
        .select("id, name, employee_id")
        .single();
      if (error || !created) {
        console.error("create profile failed", error?.message);
        continue;
      }
      profile = created;
      profileId = created.id;
      (existingProfiles || []).push({
        id: created.id,
        name: created.name,
        employee_id: created.employee_id,
        is_active: true,
        platform: "linkedin",
      });
      console.log("created profile", created.id);
    } else {
      await sb
        .from("sales_profiles")
        .update({
          name: parsed.owner,
          employee_id: employeeId || profile.employee_id,
          platform: "linkedin",
          is_active: true,
        })
        .eq("id", profile.id);
      profileId = profile.id;
      console.log("updated profile", profile.id);
    }

    // Replace prior imports for this profile (same as upload API)
    await sb.from("linkedin_imports").delete().eq("sales_profile_id", profileId);

    const { data: imp, error: impErr } = await sb
      .from("linkedin_imports")
      .insert({
        employee_id: employeeId,
        sales_profile_id: profileId,
        uploaded_by: employeeId,
        filename: parsed.filename,
        file_size: readFileSync(path.join(dir, f)).length,
        status: "completed",
        completed_at: new Date().toISOString(),
        is_partial: parsed.isPartial,
        owner_display_name: parsed.owner,
        datasets_detected: ["profile", "invitations", "connections", "messages"],
        summary: {
          total_connections: totals.conn,
          total_messages: totals.msgs,
          source: "scripts/import-linkedin-zips.ts",
        },
      })
      .select("id")
      .single();

    if (impErr) {
      console.error("import record failed", impErr.message);
    }

    const upsertPayload = parsed.months.map((row) => ({
      sales_profile_id: profileId!,
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
      import_id: imp?.id ?? null,
      synced_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await sb
      .from("linkedin_profile_period_stats")
      .upsert(upsertPayload, { onConflict: "sales_profile_id,period_year,period_month" });

    if (upsertErr) console.error("period upsert failed", upsertErr.message);
    else console.log(`upserted ${upsertPayload.length} month rows`);
  }

  // Deactivate stray linkedin profiles not in this import set
  const keepNames = new Set(Object.keys(LLM_REFERENCE).map((n) => n.toLowerCase()));
  keepNames.add("mehwish shafiq"); // keep even without zip for now
  const { data: all } = await sb
    .from("sales_profiles")
    .select("id, name, is_active, platform")
    .eq("is_active", true);
  for (const p of all || []) {
    if (p.platform && p.platform !== "linkedin") continue;
    const n = p.name.toLowerCase();
    const keep =
      keepNames.has(n) ||
      n.includes("mehwish") ||
      [...keepNames].some((k) => n.includes(k.split(" ")[0]));
    // only deactivate obvious extras like Fahad
    if (/fahad/i.test(p.name)) {
      await sb.from("sales_profiles").update({ is_active: false }).eq("id", p.id);
      console.log("deactivated", p.name);
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
