-- ============================================================================
-- Migration 026: LinkedIn profile-scoped stats + repair sales_profiles schema
-- Idempotent / safe to re-run. Handles pre-existing linkedin_messages without
-- sales_profile_id (CREATE TABLE IF NOT EXISTS alone is not enough).
-- ============================================================================

-- ── Repair sales_profiles (prod table was missing core columns) ──────────────
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'linkedin';
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS google_sheet_id TEXT;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS sheet_tab_name TEXT;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS linkedin_email TEXT;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS linkedin_username TEXT;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS assigned_team_id UUID;
ALTER TABLE public.sales_profiles ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.sales_profiles SET platform = 'linkedin' WHERE platform IS NULL;
UPDATE public.sales_profiles SET updated_at = now() WHERE updated_at IS NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.sales_profiles ALTER COLUMN platform SET DEFAULT 'linkedin';
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.sales_profiles ALTER COLUMN platform SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.sales_profiles ALTER COLUMN updated_at SET DEFAULT now();
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.sales_profiles ALTER COLUMN updated_at SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_profiles_employee ON public.sales_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_profiles_active ON public.sales_profiles(is_active) WHERE is_active = true;

-- ── linkedin_imports: scope to sales profile ────────────────────────────────
ALTER TABLE public.linkedin_imports
  ADD COLUMN IF NOT EXISTS sales_profile_id UUID REFERENCES public.sales_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.linkedin_imports
  ADD COLUMN IF NOT EXISTS is_partial BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.linkedin_imports
  ADD COLUMN IF NOT EXISTS owner_display_name TEXT;

CREATE INDEX IF NOT EXISTS idx_linkedin_imports_sales_profile
  ON public.linkedin_imports(sales_profile_id);

-- ── linkedin_messages (may already exist with an older shape) ───────────────
CREATE TABLE IF NOT EXISTS public.linkedin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sales_profile_id UUID REFERENCES public.sales_profiles(id) ON DELETE CASCADE,
  conversation_id TEXT,
  conversation_title TEXT,
  from_name TEXT,
  to_name TEXT,
  sender_profile_url TEXT,
  recipient_profile_urls TEXT,
  sent_at TIMESTAMPTZ,
  subject TEXT,
  content_preview TEXT,
  folder TEXT,
  is_from_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade older linkedin_messages columns if the table already existed
ALTER TABLE public.linkedin_messages
  ADD COLUMN IF NOT EXISTS sales_profile_id UUID REFERENCES public.sales_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS conversation_title TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS sender_profile_url TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS recipient_profile_urls TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS content_preview TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS is_from_owner BOOLEAN DEFAULT false;
ALTER TABLE public.linkedin_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Older schema required conversation_id NOT NULL — relax so inserts are flexible
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.linkedin_messages ALTER COLUMN conversation_id DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.linkedin_messages ALTER COLUMN is_from_owner SET DEFAULT false;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_linkedin_messages_import ON public.linkedin_messages(import_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_profile ON public.linkedin_messages(sales_profile_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_at ON public.linkedin_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_conversation ON public.linkedin_messages(conversation_id);

ALTER TABLE public.linkedin_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "linkedin_messages_select" ON public.linkedin_messages;
CREATE POLICY "linkedin_messages_select" ON public.linkedin_messages
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR employee_id = get_current_employee_id()
    OR (
      sales_profile_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sales_profiles sp
        WHERE sp.id = linkedin_messages.sales_profile_id
          AND sp.employee_id = get_current_employee_id()
      )
    )
  );

DROP POLICY IF EXISTS "linkedin_messages_insert" ON public.linkedin_messages;
CREATE POLICY "linkedin_messages_insert" ON public.linkedin_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR employee_id = get_current_employee_id()
  );

GRANT SELECT, INSERT, DELETE ON public.linkedin_messages TO authenticated;

-- ── Period rollups (source of truth for dashboard history) ──────────────────
CREATE TABLE IF NOT EXISTS public.linkedin_profile_period_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_profile_id UUID NOT NULL REFERENCES public.sales_profiles(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  invites_sent INT NOT NULL DEFAULT 0,
  connections_made INT NOT NULL DEFAULT 0,
  acceptance_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  messages_sent INT NOT NULL DEFAULT 0,
  initial_messages INT NOT NULL DEFAULT 0,
  follow_ups_sent INT NOT NULL DEFAULT 0,
  replies_received INT NOT NULL DEFAULT 0,
  reply_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  is_partial BOOLEAN NOT NULL DEFAULT false,
  import_id UUID REFERENCES public.linkedin_imports(id) ON DELETE SET NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_profile_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_period_stats_profile
  ON public.linkedin_profile_period_stats(sales_profile_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_period_stats_period
  ON public.linkedin_profile_period_stats(period_year, period_month);

ALTER TABLE public.linkedin_profile_period_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "linkedin_period_stats_select" ON public.linkedin_profile_period_stats;
CREATE POLICY "linkedin_period_stats_select" ON public.linkedin_profile_period_stats
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.sales_profiles sp
      WHERE sp.id = linkedin_profile_period_stats.sales_profile_id
        AND sp.employee_id = get_current_employee_id()
    )
  );

