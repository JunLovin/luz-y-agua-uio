import type { BarriosGeoJson, Service } from "@luz-y-agua/shared";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { statusFor, type CitySnapshot } from "./city";

export type MapStatus = "high" | "medium" | "crowd" | "none";
export type MapBarrio = { id: string; name: string; status: MapStatus };

/**
 * Barrios colored by what is happening to one service right now or next: an official cut
 * (high), an unconfirmed one (medium), only neighbor reports (crowd), or nothing.
 * Whole barrios only, never individual points (SPEC §8.1).
 */
export function mapBarrios(
  barrios: BarriosGeoJson,
  snapshot: CitySnapshot,
  service: Service,
  now: Date,
): FeatureCollection<Polygon | MultiPolygon, MapBarrio> {
  return {
    type: "FeatureCollection",
    features: barrios.features.map((feature) => {
      const status = statusFor(snapshot, feature.properties.id, now);
      const tiers = status.outages
        .filter((o) => o.service === service)
        .map((o) => o.tier);
      const crowd = status.crowd.some((c) => c.service === service);
      const mapStatus: MapStatus = tiers.includes("high")
        ? "high"
        : tiers.includes("medium")
          ? "medium"
          : crowd
            ? "crowd"
            : "none";
      return {
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          id: feature.properties.id,
          name: feature.properties.name,
          status: mapStatus,
        },
      };
    }),
  };
}
