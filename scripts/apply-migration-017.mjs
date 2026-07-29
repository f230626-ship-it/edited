/**
 * Apply migration 017 to remote Supabase via SQL API.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Run: node scripts/apply-migration-017.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const content = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"|"$/g, "");
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sql = readFileSync(
  resolve(root, "supabase/migrations/017_notifications_insert_rls.sql"),
  "utf8"
);

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];

// Supabase SQL over HTTP (pg-meta) — uses service role
const res = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log("Status:", res.status);
console.log(text);

if (!res.ok) {
  console.error("\nIf this endpoint is unavailable, run the SQL manually in Supabase Dashboard → SQL Editor:");
  console.log(sql);
  process.exit(1);
}

console.log("Migration 017 applied successfully.");
