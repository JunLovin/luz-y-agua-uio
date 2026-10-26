import type { BarriosGeoJson } from "@luz-y-agua/shared";
import type { CitySnapshot, CrowdLive, PublicOutage } from "../domain/city";

/** Read-only public endpoints. None of them is ever filtered by barrio (PRINCIPIOS.md rule 12). */
export interface PublicApi {
  outages(): Promise<PublicOutage[]>;
  crowd(): Promise<CrowdLive[]>;
  barriosMeta(): Promise<{ version: number; url: string } | null>;
  barrios(url: string): Promise<BarriosGeoJson>;
}

export type CachedBarrios = { version: number; geojson: BarriosGeoJson };

export interface CityCache {
  snapshot(): CitySnapshot | null;
  saveSnapshot(snapshot: CitySnapshot): void;
  barrios(): CachedBarrios | null;
  saveBarrios(barrios: CachedBarrios): void;
}

/** Downloads the whole city; without a connection it falls back to the last snapshot. */
export async function refreshCity(
  api: PublicApi,
  cache: CityCache,
  now: Date,
): Promise<{ snapshot: CitySnapshot; offline: boolean }> {
  try {
    const [outages, crowd] = await Promise.all([api.outages(), api.crowd()]);
    if (!Array.isArray(outages) || !Array.isArray(crowd))
      throw new Error("Unexpected response from the public views");
    const snapshot = { outages, crowd, fetchedAt: now.toISOString() };
    cache.saveSnapshot(snapshot);
    return { snapshot, offline: false };
  } catch (error) {
    const cached = cache.snapshot();
    if (cached) return { snapshot: cached, offline: true };
    throw error;
  }
}

/** The barrios GeoJSON, downloaded again only when the published version changes. */
export async function ensureBarrios(
  api: PublicApi,
  cache: CityCache,
): Promise<BarriosGeoJson | null> {
  const cached = cache.barrios();
  try {
    const meta = await api.barriosMeta();
    if (!meta || cached?.version === meta.version)
      return cached?.geojson ?? null;
    const geojson = await api.barrios(meta.url);
    if (!Array.isArray(geojson.features) || geojson.features.length === 0) {
      throw new Error("The barrios file has no features");
    }
    cache.saveBarrios({ version: meta.version, geojson });
    return geojson;
  } catch (error) {
    if (cached) return cached.geojson;
    throw error;
  }
}
