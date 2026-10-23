import { describe, expect, it } from "vitest";
import { contrast, dark, light, resolveScheme, type Palette } from "./tokens";

const AA_TEXT = 4.5;
const AA_GRAPHICS = 3;

describe.each([
  ["dark", dark],
  ["light", light],
] as [string, Palette][])("%s palette", (_name, p) => {
  it("keeps body and muted text readable on every surface (AA)", () => {
    for (const bg of [p.background, p.surface, p.raised]) {
      expect(contrast(p.text, bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(p.muted, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("keeps the primary button label readable", () => {
    expect(contrast(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(["luz", "agua", "crowd", "danger"] as const)(
    "%s: pill text on its tint and icons on surfaces",
    (tone) => {
      const t = p[tone];
      expect(contrast(t.text, t.soft)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(t.solid, p.surface)).toBeGreaterThanOrEqual(AA_GRAPHICS);
      expect(contrast(t.solid, p.background)).toBeGreaterThanOrEqual(
        AA_GRAPHICS,
      );
    },
  );
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });
});

describe("resolveScheme", () => {
  it("is dark by default and follows the phone only when asked", () => {
    expect(resolveScheme("dark", "light")).toBe("dark");
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("system", "light")).toBe("light");
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", null)).toBe("dark");
  });
});
