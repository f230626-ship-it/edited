import { describe, expect, it } from "@jest/globals";
import {
  parseFilterPeriod,
  parseProjectsClosed,
  getFilterFreshness,
  scoreDuplicate,
  rowHash,
} from "@/lib/icp/matching";

describe("parseFilterPeriod", () => {
  it("parses day + month", () => {
    const p = parseFilterPeriod("15 June", 2026);
    expect(p.filter_date).toBe("2026-06-15");
    expect(p.period_month).toBe(6);
    expect(p.period_year).toBe(2026);
  });

  it("parses month ranges using last month", () => {
    const p = parseFilterPeriod("FEB to 15 MAR", 2026);
    expect(p.period_month).toBe(3);
  });
});

describe("parseProjectsClosed", () => {
  it("parses closed count and names", () => {
    const p = parseProjectsClosed("2 Closed : John Bush & Pedro");
    expect(p.closedCount).toBe(2);
    expect(p.names.length).toBeGreaterThanOrEqual(2);
  });

  it("parses last-stage pipeline", () => {
    const p = parseProjectsClosed("1 Closed : IAN Magley |  1 In on Last Stage Jack Elderman");
    expect(p.closedCount).toBe(1);
    expect(p.pipelineCount).toBe(1);
  });
});

describe("getFilterFreshness", () => {
  it("marks recent months as avoid", () => {
    const now = new Date(2026, 6, 15); // July 2026
    expect(getFilterFreshness(2026, 7, now).advice).toBe("avoid");
    expect(getFilterFreshness(2026, 6, now).advice).toBe("avoid");
  });

  it("marks old filters as safe to re-run", () => {
    const now = new Date(2026, 6, 15);
    expect(getFilterFreshness(2026, 2, now).advice).toBe("safe");
  });
});

describe("scoreDuplicate", () => {
  it("flags overlapping geography and titles on same profile", () => {
    const match = scoreDuplicate(
      {
        profile_name: "Asim",
        regions: "Seattle, Washington",
        job_titles: "CEO, CTO, Founder",
        past_companies: "Google, Amazon",
        company_headcount: "1-10",
        industry: "Software Development",
      },
      {
        profile_name: "Asim",
        regions: "Seattle Metropolitan Area",
        job_titles: "CEO, Founder",
        past_companies: "Google, Meta",
        company_headcount: "1-10",
        industry: "Software Development",
        period_month: 2,
        period_year: 2026,
        filter_date_raw: "February",
        projects_closed: "2 Closed : John Bush & Pedro",
      }
    );
    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThanOrEqual(0.35);
    expect(match!.closed.closedCount).toBe(2);
    expect(match!.freshness.advice).toBeTruthy();
  });

  it("ignores different profiles", () => {
    const match = scoreDuplicate(
      { profile_name: "Asim", regions: "Seattle" },
      { profile_name: "Fiza", regions: "Seattle" }
    );
    expect(match).toBeNull();
  });
});

describe("rowHash", () => {
  it("is stable for same content", () => {
    const a = rowHash({ profile_name: "SAM", regions: "US", job_titles: "CEO" });
    const b = rowHash({ profile_name: "sam", regions: "us", job_titles: "ceo" });
    expect(a).toBe(b);
  });
});
