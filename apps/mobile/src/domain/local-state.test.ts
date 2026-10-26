import { describe, expect, it } from "vitest";
import {
  EMPTY_STATE,
  addPlace,
  desiredTopics,
  removePlace,
  topicChanges,
  type Place,
} from "./local-state";

const casa: Place = {
  id: "1",
  alias: "Casa",
  barrioId: "chimbacalle",
  lat: -0.24,
  lng: -78.52,
};
const trabajo: Place = {
  id: "2",
  alias: "Trabajo",
  barrioId: "inaquito",
  lat: -0.18,
  lng: -78.48,
  eeqZoneId: "eeq_norte",
};

describe("places", () => {
  it("keeps the position of an edited place", () => {
    const state = addPlace(addPlace(EMPTY_STATE, casa), trabajo);
    expect(
      addPlace(state, { ...casa, alias: "Hogar" }).places.map((p) => p.alias),
    ).toEqual(["Hogar", "Trabajo"]);
  });

  it("adds, replaces and removes places", () => {
    const withCasa = addPlace(EMPTY_STATE, casa);
    const renamed = addPlace(withCasa, { ...casa, alias: "Hogar" });
    expect(renamed.places).toEqual([{ ...casa, alias: "Hogar" }]);
    expect(removePlace(renamed, "1").places).toEqual([]);
  });
});

describe("desiredTopics", () => {
  it("subscribes each barrio to luz and agua, and the optional EEQ zone", () => {
    expect(desiredTopics([casa, trabajo])).toEqual([
      "v1_agua_b_chimbacalle",
      "v1_agua_b_inaquito",
      "v1_luz_b_chimbacalle",
      "v1_luz_b_inaquito",
      "v1_luz_z_eeq_norte",
    ]);
  });

  it("does not repeat topics for two places in the same barrio", () => {
    expect(
      desiredTopics([casa, { ...casa, id: "3", alias: "Mamá" }]),
    ).toHaveLength(2);
  });
});

describe("topicChanges", () => {
  it("subscribes new topics and unsubscribes the ones no place needs", () => {
    const state = {
      ...EMPTY_STATE,
      places: [trabajo],
      subscribedTopics: ["v1_luz_b_chimbacalle", "v1_luz_b_inaquito"],
    };
    expect(topicChanges(state)).toEqual({
      subscribe: ["v1_agua_b_inaquito", "v1_luz_z_eeq_norte"],
      unsubscribe: ["v1_luz_b_chimbacalle"],
    });
  });

  it("unsubscribes everything when there are no places", () => {
    expect(
      topicChanges({ ...EMPTY_STATE, subscribedTopics: ["v1_luz_b_x"] }),
    ).toEqual({
      subscribe: [],
      unsubscribe: ["v1_luz_b_x"],
    });
  });
});
