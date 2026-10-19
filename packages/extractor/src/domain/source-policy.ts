const AGENT_TOKEN = "luzyaguauio";
export const USER_AGENT =
  "LuzYAguaUIO/1.0 (+https://github.com/JunLovin/luz-y-agua-uio)";

// CLAUDE.md rule 6: never fetched automatically, whatever the database says.
const BLOCKED_HOSTS = ["eeq.com.ec"];

export type UrlSource = { automatedAllowed: boolean; baseUrl: string | null };

export type UrlRefusal = "invalid_url" | "blocked_host" | "not_in_allowlist";

function hostIsOrUnder(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Checks a URL against the allowlist before anything is fetched. */
export function checkUrl(url: string, source: UrlSource): UrlRefusal | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid_url";
  }
  if (parsed.protocol !== "https:") return "invalid_url";
  if (BLOCKED_HOSTS.some((domain) => hostIsOrUnder(parsed.hostname, domain)))
    return "blocked_host";
  if (!source.automatedAllowed || !source.baseUrl) return "not_in_allowlist";
  const allowed = new URL(source.baseUrl);
  if (
    parsed.hostname !== allowed.hostname ||
    !parsed.pathname.startsWith(allowed.pathname)
  ) {
    return "not_in_allowlist";
  }
  return null;
}

type Rule = { allow: boolean; pattern: string };

function parseGroups(robotsTxt: string): Map<string, Rule[]> {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let collectingAgents = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!collectingAgents) agents = [];
      collectingAgents = true;
      agents.push(value.toLowerCase());
      for (const agent of agents) if (!groups.has(agent)) groups.set(agent, []);
    } else if (field === "allow" || field === "disallow") {
      collectingAgents = false;
      if (field === "disallow" && value === "") continue;
      for (const agent of agents)
        groups.get(agent)?.push({ allow: field === "allow", pattern: value });
    }
  }
  return groups;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

/** A missing robots.txt allows everything; otherwise the longest matching rule for our agent (or `*`) wins. */
export function robotsAllows(url: string, robotsTxt: string | null): boolean {
  if (robotsTxt === null) return true;
  const groups = parseGroups(robotsTxt);
  const agentGroup = [...groups.keys()].find(
    (agent) =>
      agent !== "*" && AGENT_TOKEN.includes(agent.replace(/[^a-z]/g, "")),
  );
  const rules = groups.get(agentGroup ?? "*") ?? [];
  const { pathname, search } = new URL(url);
  const path = decodeURIComponent(pathname) + search;
  const winner = rules
    .filter((rule) => matches(rule.pattern, path))
    .sort(
      (a, b) =>
        b.pattern.length - a.pattern.length ||
        Number(b.allow) - Number(a.allow),
    )[0];
  return winner?.allow ?? true;
}
