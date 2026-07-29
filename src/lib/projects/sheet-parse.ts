/**
 * Shared parsing helpers for Projects Google Sheet / Excel import.
 */

/** Exact header → field (MindVista Projects & Clients Sheet). */
const EXACT_HEADER_ALIASES: Record<string, string> = {
  "client name": "client_name",
  "project name": "name",
  "project type": "project_type",
  // Sheet stores B2B/B2C here — not a dollar amount
  "total contract value": "business_model",
  "payment structure (milestones / monthly)": "payment_structure",
  "payment structure": "payment_structure",
  "start date": "start_date",
  "project rate": "project_rate",
  "project status": "status",
  "expected monthly revenue (mrr if recurring)": "expected_monthly_revenue",
  "expected monthly revenue (mrr)": "expected_monthly_revenue",
  "expected monthly revenue": "expected_monthly_revenue",
  "assigned resource": "dev_name",
  "profile name": "profile_name",
  "assigned bd": "bd_name",
  "end date": "expected_delivery_date",
};

export const PROJECT_SHEET_COLUMN_RULES: {
  field: string;
  keywords: string[];
}[] = [
  { field: "name", keywords: ["project name", "project title", "project_name", "title"] },
  { field: "client_name", keywords: ["client name", "customer name", "client_name", "client", "customer"] },
  { field: "project_type", keywords: ["project type", "engagement type", "employment type"] },
  { field: "business_model", keywords: ["total contract value", "business model", "business type", "b2b/b2c"] },
  { field: "client_email", keywords: ["client email", "customer email", "client_email", "email"] },
  { field: "client_contact_number", keywords: ["client contact", "client phone", "contact number", "telephone", "mobile", "phone"] },
  { field: "company_name", keywords: ["company name", "organization", "company", "firm"] },
  { field: "description", keywords: ["description", "details", "summary", "notes", "about"] },
  { field: "industry", keywords: ["industry", "sector", "domain"] },
  { field: "lead_source", keywords: ["lead source", "lead_source", "origin"] },
  { field: "start_date", keywords: ["start date", "project start", "start_date", "commencement"] },
  {
    field: "expected_delivery_date",
    keywords: ["end date", "delivery date", "due date", "target date", "completion date", "expected_delivery", "deadline"],
  },
  { field: "status", keywords: ["project status", "status", "phase", "stage"] },
  { field: "priority", keywords: ["priority", "importance", "urgency"] },
  {
    field: "value",
    keywords: ["project value", "contract amount", "budget", "fee", "amount", "price", "revenue"],
  },
  {
    field: "payment_structure",
    keywords: ["payment structure", "payment type", "payment plan", "billing", "milestones"],
  },
  { field: "project_rate", keywords: ["project rate", "hourly rate", "rate per hour"] },
  {
    field: "expected_monthly_revenue",
    keywords: ["expected monthly revenue", "monthly revenue", "recurring revenue", "mrr"],
  },
  { field: "currency", keywords: ["currency", "curr"] },
  { field: "progress_percentage", keywords: ["progress", "completion", "percentage"] },
  { field: "manager_name", keywords: ["project manager", "project lead", "handled by", "manager"] },
  { field: "bd_name", keywords: ["assigned bd", "business development", "bd rep", "sales rep", "bd"] },
  {
    field: "dev_name",
    keywords: ["assigned resource", "front face", "frontface", "developer", "engineer", "resource"],
  },
  { field: "team_members_raw", keywords: ["team members", "members", "resources", "assignees", "team"] },
  { field: "payment_status", keywords: ["payment status", "billing status"] },
  { field: "profile_name", keywords: ["profile name", "outreach profile", "sales profile", "profile"] },
  { field: "is_monthly_retainer", keywords: ["monthly retainer", "retainer"] },
  { field: "retainer_amount", keywords: ["retainer amount", "monthly amount", "recurring amount"] },
  { field: "expected_profit", keywords: ["expected profit", "profit", "margin"] },
];

