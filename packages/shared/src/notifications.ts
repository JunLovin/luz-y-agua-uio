import { config } from "./config.ts";
import { topicFor, type Service } from "./topics.ts";

export type NotificationKind = "heads_up" | "imminent" | "correction" | "crowd";

export type NotifiableOutage = {
  id: string;
  service: Service;
  tier: "high" | "medium" | "low";
  zoneId: string | null;
  barrioIds: string[];
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  supersedes: string | null;
  sourceLabel: string;
};

export type CrowdEpisode = { id: string; barrioId: string; service: Service };

/** A row of notifications_log: who was told what, never which device. */
export type SentNotification = {
  topic: string;
  outageId: string;
  kind: NotificationKind;
};

export type Notification = SentNotification & {
  /** FCM condition, so a phone subscribed to both its barrio and its EEQ zone gets one push. */
  condition: string;
  title: string;
  body: string;
  data: { service: Service; outageId: string; kind: NotificationKind } & (
    { barrioId: string } | { zoneId: string }
  );
};

type Target = {
  topic: string;
  condition: string;
  place: string;
  scope: { barrioId: string } | { zoneId: string };
};

type Names = {
  barrios: Record<string, string>;
  zones: Record<string, string>;
};

const { headsUpMinLeadMs, imminentLeadMs, quietHours } = config.notifications;
const TIME_ZONE = quietHours.timeZone;

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});
const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat("es-EC", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayFormat = new Intl.DateTimeFormat("es-EC", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function isQuietHour(now: Date): boolean {
  const hour = Number(hourFormat.format(now));
  return quietHours.startHour > quietHours.endHour
    ? hour >= quietHours.startHour || hour < quietHours.endHour
    : hour >= quietHours.startHour && hour < quietHours.endHour;
}

/** "mañana de 09:00 a 12:00", "hoy desde las 14:00", "el mar, 21 oct de 09:00 a 12:00". */
export function outageWindow(
  startsAt: string,
  endsAt: string | null,
  now: Date,
): string {
  const start = new Date(startsAt);
  const days = Math.round(
    (Date.parse(dateKey.format(start)) - Date.parse(dateKey.format(now))) /
      86_400_000,
  );
  const day =
    days === 0
      ? "hoy"
      : days === 1
        ? "mañana"
        : `el ${dayFormat.format(start)}`;
  return endsAt
    ? `${day} de ${timeFormat.format(start)} a ${timeFormat.format(new Date(endsAt))}`
    : `${day} desde las ${timeFormat.format(start)}`;
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
const inTopics = (topic: string) => `'${topic}' in topics`;

function targets(outage: NotifiableOutage, names: Names): Target[] {
  const zoneTopic =
    outage.service === "luz" && outage.zoneId
      ? topicFor("luz", "z", outage.zoneId)
      : null;
  const barrios: Target[] = outage.barrioIds.map((barrioId) => {
    const topic = topicFor(outage.service, "b", barrioId);
    return {
      topic,
      condition: zoneTopic
        ? `${inTopics(topic)} && !(${inTopics(zoneTopic)})`
        : inTopics(topic),
      place: names.barrios[barrioId] ?? barrioId,
      scope: { barrioId },
    };
  });
  if (!zoneTopic || !outage.zoneId) return barrios;
  const zoneName = names.zones[outage.zoneId] ?? outage.zoneId;
  return [
    ...barrios,
    {
      topic: zoneTopic,
      condition: inTopics(zoneTopic),
      place: `el sector ${zoneName}`,
      scope: { zoneId: outage.zoneId },
    },
  ];
}

function message(
  kind: NotificationKind,
  outageId: string,
  service: Service,
  target: Target,
  title: string,
  body: string,
): Notification {
  return {
    topic: target.topic,
    outageId,
    kind,
    condition: target.condition,
    title,
    body,
    data: { service, outageId, kind, ...target.scope },
  };
}

/** Runs `fn` over `items` with at most `size` calls in flight, keeping the input order. */
export async function mapInBatches<T, R>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

/**
 * SPEC §6: which pushes are due now. Only `high` outages are announced; an outage replaced
 * by a visible correction is silent; `heads_up` waits out the quiet hours.
 */
export function planNotifications({
  outages,
  crowd,
  sent,
  names,
  now,
}: {
  outages: NotifiableOutage[];
  crowd: CrowdEpisode[];
  sent: SentNotification[];
  names: Names;
  now: Date;
}): Notification[] {
  const key = (n: SentNotification) => `${n.topic}|${n.outageId}|${n.kind}`;
  const done = new Set(sent.map(key));
  const byId = new Map(outages.map((o) => [o.id, o]));
  const replaced = new Set(
    outages
      .filter((o) => o.tier !== "low" && o.supersedes)
      .map((o) => o.supersedes),
  );
  const nowMs = now.getTime();
  const plan: Notification[] = [];

  for (const outage of outages) {
    if (outage.tier !== "high" || replaced.has(outage.id)) continue;
    const startMs = Date.parse(outage.startsAt);
    const service = outage.service;
    const window = outageWindow(outage.startsAt, outage.endsAt, now);
    const own = targets(outage, names);
    const previous = outage.supersedes
      ? byId.get(outage.supersedes)
      : undefined;
    const previousTopics = new Set(
      sent
        .filter((s) => s.outageId === outage.supersedes && s.kind !== "crowd")
        .map((s) => s.topic),
    );

    const over = Date.parse(outage.endsAt ?? outage.startsAt) <= nowMs;
    if (previous && previousTopics.size > 0) {
      if (over) continue;
      const ownTopics = new Set(own.map((t) => t.topic));
      const affected = [
        ...own,
        ...targets(previous, names).filter(
          (t) => previousTopics.has(t.topic) && !ownTopics.has(t.topic),
        ),
      ];
      for (const target of affected) {
        plan.push(
          message(
            "correction",
            outage.id,
            service,
            target,
            `Cambio en el corte de ${service}`,
            `Cambio: el corte de ${service} en ${target.place} ahora es ${window}.`,
          ),
        );
      }
    } else if (
      startMs - Date.parse(outage.createdAt) >= headsUpMinLeadMs &&
      nowMs < startMs - imminentLeadMs &&
      !isQuietHour(now)
    ) {
      for (const target of own) {
        plan.push(
          message(
            "heads_up",
            outage.id,
            service,
            target,
            `Corte de ${service} programado`,
            `${capitalize(window)}: corte de ${service} programado en ${target.place}. Fuente: ${outage.sourceLabel}.`,
          ),
        );
      }
    }

    if (nowMs >= startMs - imminentLeadMs && nowMs < startMs) {
      const minutes = Math.max(1, Math.round((startMs - nowMs) / 60_000));
      for (const target of own) {
        plan.push(
          message(
            "imminent",
            outage.id,
            service,
            target,
            `Corte de ${service} en ${minutes} min`,
            `En ${minutes} min empieza el corte de ${service} en ${target.place} (${window}).`,
          ),
        );
      }
    }
  }

  for (const episode of crowd) {
    const topic = topicFor(episode.service, "b", episode.barrioId);
    const place = names.barrios[episode.barrioId] ?? episode.barrioId;
    plan.push(
      message(
        "crowd",
        episode.id,
        episode.service,
        {
          topic,
          condition: inTopics(topic),
          place,
          scope: { barrioId: episode.barrioId },
        },
        `Vecinos reportan corte de ${episode.service}`,
        `Vecinos de ${place} reportan corte de ${episode.service}. No estaba programado.`,
      ),
    );
  }

  return plan.filter((n) => !done.has(key(n)));
}
