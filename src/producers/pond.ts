import { DEVICES, PRODUCE_INTERVAL_MS } from "../config";
import { broker } from "../kafka/broker";

export interface PondReading {
  waterTempF: number;
  levelInches: number; // distance from full; lower = fuller
  ph: number;
}

function jitter(prev: number, delta: number, min: number, max: number) {
  const next = prev + (Math.random() - 0.5) * delta;
  return Math.min(max, Math.max(min, next));
}

export function startPondProducer(): () => void {
  const state = new Map<string, PondReading>();
  for (const dev of DEVICES.pond) {
    state.set(dev.id, { waterTempF: 68, levelInches: 2, ph: 7.2 });
  }

  const interval = window.setInterval(() => {
    for (const dev of DEVICES.pond) {
      const prev = state.get(dev.id)!;
      const next: PondReading = {
        waterTempF: jitter(prev.waterTempF, 0.6, 35, 95),
        levelInches: jitter(prev.levelInches, 0.2, 0, 18),
        ph: jitter(prev.ph, 0.05, 5.5, 9.0),
      };
      state.set(dev.id, next);
      broker.produce("pond.water", dev.id, next);
    }
  }, PRODUCE_INTERVAL_MS.pond);

  return () => window.clearInterval(interval);
}
