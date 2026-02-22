import { describe, it, expect } from "vitest";
import { renderDaily } from "../templates/daily.ts";
import { renderWeekly } from "../templates/weekly.ts";
import { buildWeekStats } from "../render.ts";
import { makeDayData, makeRecovery, makeCycle } from "./fixtures.ts";

describe("renderDaily", () => {
  it("produces valid markdown with all data present", () => {
    const output = renderDaily(makeDayData());
    expect(output).toContain("# WHOOP Daily — 2026-02-22");
    expect(output).toContain("type: note");
    expect(output).toContain("fitness/whoop");
    expect(output).toContain("daily-health");
  });

  it("includes recovery stats", () => {
    const output = renderDaily(makeDayData());
    expect(output).toContain("78%");           // recovery score
    expect(output).toContain("67.3 ms");       // HRV
    expect(output).toContain("52 bpm");        // RHR
    expect(output).toContain("98.1%");         // SpO₂
    expect(output).toContain("34.2°C");        // skin temp
  });

  it("includes strain stats", () => {
    const output = renderDaily(makeDayData());
    expect(output).toContain("12.4");           // strain value
    expect(output).toContain("Moderate");       // strain category
  });

  it("includes sleep stats", () => {
    const output = renderDaily(makeDayData());
    expect(output).toContain("7h 0m");          // in-bed time
    expect(output).toContain("85%");            // sleep performance
  });

  it("includes workout details", () => {
    const output = renderDaily(makeDayData());
    expect(output).toContain("### Running");
    expect(output).toContain("8.7");            // workout strain
    expect(output).toContain("142 bpm");        // avg HR
  });

  it("includes navigation links", () => {
    const output = renderDaily(makeDayData());
    expect(output).toContain("daily-2026-02-21");  // prev day
    expect(output).toContain("daily-2026-02-23");  // next day
    expect(output).toContain("2026-W08");          // week link
  });

  it("handles missing recovery gracefully", () => {
    const output = renderDaily(makeDayData({ recovery: null }));
    expect(output).toContain("No recovery data for this day");
    expect(output).not.toContain("undefined");
    expect(output).not.toContain("NaN");
  });

  it("handles missing cycle gracefully", () => {
    const output = renderDaily(makeDayData({ cycle: null }));
    expect(output).toContain("No cycle/strain data for this day");
  });

  it("handles no sleeps gracefully", () => {
    const output = renderDaily(makeDayData({ sleeps: [] }));
    expect(output).toContain("No sleep data for this day");
  });

  it("handles no workouts gracefully", () => {
    const output = renderDaily(makeDayData({ workouts: [] }));
    expect(output).toContain("No workouts recorded for this day");
  });

  it("shows nap separately from main sleep", async () => {
    const { makeSleep } = await import("./fixtures.ts");
    const nap = makeSleep({ id: "nap-1", nap: true });
    const output = renderDaily(makeDayData({ sleeps: [makeSleep(), nap] }));
    expect(output).toContain("### Main Sleep");
    expect(output).toContain("### Nap");
  });
});

describe("renderWeekly", () => {
  const days = Array.from({ length: 7 }, (_, i) =>
    makeDayData({ date: new Date(`2026-02-${16 + i}T00:00:00.000Z`) })
  );
  const stats = buildWeekStats(days);

  it("produces valid markdown", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("# WHOOP Weekly Summary");
    expect(output).toContain("type: note");
    expect(output).toContain("weekly-health");
  });

  it("includes aggregate stats", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("Avg Recovery");
    expect(output).toContain("Avg HRV");
    expect(output).toContain("Total Workouts");
  });

  it("includes recovery distribution", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("Green (67–100%)");
    expect(output).toContain("Yellow (34–66%)");
    expect(output).toContain("Red (0–33%)");
  });

  it("includes daily breakdown table", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("Daily Breakdown");
    expect(output).toContain("2026-02-16");
    expect(output).toContain("2026-02-22");
  });

  it("includes workouts section", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("Workouts This Week");
    expect(output).toContain("Running");
  });

  it("includes highlights with best/worst day", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("Best Recovery Day");
    expect(output).toContain("Worst Recovery Day");
  });

  it("includes prev/next week navigation", () => {
    const output = renderWeekly(stats);
    expect(output).toContain("Prev Week");
    expect(output).toContain("Next Week");
    expect(output).toContain("2026-W07");  // prev week
    expect(output).toContain("2026-W09");  // next week
  });

  it("handles empty stats gracefully", () => {
    const output = renderWeekly(buildWeekStats([]));
    expect(output).toContain("No data available");
  });
});
