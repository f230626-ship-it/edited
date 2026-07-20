# MindVista HRMS — Full Functionality Audit (Developer Feedback)

**Date:** 20 July 2026  
**Environment audited:** Production DB + `https://hrms.mindvista.io` + local `main` @ `91e70f8`  
**Audience:** Development team (actionable findings)  
**Build:** `npm run build` ✅ passes locally after MetricGlowCard fix  

---

## Executive verdict

| Area | Status | Notes |
|------|--------|-------|
| Production build | ✅ Pass | TypeScript OK on current main |
| Core portal routes / auth redirects | ✅ Pass | Unauthenticated users redirect to login |
| Mobile navigation shell | ✅ Pass | Hamburger + drawer + overlay implemented |
| Role / data isolation (intended design) | ⚠️ Partial | Several RBAC helpers and route guards are inconsistent |
| Leave workflow | ❌ Broken for current data | All employees have `lead_id = null` / `manager_id = null` |
| Login readiness for real users | ⚠️ Critical | Orphan auth accounts; admin password needed reset during audit |
| Responsive / typography | ⚠️ Needs polish | Nav OK; dense tables + tiny fonts weak on mobile |
| Notification forge (RLS) | ✅ Pass (now) | Direct INSERT returns 403 |

**Overall:** App is **conditionally launchable for admin desktop use**, but **not ready for full multi-role production** until hierarchy, orphan accounts, and RBAC inconsistencies are fixed.

---

## What’s implemented (module inventory)

### Auth
- Login, logout, forgot-password, reset-password, Brevo/custom email provider path, auth confirm route
- Middleware JWT checks + CSRF/security headers

### Employee portal
- Dashboard, My Team, Team hierarchy, Leave, Policies, Assets, Attendance, Profile, My Performance
- Sales (gated): my-day, my-progress, leads, meetings, history, alerts (+ owner: command, weekly, analytics, teams, admin profiles/targets)

### Admin
- Employees (list/new/detail), Leave approvals, Performance, Assets, Policies, Holidays, Departments, Attendance, Teams

### Projects / CRM
- Projects list/detail/edit/new, import dialog, metric strip, resource assignment

### Supporting
- Notifications bell, theme switcher, email validation on employee create (EmailVerify.io when keyed)

---

## Automated / live test results

### Suites run
1. `scripts/e2e-test.mjs` — **failed at setup** (expects `dev@mindvista.io` employee row; no longer present)
2. Custom full audit script → `docs/FULL_AUDIT_RESULTS.json` — **31 pass / 8 fail**
3. Responsive/typography code audit (layout + tables + fonts)
4. Production HTTP checks for public/protected routes
5. Live Supabase auth + RLS probes

### Key live findings (production DB — 6 employees)

| Email | Role | Designation | manager_id | lead_id | Auth linked |
|-------|------|-------------|------------|---------|-------------|
| mabdullahshafiq100@gmail.com | admin | CEO / Admin | null | null | ✅ linked |
| faamer003@gmail.com | manager | Software Engineer | null | null | ✅ |
| mominawaqar18@gmail.com | employee | Software Engineer | null | null | ✅ |
| asimtassaduqwork@gmail.com | employee | Business Developer | null | null | ✅ |
| work.faizan81@gmail.com | employee | Business Developer | null | null | ✅ |
| abdullahharoon681@gmail.com | employee | Intern Business Developer | null | null | ✅ |

**Orphan Auth users (can login, no `employees.user_id` link):**
- `admin@mindvista.io`
- `dev@mindvista.io`
- `sarah.lead@mindvista.io`
- `fatima.dev@mindvista.io`

These hit `requireAuth()` → redirect `/login?error=no_employee_profile`.

---

## P0 — Must fix before multi-user launch

### 1. Team hierarchy is empty for every employee
**Evidence:** All 6 employees have `manager_id = null` and `lead_id = null`.

**Impact:**
- Leave apply is blocked in UI (`applyLeave` requires `lead_id`)
- “My Team” / hierarchy tree have nothing meaningful
- Manager approvals cannot work

