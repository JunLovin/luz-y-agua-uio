import type { Metadata } from "next";
import { es } from "@/i18n/es";
import { LegalPage } from "@/ui/legal-page";

export const metadata: Metadata = {
  title: es.layout.legal.about,
  description: es.legal.about.description,
  alternates: { canonical: "/acerca" },
};

export default function Page() {
  return <LegalPage text={es.legal.about} />;
}
