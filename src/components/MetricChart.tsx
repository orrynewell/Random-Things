import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TIME_RANGES } from "../config";
import { useStore } from "../state/useStore";
import { effectiveThreshold } from "../state/store";

interface Props {
  metricKey: string;
  unit: string;
  height?: number;
}

const MAX_VISIBLE_POINTS = 400;

// Render at most MAX_VISIBLE_POINTS by uniform stride. Cheap and good
// enough for monitoring; replace with LTTB if peaks/valleys matter more.
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  // Always keep the last point so live ticks are visible.
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function formatTick(value: number, fmt: "time" | "datetime" | "date"): string {
  const d = new Date(value);
  if (fmt === "time") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (fmt === "datetime") {
    return d.toLocaleDateString([], { month: "numeric", day: "numeric" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MetricChart({ metricKey, unit, height = 140 }: Props) {
  const { history, timeRange } = useStore();
  const range = TIME_RANGES[timeRange];
  const cutoff = Date.now() - range.ms;

  const allPoints = history.get(metricKey) ?? [];
  const inRange = allPoints.filter((p) => p.t >= cutoff);
  const t = effectiveThreshold(metricKey);

  // Bucket by device, downsample each device's series independently so
  // sparse and dense streams both render well.
  const byDevice = new Map<string, { t: number; v: number }[]>();
  for (const p of inRange) {
    const arr = byDevice.get(p.deviceId) ?? [];
    arr.push({ t: p.t, v: p.v });
    byDevice.set(p.deviceId, arr);
  }
  const devices = Array.from(byDevice.keys());
  const downsampled = new Map(
    devices.map((d) => [d, downsample(byDevice.get(d)!, MAX_VISIBLE_POINTS)]),
  );

  // Recharts wants a single dataset; merge by timestamp.
  const tsSet = new Set<number>();
  for (const arr of downsampled.values()) for (const p of arr) tsSet.add(p.t);
  const allTs = Array.from(tsSet).sort((a, b) => a - b);
  const merged = allTs.map((ts) => {
    const row: Record<string, number> = { t: ts };
    for (const [dev, arr] of downsampled) {
      const found = arr.find((p) => p.t === ts);
      if (found) row[dev] = found.v;
    }
    return row;
  });

  const colors = ["#60a5fa", "#a78bfa", "#34d399", "#f472b6"];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={merged}>
          <XAxis
            dataKey="t"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) => formatTick(v as number, range.tickFormat)}
            minTickGap={32}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
            }}
            labelFormatter={(v) => new Date(v as number).toLocaleString()}
            formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, ""]}
          />
          {t.warnLow !== undefined && (
            <ReferenceLine
              y={t.warnLow}
              stroke="#d97706"
              strokeDasharray="3 3"
            />
          )}
          {t.warnHigh !== undefined && (
            <ReferenceLine
              y={t.warnHigh}
              stroke="#d97706"
              strokeDasharray="3 3"
            />
          )}
          {t.critLow !== undefined && (
            <ReferenceLine y={t.critLow} stroke="#dc2626" />
          )}
          {t.critHigh !== undefined && (
            <ReferenceLine y={t.critHigh} stroke="#dc2626" />
          )}
          {devices.map((dev, i) => (
            <Line
              key={dev}
              type="monotone"
              dataKey={dev}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
