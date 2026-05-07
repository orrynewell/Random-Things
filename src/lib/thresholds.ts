// Threshold model: each metric has optional warn/critical bounds on either
// side. A reading's severity is the worst breach across those bounds.

export type Severity = "ok" | "warn" | "crit";

export interface Threshold {
  critLow?: number;
  warnLow?: number;
  warnHigh?: number;
  critHigh?: number;
}

export interface MetricDescriptor {
  key: string; // unique id, e.g. "garden.soil.moisturePct"
  zone: "garden" | "pond" | "hive" | "weather";
  label: string;
  unit: string;
  defaults: Threshold;
}

// Single registry of every metric we render. Adding a new sensor = adding a
// row here and producing the value from a producer.
export const METRICS: MetricDescriptor[] = [
  {
    key: "garden.soil.moisturePct",
    zone: "garden",
    label: "Soil moisture",
    unit: "%",
    defaults: { critLow: 15, warnLow: 25, warnHigh: 80, critHigh: 90 },
  },
  {
    key: "garden.soil.soilTempF",
    zone: "garden",
    label: "Soil temperature",
    unit: "°F",
    defaults: { critLow: 35, warnLow: 45, warnHigh: 88, critHigh: 95 },
  },
  {
    key: "garden.air.airTempF",
    zone: "garden",
    label: "Garden air temp",
    unit: "°F",
    defaults: { critLow: 32, warnLow: 40, warnHigh: 95, critHigh: 100 },
  },
  {
    key: "garden.air.humidityPct",
    zone: "garden",
    label: "Garden humidity",
    unit: "%",
    defaults: {},
  },
  {
    key: "pond.water.waterTempF",
    zone: "pond",
    label: "Pond water temp",
    unit: "°F",
    defaults: { critLow: 38, warnLow: 45, warnHigh: 82, critHigh: 88 },
  },
  {
    key: "pond.water.levelInches",
    zone: "pond",
    label: "Pond level (drop from full)",
    unit: "in",
    defaults: { warnHigh: 6, critHigh: 10 },
  },
  {
    key: "pond.water.ph",
    zone: "pond",
    label: "Pond pH",
    unit: "",
    defaults: { critLow: 6.0, warnLow: 6.5, warnHigh: 8.5, critHigh: 9.0 },
  },
  {
    key: "hive.telemetry.internalTempF",
    zone: "hive",
    label: "Hive internal temp",
    unit: "°F",
    defaults: { critLow: 80, warnLow: 88, warnHigh: 98, critHigh: 102 },
  },
  {
    key: "hive.telemetry.humidityPct",
    zone: "hive",
    label: "Hive humidity",
    unit: "%",
    defaults: { warnHigh: 75, critHigh: 85 },
  },
  {
    key: "hive.telemetry.weightLbs",
    zone: "hive",
    label: "Hive weight",
    unit: "lbs",
    defaults: { warnLow: 35, critLow: 25 },
  },
  {
    key: "hive.telemetry.soundDb",
    zone: "hive",
    label: "Hive sound",
    unit: "dB",
    defaults: { warnHigh: 65, critHigh: 75 },
  },
  {
    key: "weather.observations.airTempF",
    zone: "weather",
    label: "Outdoor temp",
    unit: "°F",
    defaults: { critLow: 28, warnLow: 36, warnHigh: 95, critHigh: 100 },
  },
  {
    key: "weather.observations.windMph",
    zone: "weather",
    label: "Wind",
    unit: "mph",
    defaults: { warnHigh: 20, critHigh: 35 },
  },
  {
    key: "weather.observations.precipitationIn",
    zone: "weather",
    label: "Precipitation",
    unit: "in",
    defaults: { warnHigh: 0.25, critHigh: 1.0 },
  },
];

export function evaluate(value: number, t: Threshold): Severity {
  if (t.critLow !== undefined && value <= t.critLow) return "crit";
  if (t.critHigh !== undefined && value >= t.critHigh) return "crit";
  if (t.warnLow !== undefined && value <= t.warnLow) return "warn";
  if (t.warnHigh !== undefined && value >= t.warnHigh) return "warn";
  return "ok";
}

export function severityRank(s: Severity): number {
  return s === "crit" ? 2 : s === "warn" ? 1 : 0;
}

export function worst(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}
