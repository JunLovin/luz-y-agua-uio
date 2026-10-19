import type { ExtractedOutage } from "./schema.ts";

// Ecuador has no daylight saving time.
const ECUADOR_OFFSET = "-05:00";
const ECUADOR_OFFSET_MS = -5 * 3_600_000;
const DAY_MS = 86_400_000;

export function ecuadorDate(now: Date): string {
  return new Date(now.getTime() + ECUADOR_OFFSET_MS).toISOString().slice(0, 10);
}

export function daysBetween(fromDate: string, toDate: string): number {
  return (Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS;
}

export function toInterval(
  row: Pick<ExtractedOutage, "date" | "start" | "end" | "endsNextDay">,
): {
  startsAt: Date;
  endsAt: Date | null;
} {
  const startsAt = new Date(`${row.date}T${row.start}:00${ECUADOR_OFFSET}`);
  if (row.end === null) return { startsAt, endsAt: null };
  const sameDayEnd = new Date(`${row.date}T${row.end}:00${ECUADOR_OFFSET}`);
  return {
    startsAt,
    endsAt: row.endsNextDay
      ? new Date(sameDayEnd.getTime() + DAY_MS)
      : sameDayEnd,
  };
}
