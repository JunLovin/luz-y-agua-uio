import type { BarriosGeoJson } from "@luz-y-agua/shared";
import { describe, expect, it, vi } from "vitest";
import type { CitySnapshot } from "../domain/city";
import {
  ensureBarrios,
  refreshCity,
  type CachedBarrios,
  type CityCache,
  type PublicApi,
} from "./city-sync";

const geojson = (id: string): BarriosGeoJson => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id, name: id },
      geometry: { type: "Polygon", coordinates: [] },
    },
  ],
});

function memoryCache(
  snapshot: CitySnapshot | null = null,
  barrios: CachedBarrios | null = null,
): CityCache {
  return {
    snapshot: () => snapshot,
    saveSnapshot: (s) => void (snapshot = s),
    barrios: () => barrios,
    saveBarrios: (b) => void (barrios = b),
  };
}

function api(overrides: Partial<PublicApi> = {}): PublicApi {
  return {
    outages: async () => [],
    crowd: async () => [{ barrio_id: "solanda", service: "luz", reports: 5 }],
    barriosMeta: async () => ({
      version: 2,
      url: "https://x/barrios-v2.geojson",
    }),
    barrios: vi.fn(async () => geojson("v2")),
    ...overrides,
  };
}

const now = new Date("2026-10-20T15:00:00Z");
const offline = async () =>
  Promise.reject(new TypeError("Network request failed"));

describe("refreshCity", () => {
  it("downloads and caches the whole city", async () => {
    const cache = memoryCache();
    const result = await refreshCity(api(), cache, now);
    expect(result).toEqual({
      offline: false,
      snapshot: {
        outages: [],
        crowd: [{ barrio_id: "solanda", service: "luz", reports: 5 }],
        fetchedAt: now.toISOString(),
      },
    });
    expect(cache.snapshot()).toEqual(result.snapshot);
  });

  it("falls back to the last snapshot without a connection", async () => {
    const cached = {
      outages: [],
      crowd: [],
      fetchedAt: "2026-10-19T10:00:00Z",
    };
    expect(
      await refreshCity(api({ outages: offline }), memoryCache(cached), now),
    ).toEqual({
      snapshot: cached,
      offline: true,
    });
  });

  it("keeps the last snapshot when a view answers something that is not a list", async () => {
    const cached = {
      outages: [],
      crowd: [],
      fetchedAt: "2026-10-19T10:00:00Z",
    };
    const cache = memoryCache(cached);
    const broken = api({
      outages: async () => ({ message: "oops" }) as unknown as [],
    });
    expect(await refreshCity(broken, cache, now)).toEqual({
      snapshot: cached,
      offline: true,
    });
    expect(cache.snapshot()).toEqual(cached);
  });

  it("fails when there is no connection and nothing cached", async () => {
    await expect(
      refreshCity(api({ crowd: offline }), memoryCache(), now),
    ).rejects.toThrow("Network request failed");
  });
});

describe("ensureBarrios", () => {
  it("downloads a new version and caches it", async () => {
    const cache = memoryCache(null, { version: 1, geojson: geojson("v1") });
    expect(await ensureBarrios(api(), cache)).toEqual(geojson("v2"));
    expect(cache.barrios()?.version).toBe(2);
  });

  it("does not download the same version again", async () => {
    const client = api();
    expect(
      await ensureBarrios(
        client,
        memoryCache(null, { version: 2, geojson: geojson("v2") }),
      ),
    ).toEqual(geojson("v2"));
    expect(client.barrios).not.toHaveBeenCalled();
  });

  it("keeps the cached barrios when offline or when the new file is empty", async () => {
    const cached = { version: 1, geojson: geojson("v1") };
    expect(
      await ensureBarrios(
        api({ barriosMeta: offline }),
        memoryCache(null, cached),
      ),
    ).toEqual(geojson("v1"));
    const empty = api({
      barrios: async () => ({ type: "FeatureCollection", features: [] }),
    });
    expect(await ensureBarrios(empty, memoryCache(null, cached))).toEqual(
      geojson("v1"),
    );
  });

  it("returns null before anything was ever published", async () => {
    expect(
      await ensureBarrios(
        api({ barriosMeta: async () => null }),
        memoryCache(),
      ),
    ).toBeNull();
  });
});
