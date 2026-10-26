"use client";

import type { MapBarrio, Service } from "@luz-y-agua/shared";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";
import { es } from "@/i18n/es";

type Barrios = FeatureCollection<Polygon | MultiPolygon, MapBarrio>;

type Props = {
  styleUrl: string;
  barrios: Barrios;
  service: Service;
  selected: string | null;
  cooperative: boolean;
  onSelect: (id: string | null) => void;
  onError: () => void;
};

const QUITO: [number, number] = [-78.5, -0.2];
const SOURCE = "barrios";
const GLOW = "barrios-glow";

let protocolReady = false;

function cssVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/** Barrio layers on top of whatever base style is loaded, in the current theme's colors. */
function addBarrios(
  map: maplibregl.Map,
  data: Barrios,
  service: Service,
  selected: string | null,
) {
  const tone = cssVar(`--${service}`);
  const crowd = cssVar("--crowd");
  const color = ["match", ["get", "status"], "crowd", crowd, tone];
  map.addSource(SOURCE, { type: "geojson", data, promoteId: "id" });
  map.addLayer({
    id: "barrios-fill",
    type: "fill",
    source: SOURCE,
    paint: {
      "fill-color": color as never,
      "fill-opacity": [
        "match",
        ["get", "status"],
        "high",
        0.5,
        "crowd",
        0.42,
        "medium",
        0.22,
        0,
      ],
    },
  });
  map.addLayer({
    id: "barrios-outline",
    type: "line",
    source: SOURCE,
    paint: {
      "line-color": cssVar("--muted"),
      "line-width": 0.8,
      "line-opacity": 0.35,
    },
  });
  map.addLayer({
    id: GLOW,
    type: "line",
    source: SOURCE,
    filter: ["in", ["get", "status"], ["literal", ["high", "crowd"]]],
    paint: {
      "line-color": color as never,
      "line-width": 3,
      "line-blur": 2,
      "line-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "barrios-selected",
    type: "line",
    source: SOURCE,
    filter: ["==", ["get", "id"], selected ?? ""],
    paint: { "line-color": cssVar("--text"), "line-width": 2.5 },
  });
}

export default function MapCanvas({
  styleUrl,
  barrios,
  service,
  selected,
  cooperative,
  onSelect,
  onError,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const latest = useRef({ barrios, service, selected, onSelect, onError });
  useEffect(() => {
    latest.current = { barrios, service, selected, onSelect, onError };
  });

  useEffect(() => {
    if (!protocolReady) {
      // Served from our own domain: bundlers cannot find MapLibre's worker next to its module.
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      maplibregl.addProtocol("pmtiles", new Protocol().tile);
      protocolReady = true;
    }
    const map = new maplibregl.Map({
      container: container.current!,
      style: styleUrl,
      center: QUITO,
      zoom: 10.2,
      minZoom: 9,
      maxZoom: 15,
      cooperativeGestures: cooperative,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: {
        compact: true,
        customAttribution: es.map.attribution,
      },
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": es.map.gestures.windows,
        "CooperativeGesturesHandler.MacHelpText": es.map.gestures.mac,
        "CooperativeGesturesHandler.MobileHelpText": es.map.gestures.mobile,
      },
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.on("style.load", () => {
      const { barrios, service, selected } = latest.current;
      addBarrios(map, barrios, service, selected);
    });
    map.on("error", (event) => {
      if (!map.isStyleLoaded()) latest.current.onError();
      console.warn("map:", event.error?.message);
    });
    map.on("click", (event) => {
      const [hit] = map.queryRenderedFeatures(event.point, {
        layers: ["barrios-fill"],
      });
      latest.current.onSelect(hit ? String(hit.properties.id) : null);
    });
    map.on("mousemove", "barrios-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "barrios-fill", () => {
      map.getCanvas().style.cursor = "";
    });

    // The one animated moment: affected barrios breathe, unless the visitor asked for less motion.
    let frame = 0;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const breathe = (time: number) => {
      if (map.getLayer(GLOW) && !still.matches)
        map.setPaintProperty(
          GLOW,
          "line-opacity",
          0.55 + 0.4 * Math.sin(time / 600),
        );
      frame = requestAnimationFrame(breathe);
    };
    frame = requestAnimationFrame(breathe);

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
    // The map is built once; style, data and selection changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setStyle(styleUrl);
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource(SOURCE)) return;
    (map.getSource(SOURCE) as GeoJSONSource).setData(barrios);
    const tone = cssVar(`--${service}`);
    const color = [
      "match",
      ["get", "status"],
      "crowd",
      cssVar("--crowd"),
      tone,
    ];
    map.setPaintProperty("barrios-fill", "fill-color", color as never);
    map.setPaintProperty(GLOW, "line-color", color as never);
  }, [barrios, service]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("barrios-selected")) return;
    map.setFilter("barrios-selected", ["==", ["get", "id"], selected ?? ""]);
  }, [selected]);

  return (
    <div
      ref={container}
      className="map-canvas"
      role="region"
      aria-label={es.map.label}
    />
  );
}
