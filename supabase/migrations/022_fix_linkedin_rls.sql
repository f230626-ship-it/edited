-- ============================================================================
-- Migration 022: Fix LinkedIn RLS policies
-- The policies in 019 compare employee_id = auth.uid() which is wrong —
-- employee_id is employees.id (not auth.users.id).
-- Replace all policies with ones using get_current_employee_id() / is_admin().
-- ============================================================================

-- ── linkedin_imports ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own LinkedIn imports"  ON public.linkedin_imports;
DROP POLICY IF EXISTS "BD and Admin can upload LinkedIn data"      ON public.linkedin_imports;

CREATE POLICY "linkedin_imports_select" ON public.linkedin_imports
  FOR SELECT TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR is_admin()
  );

CREATE POLICY "linkedin_imports_insert" ON public.linkedin_imports
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = get_current_employee_id()
    OR is_admin()
  );

CREATE POLICY "linkedin_imports_update" ON public.linkedin_imports
  FOR UPDATE TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR is_admin()
  );

CREATE POLICY "linkedin_imports_delete" ON public.linkedin_imports
  FOR DELETE TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR is_admin()
  );

-- ── Helper: drop + recreate policies for every linkedin_ table ──────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'linkedin_%'
      AND tablename != 'linkedin_imports'
  LOOP
    -- Drop old policies (019 naming)
    EXECUTE format(
      'DROP POLICY IF EXISTS "Users can view their own LinkedIn %s" ON public.%I',
      replace(tbl, 'linkedin_', ''), tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "BD and Admin can insert LinkedIn %s" ON public.%I',
      replace(tbl, 'linkedin_', ''), tbl
    );
    -- Drop 020-style names too (connections table)
    EXECUTE format('DROP POLICY IF EXISTS "linkedin_connections_select" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "linkedin_connections_insert" ON public.%I', tbl);

    -- Recreate with correct function
    EXECUTE format('
      CREATE POLICY "%s_select" ON public.%I
        FOR SELECT TO authenticated
        USING (
          employee_id = get_current_employee_id()
          OR is_admin()
        )', tbl, tbl);

    EXECUTE format('
      CREATE POLICY "%s_insert" ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          employee_id = get_current_employee_id()
          OR is_admin()
        )', tbl, tbl);
  END LOOP;
END $$;

-- ── Grant DELETE on linkedin_imports to authenticated (needed for re-upload) ─
GRANT DELETE ON public.linkedin_imports TO authenticated;
