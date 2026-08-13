/**
 * Monthly LinkedIn Report — core pipeline (not a server action).
 * Collect stats → satori/resvg PNG cards → PDF → email admin.
 * Safe for Vercel (no Puppeteer / local Chrome).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { generateStatPng } from "@/lib/linkedin/generate-stat-png";
import { currentKarachiYearMonth } from "@/lib/linkedin/reminder-schedule";

export interface MonthlyReportResult {
  success: boolean;
  month: string;
  profilesIncluded: number;
  alreadySent: boolean;
  error?: string;
}

function monthName(year: number, month: number): string {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[month - 1]} ${year}`;
}

async function collectMonthStats(
  supabase: ReturnType<typeof createAdminClient>,
  year: number,
  month: number
) {
  const { data: allProfiles, error: profilesError } = await supabase
    .from("sales_profiles")
    .select("id, name, platform")
    .eq("is_active", true);

  if (profilesError) throw new Error(`Failed to load profiles: ${profilesError.message}`);
  if (!allProfiles || allProfiles.length === 0) {
    return { profiles: [], uploadedCount: 0, totalActiveCount: 0, allUploaded: false };
  }

  const linkedInProfiles = allProfiles.filter(
    (p) => !p.platform || p.platform === "linkedin"
  );
  if (linkedInProfiles.length === 0) {
    return { profiles: [], uploadedCount: 0, totalActiveCount: 0, allUploaded: false };
  }

  const { data: stats } = await supabase
    .from("linkedin_profile_period_stats")
    .select(
      "sales_profile_id, invites_sent, connections_made, acceptance_rate, messages_sent, initial_messages, follow_ups_sent, replies_received, reply_rate"
    )
    .eq("period_year", year)
    .eq("period_month", month);

  const statsMap = new Map((stats || []).map((s) => [s.sales_profile_id, s]));
  const uploadedCount = linkedInProfiles.filter((p) => statsMap.has(p.id)).length;
  const totalActiveCount = linkedInProfiles.length;
  const allUploaded = totalActiveCount > 0 && uploadedCount === totalActiveCount;

  const profiles = linkedInProfiles.map((p) => {
    const s = statsMap.get(p.id);
    return {
      profileId: p.id,
      profileName: p.name,
      hasUploaded: statsMap.has(p.id),
      invitesSent: s?.invites_sent ?? 0,
      connectionsMade: s?.connections_made ?? 0,
      acceptanceRate: Number(s?.acceptance_rate ?? 0),
      messagesSent: s?.messages_sent ?? 0,
      followUpsSent: s?.follow_ups_sent ?? 0,
      repliesReceived: s?.replies_received ?? 0,
      replyRate: Number(s?.reply_rate ?? 0),
    };
  });

  return { profiles, uploadedCount, totalActiveCount, allUploaded };
}

async function generateScreenshots(
  profiles: Awaited<ReturnType<typeof collectMonthStats>>["profiles"],
  monthLabel: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!profiles.length) return result;

  for (const p of profiles) {
    try {
      const png = await generateStatPng(
        p.profileName,
        {
          invitesSent: p.invitesSent,
          connectionsMade: p.connectionsMade,
          acceptanceRate: p.acceptanceRate,
          messagesSent: p.messagesSent,
          followUpsSent: p.followUpsSent,
          repliesReceived: p.repliesReceived,
          replyRate: p.replyRate,
        },
        monthLabel
      );
      result.set(p.profileId, png.toString("base64"));
    } catch (err) {
      console.error(`[monthly-report] PNG failed for ${p.profileName}:`, err);
    }
  }

  // Combined "All profiles" card from totals
  try {
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
    const acceptanceRate =
      totals.invitesSent > 0
        ? parseFloat(((totals.connectionsMade / totals.invitesSent) * 100).toFixed(1))
        : 0;
    const replyRate =
      totals.messagesSent > 0
        ? parseFloat(((totals.repliesReceived / totals.messagesSent) * 100).toFixed(1))
        : 0;
    const png = await generateStatPng(
      `All profiles (${profiles.length})`,
      { ...totals, acceptanceRate, replyRate },
      monthLabel
    );
    result.set("__all_profiles__", png.toString("base64"));
  } catch (err) {
    console.error("[monthly-report] All-profiles PNG failed:", err);
  }

  return result;
}

async function buildPdf(
  profiles: Awaited<ReturnType<typeof collectMonthStats>>["profiles"],
  screenshots: Map<string, string>,
  month: string,
  generatedAt: string
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { ReportPdf } = await import("@/lib/linkedin/report-pdf");
  const React = await import("react");

  const totals = profiles.reduce(
    (acc, p) => ({
      invitesSent: acc.invitesSent + p.invitesSent,
      connectionsMade: acc.connectionsMade + p.connectionsMade,
      messagesSent: acc.messagesSent + p.messagesSent,
      followUpsSent: acc.followUpsSent + p.followUpsSent,
      repliesReceived: acc.repliesReceived + p.repliesReceived,
      acceptanceRate: 0,
      replyRate: 0,
    }),
    {
      invitesSent: 0,
      connectionsMade: 0,
      messagesSent: 0,
      followUpsSent: 0,
      repliesReceived: 0,
      acceptanceRate: 0,
      replyRate: 0,
    }
  );
  totals.acceptanceRate =
    totals.invitesSent > 0
      ? parseFloat(((totals.connectionsMade / totals.invitesSent) * 100).toFixed(1))
      : 0;
  totals.replyRate =
    totals.messagesSent > 0
      ? parseFloat(((totals.repliesReceived / totals.messagesSent) * 100).toFixed(1))
      : 0;

  const profileData = profiles.map((p) => ({
    ...p,
    statCardBase64: screenshots.get(p.profileId) ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportPdf as any, {
    month,
    generatedAt,
    profiles: profileData,
    totals,
    allProfilesScreenshot: screenshots.get("__all_profiles__") ?? null,
  });

  return Buffer.from(await renderToBuffer(element));
}

/** Core orchestrator — used by cron and authenticated admin action only.
 *  Optional year/month override for one-time test execution. */
