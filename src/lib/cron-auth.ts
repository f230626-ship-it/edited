/**
 * Shared cron auth — fail closed if CRON_SECRET is missing or Bearer token mismatches.
 */
export function assertCronAuthorized(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
