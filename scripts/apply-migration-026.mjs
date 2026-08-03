/**
 * Apply migration 026 via Supabase Management API.
 * Needs SUPABASE_ACCESS_TOKEN in env or .env.local
 * (Dashboard → Account → Access Tokens).
 *
 * Fallback: prints SQL for the SQL Editor.
 *
 * Run: node scripts/apply-migration-026.mjs
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
    if (!process.env[trimmed.slice(0, eq)]) {
      process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"|"$/g, "");
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const sql = readFileSync(
  resolve(root, "supabase/migrations/026_linkedin_profile_stats.sql"),
  "utf8"
);

if (!url) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN — paste this SQL in Supabase → SQL Editor:\n");
  console.log(sql);
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const text = await res.text();
console.log("Status:", res.status);
console.log(text);
if (!res.ok) process.exit(1);
console.log("Migration 026 applied successfully.");
