// Single source of truth for "where am I" and "what's my hardware".
// Change these to reconfigure without touching the rest of the app.

export const LOCATION = {
  name: "Pacific, MO 63069",
  latitude: 38.4814,
  longitude: -90.7402,
  timezone: "America/Chicago",
} as const;

// Devices you'd register on real hardware. The mock producers use these as
// partition keys (one partition per device id), the same way you'd shard a
// real Kafka topic by device.
export const DEVICES = {
  garden: [
    { id: "garden-bed-1", label: "Raised Bed (East)" },
    { id: "garden-bed-2", label: "Raised Bed (West)" },
  ],
  pond: [{ id: "pond-1", label: "Main Pond" }],
  hives: [
    { id: "hive-1", label: "Hive #1" },
    { id: "hive-2", label: "Hive #2" },
  ],
} as const;

// How often each producer emits in mock mode. Real devices would push at
// their own cadence; this just keeps the demo lively.
export const PRODUCE_INTERVAL_MS = {
  garden: 5_000,
  pond: 7_000,
  hive: 6_000,
  weather: 60_000, // Open-Meteo is rate-limited; one minute is plenty.
} as const;

// Ring-buffer size per topic+partition. Real Kafka uses time- or size-based
// retention; we keep enough points per device to cover a year of history
// at hourly resolution (8760) plus headroom for live ticks.
export const HISTORY_LIMIT = 10_000;

// Time ranges available in the chart selector. `ms` controls the cutoff;
// `pointStride` is a hint for downsampling so we never render >~500 points.
export type TimeRangeKey = "1h" | "1d" | "1w" | "1m" | "3m" | "1y";

export const TIME_RANGES: Record<
  TimeRangeKey,
  { label: string; ms: number; tickFormat: "time" | "datetime" | "date" }
> = {
  "1h": { label: "1 hour", ms: 60 * 60 * 1000, tickFormat: "time" },
  "1d": { label: "1 day", ms: 24 * 60 * 60 * 1000, tickFormat: "time" },
  "1w": { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000, tickFormat: "datetime" },
  "1m": { label: "1 month", ms: 30 * 24 * 60 * 60 * 1000, tickFormat: "date" },
  "3m": { label: "3 months", ms: 90 * 24 * 60 * 60 * 1000, tickFormat: "date" },
  "1y": { label: "1 year", ms: 365 * 24 * 60 * 60 * 1000, tickFormat: "date" },
};

export const DEFAULT_TIME_RANGE: TimeRangeKey = "1d";

// Hourly resolution for seeded history is enough for every range except
// "1 hour", which gets a finer pass to make the most-recent view feel live.
export const SEED_HOURS = 365 * 24;
export const SEED_RECENT_FINE_HOURS = 2; // 2 hours at 1-minute resolution
