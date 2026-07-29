import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(
    "https://celsdouievgvgtdrgcgn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbHNkb3VpZXZndmd0ZHJnY2duIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3MjI4MywiZXhwIjoyMDk2NzQ4MjgzfQ.1Mp-Jlbp-6e7Cm-wwjqSSjYuhrC5BYTz72vm9A6xnFA"
  );

  const { data: employees } = await supabase.from("employees").select("id, email");

  const results: any[] = [];

  for (const emp of employees || []) {
    const { data: latestImport } = await supabase
      .from("linkedin_imports")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestImport) continue;

    const { data: inv, error: invErr } = await supabase
      .from("linkedin_invitations")
      .select("direction, first_name, last_name, invitation_date")
      .eq("import_id", latestImport.id)
      .limit(5);

    const { data: conn, error: connErr } = await supabase
      .from("linkedin_connections")
      .select("first_name, last_name, connected_on")
      .eq("import_id", latestImport.id)
      .limit(5);

    const { count: invCount } = await supabase
      .from("linkedin_invitations")
      .select("*", { count: "exact", head: true })
      .eq("import_id", latestImport.id);

    const { count: connCount } = await supabase
      .from("linkedin_connections")
      .select("*", { count: "exact", head: true })
      .eq("import_id", latestImport.id);

    results.push({
      employee: emp.email,
      import: { id: latestImport.id, filename: latestImport.filename },
      invCount,
      connCount,
      sampleInv: inv,
      sampleConn: conn,
      invError: invErr?.message,
      connError: connErr?.message,
    });
  }

  return NextResponse.json(results);
}
