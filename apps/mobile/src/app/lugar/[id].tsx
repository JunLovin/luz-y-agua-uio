import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { barrioName } from "../../domain/barrios";
import { statusFor } from "../../domain/city";
import { removePlace } from "../../domain/local-state";
import { es } from "../../i18n/es";
import { formatOutageWindow } from "../../i18n/format";
import { Button } from "../../ui/button";
import { EeqZonePicker } from "../../ui/eeq-zone-picker";
import { localStore, useLocalState } from "../../ui/local-store";
import { colors, ui } from "../../ui/theme";
import { useCity } from "../../ui/use-city";

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const local = useLocalState();
  const city = useCity();
  const place = local.places.find((p) => p.id === id);
  if (!place) return <Redirect href="/" />;

  const barrios = city.status === "ready" ? city.barrios : null;
  const status =
    city.status === "ready"
      ? statusFor(city.snapshot, place.barrioId, new Date())
      : null;
  const t = es.place;

  const placeId = place.id;

  function remove() {
    Alert.alert(t.remove, t.removeConfirm, [
      { text: es.common.cancel, style: "cancel" },
      {
        text: es.common.delete,
        style: "destructive",
        onPress: () => {
          localStore.update((state) => removePlace(state, placeId));
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Stack.Screen options={{ title: place.alias }} />
      <Text style={ui.muted}>{barrioName(barrios, place.barrioId)}</Text>

      <Text style={ui.heading} accessibilityRole="header">
        {t.upcoming}
      </Text>
      {city.status === "loading" && (
        <Text style={ui.muted}>{es.city.loading}</Text>
      )}
      {city.status === "error" && (
        <Text style={[ui.muted, { color: colors.danger }]}>
          {es.city.error}
        </Text>
      )}
      {status && status.outages.length === 0 && (
        <Text style={ui.body}>{t.none}</Text>
      )}
      {status?.outages.map((outage) => (
        <View key={outage.id} style={ui.card}>
          <Text style={ui.heading}>
            {es.services[outage.service]}
            {outage.tier === "medium" ? ` · ${t.unconfirmed}` : ""}
          </Text>
          <Text style={ui.body}>
            {formatOutageWindow(outage.starts_at, outage.ends_at)}
          </Text>
          {outage.notes && <Text style={ui.body}>{outage.notes}</Text>}
          <Text style={ui.muted}>{t.source(outage.source_label)}</Text>
        </View>
      ))}

      <Text style={ui.heading} accessibilityRole="header">
        {t.neighbors}
      </Text>
      {status && status.crowd.length === 0 && (
        <Text style={ui.body}>{t.neighborsNone}</Text>
      )}
      {status?.crowd.map((c) => (
        <Text key={c.service} style={[ui.body, { color: colors.warning }]}>
          {t.neighborsCount(es.services[c.service], c.reports)}
        </Text>
      ))}

      <Text style={ui.heading}>{t.report.title}</Text>
      <View style={{ gap: 8 }}>
        <Button label={t.report.outLuz} onPress={() => undefined} disabled />
        <Button
          label={t.report.backLuz}
          variant="secondary"
          onPress={() => undefined}
          disabled
        />
        <Button label={t.report.outAgua} onPress={() => undefined} disabled />
        <Button
          label={t.report.backAgua}
          variant="secondary"
          onPress={() => undefined}
          disabled
        />
      </View>
      <Text style={ui.muted}>{t.report.soon}</Text>

      <EeqZonePicker place={place} />

      <Button label={t.remove} variant="danger" onPress={remove} />
    </ScrollView>
  );
}
