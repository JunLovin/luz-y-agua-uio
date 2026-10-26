"use client";

import {
  mapBarrios,
  outageWindow,
  statusFor,
  type BarriosGeoJson,
  type CitySnapshot,
  type Service,
} from "@luz-y-agua/shared";
import { Droplet, X, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { exampleCity } from "@/domain/example";
import { es } from "@/i18n/es";
import type { MapSources } from "@/server/city";
import { useScheme } from "@/ui/theme-switch";

// MapLibre is ~250 KB: it loads only in the browser, once the map is about to be seen.
const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false });

type Props = {
  city: CitySnapshot;
  sources: MapSources;
  variant: "hero" | "page";
};

const ICONS = { luz: Zap, agua: Droplet } as const;
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export function LiveMap({ city, sources, variant }: Props) {
  const t = es.map;
  const scheme = useScheme();
  const frame = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // "now" is taken when the barrios arrive, in the browser, never during the prerender.
  const [loaded, setLoaded] = useState<{
    geojson: BarriosGeoJson;
    now: Date;
  } | null>(null);
  const [failed, setFailed] = useState(!sources.barriosUrl);
  const [service, setService] = useState<Service>("luz");
  const [example, setExample] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !sources.barriosUrl) return;
    let live = true;
    fetch(sources.barriosUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`barrios ${response.status}`);
        return response.json() as Promise<BarriosGeoJson>;
      })
      .then((geojson) => live && setLoaded({ geojson, now: new Date() }))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [visible, sources.barriosUrl]);

  const now = loaded?.now;
  const snapshot = useMemo(
    () => (example && now ? exampleCity(now, t.exampleSource) : city),
    [example, now, city, t.exampleSource],
  );
  const quiet =
    !!now &&
    city.crowd.length === 0 &&
    city.outages.every((o) => o.ends_at && new Date(o.ends_at) <= now);
  const barrios = useMemo(
    () => loaded && mapBarrios(loaded.geojson, snapshot, service, loaded.now),
    [loaded, snapshot, service],
  );
  const affected = (barrios?.features ?? [])
    .map((f) => f.properties)
    .filter((b) => b.status !== "none")
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const selectedName = barrios?.features.find(
    (f) => f.properties.id === selected,
  )?.properties.name;

  const switchExample = (next: boolean) => {
    setExample(next);
    setSelected(null);
  };

  return (
    <div className={`live-map live-map-${variant}`}>
      <div className="map-frame" ref={frame}>
        {(failed || !drawn) && (
          <p className="map-status muted" role="status">
            {failed ? t.unavailable : t.loading}
          </p>
        )}
        {visible && barrios && !failed && (
          <MapCanvas
            styleUrl={sources.styles[scheme]}
            barrios={barrios}
            service={service}
            selected={selected}
            cooperative={variant === "hero"}
            onSelect={setSelected}
            onDrawn={() => setDrawn(true)}
            onError={() => setFailed(true)}
          />
        )}

        <div className="map-top">
          <div className="segmented" role="group" aria-label={t.service}>
            {(["luz", "agua"] as const).map((option) => {
              const Icon = ICONS[option];
              return (
                <button
                  key={option}
                  type="button"
                  className={`tone-${option}`}
                  aria-pressed={service === option}
                  onClick={() => setService(option)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {es.serviceTitles[option]}
                </button>
              );
            })}
          </div>
          {example && (
            <p className="pill tone-crowd example-badge" role="status">
              {t.example}
            </p>
          )}
        </div>

        {barrios && quiet && !example && (
          <div className="map-empty">
            <p>{t.empty}</p>
            <button
              type="button"
              className="button"
              onClick={() => switchExample(true)}
            >
              {t.showExample}
            </button>
          </div>
        )}

        {now && selected && selectedName && (
          <BarrioCard
            id={selected}
            name={selectedName}
            snapshot={snapshot}
            service={service}
            now={now}
            example={example}
            onClose={() => {
              setSelected(null);
              frame.current?.parentElement
                ?.querySelector<HTMLButtonElement>(
                  `[data-barrio="${selected}"]`,
                )
                ?.focus();
            }}
          />
        )}
      </div>

      <div className="map-foot">
        <ul className="legend" aria-label={t.legendLabel}>
          {(["high", "medium", "crowd"] as const).map((status) => (
            <li key={status}>
              <span
                className={`swatch swatch-${status} tone-${status === "crowd" ? "crowd" : service}`}
                aria-hidden="true"
              />
              {t.legend[status]}
            </li>
          ))}
        </ul>
        {barrios && (
          <p className="muted" aria-live="polite">
            {t.summary(affected.length, es.services[service])}{" "}
            {example ? (
              <button
                type="button"
                className="link-button"
                onClick={() => switchExample(false)}
              >
                {t.backToToday}
              </button>
            ) : (
              <Link href={`/cortes-de-${service}-quito-hoy`}>
                {es.home.seeList}
              </Link>
            )}
          </p>
        )}
        {affected.length > 0 && (
          <ul className="affected" aria-label={t.affected}>
            {affected.map((barrio) => (
              <li key={barrio.id}>
                <button
                  type="button"
                  className={`chip tone-${barrio.status === "crowd" ? "crowd" : service}`}
                  data-status={barrio.status}
                  data-barrio={barrio.id}
                  aria-pressed={selected === barrio.id}
                  onClick={() => setSelected(barrio.id)}
                >
                  {barrio.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BarrioCard({
  id,
  name,
  snapshot,
  service,
  now,
  example,
  onClose,
}: {
  id: string;
  name: string;
  snapshot: CitySnapshot;
  service: Service;
  now: Date;
  example: boolean;
  onClose: () => void;
}) {
  const t = es.map;
  const status = statusFor(snapshot, id, now);
  const outages = status.outages.filter((o) => o.service === service);
  const crowd = status.crowd.find((c) => c.service === service);
  const Icon = ICONS[service];
  const card = useRef<HTMLElement>(null);
  useEffect(() => card.current?.focus(), [id]);
  return (
    <section
      ref={card}
      tabIndex={-1}
      className={`map-card tone-${service}`}
      aria-label={name}
      onKeyDown={(event) => event.key === "Escape" && onClose()}
    >
      <div className="map-card-head">
        <h3>
          <Icon size={20} aria-hidden="true" />
          {name}
        </h3>
        <button
          type="button"
          className="icon-button"
          aria-label={t.close}
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {crowd && <p className="pill tone-crowd">{t.crowd(crowd.reports)}</p>}
      {outages.map((outage) => (
        <div key={outage.id} className="outage">
          <p className="outage-window">
            {capitalize(outageWindow(outage.starts_at, outage.ends_at, now))}
          </p>
          {outage.tier === "medium" && (
            <span className="pill">{es.outage.unconfirmed}</span>
          )}
          <p className="muted">{es.outage.source(outage.source_label)}</p>
        </div>
      ))}
      {!crowd && outages.length === 0 && (
        <p className="muted">{t.clear(es.services[service])}</p>
      )}
      {!example && <Link href={`/barrio/${id}`}>{t.openBarrio}</Link>}
    </section>
  );
}
