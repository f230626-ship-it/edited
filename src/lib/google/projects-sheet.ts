import { google } from "googleapis";
import { parseProjectSheetRows, type ProjectSheetRow } from "@/lib/projects/sheet-parse";

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

/**
 * Fetch and parse a Projects tracking Google Sheet.
 * Uses the same flexible header mapping as Excel import.
 */
export async function fetchProjectsFromSheet(
  spreadsheetId: string,
  tabName: string
): Promise<ProjectSheetRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const range = tabName ? `'${tabName.replace(/'/g, "''")}'!A:Z` : "A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  return parseProjectSheetRows(rows.map((r) => r.map((c) => String(c ?? ""))));
}
