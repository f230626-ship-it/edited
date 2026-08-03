/**
 * Compare July 2026 parser output to the July reference screenshot.
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import {
  detectDatasetType,
  parseCSV,
  parseInvitationsData,
  parseConnectionsData,
  parseMessagesData,
  detectPartialExport,
  extractOwnerDisplayName,
} from "../src/lib/linkedin/parser";
import {
  buildMonthlyPeriodStats,
  classifyMessagesByConversation,
} from "../src/lib/linkedin/period-rollup";

const JULY_REF: Record<
  string,
  { invites: number; accepted: number; msgs: number; replies: number; fuPerOpener: number }
> = {
  "Fiza S.": { invites: 858, accepted: 234, msgs: 1439, replies: 142, fuPerOpener: 4.6 },
  "M Usama (Sam)": { invites: 883, accepted: 190, msgs: 1017, replies: 97, fuPerOpener: 4.4 },
  "Abdullah S.": { invites: 933, accepted: 204, msgs: 1637, replies: 98, fuPerOpener: 6.4 },
  "Abdul Hafeez": { invites: 852, accepted: 156, msgs: 1223, replies: 78, fuPerOpener: 6.2 },
  "Asim A.": { invites: 794, accepted: 173, msgs: 779, replies: 95, fuPerOpener: 3.8 },
};

async function parseZip(filePath: string) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(readFileSync(filePath));
  const datasets: { type: string; data: Record<string, unknown>[]; bas: string }[] = [];

  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || !name.toLowerCase().endsWith(".csv")) continue;
    const bas = name.split("/").pop()?.split("\\").pop() || name;
    const type = detectDatasetType(bas);
    if (type === "unknown") continue;
    const text = await zip.files[name].async("text");
    datasets.push({ type, data: parseCSV(text), bas });
  }

  const profile = datasets.find((d) => d.type === "profile");
  const owner =
    extractOwnerDisplayName((profile?.data?.[0] as Record<string, unknown>) ?? null) ||
    path.basename(filePath);

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
  const july = months.find((m) => m.period_year === 2026 && m.period_month === 7);

  // Alternate July message counts for diagnosis
  const julyMsgs = parsedMsg.filter((m) => m.sent_at?.startsWith("2026-07"));
  const julyFromOwner = julyMsgs.filter((m) => m.is_from_owner);
  const julyNotOwner = julyMsgs.filter((m) => !m.is_from_owner);
  const classified = classifyMessagesByConversation(parsedMsg).filter((c) =>
    c.sent_at.startsWith("2026-07")
  );

  // Invitation notes as messages?
  const julyOutInv = parsedInv.filter(
    (i) => i.direction === "OUTGOING" && i.invitation_date?.startsWith("2026-07")
  );
  const julyInvWithMsg = julyOutInv.filter((i) => i.message && String(i.message).trim()).length;

  // Raw CSV July FROM counts using DATE column
  let rawJulyRows = 0;
  let rawJulyFromOwner = 0;
  if (messages) {
    for (const row of messages.data) {
      const date = String(row["DATE"] || row["Date"] || "");
      if (!date.includes("2026-07") && !/7\/\d{1,2}\/26/.test(date) && !/Jul 2026/i.test(date)) {
        // also ISO
        if (!/^2026-07/.test(date)) continue;
      }
      // LinkedIn message dates are "2026-07-22 11:48:20 UTC"
      if (!date.startsWith("2026-07")) continue;
      rawJulyRows++;
      const from = String(row["FROM"] || row["From"] || "");
      if (from.toLowerCase().includes(owner.split(" ")[0].toLowerCase())) rawJulyFromOwner++;
    }
  }

  return {
    owner,
    july,
    diag: {
      julyMsgRows: julyMsgs.length,
      julyFromOwner: julyFromOwner.length,
      julyNotOwner: julyNotOwner.length,
      classifiedInitial: classified.filter((c) => c.is_initial).length,
      classifiedFollowUp: classified.filter((c) => c.is_follow_up).length,
      classifiedReply: classified.filter((c) => c.is_reply).length,
      classifiedOutbound: classified.filter((c) => c.is_initial || c.is_follow_up).length,
      julyOutInv: julyOutInv.length,
      julyInvWithMsg,
      rawJulyRows,
      rawJulyFromOwner,
      totalMsgRows: messages?.data.length || 0,
      csvFiles: datasets.map((d) => `${d.bas}:${d.type}`),
    },
  };
}

async function main() {
  const dir = path.resolve("fixtures/linkedin-exports/complete-2026-08");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".zip"))) {
    const r = await parseZip(path.join(dir, f));
    const ref = JULY_REF[r.owner];
    console.log(`\n=== ${r.owner} ===`);
    console.log("parser July:", r.july);
    console.log("ref July:", ref);
    if (ref && r.july) {
      console.log("delta", {
        invites: r.july.invites_sent - ref.invites,
        accepted: r.july.connections_made - ref.accepted,
        msgs: r.july.messages_sent - ref.msgs,
        replies: r.july.replies_received - ref.replies,
      });
    }
    console.log("diag", r.diag);
  }
}

main().catch(console.error);
