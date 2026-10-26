import type { Metadata } from "next";
import { es } from "@/i18n/es";
import { LegalPage } from "@/ui/legal-page";

export const metadata: Metadata = {
  title: es.legal.terms.title,
  description: es.legal.terms.description,
  alternates: { canonical: "/terminos" },
};

export default function Page() {
  return <LegalPage text={es.legal.terms} />;
}
