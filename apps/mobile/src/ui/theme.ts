import { StyleSheet } from "react-native";

export const colors = {
  background: "#F6F7F8",
  surface: "#FFFFFF",
  text: "#1F2933",
  muted: "#52606D",
  border: "#CBD2D9",
  primary: "#1F5F57",
  onPrimary: "#FFFFFF",
  warning: "#8A4B08",
  danger: "#9B1C1C",
} as const;

export const ui = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 20,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  heading: { fontSize: 18, fontWeight: "600", color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  muted: { fontSize: 14, lineHeight: 20, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
