import { getLinkedInOutreachData } from "@/actions/linkedin-outreach";
import { OutreachControlRoom } from "@/components/linkedin/outreach-control-room";

// Public preview page - no auth required
export default async function OutreachPreviewPage() {
  const outreachData = await getLinkedInOutreachData("abdullah-s", "quarterly");

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <OutreachControlRoom
        initialData={outreachData}
        employeeId={undefined}
      />
    </div>
  );
}
