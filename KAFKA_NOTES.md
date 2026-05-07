# Kafka Learning Notes

This dashboard is shaped like a real Kafka deployment so the concepts you'll
need on your team show up in the code itself. Below maps each Kafka idea to
the file where it lives, and explains why the design choice matters.

## The mental model

Real Kafka is a **distributed, durable, append-only commit log** that many
producers write to and many consumers read from independently. It decouples
producers from consumers in time *and* in identity: a producer doesn't know
or care who reads its data, and a slow or failing consumer doesn't slow the
producer down.

For a homestead, the win is:

- An ESP32 in the garden can keep sending readings even if the dashboard is
  closed.
- Two consumers can read the same stream — e.g., one stores history to
  disk, another evaluates alert thresholds — without one breaking the other.
- You can replay history when you ship a new alert rule and want to test it
  against last week's data.

## Concepts in this code

### Topic — `src/kafka/types.ts` (`TopicName`)

A topic is a named stream. We chose **one topic per data shape**, not one per
device:

- `garden.soil`, `garden.air` — different sensors, different cadence.
- `pond.water`, `hive.telemetry`, `weather.observations`.

Rule of thumb: a topic should hold messages with the same schema. If you'd
need an `if` to figure out which fields a message has, split the topic.

### Partition / partition key — `broker.ts` and every `producer.ts`

Each topic is sharded into partitions. Within a partition, order is
preserved; across partitions, order is not. The **partition key** decides
which partition a message goes to.

We use the **device id** as the partition key. That guarantees that every
reading from `hive-1` lands in the same partition in order, while `hive-1`
and `hive-2` can be processed in parallel by different consumers. This is
the most common pattern: shard by entity id so each entity's history is
locally ordered.

### Offset — `broker.ts`

Each message gets a monotonically increasing offset within its partition.
Consumers track "what's the last offset I processed" — that's their cursor.
The Stream Topology panel in the UI shows the high-water-mark offset for
each partition; watch it tick up as messages arrive.

### Producer — `src/producers/*.ts`

A producer is anything that writes to the log. In real Kafka producers
batch, compress, and acknowledge writes; in our mock they just call
`broker.produce(topic, key, value)`. The call shape matches `kafkajs` and
`confluent-kafka-go` close enough that swapping libraries is mechanical.

### Consumer — `src/state/store.ts` (`startConsumer`)

A consumer subscribes to a topic and processes messages as they arrive.
Ours does two things real Kafka also offers:

- **Replay on subscribe** (`{ replay: true }`) — when the dashboard boots,
  it gets the retained backlog so charts aren't blank. Real Kafka does this
  via `auto.offset.reset=earliest`.
- **In-order per partition** — the broker iterates messages per partition,
  so per-device history is consistent.

### Consumer group (skipped, for now)

Real Kafka uses **consumer groups** so multiple consumer instances split
partitions among themselves and rebalance when one drops. We have one
consumer (the browser tab), so we skip this. When you add a backend
service that also reads, give it a different `group.id` so it doesn't
compete with the dashboard for the same offsets.

### Retention — `config.ts` (`HISTORY_LIMIT`) and `broker.ts`

Real Kafka retains by **time** (e.g., 7 days) or **size** (e.g., 100 GB)
per topic. We retain the last 240 messages per partition because charts
only need recent data and browser memory is finite. The principle is the
same: the log is bounded; old data ages out.

### Schema (informal here, formal in production)

Each topic's value type is declared in `src/producers/<topic>.ts` (e.g.,
`HiveReading`). In production you'd manage these in a **schema registry**
(Confluent Schema Registry, AWS Glue) using Avro/Protobuf so producers and
consumers can evolve independently. For your team's first cluster, start
with JSON + a TypeScript types package shared between services; graduate
to Avro when you need backward-compat guarantees across deploys.

## What changes when you add real Kafka

The point of the abstraction in `src/kafka/` is that **only that file
changes**. Specifically:

1. Replace `MockBroker` with a thin adapter around `kafkajs` (in Node) or a
   websocket bridge if you must read from the browser.
2. The browser dashboard probably keeps reading from a WebSocket fed by a
   small Node service; browsers can't speak Kafka's TCP protocol.
3. Producers move from the browser to actual devices/services. The
   ESP32-mqtt -> mqtt-kafka-bridge -> kafka -> websocket -> browser path is
   the conventional shape.

A reasonable first cluster:

- 1 broker (Confluent Cloud free tier or a single-node Kraft-mode Kafka).
- Topics: same names you see here, with 3–6 partitions each.
- Retention: 7 days to start.
- Producers: ESP32 over MQTT bridged to Kafka, plus a weather poller.
- Consumers: a Node service that does threshold evaluation and pushes to
  ntfy.sh, plus a websocket bridge for the dashboard.

## Things that bite people

- **Partitioning by something low-cardinality** (e.g., zone instead of
  device) creates hot partitions. Always partition by the most granular
  natural key.
- **Forgetting that partitions are the unit of parallelism**. If you have
  3 partitions, you can have at most 3 consumers in a group doing useful
  work. Size partitions for your peak parallelism, not your current load.
- **Treating Kafka as a database**. It's a log. Reads are sequential.
  Random lookups belong in Postgres/Redis fed by a Kafka consumer.
- **Not setting `acks=all` on producers** that care about durability.
  Default acks behavior varies between client libraries.
- **Time-windowed alerts in plain consumers**. Once your alert rules need
  state ("avg over 10 min"), reach for Kafka Streams or ksqlDB instead of
  rebuilding it yourself.
