import {
  outageWindow,
  quitoDay,
  type CitySnapshot,
  type PublicOutage,
  type Service,
} from "@luz-y-agua/shared";

export type DayOutage = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  window: string;
  tier: PublicOutage["tier"];
  sourceLabel: string;
  notes: string | null;
};

export type BarrioDay = {
  barrioId: string;
  name: string;
  outages: DayOutage[];
};

export function toDayOutage(outage: PublicOutage, now: Date): DayOutage {
  return {
    id: outage.id,
    startsAt: outage.starts_at,
    endsAt: outage.ends_at,
    window: outageWindow(outage.starts_at, outage.ends_at, now),
    tier: outage.tier,
    sourceLabel: outage.source_label,
    notes: outage.notes,
  };
}

/** Whether an outage touches the given Quito day; open-ended ones run until now. */
export function onDay(outage: PublicOutage, day: string, now: Date): boolean {
  const start = quitoDay(new Date(outage.starts_at));
  const end = outage.ends_at
    ? quitoDay(new Date(outage.ends_at))
    : new Date(outage.starts_at) <= now
      ? quitoDay(now)
      : start;
  return start <= day && day <= end;
}

export function outagesToday(
  snapshot: CitySnapshot,
  service: Service,
  now: Date,
): PublicOutage[] {
  const day = quitoDay(now);
  return snapshot.outages
    .filter((o) => o.service === service && onDay(o, day, now))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** §9: today's list for one service, one entry per affected barrio, sorted by name. */
export function todayByBarrio(
  snapshot: CitySnapshot,
  names: Record<string, string>,
  service: Service,
  now: Date,
): BarrioDay[] {
  const byBarrio = new Map<string, DayOutage[]>();
  for (const outage of outagesToday(snapshot, service, now)) {
    const entry = toDayOutage(outage, now);
    for (const barrioId of outage.barrio_ids) {
      byBarrio.set(barrioId, [...(byBarrio.get(barrioId) ?? []), entry]);
    }
  }
  return [...byBarrio]
    .map(([barrioId, outages]) => ({
      barrioId,
      name: names[barrioId] ?? barrioId,
      outages,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
