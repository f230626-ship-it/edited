export const dynamic = "force-dynamic";

import { requireSalesAccess } from "@/lib/auth";
import { getLinkedInAnalytics } from "@/actions/linkedin";
import { ProfileIntelligenceDashboard } from "@/components/linkedin/profile-intelligence-dashboard";
import { LinkedInSubnav } from "@/components/linkedin/linkedin-subnav";

export default async function LinkedInIntelligencePage() {
  const employee = await requireSalesAccess();
  const analytics = await getLinkedInAnalytics(employee.id);

  const initialData = analytics
    ? {
        import: analytics.import,
        profile: analytics.profile ?? null,
        invitations: analytics.invitations ?? [],
        connections: analytics.connections ?? [],
      }
    : null;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <LinkedInSubnav />
      <ProfileIntelligenceDashboard
        employeeId={employee.id}
        initialData={initialData}
      />
    </div>
  );
}
