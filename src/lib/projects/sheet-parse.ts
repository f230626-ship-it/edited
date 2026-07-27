/**
 * Shared parsing helpers for Projects Google Sheet / Excel import.
 */

export const PROJECT_SHEET_COLUMN_RULES: {
  field: string;
  keywords: string[];
}[] = [
  { field: "name", keywords: ["project name", "project", "name", "title", "project title", "project_name"] },
  { field: "client_name", keywords: ["client name", "client", "customer", "customer name", "client_name"] },
  { field: "project_type", keywords: ["project type", "type", "engagement", "employment type"] },
  { field: "client_email", keywords: ["client email", "email", "customer email", "client_email"] },
  { field: "client_contact_number", keywords: ["contact", "phone", "client contact", "client phone", "mobile", "telephone"] },
  { field: "company_name", keywords: ["company", "company name", "organization", "org", "firm"] },
  { field: "description", keywords: ["description", "desc", "details", "about", "summary", "notes"] },
  { field: "industry", keywords: ["industry", "sector", "domain"] },
  { field: "lead_source", keywords: ["lead source", "source", "origin", "lead_source"] },
  { field: "start_date", keywords: ["start date", "start", "begin", "commencement", "start_date", "project start"] },
  { field: "expected_delivery_date", keywords: ["end date", "end", "deadline", "due date", "delivery date", "finish", "expected_delivery", "target date", "completion date"] },
  { field: "status", keywords: ["status", "state", "phase", "stage", "project status"] },
  { field: "priority", keywords: ["priority", "importance", "urgency"] },
  { field: "value", keywords: ["budget", "value", "cost", "price", "amount", "revenue", "fee", "total contract value", "contract value", "project value"] },
  { field: "payment_structure", keywords: ["payment structure", "payment type", "billing", "milestones", "payment plan"] },
  { field: "project_rate", keywords: ["project rate", "rate", "hourly rate", "rate per hour"] },
  { field: "expected_monthly_revenue", keywords: ["mrr", "monthly revenue", "expected monthly", "recurring revenue"] },
  { field: "currency", keywords: ["currency", "curr"] },
  { field: "progress_percentage", keywords: ["progress", "completion", "percentage", "done"] },
  { field: "manager_name", keywords: ["manager", "pm", "project manager", "project lead", "handled by"] },
  { field: "bd_name", keywords: ["bd", "business development", "bd rep", "sales rep", "assigned bd"] },
  { field: "dev_name", keywords: ["developer", "dev", "front face", "frontface", "engineer", "assigned resource", "resource"] },
  { field: "team_members_raw", keywords: ["team", "team members", "members", "resources", "assignees"] },
  { field: "payment_status", keywords: ["payment status", "paid", "billing status"] },
  { field: "profile_name", keywords: ["profile", "profile name", "outreach profile", "sales profile"] },
  { field: "is_monthly_retainer", keywords: ["retainer", "monthly retainer"] },
  { field: "retainer_amount", keywords: ["retainer amount", "monthly amount", "recurring amount"] },
  { field: "expected_profit", keywords: ["profit", "expected profit", "margin"] },
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

  headers.forEach((header, idx) => {
    const h = normalizeHeader(header);
    let best: { field: string; score: number } | null = null;

    for (const rule of PROJECT_SHEET_COLUMN_RULES) {
      if (used.has(rule.field)) continue;
      for (const kw of rule.keywords) {
        if (h === kw) {
          best = { field: rule.field, score: 100 };
          break;
        }
        if (h.includes(kw) || kw.includes(h)) {
          const score = (Math.min(h.length, kw.length) / Math.max(h.length, kw.length)) * 80;
          if (!best || score > best.score) best = { field: rule.field, score };
        }
      }
      if (best?.score === 100) break;
    }

    if (best && best.score >= 35) {
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

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseBool(raw: string): boolean {
  const v = raw.toLowerCase();
  return v === "yes" || v === "true" || v === "1";
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Excel serial date
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 80000) {
      const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return utc.toISOString().slice(0, 10);
    }
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function normalizeProjectStatus(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "Lead Won";
  if (v === "active" || v.includes("in progress") || v === "ongoing") return "In Progress";
  if (v === "ended" || v.includes("complete") || v === "done" || v === "delivered") return "Completed";
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
  return valid.find((s) => s.toLowerCase() === raw.toLowerCase()) || "Other";
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
      value: parseNumber(cell(row, col.value)),
      currency: cell(row, col.currency) || "USD",
      payment_status: normalizePaymentStatus(cell(row, col.payment_status)),
      progress_percentage: Math.min(100, Math.max(0, parseInt(cell(row, col.progress_percentage) || "0", 10) || 0)),
      project_type,
      payment_structure: cell(row, col.payment_structure) || null,
      project_rate: cell(row, col.project_rate) || null,
      expected_monthly_revenue: parseNumber(cell(row, col.expected_monthly_revenue)) || null,
      profile_name,
      is_monthly_retainer: parseBool(cell(row, col.is_monthly_retainer)),
      retainer_amount: parseNumber(cell(row, col.retainer_amount)) || null,
      expected_profit: parseNumber(cell(row, col.expected_profit)) || null,
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
