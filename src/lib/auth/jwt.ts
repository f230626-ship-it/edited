/**
 * JWT verification using jose with JWKS support.
 *
 * Modern Supabase projects use ES256 (P-256 asymmetric keys) instead of HS256.
 * We fetch the public key from the JWKS endpoint and verify signatures locally.
 *
 * No secret key needed — the JWKS endpoint is public by design.
 * This is MORE secure than shared secrets (HS256).
 *
 * JWKS endpoint: https://<project>.supabase.co/auth/v1/.well-known/jwks.js
 *
 * This module runs server-side only (Node.js + Edge runtime compatible via jose).
 */

import { createRemoteJWKSet, jwtVerify, type JWTVerifyResult, errors as JoseErrors } from "jose";
import type { JwtClaims } from "@/lib/auth/types";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Supabase sets `aud` to "authenticated" for signed-in users.
 */
const EXPECTED_AUDIENCE = "authenticated";

// ─── JWKS (lazy-loaded, cached by jose) ───────────────────────────────────
// createRemoteJWKSet caches keys internally and refetches when they rotate.

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (_jwks) return _jwks;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Cannot construct JWKS endpoint."
    );
  }

  // Standard Supabase JWKS endpoint
  const jwksUrl = new URL("/auth/v1/.well-known/jwks.json", supabaseUrl);

  _jwks = createRemoteJWKSet(jwksUrl);
  return _jwks;
}

// ─── Result type ───────────────────────────────────────────────────────────

export type JwtVerifySuccess = {
  ok: true;
  claims: JwtClaims;
};

export type JwtVerifyFailure = {
  ok: false;
  reason:
    | "EXPIRED"
    | "NOT_YET_VALID"
    | "INVALID_SIGNATURE"
    | "INVALID_ISSUER"
    | "INVALID_AUDIENCE"
    | "MISSING_CONFIG"
    | "JWKS_ERROR"
    | "MALFORMED"
    | "UNKNOWN";
  /** Server-only detail — never forward to client */
  detail: string;
};

export type JwtVerifyResult = JwtVerifySuccess | JwtVerifyFailure;

// ─── Core verifier ─────────────────────────────────────────────────────────

/**
 * Verify a Supabase-issued JWT using JWKS.
 *
 * Checks:
 *  - ES256 signature against public key from JWKS endpoint
 *  - `exp` (not expired)
 *  - `nbf` (not used before valid time)
 *  - `iss` matches the Supabase project URL
 *  - `aud` is "authenticated"
 *
 * Returns a typed discriminated union — callers must check `result.ok`.
 */
export async function verifySupabaseJwt(
  token: string
): Promise<JwtVerifyResult> {
  let jwks: ReturnType<typeof createRemoteJWKSet>;
  try {
    jwks = getJWKS();
  } catch (err) {
    return {
      ok: false,
      reason: "MISSING_CONFIG",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  // Read issuer from env at call time (not module load time) so tests can override
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // Supabase access tokens use issuer "<projectUrl>/auth/v1", not the bare project URL.
  const expectedIssuer = supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1` : "";

  try {
    const result: JWTVerifyResult = await jwtVerify(token, jwks, {
      audience: EXPECTED_AUDIENCE,
      // Only validate issuer when the URL is available
      ...(expectedIssuer ? { issuer: expectedIssuer } : {}),
      // jose checks exp/nbf automatically; clockTolerance absorbs minor skew
      clockTolerance: 10, // seconds
    });

    return {
      ok: true,
      claims: result.payload as unknown as JwtClaims,
    };
  } catch (err) {
    if (err instanceof JoseErrors.JWTExpired) {
      return { ok: false, reason: "EXPIRED", detail: "Token has expired" };
    }
    if (err instanceof JoseErrors.JWTClaimValidationFailed) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("iss")) {
        return {
          ok: false,
          reason: "INVALID_ISSUER",
          detail: `Issuer mismatch: ${msg}`,
        };
      }
      if (msg.includes("aud")) {
        return {
          ok: false,
          reason: "INVALID_AUDIENCE",
          detail: `Audience mismatch: ${msg}`,
        };
      }
      if (msg.includes("nbf")) {
        return {
          ok: false,
          reason: "NOT_YET_VALID",
          detail: "Token not yet valid (nbf)",
        };
      }
      return { ok: false, reason: "MALFORMED", detail: msg };
    }
    if (
      err instanceof JoseErrors.JWSInvalid ||
      err instanceof JoseErrors.JWSSignatureVerificationFailed
    ) {
      return {
        ok: false,
        reason: "INVALID_SIGNATURE",
        detail: "JWT signature verification failed",
      };
    }
    if (err instanceof JoseErrors.JWTInvalid) {
      return {
        ok: false,
        reason: "MALFORMED",
        detail: err instanceof Error ? err.message : "Malformed JWT",
      };
    }
    if (err instanceof JoseErrors.JWKSNoMatchingKey) {
      return {
        ok: false,
        reason: "JWKS_ERROR",
        detail: "No matching key found in JWKS (token may use rotated/revoked key)",
      };
    }

    return {
      ok: false,
      reason: "UNKNOWN",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Cookie extraction helper ──────────────────────────────────────────────

/**
 * Extract the Supabase access token from the request cookies.
 * @supabase/ssr stores the session under `sb-<ref>-auth-token` as a JSON
 * array of chunks, or as a plain JWT string.
 *
 * We check both shapes so this works regardless of SSR library version.
 */
export function extractTokenFromCookieHeader(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...rest] = c.trim().split("=");
      return [k?.trim() ?? "", decodeURIComponent(rest.join("="))];
    })
  );

  // Find the Supabase auth cookie (name contains "auth-token")
  const authKey = Object.keys(cookies).find((k) => k.includes("auth-token"));
  if (!authKey) return null;

  const raw = cookies[authKey];
  if (!raw) return null;

  // Shape 1: plain JWT string
  if (raw.startsWith("eyJ")) return raw;

  // Shape 2: JSON array of base64 chunks (chunked cookie)
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const joined = (parsed as string[]).join("");
      // The joined value is itself JSON: ["access_token","..."]
      const inner: unknown = JSON.parse(joined);
      if (Array.isArray(inner) && typeof inner[0] === "string") {
        return inner[0];
      }
    }
  } catch {
    // Not JSON — fall through
  }

  return null;
}
