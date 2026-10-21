/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "./config.ts";

const migrationsDir = join(import.meta.dirname, "../../../supabase/migrations");
const sql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");

const UNIT_MS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const;

function lastIntervalMs(pattern: RegExp): number {
  const match = [...sql.matchAll(pattern)].at(-1);
  if (!match?.groups) throw new Error(`No match for ${pattern}`);
  const { amount, unit } = match.groups as {
    amount: string;
    unit: keyof typeof UNIT_MS;
  };
  return Number(amount) * UNIT_MS[unit];
}

const interval = String.raw`interval '(?<amount>\d+) (?<unit>minute|hour|day)s?'`;

describe("SQL mirrors config.ts", () => {
  it.each([
    [
      "reports",
      String.raw`delete from public\.reports where received_at < now\(\) - ${interval}`,
      config.retention.reportsMs,
    ],
    [
      "daily_salts",
      String.raw`delete from public\.daily_salts where day <= \(\(now\(\) - ${interval}`,
      config.retention.dailySaltsMs,
    ],
    [
      "rate_limits",
      String.raw`delete from public\.rate_limits where window_start < now\(\) - ${interval}`,
      config.retention.rateLimitsMs,
    ],
    [
      "notifications_log",
      String.raw`delete from public\.notifications_log where sent_at < now\(\) - ${interval}`,
      config.retention.notificationsLogMs,
    ],
    [
      "crowd live window",
      String.raw`where received_at > now\(\) - ${interval}`,
      config.crowd.liveWindowMs,
    ],
  ])("%s", (_name, pattern, expected) => {
    expect(lastIntervalMs(new RegExp(pattern, "g"))).toBe(expected);
  });

  it("crowd display rounding and minimum", () => {
    const view = [
      ...sql.matchAll(
        /create (?:or replace )?view public_crowd_live as[\s\S]*?;/g,
      ),
    ].at(-1)?.[0];
    expect(view).toContain(
      `round(max(devices) / ${config.crowd.displayRoundTo}.0) * ${config.crowd.displayRoundTo}`,
    );
    expect(view).toContain(
      `having max(devices) >= ${config.crowd.displayMinimum}`,
    );
  });

  it("thresholds() for learning and alerts", () => {
    const literal = [
      ...sql.matchAll(
        /create (?:or replace )?function thresholds\(\)[\s\S]*?select '(\{[\s\S]*?\})'::jsonb/g,
      ),
    ].at(-1)?.[1];
    expect(JSON.parse(literal ?? "null")).toEqual({
      accuracyBeforeMinutes: config.accuracyWindow.beforeStartMs / 60_000,
      accuracyAfterMinutes: config.accuracyWindow.afterStartMs / 60_000,
      peakDistinctReports: config.crowd.minDistinctReports,
      trustStep: config.learning.trustStep,
      zoneBarrioStep: config.learning.zoneBarrioStep,
      learnedWeight: config.learning.learnedWeight,
      lowDocumentShare: config.alerts.lowDocumentShare,
      silentSourceHours: config.alerts.silentSourceMs / 3_600_000,
      activeSourceDocuments: config.alerts.activeSourceDocuments,
      activeSourceWindowDays: config.alerts.activeSourceWindowMs / 86_400_000,
      crowdEntryMinutes: config.crowd.entryWindowMs / 60_000,
      crowdExitMinutes: config.crowd.exitWindowMs / 60_000,
      crowdStaleHours: config.crowd.staleAfterMs / 3_600_000,
      maxReportsPerIpPerHour: config.reports.maxPerIpPerHour,
    });
  });
});
