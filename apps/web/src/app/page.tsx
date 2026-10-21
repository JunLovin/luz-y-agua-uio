import { cacheLife } from "next/cache";
import Link from "next/link";
import { outagesToday } from "@/domain/today";
import { es } from "@/i18n/es";
import { formatLongDate } from "@/i18n/format";
import { getCity } from "@/server/city";

export default async function Home() {
  "use cache";
  cacheLife("city");
  const city = await getCity();
  const now = new Date();
  const crowdBarrios = new Set(city.crowd.map((c) => c.barrio_id)).size;
  const t = es.home;

  return (
    <>
      <h1>{es.appName}</h1>
      <p>{es.tagline}</p>
      <section className="card" aria-labelledby="hoy">
        <h2 id="hoy">{es.today.date(formatLongDate(now))}</h2>
        <p>
          {t.summary(
            outagesToday(city, "luz", now).length,
            outagesToday(city, "agua", now).length,
          )}
        </p>
        {crowdBarrios > 0 && <p>{t.crowd(crowdBarrios)}</p>}
        <p>
          <Link href="/cortes-de-luz-quito-hoy">{t.seeLuz}</Link>
        </p>
        <p>
          <Link href="/cortes-de-agua-quito-hoy">{t.seeAgua}</Link>
        </p>
      </section>
      <section className="card" aria-labelledby="app">
        <h2 id="app">{t.appTitle}</h2>
        <p>{t.appBody}</p>
        <p>
          <strong>{t.soon}</strong>
        </p>
      </section>
    </>
  );
}
