# Random-Things

Two things live in this repo:

1. **Homestead Monitor** — a dashboard for Arduino-based homestead sensors
   (garden, pond, beehives) plus a local weather feed, with editable alert
   thresholds and a Kafka-shaped data pipeline. Deploys to GitHub Pages.
2. **Pandas_Issue/** — earlier notes on a real-world pandas `iterrows`
   performance trap, kept for reference. See
   [`Pandas_Issue/README.md`](./Pandas_Issue/README.md).

## Homestead Monitor

### What it does

- Renders status tiles per zone (garden, pond, hives, weather) with a
  green/yellow/red severity dot.
- Streams live data through an in-process Kafka stand-in:
  - **Real**: weather observations from
    [Open-Meteo](https://open-meteo.com/) for Pacific, MO 63069.
  - **Mocked**: garden, pond, and hive sensors (until the Arduinos are
    built).
- Charts each metric over time with threshold lines drawn on the chart.
- Lets you edit warn/critical thresholds per metric; overrides are saved
  in the browser.
- Shows the live Kafka topology (topics, partitions, offsets) so the
  pipeline isn't a black box.

### Run it locally

```sh
npm install
npm run dev
```

Open the printed URL.

### Deploy to GitHub Pages

1. On GitHub, open the repo's **Settings → Pages** and set
   **Source = GitHub Actions**.
2. Push to `main`. The workflow at `.github/workflows/deploy.yml` builds
   and publishes automatically.
3. Visit `https://<your-username>.github.io/Random-Things/`.

### Project structure

```
src/
  config.ts                location, devices, polling intervals
  kafka/
    types.ts               topic names, message shape
    broker.ts              in-memory Kafka stand-in
  producers/
    garden.ts              soil + air mock producers
    pond.ts                pond water mock producer
    hives.ts               hive telemetry mock producer
    weather.ts             real Open-Meteo producer
    index.ts               orchestrator
  lib/
    thresholds.ts          metric registry + severity logic
    storage.ts             localStorage for threshold overrides
  state/
    store.ts               consumer + reactive store
    useStore.ts            React hook
  components/              dashboard UI
  App.tsx                  layout
  main.tsx                 entry
```

### Roadmap

- Replace the mock broker with a real Kafka cluster (kafkajs adapter behind
  `src/kafka/`).
- Replace the mock producers with ESP32 firmware → MQTT → MQTT-Kafka bridge.
- Swap Open-Meteo for a local micro weather station once it's online.
- Add a small backend that runs threshold evaluation server-side and pushes
  to [ntfy.sh](https://ntfy.sh/) for phone notifications.

See [`KAFKA_NOTES.md`](./KAFKA_NOTES.md) for a walkthrough of each Kafka
concept and where it lives in this code.
