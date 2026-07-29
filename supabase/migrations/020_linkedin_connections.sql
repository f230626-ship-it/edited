-- LinkedIn Connections.csv storage for outreach analytics

CREATE TABLE IF NOT EXISTS public.linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email_address TEXT,
  company TEXT,
  position TEXT,
  connected_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_linkedin_connections_import FOREIGN KEY (import_id) REFERENCES public.linkedin_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_linkedin_connections_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_linkedin_connections_import_id ON public.linkedin_connections(import_id);
CREATE INDEX idx_linkedin_connections_employee_id ON public.linkedin_connections(employee_id);
CREATE INDEX idx_linkedin_connections_date ON public.linkedin_connections(connected_on);

ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linkedin_connections_select" ON public.linkedin_connections
  FOR SELECT TO authenticated
  USING (
    employee_id = get_current_employee_id()
    OR get_current_employee_role() IN ('admin', 'business_development')
  );

CREATE POLICY "linkedin_connections_insert" ON public.linkedin_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = get_current_employee_id()
    OR get_current_employee_role() IN ('admin', 'business_development')
  );
