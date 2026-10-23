import { EMPTY_STATE, type LocalState } from "../domain/local-state";

export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  clearAll(): void;
}

const KEY = "state:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function isPlace(value: unknown): value is LocalState["places"][number] {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.alias) &&
    isString(value.barrioId) &&
    isNumber(value.lat) &&
    isNumber(value.lng) &&
    (value.eeqZoneId === undefined || isString(value.eeqZoneId))
  );
}

/** Keeps each saved field only if it still has the expected shape. */
function sanitize(saved: Record<string, unknown>): LocalState {
  const {
    places,
    subscribedTopics,
    reportNonce,
    lastReports,

    ageConfirmed,
    privacyAcceptedVersion,
    notificationsEnabled,
    theme,
  } = saved;
  return {
    places: Array.isArray(places) ? places.filter(isPlace) : EMPTY_STATE.places,
    subscribedTopics: Array.isArray(subscribedTopics)
      ? subscribedTopics.filter(isString)
      : EMPTY_STATE.subscribedTopics,
    reportNonce:
      isRecord(reportNonce) &&
      isString(reportNonce.date) &&
      isString(reportNonce.value)
        ? { date: reportNonce.date, value: reportNonce.value }
        : EMPTY_STATE.reportNonce,
    lastReports: isRecord(lastReports)
      ? Object.fromEntries(
          Object.entries(lastReports).filter(
            (entry): entry is [string, string] => isString(entry[1]),
          ),
        )
      : EMPTY_STATE.lastReports,
    ageConfirmed: ageConfirmed === true,
    privacyAcceptedVersion: isNumber(privacyAcceptedVersion)
      ? privacyAcceptedVersion
      : EMPTY_STATE.privacyAcceptedVersion,
    notificationsEnabled: notificationsEnabled === true,
    theme:
      theme === "dark" || theme === "light" || theme === "system"
        ? theme
        : EMPTY_STATE.theme,
  };
}

export function stateRepository(store: KeyValueStore) {
  return {
    /** The saved state, or a fresh one if nothing was saved or it is unreadable. */
    load(): LocalState {
      const raw = store.getString(KEY);
      if (!raw) return EMPTY_STATE;
      try {
        const saved: unknown = JSON.parse(raw);
        return isRecord(saved) ? sanitize(saved) : EMPTY_STATE;
      } catch {
        return EMPTY_STATE;
      }
    },
    save(state: LocalState): void {
      store.set(KEY, JSON.stringify(state));
    },
    /** "Borrar todos mis datos": nothing of the app is left on the phone. */
    wipe(): void {
      store.clearAll();
    },
  };
}
