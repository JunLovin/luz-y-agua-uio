import type { Metadata } from "next";
import { es } from "@/i18n/es";
import { TodayPage } from "@/ui/today-page";

export const metadata: Metadata = {
  title: es.today.title(es.services.agua),
  description: es.today.description(es.services.agua),
  alternates: { canonical: "/cortes-de-agua-quito-hoy" },
};

export default function Page() {
  return <TodayPage service="agua" />;
}
