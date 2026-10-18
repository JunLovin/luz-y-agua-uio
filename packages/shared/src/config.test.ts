import { describe, expect, it } from "vitest";
import { config } from "./config.js";

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
});
