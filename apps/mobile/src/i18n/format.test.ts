import { describe, expect, it } from "vitest";
import { formatOutageWindow } from "./format";

describe("formatOutageWindow", () => {
  it("shows the day and hours in Quito time", () => {
    expect(
      formatOutageWindow("2026-10-21T14:00:00Z", "2026-10-21T18:00:00Z"),
    ).toMatch(/21 oct.* · 09:00–13:00$/);
  });

  it("says when the end is unknown", () => {
    expect(formatOutageWindow("2026-10-21T14:00:00Z", null)).toMatch(
      /· 09:00 en adelante$/,
    );
  });
});
