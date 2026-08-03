/**
 * Schedule helpers for LinkedIn export reminders (Asia/Karachi).
 */

const TZ = "Asia/Karachi";

function karachiParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday] ?? date.getDay(),
  };
}

/** Mon–Fri are working days. */
export function isWorkingDay(date: Date): boolean {
  const { weekday } = karachiParts(date);
  return weekday >= 1 && weekday <= 5;
}

export function currentKarachiYearMonth(date = new Date()): { year: number; month: number } {
  const { year, month } = karachiParts(date);
  return { year, month };
}

/** True if `date` (in Karachi) is the last Mon–Fri of its month. */
export function isLastWorkingDayOfMonth(date = new Date()): boolean {
  const { year, month, day } = karachiParts(date);
  if (!isWorkingDay(date)) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = daysInMonth; d >= 1; d--) {
    const probe = new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+05:00`
    );
    if (isWorkingDay(probe)) {
      return d === day;
    }
  }
  return false;
}
