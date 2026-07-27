# Projects Google Sheet Sync

Admin-only Projects sync from Google Sheets (same service account as ICP Filters).

## Access
- Route: `/projects` (admin only)
- UI: **Sheet settings** + **Sync from Sheet** (Excel upload remains as secondary)

## Setup
1. Apply migration: `supabase/migrations/021_project_sheet_sync.sql`
2. Env (Vercel / `.env.local`):
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=...
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
   PROJECTS_GOOGLE_SHEET_ID=<spreadsheet id>
   PROJECTS_SHEET_TAB=Projects & Clients Sheet
   CRON_SECRET=<random secret>
   ```
3. Share the sheet with the service account email (Viewer).
4. In CRM → Projects → **Sheet settings** → save ID/tab → **Sync from Sheet**.

## Cron (~every 2 weeks)
`GET/POST /api/cron/projects-sheet` with `Authorization: Bearer $CRON_SECRET`

Vercel schedule: `0 4 1,15 * *` (1st & 15th, 09:00 AM Pakistan).  
Code also skips if last successful sync was under 12 days ago.

## Expected columns (flexible headers)
Client Name | Project Name | Project Type | Total Contract Value | Payment Structure | Start Date | Project Rate | Project Status | Expected Monthly Revenue (MRR) | Assigned Resource | Profile Name | Assigned BD | End Date

Sync **upserts** by row hash (or matching name + client), so re-sync updates existing projects instead of duplicating.
