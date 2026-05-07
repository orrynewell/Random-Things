import { markSeedingComplete } from "../state/store";
import { seedSensors } from "./sensors";
import { seedWeather } from "./weather";

// Run the synchronous synthetic seeders first so charts have something
// immediately, then await real weather history (network call). When real
// data arrives it backfills the older portion of the weather chart.
export async function seedHistory(): Promise<void> {
  seedSensors();
  await seedWeather();
  markSeedingComplete();
}
