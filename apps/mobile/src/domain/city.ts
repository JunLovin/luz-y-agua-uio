import {
  statusFor,
  type CitySnapshot,
  type PublicOutage,
  type Service,
} from "@luz-y-agua/shared";

export {
  statusFor,
  type BarrioStatus,
  type CitySnapshot,
  type CrowdLive,
  type PublicOutage,
} from "@luz-y-agua/shared";

export type PlaceAlert =
  | { kind: "crowd"; service: Service; reports: number }
  | { kind: "ongoing"; service: Service; outage: PublicOutage }
  | { kind: "scheduled"; service: Service; outage: PublicOutage };

/** One line per service for "Mis lugares": neighbor reports first, then an ongoing cut, then the next one. */
export function placeAlerts(
  snapshot: CitySnapshot,
  barrioId: string,
  now: Date,
): PlaceAlert[] {
  const { outages, crowd } = statusFor(snapshot, barrioId, now);
  return (["luz", "agua"] as const).flatMap((service): PlaceAlert[] => {
    const reports = crowd.find((c) => c.service === service);
    if (reports) return [{ kind: "crowd", service, reports: reports.reports }];
    const next = outages.find((o) => o.service === service);
    if (!next) return [];
    return [
      {
        kind: new Date(next.starts_at) <= now ? "ongoing" : "scheduled",
        service,
        outage: next,
      },
    ];
  });
}
