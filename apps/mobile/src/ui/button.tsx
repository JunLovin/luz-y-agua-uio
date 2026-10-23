import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme";
import { radius, space, type } from "./tokens";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: LucideIcon;
  disabled?: boolean;
};

/** Pill buttons, 56 pt tall so they are easy to hit at any age. */
export function Button({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const look = {
    primary: {
      bg: colors.primary,
      fg: colors.onPrimary,
      border: colors.primary,
    },
    secondary: { bg: colors.raised, fg: colors.text, border: colors.border },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    danger: {
      bg: colors.danger.soft,
      fg: colors.danger.text,
      border: colors.danger.soft,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (variant === "primary" || variant === "danger")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: look.bg, borderColor: look.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        {Icon && <Icon size={22} color={look.fg} strokeWidth={2.25} />}
        <Text style={[styles.label, { color: look.fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  label: { ...type.label, fontFamily: type.heading.fontFamily, fontSize: 17 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.45 },
});
