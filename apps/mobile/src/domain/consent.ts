import { config } from "@luz-y-agua/shared";
import type { LocalState } from "./local-state";

/** Shared with the web page, so both always speak about the same policy. */
export const PRIVACY_VERSION = config.legal.privacyVersion;

export function needsWelcome(state: LocalState): boolean {
  return !state.ageConfirmed || state.privacyAcceptedVersion < PRIVACY_VERSION;
}
