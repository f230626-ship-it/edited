import { LinkedInSubnav } from "@/components/linkedin/linkedin-subnav";
import { LinkedInUploadButton } from "@/components/linkedin/upload-button";
import { getCurrentEmployee } from "@/lib/auth";
import { Upload, FileSpreadsheet, Shield } from "lucide-react";

export default async function LinkedInAnalyticsPage() {
  let employeeId = "demo-employee-id";
  try {
    const employee = await getCurrentEmployee();
    if (employee) {
      employeeId = employee.id;
    }
  } catch (e) {}

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <LinkedInSubnav />
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="border-b border-border/50 pb-6">
          <span className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase text-[#F59E0B]">
            LINKEDIN OUTREACH
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mt-0.5">
            Outreach Control Room
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Upload your LinkedIn data export to unlock outreach analytics and profile intelligence
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="p-6 sm:p-8 md:p-10 flex flex-col items-center text-center gap-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <Upload className="h-7 w-7 text-[#F59E0B]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Upload your LinkedIn data
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
                Download your LinkedIn data from{" "}
                <span className="font-mono text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-xs border border-border/40">
                  Settings &gt; Data Privacy &gt; Get a copy of your data
                </span>
                , then upload the ZIP file here to see your outreach metrics and profile insights.
              </p>
            </div>
            <LinkedInUploadButton employeeId={employeeId} />
          </div>
        </div>

        {/* How it works */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-sm text-foreground">1. Export from LinkedIn</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Request your LinkedIn data archive. Select the &quot;Connections&quot; and &quot;Invitations&quot; categories.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Upload className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-sm text-foreground">2. Upload the ZIP</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload the ZIP file you received from LinkedIn. We&apos;ll parse your connections, invitations, and profile data.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-sm text-foreground">3. View insights</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Go to the Profile Intelligence tab to see your outreach analytics, network growth, and recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
