import type { BarriosGeoJson } from "@luz-y-agua/shared";
import { useCallback, useEffect, useState } from "react";
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

/** Loads the barrios and the whole city once, falling back to the cache offline. */
export function useCity(): CityState & { refresh: () => void } {
  const [state, setState] = useState<CityState>({ status: "loading" });

  const refresh = useCallback(() => {
    void (async () => {
      try {
        const api = configuredPublicApi();
        const [barrios, city] = await Promise.allSettled([
          ensureBarrios(api, mmkvCityCache),
          refreshCity(api, mmkvCityCache, new Date()),
        ]);
        if (city.status === "rejected") return setState({ status: "error" });
        setState({
          status: "ready",
          barrios: barrios.status === "fulfilled" ? barrios.value : null,
          snapshot: city.value.snapshot,
          offline: city.value.offline,
        });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, []);

  useEffect(refresh, [refresh]);
  return { ...state, refresh };
}
