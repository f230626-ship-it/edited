import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee } from "@/lib/auth";

// ============================================================================
// GET /api/linkedin/debug
// Returns a full picture of what is stored in the DB for the current
// employee's latest LinkedIn import. Use this to verify the upload pipeline
// is working end-to-end without having to inspect Supabase Studio manually.
//
// Example: fetch('/api/linkedin/debug').then(r => r.json()).then(console.log)
// Or: open http://localhost:3000/api/linkedin/debug in the browser.
// ============================================================================

export async function GET() {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const employeeId = employee.id;

    // ── 1. All imports for this employee ─────────────────────────────────────
    const { data: imports } = await supabase
      .from("linkedin_imports")
      .select("id, filename, status, created_at, completed_at, datasets_detected, summary")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    if (!imports || imports.length === 0) {
      return NextResponse.json({
        employeeId,
        message: "No imports found for this employee",
        imports: [],
      });
    }

    const latest = imports[0];
    const importId = latest.id;

    // ── 2. Row counts for every linkedin_ table ───────────────────────────────
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

    // ── 3. Sample rows from key analytics tables ──────────────────────────────
    const [
      { data: invitationSample },
      { data: connectionSample },
    ] = await Promise.all([
      supabase
        .from("linkedin_invitations")
        .select("direction, invitation_date, first_name, last_name, message")
        .eq("import_id", importId)
        .order("created_at", { ascending: true })
        .limit(3),
      supabase
        .from("linkedin_connections")
        .select("first_name, last_name, connected_on, company, position")
        .eq("import_id", importId)
        .order("created_at", { ascending: true })
        .limit(3),
    ]);

    // ── 4. Date range diagnostics ─────────────────────────────────────────────
    const { data: invDateRange } = await supabase
      .from("linkedin_invitations")
      .select("invitation_date")
      .eq("import_id", importId)
      .not("invitation_date", "is", null)
      .order("invitation_date", { ascending: true })
      .limit(1);

    const { data: invDateRangeEnd } = await supabase
      .from("linkedin_invitations")
      .select("invitation_date")
      .eq("import_id", importId)
      .not("invitation_date", "is", null)
      .order("invitation_date", { ascending: false })
      .limit(1);

    const { data: nullInvDates } = await supabase
      .from("linkedin_invitations")
      .select("id", { count: "exact", head: true })
      .eq("import_id", importId)
      .is("invitation_date", null);

    const { data: connDateRange } = await supabase
      .from("linkedin_connections")
      .select("connected_on")
      .eq("import_id", importId)
      .not("connected_on", "is", null)
      .order("connected_on", { ascending: true })
      .limit(1);

    const { data: connDateRangeEnd } = await supabase
      .from("linkedin_connections")
      .select("connected_on")
      .eq("import_id", importId)
      .not("connected_on", "is", null)
      .order("connected_on", { ascending: false })
      .limit(1);

    return NextResponse.json({
      employeeId,
      allImports: imports,
      latestImport: {
        id: importId,
        filename: latest.filename,
        status: latest.status,
        createdAt: latest.created_at,
        completedAt: latest.completed_at,
        datasetsDetected: latest.datasets_detected,
        summary: latest.summary,
      },
      rowCounts: counts,
      analytics: {
        invitations: {
          total: counts["linkedin_invitations"],
          nullDates: (nullInvDates as any)?.count ?? "unknown",
          earliestDate: invDateRange?.[0]?.invitation_date ?? null,
          latestDate: invDateRangeEnd?.[0]?.invitation_date ?? null,
          sample: invitationSample ?? [],
          ACTION_REQUIRED: (counts["linkedin_invitations"] ?? 0) > 0 && !(invDateRange?.[0]?.invitation_date)
            ? "⚠️ Re-upload your LinkedIn ZIP — dates are null from old parser. New parser will fix this."
            : null,
        },
        connections: {
          total: counts["linkedin_connections"],
          earliestDate: connDateRange?.[0]?.connected_on ?? null,
          latestDate: connDateRangeEnd?.[0]?.connected_on ?? null,
          sample: connectionSample ?? [],
          ACTION_REQUIRED: (counts["linkedin_connections"] ?? 0) === 0
            ? "⚠️ No connections found. Re-upload your LinkedIn ZIP — new parser will detect Connections.csv."
            : null,
        },
      },
      diagnosis: {
        hasInvitations: (counts["linkedin_invitations"] ?? 0) > 0,
        hasConnections: (counts["linkedin_connections"] ?? 0) > 0,
        invitationsHaveDates:
          invDateRange && invDateRange.length > 0
            ? "YES — charts will populate"
            : "NO — invitation_date is null for all rows. RE-UPLOAD THE ZIP to fix.",
        connectionsHaveDates:
          connDateRange && connDateRange.length > 0
            ? "YES — charts will populate"
            : "NO — connected_on is null for all rows. RE-UPLOAD THE ZIP to fix.",
        nextStep: "Re-upload your LinkedIn ZIP export. The parser has been fixed and will correctly extract dates.",
      },
    });
  } catch (err: any) {
    console.error("[/api/linkedin/debug]", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
