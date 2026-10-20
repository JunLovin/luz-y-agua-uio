import type { BarriosGeoJson } from "@luz-y-agua/shared";
import { describe, expect, it } from "vitest";
import { barrioName, representativePoint, searchBarrios } from "./barrios";

const square = (x: number, y: number) => [
  [
    [x, y],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
    [x, y],
  ],
];

const barrios: BarriosGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "inaquito", name: "Iñaquito" },
      geometry: { type: "Polygon", coordinates: square(0, 0) },
    },
    {
      type: "Feature",
      properties: { id: "san_juan", name: "San Juan" },
      geometry: { type: "Polygon", coordinates: square(2, 2) },
    },
    {
      type: "Feature",
      properties: { id: "juan_montalvo", name: "Juan Montalvo" },
      geometry: { type: "Polygon", coordinates: square(4, 4) },
    },
    {
      type: "Feature",
      properties: { id: "islas", name: "Islas" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          square(10, 10),
          [
            [
              [20, 20],
              [30, 20],
              [30, 30],
              [25, 32],
              [20, 30],
              [20, 20],
            ],
          ],
        ],
      },
    },
  ],
};

describe("searchBarrios", () => {
  it("ignores accents and case", () => {
    expect(searchBarrios(barrios, "IÑAQ")).toEqual([
      { id: "inaquito", name: "Iñaquito" },
    ]);
    expect(searchBarrios(barrios, "inaq")).toEqual([
      { id: "inaquito", name: "Iñaquito" },
    ]);
  });

  it("puts names that start with the query first", () => {
    expect(searchBarrios(barrios, "juan").map((b) => b.id)).toEqual([
      "juan_montalvo",
      "san_juan",
    ]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchBarrios(barrios, "  ")).toEqual([]);
    expect(searchBarrios(barrios, "a", 2)).toHaveLength(2);
  });
});

describe("representativePoint", () => {
  it("uses the bounding box center of a polygon", () => {
    expect(representativePoint(barrios, "inaquito")).toEqual({
      lat: 0.5,
      lng: 0.5,
    });
  });

  it("uses the ring with most vertices of a multipolygon", () => {
    expect(representativePoint(barrios, "islas")).toEqual({ lat: 26, lng: 25 });
  });

  it("returns null for an unknown barrio", () => {
    expect(representativePoint(barrios, "x")).toBeNull();
  });
});

describe("barrioName", () => {
  it("falls back to the id when the barrios are not loaded", () => {
    expect(barrioName(barrios, "san_juan")).toBe("San Juan");
    expect(barrioName(null, "san_juan")).toBe("san_juan");
  });
});
