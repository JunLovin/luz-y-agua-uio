import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  requestPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import type { TopicPort } from "../application/topic-sync";

export type PermissionResult = "granted" | "denied" | "blocked";

const messaging = getMessaging();
const POST_NOTIFICATIONS = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
const androidAsks = Platform.OS === "android" && Number(Platform.Version) >= 33;
const allowed = (status: number) =>
  status === AuthorizationStatus.AUTHORIZED ||
  status === AuthorizationStatus.PROVISIONAL;

/** FCM by topic only: the app never sends its push token anywhere (PRINCIPIOS.md rule 3). */
export const fcmPush: TopicPort & {
  hasPermission(): Promise<boolean>;
  /** "blocked" means the phone will not ask again: only its settings can turn avisos on. */
  requestPermission(): Promise<PermissionResult>;
  reset(): Promise<void>;
  onMessage(listener: () => void): () => void;
  onOpened(listener: () => void): () => void;
} = {
  subscribe: (topic) => subscribeToTopic(messaging, topic),
  unsubscribe: (topic) => unsubscribeFromTopic(messaging, topic),
  async hasPermission() {
    if (Platform.OS === "android")
      return !androidAsks || PermissionsAndroid.check(POST_NOTIFICATIONS);
    return allowed(await hasPermission(messaging));
  },
  async requestPermission() {
    if (Platform.OS === "android") {
      if (!androidAsks) return "granted";
      const result = await PermissionsAndroid.request(POST_NOTIFICATIONS);
      if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
      return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        ? "blocked"
        : "denied";
    }
    // iOS asks only once; after a "no" only the Settings app can change it.
    return allowed(await requestPermission(messaging)) ? "granted" : "blocked";
  },
  /** Drops this install's token, and with it every topic subscription. */
  reset: () => deleteToken(messaging),
  onMessage: (listener) => onMessage(messaging, listener),
  onOpened: (listener) => onNotificationOpenedApp(messaging, listener),
};
