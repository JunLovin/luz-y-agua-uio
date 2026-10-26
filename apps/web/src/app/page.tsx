import { Droplet, FileText, ShieldCheck, Users, Zap } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { outagesToday } from "@/domain/today";
import { es } from "@/i18n/es";
import { formatLongDate } from "@/i18n/format";
import { getCity, getMapSources } from "@/server/city";
import { AppPreview } from "@/ui/app-preview";
import { LiveMap } from "@/ui/live-map/live-map";

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const HOW = [
  { key: "official", icon: FileText, tone: "luz" },
  { key: "neighbors", icon: Users, tone: "crowd" },
  { key: "privacy", icon: ShieldCheck, tone: "agua" },
] as const;

export default async function Home() {
  "use cache";
  cacheLife("city");
  const [city, sources] = await Promise.all([getCity(), getMapSources()]);
  const now = new Date();
  const crowdBarrios = new Set(city.crowd.map((c) => c.barrio_id)).size;
  const t = es.home;
  const services = [
    { service: "luz", icon: Zap, href: "/cortes-de-luz-quito-hoy" },
    { service: "agua", icon: Droplet, href: "/cortes-de-agua-quito-hoy" },
  ] as const;

  const intro = (
    <>
      <p className="muted">{capitalize(formatLongDate(now))}</p>
      <h1 id="titulo">{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <div className="counts">
        {services.map(({ service, icon: Icon, href }) => {
          const count = outagesToday(city, service, now).length;
          return (
            <Link key={service} href={href} className={`count tone-${service}`}>
              <span className="big">
                <Icon size={24} aria-hidden="true" />
                {count}
              </span>{" "}
              <span>{t.count(count, es.services[service])}</span>
            </Link>
          );
        })}
      </div>
      {crowdBarrios > 0 && (
        <p className="pill tone-crowd">
          <Users size={18} aria-hidden="true" />
          {t.crowd(crowdBarrios)}
        </p>
      )}
    </>
  );

  return (
    <>
      <section aria-labelledby="titulo">
        <LiveMap city={city} sources={sources} variant="hero" intro={intro} />
      </section>

      <section className="section" aria-labelledby="como">
        <h2 id="como">{t.howTitle}</h2>
        <ul className="how-list">
          {HOW.map(({ key, icon: Icon, tone }) => (
            <li key={key} className={`tone-${tone}`}>
              <span className="badge badge-lg">
                <Icon size={26} aria-hidden="true" />
              </span>
              <h3>{t.how[key].title}</h3>
              <p>{t.how[key].body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section card app-section" aria-labelledby="app">
        <div className="app-text">
          <h2 id="app">{t.appTitle}</h2>
          <p>{t.appBody}</p>
          <p className="pill tone-luz">{t.soon}</p>
        </div>
        <AppPreview />
      </section>
    </>
  );
}
