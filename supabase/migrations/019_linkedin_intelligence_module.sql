-- ============================================================================
-- LinkedIn Intelligence & Analytics Module
-- ============================================================================
-- This migration creates tables for storing LinkedIn Data Export information
-- and generating business intelligence insights.

-- ============================================================================
-- 1. LinkedIn Imports Table (Track upload sessions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  datasets_detected JSONB DEFAULT '[]'::jsonb,
  parsing_progress JSONB DEFAULT '{}'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT fk_linkedin_imports_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_imports_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_imports_employee_id ON public.linkedin_imports(employee_id);
CREATE INDEX idx_linkedin_imports_status ON public.linkedin_imports(status);
CREATE INDEX idx_linkedin_imports_created_at ON public.linkedin_imports(created_at DESC);

-- ============================================================================
-- 2. LinkedIn Profile Data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  maiden_name TEXT,
  headline TEXT,
  summary TEXT,
  industry TEXT,
  location TEXT,
  country TEXT,
  zip_code TEXT,
  geo_location TEXT,
  birth_date DATE,
  websites TEXT[],
  instant_messengers JSONB,
  twitter_handles TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_profiles_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_profiles_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_profiles_import_id ON public.linkedin_profiles(import_id);
CREATE INDEX idx_linkedin_profiles_employee_id ON public.linkedin_profiles(employee_id);

-- ============================================================================
-- 3. LinkedIn Positions (Career History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  started_on DATE,
  finished_on DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_positions_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_positions_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_positions_import_id ON public.linkedin_positions(import_id);
CREATE INDEX idx_linkedin_positions_employee_id ON public.linkedin_positions(employee_id);
CREATE INDEX idx_linkedin_positions_company ON public.linkedin_positions(company_name);
CREATE INDEX idx_linkedin_positions_dates ON public.linkedin_positions(started_on, finished_on);

-- ============================================================================
-- 4. LinkedIn Skills
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_skills_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_skills_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_skills_import_id ON public.linkedin_skills(import_id);
CREATE INDEX idx_linkedin_skills_employee_id ON public.linkedin_skills(employee_id);
CREATE INDEX idx_linkedin_skills_name ON public.linkedin_skills(skill_name);

-- ============================================================================
-- 5. LinkedIn Endorsements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorser_first_name TEXT,
  endorser_last_name TEXT,
  endorsement_date DATE,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_endorsements_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_endorsements_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_endorsements_import_id ON public.linkedin_endorsements(import_id);
CREATE INDEX idx_linkedin_endorsements_employee_id ON public.linkedin_endorsements(employee_id);
CREATE INDEX idx_linkedin_endorsements_skill ON public.linkedin_endorsements(skill_name);
CREATE INDEX idx_linkedin_endorsements_date ON public.linkedin_endorsements(endorsement_date);

-- ============================================================================
-- 6. LinkedIn Projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  started_on DATE,
  finished_on DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_projects_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_projects_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_projects_import_id ON public.linkedin_projects(import_id);
CREATE INDEX idx_linkedin_projects_employee_id ON public.linkedin_projects(employee_id);
CREATE INDEX idx_linkedin_projects_dates ON public.linkedin_projects(started_on, finished_on);

-- ============================================================================
-- 7. LinkedIn Education
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  degree_name TEXT,
  field_of_study TEXT,
  notes TEXT,
  activities TEXT,
  started_on DATE,
  finished_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_education_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_education_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_education_import_id ON public.linkedin_education(import_id);
CREATE INDEX idx_linkedin_education_employee_id ON public.linkedin_education(employee_id);
CREATE INDEX idx_linkedin_education_school ON public.linkedin_education(school_name);

-- ============================================================================
-- 8. LinkedIn Certifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  authority TEXT,
  license_number TEXT,
  url TEXT,
  started_on DATE,
  finished_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_certifications_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_certifications_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_certifications_import_id ON public.linkedin_certifications(import_id);
CREATE INDEX idx_linkedin_certifications_employee_id ON public.linkedin_certifications(employee_id);

-- ============================================================================
-- 9. LinkedIn Invitations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING')),
  first_name TEXT,
  last_name TEXT,
  invitation_date DATE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_invitations_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_invitations_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_invitations_import_id ON public.linkedin_invitations(import_id);
CREATE INDEX idx_linkedin_invitations_employee_id ON public.linkedin_invitations(employee_id);
CREATE INDEX idx_linkedin_invitations_direction ON public.linkedin_invitations(direction);
CREATE INDEX idx_linkedin_invitations_date ON public.linkedin_invitations(invitation_date);

-- ============================================================================
-- 10. LinkedIn Company Follows
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_company_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  followed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_company_follows_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_company_follows_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_company_follows_import_id ON public.linkedin_company_follows(import_id);
CREATE INDEX idx_linkedin_company_follows_employee_id ON public.linkedin_company_follows(employee_id);

-- ============================================================================
-- 11. LinkedIn Learning (Courses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_title TEXT NOT NULL,
  course_url TEXT,
  completion_date DATE,
  time_spent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_learning_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_learning_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_learning_import_id ON public.linkedin_learning(import_id);
CREATE INDEX idx_linkedin_learning_employee_id ON public.linkedin_learning(employee_id);

-- ============================================================================
-- 12. LinkedIn Events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_events_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_events_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_events_import_id ON public.linkedin_events(import_id);
CREATE INDEX idx_linkedin_events_employee_id ON public.linkedin_events(employee_id);

-- ============================================================================
-- 13. LinkedIn Job Applications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_name TEXT,
  job_title TEXT,
  application_date DATE,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_job_applications_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_job_applications_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_job_applications_import_id ON public.linkedin_job_applications(import_id);
CREATE INDEX idx_linkedin_job_applications_employee_id ON public.linkedin_job_applications(employee_id);

-- ============================================================================
-- 14. LinkedIn Rich Media
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.linkedin_rich_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  media_type TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  created_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_rich_media_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_rich_media_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_rich_media_import_id ON public.linkedin_rich_media(import_id);
CREATE INDEX idx_linkedin_rich_media_employee_id ON public.linkedin_rich_media(employee_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- LinkedIn Imports
ALTER TABLE public.linkedin_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own LinkedIn imports"
  ON public.linkedin_imports FOR SELECT
  USING (
    employee_id = auth.uid()
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid()
      AND role IN ('admin', 'business_development')
    )
  );

CREATE POLICY "BD and Admin can upload LinkedIn data"
  ON public.linkedin_imports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid()
      AND role IN ('admin', 'business_development')
    )
  );

-- Apply similar policies to all LinkedIn tables
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    
    EXECUTE format('
      CREATE POLICY "Users can view their own LinkedIn %s"
      ON public.%I FOR SELECT
      USING (
        employee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.employees
          WHERE id = auth.uid()
          AND role IN (''admin'', ''business_development'')
        )
      )', replace(tbl, 'linkedin_', ''), tbl);
      
    EXECUTE format('
      CREATE POLICY "BD and Admin can insert LinkedIn %s"
      ON public.%I FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE id = auth.uid()
          AND role IN (''admin'', ''business_development'')
        )
      )', replace(tbl, 'linkedin_', ''), tbl);
  END LOOP;
END $$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.linkedin_imports TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_profiles TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_positions TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_skills TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_endorsements TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_projects TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_education TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_certifications TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_invitations TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_company_follows TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_learning TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_events TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_job_applications TO authenticated;
GRANT SELECT, INSERT ON public.linkedin_rich_media TO authenticated;
