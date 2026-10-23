import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useReduceMotion } from "./motion";
import { useTheme } from "./theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BUILDINGS = [
  { x: 6, w: 34, h: 58 },
  { x: 44, w: 26, h: 40 },
  { x: 74, w: 40, h: 74 },
  { x: 118, w: 30, h: 50 },
  { x: 152, w: 44, h: 88 },
  { x: 200, w: 28, h: 46 },
  { x: 232, w: 38, h: 66 },
  { x: 274, w: 30, h: 42 },
  { x: 308, w: 42, h: 80 },
  { x: 354, w: 40, h: 54 },
];
const GROUND = 250;

const WINDOWS = BUILDINGS.flatMap(({ x, w, h }) => {
  const cols = Math.floor((w - 8) / 12);
  const rows = Math.floor((h - 12) / 16);
  return Array.from({ length: cols * rows }, (_, i) => ({
    x: x + 7 + (i % cols) * 12,
    y: GROUND - h + 9 + Math.floor(i / cols) * 16,
  }));
});
/** A fixed scattered order, so lights come on across the whole city, not building by building. */
const lightingOrder = (i: number) => (i * 2654435761) % 1009;

/**
 * Quito at night under Pichincha. `progress` (0 to 1) is how many windows are lit:
 * the onboarding uses it as its progress indicator.
 */
export function NightCity({ progress }: { progress: number }) {
  const { colors, scheme } = useTheme();
  const reduceMotion = useReduceMotion();
  const [windows] = useState(() =>
    WINDOWS.map((w, i) => ({
      ...w,
      light: new Animated.Value(0),
      order: lightingOrder(i),
    })).sort((a, b) => a.order - b.order),
  );

  useEffect(() => {
    const lit = Math.round(windows.length * progress);
    if (reduceMotion) {
      windows.forEach(({ light }, rank) => light.setValue(rank < lit ? 1 : 0));
      return;
    }
    const animation = Animated.stagger(
      18,
      windows.map(({ light }, rank) =>
        Animated.timing(light, {
          toValue: rank < lit ? 1 : 0,
          duration: 260,
          useNativeDriver: false,
        }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, windows]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: "100%", aspectRatio: 400 / 380 }}
    >
      <Svg width="100%" height="100%" viewBox="0 -120 400 380">
        {scheme === "dark" &&
          [
            [40, 30],
            [96, 54],
            [150, 22],
            [262, 40],
            [372, 26],
            [210, 34],
            [24, -60],
            [118, -92],
            [178, -40],
            [246, -104],
            [300, -30],
            [356, -78],
            [66, -12],
          ].map(([cx, cy]) => (
            <Circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={1.6}
              fill={colors.muted}
              opacity={0.6}
            />
          ))}
        <Circle cx={312} cy={-40} r={22} fill={colors.scene.sky} />
        <Path
          d="M0 178 L52 146 L96 154 L150 98 L168 82 L184 90 L204 64 L222 58 L242 76 L290 126 L350 116 L400 140 L400 260 L0 260 Z"
          fill={colors.scene.far}
        />
        <Path
          d="M0 206 L70 186 L140 198 L220 176 L300 192 L400 180 L400 260 L0 260 Z"
          fill={colors.scene.near}
        />
        {BUILDINGS.map(({ x, w, h }) => (
          <Rect
            key={x}
            x={x}
            y={GROUND - h}
            width={w}
            height={h}
            rx={4}
            fill={colors.scene.building}
          />
        ))}
        {windows.map(({ x, y }) => (
          <Rect
            key={`off-${x}-${y}`}
            x={x}
            y={y}
            width={6}
            height={8}
            rx={1.5}
            fill={colors.scene.window}
          />
        ))}
        {windows.map(({ x, y, light }) => (
          <AnimatedRect
            key={`on-${x}-${y}`}
            x={x}
            y={y}
            width={6}
            height={8}
            rx={1.5}
            fill={colors.luz.solid}
            opacity={light}
          />
        ))}
        <Path
          d="M0 256 C80 246 140 262 210 252 S330 244 400 254"
          stroke={colors.agua.solid}
          strokeWidth={3}
          fill="none"
        />
      </Svg>
    </View>
  );
}
