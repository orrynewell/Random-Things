import { zoneSeverity } from "../state/store";
import { useStore } from "../state/useStore";
import { SeverityDot } from "./SeverityDot";

const ZONES: Array<{
  key: "garden" | "pond" | "hive" | "weather";
  label: string;
  emoji: string;
}> = [
  { key: "garden", label: "Garden", emoji: "🌱" },
  { key: "pond", label: "Pond", emoji: "🐟" },
  { key: "hive", label: "Hives", emoji: "🐝" },
  { key: "weather", label: "Weather", emoji: "🌤️" },
];

export function ZoneSummary() {
  // Subscribe so the dots update on every alert change.
  useStore();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ZONES.map((z) => {
        const sev = zoneSeverity(z.key);
        return (
          <div
            key={z.key}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                {z.label}
              </div>
              <div className="text-2xl">{z.emoji}</div>
            </div>
            <SeverityDot severity={sev} />
          </div>
        );
      })}
    </div>
  );
}
