import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { AllStandupsList } from "@/components/performance/all-standups-list";

export const dynamic = "force-dynamic";

export default async function StandupsPage({ searchParams }: { searchParams: Promise<{ employee?: string }> }) {
  const { employee: employeeId } = await searchParams;
  await requireAuth();
  const supabase = createAdminClient();

  let standupQuery = supabase
    .from("standup_entries")
    .select("id, employee_id, slack_user_id, raw_text, completed, blockers, in_progress, performance_score, channel_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (employeeId) {
    standupQuery = standupQuery.eq("employee_id", employeeId);
  }

  // Run queries in parallel
  const [empRes, standupRes] = await Promise.all([
    supabase.from("employees").select("id, full_name, profile_photo_url, status"),
    standupQuery,
  ]);

  const { data: employees } = empRes;
  const { data: standups } = standupRes;

  const empMap = new Map<string, { name: string; photo: string | null }>();
  (employees || []).forEach((e) => {
    empMap.set(e.id, { name: e.full_name, photo: e.profile_photo_url });
  });

  const enriched = (standups || []).map((s) => {
    const emp = s.employee_id ? empMap.get(s.employee_id) : null;
    return {
      id: s.id,
      employee_name: emp?.name || "Unknown",
      employee_photo: emp?.photo || null,
      score: s.performance_score || 0,
      completed: s.completed || [],
      blockers: s.blockers || [],
      in_progress: s.in_progress || [],
      raw_text: s.raw_text || "",
      channel_id: s.channel_id || "",
      date: new Date(s.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });

  const devCount = enriched.filter((s) => s.channel_id === "C0ABTT2V884").length;
  const salesCount = enriched.filter((s) => s.channel_id === "C0AUWEKB882").length;

  const filteredEmployee = employeeId ? employees?.find((e) => e.id === employeeId) : null;
  const title = filteredEmployee ? `${filteredEmployee.full_name}'s Stand-ups` : "All Stand-ups";

  return (
    <AllStandupsList
      standups={enriched}
      totalCount={enriched.length}
      devCount={devCount}
      salesCount={salesCount}
      title={title}
      backHref={employeeId ? `/performance/employee/${employeeId}` : "/performance"}
    />
  );
}
