import {
  Check,
  CircleCheck,
  Droplet,
  FileText,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { outagesToday } from "@/domain/today";
import { es } from "@/i18n/es";
import { formatTime } from "@/i18n/format";
import { getBarrioNames, getCity, getMapSources } from "@/server/city";
import { AppPreview } from "@/ui/app-preview";
import { LiveMap } from "@/ui/live-map/live-map";

const HOW = [
  { key: "official", icon: FileText, tone: "luz" },
  { key: "neighbors", icon: Users, tone: "crowd" },
  { key: "privacy", icon: ShieldCheck, tone: "agua" },
] as const;

export default async function Home() {
  "use cache";
  cacheLife("city");
  const [city, sources, names] = await Promise.all([
    getCity(),
    getMapSources(),
    getBarrioNames(),
  ]);
  const now = new Date();
  const crowdBarrios = new Set(city.crowd.map((c) => c.barrio_id)).size;
  const t = es.home;
  const services = [
    { service: "luz", icon: Zap, href: "/cortes-de-luz-quito-hoy" },
    { service: "agua", icon: Droplet, href: "/cortes-de-agua-quito-hoy" },
  ] as const;

  const h = t.headline;
  const intro = (
    <>
      <p className="live-pill">
        <span className="live-dot" aria-hidden="true" />
        {t.live(formatTime(new Date(city.fetchedAt)))}
      </p>
      <h1 id="titulo" className="headline">
        <span>
          {h.luzBefore}
          <span className="hl tone-luz">{h.luz}</span>?
        </span>{" "}
        <span>
          {h.aguaBefore}
          <span className="hl tone-agua">{h.agua}</span>?
        </span>{" "}
        <span>{h.after}</span>
      </h1>
      <p className="lead">{t.lead}</p>
      <div className="counts">
        {services.map(({ service, icon: Icon, href }) => {
          const count = outagesToday(city, service, now).length;
          return (
            <Link key={service} href={href} className={`count tone-${service}`}>
              {count > 0 ? (
                <>
                  <span className="big">
                    <Icon size={24} aria-hidden="true" />
                    {count}
                  </span>{" "}
                  <span>{t.count(count, es.services[service])}</span>
                </>
              ) : (
                <>
                  <CircleCheck size={24} aria-hidden="true" />{" "}
                  <span>{t.countNone(es.services[service])}</span>
                </>
              )}
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

      <section className="statement" aria-labelledby="barrios">
        <h2 id="barrios">
          <strong>{Object.keys(names).length}</strong> {t.statement}{" "}
          <span>{t.statementAfter}</span>
        </h2>
        <ul className="trust">
          {t.trust.map((item) => (
            <li key={item}>
              <Check size={20} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <Link href="/mapa" className="button">
          {t.seeMap}
        </Link>
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
