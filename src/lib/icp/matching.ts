/**
 * ICP filter parsing, period extraction, and smart duplicate matching.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export interface IcpFilterInput {
  profile_name: string;
  filter_date_raw?: string | null;
  filter_date?: string | null;
  company_headcount?: string | null;
  past_companies?: string | null;
  regions?: string | null;
  job_titles?: string | null;
  industry?: string | null;
  years_experience?: string | null;
  projects_closed?: string | null;
  notes?: string | null;
}

export interface ParsedPeriod {
  filter_date: string | null;
  period_year: number | null;
  period_month: number | null;
  period_week: number | null;
}

export function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9,\s&+/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeList(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(/[,|;/\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Best-effort parse of flexible sheet dates like "15 June", "FEB to 15 MAR", "27 Mar Till NOW". */
export function parseFilterPeriod(
  raw: string | null | undefined,
  fallbackYear = new Date().getFullYear()
): ParsedPeriod {
  const text = (raw || "").trim();
  if (!text) {
    return { filter_date: null, period_year: null, period_month: null, period_week: null };
  }

  const lower = text.toLowerCase();

  // Explicit day + month: "15 June", "2 July", "14 Apr"
  const dayMonth = lower.match(/(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?/);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTHS[dayMonth[2]];
    const year = dayMonth[3] ? Number(dayMonth[3]) : fallbackYear;
    if (month && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day));
      return {
        filter_date: date.toISOString().slice(0, 10),
        period_year: year,
        period_month: month,
        period_week: isoWeek(date),
      };
    }
  }

  // Month-only or ranges: "April Leads", "FEB to 15 MAR", "MAR to APR"
  const monthHits = Object.keys(MONTHS)
    .filter((k) => k.length >= 3 && lower.includes(k))
    .map((k) => MONTHS[k]);
  if (monthHits.length > 0) {
    const month = monthHits[monthHits.length - 1];
    const yearMatch = lower.match(/(20\d{2})/);
    const year = yearMatch ? Number(yearMatch[1]) : fallbackYear;
    const date = new Date(Date.UTC(year, month - 1, 1));
    return {
      filter_date: date.toISOString().slice(0, 10),
      period_year: year,
      period_month: month,
      period_week: isoWeek(date),
    };
  }

  // ISO / numeric
  const iso = lower.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    return {
      filter_date: `${iso[1]}-${iso[2]}-${iso[3]}`,
      period_year: Number(iso[1]),
      period_month: Number(iso[2]),
      period_week: isoWeek(date),
    };
  }

  return { filter_date: null, period_year: fallbackYear, period_month: null, period_week: null };
}

export function rowHash(input: IcpFilterInput): string {
  const parts = [
    normalizeText(input.profile_name),
    normalizeText(input.filter_date_raw),
    normalizeText(input.company_headcount),
    normalizeText(input.past_companies),
    normalizeText(input.regions),
    normalizeText(input.job_titles),
    normalizeText(input.industry),
    normalizeText(input.years_experience),
  ];
  return parts.join("|");
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  return inter / (setA.size + setB.size - inter);
}

export interface ParsedProjectsClosed {
  closedCount: number;
  pipelineCount: number;
  names: string[];
  raw: string;
  /** Heuristic quality: closed deals minus weak notes like "not work start". */
  effectiveClosed: number;
}

