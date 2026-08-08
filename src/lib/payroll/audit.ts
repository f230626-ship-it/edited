import { createAdminClient } from "@/lib/supabase/admin";

export async function writePayrollAudit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("payroll_audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
    ip_address: params.ipAddress ?? null,
  });
  if (error) {
    console.error("[payroll-audit]", error.message);
  }
}
