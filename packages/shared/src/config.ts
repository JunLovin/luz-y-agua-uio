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
    nameSimilarity: 0.85,
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
    /** Pushes `notify` sends at once; FCM HTTP v1 handles far more, this keeps one run short and polite. */
    sendConcurrency: 10,
    quietHours: { startHour: 22, endHour: 6, timeZone: "America/Guayaquil" },
  },
  learning: {
    trustStep: 0.02,
    zoneBarrioStep: 0.1,
    learnedWeight: 0.5,
  },
  ingestion: {
    maxAttempts: 3,
  },
  alerts: {
    lowDocumentShare: 0.3,
    silentSourceMs: 72 * HOUR_MS,
    activeSourceDocuments: 3,
    activeSourceWindowMs: 14 * DAY_MS,
  },
  legal: {
    /** Bump with every change to /privacidad: the app asks everyone to accept it again. */
    privacyVersion: 1,
    privacyDate: "2026-10-21",
    sourceCodeUrl: "https://github.com/JunLovin/luz-y-agua-uio",
  },
  web: {
    /** Public pages are rebuilt at most this often; visits never hit the database (§9). */
    revalidateMs: 5 * MINUTE_MS,
  },
  mobile: {
    cityRefreshMs: 5 * MINUTE_MS,
    locationTimeoutMs: 15_000,
  },
  retention: {
    reportsMs: 30 * DAY_MS,
    dailySaltsMs: 2 * DAY_MS,
    rateLimitsMs: HOUR_MS,
    notificationsLogMs: 90 * DAY_MS,
  },
} as const;