export type ProjectSheetRow = {
  name: string;
  client_name: string;
  client_email: string;
  client_contact_number: string | null;
  company_name: string | null;
  description: string | null;
  industry: string;
  lead_source: string;
  start_date: string;
  expected_delivery_date: string;
  status: string;
  priority: string;
  value: number;
  currency: string;
  payment_status: string;
  progress_percentage: number;
  project_type: string | null;
  business_model: string | null;
  payment_structure: string | null;
  project_rate: string | null;
  expected_monthly_revenue: number | null;
  profile_name: string | null;
  is_monthly_retainer: boolean;
  retainer_amount: number | null;
  expected_profit: number | null;
  manager_name: string | null;
  bd_name: string | null;
  dev_name: string | null;
  team_members_raw: string | null;
  external_row_hash: string;
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ");
}

export function mapSheetHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const used = new Set<string>();

  // Pass 1: exact aliases for the MindVista sheet
  headers.forEach((header, idx) => {
    const h = normalizeHeader(header);
    const field = EXACT_HEADER_ALIASES[h];
    if (field && !used.has(field)) {
      used.add(field);
      map[field] = idx;
    }
  });

  // Pass 2: fuzzy keyword match for remaining columns
  headers.forEach((header, idx) => {
    const h = normalizeHeader(header);
    if (Object.values(map).includes(idx)) return;

    let best: { field: string; score: number } | null = null;

    for (const rule of PROJECT_SHEET_COLUMN_RULES) {
      if (used.has(rule.field)) continue;
      for (const kw of rule.keywords) {
        if (h === kw) {
          best = { field: rule.field, score: 100 };
          break;
        }
        if (h.startsWith(kw) || kw.startsWith(h)) {
          const score = 85;
          if (!best || score > best.score) best = { field: rule.field, score };
          continue;
        }
        if (h.includes(kw)) {
          // Prefer longer keyword hits so "payment structure" beats "pm"
          const score = 50 + Math.min(kw.length, 30);
          if (!best || score > best.score) best = { field: rule.field, score };
        }
      }
      if (best?.score === 100) break;
    }

    if (best && best.score >= 50) {
      used.add(best.field);
      map[best.field] = idx;
    }
  });

  return map;
}

function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined || idx < 0 || idx >= row.length) return "";
  return String(row[idx] ?? "").trim();
}

/** Parse money / MRR strings like "1.5K", "2k$", "4,800$", "$30/h". */
export function parseMoney(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (/^b2[bc]$/i.test(trimmed)) return 0;

  const kMatch = trimmed.match(/([\d]+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    return parseFloat(kMatch[1].replace(",", ".")) * 1000;
  }

  const cleaned = trimmed.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  // Guard: lone digit pulled from labels like "B2C"
  if (/^[bc]/i.test(trimmed) && cleaned.length <= 1) return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseBool(raw: string): boolean {
  const v = raw.toLowerCase();
  return v === "yes" || v === "true" || v === "1";
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function toIsoDate(year: number, monthIndex: number, day: number): string | null {
  if (year < 100) year += 2000;
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, monthIndex, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== monthIndex || d.getUTCDate() !== day) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Excel serial date
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial > 20000 && serial < 80000) {
      const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return utc.toISOString().slice(0, 10);
    }
  }

  // 24-March-2026 | 12-Jun-2026 | 4 June 2026
  const named = trimmed.match(/^(\d{1,2})[-\s/]+([A-Za-z]+)[-\s/]+(\d{2,4})$/);
  if (named) {
    const day = parseInt(named[1], 10);
    const monthIndex = MONTHS[named[2].toLowerCase()];
    const year = parseInt(named[3], 10);
    if (monthIndex !== undefined) {
      const iso = toIsoDate(year, monthIndex, day);
      if (iso) return iso;
    }
  }

  // 07-04-26 | 04-05-2026 — treat as DD-MM-YY (sheet convention)
  const numeric = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10) - 1;
    const year = parseInt(numeric[3], 10);
    const iso = toIsoDate(year, month, day);
    if (iso) return iso;
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export function normalizeProjectStatus(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "Lead Won";
  if (v === "active" || v.includes("in progress") || v === "ongoing") return "In Progress";
  if (v === "ended" || v.includes("complete") || v === "done" || v === "delivered") return "Completed";
  if (v.includes("trial") || v.includes("trail")) return "Onboarding";
  if (v.includes("hold")) return "On Hold";
  if (v.includes("pause")) return "Paused";
  if (v.includes("cancel")) return "Cancelled";
  if (v.includes("archiv")) return "Archived";
  if (v.includes("maintain")) return "Maintenance";
  if (v.includes("onboard")) return "Onboarding";
  if (v.includes("lead") || v.includes("won")) return "Lead Won";

  const exact = [
    "Lead Won", "Onboarding", "In Progress", "On Hold", "Completed",
    "Maintenance", "Paused", "Cancelled", "Archived",
  ].find((s) => s.toLowerCase() === v);
  return exact || "In Progress";
}

