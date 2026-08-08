/**
 * Pure helpers for payroll/commission math (unit-testable, no DB).
 */

export function computeCommissionAmount(
  revenue: number,
  percentage: number,
  fixed = 0
): number {
  return parseFloat(((revenue * percentage) / 100 + fixed).toFixed(2));
}

export function partialProjectRevenue(projectValue: number, status: string): number {
  if (status === "Partial") return parseFloat((projectValue * 0.5).toFixed(2));
  if (status === "Paid") return projectValue;
  return 0;
}

export function netPay(parts: {
  base: number;
  allowances: number;
  commission: number;
  bonus?: number;
  deductions?: number;
}): number {
  const gross =
    parts.base + parts.allowances + parts.commission + (parts.bonus || 0);
  return parseFloat((gross - (parts.deductions || 0)).toFixed(2));
}

export function momChangePercent(previous: number, current: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
