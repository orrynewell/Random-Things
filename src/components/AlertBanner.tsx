import { useStore } from "../state/useStore";
import { METRICS } from "../lib/thresholds";

export function AlertBanner() {
  const { alerts } = useStore();
  const list = Array.from(alerts.values()).sort((a, b) =>
    a.severity === b.severity ? b.since - a.since : a.severity === "crit" ? -1 : 1,
  );

  if (list.length === 0) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-slate-400">
        All systems within thresholds.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {list.map((a) => {
        const desc = METRICS.find((m) => m.key === a.metricKey);
        const tone =
          a.severity === "crit"
            ? "border-crit/50 bg-crit/10 text-red-200"
            : "border-warn/50 bg-warn/10 text-amber-200";
        return (
          <div
            key={`${a.metricKey}|${a.deviceId}`}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${tone}`}
          >
            <div>
              <span className="font-medium uppercase tracking-wide">
                {a.severity}
              </span>{" "}
              · {desc?.label ?? a.metricKey} ·{" "}
              <span className="text-slate-300">{a.deviceId}</span>
            </div>
            <div className="font-mono text-xs">
              {a.value.toFixed(2)} {desc?.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
