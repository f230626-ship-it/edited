import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ReportDashboard } from "./report-dashboard";

const REPORT_SECRET = process.env.CRON_SECRET || "linkedin-cron-secret-2026";

export default async function ReportRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ secret?: string; month?: string; year?: string }>;
}) {
  const { profileId } = await params;
  const { secret, month: monthStr, year: yearStr } = await searchParams;

  if (secret !== REPORT_SECRET) return notFound();

  const supabase = createAdminClient();
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
  const month = monthStr ? parseInt(monthStr) : new Date().getMonth() + 1;

  const { data: profile } = await supabase
    .from("sales_profiles")
    .select("id, name")
    .eq("id", profileId)
    .single();

  if (!profile) return notFound();

  const { data: stat } = await supabase
    .from("linkedin_profile_period_stats")
    .select("invites_sent, connections_made, acceptance_rate, messages_sent, initial_messages, follow_ups_sent, replies_received, reply_rate")
    .eq("sales_profile_id", profileId)
    .eq("period_year", year)
    .eq("period_month", month)
    .single();

  const data = {
    profileName: profile.name,
    month: `${["January","February","March","April","May","June","July","August","September","October","November","December"][month - 1]} ${year}`,
    invitesSent: stat?.invites_sent ?? 0,
    connectionsMade: stat?.connections_made ?? 0,
    acceptanceRate: Number(stat?.acceptance_rate ?? 0),
    messagesSent: stat?.messages_sent ?? 0,
    followUpsSent: stat?.follow_ups_sent ?? 0,
    repliesReceived: stat?.replies_received ?? 0,
    replyRate: Number(stat?.reply_rate ?? 0),
  };

  return <ReportDashboard data={data} />;
}
