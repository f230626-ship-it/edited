/**
 * Backfill script: Fetch recent standup messages from Slack channels
 * and insert any missing entries into the database.
 *
 * Usage: node scripts/backfill-standups.js
 */

const https = require("https");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CHANNELS = [
  { id: "C0ABTT2V884", name: "Development" },
  { id: "C0AUWEKB882", name: "Sales" },
];

// ─── Slack API helper ───
function slackApi(method, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const req = https.request(
      {
        hostname: "slack.com",
        path: "/api/" + method + "?" + qs,
        method: "GET",
        headers: { Authorization: "Bearer " + SLACK_TOKEN },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error("Invalid JSON: " + data.slice(0, 200))); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// ─── Standup keyword detection (simplified, mirrors gemini-parser.ts) ───
const STANDUP_KEYWORDS = [
  "standup", "stand-up", "stand up", "daily update", "daily report",
  "completed", "in progress", "blocker", "todo", "today i", "yesterday i",
  "worked on", "finished", "shipped", "deployed", "reviewed", "fixed",
  "developed", "implemented", "tested", "debugged", "merged",
  "daily stand", "check in", "checked in", "day started",
  "outreach", "first message", "connection", "follow-up", "in-mail",
  "project:",
];

function looksLikeStandup(text) {
  if (!text || text.length < 10) return false;
  const lower = text.toLowerCase();
  return STANDUP_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Simple score calculation ───
function simpleScore(text, parsed) {
  const completed = parsed.completed?.length || 0;
  const inProgress = parsed.in_progress?.length || 0;
  const blockers = parsed.blockers?.length || 0;
  let score = completed * 15 + inProgress * 10 - blockers * 10 + 10;
  if (completed === 0 && inProgress === 0 && blockers === 0) score = 10;
  return Math.min(100, Math.max(0, score));
}

// ─── Simple fallback parser ───
function simpleParse(rawText) {
  const completed = [];
  const blockers = [];
  const in_progress = [];
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  let section = null;

  for (const line of lines) {
    const clean = line.replace(/^[-*•\s]+/, "").trim();
    const lower = line.toLowerCase();

    if (/^[-*•]?\s*(completed|done|finished|outreach)/i.test(line)) { section = "completed"; continue; }
    if (/^[-*•]?\s*(blocker|blocked|issue)/i.test(line)) { section = "blockers"; continue; }
    if (/^[-*•]?\s*(in.progress|working|progress|planned|today|connection|follow)/i.test(line)) { section = "in_progress"; continue; }
    if (lower.startsWith("completed") || lower.startsWith("done") || lower.startsWith("project")) { section = "completed"; continue; }
    if (lower.startsWith("blocker") || lower.startsWith("issue")) { section = "blockers"; continue; }
    if (lower.startsWith("in progress") || lower.startsWith("today") || lower.startsWith("working") || lower.startsWith("connection") || lower.startsWith("follow")) { section = "in_progress"; continue; }

    if ((line.startsWith("-") || line.startsWith("*") || line.startsWith("•") || /^\d+[.)]/.test(line)) && clean && clean.toLowerCase() !== "none") {
      if (section === "completed") completed.push(clean);
      else if (section === "blockers") blockers.push(clean);
      else if (section === "in_progress") in_progress.push(clean);
    }
  }

  return { completed, blockers, in_progress };
}

// ─── Main ───
async function main() {
  if (!SLACK_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing env vars: SLACK_BOT_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get employee map by slack_user_id
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, slack_user_id");

  const empBySlackId = new Map();
  (employees || []).forEach((e) => {
    if (e.slack_user_id) empBySlackId.set(e.slack_user_id, e);
  });

  // Get existing message timestamps to avoid duplicates
  const { data: existing } = await supabase
    .from("standup_entries")
    .select("slack_message_ts");
  const existingTs = new Set((existing || []).map((e) => e.slack_message_ts));

  let totalNew = 0;
  let totalSkipped = 0;

  // Fetch messages from last 3 days
  const oldest = (Date.now() / 1000 - 3 * 86400).toString();

  for (const ch of CHANNELS) {
    console.log(`\nFetching from ${ch.name} (${ch.id})...`);
    const result = await slackApi("conversations.history", {
      channel: ch.id,
      oldest,
      limit: "100",
    });

    if (!result.ok) {
      console.error(`  Slack error: ${result.error}`);
      continue;
    }

    const messages = result.messages || [];
    console.log(`  Found ${messages.length} messages`);

    for (const msg of messages) {
      // Skip bot messages, system messages, messages without user
      if (!msg.user || msg.subtype || msg.bot_id) continue;
      if (existingTs.has(msg.ts)) {
        totalSkipped++;
        continue;
      }
      if (!looksLikeStandup(msg.text)) continue;

      const parsed = simpleParse(msg.text);
      const score = simpleScore(msg.text, parsed);
      const emp = empBySlackId.get(msg.user);

      const { error } = await supabase.from("standup_entries").insert({
        employee_id: emp?.id || null,
        slack_user_id: msg.user,
        slack_message_ts: msg.ts,
        channel_id: ch.id,
        raw_text: msg.text,
        completed: parsed.completed,
        blockers: parsed.blockers,
        in_progress: parsed.in_progress,
        performance_score: score,
        parsed_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          // duplicate — skip
          totalSkipped++;
        } else {
          console.error(`  Insert error: ${error.message}`);
        }
      } else {
        totalNew++;
        const date = new Date(parseFloat(msg.ts) * 1000).toISOString().split("T")[0];
        console.log(`  ✓ ${date} | ${emp?.full_name || msg.user} | score=${score} | ${parsed.completed.length} completed, ${parsed.in_progress.length} in-progress`);
      }
    }
  }

  console.log(`\nDone! Inserted: ${totalNew}, Skipped (duplicate): ${totalSkipped}`);
}

main().catch(console.error);
