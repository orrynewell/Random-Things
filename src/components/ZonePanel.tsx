import { useState } from "react";
import { METRICS, type MetricDescriptor } from "../lib/thresholds";
import { effectiveThreshold } from "../state/store";
import { evaluate } from "../lib/thresholds";
import { useStore } from "../state/useStore";
import { MetricChart } from "./MetricChart";
import { SeverityDot } from "./SeverityDot";
import { ThresholdEditor } from "./ThresholdEditor";

interface Props {
  zone: "garden" | "pond" | "hive" | "weather";
  title: string;
  emoji: string;
}

export function ZonePanel({ zone, title, emoji }: Props) {
  const { history } = useStore();
  const metrics = METRICS.filter((m) => m.zone === zone);
  const [editing, setEditing] = useState<MetricDescriptor | null>(null);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          <span className="mr-2">{emoji}</span>
          {title}
        </h2>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {metrics.map((m) => {
          const points = history.get(m.key) ?? [];
          const latestByDevice = new Map<string, number>();
          for (const p of points) latestByDevice.set(p.deviceId, p.v);
          const t = effectiveThreshold(m.key);
          return (
            <div key={m.key} className="rounded-lg bg-slate-950/40 p-3">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {m.label}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                    {latestByDevice.size === 0 ? (
                      <span>waiting for data…</span>
                    ) : (
                      Array.from(latestByDevice.entries()).map(([dev, v]) => {
                        const sev = evaluate(v, t);
                        return (
                          <span
                            key={dev}
                            className="inline-flex items-center gap-1"
                          >
                            <SeverityDot severity={sev} />
                            <span className="text-slate-300">{dev}:</span>
                            <span className="font-mono text-slate-100">
                              {v.toFixed(2)}
                              {m.unit}
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(m)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  thresholds
                </button>
              </div>
              <MetricChart metricKey={m.key} unit={m.unit} />
            </div>
          );
        })}
      </div>
      {editing && (
        <ThresholdEditor
          metricKey={editing.key}
          unit={editing.unit}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
