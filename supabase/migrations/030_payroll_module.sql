-- ============================================================================
-- Migration 030: Payroll & Commission Automation
-- Versioned compensation, commission rules, invoices/payments, ledger,
-- payroll periods/records, anomalies, slips, email queue, settings, audit.
-- Safe to re-run (idempotent where practical).
-- ============================================================================

-- ── 1. employee_compensation (versioned) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  allowances NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  salary_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (salary_frequency IN ('monthly', 'bi_weekly', 'weekly')),
  employment_type TEXT,
  commission_eligible BOOLEAN NOT NULL DEFAULT false,
  commission_role TEXT, -- bd | closer | upsell | custom
  bank_name TEXT,
  bank_account_number TEXT,
  effective_from DATE NOT NULL,
  effective_until DATE, -- null = current/open-ended
  notes TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_compensation_dates_chk
    CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_employee
  ON public.employee_compensation(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_effective
  ON public.employee_compensation(employee_id, effective_from DESC);

-- Seed from existing employees.basic_salary (one open-ended row each)
INSERT INTO public.employee_compensation (
  employee_id, basic_salary, allowances, currency, salary_frequency,
  employment_type, commission_eligible, commission_role,
  bank_name, bank_account_number, effective_from
)
SELECT
  e.id,
  COALESCE(e.basic_salary, 0),
  COALESCE(e.allowances, 0),
  'USD',
  COALESCE(e.payment_cycle::text, 'monthly'),
  e.employment_type::text,
  CASE
    WHEN e.pm_role = 'bd' OR lower(COALESCE(e.designation, '')) LIKE '%business developer%'
      OR lower(COALESCE(e.designation, '')) ~ '(^|[^a-z])bd([^a-z]|$)'
    THEN true ELSE false
  END,
  CASE
    WHEN e.pm_role = 'bd' OR lower(COALESCE(e.designation, '')) LIKE '%business developer%'
      OR lower(COALESCE(e.designation, '')) ~ '(^|[^a-z])bd([^a-z]|$)'
    THEN 'bd' ELSE NULL
  END,
  e.bank_name,
  e.bank_account_number,
  COALESCE(e.joining_date, CURRENT_DATE)
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_compensation c WHERE c.employee_id = e.id
);

-- ── 2. commission_rules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- bd | closer | upsell | custom
  commission_percentage NUMERIC(8, 4) NOT NULL DEFAULT 0,
  fixed_commission NUMERIC(14, 2) NOT NULL DEFAULT 0,
  commission_basis TEXT NOT NULL DEFAULT 'PAID'
    CHECK (commission_basis IN ('INVOICED', 'PAID', 'PARTIALLY_PAID', 'PROJECT_VALUE')),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_role_active
  ON public.commission_rules(role, is_active);

INSERT INTO public.commission_rules (name, role, commission_percentage, commission_basis, is_active)
SELECT v.name, v.role, v.pct, v.basis, true
FROM (VALUES
  ('BD — 2% of collected revenue', 'bd', 2.0, 'PAID'),
  ('Closer — 5% of collected revenue', 'closer', 5.0, 'PAID'),
  ('Upsell — 1.5% of collected revenue', 'upsell', 1.5, 'PAID')
) AS v(name, role, pct, basis)
WHERE NOT EXISTS (SELECT 1 FROM public.commission_rules LIMIT 1);

-- ── 3. invoices + invoice_payments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT,
  invoice_date DATE,
  due_date DATE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sent', 'due', 'partially_paid', 'paid', 'cancelled', 'overdue'
    )),
  notes TEXT,
  external_ref TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_number_unique UNIQUE (invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  external_ref TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoice_payments_external_ref_unique UNIQUE (external_ref)
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_paid_at ON public.invoice_payments(paid_at);

-- ── 4. commission_ledger ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.invoice_payments(id) ON DELETE SET NULL,
  commission_rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  revenue_basis TEXT NOT NULL,
  revenue_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(8, 4) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payroll_period_id UUID, -- FK added after payroll_periods
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REVERSED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent double commission on same payment+rule+employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_payment_unique
  ON public.commission_ledger(employee_id, payment_id, commission_rule_id)
  WHERE payment_id IS NOT NULL AND status NOT IN ('REVERSED', 'CANCELLED');

-- Project-value fallback uniqueness (no payment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_ledger_project_fallback_unique
  ON public.commission_ledger(employee_id, project_id, commission_rule_id, revenue_basis)
  WHERE payment_id IS NULL AND status NOT IN ('REVERSED', 'CANCELLED');

CREATE INDEX IF NOT EXISTS idx_commission_ledger_employee
  ON public.commission_ledger(employee_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_period
  ON public.commission_ledger(payroll_period_id);

-- ── 5. payroll_periods / records / line_items ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL, -- e.g. August 2026 Payroll
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT', 'CALCULATING', 'REVIEW_REQUIRED', 'READY_FOR_APPROVAL',
      'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'
    )),
  total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_commissions NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_net NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payroll_periods_unique UNIQUE (period_year, period_month)
);

ALTER TABLE public.commission_ledger
  DROP CONSTRAINT IF EXISTS commission_ledger_payroll_period_id_fkey;
