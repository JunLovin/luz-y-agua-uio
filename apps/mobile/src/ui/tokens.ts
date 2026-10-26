/**
 * "Volcán": warm charcoal like Pichincha basalt at night, ember for luz, glacier sky for agua.
 * Service colors carry meaning everywhere (pills, map, icons). Contrast is checked in tokens.test.ts.
 */
export type Palette = {
  background: string;
  surface: string;
  raised: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  luz: Tone;
  agua: Tone;
  crowd: Tone;
  danger: Tone;
  /** The onboarding illustration: ridges, buildings, unlit windows and the moon (or sun). */
  scene: {
    far: string;
    near: string;
    building: string;
    window: string;
    sky: string;
  };
};

/** A service or status hue: `solid` for icons, fills and the map; `soft` + `text` for pills. */
export type Tone = { solid: string; soft: string; text: string };

export const dark: Palette = {
  background: "#1A1614",
  surface: "#26201D",
  raised: "#322A26",
  border: "#3E3430",
  text: "#F4EEEA",
  muted: "#B3A69E",
  primary: "#FF8A4C",
  onPrimary: "#2B1004",
  luz: { solid: "#FF8A4C", soft: "#45251A", text: "#FFC1A0" },
  agua: { solid: "#5AB8F0", soft: "#173348", text: "#A6D9F8" },
  crowd: { solid: "#B392F0", soft: "#33264A", text: "#D8C6F7" },
  danger: { solid: "#F87171", soft: "#4A1F1F", text: "#FCA5A5" },
  scene: {
    far: "#322A26",
    near: "#26201D",
    building: "#3E3430",
    window: "#322A26",
    sky: "#3E3430",
  },
};

export const light: Palette = {
  background: "#F3EEEA",
  surface: "#FFFFFF",
  raised: "#FAF6F3",
  border: "#E3D8D1",
  text: "#1F1915",
  muted: "#665951",
  primary: "#C2410C",
  onPrimary: "#FFFFFF",
  luz: { solid: "#C2410C", soft: "#FFE8DC", text: "#9A3412" },
  agua: { solid: "#0369A1", soft: "#E0F2FE", text: "#075985" },
  crowd: { solid: "#6D28D9", soft: "#EDE6FB", text: "#5B21B6" },
  danger: { solid: "#B91C1C", soft: "#FDE8E8", text: "#991B1B" },
  scene: {
    far: "#DDD0C7",
    near: "#CDBDB2",
    building: "#B9A79B",
    window: "#E9E1DB",
    sky: "#FFD2B8",
  },
};

export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

/** Atkinson Hyperlegible Next: drawn for low vision, so it reads well at every age. */
export const fonts = {
  regular: "AtkinsonHyperlegibleNext_400Regular",
  medium: "AtkinsonHyperlegibleNext_500Medium",
  bold: "AtkinsonHyperlegibleNext_700Bold",
  heavy: "AtkinsonHyperlegibleNext_800ExtraBold",
} as const;

/** A large base size (17) on purpose; all sizes still follow the phone's text size setting. */
export const type = {
  display: { fontFamily: fonts.heavy, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25 },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
} as const;

/** Dark unless the user picked light, or picked the phone's setting and the phone is light. */
export function resolveScheme(
  preference: "dark" | "light" | "system",
  system: string | null | undefined,
): "dark" | "light" {
  if (preference === "system") return system === "light" ? "light" : "dark";
  return preference;
}

/** WCAG 2.x contrast ratio between two #RRGGBB colors. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
