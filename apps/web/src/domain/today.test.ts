import type { CitySnapshot, PublicOutage } from "@luz-y-agua/shared";
import { describe, expect, it } from "vitest";
import { onDay, outagesToday, todayByBarrio } from "./today";

// 10:00 on 21 Oct in Quito.
const NOW = new Date("2026-10-21T15:00:00Z");

const outage = (over: Partial<PublicOutage>): PublicOutage => ({
  id: "o",
  service: "luz",
  kind: "scheduled",
  zone_id: null,
  barrio_ids: ["solanda"],
  starts_at: "2026-10-21T14:00:00Z",
  ends_at: "2026-10-21T17:00:00Z",
  tier: "high",
  source_label: "Cronograma EEQ",
  supersedes: null,
  notes: null,
  ...over,
});

const snapshot = (outages: PublicOutage[]): CitySnapshot => ({
  outages,
  crowd: [],
  fetchedAt: NOW.toISOString(),
});

describe("onDay", () => {
  it("uses Quito days at both ends", () => {
    const lateNight = outage({
      starts_at: "2026-10-22T03:00:00Z", // 22:00 on the 21st in Quito
      ends_at: "2026-10-22T07:00:00Z", // 02:00 on the 22nd
    });
    expect(onDay(lateNight, "2026-10-21", NOW)).toBe(true);
    expect(onDay(lateNight, "2026-10-22", NOW)).toBe(true);
    expect(onDay(lateNight, "2026-10-20", NOW)).toBe(false);
  });

  it("keeps an open-ended outage that already started on today's list", () => {
    const open = outage({ starts_at: "2026-10-20T20:00:00Z", ends_at: null });
    expect(onDay(open, "2026-10-21", NOW)).toBe(true);
  });
});

describe("todayByBarrio", () => {
  it("groups today's outages of one service by barrio name", () => {
    const result = todayByBarrio(
      snapshot([
        outage({ id: "a", barrio_ids: ["solanda", "chimbacalle"] }),
        outage({ id: "b", service: "agua" }),
        outage({ id: "c", starts_at: "2026-10-23T14:00:00Z", ends_at: null }),
      ]),
      { solanda: "Solanda", chimbacalle: "Chimbacalle" },
      "luz",
      NOW,
    );
    expect(result.map((b) => [b.name, b.outages.map((o) => o.id)])).toEqual([
      ["Chimbacalle", ["a"]],
      ["Solanda", ["a"]],
    ]);
    expect(result[0]?.outages[0]?.window).toBe("hoy de 09:00 a 12:00");
  });

  it("counts distinct outages, not barrios", () => {
    expect(
      outagesToday(
        snapshot([outage({ barrio_ids: ["a", "b", "c"] })]),
        "luz",
        NOW,
      ),
    ).toHaveLength(1);
  });
});
