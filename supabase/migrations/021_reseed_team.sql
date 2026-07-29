-- ============================================================================
-- Migration 021: Reseed the core team
-- Deletes all existing auth users + employee rows, then recreates the 6
-- team members with confirmed emails and correct hierarchy.
--
-- Paste into Supabase SQL Editor → Run
-- ============================================================================

-- ── 1. Disable triggers that fire on delete (prevents FK errors in notifications) ──
SET session_replication_role = replica;

-- ── 2. Wipe dependent data first, then employees, then auth users ───────────
DELETE FROM notifications WHERE id IS NOT NULL;
DELETE FROM employees WHERE id IS NOT NULL;
DELETE FROM auth.users WHERE id IS NOT NULL;

-- ── Re-enable triggers ──────────────────────────────────────────────────────
SET session_replication_role = DEFAULT;

-- ── 3. Reset employee_code sequence ────────────────────────────────────────
SELECT setval('employee_code_seq', 1, false);

-- ── 4. Ensure departments exist ────────────────────────────────────────────
INSERT INTO departments (name, description)
VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Operations',  'Business operations and administration')
ON CONFLICT (name) DO NOTHING;

-- ── 5. Create auth users with confirmed emails ─────────────────────────────
-- Password hash below is bcrypt for: MindVista@Dev2026
-- We insert directly into auth.users so email is pre-confirmed with no
-- email-verification step required.

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  -- 01  Abdullah Shafiq (Admin)
  (
    '00000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'mabdullahshafiq100@gmail.com',
    crypt('MindVista@Dev2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Abdullah Shafiq"}',
    NOW(), NOW(), 'authenticated', 'authenticated',
    '', '', '', ''
  ),
  -- 02  Fatima Amer (Software Engineer)
  (
    '00000001-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'faamer003@gmail.com',
    crypt('MindVista@Dev2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Fatima Amer"}',
    NOW(), NOW(), 'authenticated', 'authenticated',
    '', '', '', ''
  ),
  -- 03  Momina Waqar (Asst Software Engineer)
  (
    '00000001-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'mominawaqar18@gmail.com',
    crypt('MindVista@Dev2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Momina Waqar"}',
    NOW(), NOW(), 'authenticated', 'authenticated',
    '', '', '', ''
  ),
  -- 04  Faizan Mehmood (Asst Business Developer)
  (
    '00000001-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'work.faizan81@gmail.com',
    crypt('MindVista@Dev2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Faizan Mehmood"}',
    NOW(), NOW(), 'authenticated', 'authenticated',
    '', '', '', ''
  ),
  -- 05  Asim Ali (Asst Business Developer)
  (
    '00000001-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'asimtassaduqwork@gmail.com',
    crypt('MindVista@Dev2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Asim Ali"}',
    NOW(), NOW(), 'authenticated', 'authenticated',
    '', '', '', ''
  ),
  -- 06  Abdullah Haroon (Intern Business Developer)
  (
    '00000001-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'abdullahharoon681@gmail.com',
    crypt('MindVista@Dev2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Abdullah Haroon"}',
    NOW(), NOW(), 'authenticated', 'authenticated',
    '', '', '', ''
  );

-- ── 6. Create employee rows ─────────────────────────────────────────────────

-- 01  Abdullah Shafiq — Admin, no manager
INSERT INTO employees (
  user_id, full_name, email, designation, role,
  employment_type, work_location, status,
  department_id, manager_id, employee_code, joining_date
)
SELECT
  '00000001-0000-0000-0000-000000000001',
  'Abdullah Shafiq', 'mabdullahshafiq100@gmail.com',
  'CEO / Admin', 'admin',
  'full_time', 'onsite', 'active',
  d.id, NULL, '01', CURRENT_DATE
FROM departments d WHERE d.name = 'Operations';

-- 02  Fatima Amer — Manager, reports to Abdullah
INSERT INTO employees (
  user_id, full_name, email, designation, role,
  employment_type, work_location, status,
  department_id, manager_id, employee_code, joining_date
)
SELECT
  '00000001-0000-0000-0000-000000000002',
  'Fatima Amer', 'faamer003@gmail.com',
  'Software Engineer', 'manager',
  'full_time', 'onsite', 'active',
  d.id,
  (SELECT id FROM employees WHERE email = 'mabdullahshafiq100@gmail.com'),
  '02', CURRENT_DATE
FROM departments d WHERE d.name = 'Engineering';

-- 03  Momina Waqar — Employee, reports to Fatima
INSERT INTO employees (
  user_id, full_name, email, designation, role,
  employment_type, work_location, status,
  department_id, manager_id, employee_code, joining_date
)
SELECT
  '00000001-0000-0000-0000-000000000003',
  'Momina Waqar', 'mominawaqar18@gmail.com',
  'Assistant Software Engineer', 'employee',
  'full_time', 'onsite', 'active',
  d.id,
  (SELECT id FROM employees WHERE email = 'faamer003@gmail.com'),
  '03', CURRENT_DATE
FROM departments d WHERE d.name = 'Engineering';

-- 04  Faizan Mehmood — Employee, reports to Abdullah
INSERT INTO employees (
  user_id, full_name, email, designation, role,
  employment_type, work_location, status,
  department_id, manager_id, employee_code, joining_date
)
SELECT
  '00000001-0000-0000-0000-000000000004',
  'Faizan Mehmood', 'work.faizan81@gmail.com',
  'Assistant Business Developer', 'employee',
  'full_time', 'onsite', 'active',
  d.id,
  (SELECT id FROM employees WHERE email = 'mabdullahshafiq100@gmail.com'),
  '04', CURRENT_DATE
FROM departments d WHERE d.name = 'Operations';

-- 05  Asim Ali — Employee, reports to Abdullah
INSERT INTO employees (
  user_id, full_name, email, designation, role,
  employment_type, work_location, status,
  department_id, manager_id, employee_code, joining_date
)
SELECT
  '00000001-0000-0000-0000-000000000005',
  'Asim Ali', 'asimtassaduqwork@gmail.com',
  'Assistant Business Developer', 'employee',
  'full_time', 'onsite', 'active',
  d.id,
  (SELECT id FROM employees WHERE email = 'mabdullahshafiq100@gmail.com'),
  '05', CURRENT_DATE
FROM departments d WHERE d.name = 'Operations';

-- 06  Abdullah Haroon — Intern, reports to Abdullah
INSERT INTO employees (
  user_id, full_name, email, designation, role,
  employment_type, work_location, status,
  department_id, manager_id, employee_code, joining_date
)
SELECT
  '00000001-0000-0000-0000-000000000006',
  'Abdullah Haroon', 'abdullahharoon681@gmail.com',
  'Intern Business Developer', 'employee',
  'intern', 'onsite', 'active',
  d.id,
  (SELECT id FROM employees WHERE email = 'mabdullahshafiq100@gmail.com'),
  '06', CURRENT_DATE
FROM departments d WHERE d.name = 'Operations';

-- ── 7. Advance sequence past 06 so next auto-insert starts at 07 ───────────
SELECT setval('employee_code_seq', 6);

-- ── 8. Verify ──────────────────────────────────────────────────────────────
SELECT
  e.employee_code,
  e.full_name,
  e.email,
  e.designation,
  e.role,
  e.employment_type,
  m.full_name AS reports_to
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
ORDER BY e.employee_code;
