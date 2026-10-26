import { describe, expect, it } from "vitest";
import { formatOutageWindow, formatToday } from "./format";

// 10:00 on Wednesday 21 Oct in Quito.
const NOW = new Date("2026-10-21T15:00:00Z");

describe("formatOutageWindow", () => {
  it("says today and tomorrow in Quito time, like the pushes", () => {
    expect(
      formatOutageWindow("2026-10-21T19:00:00Z", "2026-10-21T22:00:00Z", NOW),
    ).toBe("Hoy de 14:00 a 17:00");
    expect(formatOutageWindow("2026-10-22T14:00:00Z", null, NOW)).toBe(
      "Mañana desde las 09:00",
    );
  });
});

describe("formatToday", () => {
  it("is the full Quito date, capitalized", () => {
    expect(formatToday(NOW)).toBe("Miércoles, 21 de octubre");
  });
});
