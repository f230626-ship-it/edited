-- Sheet "Closer" column — who won/closed the project (separate from Assigned Resource).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS closer_label TEXT;
