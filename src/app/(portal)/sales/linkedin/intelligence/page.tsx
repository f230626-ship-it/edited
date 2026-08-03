import { redirect } from "next/navigation";

/** Legacy route — outreach stats now live on /sales/linkedin */
export default function LinkedInIntelligenceRedirect() {
  redirect("/sales/linkedin");
}
