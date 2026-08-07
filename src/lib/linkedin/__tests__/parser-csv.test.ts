/**
 * Tests for CSV parsing robustness — quoted commas, multiline fields,
 * LinkedIn preamble row detection, and dataset type detection.
 */
import { parseCSV, detectDatasetType } from "@/lib/linkedin/parser";

describe("parseCSV — quoted commas in field values", () => {
  it("treats 'Lahore, Pakistan' as a single field value", () => {
    const csv = [
      "First Name,Last Name,Location",
      `"Abdullah","Shafiq","Lahore, Pakistan"`,
    ].join("\n");
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Location"]).toBe("Lahore, Pakistan");
    expect(rows[0]["First Name"]).toBe("Abdullah");
    expect(rows[0]["Last Name"]).toBe("Shafiq");
  });

  it("handles multiple quoted commas in a single row", () => {
    const csv = [
      "Name,Title,Location",
      `"Smith, John","Director, Sales","New York, NY, USA"`,
    ].join("\n");
    const rows = parseCSV(csv);
    expect(rows[0]["Name"]).toBe("Smith, John");
    expect(rows[0]["Title"]).toBe("Director, Sales");
    expect(rows[0]["Location"]).toBe("New York, NY, USA");
  });
});

describe("parseCSV — multiline quoted content", () => {
  it("keeps newlines inside quoted fields as one value", () => {
    const csv = [
      "CONVERSATION ID,FROM,TO,DATE,CONTENT,FOLDER",
      `c1,Owner,Lead,2026-07-01 10:00:00 UTC,"Hello\nWorld",INBOX`,
      "c1,Lead,Owner,2026-07-01 11:00:00 UTC,Hi,INBOX",
    ].join("\n");
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(String(rows[0].CONTENT)).toContain("Hello");
    expect(String(rows[0].CONTENT)).toContain("World");
    expect(rows[1].FROM).toBe("Lead");
  });

  it("handles escaped double-quotes (\"\")", () => {
    const csv = [
      "Name,Message",
      `"Abdullah","He said ""hello"" to me"`,
    ].join("\n");
    const rows = parseCSV(csv);
    expect(rows[0]["Message"]).toBe(`He said "hello" to me`);
  });
});

describe("parseCSV — LinkedIn preamble rows", () => {
  it("auto-detects header even when LinkedIn prepends a notes row", () => {
    // LinkedIn sometimes prepends a note row before the actual header
    const csv = [
      "Notes: This is a LinkedIn data export",
      "From,To,Sent At,Direction,Message",
      "Owner,Lead A,7/1/26, 10:00 AM,SENT,Hi",
    ].join("\n");
    const rows = parseCSV(csv);
    // Should detect 'From,To,Sent At,Direction,Message' as the header
    expect(rows.length).toBeGreaterThan(0);
    // The data row should be parseable (not the preamble row)
    const dataRow = rows.find((r) => r["From"] === "Owner" || r["Direction"] === "SENT");
    expect(dataRow).toBeDefined();
  });
});

describe("detectDatasetType — path variations", () => {
  it("detects invitations from subdirectory path", () => {
    expect(detectDatasetType("Basic_LinkedInDataExport_07-2026/Invitations.csv")).toBe("invitations");
  });

  it("detects messages from subdirectory path", () => {
    expect(detectDatasetType("export/messages.csv")).toBe("messages");
  });

  it("detects connections", () => {
    expect(detectDatasetType("Connections.csv")).toBe("connections");
  });

  it("detects profile", () => {
    expect(detectDatasetType("Profile.csv")).toBe("profile");
  });

  it("returns unknown for unrecognised file", () => {
    expect(detectDatasetType("randomdata.csv")).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(detectDatasetType("INVITATIONS.CSV")).toBe("invitations");
    expect(detectDatasetType("MESSAGES.CSV")).toBe("messages");
  });
});
