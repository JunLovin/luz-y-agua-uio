import type { BarriosGeoJson } from "@luz-y-agua/shared";
import { config } from "@luz-y-agua/shared";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { mmkvCityCache } from "../adapters/mmkv-city-cache";
import { configuredPublicApi } from "../adapters/public-api";
import { ensureBarrios, refreshCity } from "../application/city-sync";
import type { CitySnapshot } from "../domain/city";

export type CityState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      barrios: BarriosGeoJson | null;
      snapshot: CitySnapshot;
      offline: boolean;
    };

let state: CityState = { status: "loading" };
let loading: Promise<void> | null = null;
let lastAttempt = 0;
const listeners = new Set<() => void>();

function set(next: CityState) {
  state = next;
  for (const listener of listeners) listener();
}

/** Downloads the barrios and the whole city once for every screen; falls back to the cache offline. */
export function refreshCityData(): Promise<void> {
  lastAttempt = Date.now();
  loading ??= (async () => {
    try {
      const api = configuredPublicApi();
      const [barrios, city] = await Promise.allSettled([
        ensureBarrios(api, mmkvCityCache),
        refreshCity(api, mmkvCityCache, new Date()),
      ]);
      if (city.status === "rejected") return set({ status: "error" });
      set({
        status: "ready",
        barrios: barrios.status === "fulfilled" ? barrios.value : null,
        snapshot: city.value.snapshot,
        offline: city.value.offline,
      });
    } catch {
      set({ status: "error" });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** After "Borrar todos mis datos": forget what is in memory and download again. */
export function resetCityData(): void {
  set({ status: "loading" });
  void refreshCityData();
}

export function useCity(): CityState {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (
        status === "active" &&
        Date.now() - lastAttempt > config.mobile.cityRefreshMs
      )
        void refreshCityData();
    });
    return () => subscription.remove();
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      if (state.status === "loading" && !loading) void refreshCityData();
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
  );
}
