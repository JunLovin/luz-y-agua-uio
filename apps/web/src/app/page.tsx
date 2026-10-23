import { Droplet, Users, Zap } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { outagesToday } from "@/domain/today";
import { es } from "@/i18n/es";
import { formatLongDate } from "@/i18n/format";
import { getCity } from "@/server/city";
import { NightCity } from "@/ui/night-city";

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default async function Home() {
  "use cache";
  cacheLife("city");
  const city = await getCity();
  const now = new Date();
  const crowdBarrios = new Set(city.crowd.map((c) => c.barrio_id)).size;
  const t = es.home;
  const services = [
    { service: "luz", icon: Zap, href: "/cortes-de-luz-quito-hoy" },
    { service: "agua", icon: Droplet, href: "/cortes-de-agua-quito-hoy" },
  ] as const;

  return (
    <>
      <section className="hero" aria-labelledby="titulo">
        <div className="hero-text">
          <p className="muted">{capitalize(formatLongDate(now))}</p>
          <h1 id="titulo">{t.title}</h1>
        </div>
        <NightCity />
      </section>

      <section className="tiles" aria-label={t.title}>
        {services.map(({ service, icon: Icon, href }) => {
          const count = outagesToday(city, service, now).length;
          return (
            <Link
              key={service}
              href={href}
              className={`tile tone-${service}`}
              aria-label={`${count} ${t.count(count, es.services[service])}. ${t.seeList}`}
            >
              <Icon size={28} aria-hidden="true" />
              <span className="big">{count}</span>
              <span>{t.count(count, es.services[service])}</span>
              <span className="muted" style={{ color: "inherit" }}>
                {t.seeList}
              </span>
            </Link>
          );
        })}
      </section>

      {crowdBarrios > 0 && (
        <p className="pill tone-crowd">
          <Users size={18} aria-hidden="true" />
          {t.crowd(crowdBarrios)}
        </p>
      )}

      <section className="card" aria-labelledby="app">
        <h2 id="app">{t.appTitle}</h2>
        <p>{t.appBody}</p>
        <p className="pill tone-luz">{t.soon}</p>
      </section>
    </>
  );
}
