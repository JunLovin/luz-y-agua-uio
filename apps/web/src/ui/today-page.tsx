import type { Service } from "@luz-y-agua/shared";
import { cacheLife } from "next/cache";
import { Droplet, MapPin, Zap } from "lucide-react";
import Link from "next/link";
import { todayByBarrio } from "@/domain/today";
import { es } from "@/i18n/es";
import { formatLongDate, formatTime } from "@/i18n/format";
import { getBarrioNames, getCity } from "@/server/city";
import { OutageItem } from "./outage-item";

/** Escapes JSON for an inline <script>, so data can never close the tag. */
const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** §9: today's outages of one service, by barrio, prerendered and refreshed every few minutes. */
export async function TodayPage({ service }: { service: Service }) {
  "use cache";
  cacheLife("city");
  const [city, names] = await Promise.all([getCity(), getBarrioNames()]);
  const now = new Date();
  const label = es.services[service];
  const barrios = todayByBarrio(city, names, service, now);

  const events = barrios.flatMap((barrio) =>
    barrio.outages.map((outage) => ({
      "@type": "Event",
      name: es.today.eventName(label, barrio.name),
      startDate: outage.startsAt,
      ...(outage.endsAt && { endDate: outage.endsAt }),
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: barrio.name,
        address: `${barrio.name}, Quito, Ecuador`,
      },
    })),
  );

  const Icon = service === "luz" ? Zap : Droplet;

  return (
    <>
      <header className={`page-head tone-${service}`}>
        <span className="badge badge-lg">
          <Icon size={30} aria-hidden="true" />
        </span>
        <div>
          <h1>{es.today.title(label)}</h1>
          <p className="muted">
            {es.today.date(formatLongDate(now))} ·{" "}
            {es.today.updated(formatTime(now))}
          </p>
        </div>
      </header>
      {barrios.length === 0 ? (
        <p className="card">{es.today.none(label)}</p>
      ) : (
        <ul className="list">
          {barrios.map((barrio) => (
            <li key={barrio.barrioId} className={`card tone-${service}`}>
              <h2 className="row">
                <MapPin size={22} aria-hidden="true" className="tone-icon" />
                <Link href={`/barrio/${barrio.barrioId}`}>{barrio.name}</Link>
              </h2>
              {barrio.outages.map((outage) => (
                <OutageItem key={outage.id} outage={outage} />
              ))}
            </li>
          ))}
        </ul>
      )}
      {events.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: events.map((item, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item,
              })),
            }),
          }}
        />
      )}
    </>
  );
}
