import { describe, it, expect } from "vitest";
import {
  millisToMinutes,
  recoveryColor,
  strainCategory,
  sportName,
  primarySleep,
  nonNapSleeps,
  prevDay,
  nextDay,
  prevDayYear,
  nextDayYear,
  isoWeekStr,
  prevWeekStr,
  nextWeekStr,
  isoWeekYear,
  buildWeekStats,
  hrvTrendLabel,
  dailyNotePath,
  weeklyNotePath,
} from "../render.ts";
import { makeDayData, makeSleep } from "./fixtures.ts";

// --- millisToMinutes ---

describe("millisToMinutes", () => {
  it("formats hours and minutes", () => {
    expect(millisToMinutes(25200000)).toBe("7h 0m");
  });
  it("omits hours when < 1h", () => {
    expect(millisToMinutes(1800000)).toBe("30m");
  });
  it("handles zero", () => {
    expect(millisToMinutes(0)).toBe("0m");
  });
  it("rounds down sub-minute ms", () => {
    expect(millisToMinutes(90000)).toBe("1m");
  });
});

// --- recoveryColor ---

describe("recoveryColor", () => {
  it("returns green for >= 67", () => {
    expect(recoveryColor(67)).toBe("green");
    expect(recoveryColor(100)).toBe("green");
  });
  it("returns yellow for 34–66", () => {
    expect(recoveryColor(34)).toBe("yellow");
    expect(recoveryColor(66)).toBe("yellow");
  });
  it("returns red for < 34", () => {
    expect(recoveryColor(33)).toBe("red");
    expect(recoveryColor(0)).toBe("red");
  });
});

// --- strainCategory ---

describe("strainCategory", () => {
  it("labels All Out at >= 18", () => expect(strainCategory(18)).toBe("All Out"));
  it("labels Strenuous at 14–17.9", () => expect(strainCategory(14)).toBe("Strenuous"));
  it("labels Moderate at 10–13.9", () => expect(strainCategory(10)).toBe("Moderate"));
  it("labels Light at 7–9.9", () => expect(strainCategory(7)).toBe("Light"));
  it("labels Minimal below 7", () => expect(strainCategory(6.9)).toBe("Minimal"));
});

// --- sportName ---

describe("sportName", () => {
  it("returns known sport name", () => expect(sportName(0)).toBe("Running"));
  it("returns Cycling for id 1", () => expect(sportName(1)).toBe("Cycling"));
  it("falls back for unknown id", () => expect(sportName(9999)).toBe("Sport(9999)"));
});

// --- primarySleep ---

describe("primarySleep", () => {
  it("returns null for empty array", () => {
    expect(primarySleep([])).toBeNull();
  });
  it("returns the longest non-nap sleep", () => {
    const short = makeSleep({ id: "a", score: { ...makeSleep().score, stage_summary: { ...makeSleep().score.stage_summary, total_in_bed_time_milli: 10000 } } });
    const long = makeSleep({ id: "b", score: { ...makeSleep().score, stage_summary: { ...makeSleep().score.stage_summary, total_in_bed_time_milli: 25200000 } } });
    expect(primarySleep([short, long])?.id).toBe("b");
  });
  it("ignores naps", () => {
    const nap = makeSleep({ id: "nap", nap: true, score: { ...makeSleep().score, stage_summary: { ...makeSleep().score.stage_summary, total_in_bed_time_milli: 99999999 } } });
    const main = makeSleep({ id: "main" });
    expect(primarySleep([nap, main])?.id).toBe("main");
  });
  it("returns null when only naps", () => {
    const nap = makeSleep({ nap: true });
    expect(primarySleep([nap])).toBeNull();
  });
});

// --- nonNapSleeps ---

describe("nonNapSleeps", () => {
  it("filters out naps", () => {
    const sleeps = [makeSleep({ id: "a", nap: false }), makeSleep({ id: "b", nap: true }), makeSleep({ id: "c", nap: false })];
    const result = nonNapSleeps(sleeps);
    expect(result).toHaveLength(2);
    expect(result[0].sleep.id).toBe("a");
    expect(result[1].sleep.id).toBe("c");
  });
  it("attaches ordinal index", () => {
    const sleeps = [makeSleep({ id: "x" }), makeSleep({ id: "y" })];
    const result = nonNapSleeps(sleeps);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(1);
  });
});

// --- date navigation ---

describe("date navigation", () => {
  const d = new Date("2026-02-22T00:00:00.000Z");

  it("prevDay", () => expect(prevDay(d)).toBe("2026-02-21"));
  it("nextDay", () => expect(nextDay(d)).toBe("2026-02-23"));
  it("prevDayYear stays in same year", () => expect(prevDayYear(d)).toBe(2026));
  it("nextDayYear stays in same year", () => expect(nextDayYear(d)).toBe(2026));

  it("prevDay wraps month correctly", () => {
    expect(prevDay(new Date("2026-03-01T00:00:00.000Z"))).toBe("2026-02-28");
  });
  it("nextDay wraps month correctly", () => {
    expect(nextDay(new Date("2026-01-31T00:00:00.000Z"))).toBe("2026-02-01");
  });
  it("prevDayYear crosses year boundary", () => {
    expect(prevDayYear(new Date("2026-01-01T00:00:00.000Z"))).toBe(2025);
  });
  it("nextDayYear crosses year boundary", () => {
    expect(nextDayYear(new Date("2025-12-31T00:00:00.000Z"))).toBe(2026);
  });
});

// --- ISO week strings ---

