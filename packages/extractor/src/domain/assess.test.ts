import { describe, expect, it } from "vitest";
import { assess, pairExtractions, type AssessContext } from "./assess.js";
import type { ExtractedOutage, Extraction } from "./schema.js";

const row = (overrides: Partial<ExtractedOutage> = {}): ExtractedOutage => ({
  service: "luz",
  zoneNames: [],
  barrioNames: ["Solanda"],
  date: "2026-10-20",
  start: "09:00",
  end: "13:00",
  endsNextDay: false,
  notes: null,
  ...overrides,
});
const doc = (...outages: ExtractedOutage[]): Extraction => ({ outages });

// 2026-10-19 10:00 in Ecuador.
const now = new Date("2026-10-19T15:00:00Z");
const context: AssessContext = {
  now,
  sourceTrust: 0.5,
  catalog: {
    zones: [
      {
        id: "eeq_sur",
        service: "luz",
        names: ["Subestación Epiclachima", "Epiclachima"],
      },
      { id: "epmaps_sur", service: "agua", names: ["Sector Sur"] },
    ],
    barrios: [
      { id: "solanda", names: ["Solanda"] },
      { id: "quitumbe", names: ["Quitumbe"] },
      { id: "chillogallo", names: ["Chillogallo"] },
    ],
    zoneBarrios: [
      { zoneId: "eeq_sur", barrioId: "quitumbe" },
      { zoneId: "eeq_sur", barrioId: "chillogallo" },
    ],
  },
};

describe("pairExtractions", () => {
  it("scores the place overlap of rows with the same slot", () => {
    const pairs = pairExtractions(
      doc(row({ barrioNames: ["Solanda", "Quitumbe"] })),
      doc(row({ barrioNames: ["SOLANDA"] })),
    );
    expect(pairs).toEqual([
      { row: row({ barrioNames: ["Solanda", "Quitumbe"] }), agreement: 0.5 },
    ]);
  });

  it("pairs rows one-to-one and keeps rows only the secondary extraction found", () => {
    const carolina = row({ barrioNames: ["Carolina"] });
    const pairs = pairExtractions(
      doc(row(), row({ barrioNames: ["Solanda", "Quitumbe"] })),
      doc(row(), carolina),
    );
    expect(pairs).toEqual([
      { row: row(), agreement: 1 },
      { row: row({ barrioNames: ["Solanda", "Quitumbe"] }), agreement: 0 },
      { row: carolina, agreement: 0 },
    ]);
  });

  it("drops exact duplicate rows within an extraction", () => {
    expect(
      pairExtractions(
        doc(row(), row({ barrioNames: ["SOLANDA"] })),
        doc(row()),
      ),
    ).toEqual([{ row: row(), agreement: 1 }]);
  });

  it("gives 0 to rows whose hours differ or that only one extraction found", () => {
    const pairs = pairExtractions(doc(row()), doc(row({ start: "10:00" })));
    expect(pairs.map((p) => p.agreement)).toEqual([0, 0]);
  });
});

