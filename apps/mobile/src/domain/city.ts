import type { Service } from "@luz-y-agua/shared";

export type PublicOutage = {
  id: string;
  service: Service;
  kind: "scheduled" | "unscheduled";
  zone_id: string | null;
  barrio_ids: string[];
  starts_at: string;
  ends_at: string | null;
  tier: "high" | "medium";
  source_label: string;
  supersedes: string | null;
  notes: string | null;
};

export type CrowdLive = {
  barrio_id: string;
  service: Service;
  reports: number;
};

/** The whole city as downloaded from the public views. Filtering happens only on the phone. */
export type CitySnapshot = {
  outages: PublicOutage[];
  crowd: CrowdLive[];
  fetchedAt: string;
};

export type BarrioStatus = {
  outages: PublicOutage[];
  crowd: CrowdLive[];
};

/** Outages and neighbor reports for one barrio, upcoming first, ended ones dropped. */
export function statusFor(
  snapshot: CitySnapshot,
  barrioId: string,
  now: Date,
): BarrioStatus {
  const outages = snapshot.outages
    .filter(
      (o) =>
        o.barrio_ids.includes(barrioId) &&
        (o.ends_at === null || new Date(o.ends_at) > now),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return {
    outages,
    crowd: snapshot.crowd.filter((c) => c.barrio_id === barrioId),
  };
}

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
