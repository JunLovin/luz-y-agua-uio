import type { Service } from "@luz-y-agua/shared";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mapBarrios } from "../domain/map";
import { es } from "../i18n/es";
import { BaseMap, statusColors } from "../ui/base-map";
import { colors, ui } from "../ui/theme";
import { useCity } from "../ui/use-city";

export default function LiveMap() {
  const city = useCity();
  const [service, setService] = useState<Service>("luz");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const barrios = useMemo(
    () =>
      city.status === "ready" && city.barrios
        ? mapBarrios(city.barrios, city.snapshot, service, now)
        : null,
    [city, service, now],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toggle} accessibilityRole="tablist">
        {(["luz", "agua"] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: service === option }}
            onPress={() => setService(option)}
            style={[styles.tab, service === option && styles.tabSelected]}
          >
            <Text
              style={[
                ui.body,
                service === option && { color: colors.onPrimary },
              ]}
            >
              {es.services[option]}
            </Text>
          </Pressable>
        ))}
      </View>
      {(city.status === "error" ||
        (city.status === "ready" && !city.barrios)) && (
        <Text style={[ui.muted, { padding: 12 }]}>{es.map.unavailable}</Text>
      )}
      <BaseMap barrios={barrios} />
      <View style={styles.legend}>
        {(["high", "medium", "crowd"] as const).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View
              style={[styles.swatch, { backgroundColor: statusColors[status] }]}
            />
            <Text style={ui.muted}>{es.map.legend[status]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  tabSelected: { backgroundColor: colors.primary },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: colors.background,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
});
