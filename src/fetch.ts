import {
  Cycle,
  DayData,
  PaginatedResponse,
  Recovery,
  Sleep,
  UserProfile,
  Workout,
} from "./models.ts";
import { NotFoundError, WhoopClient } from "./client.ts";

/** Fetch all records from a paginated WHOOP endpoint within [start, end). */
async function fetchPaginated<T>(
  client: WhoopClient,
  path: string,
  start: Date,
  end: Date
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      start: start.toISOString(),
      end: end.toISOString(),
    };
    if (nextToken) params["nextToken"] = nextToken;

    let page: PaginatedResponse<T>;
    try {
      page = (await client.get(path, params)) as PaginatedResponse<T>;
    } catch (e) {
      if (e instanceof NotFoundError) return all;
      throw e;
    }

    all.push(...page.records);
    if (!page.next_token) break;
    nextToken = page.next_token;
  }

  return all;
}

export async function getUserProfile(
  client: WhoopClient
): Promise<UserProfile> {
  return (await client.get("/user/profile/basic")) as UserProfile;
}

export async function getCycles(
  client: WhoopClient,
  start: Date,
  end: Date
): Promise<Cycle[]> {
  return fetchPaginated<Cycle>(client, "/cycle", start, end);
}

export async function getRecoveries(
  client: WhoopClient,
  start: Date,
  end: Date
): Promise<Recovery[]> {
  return fetchPaginated<Recovery>(client, "/recovery", start, end);
}

export async function getSleeps(
  client: WhoopClient,
  start: Date,
  end: Date
): Promise<Sleep[]> {
  return fetchPaginated<Sleep>(client, "/activity/sleep", start, end);
}

export async function getWorkouts(
  client: WhoopClient,
  start: Date,
  end: Date
): Promise<Workout[]> {
  return fetchPaginated<Workout>(client, "/activity/workout", start, end);
}

/** Fetch and aggregate all WHOOP data for a given calendar date (UTC). */
export async function getDayData(
  client: WhoopClient,
  date: Date
): Promise<DayData> {
  const day = startOfDayUTC(date);
  const nextDay = addDays(day, 1);

  const cycles = await getCycles(client, day, nextDay);
  if (cycles.length === 0) {
    return { date: day, cycle: null, recovery: null, sleeps: [], workouts: [] };
  }

  const cycle = cycles[0];
  const cycleStart = new Date(cycle.start);
  const cycleEnd = cycle.end ? new Date(cycle.end) : nextDay;

  // Fetch recovery, sleeps, and workouts in parallel
  const [recoveries, sleeps, workouts] = await Promise.all([
    getRecoveries(client, cycleStart, cycleEnd),
    // Sleep window extends 24h before cycle start to capture preceding night
    getSleeps(client, new Date(cycleStart.getTime() - 24 * 3600 * 1000), cycleEnd),
    getWorkouts(client, cycleStart, cycleEnd),
  ]);

  const recovery = recoveries.find((r) => r.cycle_id === cycle.id) ?? null;

  return { date: day, cycle, recovery, sleeps, workouts };
}

/** Fetch DayData for N days ending at (and including) endDate. */
export async function getRecentDays(
  client: WhoopClient,
  endDate: Date,
  n: number
): Promise<DayData[]> {
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(addDays(startOfDayUTC(endDate), -i));
  }
  return Promise.all(days.map((d) => getDayData(client, d)));
}

// --- Date helpers ---

export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/** Returns the ISO week number (1-53) and year for a given date. */
export function isoWeek(d: Date): { week: number; year: number } {
  // ISO 8601: week starts Monday, week 1 = week containing first Thursday
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayOfWeek = dt.getUTCDay() || 7; // 1=Mon … 7=Sun
  dt.setUTCDate(dt.getUTCDate() + 4 - dayOfWeek); // Thursday of current week
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { week, year: dt.getUTCFullYear() };
}

/** Returns the Monday of the ISO week containing d. */
export function isoWeekStart(d: Date): Date {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt;
}

/** Zero-pads a number to width. */
export function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Formats a Date as YYYY-MM-DD (UTC). */
export function formatDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
