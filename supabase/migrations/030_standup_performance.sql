-- Migration 030: Standup Performance Tracking
-- Adds slack_user_id to employees, creates standup_entries and performance_scores tables

-- ─── Add slack_user_id to employees ────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS slack_user_id TEXT UNIQUE;

-- ─── Standup entries (raw + parsed) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standup_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  slack_user_id TEXT,
  slack_message_ts TEXT UNIQUE,
  channel_id TEXT,
  raw_text TEXT NOT NULL,
  completed JSONB DEFAULT '[]'::jsonb,
  blockers JSONB DEFAULT '[]'::jsonb,
  in_progress JSONB DEFAULT '[]'::jsonb,
  performance_score INTEGER DEFAULT 0,
  parsed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standup_entries_employee ON standup_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_standup_entries_created ON standup_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_standup_entries_date ON standup_entries(created_at);

-- ─── Weekly performance scores ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_standups INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  total_blockers INTEGER DEFAULT 0,
  avg_score INTEGER DEFAULT 0,
  consistency_pct INTEGER DEFAULT 0,
  trend TEXT DEFAULT 'stable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_performance_scores_employee ON performance_scores(employee_id);

-- ─── RLS policies ──────────────────────────────────────────────────────────
ALTER TABLE standup_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all standup entries"
  ON standup_entries FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'hr'));

CREATE POLICY "Admins can view all performance scores"
  ON performance_scores FOR SELECT
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'hr'));

CREATE POLICY "Employees can view own standup entries"
  ON standup_entries FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Employees can view own performance scores"
  ON performance_scores FOR SELECT
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));
