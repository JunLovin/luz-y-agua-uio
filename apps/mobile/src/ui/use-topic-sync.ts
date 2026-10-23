import { useEffect } from "react";
import { AppState } from "react-native";
import { fcmPush } from "../adapters/fcm-push";
import { syncTopics } from "../application/topic-sync";
import { desiredTopics } from "../domain/local-state";
import { localStore, useLocalState } from "./local-store";
import { refreshCityData } from "./use-city";

/** Avisos only when the user chose them and the system allows them. */
export async function pushEnabled(): Promise<boolean> {
  return (
    localStore.get().notificationsEnabled && (await fcmPush.hasPermission())
  );
}

/** Records the user's choice and brings subscriptions in line with it. */
export async function setNotifications(enabled: boolean): Promise<boolean> {
  localStore.update((state) => ({ ...state, notificationsEnabled: enabled }));
  const granted =
    !enabled || (await fcmPush.requestPermission().catch(() => false));
  void syncNow();
  return granted;
}

let running = false;
let again = false;

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      const subscribed = await syncTopics(
        localStore.get(),
        fcmPush,
        await pushEnabled(),
      );
      if (subscribed.join() !== localStore.get().subscribedTopics.join())
        localStore.update((state) => ({
          ...state,
          subscribedTopics: subscribed,
        }));
    } while (again);
  } catch {
    // Retried on the next change or when the app comes back to the foreground.
  } finally {
    running = false;
  }
}

/** "Borrar todos mis datos": unsubscribe what we know and drop the token. */
export async function forgetPush(topics: string[]): Promise<void> {
  await Promise.allSettled(topics.map((topic) => fcmPush.unsubscribe(topic)));
  await fcmPush.reset().catch(() => undefined);
}

export function useTopicSync() {
  const wanted = desiredTopics(useLocalState().places).join();
  useEffect(() => {
    void syncNow();
  }, [wanted]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void syncNow();
    });
    // A push means the city changed: refresh now, not after the usual foreground delay.
    const stopMessages = fcmPush.onMessage(() => void refreshCityData());
    const stopOpened = fcmPush.onOpened(() => void refreshCityData());
    return () => {
      subscription.remove();
      stopMessages();
      stopOpened();
    };
  }, []);
}