**Dev action:** Seed/assign `manager_id` + `lead_id` for every non-admin employee. Add admin UI validation so new employees cannot be saved without a lead.

### 2. Real admin login was failing during audit
Account `mabdullahshafiq100@gmail.com` is correctly linked, but password login failed until reset again during this audit to `MindVista@Admin2026`.

**Dev action:** Confirm stable admin credentials; document password reset process; avoid relying on orphan `admin@` / `dev@` accounts.

### 3. Orphan auth accounts pollute QA and support
Auth users exist without employee profiles.

**Dev action:** Either delete orphan auth users or re-link them to employee rows. Update E2E scripts to use current production accounts.

### 4. Projects RBAC mismatch (route vs action vs RLS)
| Layer | Behavior |
|-------|----------|
| Sidebar / `/projects` page | admin only (`requireRole("admin")`) |
| `/projects/new` | **`requireAuth()` only** — any logged-in user can open form |
| `createProject` / `updateProject` actions | **`requireAuth()` only** |
| RLS insert | checks **`pm_role = 'admin'`** (migration 006) |

**Critical:** CEO admin has `pm_role = 'developer'`, so RLS may block project create even for HR `role=admin`.

**Dev action:**
1. Guard `/projects/new` and all project mutations with `requireRole("admin")` (or consistent PM role)
2. Align RLS with `employees.role = 'admin'` **or** set `pm_role='admin'` for true admins
3. Stop using `createAdminClient()` on pages that should remain RLS-scoped for non-admins unless intentional

### 5. `isManagerOrAdmin()` is incorrect
```ts
// src/lib/auth.ts
export function isManagerOrAdmin(role) {
  return role === "admin"; // managers excluded!
}
```
Unit tests in `src/__tests__/rbac.test.ts` still expect `manager === true`.

**Dev action:** Fix helper to `role === "admin" || role === "manager"` **or** update all call sites + tests to the new policy intentionally.

### 6. Manager leave approvals removed from management nav
`/admin/leaves` uses `requireRole("admin")` and sidebar Leave Approvals is admin-only. Managers cannot use admin leave UI even when they are leads.

**Dev action:** Restore manager access to leave approvals **or** ensure leave approvals only happen on employee Leave page via lead scoping — document the intended flow.

---

## P1 — Should fix soon

### 7. Sales access uses designation string matching
`canAccessSales` / sidebar check `"business developer"` / `"bd"` in designation. Intern BD also matches. Fragile.

**Dev action:** Prefer `pm_role = 'bd'` as source of truth; keep designation as fallback only. Ensure BD employees have `pm_role='bd'`.

### 8. Profile not in primary nav
Profile is only in sidebar footer card + header dropdown — easy to miss on mobile.

**Dev action:** Add “Profile” back to `employeeNav` or label footer more clearly (“My Profile”).

### 9. PageHeader not mobile-safe
`components/ui/page-header.tsx` uses horizontal `justify-between` without `flex-col sm:flex-row`. Crowds titles/actions on phones.

### 10. Dense tables on mobile
Projects table (~13 columns, `minWidth: 900px`) relies on horizontal scroll only — no card layout. Nested `overflow-x-auto` wrappers in projects/sales.

### 11. Typography: excessive sub-11px fonts
~175 uses of `text-[9px]` / `text-[10px]` / `text-[11px]`; many without `sm:` scale. Sidebar designation and header badge use `text-[9px]`.

**Dev action:** Minimum readable size ≥ `text-xs` (12px) on mobile; bump labels with `sm:text-sm`.

### 12. Inter loaded via Google Fonts `<link>` not `next/font`
Works, but can FOUT; prefers network.

### 13. E2E suite outdated
`scripts/e2e-test.mjs` still depends on deleted seed users (`dev@` employee, ali/sarah employee rows).

**Dev action:** Point suite at current accounts or recreate seed fixtures.

