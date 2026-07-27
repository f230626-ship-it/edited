-- Project Google Sheet sync metadata + dedupe columns on projects

ALTER TABLE projects ADD COLUMN IF NOT EXISTS external_row_hash TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IS NULL OR source IN ('manual', 'sheet_sync', 'excel_import'));

CREATE INDEX IF NOT EXISTS idx_projects_external_row_hash
  ON projects (external_row_hash)
  WHERE external_row_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_sync_meta (
  id TEXT PRIMARY KEY DEFAULT 'default',
  google_sheet_id TEXT,
  sheet_tab_name TEXT DEFAULT 'Projects & Clients Sheet',
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_message TEXT,
  last_sync_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO project_sync_meta (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE project_sync_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_sync_meta_select" ON project_sync_meta;
CREATE POLICY "project_sync_meta_select" ON project_sync_meta
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "project_sync_meta_all" ON project_sync_meta;
CREATE POLICY "project_sync_meta_all" ON project_sync_meta
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
