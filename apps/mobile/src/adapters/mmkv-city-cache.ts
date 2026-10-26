import type { CachedBarrios, CityCache } from "../application/city-sync";
import type { CitySnapshot } from "../domain/city";
import { mmkvStore } from "./mmkv-store";

const SNAPSHOT = "city:snapshot";
const BARRIOS = "city:barrios";

function read<T>(key: string): T | null {
  const raw = mmkvStore().getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Same MMKV instance as the local state, so "Borrar todos mis datos" clears it too. */
export const mmkvCityCache: CityCache = {
  snapshot: () => read<CitySnapshot>(SNAPSHOT),
  saveSnapshot: (snapshot) =>
    mmkvStore().set(SNAPSHOT, JSON.stringify(snapshot)),
  barrios: () => read<CachedBarrios>(BARRIOS),
  saveBarrios: (barrios) => mmkvStore().set(BARRIOS, JSON.stringify(barrios)),
};
