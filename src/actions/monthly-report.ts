"use server";

/**
 * Admin-gated monthly LinkedIn report action.
 * Cron and other trusted callers use `runMonthlyReportGeneration` from lib directly.
 */

import { getCurrentEmployee, isSalesOwner } from "@/lib/auth";
import {
  runMonthlyReportGeneration,
  type MonthlyReportResult,
} from "@/lib/linkedin/monthly-report";

export type { MonthlyReportResult };

export async function generateAndSendMonthlyReport(
  force = false
): Promise<MonthlyReportResult> {
  const employee = await getCurrentEmployee();
  if (!employee || !isSalesOwner(employee.role)) {
    return {
      success: false,
      month: "",
      profilesIncluded: 0,
      alreadySent: false,
      error: "Only admins can generate the monthly report",
    };
  }

  return runMonthlyReportGeneration(force);
}
