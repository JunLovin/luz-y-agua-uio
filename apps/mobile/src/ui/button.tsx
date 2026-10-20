import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "./theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: Props) {
  const filled = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        filled ? styles.primary : styles.outline,
        variant === "danger" && styles.danger,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: filled
              ? colors.onPrimary
              : variant === "danger"
                ? colors.danger
                : colors.primary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary },
  danger: { borderColor: colors.danger },
  dimmed: { opacity: 0.55 },
  label: { fontSize: 16, fontWeight: "600" },
});
