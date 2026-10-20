import { describe, expect, it } from "vitest";
import {
  isQuietHour,
  outageWindow,
  planNotifications,
  type NotifiableOutage,
} from "./notifications.ts";

// 10:00 in Quito (UTC-5).
const NOW = new Date("2026-10-20T15:00:00Z");
const names = {
  barrios: { chimbacalle: "Chimbacalle", solanda: "Solanda" },
  zones: { eeq_sur: "Sur" },
};

const outage = (over: Partial<NotifiableOutage> = {}): NotifiableOutage => ({
  id: "o1",
  service: "luz",
  tier: "high",
  zoneId: null,
  barrioIds: ["chimbacalle"],
  startsAt: "2026-10-21T14:00:00Z",
  endsAt: "2026-10-21T17:00:00Z",
  createdAt: "2026-10-20T14:00:00Z",
  supersedes: null,
  sourceLabel: "cronograma EEQ",
  ...over,
});

const plan = (
  outages: NotifiableOutage[],
  extra: Partial<Parameters<typeof planNotifications>[0]> = {},
) =>
  planNotifications({
    outages,
    crowd: [],
    sent: [],
    names,
    now: NOW,
    ...extra,
  });

describe("isQuietHour", () => {
  it.each([
    ["2026-10-21T02:59:00Z", false],
    ["2026-10-21T03:00:00Z", true],
    ["2026-10-21T10:59:00Z", true],
    ["2026-10-21T11:00:00Z", false],
  ])("%s → %s", (iso, quiet) => {
    expect(isQuietHour(new Date(iso))).toBe(quiet);
  });
});

describe("outageWindow", () => {
  it("names today, tomorrow and later days in Quito time", () => {
    expect(outageWindow("2026-10-20T19:00:00Z", null, NOW)).toBe(
      "hoy desde las 14:00",
    );
    expect(
      outageWindow("2026-10-21T14:00:00Z", "2026-10-21T17:00:00Z", NOW),
    ).toBe("mañana de 09:00 a 12:00");
    expect(outageWindow("2026-10-23T14:00:00Z", null, NOW)).toMatch(
      /^el .*23.* desde las 09:00$/,
    );
  });

  it("uses the Quito date, not UTC, near midnight", () => {
    const lateNight = new Date("2026-10-21T04:30:00Z"); // 23:30 on the 20th in Quito
    expect(outageWindow("2026-10-21T14:00:00Z", null, lateNight)).toBe(
      "mañana desde las 09:00",
    );
  });
});

