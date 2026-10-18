import { es } from "@/i18n/es";

export default function Home() {
  return (
    <main>
      <h1>{es.appName}</h1>
      <p>{es.tagline}</p>
      <p>{es.independence}</p>
    </main>
  );
}
