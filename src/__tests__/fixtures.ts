import { Cycle, DayData, Recovery, Sleep, Workout } from "../models.ts";

export const makeCycle = (overrides: Partial<Cycle> = {}): Cycle => ({
  id: 1,
  user_id: 42,
  created_at: "2026-02-22T08:00:00.000Z",
  updated_at: "2026-02-22T23:00:00.000Z",
  start: "2026-02-22T08:00:00.000Z",
  end: "2026-02-22T23:00:00.000Z",
  timezone_offset: "-05:00",
  score_state: "SCORED",
  score: {
    strain: 12.4,
    kilojoule: 8500,
    average_heart_rate: 68,
    max_heart_rate: 152,
  },
  ...overrides,
});

export const makeRecovery = (overrides: Partial<Recovery> = {}): Recovery => ({
  cycle_id: 1,
  sleep_id: "abc-123",
  user_id: 42,
  created_at: "2026-02-22T08:00:00.000Z",
  updated_at: "2026-02-22T08:30:00.000Z",
  score_state: "SCORED",
  score: {
    user_calibrating: false,
    recovery_score: 78,
    resting_heart_rate: 52,
    hrv_rmssd_milli: 67.3,
    spo2_percentage: 98.1,
    skin_temp_celsius: 34.2,
  },
  ...overrides,
});

export const makeSleep = (overrides: Partial<Sleep> = {}): Sleep => ({
  id: "sleep-1",
  v1_id: null,
  user_id: 42,
  created_at: "2026-02-22T02:00:00.000Z",
  updated_at: "2026-02-22T09:00:00.000Z",
  start: "2026-02-22T02:00:00.000Z",
  end: "2026-02-22T09:00:00.000Z",
  timezone_offset: "-05:00",
  nap: false,
  score_state: "SCORED",
  score: {
    stage_summary: {
      total_in_bed_time_milli: 25200000,  // 7h
      total_awake_time_milli: 1800000,    // 30m
      total_no_data_time_milli: 0,
      total_light_sleep_time_milli: 9000000,  // 2h30m
      total_slow_wave_sleep_time_milli: 5400000, // 1h30m
      total_rem_sleep_time_milli: 7200000,    // 2h
      sleep_cycle_count: 4,
      disturbance_count: 2,
    },
    sleep_needed: {
      baseline_milli: 27900000,
      need_from_sleep_debt_milli: 0,
      need_from_recent_strain_milli: 1800000,
      need_from_recent_nap_milli: 0,
    },
    respiratory_rate: 15.2,
    sleep_performance_percentage: 85,
    sleep_consistency_percentage: 72,
    sleep_efficiency_percentage: 92,
  },
  ...overrides,
});

export const makeWorkout = (overrides: Partial<Workout> = {}): Workout => ({
  id: "workout-1",
  v1_id: null,
  user_id: 42,
  created_at: "2026-02-22T12:00:00.000Z",
  updated_at: "2026-02-22T13:00:00.000Z",
  start: "2026-02-22T12:00:00.000Z",
  end: "2026-02-22T13:00:00.000Z",
  timezone_offset: "-05:00",
  sport_id: 0,
  sport_name: "Running",
  score_state: "SCORED",
  score: {
    strain: 8.7,
    average_heart_rate: 142,
    max_heart_rate: 168,
    kilojoule: 2200,
    percent_recorded: 99,
    distance_meter: 8046,
    altitude_gain_meter: 45,
    altitude_change_meter: 5,
    zone_duration: {
      zone_zero_milli: 0,
      zone_one_milli: 600000,
      zone_two_milli: 1200000,
      zone_three_milli: 1800000,
      zone_four_milli: 1800000,
      zone_five_milli: 600000,
    },
  },
  ...overrides,
});

export const makeDayData = (overrides: Partial<DayData> = {}): DayData => ({
  date: new Date("2026-02-22T00:00:00.000Z"),
  cycle: makeCycle(),
  recovery: makeRecovery(),
  sleeps: [makeSleep()],
  workouts: [makeWorkout()],
  ...overrides,
});