/** Parse free-text outcomes like "2 Closed : John Bush & Pedro" or "1 Closed : X | 1 In on Last Stage Y". */
export function parseProjectsClosed(raw: string | null | undefined): ParsedProjectsClosed {
  const text = (raw || "").trim();
  if (!text) {
    return { closedCount: 0, pipelineCount: 0, names: [], raw: "", effectiveClosed: 0 };
  }

  const closedMatch = text.match(/(\d+)\s*closed/i);
  const pipelineMatch = text.match(/(\d+)\s*(?:in\s+on\s+)?last\s*stage/i);
  const closedCount = closedMatch ? Number(closedMatch[1]) : /\bclosed\b/i.test(text) ? 1 : 0;
  const pipelineCount = pipelineMatch ? Number(pipelineMatch[1]) : 0;

  const afterClosed = text.split(/closed\s*:?/i)[1] || text;
  const names = afterClosed
    .replace(/\[|\]/g, " ")
    .split(/\s*(?:&|\||,|;)\s*/)
    .map((n) =>
      n
        .replace(/\d+\s*(?:in\s+on\s+)?last\s*stage/gi, "")
        .replace(/\d+\s*closed/gi, "")
        .trim()
    )
    .filter((n) => n.length > 1 && !/^closed$/i.test(n));

  const weakNotes = (text.match(/not work start|didn'?t start|cancelled|lost/gi) || []).length;
  const effectiveClosed = Math.max(0, closedCount - weakNotes);

  return { closedCount, pipelineCount, names, raw: text, effectiveClosed };
}

export type RerunAdvice = "avoid" | "caution" | "safe" | "unknown";

export interface FreshnessInfo {
  monthsAgo: number | null;
  advice: RerunAdvice;
  label: string;
}

/** How long ago a filter period was — drives re-run advice. */
export function getFilterFreshness(
  periodYear: number | null | undefined,
  periodMonth: number | null | undefined,
  now = new Date()
): FreshnessInfo {
  if (!periodYear || !periodMonth) {
    return { monthsAgo: null, advice: "unknown", label: "Unknown period" };
  }
  const monthsAgo = (now.getFullYear() - periodYear) * 12 + (now.getMonth() + 1 - periodMonth);
  if (monthsAgo < 0) {
    return { monthsAgo: 0, advice: "avoid", label: "Used this month — do not repeat yet" };
  }
  if (monthsAgo <= 1) {
    return {
      monthsAgo,
      advice: "avoid",
      label: monthsAgo === 0 ? "Used this month — do not repeat yet" : "Used last month — too recent to re-run",
    };
  }
  if (monthsAgo <= 3) {
    return {
      monthsAgo,
      advice: "caution",
      label: `Used ${monthsAgo} months ago — only re-run if intentional`,
    };
  }
  return {
    monthsAgo,
    advice: "safe",
    label: `Last used ${monthsAgo} months ago — safe to re-run on this profile`,
  };
}

export interface DuplicateMatch {
  score: number;
  reasons: string[];
  freshness: FreshnessInfo;
  closed: ParsedProjectsClosed;
  filter: IcpFilterInput & {
    id?: string;
    filter_date?: string | null;
    period_year?: number | null;
    period_month?: number | null;
    projects_closed?: string | null;
  };
}

/** Score how similar a proposed filter is to an existing one (same profile). */
export function scoreDuplicate(
  proposed: IcpFilterInput,
  existing: IcpFilterInput & {
    id?: string;
    filter_date?: string | null;
    period_year?: number | null;
    period_month?: number | null;
    projects_closed?: string | null;
  }
): DuplicateMatch | null {
  if (normalizeText(proposed.profile_name) !== normalizeText(existing.profile_name)) {
    return null;
  }

  const reasons: string[] = [];
  let score = 0;

  const regionScore = jaccard(tokenizeList(proposed.regions), tokenizeList(existing.regions));
  if (regionScore >= 0.4) {
    score += regionScore * 0.35;
    reasons.push(`Geography overlap ${Math.round(regionScore * 100)}%`);
  }

  const titleScore = jaccard(tokenizeList(proposed.job_titles), tokenizeList(existing.job_titles));
  if (titleScore >= 0.35) {
    score += titleScore * 0.25;
    reasons.push(`Job titles overlap ${Math.round(titleScore * 100)}%`);
  }

  const companyScore = jaccard(
    tokenizeList(proposed.past_companies),
    tokenizeList(existing.past_companies)
  );
  if (companyScore >= 0.25) {
    score += companyScore * 0.2;
    reasons.push(`Past companies overlap ${Math.round(companyScore * 100)}%`);
  }

  if (
    normalizeText(proposed.company_headcount) &&
    normalizeText(proposed.company_headcount) === normalizeText(existing.company_headcount)
  ) {
    score += 0.1;
    reasons.push("Same company headcount");
  }

  if (
    normalizeText(proposed.industry) &&
    normalizeText(proposed.industry) === normalizeText(existing.industry)
  ) {
    score += 0.1;
    reasons.push("Same industry");
  }

  if (score < 0.35 || reasons.length === 0) return null;

  const freshness = getFilterFreshness(existing.period_year, existing.period_month);
  const closed = parseProjectsClosed(existing.projects_closed);
  if (closed.closedCount > 0) {
    reasons.push(`${closed.closedCount} project(s) closed from that run`);
  }
  reasons.push(freshness.label);

  return { score, reasons, freshness, closed, filter: existing };
}

export function monthLabel(year: number | null, month: number | null): string {
  if (!year || !month) return "Unknown period";
  const names = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[month]} ${year}`;
}

export function extractGeographies(regions: string | null | undefined): string[] {
  const raw = (regions || "").replace(/\r/g, "\n").trim();
  if (!raw) return [];

  // Prefer newline / pipe / semicolon splits first (sheet cells often use these).
  const chunks = raw
    .split(/[\n|;]+/)
    .map((c) => c.replace(/✅/g, "").trim())
    .filter(Boolean);

  const results: string[] = [];
  for (const chunk of chunks) {
    // "City, State, Country" style — keep as one place
    const commaCount = (chunk.match(/,/g) || []).length;
    const looksLikeAddress =
      commaCount >= 2 ||
      /\b(united states|usa|united kingdom|uk|canada|germany|france)\b/i.test(chunk);

    const parts = looksLikeAddress
      ? [chunk]
      : chunk.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      const cleaned = normalizeText(part)
        .replace(/\busa\b/g, "united states")
        .replace(/\buk\b/g, "united kingdom")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length < 2) continue;
      results.push(cleaned);
    }
  }

  return Array.from(new Set(results));
}
