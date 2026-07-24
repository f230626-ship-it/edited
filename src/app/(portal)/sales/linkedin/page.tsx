import { redirect } from "next/navigation";
import { requireSalesAccess } from "@/lib/auth";
import { getLinkedInAnalytics } from "@/actions/linkedin";
import { LinkedInDashboard } from "@/components/linkedin/dashboard";
import { LinkedInUploadButton } from "@/components/linkedin/upload-button";

export default async function LinkedInAnalyticsPage() {
  const employee = await requireSalesAccess();
  
  // Get LinkedIn analytics data
  const analytics = await getLinkedInAnalytics(employee.id);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            LinkedIn Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered insights from your LinkedIn profile data
          </p>
        </div>
        
        <LinkedInUploadButton employeeId={employee.id} />
      </div>

      {/* Dashboard or Empty State */}
      {analytics ? (
        <LinkedInDashboard analytics={analytics} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-lg bg-muted/20">
          <svg
            className="w-16 h-16 text-muted-foreground/40 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">
            No LinkedIn Data Yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Upload your LinkedIn Data Export to unlock powerful AI-driven insights about your professional profile, career trajectory, skills, and network growth.
          </p>
          <LinkedInUploadButton employeeId={employee.id} />
        </div>
      )}
    </div>
  );
}
