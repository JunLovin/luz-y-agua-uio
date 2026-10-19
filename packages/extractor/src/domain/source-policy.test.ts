import { describe, expect, it } from "vitest";
import { checkUrl, robotsAllows } from "./source-policy.ts";

const allowed = {
  automatedAllowed: true,
  baseUrl: "https://www.aguaquito.gob.ec/comunicados/",
};

describe("checkUrl", () => {
  it("accepts https URLs under the source's base URL", () => {
    expect(
      checkUrl("https://www.aguaquito.gob.ec/comunicados/corte.pdf", allowed),
    ).toBeNull();
  });

  it.each([
    ["not a URL", "nope", allowed, "invalid_url"],
    [
      "plain http",
      "http://www.aguaquito.gob.ec/comunicados/a.pdf",
      allowed,
      "invalid_url",
    ],
    [
      "eeq.com.ec even if allowed",
      "https://www.eeq.com.ec/cortes.pdf",
      { automatedAllowed: true, baseUrl: "https://www.eeq.com.ec/" },
      "blocked_host",
    ],
    [
      "an eeq.com.ec subdomain",
      "https://cdn.eeq.com.ec/a.pdf",
      allowed,
      "blocked_host",
    ],
    [
      "a source not automated",
      "https://www.aguaquito.gob.ec/comunicados/a.pdf",
      { ...allowed, automatedAllowed: false },
      "not_in_allowlist",
    ],
    [
      "another host",
      "https://evil.example/comunicados/a.pdf",
      allowed,
      "not_in_allowlist",
    ],
    [
      "a lookalike host",
      "https://www.aguaquito.gob.ec.evil.example/comunicados/a.pdf",
      allowed,
      "not_in_allowlist",
    ],
    [
      "a path outside the base",
      "https://www.aguaquito.gob.ec/admin/a.pdf",
      allowed,
      "not_in_allowlist",
    ],
  ] as const)("refuses %s", (_case, url, source, reason) => {
    expect(checkUrl(url, source)).toBe(reason);
  });
});

describe("robotsAllows", () => {
  const url = "https://www.aguaquito.gob.ec/comunicados/corte.pdf";

  it("allows when there is no robots.txt or no matching rule", () => {
    expect(robotsAllows(url, null)).toBe(true);
    expect(robotsAllows(url, "User-agent: *\nDisallow: /admin/")).toBe(true);
    expect(robotsAllows(url, "User-agent: *\nDisallow:")).toBe(true);
  });

  it("refuses a disallowed path for every agent", () => {
    expect(robotsAllows(url, "User-agent: *\nDisallow: /comunicados/")).toBe(
      false,
    );
    expect(robotsAllows(url, "User-agent: *\nDisallow: /")).toBe(false);
  });

  it("prefers the longest matching rule", () => {
    expect(
      robotsAllows(url, "User-agent: *\nDisallow: /\nAllow: /comunicados/"),
    ).toBe(true);
  });

  it("supports * and $ patterns", () => {
    expect(robotsAllows(url, "User-agent: *\nDisallow: /*.pdf$")).toBe(false);
    expect(robotsAllows(`${url}?v=2`, "User-agent: *\nDisallow: /*.pdf$")).toBe(
      true,
    );
  });

  it("uses our own group over *", () => {
    const robots =
      "User-agent: *\nAllow: /\n\nUser-agent: LuzYAguaUIO\nDisallow: /";
    expect(robotsAllows(url, robots)).toBe(false);
  });

  it("ignores groups for other agents", () => {
    expect(robotsAllows(url, "User-agent: Googlebot\nDisallow: /")).toBe(true);
  });
});
