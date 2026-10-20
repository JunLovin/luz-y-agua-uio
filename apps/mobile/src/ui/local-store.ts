import { useSyncExternalStore } from "react";
import { mmkvStore } from "../adapters/mmkv-store";
import { stateRepository } from "../application/state-repository";
import { EMPTY_STATE, type LocalState } from "../domain/local-state";

const repository = stateRepository(mmkvStore());
let state = repository.load();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const localStore = {
  get: (): LocalState => state,
  update(change: (current: LocalState) => LocalState) {
    state = change(state);
    repository.save(state);
    emit();
  },
  /** "Borrar todos mis datos": clears MMKV, including the downloaded city. */
  wipe() {
    repository.wipe();
    state = EMPTY_STATE;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useLocalState(): LocalState {
  return useSyncExternalStore(localStore.subscribe, localStore.get);
}
