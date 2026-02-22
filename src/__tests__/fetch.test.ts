import { describe, it, expect } from "vitest";
import {
  startOfDayUTC,
  addDays,
  isoWeek,
  isoWeekStart,
  formatDateUTC,
  pad,
} from "../fetch.ts";

describe("startOfDayUTC", () => {
  it("zeroes time components", () => {
    const d = new Date("2026-02-22T15:30:45.123Z");
    const result = startOfDayUTC(d);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(1); // Feb
    expect(result.getUTCDate()).toBe(22);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const d = new Date("2026-02-22T00:00:00.000Z");
    expect(formatDateUTC(addDays(d, 5))).toBe("2026-02-27");
  });
  it("subtracts negative days", () => {
    const d = new Date("2026-02-22T00:00:00.000Z");
    expect(formatDateUTC(addDays(d, -5))).toBe("2026-02-17");
  });
  it("crosses month boundary", () => {
    const d = new Date("2026-01-31T00:00:00.000Z");
    expect(formatDateUTC(addDays(d, 1))).toBe("2026-02-01");
  });
  it("crosses year boundary", () => {
    const d = new Date("2025-12-31T00:00:00.000Z");
    expect(formatDateUTC(addDays(d, 1))).toBe("2026-01-01");
  });
});

describe("isoWeek", () => {
  it("returns correct week and year for mid-year date", () => {
    // 2026-02-22 is a Sunday in week 8
    const { week, year } = isoWeek(new Date("2026-02-22T00:00:00.000Z"));
    expect(week).toBe(8);
    expect(year).toBe(2026);
  });
  it("handles week 1", () => {
    // 2026-01-01 is a Thursday → W1 of 2026
    const { week, year } = isoWeek(new Date("2026-01-01T00:00:00.000Z"));
    expect(week).toBe(1);
    expect(year).toBe(2026);
  });
  it("handles Dec 31 that belongs to next ISO year", () => {
    // 2018-12-31 (Monday) → W1 of 2019
    const { week, year } = isoWeek(new Date("2018-12-31T00:00:00.000Z"));
    expect(week).toBe(1);
    expect(year).toBe(2019);
  });
  it("handles Jan 1 that belongs to previous ISO year", () => {
    // 2016-01-01 is a Friday → W53 of 2015
    const { week, year } = isoWeek(new Date("2016-01-01T00:00:00.000Z"));
    expect(week).toBe(53);
    expect(year).toBe(2015);
  });
});

describe("isoWeekStart", () => {
  it("returns Monday for a Sunday", () => {
    // 2026-02-22 is Sunday → Monday is 2026-02-16
    const result = isoWeekStart(new Date("2026-02-22T00:00:00.000Z"));
    expect(formatDateUTC(result)).toBe("2026-02-16");
  });
  it("returns same day for a Monday", () => {
    const result = isoWeekStart(new Date("2026-02-16T00:00:00.000Z"));
    expect(formatDateUTC(result)).toBe("2026-02-16");
  });
  it("returns Monday for a Wednesday", () => {
    const result = isoWeekStart(new Date("2026-02-18T00:00:00.000Z"));
    expect(formatDateUTC(result)).toBe("2026-02-16");
  });
});

describe("formatDateUTC", () => {
  it("formats correctly", () => {
    expect(formatDateUTC(new Date("2026-02-22T00:00:00.000Z"))).toBe("2026-02-22");
    expect(formatDateUTC(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01");
    expect(formatDateUTC(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12-31");
  });
});

describe("pad", () => {
  it("pads single digits", () => {
    expect(pad(1)).toBe("01");
    expect(pad(9)).toBe("09");
  });
  it("does not pad two-digit numbers", () => {
    expect(pad(10)).toBe("10");
    expect(pad(53)).toBe("53");
  });
});
