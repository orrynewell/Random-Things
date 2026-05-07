import { startGardenProducers } from "./garden";
import { startHiveProducers } from "./hives";
import { startPondProducer } from "./pond";
import { startWeatherProducer } from "./weather";

// Kicks off every producer. In a real deployment each of these would be a
// separate process (or device) connected to the same Kafka cluster. Here
// they all run in the browser tab.
export function startAllProducers(): () => void {
  const stops = [
    startGardenProducers(),
    startPondProducer(),
    startHiveProducers(),
    startWeatherProducer(),
  ];
  return () => stops.forEach((s) => s());
}