export function normalizeIndustry(raw: string): string {
  const valid = ["Real Estate", "Healthcare", "Restaurant", "Hotel", "E-commerce", "Other"];
  if (!raw) return "Other";
  const exact = valid.find((i) => i.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const fuzzy = valid.find(
    (i) => i.toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(i.toLowerCase())
  );
  return fuzzy || "Other";
}

export function normalizeLeadSource(raw: string): string {
  const valid = ["Fiverr", "Upwork", "LinkedIn", "Website", "Referral", "Cold Email", "Other"];
  if (!raw) return "Other";
  const lower = raw.toLowerCase();
  if (lower.includes("refer")) return "Referral";
  if (lower.includes("upwork")) return "Upwork";
  if (lower.includes("fiverr")) return "Fiverr";
  if (lower.includes("linkedin")) return "LinkedIn";
  return valid.find((s) => s.toLowerCase() === lower) || "Other";
}

export function normalizePaymentStatus(raw: string): string {
  const valid = ["Pending", "Partial", "Paid", "Overdue"];
  if (!raw) return "Pending";
  return valid.find((s) => s.toLowerCase() === raw.toLowerCase()) || "Pending";
}

export function normalizePriority(raw: string): string {
  const v = raw.toLowerCase();
  if (v.includes("high") || v.includes("urgent")) return "High";
  if (v.includes("low")) return "Low";
  return "Medium";
}

export function normalizeBusinessModel(raw: string): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v === "B2B" || v === "B2C") return v;
  if (/b2b/i.test(raw)) return "B2B";
  if (/b2c/i.test(raw)) return "B2C";
  return raw.trim() || null;
}

/**
 * Contract value for dashboards:
 * - prefer explicit numeric value column
 * - else fixed-price rate (no /h)
 * - else MRR when present
 */
export function deriveProjectValue(opts: {
  explicitValue: number;
  projectRate: string | null;
  mrr: number | null;
  projectType: string | null;
}): number {
  if (opts.explicitValue > 0) return opts.explicitValue;
  const rate = opts.projectRate || "";
  const rateMoney = parseMoney(rate);
  const isHourly = /\/\s*h\b|per\s*hour|rs\/h|\$\/h/i.test(rate);
  if (rateMoney > 0 && !isHourly) return rateMoney;
  if (opts.mrr && opts.mrr > 0) return opts.mrr;
  if (rateMoney > 0) return rateMoney;
  return 0;
}

export function projectRowHash(input: {
  name: string;
  client_name: string;
  start_date: string;
  project_type?: string | null;
  profile_name?: string | null;
}): string {
  return [
    input.name,
    input.client_name,
    input.start_date,
    input.project_type || "",
    input.profile_name || "",
  ]
    .map((s) => s.toLowerCase().trim().replace(/\s+/g, " "))
    .join("|");
}

