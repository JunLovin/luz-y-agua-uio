const ABBREVIATIONS: Record<string, string> = {
  s: "san",
  sn: "san",
  sta: "santa",
  sto: "santo",
  cdla: "ciudadela",
  av: "avenida",
  urb: "urbanizacion",
  coop: "cooperativa",
  hda: "hacienda",
  hcda: "hacienda",
};

const SECTOR_QUALIFIERS = new Set(["s", "sector", "etapa", "etp"]);
const GENERIC_PREFIXES = new Set([
  "subestacion",
  "barrio",
  "sector",
  "parroquia",
  "zona",
]);

export function normalizeName(name: string): string {
  const tokens = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  // "Solanda S.1", "Pinos Etapa 1": a trailing sector or stage number is not part of the place name.
  if (tokens.length > 1 && /^\d+$/.test(tokens.at(-1) ?? "")) {
    const qualifier = tokens.at(-2) ?? "";
    if (SECTOR_QUALIFIERS.has(qualifier)) tokens.splice(-2);
  }
  const expanded = tokens.map((token) => ABBREVIATIONS[token] ?? token);
  while (expanded.length > 1 && GENERIC_PREFIXES.has(expanded[0] ?? ""))
    expanded.shift();
  return expanded.join(" ");
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const padded = ` ${text} `;
  for (let i = 0; i < padded.length - 1; i++) {
    const pair = padded.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/** Sørensen–Dice coefficient over character bigrams of two normalized names. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  let total = 0;
  for (const [pair, count] of left) {
    shared += Math.min(count, right.get(pair) ?? 0);
    total += count;
  }
  for (const count of right.values()) total += count;
  return total === 0 ? 0 : (2 * shared) / total;
}

export type NamedPlace = { id: string; names: string[] };

export type PlaceIndex = { id: string; normalized: string[] }[];

export function indexPlaces(places: NamedPlace[]): PlaceIndex {
  return places.map(({ id, names }) => ({
    id,
    normalized: names.map(normalizeName),
  }));
}

/** Best place whose name is at least `threshold` similar, or null. */
export function matchPlace(
  name: string,
  index: PlaceIndex,
  threshold: number,
): string | null {
  const normalized = normalizeName(name);
  let best: { id: string; score: number } | null = null;
  for (const place of index) {
    for (const candidate of place.normalized) {
      const score = similarity(normalized, candidate);
      if (score >= threshold && (!best || score > best.score))
        best = { id: place.id, score };
    }
  }
  return best?.id ?? null;
}