### 14. Local env gaps for email validation / Brevo
`.env.local` has no `EMAIL_PROVIDER` / `EMAILVERIFY_API_KEY`. Confirm Vercel production env has Brevo + EmailVerify keys if those features are required.

### 15. Test/debug routes still shipped
`/test-email`, `/api/test-email`, `/api/auth/test-brevo`, `/api/run-migration` appear in build output — risk if unauthenticated or weakly guarded.

**Dev action:** Protect with admin-only auth or remove from production builds.

---

## P2 — Nice to have / polish

- Drawer a11y: Escape to close, focus trap
- Tablet (768–1023): still drawer-only; consider persistent sidebar from `md`
- Team hierarchy horizontal pan UX on touch
- Import dialog tiny fonts
- Double horizontal scroll containers around `Table`

---

## Access matrix (current intended vs observed)

| Capability | Employee | Manager | Admin | Notes |
|------------|:--------:|:-------:|:-----:|-------|
| Dashboard / Leave / Policies / Assets | ✅ | ✅ | ✅ | Leave apply needs `lead_id` |
| My Team | ✅ | ✅ | ✅ | Empty until hierarchy set |
| Projects list | ❌ | ❌ | ✅ | Sidebar + page guarded |
| Projects create form URL | ⚠️ | ⚠️ | ✅ | Page only `requireAuth` |
| Sales nav | designation BD | ❌ | ✅ | String match |
| Admin employees | ❌ | ❌ | ✅ | also hr / developer via `requireAdminAccess` |
| Admin leave approvals | ❌ | ❌ | ✅ | managers excluded |
| Forge notifications via API | ❌ | ❌ | ❌ | 403 observed |

---

## Responsive & font summary

### Working
- Mobile hamburger + off-canvas sidebar + backdrop + body scroll lock (`app-shell-client.tsx`)
- Responsive content padding / max width
- Inter as global `--font-sans`
- Several pages use good grids (`sm:` / `md:` / `lg:`)

### Not good enough yet
- Tiny fixed fonts (`9–10px`) across sidebar/header/tables
- Projects / sales tables mobile UX (scroll-only)
- Shared `PageHeader` stacking
- Profile discoverability on small screens

---

## Security summary

| Check | Result |
|-------|--------|
| Anonymous cannot read employees | ✅ |
| Unauthenticated portal routes redirect | ✅ |
| Notification direct INSERT | ✅ blocked (403) |
| Project mutations authz | ❌ too weak (`requireAuth` only) |
| Project insert RLS vs HR admin `pm_role` | ⚠️ likely mismatch |
| Orphan auth accounts | ⚠️ support/security confusion |
| Admin client used on several portal pages | ⚠️ bypasses RLS for reads |

---

## Recommended developer sprint (ordered)

1. **Data:** Assign manager/lead for all employees; verify leave apply → notify → approve end-to-end  
2. **Auth hygiene:** Delete or re-link orphan auth users; document real admin login  
3. **RBAC:** Fix `isManagerOrAdmin`; align projects page/actions/RLS/`pm_role`  
4. **Guard:** `requireRole("admin")` on `/projects/new` + project server actions  
5. **QA:** Rewrite E2E for current 6-employee org + BD designation cases  
6. **Mobile:** PageHeader stack, bump 9–10px fonts, projects card view or column priority  
7. **Prod hardening:** Lock/remove test API routes; confirm Brevo + EmailVerify env on Vercel  

---

## How to re-run checks

```bash
npm run build
node scripts/e2e-test.mjs          # currently broken until seed users restored
# custom live audit results:
cat docs/FULL_AUDIT_RESULTS.json
```

---

## Sign-off for sharing

| Question | Answer |
|----------|--------|
| Can we demo to stakeholders on desktop as admin? | **Yes, with caveats** |
| Can all employees use leave/team flows today? | **No** — hierarchy empty |
| Is mobile “font responsive” production-grade? | **No** — needs typography + table polish |
| Is security launch-safe? | **Mostly**, except project mutation guards + pm_role RLS alignment |

**Prepared for developer feedback loop — prioritize P0 items before expanding user rollout.**