export function parseProjectSheetRows(values: string[][]): ProjectSheetRow[] {
  if (!values.length) return [];

  const first = values[0].map((h) => normalizeHeader(String(h ?? "")));
  const looksLikeHeader =
    first.some((h) => h.includes("project") || h.includes("client") || h.includes("status")) ||
    first.includes("name");

  const headerRow = looksLikeHeader ? values[0] : [];
  const dataRows = looksLikeHeader ? values.slice(1) : values;
  const headers = looksLikeHeader
    ? headerRow.map((h) => String(h ?? ""))
    : [
        "Client Name",
        "Project Name",
        "Project Type",
        "Total Contract Value",
        "Payment Structure",
        "Start Date",
        "Project Rate",
        "Project Status",
        "Expected Monthly Revenue (MRR)",
        "Assigned Resource",
        "Profile Name",
        "Assigned BD",
        "End Date",
      ];

  const col = mapSheetHeaders(headers);
  if (col.name === undefined && col.client_name === undefined) return [];

  const today = new Date().toISOString().slice(0, 10);
  const out: ProjectSheetRow[] = [];

  for (const row of dataRows) {
    if (!row || row.every((c) => !String(c ?? "").trim())) continue;

    const name = cell(row, col.name);
    const client_name = cell(row, col.client_name);
    if (!name && !client_name) continue;
    if (!name) continue;

    const start = parseDate(cell(row, col.start_date)) || today;
    const end = parseDate(cell(row, col.expected_delivery_date)) || start;
    const project_type = cell(row, col.project_type) || null;
    const profile_name = cell(row, col.profile_name) || null;
    const project_rate = cell(row, col.project_rate) || null;
    const payment_structure = cell(row, col.payment_structure) || null;

    const rawBusiness = cell(row, col.business_model);
    const rawValueCell = cell(row, col.value);
    const business_model =
      normalizeBusinessModel(rawBusiness) ||
      normalizeBusinessModel(rawValueCell);

    const mrr = parseMoney(cell(row, col.expected_monthly_revenue)) || null;
    const explicitValue = parseMoney(rawValueCell);
    const value = deriveProjectValue({
      explicitValue,
      projectRate: project_rate,
      mrr,
      projectType: project_type,
    });

    const isRetainer =
      parseBool(cell(row, col.is_monthly_retainer)) ||
      /monthly/i.test(payment_structure || "") ||
      /\/\s*month/i.test(project_rate || "");

    const parsed: ProjectSheetRow = {
      name,
      client_name: client_name || "Unknown Client",
      client_email: cell(row, col.client_email) || "unknown@example.com",
      client_contact_number: cell(row, col.client_contact_number) || null,
      company_name: cell(row, col.company_name) || null,
      description: cell(row, col.description) || null,
      industry: normalizeIndustry(cell(row, col.industry)),
      lead_source: normalizeLeadSource(cell(row, col.lead_source)),
      start_date: start,
      expected_delivery_date: end,
      status: normalizeProjectStatus(cell(row, col.status)),
      priority: normalizePriority(cell(row, col.priority)),
      value,
      currency: cell(row, col.currency) || "USD",
      payment_status: normalizePaymentStatus(cell(row, col.payment_status)),
      progress_percentage: Math.min(
        100,
        Math.max(0, parseInt(cell(row, col.progress_percentage) || "0", 10) || 0)
      ),
      project_type,
      business_model,
      payment_structure,
      project_rate,
      expected_monthly_revenue: mrr,
      profile_name,
      is_monthly_retainer: isRetainer,
      retainer_amount: parseMoney(cell(row, col.retainer_amount)) || (isRetainer ? mrr : null),
      expected_profit: parseMoney(cell(row, col.expected_profit)) || null,
      manager_name: cell(row, col.manager_name) || null,
      bd_name: cell(row, col.bd_name) || null,
      dev_name: cell(row, col.dev_name) || null,
      team_members_raw: cell(row, col.team_members_raw) || null,
      external_row_hash: "",
    };
    parsed.external_row_hash = projectRowHash(parsed);
    out.push(parsed);
  }

  return out;
}
