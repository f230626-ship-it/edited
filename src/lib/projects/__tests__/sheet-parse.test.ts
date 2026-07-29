import {
  deriveProjectValue,
  mapSheetHeaders,
  normalizeProjectStatus,
  parseDate,
  parseMoney,
  parseProjectSheetRows,
} from "@/lib/projects/sheet-parse";

describe("projects sheet parse", () => {
  const HEADERS = [
    "Client Name ",
    "Project Name",
    "Project Type",
    "Total Contract Value",
    "Payment Structure (Milestones / Monthly)",
    "Start Date",
    "Project Rate",
    "Project Status",
    "Expected Monthly Revenue (MRR if recurring)",
    "Assigned Resource",
    "Profile Name",
    "Assigned BD",
    "End Date",
  ];

  it("maps MindVista sheet headers exactly", () => {
    const map = mapSheetHeaders(HEADERS);
    expect(map.client_name).toBe(0);
    expect(map.name).toBe(1);
    expect(map.project_type).toBe(2);
    expect(map.business_model).toBe(3);
    expect(map.payment_structure).toBe(4);
    expect(map.start_date).toBe(5);
    expect(map.project_rate).toBe(6);
    expect(map.status).toBe(7);
    expect(map.expected_monthly_revenue).toBe(8);
    expect(map.dev_name).toBe(9);
    expect(map.profile_name).toBe(10);
    expect(map.bd_name).toBe(11);
    expect(map.expected_delivery_date).toBe(12);
  });

  it("parses money and ignores B2C digit leak", () => {
    expect(parseMoney("B2C")).toBe(0);
    expect(parseMoney("1.5K")).toBe(1500);
    expect(parseMoney("2k$")).toBe(2000);
    expect(parseMoney("4,800$")).toBe(4800);
    expect(parseMoney("7,500$")).toBe(7500);
  });

  it("parses sheet dates", () => {
    expect(parseDate("24-March-2026")).toBe("2026-03-24");
    expect(parseDate("12-Jun-2026")).toBe("2026-06-12");
    expect(parseDate("07-04-26")).toBe("2026-04-07");
    expect(parseDate("4-June-2026")).toBe("2026-06-04");
  });

  it("normalizes sheet statuses", () => {
    expect(normalizeProjectStatus("Active")).toBe("In Progress");
    expect(normalizeProjectStatus("Ended")).toBe("Completed");
    expect(normalizeProjectStatus("Trial started")).toBe("Onboarding");
    expect(normalizeProjectStatus("Trail Started")).toBe("Onboarding");
  });

  it("derives value from rate/MRR when contract value is B2B/B2C", () => {
    expect(
      deriveProjectValue({
        explicitValue: 0,
        projectRate: "7,500$",
        mrr: null,
        projectType: "Fixed Price",
      })
    ).toBe(7500);
    expect(
      deriveProjectValue({
        explicitValue: 0,
        projectRate: "$30/h",
        mrr: 5000,
        projectType: "Full Time",
      })
    ).toBe(5000);
  });

  it("parses a full MindVista sheet row", () => {
    const rows = parseProjectSheetRows([
      HEADERS,
      [
        "Ian",
        "Soluitons9",
        "Fixed Price",
        "B2B",
        "Monthly",
        "13-April-2026",
        "7,500$",
        "Active",
        "",
        "Fatima + Looking for GHL",
        "Fiza, Face (Abdullah) ",
        "Asim",
        "",
      ],
    ]);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.name).toBe("Soluitons9");
    expect(row.client_name).toBe("Ian");
    expect(row.business_model).toBe("B2B");
    expect(row.payment_structure).toBe("Monthly");
    expect(row.project_rate).toBe("7,500$");
    expect(row.value).toBe(7500);
    expect(row.status).toBe("In Progress");
    expect(row.dev_name).toBe("Fatima + Looking for GHL");
    expect(row.bd_name).toBe("Asim");
    expect(row.profile_name).toBe("Fiza, Face (Abdullah)");
    expect(row.start_date).toBe("2026-04-13");
  });
});