DROP POLICY IF EXISTS "linkedin_period_stats_write" ON public.linkedin_profile_period_stats;
CREATE POLICY "linkedin_period_stats_write" ON public.linkedin_profile_period_stats
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_profile_period_stats TO authenticated;

-- ── Reminder log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linkedin_export_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  profile_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'skipped', 'failed')),
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_year, period_month)
);

ALTER TABLE public.linkedin_export_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "linkedin_export_reminders_admin" ON public.linkedin_export_reminders;
CREATE POLICY "linkedin_export_reminders_admin" ON public.linkedin_export_reminders
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT, INSERT, UPDATE ON public.linkedin_export_reminders TO authenticated;

-- Also allow BD handlers to see imports for their assigned profiles
DROP POLICY IF EXISTS "linkedin_imports_select" ON public.linkedin_imports;
CREATE POLICY "linkedin_imports_select" ON public.linkedin_imports
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR employee_id = get_current_employee_id()
    OR (
      sales_profile_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sales_profiles sp
        WHERE sp.id = linkedin_imports.sales_profile_id
          AND sp.employee_id = get_current_employee_id()
      )
    )
  );

-- ── Seed the 6 LinkedIn outreach profiles ───────────────────────────────────
DO $$
DECLARE
  asim_id UUID;
  faizan_id UUID;
  haroon_id UUID;
BEGIN
  SELECT id INTO asim_id FROM public.employees WHERE lower(email) = 'asimtassaduqwork@gmail.com' LIMIT 1;
  SELECT id INTO faizan_id FROM public.employees WHERE lower(email) = 'work.faizan81@gmail.com' LIMIT 1;
  SELECT id INTO haroon_id FROM public.employees WHERE lower(email) = 'abdullahharoon681@gmail.com' LIMIT 1;

  IF asim_id IS NOT NULL THEN
    INSERT INTO public.sales_profiles (name, employee_id, platform, is_active)
    SELECT 'Fiza S.', asim_id, 'linkedin', true
    WHERE NOT EXISTS (SELECT 1 FROM public.sales_profiles WHERE lower(name) IN ('fiza s.', 'fiza'));

    INSERT INTO public.sales_profiles (name, employee_id, platform, is_active)
    SELECT 'Usama Rehman (Sam)', asim_id, 'linkedin', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sales_profiles
      WHERE lower(name) IN ('usama rehman (sam)', 'm. usama (sam)', 'm. usama', 'sam')
    );

    UPDATE public.sales_profiles
      SET employee_id = asim_id, platform = 'linkedin', is_active = true,
          name = CASE
            WHEN lower(name) IN ('m. usama (sam)', 'm. usama', 'sam') THEN 'Usama Rehman (Sam)'
            ELSE name
          END
      WHERE lower(name) IN ('fiza s.', 'fiza', 'usama rehman (sam)', 'm. usama (sam)', 'm. usama', 'sam');
  END IF;

  IF faizan_id IS NOT NULL THEN
    INSERT INTO public.sales_profiles (name, employee_id, platform, is_active)
    SELECT 'Abdullah S.', faizan_id, 'linkedin', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sales_profiles
      WHERE lower(name) IN ('abdullah s.', 'abdullah s', 'abdullah shafiq')
    );

    INSERT INTO public.sales_profiles (name, employee_id, platform, is_active)
    SELECT 'Abdul Hafeez', faizan_id, 'linkedin', true
    WHERE NOT EXISTS (SELECT 1 FROM public.sales_profiles WHERE lower(name) = 'abdul hafeez');

    UPDATE public.sales_profiles
      SET employee_id = faizan_id, platform = 'linkedin', is_active = true,
          name = CASE WHEN lower(name) = 'abdullah shafiq' THEN 'Abdullah S.' ELSE name END
      WHERE lower(name) IN ('abdullah s.', 'abdullah s', 'abdul hafeez', 'abdullah shafiq');
  END IF;

  IF haroon_id IS NOT NULL THEN
    INSERT INTO public.sales_profiles (name, employee_id, platform, is_active)
    SELECT 'Mehwish Shafiq', haroon_id, 'linkedin', true
    WHERE NOT EXISTS (SELECT 1 FROM public.sales_profiles WHERE lower(name) LIKE 'mehwish%');

    INSERT INTO public.sales_profiles (name, employee_id, platform, is_active)
    SELECT 'Asim', haroon_id, 'linkedin', true
    WHERE NOT EXISTS (SELECT 1 FROM public.sales_profiles WHERE lower(name) = 'asim');

    UPDATE public.sales_profiles
      SET employee_id = haroon_id, platform = 'linkedin', is_active = true,
          name = CASE WHEN lower(name) = 'mehwish' THEN 'Mehwish Shafiq' ELSE name END
      WHERE lower(name) IN ('mehwish', 'mehwish shafiq', 'asim') OR lower(name) LIKE 'mehwish%';
  END IF;
END $$;
