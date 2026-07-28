/**
 * Apply migration 022 (fix project audit trigger) via Supabase Management API.
 * Needs SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens) in env or .env.local
 *
 * Fallback: prints SQL to paste into Supabase SQL Editor.
 *
 * Run: node scripts/apply-migration-022.mjs
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
const sql = readFileSync(
  resolve(root, "supabase/migrations/022_fix_project_audit_trigger.sql"),
  "utf8"
);
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = url ? new URL(url).hostname.split(".")[0] : null;

if (token && projectRef) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  console.log("Status:", res.status);
  console.log(text);
  if (res.ok) {
    console.log("Migration 022 applied successfully.");
    process.exit(0);
  }
  console.error("Management API failed. Paste the SQL below in the SQL Editor instead.\n");
}

console.log("--- Copy everything below into Supabase → SQL Editor → Run ---\n");
console.log(sql);
console.log("\n--- End SQL ---");
console.log(
  `\nOpen: https://supabase.com/dashboard/project/${projectRef ?? "YOUR_REF"}/sql/new`
);
process.exit(token ? 1 : 0);
