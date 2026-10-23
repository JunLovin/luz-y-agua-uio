import { placeAlerts, statusFor } from "@luz-y-agua/shared";
import { CircleCheck, Droplet, MapPin, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { toDayOutage } from "@/domain/today";
import { es } from "@/i18n/es";
import { getBarrioNames, getCity } from "@/server/city";
import { OutageItem } from "@/ui/outage-item";

const t = es.barrio;

export async function generateStaticParams() {
  return Object.keys(await getBarrioNames()).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/barrio/[id]">): Promise<Metadata> {
  const { id } = await params;
  const name = (await getBarrioNames())[id];
  if (!name) return {};
  return {
    title: t.title(name),
    description: t.description(name),
    alternates: { canonical: `/barrio/${id}` },
  };
}

async function BarrioStatus({ id }: { id: string }) {
  "use cache";
  cacheLife("city");
  const [city, names] = await Promise.all([getCity(), getBarrioNames()]);
  const name = names[id];
  if (!name) notFound();
  const now = new Date();
  const { outages, crowd } = statusFor(city, id, now);
  const alerts = placeAlerts(city, id, now);

  return (
    <>
      <header className="page-head">
        <span className="badge badge-lg tone-luz">
          <MapPin size={30} aria-hidden="true" />
        </span>
        <h1>{t.title(name)}</h1>
      </header>

      <section aria-label={t.now} className="tiles">
        {(["luz", "agua"] as const).map((service) => {
          const alert = alerts.find((a) => a.service === service);
          const tone = !alert
            ? ""
            : alert.kind === "crowd"
              ? "tone-crowd"
              : `tone-${service}`;
          const Icon = !alert
            ? CircleCheck
            : alert.kind === "crowd"
              ? Users
              : SERVICE_ICON[service];
          return (
            <div key={service} className={`tile ${tone}`}>
              <Icon size={28} aria-hidden="true" />
              <h2>{es.serviceTitles[service]}</h2>
              <p>
                {!alert
                  ? t.nowClear
                  : alert.kind === "crowd"
                    ? t.nowCrowd
                    : alert.kind === "ongoing"
                      ? t.nowOngoing
                      : capitalize(toDayOutage(alert.outage, now).window)}
              </p>
            </div>
          );
        })}
      </section>

      {outages.length > 0 && (
        <section className="list" aria-labelledby="anunciados">
          <h2 id="anunciados">{t.upcoming}</h2>
          {outages.map((o) => {
            const Icon = SERVICE_ICON[o.service];
            return (
              <article key={o.id} className={`card tone-${o.service}`}>
                <span className="pill">
                  <Icon size={18} aria-hidden="true" />
                  {es.serviceTitles[o.service]}
                </span>
                <OutageItem outage={toDayOutage(o, now)} />
              </article>
            );
          })}
        </section>
      )}

      {crowd.length > 0 && (
        <section className="card" aria-labelledby="vecinos">
          <h2 id="vecinos">{t.neighbors}</h2>
          {crowd.map((c) => (
            <p key={c.service} className="pill tone-crowd">
              <Users size={18} aria-hidden="true" />
              {t.neighborsCount(es.services[c.service], c.reports)}
            </p>
          ))}
        </section>
      )}
    </>
  );
}

const SERVICE_ICON = { luz: Zap, agua: Droplet } as const;
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

// params are read outside any Suspense boundary so an unknown barrio answers a real 404;
// every known barrio is prerendered, so blocking only affects ones added after the build.
export const instant = false;

export default async function BarrioPage({
  params,
}: PageProps<"/barrio/[id]">) {
  const { id } = await params;
  return <BarrioStatus id={id} />;
}
