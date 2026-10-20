import { describe, expect, it } from "vitest";
import { EMPTY_STATE, type LocalState } from "../domain/local-state";
import { syncTopics, type TopicPort } from "./topic-sync";

const home = { id: "1", alias: "Casa", barrioId: "solanda", lat: 0, lng: 0 };

function fakePort(failing: string[] = []) {
  const calls: string[] = [];
  const port: TopicPort = {
    async subscribe(topic) {
      calls.push(`+${topic}`);
      if (failing.includes(topic)) throw new Error("offline");
    },
    async unsubscribe(topic) {
      calls.push(`-${topic}`);
      if (failing.includes(topic)) throw new Error("offline");
    },
  };
  return { port, calls };
}

const state = (over: Partial<LocalState>): LocalState => ({
  ...EMPTY_STATE,
  ...over,
});

describe("syncTopics", () => {
  it("subscribes to the barrio topics of the places", async () => {
    const { port, calls } = fakePort();
    expect(await syncTopics(state({ places: [home] }), port, true)).toEqual([
      "v1_agua_b_solanda",
      "v1_luz_b_solanda",
    ]);
    expect(calls.sort()).toEqual(["+v1_agua_b_solanda", "+v1_luz_b_solanda"]);
  });

  it("unsubscribes from topics no place needs", async () => {
    const { port, calls } = fakePort();
    const next = await syncTopics(
      state({ subscribedTopics: ["v1_luz_b_chimbacalle"] }),
      port,
      true,
    );
    expect(next).toEqual([]);
    expect(calls).toEqual(["-v1_luz_b_chimbacalle"]);
  });

  it("keeps failed changes pending for the next sync", async () => {
    const { port } = fakePort(["v1_agua_b_solanda", "v1_luz_b_old"]);
    expect(
      await syncTopics(
        state({ places: [home], subscribedTopics: ["v1_luz_b_old"] }),
        port,
        true,
      ),
    ).toEqual(["v1_luz_b_old", "v1_luz_b_solanda"]);
  });

  it("drops every subscription without notification permission", async () => {
    const { port, calls } = fakePort();
    expect(
      await syncTopics(
        state({ places: [home], subscribedTopics: ["v1_luz_b_solanda"] }),
        port,
        false,
      ),
    ).toEqual([]);
    expect(calls).toEqual(["-v1_luz_b_solanda"]);
  });
});
