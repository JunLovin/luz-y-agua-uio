import {
  config,
  type BarriosGeoJson,
  type CitySnapshot,
  type CrowdLive,
  type PublicOutage,
} from "@luz-y-agua/shared";
import { cacheLife } from "next/cache";
import { anonClient } from "./supabase";

const REVALIDATE_S = config.web.revalidateMs / 1000;

/** The whole city from the public views, cached so visits never reach the database. */
export async function getCity(): Promise<CitySnapshot> {
  "use cache";
  cacheLife({ stale: REVALIDATE_S, revalidate: REVALIDATE_S, expire: 3600 });
  const db = anonClient();
  const [outages, crowd] = await Promise.all([
    db.from("public_outages_active").select("*"),
    db.from("public_crowd_live").select("*"),
  ]);
  if (outages.error)
    throw new Error(`public_outages_active: ${outages.error.message}`);
  if (crowd.error) throw new Error(`public_crowd_live: ${crowd.error.message}`);
  return {
    outages: outages.data as PublicOutage[],
    crowd: crowd.data as CrowdLive[],
    fetchedAt: new Date().toISOString(),
  };
}

/** Barrio id → name, from the published GeoJSON. Changes only with a new barrios release. */
export async function getBarrioNames(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await anonClient()
    .from("public_barrios_meta")
    .select("url")
    .maybeSingle();
  if (error) throw new Error(`public_barrios_meta: ${error.message}`);
  if (!data) return {};
  const response = await fetch(data.url);
  if (!response.ok)
    throw new Error(`barrios GeoJSON answered ${response.status}`);
  const geojson = (await response.json()) as BarriosGeoJson;
  return Object.fromEntries(
    geojson.features.map((f) => [f.properties.id, f.properties.name]),
  );
}
