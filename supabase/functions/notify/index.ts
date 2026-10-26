import {
  config,
  mapInBatches,
  planNotifications,
  type NotifiableOutage,
  type SentNotification,
} from "@luz-y-agua/shared";
import { createClient } from "@supabase/supabase-js";
import { fcmSender } from "./fcm.ts";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(env("SUPABASE_URL"), serviceKey, {
  auth: { persistSession: false },
});
const projectId = env("FCM_PROJECT_ID");
const account = JSON.parse(atob(env("FCM_SERVICE_ACCOUNT_B64")));

const OUTAGE_COLUMNS =
  "id, service, tier, zoneId:zone_id, barrioIds:barrio_ids, startsAt:starts_at, endsAt:ends_at, createdAt:created_at, supersedes, sourceLabel:source_label";

function rows<T>({ data, error }: { data: T[] | null; error: unknown }): T[] {
  if (error) throw error;
  return data ?? [];
}

async function loadInputs(now: Date) {
  const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const recent = rows<NotifiableOutage>(
    await db
      .from("outages")
      .select(OUTAGE_COLUMNS)
      .in("tier", ["high", "medium"])
      .gt("starts_at", since),
  );
  const missing = [
    ...new Set(recent.flatMap((o) => (o.supersedes ? [o.supersedes] : []))),
  ].filter((id) => !recent.some((o) => o.id === id));
  const outages = missing.length
    ? [
        ...recent,
        ...rows<NotifiableOutage>(
          await db.from("outages").select(OUTAGE_COLUMNS).in("id", missing),
        ),
      ]
    : recent;
  const crowd = rows<{ id: string; barrioId: string; service: "luz" | "agua" }>(
    await db
      .from("crowd_outages")
      .select("id, barrioId:barrio_id, service")
      .is("ended_at", null)
      .is("matched_outage_id", null),
  );

  const ids = [...outages.map((o) => o.id), ...crowd.map((c) => c.id)];
  const barrioIds = [
    ...new Set([
      ...outages.flatMap((o) => o.barrioIds),
      ...crowd.map((c) => c.barrioId),
    ]),
  ];
  const zoneIds = [
    ...new Set(outages.flatMap((o) => (o.zoneId ? [o.zoneId] : []))),
  ];
  const [sent, barrios, zones] = await Promise.all([
    db
      .from("notifications_log")
      .select("topic, outageId:outage_id, kind")
      .in("outage_id", ids),
    db.from("barrios").select("id, name").in("id", barrioIds),
    db.from("utility_zones").select("id, name").in("id", zoneIds),
  ]);
  const byId = (list: { id: string; name: string }[]) =>
    Object.fromEntries(list.map((x) => [x.id, x.name]));
  return {
    outages,
    crowd,
    sent: rows<SentNotification>(sent),
    names: { barrios: byId(rows(barrios)), zones: byId(rows(zones)) },
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return json({ error: "forbidden" }, 403);
  }
  try {
    const now = new Date();
    const plan = planNotifications({ ...(await loadInputs(now)), now });
    const send = fcmSender(projectId, account);
    const outcomes = await mapInBatches(
      plan,
      config.notifications.sendConcurrency,
      async (notification) => {
        const claim = await db
          .from("notifications_log")
          .insert({
            topic: notification.topic,
            outage_id: notification.outageId,
            kind: notification.kind,
          })
          .select("id")
          .single();
        // 23505: another run already claimed it.
        if (claim.error?.code === "23505") return "skipped";
        if (claim.error) throw claim.error;
        try {
          await send(notification);
          return "sent";
        } catch (error) {
          console.error(
            `notify ${notification.kind} failed:`,
            error instanceof Error ? error.message : error,
          );
          await db.from("notifications_log").delete().eq("id", claim.data.id);
          return "failed";
        }
      },
    );
    const sent = outcomes.filter((o) => o === "sent").length;
    const failed = outcomes.filter((o) => o === "failed").length;
    return json({ sent, failed });
  } catch (error) {
    console.error(
      "notify failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "notify_failed" }, 502);
  }
});
