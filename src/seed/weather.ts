import { LOCATION, SEED_HOURS } from "../config";
import { broker } from "../kafka/broker";
import type { WeatherReading } from "../producers/weather";
import {
  clamp,
  diurnal,
  hourlyTimestamps,
  rng,
  seasonal,
  topOfPreviousHour,
} from "./synth";

// Open-Meteo's archive lags by ~5 days. We pull the archive for the older
// chunk and the forecast endpoint with `past_days` for the recent week so
// every hour has a real reading.
const ARCHIVE_LAG_DAYS = 6;
const RECENT_PAST_DAYS = 7;

function isoDate(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  pressure_msl: number[];
}

function readingFromRow(h: OpenMeteoHourly, i: number): WeatherReading {
  return {
    airTempF: h.temperature_2m[i],
    humidityPct: h.relative_humidity_2m[i],
    precipitationIn: h.precipitation[i],
    windMph: h.wind_speed_10m[i],
    pressureInHg: h.pressure_msl[i] * 0.02953,
  };
}

async function fetchHourly(url: URL): Promise<Map<number, WeatherReading>> {
  const out = new Map<number, WeatherReading>();
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return out;
    const data = await res.json();
    const h = data.hourly as OpenMeteoHourly | undefined;
    if (!h?.time) return out;
    for (let i = 0; i < h.time.length; i++) {
      // Open-Meteo returns ISO strings without timezone when given a tz —
      // the values are already local. Treat them as the location's local
      // time and convert to UTC ms.
      const ts = new Date(h.time[i] + "Z").getTime();
      if (!Number.isFinite(ts)) continue;
      const r = readingFromRow(h, i);
      if (Object.values(r).every((v) => typeof v === "number")) {
        out.set(ts, r);
      }
    }
  } catch {
    // Network/CORS failure — caller falls back to synthetic.
  }
  return out;
}

function archiveUrl(): URL {
  const now = topOfPreviousHour();
  const dayMs = 24 * 60 * 60 * 1000;
  const end = now - ARCHIVE_LAG_DAYS * dayMs;
  const start = now - SEED_HOURS * 60 * 60 * 1000;
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", LOCATION.latitude.toString());
  url.searchParams.set("longitude", LOCATION.longitude.toString());
  url.searchParams.set("start_date", isoDate(start));
  url.searchParams.set("end_date", isoDate(end));
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  // Request UTC timestamps so we can parse them unambiguously below.
  url.searchParams.set("timezone", "UTC");
  return url;
}

function recentUrl(): URL {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", LOCATION.latitude.toString());
  url.searchParams.set("longitude", LOCATION.longitude.toString());
  url.searchParams.set("past_days", RECENT_PAST_DAYS.toString());
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  // Request UTC timestamps so we can parse them unambiguously below.
  url.searchParams.set("timezone", "UTC");
  return url;
}

function syntheticWeather(): Map<number, WeatherReading> {
  // Fallback when Open-Meteo is unreachable. Same shape, plausible values.
  const r = rng(0xbee5);
  const end = topOfPreviousHour();
  const map = new Map<number, WeatherReading>();
  let temp = 60;
  let humidity = 55;
  let pressure = 30;
  for (const t of hourlyTimestamps(SEED_HOURS, end)) {
    temp += (r() - 0.5) * 0.5;
    humidity += (r() - 0.5) * 1.5;
    pressure += (r() - 0.5) * 0.02;
    const reading: WeatherReading = {
      airTempF: clamp(60 + 22 * seasonal(t) + 14 * diurnal(t) + (r() - 0.5) * 4, 0, 110),
      humidityPct: clamp(humidity + 6 * seasonal(t) - 8 * diurnal(t), 10, 100),
      precipitationIn: r() < 0.05 ? r() * 0.4 : 0,
      windMph: clamp(6 + (r() - 0.5) * 8 + 4 * diurnal(t), 0, 35),
      pressureInHg: clamp(pressure, 28.5, 30.8),
    };
    map.set(t, reading);
  }
  return map;
}

export async function seedWeather(): Promise<void> {
  const [archive, recent] = await Promise.all([
    fetchHourly(archiveUrl()),
    fetchHourly(recentUrl()),
  ]);

  // Merge with `recent` winning on overlap (it's closer to "now").
  const merged = new Map<number, WeatherReading>(archive);
  for (const [ts, reading] of recent) merged.set(ts, reading);

  // Fall back to synthetic if both calls failed or returned almost nothing.
  const usable =
    merged.size >= SEED_HOURS / 2 ? merged : syntheticWeather();

  const sorted = [...usable.entries()].sort((a, b) => a[0] - b[0]);
  const nowCutoff = topOfPreviousHour();
  for (const [ts, reading] of sorted) {
    if (ts >= nowCutoff) break; // leave the live producer to handle now+.
    broker.produceAt("weather.observations", "open-meteo", reading, ts);
  }
}
