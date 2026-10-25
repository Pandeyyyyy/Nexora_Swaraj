-- SAHARAA Group 4: read-only marketplace diagnostics
-- Run individual queries in the Supabase SQL Editor only when investigating an
-- empty verified-worker marketplace. These queries do not change schema or data.
-- They intentionally return aggregate counts and metadata only, never identity
-- documents, phone numbers, authentication data, or other personal details.

-- 1. Profile population by role (customer/worker/admin as present).
SELECT role, count(*) AS profile_count
FROM public.profiles
GROUP BY role
ORDER BY role;

-- 2. Worker-profile verification population.
SELECT verification_status, count(*) AS worker_profile_count
FROM public.worker_profiles
GROUP BY verification_status
ORDER BY verification_status;

-- 3. Whether worker_profiles have a matching worker-role profile.
SELECT
  count(*) AS worker_profiles_total,
  count(*) FILTER (WHERE p.id IS NOT NULL) AS matching_profiles,
  count(*) FILTER (WHERE p.role = 'worker') AS matching_worker_role_profiles,
  count(*) FILTER (WHERE p.id IS NULL) AS missing_profile_rows,
  count(*) FILTER (WHERE p.role IS DISTINCT FROM 'worker') AS non_worker_profile_rows
FROM public.worker_profiles wp
LEFT JOIN public.profiles p ON p.id = wp.id;

-- 4. Verified worker-role profiles, plus the stricter active-service condition
-- required by create_booking_atomic.
SELECT
  count(*) FILTER (WHERE p.role = 'worker' AND wp.verification_status = 'verified') AS verified_worker_profiles,
  count(*) FILTER (
    WHERE p.role = 'worker'
      AND wp.verification_status = 'verified'
      AND s.id IS NOT NULL
      AND s.is_active
  ) AS eligible_verified_workers_with_active_primary_service,
  count(*) FILTER (
    WHERE p.role = 'worker'
      AND wp.verification_status = 'verified'
      AND (s.id IS NULL OR NOT s.is_active)
  ) AS verified_workers_missing_or_using_inactive_primary_service
FROM public.worker_profiles wp
JOIN public.profiles p ON p.id = wp.id
LEFT JOIN public.services s ON s.id = wp.primary_service_id;

-- 5. View result count compared with the verified-worker join above.
SELECT count(*) AS marketplace_worker_count
FROM public.marketplace_workers;

-- 6. Relationship constraints that enforce profile/worker/service IDs.
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid IN ('public.worker_profiles'::regclass, 'public.bookings'::regclass)
ORDER BY table_name::text, constraint_name;

-- 7. Relevant RLS policies. Check these when the view count differs by caller.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'worker_profiles', 'services', 'marketplace_workers')
ORDER BY tablename, policyname;

-- 8. Table/view grants relevant to marketplace discovery.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'worker_profiles', 'services', 'marketplace_workers')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
