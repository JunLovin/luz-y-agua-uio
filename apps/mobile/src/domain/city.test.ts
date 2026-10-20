import { describe, expect, it } from "vitest";
import { statusFor, type CitySnapshot, type PublicOutage } from "./city";

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
