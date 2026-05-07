import { DEVICES, PRODUCE_INTERVAL_MS } from "../config";
import { broker } from "../kafka/broker";
import { latestValue } from "./latest";

export interface HiveReading {
  internalTempF: number;
  humidityPct: number;
  weightLbs: number; // honey + bees + box
  // Loud sustained sound can indicate queenlessness or swarm prep.
  soundDb: number;
}

function jitter(prev: number, delta: number, min: number, max: number) {
  const next = prev + (Math.random() - 0.5) * delta;
  return Math.min(max, Math.max(min, next));
}

export function startHiveProducers(): () => void {
  const state = new Map<string, HiveReading>();
  for (const dev of DEVICES.hives) {
    state.set(
      dev.id,
      latestValue<HiveReading>("hive.telemetry", dev.id, {
        internalTempF: 94,
        humidityPct: 55,
        weightLbs: 60,
        soundDb: 48,
      }),
    );
  }

  const interval = window.setInterval(() => {
    for (const dev of DEVICES.hives) {
      const prev = state.get(dev.id)!;
      const next: HiveReading = {
        internalTempF: jitter(prev.internalTempF, 0.4, 70, 105),
        humidityPct: jitter(prev.humidityPct, 1.5, 30, 90),
        weightLbs: jitter(prev.weightLbs, 0.3, 30, 150),
        soundDb: jitter(prev.soundDb, 1.5, 35, 80),
      };
      state.set(dev.id, next);
      broker.produce("hive.telemetry", dev.id, next);
    }
  }, PRODUCE_INTERVAL_MS.hive);

  return () => window.clearInterval(interval);
}
