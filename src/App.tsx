import { useEffect } from "react";
import { AlertBanner } from "./components/AlertBanner";
import { KafkaPanel } from "./components/KafkaPanel";
import { ZonePanel } from "./components/ZonePanel";
import { ZoneSummary } from "./components/ZoneSummary";
import { LOCATION } from "./config";
import { startAllProducers } from "./producers";
import { startConsumer } from "./state/store";

export default function App() {
  useEffect(() => {
    const stopConsumer = startConsumer();
    const stopProducers = startAllProducers();
    return () => {
      stopProducers();
      stopConsumer();
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            🌾 Homestead Monitor
          </h1>
          <p className="text-sm text-slate-400">
            {LOCATION.name} · mock device data · real weather from Open-Meteo
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Streaming through an in-process Kafka stand-in.{" "}
          <a
            href="https://github.com/orrynewell/random-things/blob/main/KAFKA_NOTES.md"
            className="underline hover:text-slate-300"
          >
            Why?
          </a>
        </div>
      </header>

      <div className="space-y-4">
        <ZoneSummary />
        <AlertBanner />

        <ZonePanel zone="weather" title="Weather (live)" emoji="🌤️" />
        <ZonePanel zone="garden" title="Garden" emoji="🌱" />
        <ZonePanel zone="pond" title="Pond" emoji="🐟" />
        <ZonePanel zone="hive" title="Bee Hives" emoji="🐝" />

        <KafkaPanel />

        <footer className="pt-6 text-center text-xs text-slate-500">
          Thresholds saved in your browser. Edit any tile to tune them.
        </footer>
      </div>
    </div>
  );
}
