import { describe, expect, it, vi } from "vitest";
import { reportApi } from "./report-api";

const report = {
  barrioId: "solanda",
  service: "luz",
  status: "out",
  nonce: "6f1c2b9e-3d4a-4e5f-8a7b-1c2d3e4f5a6b",
} as const;

function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
}

describe("reportApi", () => {
  it("posts exactly the four report fields", async () => {
    const fetchFn = fakeFetch(200, { status: "ok" });
    const send = reportApi("https://x.supabase.co", "anon", fetchFn);
    expect(await send({ ...report, lat: -0.2 } as typeof report)).toBe("ok");
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe("https://x.supabase.co/functions/v1/submit-report");
    expect(JSON.parse(String(init?.body))).toEqual(report);
  });

  it.each([
    [429, { status: "rate_limited" }, "rate_limited"],
    [404, { status: "unknown_barrio" }, "unknown_barrio"],
    [500, { error: "server_error" }, "error"],
  ] as const)("maps %s to %s", async (code, body, expected) => {
    const send = reportApi("https://x", "anon", fakeFetch(code, body));
    expect(await send(report)).toBe(expected);
  });
});
