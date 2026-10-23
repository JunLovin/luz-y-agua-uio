import type { Metadata } from "next";
import { es } from "@/i18n/es";
import { LegalPage } from "@/ui/legal-page";

export const metadata: Metadata = {
  title: es.legal.privacy.title,
  description: es.legal.privacy.description,
  alternates: { canonical: "/privacidad" },
};

export default function Page() {
  return <LegalPage text={es.legal.privacy} versioned />;
}
