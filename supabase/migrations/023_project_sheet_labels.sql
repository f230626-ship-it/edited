-- Store free-text sheet labels when BD / resource names don't match employees,
-- and keep B2B/B2C from the sheet's "Total Contract Value" column.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_model TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_bd_label TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_resource_label TEXT;