export async function runMonthlyReportGeneration(
  force = false,
  overrideYear?: number,
  overrideMonth?: number
): Promise<MonthlyReportResult> {
  const supabase = createAdminClient();
  const hasOverride = !!overrideYear && !!overrideMonth;
  let { year, month } = hasOverride
    ? { year: overrideYear!, month: overrideMonth! }
    : currentKarachiYearMonth(new Date());
  let label = monthName(year, month);
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return {
      success: false,
      month: label,
      profilesIncluded: 0,
      alreadySent: false,
      error: "ADMIN_EMAIL env var not set",
    };
  }

  if (!force) {
    const { data: existing } = await supabase
      .from("monthly_report_log")
      .select("id, status")
      .eq("period_year", year)
      .eq("period_month", month)
      .eq("status", "sent")
      .maybeSingle();

    if (existing) {
      return { success: true, month: label, profilesIncluded: 0, alreadySent: true };
    }
  }

  let monthData = await collectMonthStats(supabase, year, month);
  const hasData =
    monthData &&
    monthData.profiles.some((s) => s.invitesSent > 0 || s.connectionsMade > 0 || s.messagesSent > 0);
  // Skip fallback when override is provided — test must be deterministic
  if (!hasOverride && !hasData) {
    const { data: latestStat } = await supabase
      .from("linkedin_profile_period_stats")
      .select("period_year, period_month")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestStat) {
      year = latestStat.period_year;
      month = latestStat.period_month;
      label = monthName(year, month);
      monthData = await collectMonthStats(supabase, year, month);
    }
  }

  const { profiles, uploadedCount, totalActiveCount, allUploaded } = monthData;

  // Enforce requirement: Send report to admin ONLY when ALL active profiles have uploaded current month data
  if (!force && !allUploaded) {
    return {
      success: true,
      month: label,
      profilesIncluded: uploadedCount,
      alreadySent: false,
      error: undefined,
    };
  }

  await supabase.from("monthly_report_log").upsert(
    {
      period_year: year,
      period_month: month,
      status: "pending",
      admin_email: adminEmail,
      report_sent_at: null,
    },
    { onConflict: "period_year,period_month" }
  );

  try {
    if (!profiles || profiles.length === 0) {
      await supabase
        .from("monthly_report_log")
        .update({ status: "skipped", error: "No stats available for this month" })
        .eq("period_year", year)
        .eq("period_month", month);
      return {
        success: false,
        month: label,
        profilesIncluded: 0,
        alreadySent: false,
        error: "No LinkedIn stats uploaded for this month yet.",
      };
    }

    const screenshots = await generateScreenshots(profiles, label);
    const pdfBuffer = await buildPdf(profiles, screenshots, label, new Date().toISOString());
    const pdfBase64 = pdfBuffer.toString("base64");

    const totalInvites = profiles.reduce((s, p) => s + p.invitesSent, 0);
    const totalConns = profiles.reduce((s, p) => s + p.connectionsMade, 0);
    const totalMsgs = profiles.reduce((s, p) => s + p.messagesSent, 0);
    const totalReplies = profiles.reduce((s, p) => s + p.repliesReceived, 0);
    const overallAcceptance =
      totalInvites > 0 ? ((totalConns / totalInvites) * 100).toFixed(1) : "0.0";
    const overallReply =
      totalMsgs > 0 ? ((totalReplies / totalMsgs) * 100).toFixed(1) : "0.0";

    const emailText = [
      `LinkedIn Monthly Report — ${label}`,
      ``,
      `Hi Admin,`,
      ``,
      `Please find the LinkedIn outreach report for ${label} attached.`,
      ``,
      `SUMMARY (${profiles.length} profile${profiles.length !== 1 ? "s" : ""})`,
      `Invites Sent:     ${totalInvites}`,
      `Connections Made: ${totalConns}`,
      `Acceptance Rate:  ${overallAcceptance}%`,
      `Messages Sent:    ${totalMsgs}`,
      `Replies Received: ${totalReplies}`,
      `Reply Rate:       ${overallReply}%`,
      ``,
      `MindVista HRMS · Auto-generated`,
    ].join("\n");

    const emailHtml = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111;max-width:600px">
        <div style="background:#0f172a;padding:20px 24px;border-radius:10px 10px 0 0">
          <h2 style="color:#f59e0b;margin:0;font-size:18px">LinkedIn Monthly Report</h2>
          <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">${label}</p>
        </div>
        <div style="background:#1e293b;padding:20px 24px;border-radius:0 0 10px 10px;color:#e2e8f0">
          <p>Hi Admin,</p>
          <p>The LinkedIn outreach report for <strong>${label}</strong> is ready. Full stats are in the attached PDF.</p>
          <div style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#94a3b8;font-size:12px;margin:0 0 10px;font-weight:600">COMBINED SUMMARY — ${profiles.length} PROFILE${profiles.length !== 1 ? "S" : ""}</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="color:#94a3b8;padding:4px 0">Invites Sent</td><td style="color:#f59e0b;font-weight:700;text-align:right">${totalInvites}</td></tr>
              <tr><td style="color:#94a3b8;padding:4px 0">Connections Made</td><td style="color:#0d9488;font-weight:700;text-align:right">${totalConns}</td></tr>
              <tr><td style="color:#94a3b8;padding:4px 0">Acceptance Rate</td><td style="color:#10b981;font-weight:700;text-align:right">${overallAcceptance}%</td></tr>
              <tr><td style="color:#94a3b8;padding:4px 0">Messages Sent</td><td style="color:#8b5cf6;font-weight:700;text-align:right">${totalMsgs}</td></tr>
              <tr><td style="color:#94a3b8;padding:4px 0">Replies Received</td><td style="color:#ec4899;font-weight:700;text-align:right">${totalReplies}</td></tr>
              <tr><td style="color:#94a3b8;padding:4px 0">Reply Rate</td><td style="color:#f43f5e;font-weight:700;text-align:right">${overallReply}%</td></tr>
            </table>
          </div>
          <p style="font-size:11px;color:#475569">MindVista HRMS · Auto-generated report · Confidential</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: adminEmail,
      subject: `LinkedIn Monthly Report — ${label}`,
      text: emailText,
      html: emailHtml,
      attachments: [
        {
          name: `linkedin-report-${year}-${String(month).padStart(2, "0")}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    if (!emailResult.ok) {
      throw new Error(`Email failed: ${emailResult.error}`);
    }

    await supabase
      .from("monthly_report_log")
      .update({
        status: "sent",
        profiles_count: profiles.length,
        report_sent_at: new Date().toISOString(),
      })
      .eq("period_year", year)
      .eq("period_month", month);

    return {
      success: true,
      month: label,
      profilesIncluded: profiles.length,
      alreadySent: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[monthly-report] Error:", msg);
    await supabase
      .from("monthly_report_log")
      .update({ status: "failed", error: msg })
      .eq("period_year", year)
      .eq("period_month", month);
    return {
      success: false,
      month: label,
      profilesIncluded: 0,
      alreadySent: false,
      error: msg,
    };
  }
}
