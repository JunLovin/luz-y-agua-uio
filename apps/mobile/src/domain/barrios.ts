import type { BarriosGeoJson } from "@luz-y-agua/shared";

export type BarrioOption = { id: string; name: string };

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Local search by name (no geocoder, CLAUDE.md rule 11): names that start with the query first. */
export function searchByName(
  options: BarrioOption[],
  query: string,
  limit = 20,
): BarrioOption[] {
  const q = fold(query);
  if (!q) return [];
  return options
    .map(({ id, name }) => ({ id, name, folded: fold(name) }))
    .filter((b) => b.folded.includes(q))
    .sort(
      (a, b) =>
        Number(!a.folded.startsWith(q)) - Number(!b.folded.startsWith(q)) ||
        a.name.localeCompare(b.name, "es"),
    )
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name }));
}

export function searchBarrios(
  barrios: BarriosGeoJson,
  query: string,
  limit = 20,
): BarrioOption[] {
  return searchByName(
    barrios.features.map(({ properties }) => properties),
    query,
    limit,
  );
}

/** A point to draw a place chosen by name: the center of the barrio's largest ring's bounding box. */
export function representativePoint(
  barrios: BarriosGeoJson,
  barrioId: string,
): { lat: number; lng: number } | null {
  const feature = barrios.features.find((f) => f.properties.id === barrioId);
  if (!feature) return null;
  const rings =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates[0] ?? []]
      : feature.geometry.coordinates.map((polygon) => polygon[0] ?? []);
  const ring = rings.reduce(
    (largest, r) => (r.length > largest.length ? r : largest),
    [] as number[][],
  );
  if (ring.length === 0) return null;
  const lngs = ring.map((p) => p[0] ?? 0);
  const lats = ring.map((p) => p[1] ?? 0);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}

export function barrioName(
  barrios: BarriosGeoJson | null,
  barrioId: string,
): string {
  return (
    barrios?.features.find((f) => f.properties.id === barrioId)?.properties
      .name ?? barrioId
  );
}
