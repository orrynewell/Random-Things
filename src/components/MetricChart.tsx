import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "../state/useStore";
import { effectiveThreshold } from "../state/store";

interface Props {
  metricKey: string;
  unit: string;
  height?: number;
}

export function MetricChart({ metricKey, unit, height = 140 }: Props) {
  const { history } = useStore();
  const points = history.get(metricKey) ?? [];
  const t = effectiveThreshold(metricKey);

  // Group points by deviceId so each device gets its own line.
  const byDevice = new Map<string, { t: number; v: number }[]>();
  for (const p of points) {
    const arr = byDevice.get(p.deviceId) ?? [];
    arr.push({ t: p.t, v: p.v });
    byDevice.set(p.deviceId, arr);
  }

  // Recharts wants a single dataset; we'll merge by timestamp index.
  const allTs = Array.from(new Set(points.map((p) => p.t))).sort();
  const merged = allTs.map((ts) => {
    const row: Record<string, number> = { t: ts };
    for (const [dev, arr] of byDevice) {
      const found = arr.find((p) => p.t === ts);
      if (found) row[dev] = found.v;
    }
    return row;
  });

  const devices = Array.from(byDevice.keys());
  const colors = ["#60a5fa", "#a78bfa", "#34d399", "#f472b6"];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={merged}>
          <XAxis
            dataKey="t"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
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
            labelFormatter={(v) => new Date(v as number).toLocaleTimeString()}
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
