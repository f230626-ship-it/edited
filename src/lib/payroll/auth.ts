/**
 * Payroll auth helpers — admin only (salary data is highly sensitive).
 */

import { getCurrentEmployee, requireAuth } from "@/lib/auth";
import type { Employee } from "@/types/database";
import { redirect } from "next/navigation";

export function canAccessPayroll(employee: Pick<Employee, "role">): boolean {
  return employee.role === "admin";
}

export function canApprovePayroll(employee: Pick<Employee, "role">): boolean {
  return employee.role === "admin";
}

export async function requirePayrollAccess(): Promise<Employee> {
  const employee = await requireAuth();
  if (!canAccessPayroll(employee)) redirect("/dashboard");
  return employee;
}

export async function requirePayrollApprover(): Promise<Employee> {
  const employee = await requireAuth();
  if (!canApprovePayroll(employee)) redirect("/dashboard");
  return employee;
}

export async function getPayrollActor(): Promise<Employee | null> {
  return getCurrentEmployee();
}
