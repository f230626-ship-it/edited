import { google } from "googleapis";
import {
  parseFilterPeriod,
  rowHash,
  type IcpFilterInput,
} from "@/lib/icp/matching";

export interface ParsedIcpSheetRow extends IcpFilterInput {
  external_row_hash: string;
  period_year: number | null;
  period_month: number | null;
  period_week: number | null;
  filter_date: string | null;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Google service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h === c || h.includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  return String(row[idx] ?? "").trim();
}

/**
 * Fetch and parse the "Sales Filter's" style sheet.
 * Flexible header matching so slight renames still work.
 */
export async function fetchIcpFiltersFromSheet(
  spreadsheetId: string,
  tabName: string
): Promise<ParsedIcpSheetRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const range = tabName ? `'${tabName.replace(/'/g, "''")}'!A:J` : "A:J";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  // Detect whether first row is headers or data
  const first = rows[0].map((h) => String(h).toLowerCase().trim());
  const looksLikeHeader =
    first.some((h) => h.includes("date") || h.includes("profile")) ||
    first.includes("region") ||
    first.includes("industry");

  let dataRows = rows;
  let headers = [
    "date",
    "profile",
    "company headcount",
    "past companies",
    "region & states",
    "job titles",
    "industry",
    "years of experience",
    "projects closed",
    "notes",
  ];

  if (looksLikeHeader) {
    headers = first;
    dataRows = rows.slice(1);
  }

  const dateIdx = findCol(headers, ["date", "period", "month"]);
  const profileIdx = findCol(headers, ["profile", "name", "owner"]);
  const headcountIdx = findCol(headers, ["headcount", "company size", "company headcount"]);
  const pastIdx = findCol(headers, ["past compan", "previous compan", "companies"]);
  const regionIdx = findCol(headers, ["region", "state", "geography", "location"]);
  const titlesIdx = findCol(headers, ["job title", "titles", "roles"]);
  const industryIdx = findCol(headers, ["industry", "function"]);
  const yearsIdx = findCol(headers, ["years", "experience", "tenure"]);
  const closedIdx = findCol(headers, ["projects closed", "closed", "outcome"]);
  const notesIdx = findCol(headers, ["notes", "posted", "linkedin"]);

  // Fallback to positional columns A–I when headers missing
  const col = (preferred: number, fallback: number) =>
    preferred >= 0 ? preferred : fallback;

  const dI = col(dateIdx, 0);
  const pI = col(profileIdx, 1);
  const hI = col(headcountIdx, 2);
  const pastI = col(pastIdx, 3);
  const rI = col(regionIdx, 4);
  const tI = col(titlesIdx, 5);
  const indI = col(industryIdx, 6);
  const yI = col(yearsIdx, 7);
  const cI = col(closedIdx, 8);
  const nI = col(notesIdx, 9);

  const yearHint = new Date().getFullYear();
  const parsed: ParsedIcpSheetRow[] = [];

  for (const row of dataRows) {
    if (!row || row.every((c) => !String(c || "").trim())) continue;
    const profile_name = cell(row, pI);
    if (!profile_name) continue;

    const filter_date_raw = cell(row, dI) || null;
    const period = parseFilterPeriod(filter_date_raw, yearHint);
    const input: IcpFilterInput = {
      profile_name,
      filter_date_raw,
      company_headcount: cell(row, hI) || null,
      past_companies: cell(row, pastI) || null,
      regions: cell(row, rI) || null,
      job_titles: cell(row, tI) || null,
      industry: cell(row, indI) || null,
      years_experience: cell(row, yI) || null,
      projects_closed: cell(row, cI) || null,
      notes: cell(row, nI) || null,
    };

    parsed.push({
      ...input,
      filter_date: period.filter_date,
      period_year: period.period_year,
      period_month: period.period_month,
      period_week: period.period_week,
      external_row_hash: rowHash(input),
    });
  }

  return parsed;
}
