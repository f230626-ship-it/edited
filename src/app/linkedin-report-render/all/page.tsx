import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AllProfilesDashboard } from "./all-profiles-dashboard";

const REPORT_SECRET = process.env.CRON_SECRET;

export default async function AllProfilesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string; month?: string; year?: string }>;
}) {
  const { secret, month: monthStr, year: yearStr } = await searchParams;

  if (!REPORT_SECRET || secret !== REPORT_SECRET) return notFound();

  const supabase = createAdminClient();
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
  const month = monthStr ? parseInt(monthStr) : new Date().getMonth() + 1;

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthLabel = `${monthNames[month - 1]} ${year}`;

  const { data: allProfiles } = await supabase
    .from("sales_profiles")
    .select("id, name, platform")
    .eq("is_active", true)
    .order("name");

  const linkedInProfiles = (allProfiles || []).filter(
    (p) => !p.platform || p.platform === "linkedin"
  );

  if (linkedInProfiles.length === 0) return notFound();

  const profileIds = linkedInProfiles.map((p) => p.id);

  const { data: stats } = await supabase
    .from("linkedin_profile_period_stats")
    .select("sales_profile_id, invites_sent, connections_made, acceptance_rate, messages_sent, initial_messages, follow_ups_sent, replies_received, reply_rate")
    .in("sales_profile_id", profileIds)
    .eq("period_year", year)
    .eq("period_month", month);

  const statsMap = new Map((stats || []).map((s) => [s.sales_profile_id, s]));

  const profiles = linkedInProfiles.map((p) => {
    const s = statsMap.get(p.id);
    return {
      profileId: p.id,
      name: p.name,
      invitesSent: s?.invites_sent ?? 0,
      connectionsMade: s?.connections_made ?? 0,
      acceptanceRate: Number(s?.acceptance_rate ?? 0),
      messagesSent: s?.messages_sent ?? 0,
      followUpsSent: s?.follow_ups_sent ?? 0,
      repliesReceived: s?.replies_received ?? 0,
      replyRate: Number(s?.reply_rate ?? 0),
    };
  });

  const totals = profiles.reduce(
    (acc, p) => ({
      invitesSent: acc.invitesSent + p.invitesSent,
      connectionsMade: acc.connectionsMade + p.connectionsMade,
      messagesSent: acc.messagesSent + p.messagesSent,
      followUpsSent: acc.followUpsSent + p.followUpsSent,
      repliesReceived: acc.repliesReceived + p.repliesReceived,
    }),
    { invitesSent: 0, connectionsMade: 0, messagesSent: 0, followUpsSent: 0, repliesReceived: 0 }
  );
  const acceptanceRate = totals.invitesSent > 0
    ? parseFloat(((totals.connectionsMade / totals.invitesSent) * 100).toFixed(1))
    : 0;
  const replyRate = totals.messagesSent > 0
    ? parseFloat(((totals.repliesReceived / totals.messagesSent) * 100).toFixed(1))
    : 0;

  return (
    <AllProfilesDashboard
      month={monthLabel}
      profiles={profiles}
      totals={{ ...totals, acceptanceRate, replyRate }}
    />
  );
}
