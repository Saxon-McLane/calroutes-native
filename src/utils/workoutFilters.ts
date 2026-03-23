import type { Difficulty, Workout } from "@/src/store/AppStore";

// ---------------------------------------------------------------------------
// Completed workouts only (store may only hold finished sessions; flag for future)
// ---------------------------------------------------------------------------

export function getCompletedWorkouts(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => {
    if (w.completed === false) return false;
    if (typeof w.dateISO !== "string" || w.dateISO.length === 0) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Local calendar boundaries (device timezone)
// ---------------------------------------------------------------------------

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Start of the local calendar day after `d` (exclusive upper bound for “through today”). */
export function startOfNextLocalDay(d: Date): Date {
  const x = startOfLocalDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

/** YYYY-MM-DD for the workout’s completion instant in local time. */
export function workoutLocalDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday 00:00:00 local time for the week containing `date`. */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfCurrentWeek(now: Date = new Date()): Date {
  return getMonday(now);
}

export type ActivityFilter = "week" | "month" | "3m" | "6m" | "year" | "all";

export function filterStartDate(filter: ActivityFilter, now: Date = new Date()): Date | null {
  if (filter === "all") return null;
  if (filter === "week") return getMonday(now);
  if (filter === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (filter === "3m") d.setDate(d.getDate() - 90);
  else if (filter === "6m") d.setDate(d.getDate() - 180);
  else d.setDate(d.getDate() - 365);
  return d;
}

/**
 * Completed workouts in the selected range. Uses consistent local-day windows:
 * - week: [Mon 00:00, next Mon 00:00)
 * - month: [1st 00:00, next month 1st 00:00)
 * - rolling (3m/6m/year): [start 00:00, tomorrow 00:00)
 * - all: up to (exclusive) tomorrow 00:00
 */
export function activityByRange(
  workouts: Workout[],
  filter: ActivityFilter,
  now: Date = new Date()
): Workout[] {
  const base = getCompletedWorkouts(workouts);
  const tomorrow = startOfNextLocalDay(now);

  const inWindow = (iso: string, start: Date, endExclusive: Date) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t < endExclusive.getTime();
  };

  if (filter === "all") {
    return base.filter((w) => new Date(w.dateISO).getTime() < tomorrow.getTime());
  }

  if (filter === "week") {
    const start = getMonday(now);
    const endExclusive = new Date(start);
    endExclusive.setDate(endExclusive.getDate() + 7);
    return base.filter((w) => inWindow(w.dateISO, start, endExclusive));
  }

  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return base.filter((w) => inWindow(w.dateISO, start, endExclusive));
  }

  const start = filterStartDate(filter, now)!;
  return base.filter((w) => inWindow(w.dateISO, start, tomorrow));
}

export function workoutsThisWeek(workouts: Workout[], now: Date = new Date()): Workout[] {
  return activityByRange(workouts, "week", now);
}

export function sortWorkoutsNewestFirst(workouts: Workout[]): Workout[] {
  return [...workouts].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
}

export type WorkoutTotals = {
  count: number;
  calories: number;
  distanceKm: number;
  durationMin: number;
};

export function aggregateWorkoutTotals(workouts: Workout[]): WorkoutTotals {
  return {
    count: workouts.length,
    calories: workouts.reduce((s, w) => s + w.calories, 0),
    distanceKm: workouts.reduce((s, w) => s + w.distanceKm, 0),
    durationMin: workouts.reduce((s, w) => s + w.durationMin, 0),
  };
}

/**
 * Consecutive local calendar days with ≥1 completed workout, ending today.
 * Requires a workout today to count; else 0. Multiple workouts same day = one streak day.
 */
export function calculateStreak(workouts: Workout[], now: Date = new Date()): number {
  const completed = getCompletedWorkouts(workouts);
  const dayKeys = new Set(completed.map((w) => workoutLocalDayKey(w.dateISO)));
  const todayStart = startOfLocalDay(now);
  const todayKey = localDayKeyFromDate(todayStart);
  if (!dayKeys.has(todayKey)) return 0;

  let streak = 0;
  const cursor = new Date(todayStart);
  while (true) {
    const key = localDayKeyFromDate(cursor);
    if (!dayKeys.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Insights (per-day rollups on an already range-filtered completed set)
// ---------------------------------------------------------------------------

type DayRollup = {
  anchor: Date;
  calories: number;
  distanceKm: number;
  workoutCount: number;
};

function anchorLocalNoon(iso: string): Date {
  const d = new Date(iso);
  d.setHours(12, 0, 0, 0);
  return d;
}

function rollupsByLocalDay(workouts: Workout[]): DayRollup[] {
  const map = new Map<string, DayRollup>();
  for (const w of workouts) {
    const key = workoutLocalDayKey(w.dateISO);
    const cal = Number(w.calories) || 0;
    const dist = Number(w.distanceKm) || 0;
    const existing = map.get(key);
    if (existing) {
      existing.calories += cal;
      existing.distanceKm += dist;
      existing.workoutCount += 1;
    } else {
      map.set(key, {
        anchor: anchorLocalNoon(w.dateISO),
        calories: cal,
        distanceKm: dist,
        workoutCount: 1,
      });
    }
  }
  return Array.from(map.values());
}

export type ConsistencyInsight = {
  activeDays: number;
  totalWorkouts: number;
};

export function computeConsistencyInsight(workouts: Workout[]): ConsistencyInsight {
  const rollups = rollupsByLocalDay(workouts);
  return {
    activeDays: rollups.length,
    totalWorkouts: workouts.length,
  };
}

function formatShortWeekdayDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Best calendar day in range: max total calories, then distance, then workout count.
 */
export function computeBestDayInsightLine(workouts: Workout[]): string | null {
  const rollups = rollupsByLocalDay(workouts);
  if (rollups.length === 0) return null;

  const maxCal = Math.max(...rollups.map((r) => r.calories));
  const maxDist = Math.max(...rollups.map((r) => r.distanceKm));
  const maxCount = Math.max(...rollups.map((r) => r.workoutCount));

  const byRecent = (a: DayRollup, b: DayRollup) =>
    b.anchor.getTime() - a.anchor.getTime();

  if (maxCal > 0) {
    const pool = rollups.filter((r) => r.calories === maxCal);
    pool.sort((a, b) => {
      if (b.distanceKm !== a.distanceKm) return b.distanceKm - a.distanceKm;
      if (b.workoutCount !== a.workoutCount) return b.workoutCount - a.workoutCount;
      return byRecent(a, b);
    });
    const best = pool[0]!;
    return `Highest-burn day: ${formatShortWeekdayDate(best.anchor)} — ${Math.round(best.calories)} cal`;
  }

  if (maxDist > 0) {
    const pool = rollups.filter((r) => r.distanceKm === maxDist);
    pool.sort((a, b) => {
      if (b.workoutCount !== a.workoutCount) return b.workoutCount - a.workoutCount;
      return byRecent(a, b);
    });
    const best = pool[0]!;
    return `Most distance in a day: ${formatShortWeekdayDate(best.anchor)} — ${best.distanceKm.toFixed(1)} km`;
  }

  const pool = rollups.filter((r) => r.workoutCount === maxCount);
  pool.sort(byRecent);
  const best = pool[0]!;
  const plural = best.workoutCount === 1 ? "" : "s";
  return `Most active day: ${formatShortWeekdayDate(best.anchor)} — ${best.workoutCount} workout${plural}`;
}

const ROUTE_TAGS: Record<Difficulty, readonly string[]> = {
  easy: ["Scenic", "Flat", "Park"],
  moderate: ["Balanced", "City", "Park"],
  hard: ["Hilly", "Tempo", "Hills"],
};

export function workoutRouteTag(workout: Workout, index: number): string {
  const list = ROUTE_TAGS[workout.difficulty];
  return list[index % list.length]!;
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(
    undefined,
    opts
  )}`;
}
