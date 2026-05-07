// Shared math used by every synthetic seeder.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// -1..+1 for hour of day, peaking at 3 PM, trough at 3 AM.
export function diurnal(timestamp: number): number {
  const date = new Date(timestamp);
  const hourFrac =
    date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  // cos((hour - 15) / 24 * 2π) is +1 at 15:00, -1 at 03:00.
  return Math.cos(((hourFrac - 15) / 24) * 2 * Math.PI);
}

// -1..+1 for day of year, peaking at summer solstice (~day 172, June 21).
export function seasonal(timestamp: number): number {
  const date = new Date(timestamp);
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / DAY_MS);
  return Math.cos(((dayOfYear - 172) / 365) * 2 * Math.PI);
}

// Tiny deterministic-ish PRNG so reloads don't show wildly different shapes.
// Mulberry32 keyed by an integer seed; good enough for visual variety.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// Produces a sequence of hourly timestamps from `hoursAgo` through `endMs`,
// inclusive of the start, exclusive of the end (so live producers can take
// over without overlap).
export function* hourlyTimestamps(
  hoursAgo: number,
  endMs: number,
): Generator<number> {
  const start = endMs - hoursAgo * HOUR_MS;
  for (let t = start; t < endMs; t += HOUR_MS) yield t;
}

// Returns ms-since-epoch rounded down to the start of the most recent hour.
export function topOfPreviousHour(now = Date.now()): number {
  return Math.floor(now / HOUR_MS) * HOUR_MS;
}

export { HOUR_MS, DAY_MS };
