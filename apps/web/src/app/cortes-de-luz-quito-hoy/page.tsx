import type { Metadata } from "next";
import { es } from "@/i18n/es";
import { TodayPage } from "@/ui/today-page";

export const metadata: Metadata = {
  title: es.today.title(es.services.luz),
  description: es.today.description(es.services.luz),
  alternates: { canonical: "/cortes-de-luz-quito-hoy" },
};

export default function Page() {
  return <TodayPage service="luz" />;
}
