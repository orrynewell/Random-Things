import { broker } from "../kafka/broker";
import type { TopicName } from "../kafka/types";

// Returns the most recent value retained on a (topic, partition) or the
// fallback if none. Used by live producers to resume from seeded state.
export function latestValue<T>(
  topic: TopicName,
  key: string,
  fallback: T,
): T {
  const log = broker.history<T>(topic, key);
  return log.length ? log[log.length - 1].value : fallback;
}
