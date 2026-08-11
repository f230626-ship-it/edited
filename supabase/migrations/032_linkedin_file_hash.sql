-- ============================================================================
-- Migration 032: LinkedIn file hash deduplication
-- Adds file_hash column to linkedin_imports for SHA-256 duplicate detection.
-- Safe to re-run (idempotent).
-- ============================================================================

-- Add file_hash column for SHA-256 duplicate detection
ALTER TABLE public.linkedin_imports
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Unique index: prevent same file from being imported twice
-- Partial index: only enforce uniqueness for non-failed imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_linkedin_imports_file_hash
  ON public.linkedin_imports(file_hash)
  WHERE file_hash IS NOT NULL AND status != 'failed';

COMMENT ON COLUMN public.linkedin_imports.file_hash IS 'SHA-256 hash of the uploaded ZIP file for duplicate detection';
