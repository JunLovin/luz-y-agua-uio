import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
} from "@maplibre/maplibre-react-native";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MapBarrio } from "../domain/map";
import { es } from "../i18n/es";
import type { Service } from "@luz-y-agua/shared";
import { useTheme } from "./theme";
import type { Palette } from "./tokens";

/** Our own style in our own storage: no third-party tile, font or geocoding server (CLAUDE.md rule 11). */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const styleUrl = (scheme: "dark" | "light") =>
  supabaseUrl &&
  `${supabaseUrl}/storage/v1/object/public/tiles/${scheme === "dark" ? "style-dark" : "style"}.json`;
const QUITO: [number, number] = [-78.5, -0.22];

/** Announced cuts take the service's color, unconfirmed ones a lighter fill, reports the crowd color. */
export function statusColor(
  colors: Palette,
  service: Service,
  status: "high" | "medium" | "crowd",
): string {
  return status === "crowd" ? colors.crowd.solid : colors[service].solid;
}

type Props = {
  barrios: FeatureCollection<Polygon | MultiPolygon, MapBarrio> | null;
  service?: Service;
  onPress?: (lngLat: [number, number]) => void;
  children?: ReactNode;
};

export function BaseMap({
  barrios,
  service = "luz",
  onPress,
  children,
}: Props) {
  const { colors, ui, scheme } = useTheme();
  const url = styleUrl(scheme);
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <View style={[styles.container, styles.unavailable]}>
        <Text style={ui.muted}>{es.map.unavailable}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={url}
        onDidFailLoadingMap={() => setFailed(true)}
        logo={false}
        attribution={false}
        touchPitch={false}
        touchRotate={false}
        {...(onPress && {
          onPress: (event) => onPress(event.nativeEvent.lngLat),
        })}
      >
        <Camera initialViewState={{ center: QUITO, zoom: 10.5 }} minZoom={9} />
        {barrios && (
          <GeoJSONSource id="barrios" data={barrios}>
            <Layer
              id="barrios-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "match",
                  ["get", "status"],
                  "high",
                  statusColor(colors, service, "high"),
                  "medium",
                  statusColor(colors, service, "medium"),
                  "crowd",
                  statusColor(colors, service, "crowd"),
                  "#000000",
                ],
                "fill-opacity": [
                  "match",
                  ["get", "status"],
                  "none",
                  0,
                  "medium",
                  0.25,
                  0.5,
                ],
              }}
            />
            <Layer
              id="barrios-outline"
              type="line"
              paint={{
                "line-color": colors.muted,
                "line-width": 1,
                "line-opacity": 0.45,
              }}
            />
          </GeoJSONSource>
        )}
        {children}
      </Map>
      <Text
        style={[
          styles.attribution,
          { color: colors.text, backgroundColor: colors.surface },
        ]}
      >
        {es.map.attribution}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  unavailable: { alignItems: "center", justifyContent: "center", padding: 24 },
  attribution: {
    position: "absolute",
    left: 6,
    bottom: 6,
    fontSize: 11,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
