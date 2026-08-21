-- Migration 033: Payroll Invoices Fix
-- Adds employee_id, payroll_period_id, pdf_base64, and invoice_pdf_name columns to invoices table.
-- Adds invoice_id column to payroll_email_queue table.
-- Enforces uniqueness for payroll-generated invoices.

-- 1. Alter invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pdf_base64 TEXT,
  ADD COLUMN IF NOT EXISTS invoice_pdf_name TEXT;

-- Unique constraint for payroll-generated invoices (one per employee per period)
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_payroll_period_unique;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_payroll_period_unique UNIQUE (employee_id, payroll_period_id);

-- 2. Alter payroll_email_queue table
ALTER TABLE public.payroll_email_queue
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
