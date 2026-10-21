import type { Metadata } from "next";
import Link from "next/link";
import { es } from "@/i18n/es";
import { siteUrl } from "@/server/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: es.appName, template: `%s · ${es.appName}` },
  description: es.tagline,
  openGraph: { siteName: es.appName, locale: "es_EC", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const t = es.layout;
  return (
    <html lang="es-EC">
      <body>
        <a className="skip-link" href="#contenido">
          {t.skip}
        </a>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              {es.appName}
            </Link>
            <nav aria-label={es.appName}>
              <Link href="/cortes-de-luz-quito-hoy">{t.nav.luz}</Link>
              <Link href="/cortes-de-agua-quito-hoy">{t.nav.agua}</Link>
            </nav>
          </div>
        </header>
        <main id="contenido" className="container">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container">
            <p>
              <strong>{es.independence}</strong>
            </p>
            <p className="muted">{t.sources}</p>
            <nav aria-label={t.legal.about}>
              <Link href="/privacidad">{t.legal.privacy}</Link>
              <Link href="/terminos">{t.legal.terms}</Link>
              <Link href="/acerca">{t.legal.about}</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
