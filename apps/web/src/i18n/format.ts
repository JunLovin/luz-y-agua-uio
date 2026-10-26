import { config } from "@luz-y-agua/shared";

const timeZone = config.notifications.quietHours.timeZone;

const longDate = new Intl.DateTimeFormat("es-EC", {
  timeZone,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const time = new Intl.DateTimeFormat("es-EC", {
  timeZone,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "martes, 21 de octubre de 2026", in Quito. */
export const formatLongDate = (date: Date) => longDate.format(date);

/** "10:05", in Quito. */
export const formatTime = (date: Date) => time.format(date);
