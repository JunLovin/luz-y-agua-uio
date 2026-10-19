import { describe, expect, it } from "vitest";
import { extractionSchema } from "./schema.ts";

const valid = {
  service: "agua",
  zoneNames: ["Tanque Chillogallo Alto 2"],
  barrioNames: [" Chillogallo "],
  date: "2026-10-20",
  start: "08:00",
  end: null,
  endsNextDay: false,
  notes: "Habrá tanqueros",
};

describe("extractionSchema", () => {
  it("accepts a valid row and trims names", () => {
    expect(
      extractionSchema.parse({ outages: [valid] }).outages[0]?.barrioNames,
    ).toEqual(["Chillogallo"]);
  });

  it.each([
    ["24-hour overflow", { start: "24:00" }],
    ["missing zero", { start: "8:00" }],
    ["impossible date", { date: "2026-02-30" }],
    ["unknown service", { service: "gas" }],
    ["empty name", { barrioNames: ["  "] }],
  ])("rejects %s", (_case, override) => {
    expect(
      extractionSchema.safeParse({ outages: [{ ...valid, ...override }] })
        .success,
    ).toBe(false);
  });
});
