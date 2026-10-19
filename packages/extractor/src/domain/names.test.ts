import { describe, expect, it } from "vitest";
import { indexPlaces, matchPlace, normalizeName, similarity } from "./names.ts";

describe("normalizeName", () => {
  it.each([
    ["Iñaquito", "inaquito"],
    ["S.JOSE DE MONJAS", "san jose de monjas"],
    ["STA.ROSA ARGELIA", "santa rosa argelia"],
    ["Subestación Chimbacalle", "chimbacalle"],
    ["Barrio  La Magdalena", "la magdalena"],
    ["CDLA. GATAZO", "ciudadela gatazo"],
    ["Av. Napo", "avenida napo"],
    ["Sector", "sector"],
    ["SOLANDA S.1", "solanda"],
    ["Solanda Sector 3", "solanda"],
    ["Paraiso Pinos Etapa 1", "paraiso pinos"],
    ["Tanque Chillogallo Alto 2", "tanque chillogallo alto 2"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});

describe("similarity", () => {
  it("is 1 for identical names and 0 for unrelated ones", () => {
    expect(similarity("solanda", "solanda")).toBe(1);
    expect(similarity("solanda", "xyz")).toBe(0);
  });

  it("is symmetric", () => {
    expect(similarity("chimbacalle", "chimbacale")).toBeCloseTo(
      similarity("chimbacale", "chimbacalle"),
    );
  });
});

describe("matchPlace", () => {
  const index = indexPlaces([
    { id: "inaquito", names: ["Iñaquito"] },
    { id: "san_juan", names: ["San Juan"] },
    { id: "chimbacalle", names: ["Chimbacalle"] },
  ]);

  it("matches accents, case, prefixes and abbreviations", () => {
    expect(matchPlace("IÑAQUITO", index, 0.85)).toBe("inaquito");
    expect(matchPlace("Subestación Chimbacalle", index, 0.85)).toBe(
      "chimbacalle",
    );
    expect(matchPlace("S. JUAN", index, 0.85)).toBe("san_juan");
  });

  it("tolerates a small typo", () => {
    expect(matchPlace("CHIMBACALE", index, 0.85)).toBe("chimbacalle");
  });

  it("does not match a different but longer place", () => {
    expect(matchPlace("San Juan Alto", index, 0.85)).toBeNull();
    expect(matchPlace("Sangolquí", index, 0.85)).toBeNull();
  });
});
