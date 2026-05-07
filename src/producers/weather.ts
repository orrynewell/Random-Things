import { LOCATION, PRODUCE_INTERVAL_MS } from "../config";
import { broker } from "../kafka/broker";

export interface WeatherReading {
  airTempF: number;
  humidityPct: number;
  precipitationIn: number;
  windMph: number;
  pressureInHg: number;
}

// Open-Meteo is free, no API key required. We fetch "current" values and
// produce one message per poll. When you swap to a local station later,
// replace this fetch with a read against your station's API and keep the
// same topic/key shape — the dashboard won't change.
async function fetchOpenMeteo(): Promise<WeatherReading | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", LOCATION.latitude.toString());
  url.searchParams.set("longitude", LOCATION.longitude.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", LOCATION.timezone);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    return {
      airTempF: c.temperature_2m,
      humidityPct: c.relative_humidity_2m,
      precipitationIn: c.precipitation,
      windMph: c.wind_speed_10m,
      // Open-Meteo returns hPa; convert to inHg for US-friendly display.
      pressureInHg: c.pressure_msl * 0.02953,
    };
  } catch {
    return null;
  }
}

export function startWeatherProducer(): () => void {
  let cancelled = false;

  const tick = async () => {
    if (cancelled) return;
    const reading = await fetchOpenMeteo();
    if (reading) {
      broker.produce("weather.observations", "open-meteo", reading);
    }
  };

  void tick();
  const interval = window.setInterval(tick, PRODUCE_INTERVAL_MS.weather);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
}
