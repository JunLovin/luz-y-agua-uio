import { topicFor } from "@luz-y-agua/shared";

export type Place = {
  id: string;
  alias: string;
  barrioId: string;
  lat: number;
  lng: number;
  eeqZoneId?: string;
};

/** Everything the app keeps. It lives only on the phone (SPEC §8.2). */
export type LocalState = {
  places: Place[];
  subscribedTopics: string[];
  reportNonce: { date: string; value: string } | null;
  lastReports: Record<string, string>;
  ageConfirmed: boolean;
  privacyAcceptedVersion: number;
  /** The user's choice. On Android 12 and older the system never asks, so this is the only gate. */
  notificationsEnabled: boolean;
};

export const EMPTY_STATE: LocalState = {
  places: [],
  subscribedTopics: [],
  reportNonce: null,
  lastReports: {},
  ageConfirmed: false,
  privacyAcceptedVersion: 0,
  notificationsEnabled: false,
};

export function addPlace(state: LocalState, place: Place): LocalState {
  const exists = state.places.some((p) => p.id === place.id);
  return {
    ...state,
    places: exists
      ? state.places.map((p) => (p.id === place.id ? place : p))
      : [...state.places, place],
  };
}

export function removePlace(state: LocalState, id: string): LocalState {
  return { ...state, places: state.places.filter((p) => p.id !== id) };
}

/** FCM topics the saved places need: luz and agua for each barrio, plus the optional EEQ zone. */
export function desiredTopics(places: Place[]): string[] {
  const topics = places.flatMap((place) => [
    topicFor("luz", "b", place.barrioId),
    topicFor("agua", "b", place.barrioId),
    ...(place.eeqZoneId ? [topicFor("luz", "z", place.eeqZoneId)] : []),
  ]);
  return [...new Set(topics)].sort();
}

/** What to subscribe to and unsubscribe from so subscriptions match the places. */
export function topicChanges(state: LocalState): {
  subscribe: string[];
  unsubscribe: string[];
} {
  const desired = desiredTopics(state.places);
  return {
    subscribe: desired.filter(
      (topic) => !state.subscribedTopics.includes(topic),
    ),
    unsubscribe: state.subscribedTopics.filter(
      (topic) => !desired.includes(topic),
    ),
  };
}
