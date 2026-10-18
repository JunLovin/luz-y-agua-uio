import type { Metadata } from "next";
import { es } from "@/i18n/es";
import "./globals.css";

export const metadata: Metadata = {
  title: es.appName,
  description: es.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-EC">
      <body>{children}</body>
    </html>
  );
}
