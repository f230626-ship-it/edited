import { readFileSync } from "fs";
import { parseCSV, normalizeDate } from "../src/lib/linkedin/parser";

async function main() {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(
    readFileSync("fixtures/linkedin-exports/complete-2026-08/fiza-s.zip")
  );

  for (const name of Object.keys(zip.files)) {
    const bas = name.split("/").pop() || "";
    if (/^invitations\.csv$/i.test(bas)) {
      const data = parseCSV(await zip.files[name].async("text"));
      console.log("inv headers", Object.keys(data[0] || {}));
      console.log("inv sample", data[0]);
      const dirs: Record<string, number> = {};
      for (const r of data) {
        const d = String(r["Direction"] || "?");
        dirs[d] = (dirs[d] || 0) + 1;
      }
      console.log("dirs", dirs);
    }
    if (/^connections\.csv$/i.test(bas)) {
      const data = parseCSV(await zip.files[name].async("text"));
      let ok = 0;
      let bad = 0;
      for (const r of data) {
        if (normalizeDate(r["Connected On"])) ok++;
        else bad++;
      }
      console.log("conn parse", { ok, bad, total: data.length });
    }
    if (/^messages\.csv$/i.test(bas)) {
      const data = parseCSV(await zip.files[name].async("text"));
      const fromCounts: Record<string, number> = {};
      for (const r of data) {
        const f = String(r["From"] || r["FROM"] || "(empty)");
        fromCounts[f] = (fromCounts[f] || 0) + 1;
      }
      const top = Object.entries(fromCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      console.log("msg rows", data.length, "headers", Object.keys(data[0] || {}));
      console.log("top from", top);
      const fiza = data.filter((r) =>
        String(r["From"] || "").toLowerCase().includes("fiza")
      ).length;
      console.log("from includes fiza", fiza);
    }
  }
}

main().catch(console.error);
