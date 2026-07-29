import { createBrowserClient } from "@supabase/ssr";

/**
 * Use the default cookie adapter from @supabase/ssr.
 * Custom get/set/remove breaks chunked + base64url session cookies and causes
 * random logouts / refresh_token_not_found loops.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
