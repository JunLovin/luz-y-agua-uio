/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Polygon } from "geojson";
import { describe, expect, it } from "vitest";
import { findBarrio, type BarriosGeoJson } from "./geo.ts";

const box = (
  west: number,
  south: number,
  east: number,
  north: number,
): Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ],
});

const synthetic: BarriosGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "ring", name: "Ring" },
      geometry: {
        type: "Polygon",
        coordinates: [
          ...box(0, 0, 4, 4).coordinates,
          ...box(1, 1, 3, 3).coordinates,
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "islands", name: "Islands" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          box(10, 0, 11, 1).coordinates,
          box(20, 0, 21, 1).coordinates,
        ],
      },
    },
  ],
};

describe("findBarrio (synthetic)", () => {
  it("takes latitude first, longitude second", () => {
    expect(findBarrio(0.5, 2, synthetic)?.id).toBe("ring");
    expect(findBarrio(2, 0.5, synthetic)?.id).toBe("ring");
    expect(findBarrio(0.5, 10.5, synthetic)?.id).toBe("islands");
    expect(findBarrio(10.5, 0.5, synthetic)).toBeNull();
  });

  it("matches every part of a MultiPolygon", () => {
    expect(findBarrio(0.5, 20.5, synthetic)).toEqual({
      id: "islands",
      name: "Islands",
    });
  });

  it("excludes holes", () => {
    expect(findBarrio(2, 2, synthetic)).toBeNull();
  });

  it("returns null outside every barrio", () => {
    expect(findBarrio(-5, -5, synthetic)).toBeNull();
  });

  it.each([
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
    [91, 0],
    [0, -181],
  ])("rejects invalid coordinates %s, %s", (lat, lng) => {
    expect(() => findBarrio(lat, lng, synthetic)).toThrow(RangeError);
  });
});

const quito = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../fixtures/barrios-osm.geojson"),
    "utf8",
  ),
) as BarriosGeoJson;

describe("findBarrio (Quito parroquias from OSM)", () => {
  // Coordinates from each parroquia's Wikidata item (P625), all 300 m or more from a border.
  it.each([
    ["north", "cotocollao", -0.11686, -78.49978],
    ["north", "calderon", -0.09722222, -78.4225],
    ["north", "san_antonio", -0.0082388888888889, -78.445127777778],
    ["north", "pomasqui", -0.05, -78.45],
    ["center", "centro_historico", -0.22, -78.512083],
    ["center", "inaquito", -0.18349, -78.48074],
    ["center", "mariscal_sucre", -0.20461, -78.49394],
    ["center", "itchimbia", -0.22296, -78.50002],
    ["south", "chillogallo", -0.27751, -78.57505],
    ["south", "solanda", -0.26872, -78.539406],
    ["south", "quitumbe", -0.2996, -78.5425],
    ["valleys", "cumbaya", -0.2, -78.433333333333],
    ["valleys", "tumbaco", -0.213417, -78.400776],
    ["valleys", "conocoto", -0.29165, -78.47767],
    ["valleys", "alangasi", -0.30825, -78.41373],
    ["valleys", "tababela", -0.18472, -78.34529],
  ])("%s: %s", (_zone, id, lat, lng) => {
    expect(findBarrio(lat, lng, quito)?.id).toBe(id);
  });

  it.each([
    ["Sangolquí (Rumiñahui)", -0.3292, -78.4473],
    ["Guayaquil", -2.1894, -79.8891],
  ])("returns null outside Quito: %s", (_place, lat, lng) => {
    expect(findBarrio(lat, lng, quito)).toBeNull();
  });
});
