import { HISTORY_LIMIT } from "../config";
import type {
  ConsumerHandler,
  Message,
  Subscription,
  TopicName,
} from "./types";

// In-memory Kafka stand-in. Concepts modeled here:
//   * Topic + partition (partition === message.key)
//   * Append-only log with monotonically increasing offsets
//   * Bounded retention (ring buffer of HISTORY_LIMIT messages per partition)
//   * Consumer subscriptions that receive new messages as they're produced
//   * Replay: consumers can request the current backlog on subscribe
//
// What we deliberately skip (and why it doesn't matter for a single-page app):
//   * Network protocol, durability, replication, ACLs
//   * Consumer groups with rebalancing — we have one consumer (the UI)

interface PartitionLog {
  messages: Message[];
  nextOffset: number;
}

type TopicLog = Map<string, PartitionLog>; // partition key -> log

class MockBroker {
  private topics = new Map<TopicName, TopicLog>();
  private subscribers = new Map<TopicName, Set<ConsumerHandler>>();

  produce<T>(topic: TopicName, key: string, value: T): Message<T> {
    const partitions = this.getOrCreateTopic(topic);
    const partition = partitions.get(key) ?? { messages: [], nextOffset: 0 };
    const message: Message<T> = {
      topic,
      key,
      value,
      timestamp: Date.now(),
      offset: partition.nextOffset,
    };
    partition.messages.push(message);
    partition.nextOffset += 1;
    if (partition.messages.length > HISTORY_LIMIT) {
      partition.messages.splice(0, partition.messages.length - HISTORY_LIMIT);
    }
    partitions.set(key, partition);

    const handlers = this.subscribers.get(topic);
    if (handlers) {
      for (const handler of handlers) handler(message);
    }
    return message;
  }

  // Subscribe to live messages on a topic. If `replay` is true, the handler
  // is first called once per message currently retained (oldest -> newest).
  subscribe<T>(
    topic: TopicName,
    handler: ConsumerHandler<T>,
    options: { replay?: boolean } = {},
  ): Subscription {
    if (options.replay) {
      const partitions = this.topics.get(topic);
      if (partitions) {
        const all: Message[] = [];
        for (const p of partitions.values()) all.push(...p.messages);
        all.sort((a, b) => a.timestamp - b.timestamp);
        for (const m of all) handler(m as Message<T>);
      }
    }

    const handlers =
      this.subscribers.get(topic) ?? new Set<ConsumerHandler>();
    handlers.add(handler as ConsumerHandler);
    this.subscribers.set(topic, handlers);

    return {
      unsubscribe: () => {
        handlers.delete(handler as ConsumerHandler);
      },
    };
  }

  // Snapshot helpers used by the UI on first render.
  history<T>(topic: TopicName, key: string): Message<T>[] {
    const log = this.topics.get(topic)?.get(key);
    return log ? ([...log.messages] as Message<T>[]) : [];
  }

  partitionKeys(topic: TopicName): string[] {
    const partitions = this.topics.get(topic);
    return partitions ? Array.from(partitions.keys()) : [];
  }

  private getOrCreateTopic(topic: TopicName): TopicLog {
    let partitions = this.topics.get(topic);
    if (!partitions) {
      partitions = new Map();
      this.topics.set(topic, partitions);
    }
    return partitions;
  }
}

// One broker instance for the whole app — the equivalent of pointing every
// producer/consumer at the same bootstrap server.
export const broker = new MockBroker();
