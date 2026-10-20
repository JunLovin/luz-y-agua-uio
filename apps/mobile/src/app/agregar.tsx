import { config, findBarrio } from "@luz-y-agua/shared";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
import { localStore } from "../ui/local-store";
import { colors, ui } from "../ui/theme";
import { useCity } from "../ui/use-city";

type Found = { barrioId: string; lat: number; lng: number };

const NO_DATA = { outages: [], crowd: [], fetchedAt: "" };

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function AddPlace() {
  const router = useRouter();
  const city = useCity();
  const barrios = city.status === "ready" ? city.barrios : null;
  const [mode, setMode] = useState<"choose" | "explain" | "map" | "confirm">(
    "choose",
  );
  const [query, setQuery] = useState("");
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
      <ScrollView contentContainerStyle={ui.screen}>
        <Text style={ui.title} accessibilityRole="header">
          {es.addPlace.locationTitle}
        </Text>
        <Text style={ui.body}>{es.addPlace.locationBody}</Text>
        <Button label={es.common.continue} onPress={() => void locate()} />
        <Button
          label={es.common.cancel}
          variant="secondary"
          onPress={() => setMode("choose")}
        />
      </ScrollView>
    );
  }

  if (mode === "map") {
    return (
      <View style={{ flex: 1 }}>
        <Text style={[ui.body, { padding: 16 }]}>
          {message ?? es.addPlace.pickOnMapHint}
        </Text>
        <BaseMap barrios={outlines} onPress={pickOnMap} />
        <View style={{ padding: 16 }}>
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
        <Text style={ui.heading}>
          {es.addPlace.found(barrioName(barrios, found.barrioId))}
        </Text>
        <Text style={ui.body}>{es.addPlace.aliasLabel}</Text>
        <TextInput
          style={ui.input}
          value={alias}
          onChangeText={setAlias}
          placeholder={es.addPlace.aliasPlaceholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={es.addPlace.aliasLabel}
          maxLength={40}
          autoFocus
        />
        <Button label={es.common.save} onPress={save} />
        <Button
          label={es.common.cancel}
          variant="secondary"
          onPress={() => setMode("choose")}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={ui.screen}
      keyboardShouldPersistTaps="handled"
    >
      {message && (
        <Text style={[ui.body, { color: colors.warning }]}>{message}</Text>
      )}
      <Button
        label={es.addPlace.useLocation}
        onPress={() => setMode("explain")}
      />
      <Button
        label={es.addPlace.pickOnMap}
        variant="secondary"
        disabled={!barrios}
        onPress={() => {
          setMessage(null);
          setMode("map");
        }}
      />
      <Text style={ui.body}>{es.addPlace.searchLabel}</Text>
      <TextInput
        style={ui.input}
        value={query}
        onChangeText={setQuery}
        placeholder={es.addPlace.searchPlaceholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={es.addPlace.searchLabel}
        autoCorrect={false}
      />
      {!barrios && <Text style={ui.muted}>{es.addPlace.barriosMissing}</Text>}
      {query.trim() !== "" && barrios && results.length === 0 && (
        <Text style={ui.muted}>{es.addPlace.noResults}</Text>
      )}
      <View style={{ gap: 8 }}>
        {results.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => pick(option.id)}
            style={({ pressed }) => [ui.card, pressed && { opacity: 0.7 }]}
          >
            <Text style={ui.body}>{option.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
