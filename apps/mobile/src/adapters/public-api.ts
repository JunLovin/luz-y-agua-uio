import type { BarriosGeoJson } from "@luz-y-agua/shared";
import type { PublicApi } from "../application/city-sync";
import type { CrowdLive, PublicOutage } from "../domain/city";

const TIMEOUT_MS = 15_000;

type Fetch = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<Response>;

export type EeqZone = { id: string; name: string };
type Api = PublicApi & { eeqZones(): Promise<EeqZone[]> };

/** Reads the public views with the anon key. The paths are fixed: no barrio, no coordinates. */
export function publicApi(
  baseUrl: string,
  anonKey: string,
  fetchFn: Fetch = fetch,
): Api {
  async function get<T>(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchFn(url, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          `GET ${new URL(url).pathname} answered ${response.status}`,
        );
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
  const view = <T>(name: string) =>
    get<T>(`${baseUrl}/rest/v1/${name}?select=*`, {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    });

  return {
    outages: () => view<PublicOutage[]>("public_outages_active"),
    crowd: () => view<CrowdLive[]>("public_crowd_live"),
    barriosMeta: async () =>
      (
        await view<{ version: number; url: string }[]>("public_barrios_meta")
      )[0] ?? null,
    barrios: (url) => get<BarriosGeoJson>(url),
    eeqZones: () => view<EeqZone[]>("public_eeq_zones"),
  };
}

export function configuredPublicApi(): Api {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
  return publicApi(url, key);
}
