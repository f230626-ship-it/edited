-- Block direct client INSERT on notifications (prevents forged spam).
-- System triggers and server actions use SECURITY DEFINER functions or service role.

DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;

-- No INSERT policy for authenticated role = deny all direct API inserts.
-- Existing triggers (leave apply, project updates) run as SECURITY DEFINER and bypass RLS.
