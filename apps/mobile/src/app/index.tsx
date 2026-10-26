import { outageWindow } from "@luz-y-agua/shared";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  BellOff,
  ChevronRight,
  CircleCheck,
  Droplet,
  Map as MapIcon,
  MapPin,
  MapPinPlus,
  Plus,
  Settings,
  Users,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "../ui/text";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { barrioName } from "../domain/barrios";
import { placeAlerts, type PlaceAlert } from "../domain/city";
import { needsWelcome } from "../domain/consent";
import { es } from "../i18n/es";
import { formatToday } from "../i18n/format";
import { Button } from "../ui/button";
import { Card, IconBadge, Pill, type ToneName } from "../ui/kit";
import { useLocalState } from "../ui/local-store";
import { useTheme } from "../ui/theme";
import { radius, space } from "../ui/tokens";
import { useCity } from "../ui/use-city";
import { setNotifications } from "../ui/use-topic-sync";

const SERVICE_ICON: Record<"luz" | "agua", LucideIcon> = {
  luz: Zap,
  agua: Droplet,
};

function alertPill(
  alert: PlaceAlert,
  now: Date,
): {
  tone: ToneName;
  icon: LucideIcon;
  label: string;
} {
  const service = es.services[alert.service];
  if (alert.kind === "crowd")
    return { tone: "crowd", icon: Users, label: es.places.crowd(service) };
  return {
    tone: alert.service,
    icon: SERVICE_ICON[alert.service],
    label:
      alert.kind === "ongoing"
        ? es.places.ongoing(service)
        : es.places.scheduled(
            service,
            outageWindow(alert.outage.starts_at, alert.outage.ends_at, now),
          ),
  };
}

export default function Places() {
  const { colors, ui } = useTheme();
  const local = useLocalState();
  const city = useCity();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stacked = useWindowDimensions().fontScale > 1.3;
  const [dockHeight, setDockHeight] = useState(140);
  if (needsWelcome(local)) return <Redirect href="/bienvenida" />;

  const barrios = city.status === "ready" ? city.barrios : null;
  const now = new Date();
  const t = es.places;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[
          ui.screen,
          { paddingBottom: dockHeight + space.md },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={ui.muted}>{formatToday(now)}</Text>
            <Text style={ui.display} accessibilityRole="header">
              {t.title}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.settings}
            hitSlop={8}
            onPress={() => router.push("/ajustes")}
            style={[styles.round, { backgroundColor: colors.raised }]}
          >
            <Settings size={24} color={colors.text} />
          </Pressable>
        </View>

        {city.status === "error" && (
          <Card style={styles.row}>
            <IconBadge icon={WifiOff} tone="danger" />
            <Text style={[ui.body, styles.flex]}>{es.city.error}</Text>
          </Card>
        )}
        {city.status === "ready" && city.offline && (
          <Card style={styles.row}>
            <IconBadge icon={WifiOff} />
            <Text style={[ui.body, styles.flex]}>{es.city.offline}</Text>
          </Card>
        )}
        {city.status === "loading" && (
          <Text style={ui.muted}>{es.city.loading}</Text>
        )}

        {!local.notificationsEnabled && local.places.length > 0 && (
          <Card>
            <View style={styles.row}>
              <IconBadge icon={BellOff} tone="luz" />
              <View style={styles.flex}>
                <Text style={ui.heading}>{t.notificationsOff.title}</Text>
                <Text style={ui.muted}>{t.notificationsOff.body}</Text>
              </View>
            </View>
            <Button
              label={t.notificationsOff.action}
              variant="secondary"
              onPress={() =>
                void setNotifications(true).then((result) => {
                  if (result === "blocked") void Linking.openSettings();
                })
              }
            />
          </Card>
        )}

        {local.places.length === 0 ? (
          <Card style={styles.empty}>
            <IconBadge icon={MapPinPlus} tone="luz" size={64} />
            <Text style={[ui.title, styles.center]}>{t.emptyTitle}</Text>
            <Text style={[ui.body, styles.center, { color: colors.muted }]}>
              {t.emptyBody}
            </Text>
          </Card>
        ) : (
          local.places.map((place) => {
            const alerts =
              city.status === "ready"
                ? placeAlerts(city.snapshot, place.barrioId, now)
                : [];
            return (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                accessibilityLabel={t.open(place.alias)}
                onPress={() =>
                  router.push({
                    pathname: "/lugar/[id]",
                    params: { id: place.id },
                  })
                }
                style={({ pressed }) => [
                  ui.card,
                  pressed && { transform: [{ scale: 0.99 }], opacity: 0.92 },
                ]}
              >
                <View style={styles.row}>
                  <IconBadge icon={MapPin} />
                  <View style={styles.flex}>
                    <Text style={ui.heading}>{place.alias}</Text>
                    <Text style={ui.muted}>
                      {barrioName(barrios, place.barrioId)}
                    </Text>
                  </View>
                  <ChevronRight size={22} color={colors.muted} />
                </View>
                {city.status === "ready" &&
                  (alerts.length === 0 ? (
                    <Pill tone="neutral" icon={CircleCheck} label={t.clear} />
                  ) : (
                    alerts.map((alert) => (
                      <Pill key={alert.service} {...alertPill(alert, now)} />
                    ))
                  ))}
              </Pressable>
            );
          })
        )}

        <Text style={[ui.muted, styles.center]}>{es.independence}</Text>
      </ScrollView>

      <View
        onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
        style={[
          styles.dock,
          stacked && { flexDirection: "column" },
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            paddingBottom: insets.bottom + space.sm,
          },
        ]}
      >
        <View style={!stacked && styles.flex}>
          <Button
            label={t.add}
            icon={Plus}
            onPress={() => router.push("/agregar")}
          />
        </View>
        <View style={!stacked && styles.flex}>
          <Button
            label={t.map}
            icon={MapIcon}
            variant="secondary"
            onPress={() => router.push("/mapa")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.sm,
  },
  round: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  empty: { alignItems: "center", paddingVertical: space.xl, gap: space.md },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
  },
});
