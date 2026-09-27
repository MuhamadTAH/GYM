import { describe, it, expect } from "vitest";
import { parseNaturalDate } from "@/lib/date-parser";

describe("Natural Date Parser Engine", () => {
  const currentYear = new Date().getFullYear();

  it("handles empty or null inputs by returning today's ISO date", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(parseNaturalDate()).toBe(today);
    expect(parseNaturalDate("")).toBe(today);
    expect(parseNaturalDate("   ")).toBe(today);
  });

  it("handles relative keywords 'today' and 'tomorrow'", () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const tomorrow = tom.toISOString().slice(0, 10);

    expect(parseNaturalDate("today")).toBe(today);
    expect(parseNaturalDate("tomorrow")).toBe(tomorrow);
  });

  it("parses '29 of sep' correctly to YYYY-09-29", () => {
    expect(parseNaturalDate("29 of sep")).toBe(`${currentYear}-09-29`);
    expect(parseNaturalDate("29 of september")).toBe(`${currentYear}-09-29`);
    expect(parseNaturalDate("29 sep")).toBe(`${currentYear}-09-29`);
    expect(parseNaturalDate("29th of sep")).toBe(`${currentYear}-09-29`);
  });

  it("parses month-first natural formats like 'sep 29' and 'September 29th'", () => {
    expect(parseNaturalDate("sep 29")).toBe(`${currentYear}-09-29`);
    expect(parseNaturalDate("september 29th")).toBe(`${currentYear}-09-29`);
  });

  it("preserves explicit ISO dates YYYY-MM-DD", () => {
    expect(parseNaturalDate("2026-09-29")).toBe("2026-09-29");
    expect(parseNaturalDate("2026-10-05")).toBe("2026-10-05");
  });
});
