-- ============================================================================
-- Migration 029: LinkedIn Automation — monthly_report_log + slack_thread_ts
-- Adds tables and columns needed for the automated reporting pipeline.
-- Safe to re-run (idempotent).
-- ============================================================================

-- ── 1. monthly_report_log ────────────────────────────────────────────────────
-- Tracks whether the monthly PDF report has been generated and sent for each
-- (year, month) pair. Used for idempotency — prevents duplicate sends.
CREATE TABLE IF NOT EXISTS public.monthly_report_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year    INT  NOT NULL,
  period_month   INT  NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
  admin_email    TEXT,
  profiles_count INT  DEFAULT 0,
  report_sent_at TIMESTAMPTZ,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monthly_report_log_period_unique UNIQUE (period_year, period_month)
);

-- RLS: service-role only (no user-facing access needed)
ALTER TABLE public.monthly_report_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by cron and actions via admin client)
CREATE POLICY "service_role_all_monthly_report_log"
  ON public.monthly_report_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read the log for debugging
CREATE POLICY "admin_read_monthly_report_log"
  ON public.monthly_report_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
        AND e.role IN ('admin', 'hr')
    )
  );

-- ── 2. slack_thread_ts on linkedin_export_reminders ─────────────────────────
-- Stores the Slack message timestamp so future replies can be threaded.
ALTER TABLE public.linkedin_export_reminders
  ADD COLUMN IF NOT EXISTS slack_thread_ts TEXT;

-- ── 3. invitee_profile_url + name cols on linkedin_invitations ──────────────
-- Already present from migration 026, but add safely if missing
ALTER TABLE public.linkedin_invitations
  ADD COLUMN IF NOT EXISTS invitee_profile_url TEXT;
ALTER TABLE public.linkedin_invitations
  ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.linkedin_invitations
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- ── 4. profile_url + name cols on linkedin_connections ──────────────────────
-- Needed by the weekly view bug fix (invitation cross-reference)
ALTER TABLE public.linkedin_connections
  ADD COLUMN IF NOT EXISTS profile_url TEXT;
ALTER TABLE public.linkedin_connections
  ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.linkedin_connections
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- ── 5. Updated_at trigger for monthly_report_log ─────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_report_log_updated_at ON public.monthly_report_log;
CREATE TRIGGER trg_monthly_report_log_updated_at
  BEFORE UPDATE ON public.monthly_report_log
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_monthly_report_log_period
  ON public.monthly_report_log(period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_report_log_status
  ON public.monthly_report_log(status);
