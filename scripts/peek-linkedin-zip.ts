import { readFileSync } from "fs";
import {
  parseCSV,
  parseInvitationsData,
  parseConnectionsData,
  parseMessagesData,
  extractOwnerDisplayName,
  detectDatasetType,
} from "../src/lib/linkedin/parser";

async function peek(zipPath: string) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(readFileSync(zipPath));
  let inv: ReturnType<typeof parseInvitationsData> = [];
  let conn: ReturnType<typeof parseConnectionsData> = [];
  let msgs: ReturnType<typeof parseMessagesData> = [];
  let owner = "";
  let rawMsgCount = 0;

  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || !name.toLowerCase().endsWith(".csv")) continue;
    const bas = name.split("/").pop()!;
    const type = detectDatasetType(bas);
    const data = parseCSV(await zip.files[name].async("text"));
    if (type === "profile") owner = extractOwnerDisplayName(data[0]) || "";
    if (type === "invitations") inv = parseInvitationsData(data);
    if (type === "connections") conn = parseConnectionsData(data);
    if (type === "messages") {
      rawMsgCount = data.length;
      msgs = parseMessagesData(data, [owner]);
    }
  }

  const dirs: Record<string, number> = {};
  for (const i of inv) dirs[i.direction || "NULL"] = (dirs[i.direction || "NULL"] || 0) + 1;
  const fromOwner = msgs.filter((m) => m.is_from_owner).length;
  const notOwner = msgs.length - fromOwner;
  const withDate = msgs.filter((m) => m.sent_at).length;

  console.log(JSON.stringify({
    owner,
    inv: inv.length,
    dirs,
    conn: conn.length,
    rawMsgCount,
    parsedMsgs: msgs.length,
    fromOwner,
    notOwner,
    withDate,
    sampleFrom: [...new Set(msgs.slice(0, 50).map((m) => m.from_name))].slice(0, 10),
    sampleOwnerFlags: msgs.slice(0, 5).map((m) => ({
      from: m.from_name,
      is_from_owner: m.is_from_owner,
      sent_at: m.sent_at,
    })),
  }, null, 2));
}

peek("fixtures/linkedin-exports/complete-2026-08/fiza-s.zip").catch(console.error);
