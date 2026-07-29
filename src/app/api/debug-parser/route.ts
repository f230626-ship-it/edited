import { NextRequest, NextResponse } from "next/server";
import { parseCSV, detectDatasetType, parseInvitationsData, parseConnectionsData } from "@/lib/linkedin/parser";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { csvContent, filename } = await request.json();
  
  if (!csvContent) {
    return NextResponse.json({ error: "No csvContent provided" }, { status: 400 });
  }

  const type = detectDatasetType(filename || "Invitations.csv");
  const data = parseCSV(csvContent);
  
  let parsed: any[] = [];
  if (type === "invitations") {
    parsed = parseInvitationsData(data);
  } else if (type === "connections") {
    parsed = parseConnectionsData(data);
  }

  const sample = data[0] || {};
  const keys = Object.keys(sample);

  return NextResponse.json({
    type,
    headers: keys,
    rowCount: data.length,
    sampleRaw: sample,
    parsedSample: parsed[0] || null,
    parsedCount: parsed.length,
    parsedWithDates: type === "invitations" ? parsed.filter((p: any) => p.invitation_date).length : null,
  });
}
