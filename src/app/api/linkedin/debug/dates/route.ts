import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentEmployee } from "@/lib/auth";

export async function GET() {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createAdminClient();

  // Get latest import
  const { data: imp } = await supabase
    .from("linkedin_imports")
    .select("id, filename, completed_at")
    .eq("employee_id", employee.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!imp) return NextResponse.json({ error: "No import found" });

  // Sample first 5 invitation rows — show every column
  const { data: invSample } = await supabase
    .from("linkedin_invitations")
    .select("*")
    .eq("import_id", imp.id)
    .limit(5);

  // Count nulls vs non-nulls on invitation_date
  const { count: withDate } = await supabase
    .from("linkedin_invitations")
    .select("id", { count: "exact", head: true })
    .eq("import_id", imp.id)
    .not("invitation_date", "is", null);

  const { count: nullDate } = await supabase
    .from("linkedin_invitations")
    .select("id", { count: "exact", head: true })
    .eq("import_id", imp.id)
    .is("invitation_date", null);

  // Earliest and latest invitation dates
  const { data: earliest } = await supabase
    .from("linkedin_invitations")
    .select("invitation_date")
    .eq("import_id", imp.id)
    .not("invitation_date", "is", null)
    .order("invitation_date", { ascending: true })
    .limit(1);

  const { data: latest } = await supabase
    .from("linkedin_invitations")
    .select("invitation_date")
    .eq("import_id", imp.id)
    .not("invitation_date", "is", null)
    .order("invitation_date", { ascending: false })
    .limit(1);

  return NextResponse.json({
    import: imp,
    invitation_date_stats: {
      with_date: withDate,
      null_date: nullDate,
      earliest: earliest?.[0]?.invitation_date ?? null,
      latest: latest?.[0]?.invitation_date ?? null,
    },
    sample_rows: invSample,
    verdict: (withDate ?? 0) > 0
      ? `✅ ${withDate} invitations have dates — charts WILL populate`
      : `❌ All ${nullDate} invitations have null dates — parser still not extracting dates`,
  });
}
