import { describe, expect, it } from "vitest";
import { EMPTY_STATE } from "../domain/local-state";
import { stateRepository, type KeyValueStore } from "./state-repository";

function memoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getString: (k) => data.get(k),
    set: (k, v) => void data.set(k, v),
    clearAll: () => data.clear(),
  };
}

describe("stateRepository", () => {
  it("starts empty and round-trips the saved state", () => {
    const repo = stateRepository(memoryStore());
    expect(repo.load()).toEqual(EMPTY_STATE);
    const state = {
      ...EMPTY_STATE,
      ageConfirmed: true,
      notificationsEnabled: true,
    };
    repo.save(state);
    expect(repo.load()).toEqual(state);
  });

  it("fills fields added in newer versions with their defaults", () => {
    const repo = stateRepository(
      memoryStore({ "state:v1": JSON.stringify({ ageConfirmed: true }) }),
    );
    expect(repo.load()).toEqual({ ...EMPTY_STATE, ageConfirmed: true });
  });

  it.each(["{not json", "[]", "null", "42"])(
    "recovers from an unreadable value %s",
    (raw) => {
      expect(stateRepository(memoryStore({ "state:v1": raw })).load()).toEqual(
        EMPTY_STATE,
      );
    },
  );

  it("drops fields and places whose type is wrong instead of crashing later", () => {
    const place = {
      id: "1",
      alias: "Casa",
      barrioId: "solanda",
      lat: -0.27,
      lng: -78.54,
    };
    const saved = {
      places: [place, { id: 2, alias: "Roto" }],
      subscribedTopics: null,
      lastReports: { "solanda:luz": "2026-10-20T10:00:00Z", bad: 1 },
      ageConfirmed: "yes",
      notificationsEnabled: "yes",
    };
    expect(
      stateRepository(
        memoryStore({ "state:v1": JSON.stringify(saved) }),
      ).load(),
    ).toEqual({
      ...EMPTY_STATE,
      places: [place],
      lastReports: { "solanda:luz": "2026-10-20T10:00:00Z" },
    });
  });

  it("wipes everything", () => {
    const store = memoryStore({ "state:v1": "{}", other: "x" });
    stateRepository(store).wipe();
    expect(store.data.size).toBe(0);
  });
});
