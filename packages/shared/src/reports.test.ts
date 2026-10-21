import { describe, expect, it } from "vitest";
import { clientIp, parseReport, quitoDay } from "./reports.ts";

const valid = {
  barrioId: "la_argelia",
  service: "luz",
  status: "out",
  nonce: "6f1c2b9e-3d4a-4e5f-8a7b-1c2d3e4f5a6b",
};

describe("parseReport", () => {
  it("keeps only the four report fields", () => {
    expect(parseReport({ ...valid, attestation: "x", lat: -0.2 })).toEqual(
      valid,
    );
  });

  it.each([
    ["no body", null],
    ["a string", "out"],
    ["an uppercase barrio", { ...valid, barrioId: "Solanda" }],
    ["a barrio with a path", { ...valid, barrioId: "../x" }],
    ["an unknown service", { ...valid, service: "gas" }],
    ["an unknown status", { ...valid, status: "maybe" }],
    ["a nonce that is not a v4 UUID", { ...valid, nonce: "123" }],
    ["a missing nonce", { ...valid, nonce: undefined }],
  ])("rejects %s", (_name, body) => {
    expect(parseReport(body)).toBeNull();
  });
});

describe("clientIp", () => {
  const headers = (h: Record<string, string>) => (name: string) =>
    h[name] ?? null;

  it("prefers the headers our proxies set", () => {
    expect(
      clientIp(
        headers({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" }),
      ),
    ).toBe("1.1.1.1");
    expect(clientIp(headers({ "x-real-ip": "2.2.2.2" }))).toBe("2.2.2.2");
  });

  it("ignores what a client prepends to X-Forwarded-For", () => {
    expect(clientIp(headers({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" }))).toBe(
      "3.3.3.3",
    );
  });

  it("falls back to a shared bucket", () => {
    expect(clientIp(headers({}))).toBe("unknown");
  });
});

describe("quitoDay", () => {
  it("uses the Quito date, not UTC", () => {
    expect(quitoDay(new Date("2026-10-21T04:59:00Z"))).toBe("2026-10-20");
    expect(quitoDay(new Date("2026-10-21T05:00:00Z"))).toBe("2026-10-21");
  });
});
