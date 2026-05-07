import { DEVICES, SEED_HOURS } from "../config";
import { broker } from "../kafka/broker";
import {
  clamp,
  diurnal,
  hourlyTimestamps,
  rng,
  seasonal,
  topOfPreviousHour,
} from "./synth";

// Synthetic backfill for devices we haven't built yet. Each metric gets a
// baseline + seasonal swing + diurnal swing + bounded random walk. That
// gives charts a realistic-looking shape across every range from 1h to 1y.

interface SeedSpec {
  // Initial value at the oldest timestamp.
  base: number;
  // Peak-to-trough seasonal amplitude (summer high, winter low).
  seasonal: number;
  // Peak-to-trough diurnal amplitude (afternoon high, predawn low).
  diurnal: number;
  // Per-step noise magnitude.
  noise: number;
  // Random-walk step magnitude (slow drift independent of cycles).
  drift: number;
  min: number;
  max: number;
}

function walkSeries(
  spec: SeedSpec,
  rand: () => number,
  timestamps: number[],
): number[] {
  let level = spec.base;
  const out: number[] = [];
  for (const t of timestamps) {
    // Drift accumulates between steps.
    level += (rand() - 0.5) * 2 * spec.drift;
    // Pull toward base so drift doesn't run away over a year.
    level += (spec.base - level) * 0.005;
    const sample =
      level +
      spec.seasonal * seasonal(t) +
      spec.diurnal * diurnal(t) +
      (rand() - 0.5) * 2 * spec.noise;
    out.push(clamp(sample, spec.min, spec.max));
  }
  return out;
}

export function seedSensors(): void {
  const endMs = topOfPreviousHour();
  const timestamps = Array.from(hourlyTimestamps(SEED_HOURS, endMs));

  // ---- Garden ----------------------------------------------------------
  for (const dev of DEVICES.garden) {
    const r = rng(hashSeed(dev.id));
    const moisture = walkSeries(
      {
        base: 50,
        seasonal: -8, // drier in summer
        diurnal: -4, // dips in the afternoon heat
        noise: 1.5,
        drift: 0.4,
        min: 8,
        max: 95,
      },
      r,
      timestamps,
    );
    const soilTemp = walkSeries(
      {
        base: 60,
        seasonal: 18,
        diurnal: 6,
        noise: 0.6,
        drift: 0.2,
        min: 30,
        max: 95,
      },
      r,
      timestamps,
    );
    const airTemp = walkSeries(
      {
        base: 60,
        seasonal: 22,
        diurnal: 14,
        noise: 1.2,
        drift: 0.3,
        min: 10,
        max: 105,
      },
      r,
      timestamps,
    );
    const humidity = walkSeries(
      {
        base: 60,
        seasonal: 5,
        diurnal: -8,
        noise: 2,
        drift: 0.6,
        min: 15,
        max: 100,
      },
      r,
      timestamps,
    );

    timestamps.forEach((t, i) => {
      broker.produceAt(
        "garden.soil",
        dev.id,
        { moisturePct: moisture[i], soilTempF: soilTemp[i] },
        t,
      );
      broker.produceAt(
        "garden.air",
        dev.id,
        { airTempF: airTemp[i], humidityPct: humidity[i] },
        t,
      );
    });
  }

  // ---- Pond ------------------------------------------------------------
  for (const dev of DEVICES.pond) {
    const r = rng(hashSeed(dev.id));
    const waterTemp = walkSeries(
      {
        base: 58,
        seasonal: 18, // pond lags air a bit but still tracks seasons
        diurnal: 1.5,
        noise: 0.3,
        drift: 0.15,
        min: 35,
        max: 90,
      },
      r,
      timestamps,
    );
    const level = walkSeries(
      {
        base: 2,
        seasonal: 1.2, // higher drop in summer (evaporation)
        diurnal: 0.05,
        noise: 0.15,
        drift: 0.25,
        min: 0,
        max: 14,
      },
      r,
      timestamps,
    );
    const ph = walkSeries(
      {
        base: 7.2,
        seasonal: 0.2,
        diurnal: 0.05,
        noise: 0.04,
        drift: 0.02,
        min: 6.0,
        max: 8.8,
      },
      r,
      timestamps,
    );

    timestamps.forEach((t, i) => {
      broker.produceAt(
        "pond.water",
        dev.id,
        { waterTempF: waterTemp[i], levelInches: level[i], ph: ph[i] },
        t,
      );
    });
  }

  // ---- Hives -----------------------------------------------------------
  for (const dev of DEVICES.hives) {
    const r = rng(hashSeed(dev.id));
    const internal = walkSeries(
      {
        base: 94,
        seasonal: 1.5, // bees are champion thermoregulators
        diurnal: 0.6,
        noise: 0.25,
        drift: 0.1,
        min: 78,
        max: 102,
      },
      r,
      timestamps,
    );
    const humidity = walkSeries(
      {
        base: 55,
        seasonal: 6,
        diurnal: -4,
        noise: 1.5,
        drift: 0.4,
        min: 30,
        max: 90,
      },
      r,
      timestamps,
    );
    const weight = walkSeries(
      {
        base: 60,
        seasonal: 22, // heavy late summer (honey), light late winter
        diurnal: 0.4,
        noise: 0.2,
        drift: 0.15,
        min: 28,
        max: 140,
      },
      r,
      timestamps,
    );
    const sound = walkSeries(
      {
        base: 48,
        seasonal: 4, // louder in summer foraging
        diurnal: 6, // louder during the day
        noise: 1.5,
        drift: 0.5,
        min: 36,
        max: 78,
      },
      r,
      timestamps,
    );

    timestamps.forEach((t, i) => {
      broker.produceAt(
        "hive.telemetry",
        dev.id,
        {
          internalTempF: internal[i],
          humidityPct: humidity[i],
          weightLbs: weight[i],
          soundDb: sound[i],
        },
        t,
      );
    });
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
