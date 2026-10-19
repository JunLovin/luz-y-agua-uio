import { afterEach, describe, expect, it, vi } from "vitest";
import { queryOverpass } from "./overpass.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("queryOverpass", () => {
  it("retries busy responses and network errors, then returns JSON", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("# 502 busy", { status: 502 }))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response('{"elements":[]}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = queryOverpass("q");
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({ elements: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after five attempts", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => new Response("busy", { status: 504 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = queryOverpass("q");
    const assertion = expect(result).rejects.toThrow(/after 5 attempts: 504/);
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
