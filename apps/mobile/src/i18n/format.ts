import { outageWindow } from "@luz-y-agua/shared";

const QUITO = "America/Guayaquil";

/** "Hoy de 09:00 a 13:00", "Mañana desde las 09:00", "El mar, 21 oct de…": same words as the pushes. */
export function formatOutageWindow(
  startsAt: string,
  endsAt: string | null,
  now: Date = new Date(),
): string {
  const text = outageWindow(startsAt, endsAt, now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const longDay = new Intl.DateTimeFormat("es-EC", {
  timeZone: QUITO,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "Jueves, 23 de octubre", in Quito time. */
export function formatToday(now: Date): string {
  const text = longDay.format(now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
