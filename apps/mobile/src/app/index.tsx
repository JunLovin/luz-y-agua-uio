import { Link, Redirect, Stack, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { barrioName } from "../domain/barrios";
import { placeAlerts, type PlaceAlert } from "../domain/city";
import { needsWelcome } from "../domain/consent";
import { es } from "../i18n/es";
import { formatOutageWindow } from "../i18n/format";
import { Button } from "../ui/button";
import { useLocalState } from "../ui/local-store";
import { useTheme } from "../ui/theme";
import { useCity } from "../ui/use-city";

function alertText(alert: PlaceAlert): string {
  const service = es.services[alert.service];
  if (alert.kind === "crowd") return es.places.crowd(service);
  if (alert.kind === "ongoing") return es.places.ongoing(service);
  return es.places.scheduled(
    service,
    formatOutageWindow(alert.outage.starts_at, alert.outage.ends_at),
  );
}

export default function Places() {
  const { colors, ui } = useTheme();
  const local = useLocalState();
  const city = useCity();
  const router = useRouter();
  if (needsWelcome(local)) return <Redirect href="/bienvenida" />;

  const barrios = city.status === "ready" ? city.barrios : null;
  const now = new Date();

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link
              href="/ajustes"
              accessibilityRole="button"
              style={{ color: colors.primary, fontSize: 16 }}
            >
              {es.places.settings}
            </Link>
          ),
        }}
      />
      {city.status === "loading" && (
        <Text style={ui.muted}>{es.city.loading}</Text>
      )}
      {city.status === "error" && (
        <Text style={[ui.muted, { color: colors.danger.text }]}>
          {es.city.error}
        </Text>
      )}
      {city.status === "ready" && city.offline && (
        <Text style={ui.muted}>{es.city.offline}</Text>
      )}

      {local.places.length === 0 && (
        <Text style={ui.body}>{es.places.empty}</Text>
      )}
      {local.places.map((place) => {
        const alerts =
          city.status === "ready"
            ? placeAlerts(city.snapshot, place.barrioId, now)
            : [];
        return (
          <Pressable
            key={place.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/lugar/[id]", params: { id: place.id } })
            }
            style={({ pressed }) => [ui.card, pressed && { opacity: 0.7 }]}
          >
            <Text style={ui.heading}>{place.alias}</Text>
            <Text style={ui.muted}>{barrioName(barrios, place.barrioId)}</Text>
            <View style={{ gap: 2, marginTop: 4 }}>
              {city.status === "ready" && alerts.length === 0 && (
                <Text style={ui.body}>{es.places.clear}</Text>
              )}
              {alerts.map((alert) => (
                <Text
                  key={alert.service}
                  style={[ui.body, { color: colors.crowd.text }]}
                >
                  {alertText(alert)}
                </Text>
              ))}
            </View>
          </Pressable>
        );
      })}
      <Button label={es.places.add} onPress={() => router.push("/agregar")} />
      <Button
        label={es.map.open}
        variant="secondary"
        onPress={() => router.push("/mapa")}
      />
      <Text style={[ui.muted, { textAlign: "center" }]}>{es.independence}</Text>
    </ScrollView>
  );
}
