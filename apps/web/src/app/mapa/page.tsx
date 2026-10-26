import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { es } from "@/i18n/es";
import { getCity, getMapSources } from "@/server/city";
import { LiveMap } from "@/ui/live-map/live-map";

export const metadata: Metadata = {
  title: es.map.title,
  description: es.map.description,
  alternates: { canonical: "/mapa" },
};

export default async function MapPage() {
  "use cache";
  cacheLife("city");
  const [city, sources] = await Promise.all([getCity(), getMapSources()]);
  return (
    <LiveMap
      city={city}
      sources={sources}
      variant="page"
      intro={
        <>
          <h1>{es.map.title}</h1>
          <p className="lead">{es.home.tapHint}</p>
        </>
      }
    />
  );
}
