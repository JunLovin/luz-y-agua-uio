import { readFileSync } from "node:fs";
import { createServiceClient } from "./supabase.js";
import { parseZonesFile } from "./zones.js";

const CHUNK = 200;

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: import:zones <zones.json>");
  const { zones, links } = parseZonesFile(
    JSON.parse(readFileSync(file, "utf8")),
  );
  const supabase = createServiceClient();

  const barrioIds = [...new Set(links.map((link) => link.barrio_id))];
  const missing: string[] = [];
  for (let i = 0; i < barrioIds.length; i += CHUNK) {
    const chunk = barrioIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("barrios")
      .select("id")
      .in("id", chunk);
    if (error) throw error;
    const known = new Set(data.map((row) => row.id as string));
    missing.push(...chunk.filter((id) => !known.has(id)));
  }
  if (missing.length > 0) {
    throw new Error(
      `Unknown barrios (run import:barrios first?): ${missing.join(", ")}`,
    );
  }

  const { error: zonesError } = await supabase
    .from("utility_zones")
    .upsert(zones);
  if (zonesError) throw zonesError;

  const updated_at = new Date().toISOString();
  const { error: linksError } = await supabase
    .from("zone_barrio")
    .upsert(links.map((link) => ({ ...link, updated_at })));
  if (linksError) throw linksError;

  for (const zone of zones) {
    const declared = links
      .filter((link) => link.zone_id === zone.id)
      .map((link) => link.barrio_id);
    const { error } = await supabase
      .from("zone_barrio")
      .delete()
      .eq("zone_id", zone.id)
      .eq("origin", "official")
      .not("barrio_id", "in", `(${declared.join(",")})`);
    if (error) throw error;
  }

  console.log(
    `Imported ${zones.length} zones and ${links.length} zone-barrio links from ${file}`,
  );
}

await main();
