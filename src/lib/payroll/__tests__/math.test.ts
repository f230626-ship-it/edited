import {
  computeCommissionAmount,
  partialProjectRevenue,
  netPay,
  momChangePercent,
} from "@/lib/payroll/math";
import { monthBounds } from "@/lib/payroll/compensation";

describe("payroll math", () => {
  it("computes percentage + fixed commission", () => {
    expect(computeCommissionAmount(20000, 2)).toBe(400);
    expect(computeCommissionAmount(20000, 5)).toBe(1000);
    expect(computeCommissionAmount(10000, 2, 50)).toBe(250);
  });

  it("handles partial project fallback revenue", () => {
    expect(partialProjectRevenue(20000, "Paid")).toBe(20000);
    expect(partialProjectRevenue(20000, "Partial")).toBe(10000);
    expect(partialProjectRevenue(20000, "Pending")).toBe(0);
  });

  it("computes net pay with deductions", () => {
    expect(
      netPay({
        base: 2500,
        allowances: 0,
        commission: 700,
        deductions: 100,
      })
    ).toBe(3100);
  });

  it("detects commission spikes", () => {
    expect(momChangePercent(700, 2850)).toBeCloseTo(307.14, 0);
    expect(momChangePercent(0, 100)).toBeNull();
  });
});

describe("monthBounds", () => {
  it("returns August 2026 bounds", () => {
    const b = monthBounds(2026, 8);
    expect(b.start).toBe("2026-08-01");
    expect(b.end).toBe("2026-08-31");
    expect(b.label).toContain("2026");
  });
});

describe("partial payment commission accumulation", () => {
  it("pays commission only on collected amounts", () => {
    const first = computeCommissionAmount(10000, 2);
    const second = computeCommissionAmount(10000, 2);
    expect(first).toBe(200);
    expect(second).toBe(200);
    expect(first + second).toBe(400);
  });
});
