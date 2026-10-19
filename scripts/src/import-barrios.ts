import type { FeatureCollection } from "geojson";
import mapshaper from "mapshaper";
import osmtogeojson from "osmtogeojson";
import { parroquiasFromOsm, type BarrioFeature } from "./barrios.js";
import { queryOverpass } from "./overpass.js";
import { createServiceClient } from "./supabase.js";

const MAX_BYTES = 3 * 1024 * 1024;
const SIMPLIFY_METERS = 10;
const BUCKET = "barrios";
// Quito has 32 urban and 33 rural parroquias.
const EXPECTED_PARROQUIAS = 65;

const QUITO_PARROQUIAS = `
[out:json][timeout:180];
area["name"="Quito"]["admin_level"="6"]->.quito;
relation["boundary"="administrative"]["admin_level"~"^(8|9)$"](area.quito);
out body; >; out skel qt;`;

async function simplify(features: BarrioFeature[]): Promise<FeatureCollection> {
  const output = await mapshaper.applyCommands(
    `-i in.json -clean -simplify interval=${SIMPLIFY_METERS} keep-shapes -clean -o out.json format=geojson precision=0.00001`,
    { "in.json": { type: "FeatureCollection", features } },
  );
  return JSON.parse(String(output["out.json"])) as FeatureCollection;
}

async function main() {
  const supabase = createServiceClient();

  const osm = osmtogeojson(await queryOverpass(QUITO_PARROQUIAS));
  const parroquias = parroquiasFromOsm(
    osm as Parameters<typeof parroquiasFromOsm>[0],
  );
  if (parroquias.length !== EXPECTED_PARROQUIAS) {
    throw new Error(
      `Expected ${EXPECTED_PARROQUIAS} parroquias, got ${parroquias.length}: ${parroquias.map((p) => p.properties.name).join(", ")}`,
    );
  }
  const simplified = await simplify(parroquias);
  const geojson = JSON.stringify({
    ...simplified,
    attribution: "© OpenStreetMap contributors, ODbL 1.0",
  });
  const bytes = Buffer.byteLength(geojson);
  if (bytes >= MAX_BYTES)
    throw new Error(`GeoJSON is ${bytes} bytes, limit is ${MAX_BYTES}`);

  const { data: latest, error: latestError } = await supabase
    .from("barrios_releases")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;
  const version = (latest?.version ?? 0) + 1;

  const path = `barrios-v${version}.geojson`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, geojson, {
      contentType: "application/geo+json",
      upsert: true,
    });
  if (uploadError) throw uploadError;
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { error: importError } = await supabase.rpc("import_barrios", {
    features: simplified.features,
    new_version: version,
    new_source: "osm",
  });
  if (importError) throw importError;

  const { error: releaseError } = await supabase
    .from("barrios_releases")
    .insert({ version, url });
  if (releaseError) throw releaseError;

  console.log(
    `Imported ${simplified.features.length} barrios as v${version} (${(bytes / 1024).toFixed(0)} KB): ${url}`,
  );
}

await main();
