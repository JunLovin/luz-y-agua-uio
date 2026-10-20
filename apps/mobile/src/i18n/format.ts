import { es } from "./es";

const QUITO = "America/Guayaquil";

const day = new Intl.DateTimeFormat("es-EC", {
  timeZone: QUITO,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const time = new Intl.DateTimeFormat("es-EC", {
  timeZone: QUITO,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "mar, 21 oct · 09:00–13:00" in Quito time; "desde las 09:00" when the end is unknown. */
export function formatOutageWindow(
  startsAt: string,
  endsAt: string | null,
): string {
  const start = new Date(startsAt);
  const from = `${day.format(start)} · ${time.format(start)}`;
  return endsAt
    ? `${from}–${time.format(new Date(endsAt))}`
    : `${from} ${es.format.openEnded}`;
}
