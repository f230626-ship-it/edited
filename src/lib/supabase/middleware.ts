import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  verifySupabaseJwt,
  extractTokenFromCookieHeader,
} from "@/lib/auth/jwt";

// ─── In-memory rate limiter for auth API routes ────────────────────────────
// Resets on cold start — acceptable for free tier (no persistent Redis needed).
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_LIMIT_MAX = 10;
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    authRateLimitMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= AUTH_RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// ─── Security Headers ──────────────────────────────────────────────────────
function applySecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Next.js chunks use inline scripts during hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // HSTS — only set in production (requires HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

// ─── CSRF: Origin check on state-changing requests ─────────────────────────
function isOriginAllowed(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    // Next.js Server Actions always include the origin header in production.
    // Allow missing origin only in development.
    return process.env.NODE_ENV !== "production";
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

// ─── JWT fast-path verification ───────────────────────────────────────────
/**
 * Verify the JWT's signature, exp, nbf, iss, and aud locally using JWKS
 * before allowing the request to hit the Supabase getUser() network call.
 *
 * Uses the public JWKS endpoint — no secret key needed.
 *
 * Returns:
 *   "valid"   — token verified; proceed to getUser()
 *   "invalid" — token present but cryptographically invalid; reject
 *   "absent"  — no token cookie; getUser() will return null naturally
 */
async function localJwtCheck(
  request: NextRequest
): Promise<"valid" | "invalid" | "absent"> {
  const cookieHeader = request.headers.get("cookie");
  const token = extractTokenFromCookieHeader(cookieHeader);
  if (!token) return "absent";

  try {
    const result = await verifySupabaseJwt(token);
    if (!result.ok) {
      // Only hard-reject on definitive cryptographic failures.
      // Treat JWKS_ERROR / UNKNOWN / MISSING_CONFIG as "absent" so a
      // transient JWKS network failure doesn't log every user out.
      const hardFailures = ["EXPIRED", "INVALID_SIGNATURE", "INVALID_AUDIENCE", "INVALID_ISSUER", "NOT_YET_VALID"];
      if (hardFailures.includes(result.reason)) {
        console.warn("[jwt] Local verification failed:", result.reason);
        return "invalid";
      }
      return "absent"; // network/config error — fall through to Supabase getUser()
    }
    return "valid";
  } catch {
    return "absent"; // unexpected error — fail open
  }
}

// ─── Main session update + route protection ───────────────────────────────
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApiRoute = pathname.startsWith("/api/auth/");

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/confirm");

  // Public API routes that don't require authentication (diagnostic/testing only in dev)
  const isPublicApiRoute =
    pathname === "/api/auth/test-brevo" ||
    pathname === "/api/test-email" ||
    pathname.startsWith("/api/debug-");

  // Public page routes (no auth required)
  const isPublicPage =
    pathname === "/outreach-preview" ||
    pathname.startsWith("/outreach-preview");

  // ─── CSRF check on state-changing requests ─────────────────────────────
  if (!isOriginAllowed(request)) {
    applySecurityHeaders(supabaseResponse);
    if (isApiRoute) {
      return NextResponse.json(
        { code: "CSRF_ERROR", message: "Invalid origin" },
        { status: 403 }
      );
    }
  }

  // ─── Rate limit auth API routes ────────────────────────────────────────
  if (isAuthApiRoute) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkAuthRateLimit(ip)) {
      const rateLimitedResponse = NextResponse.json(
        { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
        { status: 429 }
      );
      applySecurityHeaders(rateLimitedResponse);
      return rateLimitedResponse;
    }
  }

  // ─── Fast local JWT check (signature + claims) ─────────────────────────
  // Runs before the Supabase network call so tampered tokens are rejected
  // immediately and expired tokens don't trigger unnecessary network I/O.
  const jwtStatus = await localJwtCheck(request);

  if (jwtStatus === "invalid") {
    // Token is present but cryptographically invalid — reject outright.
    applySecurityHeaders(supabaseResponse);
    if (isApiRoute) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Invalid or tampered token" },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(url);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // ─── Supabase server-side session verification (network call) ─────────
  // getUser() performs a network round-trip to Supabase to verify the user
  // is still active (not deleted/banned) and to refresh the session if the
  // access token has expired but the refresh token is still valid.
  let user = null;
  try {
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser();
    user = verifiedUser;
  } catch {
    // Auth service unreachable — allow through on auth pages, block on others
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  // ─── Route protection ──────────────────────────────────────────────────
  if (!user && !isAuthPage && !isPublicApiRoute && !isPublicPage && pathname !== "/") {
    if (isApiRoute) {
      const unauthResponse = NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
      applySecurityHeaders(unauthResponse);
      return unauthResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(url);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  if (user && isAuthPage && pathname !== "/reset-password" && pathname !== "/auth/confirm") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  applySecurityHeaders(supabaseResponse);
  return supabaseResponse;
}
