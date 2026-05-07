import { broker } from "../kafka/broker";
import { useStore } from "../state/useStore";
import type { TopicName } from "../kafka/types";

const TOPICS: TopicName[] = [
  "garden.soil",
  "garden.air",
  "pond.water",
  "hive.telemetry",
  "weather.observations",
];

// Surfaces the Kafka model so you can watch topics, partitions, and offsets
// move in real time. When you swap in real Kafka, this same panel can read
// from the AdminClient API and look identical.
export function KafkaPanel() {
  // Re-render whenever store updates (which happens on every produce).
  useStore();

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          <span className="mr-2">🛰️</span>
          Stream topology
        </h2>
        <span className="text-xs text-slate-400">
          mock broker · swap for real Kafka without changing call sites
        </span>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((topic) => {
          const keys = broker.partitionKeys(topic);
          return (
            <div
              key={topic}
              className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
            >
              <div className="font-mono text-sm text-emerald-300">{topic}</div>
              <div className="mt-1 text-xs text-slate-400">
                {keys.length} partition{keys.length === 1 ? "" : "s"}
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {keys.map((k) => {
                  const log = broker.history(topic, k);
                  const high = log.length
                    ? log[log.length - 1].offset
                    : -1;
                  return (
                    <li
                      key={k}
                      className="flex items-center justify-between font-mono text-slate-300"
                    >
                      <span>{k}</span>
                      <span className="text-slate-500">
                        offset {high < 0 ? "—" : high}
                      </span>
                    </li>
                  );
                })}
                {keys.length === 0 && (
                  <li className="text-slate-500">awaiting first message…</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
