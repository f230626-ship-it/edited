-- Migration 019: Add sheet-mirror columns to projects table
-- Adds: project_type, payment_structure, project_rate, expected_monthly_revenue, profile_name

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_structure TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_rate TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_monthly_revenue DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS profile_name TEXT;

-- Keep audit trigger compatible with project_audit_logs.details (not "changes").
-- Full corrected function (incl. sheet columns) is in 022_fix_project_audit_trigger.sql.
