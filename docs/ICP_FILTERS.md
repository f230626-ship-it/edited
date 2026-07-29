# ICP Filters (BD Sales)

Track LinkedIn Sales Navigator / ICP outreach filters per profile, month, and geography.

## Access
- Route: `/sales/icp-filters`
- Gated by `requireSalesAccess()` (admin **or** Business Developer designation / BD)
- Visible in Sales nav for both owners and reps

## Setup
1. Apply migration: `supabase/migrations/020_icp_filters.sql`
2. Env (Vercel / `.env.local`):
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=...
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
   ICP_FILTERS_GOOGLE_SHEET_ID=<spreadsheet id>
   ICP_FILTERS_SHEET_TAB=Sales Filter's
   CRON_SECRET=<random secret>
   ```
3. Share the Google Sheet with the service account email (Viewer).
4. In CRM → Sales → ICP Filters → **Sheet settings** (admin) → save ID/tab → **Sync from Sheet**.

## Weekly cron
`GET/POST /api/cron/icp-filters` with header `Authorization: Bearer $CRON_SECRET`

Vercel cron (Saturday 09:00 AM Pakistan / 04:00 UTC):
```json
{
  "crons": [{ "path": "/api/cron/icp-filters", "schedule": "0 4 * * 6" }]
}
```

## Sheet columns expected
Date | Profile | Company headcount | Past Companies | Region & States | Job Titles | Industry | Years of Experience | Projects Closed | Notes
