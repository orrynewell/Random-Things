import { DEFAULT_TIME_RANGE, type TimeRangeKey } from "../config";
import { broker } from "../kafka/broker";
import type { Message, TopicName } from "../kafka/types";
import {
  loadThresholdOverrides,
  saveThresholdOverrides,
} from "../lib/storage";
import {
  METRICS,
  evaluate,
  type Severity,
  type Threshold,
  worst,
} from "../lib/thresholds";

// State shape: latest reading per device per topic, plus a rolling history
// keyed by metric for charting. Thresholds are merged from defaults +
// user overrides.

export interface DeviceSnapshot {
  topic: TopicName;
  deviceId: string;
  value: Record<string, number>;
  timestamp: number;
}

export interface MetricPoint {
  t: number;
  v: number;
  deviceId: string;
}

export interface Alert {
  metricKey: string;
  deviceId: string;
  value: number;
  severity: Severity;
  since: number;
}

interface State {
  devices: Map<string, DeviceSnapshot>; // `${topic}|${deviceId}` -> snapshot
  history: Map<string, MetricPoint[]>; // metricKey -> rolling points
  thresholdOverrides: Record<string, Threshold>;
  alerts: Map<string, Alert>; // `${metricKey}|${deviceId}`
  timeRange: TimeRangeKey;
  seedingComplete: boolean;
}

const state: State = {
  devices: new Map(),
  history: new Map(),
  thresholdOverrides: loadThresholdOverrides(),
  alerts: new Map(),
  timeRange: DEFAULT_TIME_RANGE,
  seedingComplete: false,
};

const listeners = new Set<() => void>();
let snapshotVersion = 0;
let cachedSnapshot = buildSnapshot();

function buildSnapshot() {
  return {
    version: snapshotVersion,
    devices: state.devices,
    history: state.history,
    thresholdOverrides: state.thresholdOverrides,
    alerts: state.alerts,
    timeRange: state.timeRange,
    seedingComplete: state.seedingComplete,
  };
}

function emit() {
  snapshotVersion += 1;
  cachedSnapshot = buildSnapshot();
  for (const l of listeners) l();
}

// Cap each metric's history at enough to cover a full year of hourly seeded
// data plus thousands of live ticks. Charts downsample for display so the
// upper bound is not load-bearing for render perf.
const HISTORY_POINTS = 25_000;

function recordHistory(metricKey: string, point: MetricPoint) {
  const arr = state.history.get(metricKey) ?? [];
  arr.push(point);
  if (arr.length > HISTORY_POINTS) {
    arr.splice(0, arr.length - HISTORY_POINTS);
  }
  state.history.set(metricKey, arr);
}

export function effectiveThreshold(metricKey: string): Threshold {
  const desc = METRICS.find((m) => m.key === metricKey);
  const base = desc?.defaults ?? {};
  return { ...base, ...(state.thresholdOverrides[metricKey] ?? {}) };
}

function reevaluateAlertsFor(metricKey: string) {
  const t = effectiveThreshold(metricKey);
  const desc = METRICS.find((m) => m.key === metricKey);
  if (!desc) return;
  const points = state.history.get(metricKey) ?? [];
  // Only check the most recent point per device.
  const latestByDevice = new Map<string, MetricPoint>();
  for (const p of points) latestByDevice.set(p.deviceId, p);

  for (const [deviceId, p] of latestByDevice) {
    const sev = evaluate(p.v, t);
    const alertKey = `${metricKey}|${deviceId}`;
    if (sev === "ok") {
      state.alerts.delete(alertKey);
    } else {
      const existing = state.alerts.get(alertKey);
      state.alerts.set(alertKey, {
        metricKey,
        deviceId,
        value: p.v,
        severity: sev,
        since: existing?.severity === sev ? existing.since : Date.now(),
      });
    }
  }
}

// Topic -> field-name list, for breaking each producer message into individual
// numeric metric points. Keeping this here means the broker stays generic.
const TOPIC_METRICS: Record<TopicName, string[]> = {
  "garden.soil": ["moisturePct", "soilTempF"],
  "garden.air": ["airTempF", "humidityPct"],
  "pond.water": ["waterTempF", "levelInches", "ph"],
  "hive.telemetry": ["internalTempF", "humidityPct", "weightLbs", "soundDb"],
  "weather.observations": [
    "airTempF",
    "humidityPct",
    "precipitationIn",
    "windMph",
    "pressureInHg",
  ],
};

// While `bulkMode` is true (during the initial seed) we skip per-message
// alert re-evaluation and React emits. The caller flushes once at the end
// via `endBulkIngest`. Without this, seeding tens of thousands of points
// would trigger that many re-renders.
let bulkMode = false;

export function beginBulkIngest() {
  bulkMode = true;
}

export function endBulkIngest() {
  bulkMode = false;
  for (const m of METRICS) reevaluateAlertsFor(m.key);
  emit();
}

function ingest(msg: Message) {
  const value = msg.value as Record<string, number>;
  state.devices.set(`${msg.topic}|${msg.key}`, {
    topic: msg.topic,
    deviceId: msg.key,
    value,
    timestamp: msg.timestamp,
  });

  for (const field of TOPIC_METRICS[msg.topic] ?? []) {
    const v = value[field];
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    const metricKey = `${msg.topic}.${field}`;
    recordHistory(metricKey, { t: msg.timestamp, v, deviceId: msg.key });
    if (!bulkMode) reevaluateAlertsFor(metricKey);
  }
  if (!bulkMode) emit();
}

export function startConsumer(): () => void {
  // One subscription per topic — analogous to a Kafka consumer group with a
  // single member that handles every partition. The handler mutates the
  // shared store and then notifies React.
  const subs = (
    Object.keys(TOPIC_METRICS) as TopicName[]
  ).map((topic) => broker.subscribe(topic, ingest, { replay: true }));

  return () => subs.forEach((s) => s.unsubscribe());
}

// React hooks --------------------------------------------------------------

export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return cachedSnapshot;
}

// Threshold mutators -------------------------------------------------------

export function setThresholdOverride(metricKey: string, t: Threshold) {
  // Strip undefined/NaN so we never persist garbage.
  const clean: Threshold = {};
  for (const k of ["critLow", "warnLow", "warnHigh", "critHigh"] as const) {
    const v = t[k];
    if (typeof v === "number" && !Number.isNaN(v)) clean[k] = v;
  }
  state.thresholdOverrides = {
    ...state.thresholdOverrides,
    [metricKey]: clean,
  };
  saveThresholdOverrides(state.thresholdOverrides);
  reevaluateAlertsFor(metricKey);
  emit();
}

export function resetThresholdOverride(metricKey: string) {
  const next = { ...state.thresholdOverrides };
  delete next[metricKey];
  state.thresholdOverrides = next;
  saveThresholdOverrides(next);
  reevaluateAlertsFor(metricKey);
  emit();
}

// Convenience selectors ----------------------------------------------------

export function zoneSeverity(zone: string): Severity {
  let s: Severity = "ok";
  for (const m of METRICS) {
    if (m.zone !== zone) continue;
    for (const a of state.alerts.values()) {
      if (a.metricKey === m.key) s = worst(s, a.severity);
    }
  }
  return s;
}

// Time range -------------------------------------------------------------

export function setTimeRange(range: TimeRangeKey) {
  if (state.timeRange === range) return;
  state.timeRange = range;
  emit();
}

export function markSeedingComplete() {
  if (state.seedingComplete) return;
  state.seedingComplete = true;
  emit();
}
