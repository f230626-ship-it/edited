-- Migration 027: Deduplicate LinkedIn sales profiles
-- Seed created "Abdullah S." while ZIP upload auto-created "Abdullah Shafiq".
-- Manual create + seed also produced two "Abdul Hafeez" rows.

-- Keep earliest active Abdul Hafeez; deactivate later duplicates
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.sales_profiles
  WHERE lower(name) = 'abdul hafeez'
    AND coalesce(platform, 'linkedin') = 'linkedin'
    AND is_active = true
)
UPDATE public.sales_profiles sp
SET is_active = false,
    notes = coalesce(notes || E'\n', '') || 'Duplicate Abdul Hafeez deactivated by migration 027'
FROM ranked r
WHERE sp.id = r.id AND r.rn > 1;

-- Merge Abdullah S. / Abdullah Shafiq into one active profile named Abdullah Shafiq
WITH abdullah AS (
  SELECT id, name, created_at,
         ROW_NUMBER() OVER (
           ORDER BY
             CASE WHEN lower(name) IN ('abdullah s.', 'abdullah s') THEN 0 ELSE 1 END,
             created_at ASC
         ) AS rn
  FROM public.sales_profiles
  WHERE lower(name) IN ('abdullah s.', 'abdullah s', 'abdullah shafiq')
    AND coalesce(platform, 'linkedin') = 'linkedin'
    AND is_active = true
)
UPDATE public.sales_profiles sp
SET name = 'Abdullah Shafiq',
    is_active = CASE WHEN a.rn = 1 THEN true ELSE false END,
    notes = CASE
      WHEN a.rn = 1 THEN notes
      ELSE coalesce(notes || E'\n', '') || 'Duplicate of Abdullah Shafiq deactivated by migration 027'
    END
FROM abdullah a
WHERE sp.id = a.id;
