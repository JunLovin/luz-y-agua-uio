import type { BarriosGeoJson } from "./geo.ts";
import { describe, expect, it } from "vitest";
import type { CitySnapshot, PublicOutage } from "./city.ts";
import { mapBarrios } from "./map.ts";

const polygon = { type: "Polygon" as const, coordinates: [] };
const barrios: BarriosGeoJson = {
  type: "FeatureCollection",
  features: ["a", "b", "c", "d"].map((id) => ({
    type: "Feature",
    properties: { id, name: id.toUpperCase() },
    geometry: polygon,
  })),
};

const outage = (
  barrio: string,
  tier: "high" | "medium",
  service: "luz" | "agua" = "luz",
): PublicOutage => ({
  id: `${barrio}-${tier}-${service}`,
  service,
  kind: "scheduled",
  zone_id: null,
  barrio_ids: [barrio],
  starts_at: "2026-10-21T14:00:00Z",
  ends_at: "2026-10-21T18:00:00Z",
  tier,
  source_label: "EEQ",
  supersedes: null,
  notes: null,
});

const snapshot: CitySnapshot = {
  fetchedAt: "2026-10-20T15:00:00Z",
  outages: [
    outage("a", "medium"),
    outage("a", "high"),
    outage("b", "medium"),
    outage("d", "high", "agua"),
  ],
  crowd: [
    { barrio_id: "b", service: "luz", reports: 5 },
    { barrio_id: "c", service: "luz", reports: 10 },
  ],
};
const now = new Date("2026-10-20T15:00:00Z");

describe("mapBarrios", () => {
  it("colors each barrio by its strongest signal for the chosen service", () => {
    const statuses = mapBarrios(barrios, snapshot, "luz", now).features.map(
      (f) => f.properties.status,
    );
    expect(statuses).toEqual(["high", "medium", "crowd", "none"]);
  });

  it("only looks at the chosen service", () => {
    const statuses = mapBarrios(barrios, snapshot, "agua", now).features.map(
      (f) => f.properties.status,
    );
    expect(statuses).toEqual(["none", "none", "none", "high"]);
  });

  it("keeps whole barrio shapes and names", () => {
    expect(mapBarrios(barrios, snapshot, "luz", now).features[0]).toEqual({
      type: "Feature",
      geometry: polygon,
      properties: { id: "a", name: "A", status: "high" },
    });
  });
});
