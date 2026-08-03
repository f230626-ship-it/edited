import { readFileSync } from "fs";
import JSZip from "jszip";
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

async function smoke(path: string) {
  const buf = readFileSync(path);
  const zip = await JSZip.loadAsync(buf);
  const types: string[] = [];
  let invites: ReturnType<typeof parseInvitationsData> = [];
  let conns: ReturnType<typeof parseConnectionsData> = [];
  let msgs: ReturnType<typeof parseMessagesData> = [];
  let owner: string | null = null;

  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir || !name.toLowerCase().endsWith(".csv")) continue;
    const bas = name.split("/").pop()!;
    const type = detectDatasetType(bas);
    const data = parseCSV(await zip.files[name].async("text"));
    if (!data.length) continue;
    types.push(type);
    if (type === "profile") owner = extractOwnerDisplayName(data[0]);
    if (type === "invitations") invites = parseInvitationsData(data);
    if (type === "connections") conns = parseConnectionsData(data);
    if (type === "messages") msgs = parseMessagesData(data, owner ? [owner] : []);
  }

  const partial = detectPartialExport(types);
  const months = buildMonthlyPeriodStats({
    invitations: invites,
    connections: conns,
    messages: msgs,
    isPartial: partial,
  });

  console.log(
    JSON.stringify(
      {
        file: path.split("/").pop(),
        owner,
        types,
        partial,
        invitesOut: invites.filter((i) => i.direction === "OUTGOING").length,
        connections: conns.length,
        messages: msgs.length,
        months: months.length,
        sampleMonth: months.slice(-1)[0] || null,
      },
      null,
      2
    )
  );
}

async function main() {
  for (const f of [
    "fixtures/linkedin-exports/Basic_LinkedInDataExport_07-22-2026.zip (2).zip",
    "fixtures/linkedin-exports/Basic_LinkedInDataExport_07-22-2026.zip (1).zip",
    "fixtures/linkedin-exports/Basic_LinkedInDataExport_07-22-2026.zip.zip",
  ]) {
    await smoke(f);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
