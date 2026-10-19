import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { parroquiasFromOsm, slugify } from "./barrios.js";

const square: Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 0],
    ],
  ],
};

function osm(
  features: {
    tags: Record<string, string>;
    geometry?: Polygon | MultiPolygon | null;
  }[],
): FeatureCollection<Polygon | MultiPolygon | null, Record<string, string>> {
  return {
    type: "FeatureCollection",
    features: features.map(({ tags, geometry = square }) => ({
      type: "Feature",
      properties: tags,
      geometry,
    })),
  };
}

const parroquia = (name: string, admin_level = "9") => ({
  tags: { boundary: "administrative", admin_level, name },
});

describe("slugify", () => {
  it.each([
    ["Iñaquito", "inaquito"],
    ["Centro Histórico", "centro_historico"],
    ["Atahualpa (Babaspamba)", "atahualpa_babaspamba"],
    ["Checa - Chilpa", "checa_chilpa"],
    ["Guamaní", "guamani"],
  ])("%s -> %s", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("produces ids accepted by the barrios table check", () => {
    expect(slugify("  San José de Minas! ")).toMatch(/^[a-z0-9_]+$/);
  });

  it("rejects names without letters or digits", () => {
    expect(() => slugify("—")).toThrow();
  });
});

describe("parroquiasFromOsm", () => {
  it("keeps urban (9) and rural (8) parroquias with their properties", () => {
    const result = parroquiasFromOsm(
      osm([parroquia("Solanda"), parroquia("Cumbayá", "8")]),
    );
    expect(result.map((f) => f.properties)).toEqual([
      { id: "solanda", name: "Solanda", parroquia: "Solanda" },
      { id: "cumbaya", name: "Cumbayá", parroquia: "Cumbayá" },
    ]);
  });

  it("drops other levels, non-boundaries, unnamed and non-polygon features", () => {
    const line = { type: "LineString", coordinates: [] } as unknown as Polygon;
    const result = parroquiasFromOsm(
      osm([
        parroquia("La Carolina", "10"),
        { tags: { place: "neighbourhood", name: "X", admin_level: "9" } },
        { tags: { boundary: "administrative", admin_level: "9" } },
        { ...parroquia("Kennedy"), geometry: line },
        { ...parroquia("Kennedy"), geometry: null },
      ]),
    );
    expect(result).toEqual([]);
  });

  it("fails on duplicate ids", () => {
    expect(() =>
      parroquiasFromOsm(osm([parroquia("Iñaquito"), parroquia("Inaquito")])),
    ).toThrow(/Duplicate/);
  });
});
