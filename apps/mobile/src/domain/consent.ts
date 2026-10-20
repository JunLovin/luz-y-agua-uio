import type { LocalState } from "./local-state";

/** Bump when the privacy policy changes: everyone is asked to accept it again. */
export const PRIVACY_VERSION = 1;

export function needsWelcome(state: LocalState): boolean {
  return !state.ageConfirmed || state.privacyAcceptedVersion < PRIVACY_VERSION;
}
