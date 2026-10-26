import { describe, expect, it } from "vitest";
import {
  placeAlerts,
  statusFor,
  type CitySnapshot,
  type PublicOutage,
} from "./city";

const outage = (
  id: string,
  overrides: Partial<PublicOutage> = {},
): PublicOutage => ({
  id,
  service: "luz",
  kind: "scheduled",
  zone_id: null,
  barrio_ids: ["solanda"],
  starts_at: "2026-10-21T14:00:00Z",
  ends_at: "2026-10-21T18:00:00Z",
  tier: "high",
  source_label: "EEQ",
  supersedes: null,
  notes: null,
  ...overrides,
});

const snapshot: CitySnapshot = {
  fetchedAt: "2026-10-20T15:00:00Z",
  outages: [
    outage("late", {
      starts_at: "2026-10-22T14:00:00Z",
      ends_at: "2026-10-22T18:00:00Z",
    }),
    outage("early"),
    outage("other-barrio", { barrio_ids: ["quitumbe"] }),
    outage("ended", {
      starts_at: "2026-10-20T08:00:00Z",
      ends_at: "2026-10-20T10:00:00Z",
    }),
    outage("open-ended", {
      kind: "unscheduled",
      starts_at: "2026-10-20T12:00:00Z",
      ends_at: null,
    }),
  ],
  crowd: [
    { barrio_id: "solanda", service: "agua", reports: 5 },
    { barrio_id: "quitumbe", service: "luz", reports: 10 },
  ],
};

describe("statusFor", () => {
  const now = new Date("2026-10-20T15:00:00Z");

  it("keeps only the barrio's current and upcoming outages, earliest first", () => {
    expect(
      statusFor(snapshot, "solanda", now).outages.map((o) => o.id),
    ).toEqual(["open-ended", "early", "late"]);
  });

  it("keeps only the barrio's neighbor reports", () => {
    expect(statusFor(snapshot, "solanda", now).crowd).toEqual([
      { barrio_id: "solanda", service: "agua", reports: 5 },
    ]);
  });

  it("is empty for a barrio with nothing going on", () => {
    expect(statusFor(snapshot, "cumbaya", now)).toEqual({
      outages: [],
      crowd: [],
    });
  });
});

describe("placeAlerts", () => {
  const now = new Date("2026-10-20T15:00:00Z");

  it("summarizes each service: neighbor reports win, then an ongoing cut, then the next one", () => {
    expect(placeAlerts(snapshot, "solanda", now)).toEqual([
      {
        kind: "ongoing",
        service: "luz",
        outage: expect.objectContaining({ id: "open-ended" }),
      },
      { kind: "crowd", service: "agua", reports: 5 },
    ]);
  });

  it("announces the next scheduled cut when nothing is happening yet", () => {
    const later = {
      ...snapshot,
      crowd: [],
      outages: snapshot.outages.filter((o) => o.id !== "open-ended"),
    };
    expect(placeAlerts(later, "solanda", now)).toEqual([
      {
        kind: "scheduled",
        service: "luz",
        outage: expect.objectContaining({ id: "early" }),
      },
    ]);
  });

  it("is empty for a quiet barrio", () => {
    expect(placeAlerts(snapshot, "cumbaya", now)).toEqual([]);
  });
});
