import { useEffect, useState } from "react";
import { AlertBanner } from "./components/AlertBanner";
import { KafkaPanel } from "./components/KafkaPanel";
import { TimeRangeSelector } from "./components/TimeRangeSelector";
import { ZonePanel } from "./components/ZonePanel";
import { ZoneSummary } from "./components/ZoneSummary";
import { LOCATION } from "./config";
import { startAllProducers } from "./producers";
import { seedHistory } from "./seed";
import {
  beginBulkIngest,
  endBulkIngest,
  startConsumer,
} from "./state/store";

export default function App() {
  const [bootStatus, setBootStatus] = useState<"seeding" | "live">("seeding");

  useEffect(() => {
    let stopProducers: (() => void) | null = null;
    beginBulkIngest();
    const stopConsumer = startConsumer();

    seedHistory()
      .catch(() => {
        // Sensor seed is sync and can't fail; weather seed already falls
        // back to synthetic. Catch only to keep React from logging.
      })
      .finally(() => {
        endBulkIngest();
        stopProducers = startAllProducers();
        setBootStatus("live");
      });

    return () => {
      stopProducers?.();
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
            {LOCATION.name} · mock device data · weather from Open-Meteo
            (live + 1y archive)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeSelector />
          <span
            className={
              "text-xs " +
              (bootStatus === "seeding"
                ? "text-amber-300"
                : "text-emerald-300")
            }
          >
            {bootStatus === "seeding" ? "loading history…" : "live"}
          </span>
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