ALTER TABLE public.commission_ledger
  ADD CONSTRAINT commission_ledger_payroll_period_id_fkey
  FOREIGN KEY (payroll_period_id) REFERENCES public.payroll_periods(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(14, 2) NOT NULL DEFAULT 0,
  allowances NUMERIC(14, 2) NOT NULL DEFAULT 0,
  commission_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gross_pay NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  compensation_id UUID REFERENCES public.employee_compensation(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'calculated', 'adjusted', 'approved', 'paid', 'excluded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payroll_records_unique UNIQUE (payroll_period_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL
    CHECK (line_type IN (
      'base_salary', 'allowance', 'commission', 'bonus', 'deduction', 'other'
    )),
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_line_items_record
  ON public.payroll_line_items(payroll_record_id);

-- ── 6. anomalies / slips / email queue ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_anomalies_period
  ON public.payroll_anomalies(payroll_period_id);

CREATE TABLE IF NOT EXISTS public.salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pdf_base64 TEXT, -- private; only via admin client
  storage_path TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT salary_slips_unique UNIQUE (payroll_period_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.payroll_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_slip_id UUID REFERENCES public.salary_slips(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'READY', 'APPROVED', 'SENT', 'FAILED')),
  idempotency_key TEXT NOT NULL,
  error TEXT,
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payroll_email_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payroll_email_queue_period
  ON public.payroll_email_queue(payroll_period_id);

-- ── 7. settings + audit ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  pay_day_of_month INT NOT NULL DEFAULT 31 CHECK (pay_day_of_month BETWEEN 1 AND 31),
  reminder_days_before INT[] NOT NULL DEFAULT ARRAY[7, 3, 1, 0],
  company_name TEXT NOT NULL DEFAULT 'MindVista',
  company_address TEXT,
  slip_footer TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  admin_notify_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.employees(id) ON DELETE SET NULL
);

INSERT INTO public.payroll_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  previous_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_created
  ON public.payroll_audit_logs(created_at DESC);

-- ── 8. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helpers: portal admin only (payroll is highly sensitive)
CREATE OR REPLACE FUNCTION public.is_payroll_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
      AND e.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
      AND e.status = 'active'
  );
$$;

-- Admin/HR: full manage on most payroll tables; employees: own slips/records only
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'employee_compensation', 'commission_rules', 'invoices', 'invoice_payments',
    'commission_ledger', 'payroll_periods', 'payroll_records', 'payroll_line_items',
    'payroll_anomalies', 'salary_slips', 'payroll_email_queue', 'payroll_settings',
    'payroll_audit_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_payroll_admin()) WITH CHECK (public.is_payroll_admin())',
      t || '_admin_all', t
    );
  END LOOP;
END $$;

-- Employees can read their own compensation history, payroll records, line items, slips
DROP POLICY IF EXISTS employee_compensation_self_select ON public.employee_compensation;
CREATE POLICY employee_compensation_self_select ON public.employee_compensation
  FOR SELECT TO authenticated
  USING (employee_id = public.get_current_employee_id() OR public.is_payroll_admin());

DROP POLICY IF EXISTS payroll_records_self_select ON public.payroll_records;
CREATE POLICY payroll_records_self_select ON public.payroll_records
  FOR SELECT TO authenticated
  USING (employee_id = public.get_current_employee_id() OR public.is_payroll_admin());

DROP POLICY IF EXISTS payroll_line_items_self_select ON public.payroll_line_items;
CREATE POLICY payroll_line_items_self_select ON public.payroll_line_items
  FOR SELECT TO authenticated
  USING (
    public.is_payroll_admin()
    OR EXISTS (
      SELECT 1 FROM public.payroll_records r
      WHERE r.id = payroll_record_id
        AND r.employee_id = public.get_current_employee_id()
    )
  );

DROP POLICY IF EXISTS salary_slips_self_select ON public.salary_slips;
CREATE POLICY salary_slips_self_select ON public.salary_slips
  FOR SELECT TO authenticated
  USING (employee_id = public.get_current_employee_id() OR public.is_payroll_admin());

DROP POLICY IF EXISTS commission_ledger_self_select ON public.commission_ledger;
CREATE POLICY commission_ledger_self_select ON public.commission_ledger
  FOR SELECT TO authenticated
  USING (employee_id = public.get_current_employee_id() OR public.is_payroll_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.employee_compensation,
  public.commission_rules,
  public.invoices,
  public.invoice_payments,
  public.commission_ledger,
  public.payroll_periods,
  public.payroll_records,
  public.payroll_line_items,
  public.payroll_anomalies,
  public.salary_slips,
  public.payroll_email_queue,
  public.payroll_settings,
  public.payroll_audit_logs
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.employee_compensation,
  public.commission_rules,
  public.invoices,
  public.invoice_payments,
  public.commission_ledger,
  public.payroll_periods,
  public.payroll_records,
  public.payroll_line_items,
  public.payroll_anomalies,
  public.salary_slips,
  public.payroll_email_queue,
  public.payroll_settings,
  public.payroll_audit_logs
TO service_role;
