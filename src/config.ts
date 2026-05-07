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
// retention; we keep the last N points per device to render charts.
export const HISTORY_LIMIT = 240;
