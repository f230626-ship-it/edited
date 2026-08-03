import { readFileSync } from "fs";
import { parseCSV } from "../src/lib/linkedin/parser";

async function main() {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(
    readFileSync("fixtures/linkedin-exports/complete-2026-08/fiza-s.zip")
  );
  const text = await zip.files["messages.csv"].async("text");
  console.log("raw bytes", text.length, "newline splits", text.split("\n").length);
  const data = parseCSV(text);
  console.log("parsed rows", data.length);

  const months: Record<string, number> = {};
  const fromOwnerMonths: Record<string, number> = {};
  for (const r of data) {
    const d = String(r["DATE"] || "");
    const m = d.match(/^(\d{4}-\d{2})/);
    const key = m ? m[1] : `other:${d.slice(0, 20)}`;
    months[key] = (months[key] || 0) + 1;
    if (String(r["FROM"] || "") === "Fiza S.") {
      fromOwnerMonths[key] = (fromOwnerMonths[key] || 0) + 1;
    }
  }
  console.log("by month", Object.fromEntries(Object.entries(months).sort()));
  console.log("from Fiza by month", Object.fromEntries(Object.entries(fromOwnerMonths).sort()));

  // Folder breakdown for July
  const folders: Record<string, number> = {};
  for (const r of data) {
    if (!String(r["DATE"] || "").startsWith("2026-07")) continue;
    const f = String(r["FOLDER"] || "?");
    folders[f] = (folders[f] || 0) + 1;
  }
  console.log("july folders", folders);

  // Sample a few FROM values that might be owner aliases
  const fromSet = new Set<string>();
  for (const r of data) {
    if (!String(r["DATE"] || "").startsWith("2026-07")) continue;
    fromSet.add(String(r["FROM"] || ""));
  }
  console.log("july unique FROM", [...fromSet].slice(0, 40));
}

main().catch(console.error);
