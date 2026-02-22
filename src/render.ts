import { DayData, Sleep, WeekStats, SPORT_NAMES } from "./models.ts";
import { addDays, formatDateUTC, isoWeek, isoWeekStart, pad, startOfDayUTC } from "./fetch.ts";

// --- Formatting helpers ---

export function millisToMinutes(ms: number): string {
  const totalMin = Math.floor(ms / 1000 / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function recoveryColor(score: number): string {
  if (score >= 67) return "green";
  if (score >= 34) return "yellow";
  return "red";
}

export function strainCategory(strain: number): string {
  if (strain >= 18) return "All Out";
  if (strain >= 14) return "Strenuous";
  if (strain >= 10) return "Moderate";
  if (strain >= 7) return "Light";
  return "Minimal";
}

export function sportName(id: number): string {
  return SPORT_NAMES[id] ?? `Sport(${id})`;
}

export function fmt0(n: number): string {
  return n.toFixed(0);
}

export function fmt1(n: number): string {
  return n.toFixed(1);
}

// --- Sleep helpers ---

export function primarySleep(sleeps: Sleep[]): Sleep | null {
  let best: Sleep | null = null;
  for (const s of sleeps) {
    if (s.nap) continue;
    if (
      best === null ||
      s.score.stage_summary.total_in_bed_time_milli >
        best.score.stage_summary.total_in_bed_time_milli
    ) {
      best = s;
    }
  }
  return best;
}

export function nonNapSleeps(sleeps: Sleep[]): { index: number; sleep: Sleep }[] {
  const result: { index: number; sleep: Sleep }[] = [];
  for (const s of sleeps) {
    if (!s.nap) result.push({ index: result.length, sleep: s });
  }
  return result;
}

// --- Date navigation helpers ---

export function prevDay(d: Date): string {
  return formatDateUTC(addDays(d, -1));
}

export function nextDay(d: Date): string {
  return formatDateUTC(addDays(d, 1));
}

export function prevDayYear(d: Date): number {
  return addDays(d, -1).getUTCFullYear();
}

export function nextDayYear(d: Date): number {
  return addDays(d, 1).getUTCFullYear();
}

export function isoWeekStr(d: Date): string {
  const { week, year } = isoWeek(d);
  return `${year}-W${pad(week)}`;
}

export function prevWeekStr(d: Date): string {
  return isoWeekStr(addDays(d, -7));
}

export function nextWeekStr(d: Date): string {
  return isoWeekStr(addDays(d, 7));
}

export function isoWeekYear(d: Date): number {
  return isoWeek(d).year;
}

export function prevWeekYear(d: Date): number {
  return isoWeek(addDays(d, -7)).year;
}

export function nextWeekYear(d: Date): number {
  return isoWeek(addDays(d, 7)).year;
}

// --- Weekly aggregation ---

function avg(total: number, count: number): number {
  return count === 0 ? 0 : total / count;
}

export function buildWeekStats(days: DayData[]): WeekStats {
  if (days.length === 0) {
    return {
      weekStart: "",
      weekEnd: "",
      days: [],
      avgRecovery: 0,
      avgHRV: 0,
      avgRHR: 0,
      avgStrain: 0,
      avgSleepMillis: 0,
      totalWorkouts: 0,
      greenDays: 0,
      yellowDays: 0,
      redDays: 0,
      bestDay: null,
      worstDay: null,
    };
  }

  let totalRec = 0, totalHRV = 0, totalRHR = 0, totalStrain = 0;
  let totalSleepMs = 0;
  let recCount = 0, sleepCount = 0, strainCount = 0, totalWorkouts = 0;
  let greenDays = 0, yellowDays = 0, redDays = 0;
  let bestScore = -1, worstScore = 101;
  let bestDay: DayData | null = null, worstDay: DayData | null = null;

  for (const d of days) {
    totalWorkouts += d.workouts.length;

    if (d.recovery && d.recovery.score_state === "SCORED") {
      const s = d.recovery.score.recovery_score;
      totalRec += s;
      totalHRV += d.recovery.score.hrv_rmssd_milli;
      totalRHR += d.recovery.score.resting_heart_rate;
      recCount++;

      const color = recoveryColor(s);
      if (color === "green") greenDays++;
      else if (color === "yellow") yellowDays++;
      else redDays++;

      if (s > bestScore) { bestScore = s; bestDay = d; }
      if (s < worstScore) { worstScore = s; worstDay = d; }
    }

    if (d.cycle && d.cycle.score_state === "SCORED") {
      totalStrain += d.cycle.score.strain;
      strainCount++;
    }

    for (const sl of d.sleeps) {
      if (!sl.nap && sl.score_state === "SCORED") {
        totalSleepMs += sl.score.stage_summary.total_in_bed_time_milli;
        sleepCount++;
      }
    }
  }

  return {
    weekStart: formatDateUTC(days[0].date),
    weekEnd: formatDateUTC(days[days.length - 1].date),
    days,
    avgRecovery: avg(totalRec, recCount),
    avgHRV: avg(totalHRV, recCount),
    avgRHR: avg(totalRHR, recCount),
    avgStrain: avg(totalStrain, strainCount),
    avgSleepMillis: sleepCount > 0 ? totalSleepMs / sleepCount : 0,
    totalWorkouts,
    greenDays,
    yellowDays,
    redDays,
    bestDay,
    worstDay,
  };
}

// --- HRV trend ---

export function hrvTrendLabel(vals: number[]): string {
  const n = vals.length;
  if (n < 3) return "Insufficient data";

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += vals[i];
    sumXY += i * vals[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return "Stable";
  const slope = (n * sumXY - sumX * sumY) / denom;
  const meanHRV = sumY / n;
  if (meanHRV === 0) return "Stable";
  const normalizedSlope = (slope / meanHRV) * 100;

  if (normalizedSlope > 0.5) return `Improving (+${Math.abs(normalizedSlope).toFixed(1)}%/day)`;
  if (normalizedSlope < -0.5) return `Declining (${normalizedSlope.toFixed(1)}%/day)`;
  return "Stable";
}

// --- Output path helpers ---

export function dailyNotePath(date: Date, folder: string): string {
  const year = date.getUTCFullYear();
  const dateStr = formatDateUTC(date);
  return `${folder}/${year}/daily-${dateStr}.md`;
}

export function weeklyNotePath(date: Date, folder: string): string {
  const { week, year } = isoWeek(date);
  const weekStr = `${year}-W${pad(week)}`;
  return `${folder}/${year}/weekly-${weekStr}.md`;
}

/** Returns the Monday of the ISO week for the given date (for fetching 7 days). */
export { isoWeekStart, startOfDayUTC };
