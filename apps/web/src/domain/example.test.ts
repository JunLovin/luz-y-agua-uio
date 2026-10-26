import { mapBarrios, type BarriosGeoJson } from "@luz-y-agua/shared";
import { describe, expect, it } from "vitest";
import { exampleCity } from "./example";

const now = new Date("2026-10-26T15:00:00Z");
const ids = ["chimbacalle", "conocoto", "la_ferroviaria", "solanda", "nayon"];
const barrios: BarriosGeoJson = {
  type: "FeatureCollection",
  features: ids.map((id) => ({
    type: "Feature",
    properties: { id, name: id },
    geometry: { type: "Polygon", coordinates: [] },
  })),
};

describe("exampleCity", () => {
  const city = exampleCity(now, "Ejemplo");

  it("shows every map status, so the legend makes sense", () => {
    const status = (service: "luz" | "agua") =>
      mapBarrios(barrios, city, service, now).features.map(
        (f) => f.properties.status,
      );
    expect(status("luz")).toEqual(["high", "medium", "crowd", "none", "none"]);
    expect(status("agua")).toContain("high");
  });

  it("labels every outage as an example and keeps them current", () => {
    for (const outage of city.outages) {
      expect(outage.source_label).toBe("Ejemplo");
      expect(new Date(outage.ends_at!) > now).toBe(true);
    }
  });
});
