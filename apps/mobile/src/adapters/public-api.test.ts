import { describe, expect, it, vi } from "vitest";
import { publicApi } from "./public-api";

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(
    async (
      _url: string,
      _init: { headers: Record<string, string>; signal: AbortSignal },
    ) => new Response(JSON.stringify(body), { status }),
  );
}

describe("publicApi", () => {
  it("reads whole public views with the anon key and never sends a barrio or coordinates", async () => {
    const fetchFn = fakeFetch([]);
    const api = publicApi("https://x.supabase.co", "anon", fetchFn);
    await api.outages();
    await api.crowd();
    await api.barriosMeta();
    await api.eeqZones();
    const urls = fetchFn.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      "https://x.supabase.co/rest/v1/public_outages_active?select=*",
      "https://x.supabase.co/rest/v1/public_crowd_live?select=*",
      "https://x.supabase.co/rest/v1/public_barrios_meta?select=*",
      "https://x.supabase.co/rest/v1/public_eeq_zones?select=*",
    ]);
    for (const url of urls)
      expect(url).not.toMatch(/barrio_id|barrio=|lat|lng|lon/i);
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toEqual({
      apikey: "anon",
      Authorization: "Bearer anon",
    });
  });

  it("returns null meta when nothing was published", async () => {
    expect(
      await publicApi("https://x", "anon", fakeFetch([])).barriosMeta(),
    ).toBeNull();
  });

  it("downloads the barrios file without sending the API key", async () => {
    const fetchFn = fakeFetch({ type: "FeatureCollection", features: [] });
    await publicApi("https://x", "anon", fetchFn).barrios(
      "https://cdn/barrios-v1.geojson",
    );
    expect(fetchFn.mock.calls[0]?.[1]?.headers).toEqual({});
  });

  it("fails on an HTTP error", async () => {
    await expect(
      publicApi("https://x", "anon", fakeFetch({}, 503)).outages(),
    ).rejects.toThrow("GET /rest/v1/public_outages_active answered 503");
  });
});
