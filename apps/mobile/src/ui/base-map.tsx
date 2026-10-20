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
import { colors, ui } from "./theme";

/** Our own style in our own storage: no third-party tile, font or geocoding server (CLAUDE.md rule 11). */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const styleUrl =
  supabaseUrl && `${supabaseUrl}/storage/v1/object/public/tiles/style.json`;
const QUITO: [number, number] = [-78.5, -0.22];

export const statusColors = {
  high: "#C2410C",
  medium: "#FDBA74",
  crowd: "#7C3AED",
} as const;

type Props = {
  barrios: FeatureCollection<Polygon | MultiPolygon, MapBarrio> | null;
  onPress?: (lngLat: [number, number]) => void;
  children?: ReactNode;
};

export function BaseMap({ barrios, onPress, children }: Props) {
  const [failed, setFailed] = useState(false);
  if (!styleUrl || failed) {
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
        mapStyle={styleUrl}
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
                  statusColors.high,
                  "medium",
                  statusColors.medium,
                  "crowd",
                  statusColors.crowd,
                  "#000000",
                ],
                "fill-opacity": ["match", ["get", "status"], "none", 0, 0.45],
              }}
            />
            <Layer
              id="barrios-outline"
              type="line"
              paint={{
                "line-color": colors.primary,
                "line-width": 1,
                "line-opacity": 0.6,
              }}
            />
          </GeoJSONSource>
        )}
        {children}
      </Map>
      <Text style={styles.attribution}>{es.map.attribution}</Text>
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
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
