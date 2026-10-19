import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type Barrio = { id: string; name: string };
export type BarriosGeoJson = FeatureCollection<Polygon | MultiPolygon, Barrio>;

export function findBarrio(
  lat: number,
  lng: number,
  barrios: BarriosGeoJson,
): Barrio | null {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw new RangeError(`Invalid coordinates: ${lat}, ${lng}`);
  }
  // ponytail: linear scan is fine for 65 parroquias; add a bbox prefilter for the ~1,300 Geoportal barrios.
  const match = barrios.features.find((feature) =>
    booleanPointInPolygon([lng, lat], feature),
  );
  return match
    ? { id: match.properties.id, name: match.properties.name }
    : null;
}
