const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const config = {
  confidence: {
    weights: {
      extractionAgreement: 0.4,
      zoneMatch: 0.3,
      sourceTrust: 0.2,
      crossSourceConfirmation: 0.1,
    },
    tiers: { high: 0.8, medium: 0.55 },
  },
  validator: {
    maxDaysAhead: 14,
    maxDurationMs: DAY_MS,
  },
  accuracyWindow: {
    beforeStartMs: 10 * MINUTE_MS,
    afterStartMs: 30 * MINUTE_MS,
  },
  crowd: {
    minDistinctReports: 5,
    entryWindowMs: 20 * MINUTE_MS,
    exitWindowMs: 30 * MINUTE_MS,
    staleAfterMs: 6 * HOUR_MS,
    liveWindowMs: 60 * MINUTE_MS,
    displayRoundTo: 5,
    displayMinimum: 3,
  },
  reports: {
    maxPerIpPerHour: 10,
    deviceCooldownMs: 15 * MINUTE_MS,
    unattestedWeight: 0.5,
  },
  notifications: {
    headsUpMinLeadMs: 2 * HOUR_MS,
    imminentLeadMs: 30 * MINUTE_MS,
    quietHours: { startHour: 22, endHour: 6, timeZone: "America/Guayaquil" },
  },
  retention: {
    reportsMs: 30 * DAY_MS,
    dailySaltsMs: 2 * DAY_MS,
    rateLimitsMs: HOUR_MS,
    notificationsLogMs: 90 * DAY_MS,
  },
} as const;
