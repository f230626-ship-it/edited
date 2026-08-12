/**
 * Stand-up consistency: unique submission days ÷ expected weekdays in the window.
 */

/** Count Mon–Fri days inclusive between two dates (local calendar). */
export function countWeekdays(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Expected stand-up days for month-to-date (at least 1 so early-month isn't divide-by-zero). */
export function monthToDateExpectedDays(now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return Math.max(1, countWeekdays(start, now));
}

/** Expected stand-up days for a rolling window ending at `now`. */
export function rollingExpectedDays(daysBack: number, now = new Date()): number {
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  return Math.max(1, countWeekdays(start, now));
}

export function consistencyFromUniqueDays(
  uniqueDays: number,
  expectedDays: number
): number {
  if (uniqueDays <= 0 || expectedDays <= 0) return 0;
  return Math.min(100, Math.round((uniqueDays / expectedDays) * 100));
}

export function uniqueStandupDays(
  entries: { created_at: string }[]
): number {
  return new Set(
    entries.map((e) => new Date(e.created_at).toDateString())
  ).size;
}

/** Strip parenthetical suffixes like " (Dev)" for duplicate detection. */
export function normalizeEmployeeName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/g, "").trim().toLowerCase();
}

/**
 * Prefer real standup participants over admin/dev shadow accounts with the same base name.
 */
export function preferCanonicalEmployee<
  T extends {
    employee_id: string;
    employee_name: string;
    total_standups: number;
    has_slack?: boolean;
  },
>(rows: T[]): T[] {
  const byName = new Map<string, T>();

  for (const row of rows) {
    const key = normalizeEmployeeName(row.employee_name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, row);
      continue;
    }

    const existingDev = /\(dev\)/i.test(existing.employee_name);
    const rowDev = /\(dev\)/i.test(row.employee_name);
    const existingScore =
      (existing.has_slack ? 1000 : 0) + existing.total_standups * 10 + (existingDev ? 0 : 1);
    const rowScore =
      (row.has_slack ? 1000 : 0) + row.total_standups * 10 + (rowDev ? 0 : 1);

    if (rowScore > existingScore) byName.set(key, row);
  }

  return Array.from(byName.values());
}
