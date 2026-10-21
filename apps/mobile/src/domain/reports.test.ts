import { describe, expect, it } from "vitest";
import { EMPTY_STATE } from "./local-state";
import { cooldownLeftMs, nonceFor, recordReport } from "./reports";

const at = (iso: string) => new Date(iso);

describe("nonceFor", () => {
  it("keeps one nonce per Quito day", () => {
    let n = 0;
    const make = () => `nonce-${++n}`;
    const first = nonceFor(EMPTY_STATE, at("2026-10-21T15:00:00Z"), make);
    const same = nonceFor(first.state, at("2026-10-22T04:59:00Z"), make);
    const next = nonceFor(same.state, at("2026-10-22T05:00:00Z"), make);
    expect([first.nonce, same.nonce, next.nonce]).toEqual([
      "nonce-1",
      "nonce-1",
      "nonce-2",
    ]);
    expect(next.state.reportNonce).toEqual({
      date: "2026-10-22",
      value: "nonce-2",
    });
  });
});

describe("report cooldown", () => {
  const now = at("2026-10-21T15:00:00Z");
  const reported = recordReport(EMPTY_STATE, "solanda", "luz", now);

  it("waits 15 minutes per barrio and service", () => {
    expect(
      cooldownLeftMs(reported, "solanda", "luz", at("2026-10-21T15:10:00Z")),
    ).toBe(5 * 60_000);
    expect(
      cooldownLeftMs(reported, "solanda", "luz", at("2026-10-21T15:15:00Z")),
    ).toBe(0);
    expect(cooldownLeftMs(reported, "solanda", "agua", now)).toBe(0);
    expect(cooldownLeftMs(reported, "chimbacalle", "luz", now)).toBe(0);
  });

  it("forgets reports whose cooldown is over", () => {
    const later = recordReport(
      reported,
      "chimbacalle",
      "agua",
      at("2026-10-21T16:00:00Z"),
    );
    expect(Object.keys(later.lastReports)).toEqual(["chimbacalle:agua"]);
  });
});
