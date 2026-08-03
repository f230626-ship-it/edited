# LinkedIn Profile Stats

## Setup
1. Apply migration in Supabase SQL Editor (safe to re-run):
   - `supabase/migrations/026_linkedin_profile_stats.sql`
   - Or: `SUPABASE_ACCESS_TOKEN=... node scripts/apply-migration-026.mjs`
   - Note: an older `linkedin_messages` table may already exist without `sales_profile_id`; this migration upgrades it with `ADD COLUMN IF NOT EXISTS`.
2. Confirm 6 profiles exist under Sales → Profiles with handlers:
   - Asim → Fiza S., Usama Rehman (Sam)
   - Faizan → Abdullah S., Abdul Hafeez
   - Abdullah Haroon → Mehwish Shafiq, Asim
   - Do **not** auto-create from test ZIPs (e.g. fahad_zaidi_test.zip) — pick an existing profile when uploading tests
3. Env: `EMAIL_PROVIDER` + Brevo/Resend keys, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`

## Usage
- **Sales → LinkedIn**: dashboard (W/M/Q, compare, upload ZIP per profile)
- Last working day cron: `/api/cron/linkedin-export-reminder` (Mon–Fri 09:00 UTC check)
- Admin **Send reminder now** forces emails immediately

## ZIP requirements
Include **Invitations**, **Connections**, and **Messages** for full stats. Missing invites/messages → partial data badge.
