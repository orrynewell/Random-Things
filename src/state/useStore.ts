import { useSyncExternalStore } from "react";
import { getSnapshot, subscribeStore } from "./store";

export function useStore() {
  return useSyncExternalStore(subscribeStore, getSnapshot, getSnapshot);
}
