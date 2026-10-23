import { statusFor } from "@luz-y-agua/shared";
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

  return (
    <>
      <h1>{t.title(name)}</h1>
      <section className="card" aria-labelledby="anunciados">
        <h2 id="anunciados">{t.upcoming}</h2>
        {outages.length === 0 && <p>{t.none}</p>}
        {(["luz", "agua"] as const).map((service) =>
          outages
            .filter((o) => o.service === service)
            .map((o) => (
              <div key={o.id}>
                <h3>{es.serviceTitles[service]}</h3>
                <OutageItem outage={toDayOutage(o, now)} />
              </div>
            )),
        )}
      </section>
      <section className="card" aria-labelledby="vecinos">
        <h2 id="vecinos">{t.neighbors}</h2>
        {crowd.length === 0 ? (
          <p>{t.neighborsNone}</p>
        ) : (
          crowd.map((c) => (
            <p key={c.service}>
              {t.neighborsCount(es.services[c.service], c.reports)}
            </p>
          ))
        )}
      </section>
    </>
  );
}

// params are read outside any Suspense boundary so an unknown barrio answers a real 404.
export default async function BarrioPage({
  params,
}: PageProps<"/barrio/[id]">) {
  const { id } = await params;
  return <BarrioStatus id={id} />;
}
