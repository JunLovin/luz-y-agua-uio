import { describe, expect, it } from "vitest";
import { topicFor } from "./topics.ts";

describe("topicFor", () => {
  it("builds barrio topics for both services", () => {
    expect(topicFor("luz", "b", "chimbacalle")).toBe("v1_luz_b_chimbacalle");
    expect(topicFor("agua", "b", "solanda")).toBe("v1_agua_b_solanda");
  });

  it("builds zone topics for luz", () => {
    expect(topicFor("luz", "z", "eeq_chimbacalle")).toBe(
      "v1_luz_z_eeq_chimbacalle",
    );
  });

  it("rejects zone topics for agua at runtime", () => {
    expect(() => topicFor("agua" as "luz", "z", "epmaps_x")).toThrow();
  });

  it.each(["", "san josé", "a/b", "barrio id", "ñ", "x#y"])(
    "rejects ids outside the FCM charset: %j",
    (id) => {
      expect(() => topicFor("luz", "b", id)).toThrow();
    },
  );

  it("accepts every FCM-allowed symbol", () => {
    expect(topicFor("luz", "b", "a-b_c.d~e%f")).toBe("v1_luz_b_a-b_c.d~e%f");
  });
});
