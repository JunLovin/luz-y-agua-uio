import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildStyle } from "./basemap.js";
import { createServiceClient } from "./supabase.js";

const BUCKET = "tiles";

async function main() {
  const [pmtilesPath, fontsDir] = process.argv.slice(2);
  if (!pmtilesPath || !fontsDir)
    throw new Error("Usage: publish:basemap <quito.pmtiles> <fonts dir>");
  const supabase = createServiceClient();
  const storage = supabase.storage.from(BUCKET);
  const upload = async (
    path: string,
    body: Buffer | string,
    contentType: string,
  ) => {
    const { error } = await storage.upload(path, body, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`${path}: ${error.message}`);
  };

  const tilesPath = basename(pmtilesPath);
  await upload(tilesPath, readFileSync(pmtilesPath), "application/vnd.pmtiles");

  let glyphs = 0;
  for (const font of readdirSync(fontsDir)) {
    for (const file of readdirSync(join(fontsDir, font)).filter((f) =>
      f.endsWith(".pbf"),
    )) {
      await upload(
        `fonts/${font}/${file}`,
        readFileSync(join(fontsDir, font, file)),
        "application/x-protobuf",
      );
      glyphs++;
    }
  }

  const style = buildStyle({
    tilesUrl: storage.getPublicUrl(tilesPath).data.publicUrl,
    glyphsBaseUrl: storage.getPublicUrl("fonts").data.publicUrl,
  });
  await upload("style.json", JSON.stringify(style), "application/json");

  console.log(
    `Published ${tilesPath}, ${glyphs} glyph files and ${storage.getPublicUrl("style.json").data.publicUrl}`,
  );
}

await main();
