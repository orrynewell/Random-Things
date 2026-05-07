import { TIME_RANGES, type TimeRangeKey } from "../config";
import { setTimeRange } from "../state/store";
import { useStore } from "../state/useStore";

const ORDER: TimeRangeKey[] = ["1h", "1d", "1w", "1m", "3m", "1y"];

export function TimeRangeSelector() {
  const { timeRange } = useStore();
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-900/60 text-xs"
    >
      {ORDER.map((key) => {
        const active = timeRange === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => setTimeRange(key)}
            className={
              "px-2.5 py-1.5 transition-colors " +
              (active
                ? "bg-emerald-600 text-white"
                : "text-slate-300 hover:bg-slate-800")
            }
            title={TIME_RANGES[key].label}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
