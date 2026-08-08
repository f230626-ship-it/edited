import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  verifySupabaseJwt,
  extractTokenFromCookieHeader,
} from "@/lib/auth/jwt";

// ─── In-memory rate limiter for auth API routes ────────────────────────────
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

/** Copy Set-Cookie headers (incl. clears/maxAge) from the Supabase response. */
function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  const setCookies =
    typeof from.headers.getSetCookie === "function"
      ? from.headers.getSetCookie()
      : [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      to.headers.append("Set-Cookie", cookie);
    }
    return to;
  }

  // Fallback if getSetCookie is unavailable
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

function redirectWithSessionCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  const redirectResponse = NextResponse.redirect(url);
  copyCookies(supabaseResponse, redirectResponse);
  applySecurityHeaders(redirectResponse);
  return redirectResponse;
}

function isOriginAllowed(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Local JWT check. Expired tokens are NOT hard failures — Supabase getUser()
 * must refresh them. Only reject cryptographically tampered tokens.
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
      // Let getUser() refresh expired / not-yet-valid tokens.
      const hardFailures = ["INVALID_SIGNATURE", "INVALID_AUDIENCE", "INVALID_ISSUER"];
      if (hardFailures.includes(result.reason)) {
        console.warn("[jwt] Local verification failed:", result.reason);
        return "invalid";
      }
      // EXPIRED / NOT_YET_VALID / JWKS / UNKNOWN → fall through to getUser()
      return "absent";
    }
    return "valid";
  } catch {
    return "absent";
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isPublicApiRoute =
    pathname === "/api/auth/test-brevo" ||
    pathname === "/api/test-email" ||
    pathname.startsWith("/api/cron/");

  if (!isOriginAllowed(request)) {
    applySecurityHeaders(supabaseResponse);
    if (isApiRoute) {
      return NextResponse.json(
        { code: "CSRF_ERROR", message: "Invalid origin" },
        { status: 403 }
      );
    }
  }

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

  const jwtStatus = await localJwtCheck(request);

  // On auth pages, never hard-block — allow login form even with stale cookies.
  if (jwtStatus === "invalid" && !isAuthPage) {
    applySecurityHeaders(supabaseResponse);
    if (isApiRoute) {
      const res = NextResponse.json(
        { code: "UNAUTHORIZED", message: "Invalid or tampered token" },
        { status: 401 }
      );
      copyCookies(supabaseResponse, res);
      applySecurityHeaders(res);
      return res;
    }
    // Clear bad session cookies on the redirect so the browser recovers.
    return redirectWithSessionCookies(request, supabaseResponse, "/login", {
      redirectTo: pathname,
    });
  }

  let user = null;
  try {
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser();
    user = verifiedUser;
  } catch {
    // Auth unreachable — do not wipe cookies; allow auth pages through.
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  if (!user && !isAuthPage && !isPublicApiRoute && pathname !== "/") {
    if (isApiRoute) {
      const unauthResponse = NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
      copyCookies(supabaseResponse, unauthResponse);
      applySecurityHeaders(unauthResponse);
      return unauthResponse;
    }

    // Critical: propagate cookie clears from failed refresh onto the redirect.
    return redirectWithSessionCookies(request, supabaseResponse, "/login", {
      redirectTo: pathname,
    });
  }

  if (user && isAuthPage && pathname !== "/reset-password" && pathname !== "/auth/confirm") {
    return redirectWithSessionCookies(request, supabaseResponse, "/dashboard");
  }

  applySecurityHeaders(supabaseResponse);
  return supabaseResponse;
}
