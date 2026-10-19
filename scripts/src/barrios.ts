import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";

export type BarrioProperties = { id: string; name: string; parroquia: string };
export type BarrioFeature = Feature<Polygon | MultiPolygon, BarrioProperties>;

const PARROQUIA_ADMIN_LEVELS = new Set(["8", "9"]);

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!slug) throw new Error(`Cannot build an id from "${name}"`);
  return slug;
}

type OsmTags = Record<string, string | undefined>;

export function parroquiasFromOsm(
  collection: FeatureCollection<Polygon | MultiPolygon | null, OsmTags | null>,
): BarrioFeature[] {
  const barrios = collection.features.flatMap((feature): BarrioFeature[] => {
    const tags = feature.properties ?? {};
    const { geometry } = feature;
    if (
      tags.boundary !== "administrative" ||
      !PARROQUIA_ADMIN_LEVELS.has(tags.admin_level ?? "") ||
      !tags.name ||
      (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon")
    ) {
      return [];
    }
    const name = tags.name;
    return [
      {
        type: "Feature",
        properties: { id: slugify(name), name, parroquia: name },
        geometry,
      },
    ];
  });

  const seen = new Set<string>();
  for (const { properties } of barrios) {
    if (seen.has(properties.id))
      throw new Error(`Duplicate barrio id "${properties.id}"`);
    seen.add(properties.id);
  }
  return barrios;
}
