import { layers, namedFlavor } from "@protomaps/basemaps";

export const ATTRIBUTION = "© colaboradores de OpenStreetMap";

/** A MapLibre style that only loads from our storage: no sprite, no third-party tiles or fonts. */
export function buildStyle({
  tilesUrl,
  glyphsBaseUrl,
}: {
  tilesUrl: string;
  glyphsBaseUrl: string;
}) {
  return {
    version: 8,
    glyphs: `${glyphsBaseUrl}/{fontstack}/{range}.pbf`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${tilesUrl}`,
        attribution: ATTRIBUTION,
      },
    },
    // Icon layers need a sprite, which we do not publish.
    layers: layers("protomaps", namedFlavor("light"), { lang: "es" }).filter(
      (layer) =>
        !("layout" in layer && layer.layout && "icon-image" in layer.layout),
    ),
  };
}
