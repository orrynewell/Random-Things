// Shapes that mirror Kafka's wire model so swapping the mock for real Kafka
// is a matter of changing the broker implementation, not the call sites.

export type TopicName =
  | "garden.soil"
  | "garden.air"
  | "pond.water"
  | "hive.telemetry"
  | "weather.observations";

export interface Message<T = unknown> {
  topic: TopicName;
  // Partition key — in real Kafka this routes to a partition. Here we use
  // the device id so each device's stream stays ordered.
  key: string;
  value: T;
  // Producer timestamp (ms since epoch).
  timestamp: number;
  // Offset assigned by the broker on append.
  offset: number;
}

export type ConsumerHandler<T = unknown> = (msg: Message<T>) => void;

export interface Subscription {
  unsubscribe: () => void;
}
