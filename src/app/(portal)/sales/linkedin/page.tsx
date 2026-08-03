import { Suspense } from "react";
import { LinkedInSubnav } from "@/components/linkedin/linkedin-subnav";
import { LinkedInStatsDashboard } from "@/components/linkedin/linkedin-stats-dashboard";
import { getLinkedInOutreachData } from "@/actions/linkedin-outreach";
import { requireSalesAccess } from "@/lib/auth";

export default async function LinkedInAnalyticsPage() {
  await requireSalesAccess();
  const data = await getLinkedInOutreachData(undefined, "monthly", null);

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <LinkedInSubnav />
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading stats…</div>}>
        <LinkedInStatsDashboard initialData={data} />
      </Suspense>
    </div>
  );
}