describe("assess", () => {
  const accepted = (primary: Extraction, secondary = primary) => {
    const [result] = assess(primary, secondary, context);
    if (result?.status !== "accepted")
      throw new Error(`expected accepted, got ${JSON.stringify(result)}`);
    return result;
  };

  it("reaches high exactly at the threshold despite floating point sums", () => {
    // 0.4 * 1 + 0.3 * 1 + 0.2 * 0.5 = 0.8
    expect(accepted(doc(row()))).toMatchObject({
      confidence: 0.8,
      tier: "high",
      barrioIds: ["solanda"],
    });
  });

  it("resolves zones to their linked barrios and counts them as a full place match", () => {
    const result = accepted(
      doc(row({ zoneNames: ["EPICLACHIMA"], barrioNames: ["Solanda"] })),
    );
    expect(result.zoneId).toBe("eeq_sur");
    expect(result.barrioIds).toEqual(["chillogallo", "quitumbe", "solanda"]);
    expect(result.placeMatch).toBe(1);
  });

  it("does not use zones of the other service", () => {
    const [result] = assess(
      doc(row({ service: "luz", zoneNames: ["Sector Sur"], barrioNames: [] })),
      doc(),
      context,
    );
    expect(result).toMatchObject({
      status: "rejected",
      reason: "no_known_place",
    });
  });

  it("lowers the tier when the extractions disagree or few places are known", () => {
    expect(
      accepted(doc(row()), doc(row({ barrioNames: ["Quitumbe"] }))),
    ).toMatchObject({ confidence: 0.4, tier: "low" });
    expect(
      accepted(doc(row({ barrioNames: ["Solanda", "Sangolquí"] }))),
    ).toMatchObject({ confidence: 0.65, tier: "medium" });
  });

  it("keeps a row whose zone is outside Quito but caps it at low", () => {
    const result = accepted(
      doc(
        row({
          zoneNames: ["Subestación Los Bancos"],
          barrioNames: ["Solanda"],
        }),
      ),
    );
    expect(result).toMatchObject({
      outsideQuito: true,
      tier: "low",
      barrioIds: ["solanda"],
      placeMatch: 1,
    });
    expect(result.confidence).toBe(0.8);
  });

  it("adds cross-source confirmation when the callback confirms", () => {
    const [result] = assess(
      doc(row({ barrioNames: ["Solanda", "Sangolquí"] })),
      doc(row({ barrioNames: ["Solanda", "Sangolquí"] })),
      {
        ...context,
        confirmedByOtherSource: (candidate) =>
          candidate.barrioIds.includes("solanda"),
      },
    );
    expect(result).toMatchObject({ confidence: 0.75, tier: "medium" });
  });

  it.each([
    ["yesterday", row({ date: "2026-10-18" }), "date_out_of_range"],
    [
      "more than 14 days ahead",
      row({ date: "2026-11-03" }),
      "date_out_of_range",
    ],
    [
      "end before start",
      row({ start: "13:00", end: "09:00" }),
      "end_not_after_start",
    ],
    [
      "end equal to start",
      row({ start: "09:00", end: "09:00" }),
      "end_not_after_start",
    ],
    [
      "longer than 24 h",
      row({ start: "09:00", end: "10:00", endsNextDay: true }),
      "too_long",
    ],
    [
      "only unknown places",
      row({ barrioNames: ["Sangolquí"] }),
      "no_known_place",
    ],
  ])("rejects %s", (_case, input, reason) => {
    expect(assess(doc(input), doc(input), context)).toEqual([
      { status: "rejected", row: input, reason },
    ]);
  });

  it("accepts today, 14 days ahead, overnight cuts and open-ended cuts", () => {
    expect(accepted(doc(row({ date: "2026-10-19" }))).status).toBe("accepted");
    expect(accepted(doc(row({ date: "2026-11-02" }))).status).toBe("accepted");
    const overnight = accepted(
      doc(row({ start: "22:00", end: "03:00", endsNextDay: true })),
    );
    expect(overnight.endsAt?.toISOString()).toBe("2026-10-21T08:00:00.000Z");
    expect(accepted(doc(row({ end: null }))).endsAt).toBeNull();
  });

  it("uses the Ecuador date for today", () => {
    // 2026-10-20 03:00 UTC is still 2026-10-19 in Ecuador.
    const [result] = assess(
      doc(row({ date: "2026-10-19" })),
      doc(row({ date: "2026-10-19" })),
      {
        ...context,
        now: new Date("2026-10-20T03:00:00Z"),
      },
    );
    expect(result?.status).toBe("accepted");
  });

  it("interprets hours in Ecuador time", () => {
    expect(accepted(doc(row())).startsAt.toISOString()).toBe(
      "2026-10-20T14:00:00.000Z",
    );
  });
});
