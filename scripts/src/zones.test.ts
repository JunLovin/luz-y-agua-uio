import { describe, expect, it } from "vitest";
import { parseZonesFile } from "./zones.js";

const valid = {
  zones: [
    {
      id: "eeq_sur",
      utility: "eeq",
      name: " Sur ",
      aliases: ["Alimentador Sur"],
      barrios: ["solanda", "quitumbe"],
    },
    {
      id: "epmaps_norte",
      utility: "epmaps",
      name: "Norte",
      barrios: ["cotocollao"],
    },
  ],
};

describe("parseZonesFile", () => {
  it("derives the service from the utility and links every barrio", () => {
    expect(parseZonesFile(valid)).toEqual({
      zones: [
        {
          id: "eeq_sur",
          utility: "eeq",
          service: "luz",
          name: "Sur",
          aliases: ["Alimentador Sur"],
        },
        {
          id: "epmaps_norte",
          utility: "epmaps",
          service: "agua",
          name: "Norte",
          aliases: [],
        },
      ],
      links: [
        {
          zone_id: "eeq_sur",
          barrio_id: "solanda",
          weight: 1,
          origin: "official",
        },
        {
          zone_id: "eeq_sur",
          barrio_id: "quitumbe",
          weight: 1,
          origin: "official",
        },
        {
          zone_id: "epmaps_norte",
          barrio_id: "cotocollao",
          weight: 1,
          origin: "official",
        },
      ],
    });
  });

  const zone = {
    id: "epmaps_norte",
    utility: "epmaps",
    name: "Norte",
    barrios: ["cotocollao"],
  };
  it.each([
    ["non-object root", [], /root/],
    ["empty zones", { ...valid, zones: [] }, /non-empty/],
    [
      "topic-unsafe id",
      { ...valid, zones: [{ ...zone, id: "eeq sur" }] },
      /id must match/,
    ],
    ["duplicate id", { ...valid, zones: [zone, zone] }, /duplicate zone/],
    [
      "unknown utility",
      { ...valid, zones: [{ ...zone, utility: "cnel" }] },
      /utility/,
    ],
    ["blank name", { ...valid, zones: [{ ...zone, name: "  " }] }, /name/],
    [
      "no barrios",
      { ...valid, zones: [{ ...zone, barrios: [] }] },
      /must not be empty/,
    ],
    [
      "repeated barrio",
      { ...valid, zones: [{ ...zone, barrios: ["a", "a"] }] },
      /duplicates/,
    ],
    [
      "non-string alias",
      { ...valid, zones: [{ ...zone, aliases: [1] }] },
      /aliases/,
    ],
  ])("rejects %s", (_case, input, error) => {
    expect(() => parseZonesFile(input)).toThrow(error);
  });
});
