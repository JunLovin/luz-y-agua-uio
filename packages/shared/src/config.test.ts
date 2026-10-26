import { describe, expect, it } from "vitest";
import { config } from "./config.ts";

describe("config", () => {
  it("confidence weights add up to 1", () => {
    const sum = Object.values(config.confidence.weights).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBeCloseTo(1);
  });

  it("confidence tiers are ordered within (0, 1]", () => {
    const { high, medium } = config.confidence.tiers;
    expect(medium).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(medium);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("public crowd counts never fall below the minimum", () => {
    expect(config.crowd.displayMinimum).toBeLessThanOrEqual(
      config.crowd.minDistinctReports,
    );
  });

  it("quiet hours use a valid IANA time zone and in-range hours", () => {
    const { startHour, endHour, timeZone } = config.notifications.quietHours;
    expect(() => new Intl.DateTimeFormat("es-EC", { timeZone })).not.toThrow();
    for (const hour of [startHour, endHour]) {
      expect(Number.isInteger(hour)).toBe(true);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
    }
  });
});
