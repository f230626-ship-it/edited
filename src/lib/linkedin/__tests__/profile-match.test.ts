import { matchSalesProfileId, normalizeProfileLabel } from "@/lib/linkedin/profile-match";

describe("normalizeProfileLabel", () => {
  it("strips punctuation and collapses space", () => {
    expect(normalizeProfileLabel("M. Usama (Sam)")).toBe("m usama sam");
  });
});

describe("matchSalesProfileId", () => {
  const profiles = [
    { id: "1", name: "Fiza S." },
    { id: "2", name: "M. Usama (Sam)" },
    { id: "3", name: "Abdul Hafeez" },
    { id: "4", name: "Abdullah S." },
  ];

  it("matches Fiza", () => {
    expect(matchSalesProfileId("Fiza S.", profiles)).toBe("1");
  });

  it("matches Sam without period", () => {
    expect(matchSalesProfileId("M Usama (Sam)", profiles)).toBe("2");
  });

  it("matches Abdul Hafeez", () => {
    expect(matchSalesProfileId("Abdul Hafeez", profiles)).toBe("3");
  });

  it("matches Abdullah Shafiq to Abdullah S.", () => {
    expect(matchSalesProfileId("Abdullah Shafiq", profiles)).toBe("4");
  });

  it("does not match Abdul Hafeez via substring of Abdullah", () => {
    expect(matchSalesProfileId("Abdullah Shafiq", [{ id: "3", name: "Abdul Hafeez" }])).toBeNull();
  });

  it("returns null when unknown", () => {
    expect(matchSalesProfileId("Unknown Person", profiles)).toBeNull();
  });
});