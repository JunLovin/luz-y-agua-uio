import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { configuredPublicApi, type EeqZone } from "../adapters/public-api";
import { searchByName } from "../domain/barrios";
import { addPlace, type Place } from "../domain/local-state";
import { es } from "../i18n/es";
import { Button } from "./button";
import { eeqSearchUrl } from "./links";
import { localStore } from "./local-store";
import { colors, ui } from "./theme";

/** SPEC §8.3: the whole EEQ zone list is downloaded and searched on the phone. */
export function EeqZonePicker({ place }: { place: Place }) {
  const t = es.place.precision;
  const [zones, setZones] = useState<EeqZone[] | "error" | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const wantsList = picking || place.eeqZoneId !== undefined;

  useEffect(() => {
    if (!wantsList || zones !== null) return;
    Promise.resolve()
      .then(() => configuredPublicApi().eeqZones())
      .then(setZones, () => setZones("error"));
  }, [wantsList, zones]);

  function setZone(eeqZoneId: string | undefined) {
    const { eeqZoneId: _previous, ...rest } = place;
    localStore.update((state) =>
      addPlace(state, eeqZoneId ? { ...rest, eeqZoneId } : rest),
    );
    setPicking(false);
    setQuery("");
  }

  const list = Array.isArray(zones) ? zones : [];
  const current = list.find((z) => z.id === place.eeqZoneId);
  const results = query.trim() ? searchByName(list, query) : list.slice(0, 20);

  return (
    <View style={[ui.card, { gap: 10 }]}>
      <Text style={ui.heading}>{t.title}</Text>
      <Text style={ui.body}>{t.body}</Text>
      {place.eeqZoneId && (
        <Text style={ui.body}>
          {t.current(current?.name ?? place.eeqZoneId)}
        </Text>
      )}
      <Button
        label={t.open}
        variant="secondary"
        onPress={() => void WebBrowser.openBrowserAsync(eeqSearchUrl)}
      />
      {!picking && (
        <Button
          label={t.choose}
          variant="secondary"
          onPress={() => setPicking(true)}
        />
      )}
      {place.eeqZoneId && !picking && (
        <Button
          label={t.clear}
          variant="secondary"
          onPress={() => setZone(undefined)}
        />
      )}
      {picking && zones === null && <Text style={ui.muted}>{t.loading}</Text>}
      {picking && zones === "error" && (
        <Text style={[ui.muted, { color: colors.danger }]}>{t.error}</Text>
      )}
      {picking && Array.isArray(zones) && zones.length === 0 && (
        <Text style={ui.muted}>{t.empty}</Text>
      )}
      {picking && list.length > 0 && (
        <>
          <TextInput
            style={ui.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t.search}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t.search}
            autoCorrect={false}
          />
          {results.map((zone) => (
            <Pressable
              key={zone.id}
              accessibilityRole="button"
              onPress={() => setZone(zone.id)}
              style={({ pressed }) => [ui.card, pressed && { opacity: 0.7 }]}
            >
              <Text style={ui.body}>{zone.name}</Text>
            </Pressable>
          ))}
        </>
      )}
      {picking && (
        <Button
          label={es.common.cancel}
          variant="secondary"
          onPress={() => {
            setPicking(false);
            if (zones === "error") setZones(null);
          }}
        />
      )}
    </View>
  );
}
