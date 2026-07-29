import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee } from "@/lib/auth";
import {
  parseCSV,
  detectDatasetType,
  parseInvitationsData,
  parseConnectionsData,
} from "@/lib/linkedin/parser";
import {
  aggregateInvitations,
  aggregateConnections,
  mergePeriodMetrics,
  computeKpis,
} from "@/lib/linkedin/outreach-metrics";

// ============================================================================
// GET /api/linkedin/debug-pipeline
//
// Full end-to-end pipeline diagnostic. Returns:
//  1. Latest import metadata
//  2. Row counts in every linkedin_* table
//  3. Sample invitation rows with date parsing verification
//  4. Sample connection rows with date parsing verification
//  5. Computed KPIs from DB data (what the dashboard will show)
//  6. Parser self-test — re-parses a mini CSV to verify no regressions
//
// Usage: fetch('/api/linkedin/debug-pipeline').then(r => r.json()).then(console.log)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const employeeId = employee.id;

    // ── 1. Latest import ─────────────────────────────────────────────────────
    const { data: importRow, error: importErr } = await supabase
      .from("linkedin_imports")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (importErr || !importRow) {
      return NextResponse.json({
        employeeId,
        stage: "IMPORT",
        status: "NO_IMPORT",
        message: "No completed LinkedIn import found for this employee. Upload a ZIP first.",
        rawError: importErr?.message ?? null,
      });
    }

    const importId = importRow.id;

    // ── 2. Row counts ─────────────────────────────────────────────────────────
    const tables = [
      "linkedin_profiles",
      "linkedin_positions",
      "linkedin_skills",
      "linkedin_endorsements",
      "linkedin_projects",
      "linkedin_education",
      "linkedin_certifications",
      "linkedin_invitations",
      "linkedin_connections",
      "linkedin_company_follows",
      "linkedin_learning",
      "linkedin_events",
      "linkedin_job_applications",
      "linkedin_rich_media",
    ] as const;

    const counts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (table) => {
        const { count } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("import_id", importId);
        counts[table] = count ?? 0;
      })
    );

    // ── 3. Invitations detail ────────────────────────────────────────────────
    const { data: allInvitations, error: invErr } = await supabase
      .from("linkedin_invitations")
      .select("direction, invitation_date, first_name, last_name, message")
      .eq("import_id", importId)
      .order("invitation_date", { ascending: false, nullsFirst: false });

    const invTotal = allInvitations?.length ?? 0;
    const invOutgoing = allInvitations?.filter(i => i.direction === "OUTGOING").length ?? 0;
    const invWithDates = allInvitations?.filter(i => i.invitation_date).length ?? 0;
    const invNullDates = invTotal - invWithDates;
    const invSample = (allInvitations ?? []).slice(0, 5);

    // ── 4. Connections detail ────────────────────────────────────────────────
    const { data: allConnections, error: connErr } = await supabase
      .from("linkedin_connections")
      .select("first_name, last_name, connected_on, company, position")
      .eq("import_id", importId)
      .order("connected_on", { ascending: false, nullsFirst: false });

    const connTotal = allConnections?.length ?? 0;
    const connWithDates = allConnections?.filter(c => c.connected_on).length ?? 0;
    const connNullDates = connTotal - connWithDates;
    const connSample = (allConnections ?? []).slice(0, 5);

    // ── 5. Computed KPIs from DB data ─────────────────────────────────────────
    const invRows = (allInvitations ?? []).map(i => ({
      direction: i.direction,
      invitation_date: i.invitation_date ?? null,
    }));
    const connRows = (allConnections ?? []).map(c => ({
      connected_on: c.connected_on ?? null,
    }));

    const invMetrics = aggregateInvitations(invRows, "quarterly");
    const connMetrics = aggregateConnections(connRows, "quarterly");
    const chartData = mergePeriodMetrics(invMetrics, connMetrics);
    const kpis = computeKpis(chartData);

    // ── 6. Parser self-test ───────────────────────────────────────────────────
    const testInvitationsCsv = `From,To,Sent At,Message,Direction
Test User,You,07/15/2025 10:30,Hello there: how are you?,SENT
Another Person,You,06/20/2025 09:15,Meeting request: can we talk?,SENT
Incoming User,You,05/10/2025 08:00,,RECEIVED`;

    const testConnectionsCsv = `Note: member connections
First Name,Last Name,URL,Email Address,Company,Position,Connected On
Jane,Doe,https://linkedin.com/in/jane,,Acme Corp,Engineer,15 Jan 2025
John,Smith,https://linkedin.com/in/john,,Globex,Manager,20 Feb 2025`;

    const parsedInvTest = parseCSV(testInvitationsCsv);
    const parsedConnTest = parseCSV(testConnectionsCsv);
    const invParsed = parseInvitationsData(parsedInvTest);
    const connParsed = parseConnectionsData(parsedConnTest);

    // ── 7. Diagnosis ─────────────────────────────────────────────────────────
    const chartWillPopulate = chartData.length > 0 && (invMetrics.length > 0 || connMetrics.length > 0);
    const issues: string[] = [];

    if (invTotal === 0) issues.push("❌ No invitations in DB — check that Invitations.csv was in the ZIP");
    if (connTotal === 0) issues.push("❌ No connections in DB — check that Connections.csv was in the ZIP");
    if (invTotal > 0 && invWithDates === 0) issues.push("⚠️ Invitations exist but ALL have null dates — re-upload ZIP with new parser");
    if (connTotal > 0 && connWithDates === 0) issues.push("⚠️ Connections exist but ALL have null dates — re-upload ZIP with new parser");
    if (invOutgoing === 0 && invTotal > 0) issues.push("⚠️ All invitations are INCOMING — invitesSent KPI will be 0 (expected if you only receive invites)");
    if (!chartWillPopulate && (invTotal > 0 || connTotal > 0)) issues.push("❌ Chart data is empty despite having DB rows — date parsing issue");
    if (parsedInvTest.length !== 3) issues.push(`❌ Parser self-test FAILED: expected 3 invitation rows, got ${parsedInvTest.length}`);
    if (parsedConnTest.length !== 2) issues.push(`❌ Parser self-test FAILED: expected 2 connection rows, got ${parsedConnTest.length}`);
    if (parsedInvTest.length === 3) issues.push("✅ Parser self-test PASSED: 3/3 invitation rows parsed correctly");
    if (parsedConnTest.length === 2) issues.push("✅ Parser self-test PASSED: 2/2 connection rows parsed correctly (preamble skipped)");

    return NextResponse.json({
      employeeId,
      import: {
        id: importId,
        filename: importRow.filename,
        status: importRow.status,
        createdAt: importRow.created_at,
        completedAt: importRow.completed_at,
        datasetsDetected: importRow.datasets_detected,
        summary: importRow.summary,
      },
      rowCounts: counts,
      invitations: {
        total: invTotal,
        outgoing: invOutgoing,
        incoming: invTotal - invOutgoing,
        withDates: invWithDates,
        nullDates: invNullDates,
        sample: invSample,
        error: invErr?.message ?? null,
      },
      connections: {
        total: connTotal,
        withDates: connWithDates,
        nullDates: connNullDates,
        sample: connSample,
        error: connErr?.message ?? null,
      },
      computedAnalytics: {
        invitationPeriodsGenerated: invMetrics.length,
        connectionPeriodsGenerated: connMetrics.length,
        mergedPeriods: chartData.length,
        chartData: chartData.slice(0, 10),
        kpis,
        chartWillPopulate,
      },
      parserSelfTest: {
        invitationsInput: testInvitationsCsv.split("\n").length - 1 + " lines",
        invitationsParsedRaw: parsedInvTest.length,
        invitationsParsedFinal: invParsed.length,
        invParsedSample: invParsed,
        connectionsInput: testConnectionsCsv.split("\n").length - 1 + " lines (with preamble)",
        connectionsParsedRaw: parsedConnTest.length,
        connectionsParsedFinal: connParsed.length,
        connParsedSample: connParsed,
      },
      diagnosis: issues,
    });
  } catch (err: any) {
    console.error("[/api/linkedin/debug-pipeline]", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error", stack: err?.stack },
      { status: 500 }
    );
  }
}
