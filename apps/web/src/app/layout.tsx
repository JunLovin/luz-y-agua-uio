import { config } from "@luz-y-agua/shared";
import { Droplet, Map as MapIcon, Zap } from "lucide-react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { es } from "@/i18n/es";
import { siteUrl } from "@/server/site-url";
import { BrandMark } from "@/ui/brand-mark";
import { ThemeSwitch, themeScript } from "@/ui/theme-switch";
import "./globals.css";

// Served from our own domain: no font request ever leaves for a third party.
const atkinson = localFont({
  src: [
    { path: "../fonts/AtkinsonHyperlegibleNext_400Regular.ttf", weight: "400" },
    { path: "../fonts/AtkinsonHyperlegibleNext_700Bold.ttf", weight: "700" },
    {
      path: "../fonts/AtkinsonHyperlegibleNext_800ExtraBold.ttf",
      weight: "800",
    },
  ],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: es.appName, template: `%s · ${es.appName}` },
  description: es.tagline,
  openGraph: { siteName: es.appName, locale: "es_EC", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const t = es.layout;
  return (
    <html lang="es-EC" className={atkinson.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#contenido">
          {t.skip}
        </a>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              <BrandMark />
              {es.appName}
            </Link>
            <nav aria-label={t.navToday} className="nav">
              <Link
                href="/cortes-de-luz-quito-hoy"
                className="nav-link tone-luz"
              >
                <Zap
                  size={18}
                  aria-hidden="true"
                  style={{ color: "var(--tone)" }}
                />
                {t.nav.luz}
              </Link>
              <Link
                href="/cortes-de-agua-quito-hoy"
                className="nav-link tone-agua"
              >
                <Droplet
                  size={18}
                  aria-hidden="true"
                  style={{ color: "var(--tone)" }}
                />
                {t.nav.agua}
              </Link>
              <Link href="/mapa" className="nav-link tone-crowd">
                <MapIcon
                  size={18}
                  aria-hidden="true"
                  style={{ color: "var(--tone)" }}
                />
                {t.nav.map}
              </Link>
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
            <nav aria-label={t.navLegal}>
              <Link href="/privacidad">{t.legal.privacy}</Link>
              <Link href="/terminos">{t.legal.terms}</Link>
              <Link href="/acerca">{t.legal.about}</Link>
              <a href={config.legal.sourceCodeUrl}>{t.sourceCode}</a>
            </nav>
            <ThemeSwitch />
          </div>
        </footer>
      </body>
    </html>
  );
}
