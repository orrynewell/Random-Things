import { useState } from "react";
import {
  effectiveThreshold,
  resetThresholdOverride,
  setThresholdOverride,
} from "../state/store";
import type { Threshold } from "../lib/thresholds";

interface Props {
  metricKey: string;
  unit: string;
  onClose: () => void;
}

const FIELDS: Array<keyof Threshold> = [
  "critLow",
  "warnLow",
  "warnHigh",
  "critHigh",
];

const LABELS: Record<keyof Threshold, string> = {
  critLow: "Critical low",
  warnLow: "Warn low",
  warnHigh: "Warn high",
  critHigh: "Critical high",
};

export function ThresholdEditor({ metricKey, unit, onClose }: Props) {
  const current = effectiveThreshold(metricKey);
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of FIELDS) {
      out[f] = current[f] !== undefined ? String(current[f]) : "";
    }
    return out;
  });

  const apply = () => {
    const next: Threshold = {};
    for (const f of FIELDS) {
      const raw = draft[f];
      if (raw === "" || raw === undefined) continue;
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) next[f] = parsed;
    }
    setThresholdOverride(metricKey, next);
    onClose();
  };

  const reset = () => {
    resetThresholdOverride(metricKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5">
        <h3 className="mb-1 text-lg font-semibold">Edit thresholds</h3>
        <p className="mb-4 text-xs text-slate-400">
          {metricKey} ({unit || "no unit"})
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <label key={f} className="text-sm">
              <span className="block text-slate-300">{LABELS[f]}</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={draft[f]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [f]: e.target.value }))
                }
                placeholder="—"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100 outline-none focus:border-slate-500"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-2">
          <button
            onClick={reset}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
