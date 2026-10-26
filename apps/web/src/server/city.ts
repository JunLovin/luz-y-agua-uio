import {
  type CitySnapshot,
  type CrowdLive,
  type PublicOutage,
} from "@luz-y-agua/shared";
import { cacheLife } from "next/cache";
import { anonClient, supabaseUrl } from "./supabase";

/** The whole city from the public views, cached so visits never reach the database. */
export async function getCity(): Promise<CitySnapshot> {
  "use cache";
  cacheLife("city");
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

/** Barrio id → name. Changes only with a new barrios release. */
export async function getBarrioNames(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await anonClient()
    .from("public_barrios")
    .select("id, name");
  if (error) throw new Error(`public_barrios: ${error.message}`);
  return Object.fromEntries(data.map((b) => [b.id, b.name]));
}

export type MapSources = {
  barriosUrl: string | null;
  styles: { dark: string; light: string };
};

/** Where the browser loads the map from: only our own storage (PRINCIPIOS.md rule 11). */
export async function getMapSources(): Promise<MapSources> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await anonClient()
    .from("public_barrios_meta")
    .select("url")
    .maybeSingle();
  if (error) throw new Error(`public_barrios_meta: ${error.message}`);
  const tiles = `${supabaseUrl()}/storage/v1/object/public/tiles`;
  return {
    barriosUrl: data?.url ?? null,
    styles: { dark: `${tiles}/style-dark.json`, light: `${tiles}/style.json` },
  };
}
