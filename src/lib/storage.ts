import type { Threshold } from "./thresholds";

const KEY = "homestead.thresholds.v1";

export function loadThresholdOverrides(): Record<string, Threshold> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveThresholdOverrides(
  overrides: Record<string, Threshold>,
): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch {
    // Quota or privacy mode — silently degrade to in-memory only.
  }
}
