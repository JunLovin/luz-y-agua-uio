import type { MetadataRoute } from "next";
import { getBarrioNames } from "@/server/city";
import { siteUrl } from "@/server/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = ["/cortes-de-luz-quito-hoy", "/cortes-de-agua-quito-hoy"];
  const barrios = Object.keys(await getBarrioNames()).map(
    (id) => `/barrio/${id}`,
  );
  return [
    { url: `${siteUrl}/`, changeFrequency: "hourly", priority: 1 },
    ...today.map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
    ...barrios.map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "hourly" as const,
      priority: 0.5,
    })),
  ];
}
