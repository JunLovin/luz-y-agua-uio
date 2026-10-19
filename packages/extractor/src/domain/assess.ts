import { config } from "@luz-y-agua/shared";
import {
  indexPlaces,
  matchPlace,
  normalizeName,
  type NamedPlace,
} from "./names.js";
import type { ExtractedOutage, Extraction } from "./schema.js";
import { daysBetween, ecuadorDate, toInterval } from "./time.js";

export type Catalog = {
  zones: (NamedPlace & { service: "luz" | "agua" })[];
  barrios: NamedPlace[];
  zoneBarrios: { zoneId: string; barrioId: string }[];
};

export type AssessContext = {
  catalog: Catalog;
  now: Date;
  sourceTrust: number;
  confirmedByOtherSource?: (candidate: Candidate) => boolean;
};

export type Rejection =
  "date_out_of_range" | "end_not_after_start" | "too_long" | "no_known_place";

export type Candidate = {
  row: ExtractedOutage;
  agreement: number;
  startsAt: Date;
  endsAt: Date | null;
  zoneId: string | null;
  barrioIds: string[];
  placeMatch: number;
};

export type Assessment =
  | (Candidate & {
      status: "accepted";
      confidence: number;
      tier: "high" | "medium" | "low";
    })
  | { status: "rejected"; row: ExtractedOutage; reason: Rejection };

function placeNames(row: ExtractedOutage): Set<string> {
  return new Set([...row.zoneNames, ...row.barrioNames].map(normalizeName));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared++;
  return shared / (a.size + b.size - shared);
}

function slotKey(row: ExtractedOutage): string {
  return [row.service, row.date, row.start, row.end, row.endsNextDay].join("|");
}

function uniqueRows(rows: ExtractedOutage[]): ExtractedOutage[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${slotKey(row)}|${[...placeNames(row)].sort().join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Pairs rows of two independent extractions one-to-one within each slot (service,
 * date and hours), best place-name overlap first. Rows left without a partner keep
 * agreement 0; rows that share no place are not the same outage.
 */
export function pairExtractions(
  primary: Extraction,
  secondary: Extraction,
): { row: ExtractedOutage; agreement: number }[] {
  const left = uniqueRows(primary.outages);
  const right = uniqueRows(secondary.outages);
  const candidates = left
    .flatMap((row, i) =>
      right
        .map((other, j) => ({
          i,
          j,
          score:
            slotKey(row) === slotKey(other)
              ? jaccard(placeNames(row), placeNames(other))
              : -1,
        }))
        .filter((pair) => pair.score > 0),
    )
    .sort((a, b) => b.score - a.score);

  const agreementByLeft = new Map<number, number>();
  const pairedRight = new Set<number>();
  for (const { i, j, score } of candidates) {
    if (agreementByLeft.has(i) || pairedRight.has(j)) continue;
    agreementByLeft.set(i, score);
    pairedRight.add(j);
  }

  return [
    ...left.map((row, i) => ({ row, agreement: agreementByLeft.get(i) ?? 0 })),
    ...right
      .filter((_, j) => !pairedRight.has(j))
      .map((row) => ({ row, agreement: 0 })),
  ];
}

export function assess(
  primary: Extraction,
  secondary: Extraction,
  context: AssessContext,
): Assessment[] {
  const { catalog, now, sourceTrust } = context;
  const { validator, confidence: weights } = config;
  const today = ecuadorDate(now);
  const barrioIndex = indexPlaces(catalog.barrios);
  const zoneIndexes = {
    luz: indexPlaces(catalog.zones.filter((zone) => zone.service === "luz")),
    agua: indexPlaces(catalog.zones.filter((zone) => zone.service === "agua")),
  };

  return pairExtractions(primary, secondary).map(
    ({ row, agreement }): Assessment => {
      const daysAhead = daysBetween(today, row.date);
      if (daysAhead < 0 || daysAhead > validator.maxDaysAhead)
        return { status: "rejected", row, reason: "date_out_of_range" };

      const { startsAt, endsAt } = toInterval(row);
      if (endsAt && endsAt <= startsAt)
        return { status: "rejected", row, reason: "end_not_after_start" };
      if (
        endsAt &&
        endsAt.getTime() - startsAt.getTime() > validator.maxDurationMs
      ) {
        return { status: "rejected", row, reason: "too_long" };
      }

      const zoneIds = row.zoneNames
        .map((name) =>
          matchPlace(name, zoneIndexes[row.service], validator.nameSimilarity),
        )
        .filter((id): id is string => id !== null);
      const namedBarrioIds = row.barrioNames
        .map((name) => matchPlace(name, barrioIndex, validator.nameSimilarity))
        .filter((id): id is string => id !== null);
      if (zoneIds.length === 0 && namedBarrioIds.length === 0)
        return { status: "rejected", row, reason: "no_known_place" };

      const zoneBarrioIds = catalog.zoneBarrios
        .filter((link) => zoneIds.includes(link.zoneId))
        .map((link) => link.barrioId);
      const placeMatch =
        zoneIds.length > 0
          ? 1
          : row.barrioNames.length === 0
            ? 0
            : namedBarrioIds.length / row.barrioNames.length;

      const candidate: Candidate = {
        row,
        agreement,
        startsAt,
        endsAt,
        zoneId: zoneIds[0] ?? null,
        barrioIds: [...new Set([...namedBarrioIds, ...zoneBarrioIds])].sort(),
        placeMatch,
      };
      const confirmed = context.confirmedByOtherSource?.(candidate) ? 1 : 0;
      const confidence =
        Math.round(
          (weights.weights.extractionAgreement * agreement +
            weights.weights.zoneMatch * placeMatch +
            weights.weights.sourceTrust * sourceTrust +
            weights.weights.crossSourceConfirmation * confirmed) *
            10_000,
        ) / 10_000;
      const tier =
        confidence >= weights.tiers.high
          ? "high"
          : confidence >= weights.tiers.medium
            ? "medium"
            : "low";
      return { ...candidate, status: "accepted", confidence, tier };
    },
  );
}
