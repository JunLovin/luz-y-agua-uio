import { Text as NativeText, StyleSheet, type TextProps } from "react-native";

const HEADLINE = 24;

/**
 * Follows the phone's text size, with a ceiling so layouts never break: headlines grow up
 * to 1.4×, everything else up to 2× (already huge at the largest accessibility size).
 */
export function Text(props: TextProps) {
  const size = StyleSheet.flatten(props.style)?.fontSize ?? 0;
  return (
    <NativeText maxFontSizeMultiplier={size >= HEADLINE ? 1.4 : 2} {...props} />
  );
}
