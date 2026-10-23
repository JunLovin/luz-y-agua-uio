import { StyleSheet, useColorScheme } from "react-native";
import { useLocalState } from "./local-store";
import {
  dark,
  light,
  radius,
  resolveScheme,
  space,
  type,
  type Palette,
} from "./tokens";

function makeUi(c: Palette) {
  return StyleSheet.create({
    screen: {
      flexGrow: 1,
      backgroundColor: c.background,
      padding: space.lg,
      gap: space.md,
    },
    display: { ...type.display, color: c.text },
    title: { ...type.title, color: c.text },
    heading: { ...type.heading, color: c.text },
    body: { ...type.body, color: c.text },
    label: { ...type.label, color: c.text },
    muted: { ...type.small, color: c.muted },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: space.md + 2,
      gap: space.sm,
    },
    input: {
      ...type.body,
      color: c.text,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: space.md,
      paddingVertical: 14,
    },
  });
}

const themes = {
  dark: { scheme: "dark", colors: dark, ui: makeUi(dark) },
  light: { scheme: "light", colors: light, ui: makeUi(light) },
} as const;

export type Theme = (typeof themes)[keyof typeof themes];

/** The active palette and base styles: the user's choice, dark by default. */
export function useTheme(): Theme {
  const preference = useLocalState().theme;
  return themes[resolveScheme(preference, useColorScheme())];
}