describe("isoWeekStr", () => {
  it("returns correct week string", () => {
    // 2026-02-22 is a Sunday in week 8
    expect(isoWeekStr(new Date("2026-02-22T00:00:00.000Z"))).toBe("2026-W08");
  });
  it("pads single-digit weeks", () => {
    // 2026-01-05 is week 2
    expect(isoWeekStr(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-W02");
  });
});

describe("prevWeekStr / nextWeekStr", () => {
  const d = new Date("2026-02-22T00:00:00.000Z"); // W08
  it("prevWeekStr", () => expect(prevWeekStr(d)).toBe("2026-W07"));
  it("nextWeekStr", () => expect(nextWeekStr(d)).toBe("2026-W09"));
});

describe("isoWeekYear", () => {
  it("returns same year for mid-year date", () => {
    expect(isoWeekYear(new Date("2026-06-15T00:00:00.000Z"))).toBe(2026);
  });
  it("handles year-boundary: Jan 1 2026 is W1 2026", () => {
    // 2026-01-01 is a Thursday → W1 of 2026
    expect(isoWeekYear(new Date("2026-01-01T00:00:00.000Z"))).toBe(2026);
  });
});

// --- buildWeekStats ---

describe("buildWeekStats", () => {
  it("returns empty stats for empty input", () => {
    const s = buildWeekStats([]);
    expect(s.avgRecovery).toBe(0);
    expect(s.totalWorkouts).toBe(0);
  });

  it("aggregates recovery correctly", () => {
    const days = [
      makeDayData({ date: new Date("2026-02-16T00:00:00.000Z") }),
      makeDayData({ date: new Date("2026-02-17T00:00:00.000Z"), recovery: null }),
      makeDayData({ date: new Date("2026-02-18T00:00:00.000Z") }),
    ];
    const s = buildWeekStats(days);
    expect(s.avgRecovery).toBe(78); // (78+78)/2
  });

  it("counts workouts across days", () => {
    const days = [
      makeDayData({ date: new Date("2026-02-16T00:00:00.000Z") }),
      makeDayData({ date: new Date("2026-02-17T00:00:00.000Z"), workouts: [] }),
    ];
    const s = buildWeekStats(days);
    expect(s.totalWorkouts).toBe(1);
  });

  it("classifies recovery colors", () => {
    const green = makeDayData({ recovery: { ...makeDayData().recovery!, score: { ...makeDayData().recovery!.score, recovery_score: 80 } } });
    const yellow = makeDayData({ recovery: { ...makeDayData().recovery!, score: { ...makeDayData().recovery!.score, recovery_score: 50 } } });
    const red = makeDayData({ recovery: { ...makeDayData().recovery!, score: { ...makeDayData().recovery!.score, recovery_score: 20 } } });
    const s = buildWeekStats([green, yellow, red]);
    expect(s.greenDays).toBe(1);
    expect(s.yellowDays).toBe(1);
    expect(s.redDays).toBe(1);
  });

  it("identifies bestDay and worstDay", () => {
    const highDay = makeDayData({ date: new Date("2026-02-16T00:00:00.000Z"), recovery: { ...makeDayData().recovery!, score: { ...makeDayData().recovery!.score, recovery_score: 95 } } });
    const lowDay = makeDayData({ date: new Date("2026-02-17T00:00:00.000Z"), recovery: { ...makeDayData().recovery!, score: { ...makeDayData().recovery!.score, recovery_score: 20 } } });
    const s = buildWeekStats([highDay, lowDay]);
    expect(s.bestDay?.recovery?.score.recovery_score).toBe(95);
    expect(s.worstDay?.recovery?.score.recovery_score).toBe(20);
  });

  it("sets weekStart and weekEnd from first/last day", () => {
    const days = [
      makeDayData({ date: new Date("2026-02-16T00:00:00.000Z") }),
      makeDayData({ date: new Date("2026-02-22T00:00:00.000Z") }),
    ];
    const s = buildWeekStats(days);
    expect(s.weekStart).toBe("2026-02-16");
    expect(s.weekEnd).toBe("2026-02-22");
  });
});

// --- hrvTrendLabel ---

describe("hrvTrendLabel", () => {
  it("returns insufficient data for < 3 values", () => {
    expect(hrvTrendLabel([])).toBe("Insufficient data");
    expect(hrvTrendLabel([50])).toBe("Insufficient data");
    expect(hrvTrendLabel([50, 55])).toBe("Insufficient data");
  });
  it("returns Stable for flat values", () => {
    expect(hrvTrendLabel([60, 60, 60, 60, 60])).toBe("Stable");
  });
  it("detects improving trend", () => {
    const result = hrvTrendLabel([50, 55, 60, 65, 70]);
    expect(result).toMatch(/Improving/);
  });
  it("detects declining trend", () => {
    const result = hrvTrendLabel([70, 65, 60, 55, 50]);
    expect(result).toMatch(/Declining/);
  });
});

// --- output paths ---

describe("dailyNotePath", () => {
  it("generates correct path", () => {
    const d = new Date("2026-02-22T00:00:00.000Z");
    expect(dailyNotePath(d, "Health/WHOOP")).toBe("Health/WHOOP/2026/daily-2026-02-22.md");
  });
});

describe("weeklyNotePath", () => {
  it("generates correct path for a week", () => {
    const d = new Date("2026-02-16T00:00:00.000Z"); // Monday of W08
    expect(weeklyNotePath(d, "Health/WHOOP")).toBe("Health/WHOOP/2026/weekly-2026-W08.md");
  });
});
