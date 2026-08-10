import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^"|"$/g, "");
}

async function testDeduplication() {
  console.log("=== TESTING SINGLE-SEND DEDUPLICATION LOGIC ===");

  // 1. Test Slack reminder deduplication
  const { runLinkedInExportReminderCron } = await import("../src/actions/linkedin-outreach.ts");
  console.log("\n1. Testing Slack Reminder deduplication (force=false)...");
  const reminderResult = await runLinkedInExportReminderCron(false);
  console.log("Slack Reminder Deduplication Result:", reminderResult);

  // 2. Test Admin PDF report deduplication
  const { runMonthlyReportGeneration } = await import("../src/lib/linkedin/monthly-report.ts");
  console.log("\n2. Testing Admin Email Report deduplication (force=false)...");
  const reportResult = await runMonthlyReportGeneration(false);
  console.log("Admin Email Report Deduplication Result:", reportResult);
}

testDeduplication().catch(console.error);
