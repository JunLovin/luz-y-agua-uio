import type { Service } from "@luz-y-agua/shared";
import { Droplet, Zap } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { mapBarrios } from "../domain/map";
import { es } from "../i18n/es";
import { BaseMap, statusColor } from "../ui/base-map";
import { Segmented } from "../ui/kit";
import { useTheme } from "../ui/theme";
import { radius, space } from "../ui/tokens";
import { useCity } from "../ui/use-city";

export default function LiveMap() {
  const { colors, ui } = useTheme();
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
  const floating = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BaseMap barrios={barrios} service={service} />
      <View style={[styles.top, styles.float, floating]}>
        <Segmented
          label={es.map.title}
          value={service}
          onChange={setService}
          options={[
            {
              value: "luz",
              label: es.services.luz,
              icon: Zap,
              color: colors.luz.solid,
            },
            {
              value: "agua",
              label: es.services.agua,
              icon: Droplet,
              color: colors.agua.solid,
            },
          ]}
        />
        {(city.status === "error" ||
          (city.status === "ready" && !city.barrios)) && (
          <Text style={[ui.muted, { textAlign: "center" }]}>
            {es.map.unavailable}
          </Text>
        )}
      </View>
      <View style={[styles.legend, styles.float, floating]}>
        {(["high", "medium", "crowd"] as const).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: statusColor(colors, service, status),
                  opacity: status === "medium" ? 0.5 : 1,
                },
              ]}
            />
            <Text style={ui.muted}>{es.map.legend[status]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: "absolute",
    left: space.md,
    right: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.sm,
  },
  top: { top: space.md, gap: space.xs },
  legend: {
    bottom: space.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: space.sm,
    paddingVertical: space.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
  swatch: { width: 16, height: 16, borderRadius: 5 },
});
