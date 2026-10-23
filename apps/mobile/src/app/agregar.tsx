import { config, findBarrio } from "@luz-y-agua/shared";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "../ui/text";
import {
  Check,
  CircleX,
  LocateFixed,
  MapPin,
  MapPinned,
  Search,
  TriangleAlert,
} from "lucide-react-native";
import {
  barrioName,
  representativePoint,
  searchBarrios,
} from "../domain/barrios";
import { addPlace } from "../domain/local-state";
import { mapBarrios } from "../domain/map";
import { es } from "../i18n/es";
import { BaseMap } from "../ui/base-map";
import { Button } from "../ui/button";
import { Card, IconBadge, OptionRow } from "../ui/kit";
import { localStore } from "../ui/local-store";
import { useTheme } from "../ui/theme";
import { radius, space } from "../ui/tokens";
import { useCity } from "../ui/use-city";

type Found = { barrioId: string; lat: number; lng: number };

const NO_DATA = { outages: [], crowd: [], fetchedAt: "" };

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function AddPlace() {
  const { colors, ui } = useTheme();
  const t = es.addPlace;
  const router = useRouter();
  const city = useCity();
  const barrios = city.status === "ready" ? city.barrios : null;
  const [mode, setMode] = useState<"choose" | "explain" | "map" | "confirm">(
    "choose",
  );
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const [found, setFound] = useState<Found | null>(null);
  const [alias, setAlias] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function choose(next: Found) {
    setAlias("");
    setFound(next);
    setMode("confirm");
  }
  const outlines = useMemo(
    () => (barrios ? mapBarrios(barrios, NO_DATA, "luz", new Date()) : null),
    [barrios],
  );
  const results = useMemo(
    () => (barrios ? searchBarrios(barrios, query) : []),
    [barrios, query],
  );

  async function locate() {
    if (!barrios) return setMessage(es.addPlace.barriosMissing);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      setMode("choose");
      return setMessage(es.addPlace.locationDenied);
    }
    try {
      const { coords } = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Location timeout")),
            config.mobile.locationTimeoutMs,
          ),
        ),
      ]);
      const barrio = findBarrio(coords.latitude, coords.longitude, barrios);
      if (!barrio) {
        setMode("choose");
        return setMessage(es.addPlace.outsideQuito);
      }
      choose({
        barrioId: barrio.id,
        lat: coords.latitude,
        lng: coords.longitude,
      });
    } catch {
      setMode("choose");
      setMessage(es.addPlace.locationError);
    }
  }

  function pick(barrioId: string) {
    const point = barrios && representativePoint(barrios, barrioId);
    if (!point) return;
    choose({ barrioId, ...point });
  }

  function pickOnMap([lng, lat]: [number, number]) {
    const barrio = barrios && findBarrio(lat, lng, barrios);
    if (!barrio) return setMessage(es.addPlace.outsideQuito);
    choose({ barrioId: barrio.id, lat, lng });
  }

  function save() {
    if (!found) return;
    const name = alias.trim() || barrioName(barrios, found.barrioId);
    localStore.update((state) =>
      addPlace(state, { id: newId(), alias: name, ...found }),
    );
    router.back();
  }

  if (mode === "explain") {
    return (
      <ScrollView contentContainerStyle={[ui.screen, styles.centered]}>
        <IconBadge icon={LocateFixed} tone="luz" size={72} />
        <Text style={[ui.title, styles.center]} accessibilityRole="header">
          {t.locationTitle}
        </Text>
        <Text style={[ui.body, styles.center, { color: colors.muted }]}>
          {t.locationBody}
        </Text>
        <View style={styles.actions}>
          <Button
            label={es.common.continue}
            icon={LocateFixed}
            onPress={() => void locate()}
          />
          <Button
            label={es.common.cancel}
            variant="ghost"
            onPress={() => setMode("choose")}
          />
        </View>
      </ScrollView>
    );
  }

  if (mode === "map") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <BaseMap barrios={outlines} onPress={pickOnMap} />
        <View
          style={[
            styles.floatTop,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <MapPinned size={22} color={colors.primary} />
          <Text style={[ui.label, { flex: 1 }]}>
            {message ?? t.pickOnMapHint}
          </Text>
        </View>
        <View style={styles.floatBottom}>
          <Button
            label={es.common.cancel}
            variant="secondary"
            onPress={() => setMode("choose")}
          />
        </View>
      </View>
    );
  }

  if (mode === "confirm" && found) {
    return (
      <ScrollView
        contentContainerStyle={ui.screen}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.centered}>
          <IconBadge icon={MapPin} tone="luz" size={72} />
          <Text style={[ui.title, styles.center]} accessibilityRole="header">
            {t.found(barrioName(barrios, found.barrioId))}
          </Text>
        </View>
        <Text style={ui.label}>{t.aliasLabel}</Text>
        <View style={styles.chips}>
          {t.aliasSuggestions.map((suggestion) => {
            const selected = alias === suggestion;
            return (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setAlias(suggestion)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.raised,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    ui.label,
                    { color: selected ? colors.onPrimary : colors.text },
                  ]}
                >
                  {suggestion}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          maxFontSizeMultiplier={2}
          style={ui.input}
          value={alias}
          onChangeText={setAlias}
          placeholder={t.aliasPlaceholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t.aliasLabel}
          maxLength={40}
        />
        <View style={styles.actions}>
          <Button label={es.common.save} icon={Check} onPress={save} />
          <Button
            label={es.common.cancel}
            variant="ghost"
            onPress={() => setMode("choose")}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={ui.screen}
      keyboardShouldPersistTaps="handled"
    >
      {!searching && (
        <>
          {message && (
            <Card style={styles.row}>
              <IconBadge icon={TriangleAlert} tone="danger" />
              <Text style={[ui.body, { flex: 1 }]}>{message}</Text>
            </Card>
          )}
          <OptionRow
            icon={LocateFixed}
            tone="luz"
            title={t.useLocation}
            subtitle={t.useLocationHint}
            onPress={() => setMode("explain")}
          />
          <OptionRow
            icon={MapPinned}
            tone="agua"
            title={t.pickOnMap}
            subtitle={t.pickOnMapSubtitle}
            disabled={!barrios}
            onPress={() => {
              setMessage(null);
              setMode("map");
            }}
          />
        </>
      )}
      {!searching && (
        <Text style={[ui.heading, { marginTop: space.sm }]}>
          {t.searchLabel}
        </Text>
      )}
      <View
        style={[
          styles.search,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Search size={22} color={colors.muted} />
        <TextInput
          maxFontSizeMultiplier={2}
          style={[ui.body, { flex: 1, paddingVertical: 14 }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t.searchLabel}
          autoCorrect={false}
        />
        {searching && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.clearSearch}
            hitSlop={12}
            onPress={() => setQuery("")}
          >
            <CircleX size={22} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!barrios && <Text style={ui.muted}>{t.barriosMissing}</Text>}
      {searching && barrios && results.length === 0 && (
        <Text style={ui.muted}>{t.noResults}</Text>
      )}
      {results.map((option) => (
        <OptionRow
          key={option.id}
          icon={MapPin}
          title={option.name}
          onPress={() => pick(option.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", gap: space.md },
  center: { textAlign: "center" },
  actions: { alignSelf: "stretch", gap: space.sm, marginTop: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.md + 2,
    paddingVertical: 10,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.md + 2,
  },
  floatTop: {
    position: "absolute",
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  floatBottom: {
    position: "absolute",
    bottom: space.xl,
    left: space.lg,
    right: space.lg,
  },
});
