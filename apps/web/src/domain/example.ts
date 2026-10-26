import type { CitySnapshot, PublicOutage, Service } from "@luz-y-agua/shared";

const HOUR = 3_600_000;

type Fake = {
  service: Service;
  tier: PublicOutage["tier"];
  barrios: string[];
  from: number;
  hours: number;
};

const FAKES: Fake[] = [
  {
    service: "luz",
    tier: "high",
    barrios: ["chimbacalle", "la_magdalena"],
    from: -1,
    hours: 3,
  },
  {
    service: "luz",
    tier: "high",
    barrios: ["inaquito", "cotocollao"],
    from: 3,
    hours: 4,
  },
  { service: "luz", tier: "medium", barrios: ["conocoto"], from: 5, hours: 2 },
  {
    service: "agua",
    tier: "high",
    barrios: ["solanda", "quitumbe"],
    from: -2,
    hours: 6,
  },
  { service: "agua", tier: "medium", barrios: ["cumbaya"], from: 4, hours: 3 },
];

/**
 * A made-up city for the "Ver un ejemplo" button when nothing is happening today.
 * Every outage carries the example label so it can never pass for a real one.
 */
export function exampleCity(now: Date, sourceLabel: string): CitySnapshot {
  const at = (hours: number) =>
    new Date(now.getTime() + hours * HOUR).toISOString();
  return {
    fetchedAt: now.toISOString(),
    outages: FAKES.map((fake, i) => ({
      id: `example-${i}`,
      service: fake.service,
      kind: "scheduled",
      zone_id: null,
      barrio_ids: fake.barrios,
      starts_at: at(fake.from),
      ends_at: at(fake.from + fake.hours),
      tier: fake.tier,
      source_label: sourceLabel,
      supersedes: null,
      notes: null,
    })),
    crowd: [
      { barrio_id: "la_ferroviaria", service: "luz", reports: 7 },
      { barrio_id: "carcelen", service: "agua", reports: 5 },
    ],
  };
}
