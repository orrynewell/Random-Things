import { DEVICES, PRODUCE_INTERVAL_MS } from "../config";
import { broker } from "../kafka/broker";

// Two topics for the garden so a soil sensor and an air sensor can scale
// independently — exactly how you'd carve up Kafka topics in production.

export interface GardenSoilReading {
  moisturePct: number; // 0-100
  soilTempF: number;
}

export interface GardenAirReading {
  airTempF: number;
  humidityPct: number;
}

// Random walk so the chart looks like a sensor, not a sine wave.
function nextValue(prev: number, delta: number, min: number, max: number) {
  const next = prev + (Math.random() - 0.5) * delta;
  return Math.min(max, Math.max(min, next));
}

export function startGardenProducers(): () => void {
  const soilState = new Map<string, GardenSoilReading>();
  const airState = new Map<string, GardenAirReading>();

  for (const dev of DEVICES.garden) {
    soilState.set(dev.id, { moisturePct: 45, soilTempF: 65 });
    airState.set(dev.id, { airTempF: 72, humidityPct: 55 });
  }

  const interval = window.setInterval(() => {
    for (const dev of DEVICES.garden) {
      const soil = soilState.get(dev.id)!;
      const next: GardenSoilReading = {
        moisturePct: nextValue(soil.moisturePct, 4, 5, 95),
        soilTempF: nextValue(soil.soilTempF, 1, 40, 95),
      };
      soilState.set(dev.id, next);
      broker.produce("garden.soil", dev.id, next);

      const air = airState.get(dev.id)!;
      const nextAir: GardenAirReading = {
        airTempF: nextValue(air.airTempF, 1.5, 30, 105),
        humidityPct: nextValue(air.humidityPct, 3, 10, 100),
      };
      airState.set(dev.id, nextAir);
      broker.produce("garden.air", dev.id, nextAir);
    }
  }, PRODUCE_INTERVAL_MS.garden);

  return () => window.clearInterval(interval);
}
