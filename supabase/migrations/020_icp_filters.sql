-- ICP (Ideal Customer Profile) filter tracking for BD sales outreach
-- Source of truth can sync from Google Sheet tab "Sales Filter's"

CREATE TABLE IF NOT EXISTS icp_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT NOT NULL,
  sales_profile_id UUID REFERENCES sales_profiles(id) ON DELETE SET NULL,
  filter_date_raw TEXT,
  filter_date DATE,
  period_year INT,
  period_month INT,
  period_week INT,
  company_headcount TEXT,
  past_companies TEXT,
  regions TEXT,
  job_titles TEXT,
  industry TEXT,
  years_experience TEXT,
  projects_closed TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'sheet_sync', 'excel_import')),
  external_row_hash TEXT,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icp_filters_profile_name
  ON icp_filters (lower(profile_name));
CREATE INDEX IF NOT EXISTS idx_icp_filters_period
  ON icp_filters (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_icp_filters_filter_date
  ON icp_filters (filter_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_icp_filters_row_hash
  ON icp_filters (external_row_hash)
  WHERE external_row_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS icp_filter_sync_meta (
  id TEXT PRIMARY KEY DEFAULT 'default',
  google_sheet_id TEXT,
  sheet_tab_name TEXT DEFAULT 'Sales Filter''s',
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_message TEXT,
  last_sync_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO icp_filter_sync_meta (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE icp_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_filter_sync_meta ENABLE ROW LEVEL SECURITY;

-- Helpers reuse sales access patterns from existing migrations where available.
-- Admins and BD designations (via app layer) + RLS for authenticated sales users.

CREATE OR REPLACE FUNCTION is_bd_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
      AND e.status = 'active'
      AND (
        e.role = 'admin'
        OR e.pm_role = 'bd'
        OR lower(coalesce(e.designation, '')) LIKE '%business developer%'
        OR lower(coalesce(e.designation, '')) LIKE '% bd%'
        OR lower(coalesce(e.designation, '')) LIKE 'bd %'
        OR lower(coalesce(e.designation, '')) = 'bd'
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "icp_filters_select" ON icp_filters;
CREATE POLICY "icp_filters_select" ON icp_filters
  FOR SELECT TO authenticated
  USING (is_bd_or_admin());

DROP POLICY IF EXISTS "icp_filters_insert" ON icp_filters;
CREATE POLICY "icp_filters_insert" ON icp_filters
  FOR INSERT TO authenticated
  WITH CHECK (is_bd_or_admin());

DROP POLICY IF EXISTS "icp_filters_update" ON icp_filters;
CREATE POLICY "icp_filters_update" ON icp_filters
  FOR UPDATE TO authenticated
  USING (is_bd_or_admin());

DROP POLICY IF EXISTS "icp_filters_delete" ON icp_filters;
CREATE POLICY "icp_filters_delete" ON icp_filters
  FOR DELETE TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "icp_sync_meta_select" ON icp_filter_sync_meta;
CREATE POLICY "icp_sync_meta_select" ON icp_filter_sync_meta
  FOR SELECT TO authenticated
  USING (is_bd_or_admin());

DROP POLICY IF EXISTS "icp_sync_meta_update" ON icp_filter_sync_meta;
CREATE POLICY "icp_sync_meta_update" ON icp_filter_sync_meta
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
