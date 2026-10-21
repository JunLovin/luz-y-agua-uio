import type { Service } from "./topics.ts";

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

/** The whole city as read from the public views. Phones filter it locally (CLAUDE.md rule 12). */
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
