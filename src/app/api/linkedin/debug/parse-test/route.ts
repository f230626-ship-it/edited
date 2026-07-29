import { NextRequest, NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/auth";
import { parseCSV, parseInvitationsData, parseConnectionsData, normalizeDate } from "@/lib/linkedin/parser";

// ============================================================================
// GET /api/linkedin/debug/parse-test
// Tests the CSV parser against a hardcoded sample that matches LinkedIn's
// real Invitations.csv format. Confirms the parser produces valid dates
// before asking user to re-upload.
// ============================================================================

export async function GET(_req: NextRequest) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── Test 1: Invitations.csv — newer format (2023+) ─────────────────────────
  // Real LinkedIn Invitations.csv format:
  //   From,To,Sent At,Message,Direction
  //   "John Doe","Jane Smith","07/22/2026 04:02","Hi Jane","SENT"
  const invCsvNewer = `From,To,Sent At,Message,Direction
"Techverx HR","Abdullah S.","07/22/2026 04:02","","INCOMING"
"Abdullah S.","Umer Sadiq","07/20/2026 10:15","Hi Umer, let's connect","SENT"
"Muhammad Ali","Abdullah S.","07/18/2026 09:00","","INCOMING"`;

  // ── Test 2: Invitations.csv — with preamble (older LinkedIn export) ────────
  const invCsvWithPreamble = `Notes: LinkedIn Member Invitations Data
To protect member privacy some invitation details have been omitted.

From,To,Sent At,Message,Direction
"Techverx HR","Abdullah S.","07/22/2026 04:02","","INCOMING"
"Abdullah S.","Umer Sadiq","07/20/2026 10:15","Hi","SENT"`;

  // ── Test 3: Connections.csv — real LinkedIn format ─────────────────────────
  // LinkedIn Connections.csv actual structure:
  // Line 1: "First Name,Last Name,URL,Email Address,Company,Position,Connected On"  ← REAL HEADER
  // Line 2: note text
  // Line 3: note text  
  // Line 4: blank or note
  // Line 5+: data rows  (NO repeated header in newer exports)
  //
  // Older exports repeated the header after the notes. Both must work.
  const connCsvWithPreamble = `First Name,Last Name,URL,Email Address,Company,Position,Connected On
Notes: You can remove connections from your connections list by going here: https://www.linkedin.com/mynetwork/invite-connect/connections/
You can also download your connections in CSV format from https://www.linkedin.com/psettings/member-data

Ali,Khan,https://linkedin.com/in/alikhan,,Techverx,Engineer,22 Jul 2026
Sara,Ahmed,https://linkedin.com/in/saraahmed,,Google,PM,20 Jul 2026`;

  // ── Test 4: Date format variants ───────────────────────────────────────────
  const dateTests = [
    "07/22/2026 04:02",   // LinkedIn newer datetime
    "07/22/2026",          // slash date
    "22 Jul 2026",         // DD Mon YYYY
    "Jul 22, 2026",        // Mon DD, YYYY
    "2026-07-22",          // ISO
    "2026-07-22T04:02:00Z",// ISO with time
    "July 2026",           // Month YYYY
    "2026",                // year only
  ];

  const parsedRows1 = parseCSV(invCsvNewer);
  const parsedRows2 = parseCSV(invCsvWithPreamble);
  const parsedRows3 = parseCSV(connCsvWithPreamble);

  const inv1 = parseInvitationsData(parsedRows1);
  const inv2 = parseInvitationsData(parsedRows2);
  const conn3 = parseConnectionsData(parsedRows3);

  return NextResponse.json({
    test1_invitations_newer_format: {
      rawParsedHeaders: parsedRows1.length > 0 ? Object.keys(parsedRows1[0]) : [],
      rows: parsedRows1,
      afterInvitationsParser: inv1,
      datesExtracted: inv1.map((r: any) => r.invitation_date),
      pass: inv1.every((r: any) => r.invitation_date !== null),
    },
    test2_invitations_with_preamble: {
      rawParsedHeaders: parsedRows2.length > 0 ? Object.keys(parsedRows2[0]) : [],
      rows: parsedRows2,
      afterInvitationsParser: inv2,
      datesExtracted: inv2.map((r: any) => r.invitation_date),
      pass: inv2.every((r: any) => r.invitation_date !== null),
    },
    test3_connections_with_preamble: {
      rawParsedHeaders: parsedRows3.length > 0 ? Object.keys(parsedRows3[0]) : [],
      rows: parsedRows3,
      afterConnectionsParser: conn3,
      datesExtracted: conn3.map((r: any) => r.connected_on),
      pass: conn3.every((r: any) => r.connected_on !== null),
    },
    test4_date_normalizer: dateTests.map((d) => ({
      input: d,
      output: normalizeDate(d),
      pass: normalizeDate(d) !== null,
    })),
    overallPass:
      inv1.every((r: any) => r.invitation_date !== null) &&
      inv2.every((r: any) => r.invitation_date !== null) &&
      conn3.every((r: any) => r.connected_on !== null),
  });
}
