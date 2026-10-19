const ID_PATTERN = /^[a-z0-9_]+$/;
const SERVICE_BY_UTILITY = { eeq: "luz", epmaps: "agua" } as const;

type Utility = keyof typeof SERVICE_BY_UTILITY;

export type UtilityZone = {
  id: string;
  utility: Utility;
  service: (typeof SERVICE_BY_UTILITY)[Utility];
  name: string;
  aliases: string[];
};
export type ZoneBarrio = {
  zone_id: string;
  barrio_id: string;
  weight: 1;
  origin: "official";
};

function fail(message: string): never {
  throw new Error(`Invalid zones file: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, where: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    fail(`${where} must be an array of strings`);
  }
  return value;
}

export function parseZonesFile(input: unknown): {
  zones: UtilityZone[];
  links: ZoneBarrio[];
} {
  if (!isRecord(input)) fail("root must be an object");
  const { zones } = input;
  if (!Array.isArray(zones) || zones.length === 0)
    fail("zones must be a non-empty array");

  const seen = new Set<string>();
  const parsed = zones.map((zone, index) => {
    if (!isRecord(zone)) fail(`zones[${index}] must be an object`);
    const { id, utility, name } = zone;
    if (typeof id !== "string" || !ID_PATTERN.test(id))
      fail(`zones[${index}].id must match ${ID_PATTERN}`);
    if (seen.has(id)) fail(`duplicate zone id "${id}"`);
    seen.add(id);
    if (utility !== "eeq" && utility !== "epmaps")
      fail(`${id}.utility must be eeq or epmaps`);
    if (typeof name !== "string" || !name.trim())
      fail(`${id}.name is required`);
    const barrios = stringArray(zone.barrios, `${id}.barrios`);
    if (barrios.length === 0) fail(`${id}.barrios must not be empty`);
    if (new Set(barrios).size !== barrios.length)
      fail(`${id}.barrios has duplicates`);

    const utilityZone: UtilityZone = {
      id,
      utility,
      service: SERVICE_BY_UTILITY[utility],
      name: name.trim(),
      aliases:
        zone.aliases === undefined
          ? []
          : stringArray(zone.aliases, `${id}.aliases`),
    };
    const links = barrios.map((barrio_id) => ({
      zone_id: id,
      barrio_id,
      weight: 1 as const,
      origin: "official" as const,
    }));
    return { utilityZone, links };
  });

  return {
    zones: parsed.map((p) => p.utilityZone),
    links: parsed.flatMap((p) => p.links),
  };
}