describe("planNotifications", () => {
  it("sends heads_up for a high outage announced more than 2 h ahead", () => {
    const [n, ...rest] = plan([outage()]);
    expect(rest).toEqual([]);
    expect(n).toMatchObject({
      kind: "heads_up",
      topic: "v1_luz_b_chimbacalle",
      condition: "'v1_luz_b_chimbacalle' in topics",
      outageId: "o1",
      data: {
        service: "luz",
        outageId: "o1",
        kind: "heads_up",
        barrioId: "chimbacalle",
      },
    });
    expect(n?.body).toBe(
      "Mañana de 09:00 a 12:00: corte de luz programado en Chimbacalle. Fuente: cronograma EEQ.",
    );
  });

  it("only announces high outages", () => {
    expect(plan([outage({ tier: "medium" })])).toEqual([]);
  });

  it("skips heads_up when published less than 2 h before the start", () => {
    expect(
      plan([
        outage({
          startsAt: "2026-10-20T16:30:00Z",
          createdAt: "2026-10-20T15:00:00Z",
        }),
      ]),
    ).toEqual([]);
  });

  it("holds heads_up during quiet hours and sends it at 06:00", () => {
    const o = outage({ createdAt: "2026-10-21T03:30:00Z" });
    expect(plan([o], { now: new Date("2026-10-21T04:00:00Z") })).toEqual([]);
    expect(
      plan([o], { now: new Date("2026-10-21T11:00:00Z") }).map((n) => n.kind),
    ).toEqual(["heads_up"]);
  });

  it("sends imminent in the last 30 minutes, also during quiet hours", () => {
    const o = outage({ startsAt: "2026-10-21T04:00:00Z", endsAt: null });
    const [n] = plan([o], { now: new Date("2026-10-21T03:35:00Z") });
    expect(n).toMatchObject({
      kind: "imminent",
      title: "Corte de luz en 25 min",
    });
    expect(n?.body).toBe(
      "En 25 min empieza el corte de luz en Chimbacalle (hoy desde las 23:00).",
    );
    expect(plan([o], { now: new Date("2026-10-21T04:00:00Z") })).toEqual([]);
  });

  it("never sends the same (topic, outage, kind) twice", () => {
    expect(
      plan([outage()], {
        sent: [
          { topic: "v1_luz_b_chimbacalle", outageId: "o1", kind: "heads_up" },
        ],
      }),
    ).toEqual([]);
  });

  it("sends one push per device for barrio and EEQ zone topics", () => {
    const sent = plan([
      outage({ zoneId: "eeq_sur", barrioIds: ["chimbacalle", "solanda"] }),
    ]);
    expect(sent.map((n) => [n.topic, n.condition])).toEqual([
      [
        "v1_luz_b_chimbacalle",
        "'v1_luz_b_chimbacalle' in topics && !('v1_luz_z_eeq_sur' in topics)",
      ],
      [
        "v1_luz_b_solanda",
        "'v1_luz_b_solanda' in topics && !('v1_luz_z_eeq_sur' in topics)",
      ],
      ["v1_luz_z_eeq_sur", "'v1_luz_z_eeq_sur' in topics"],
    ]);
    expect(sent[2]?.body).toContain("en el sector Sur");
    expect(sent[2]?.data).toMatchObject({ zoneId: "eeq_sur" });
  });

  it("agua outages ignore the EEQ zone", () => {
    expect(
      plan([outage({ service: "agua", zoneId: "epmaps_x" })]).map(
        (n) => n.topic,
      ),
    ).toEqual(["v1_agua_b_chimbacalle"]);
  });

  it("corrects a notified outage instead of announcing the new one", () => {
    const old = outage();
    const fix = outage({
      id: "o2",
      supersedes: "o1",
      barrioIds: ["solanda"],
      startsAt: "2026-10-21T19:00:00Z",
      endsAt: "2026-10-21T22:00:00Z",
    });
    const sent = plan([old, fix], {
      sent: [
        { topic: "v1_luz_b_chimbacalle", outageId: "o1", kind: "heads_up" },
      ],
    });
    expect(sent.map((n) => [n.kind, n.topic, n.outageId])).toEqual([
      ["correction", "v1_luz_b_solanda", "o2"],
      ["correction", "v1_luz_b_chimbacalle", "o2"],
    ]);
    expect(sent[1]?.body).toBe(
      "Cambio: el corte de luz en Chimbacalle ahora es mañana de 14:00 a 17:00.",
    );
  });

  it("does not correct an outage whose new window already ended", () => {
    const fix = outage({
      id: "o2",
      supersedes: "o1",
      startsAt: "2026-10-20T10:00:00Z",
      endsAt: "2026-10-20T12:00:00Z",
    });
    expect(
      plan([outage(), fix], {
        sent: [
          { topic: "v1_luz_b_chimbacalle", outageId: "o1", kind: "heads_up" },
        ],
      }),
    ).toEqual([]);
  });

  it("treats a replacement of a never-notified outage as a new announcement", () => {
    const fix = outage({ id: "o2", supersedes: "o1" });
    expect(plan([outage(), fix]).map((n) => [n.kind, n.outageId])).toEqual([
      ["heads_up", "o2"],
    ]);
  });

  it("stays silent about an outage replaced by a visible correction", () => {
    const fix = outage({ id: "o2", supersedes: "o1", tier: "medium" });
    expect(plan([outage(), fix])).toEqual([]);
  });

  it("announces neighbor reports once per episode", () => {
    const crowd = [{ id: "c1", barrioId: "solanda", service: "agua" as const }];
    const [n] = plan([], { crowd });
    expect(n).toMatchObject({
      kind: "crowd",
      topic: "v1_agua_b_solanda",
      outageId: "c1",
      body: "Vecinos de Solanda reportan corte de agua. No estaba programado.",
    });
    expect(
      plan([], {
        crowd,
        sent: [{ topic: "v1_agua_b_solanda", outageId: "c1", kind: "crowd" }],
      }),
    ).toEqual([]);
  });
});
