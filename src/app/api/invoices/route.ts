import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const [{ data: invoices }, { data: projects }] = await Promise.all([
    admin.from("invoices").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("projects").select("id, name").order("name").limit(500),
  ]);
  return NextResponse.json({ invoices: invoices || [], projects: projects || [] });
}
