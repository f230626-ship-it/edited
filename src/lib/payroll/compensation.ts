/**
 * Resolve compensation version effective on a given date.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { EmployeeCompensation } from "@/types/database";

export async function getCompensationForDate(
  employeeId: string,
  onDate: string
): Promise<EmployeeCompensation | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("employee_compensation")
    .select("*")
    .eq("employee_id", employeeId)
    .lte("effective_from", onDate)
    .or(`effective_until.is.null,effective_until.gte.${onDate}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[compensation]", error.message);
    return null;
  }
  return data as EmployeeCompensation | null;
}

export function monthBounds(year: number, month: number): {
  start: string;
  end: string;
  label: string;
} {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const label = start.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${label} Payroll`,
  };
}
