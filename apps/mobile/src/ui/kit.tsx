import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { radius, space, type, type Palette } from "./tokens";

export type ToneName = "luz" | "agua" | "crowd" | "danger";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { ui } = useTheme();
  return <View style={[ui.card, style]}>{children}</View>;
}

/** A status line tinted by service: the color says "luz" or "agua" before the words do. */
export function Pill({
  tone,
  label,
  icon: Icon,
}: {
  tone: ToneName | "neutral";
  label: string;
  icon?: LucideIcon;
}) {
  const { colors } = useTheme();
  const t = toneOf(colors, tone);
  return (
    <View style={[styles.pill, { backgroundColor: t.soft }]}>
      {Icon ? (
        <Icon size={18} color={t.solid} strokeWidth={2.25} />
      ) : (
        <View style={[styles.dot, { backgroundColor: t.solid }]} />
      )}
      <Text style={[styles.pillText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

export function IconBadge({
  icon: Icon,
  tone = "neutral",
  size = 44,
}: {
  icon: LucideIcon;
  tone?: ToneName | "neutral";
  size?: number;
}) {
  const { colors } = useTheme();
  const t = toneOf(colors, tone);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.md - 4,
        backgroundColor: tone === "neutral" ? colors.raised : t.soft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={size * 0.5} color={t.solid} strokeWidth={2.25} />
    </View>
  );
}

export function OptionRow({
  icon,
  tone = "neutral",
  title,
  subtitle,
  onPress,
  disabled = false,
}: {
  icon: LucideIcon;
  tone?: ToneName | "neutral";
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, ui } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.card,
        styles.option,
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.92 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <IconBadge icon={icon} tone={tone} />
      <View style={{ flex: 1 }}>
        <Text style={ui.heading}>{title}</Text>
        {subtitle && <Text style={ui.muted}>{subtitle}</Text>}
      </View>
      <ChevronRight size={22} color={colors.muted} />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  /** `color` tints the selected option, so a service keeps its own color. */
  options: readonly {
    value: T;
    label: string;
    icon?: LucideIcon;
    color?: string;
  }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: colors.raised }]}
    >
      {options.map(({ value: option, label: text, icon: Icon, color }) => {
        const selected = option === value;
        const fg = selected ? colors.onPrimary : colors.text;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              selected && { backgroundColor: color ?? colors.primary },
            ]}
          >
            {Icon && <Icon size={18} color={fg} strokeWidth={2.25} />}
            <Text style={[styles.segmentText, { color: fg }]}>{text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function toneOf(colors: Palette, tone: ToneName | "neutral") {
  return tone === "neutral"
    ? { solid: colors.muted, soft: colors.raised, text: colors.text }
    : colors[tone];
}

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: space.md },
  segmented: {
    flexDirection: "row",
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
  },
  segmentText: { ...type.label, textAlign: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm - 2,
    // A full pill on one line, a rounded card when large text wraps it.
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pillText: { ...type.small, fontFamily: type.label.fontFamily, flexShrink: 1 },
});
