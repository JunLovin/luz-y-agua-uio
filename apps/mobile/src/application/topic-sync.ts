import { topicChanges, type LocalState } from "../domain/local-state";

export type TopicPort = {
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
};

/**
 * Brings FCM subscriptions in line with the saved places and returns what is subscribed now.
 * Without notification permission it unsubscribes from everything: Google only learns a
 * barrio when the user asked for its alerts. Failed calls are retried on the next sync.
 */
export async function syncTopics(
  state: LocalState,
  port: TopicPort,
  enabled: boolean,
): Promise<string[]> {
  const { subscribe, unsubscribe } = topicChanges(
    enabled ? state : { ...state, places: [] },
  );
  const subscribed = new Set(state.subscribedTopics);
  await Promise.all([
    ...subscribe.map((topic) =>
      port.subscribe(topic).then(
        () => subscribed.add(topic),
        () => undefined,
      ),
    ),
    ...unsubscribe.map((topic) =>
      port.unsubscribe(topic).then(
        () => subscribed.delete(topic),
        () => undefined,
      ),
    ),
  ]);
  return [...subscribed].sort();
}
