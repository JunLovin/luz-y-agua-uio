import { createMMKV } from "react-native-mmkv";
import type { KeyValueStore } from "../application/state-repository";

const storage = createMMKV({ id: "luz-y-agua" });

export function mmkvStore(): KeyValueStore {
  return storage;
}
