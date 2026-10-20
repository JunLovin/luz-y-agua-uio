import { describe, expect, it } from "vitest";
import { ATTRIBUTION, buildStyle } from "./basemap.js";

const style = buildStyle({
  tilesUrl:
    "https://example.supabase.co/storage/v1/object/public/tiles/quito-20261019.pmtiles",
  glyphsBaseUrl:
    "https://example.supabase.co/storage/v1/object/public/tiles/fonts",
});

describe("buildStyle", () => {
  it("loads tiles and glyphs only from our storage", () => {
    const urls = JSON.stringify(style).match(/https?:\/\/[^"]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls)
      expect(url.startsWith("https://example.supabase.co/")).toBe(true);
    expect(style).not.toHaveProperty("sprite");
  });

  it("credits OpenStreetMap", () => {
    expect(style.sources.protomaps.attribution).toBe(ATTRIBUTION);
  });

  it("drops layers that would need a sprite and labels in Spanish", () => {
    expect(JSON.stringify(style.layers)).not.toContain("icon-image");
    expect(JSON.stringify(style.layers)).toContain("name:es");
  });
});
