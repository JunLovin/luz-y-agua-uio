import {
  config,
  quitoDay,
  type ReportStatus,
  type Service,
} from "@luz-y-agua/shared";
import type { LocalState } from "./local-state";

export type { ReportStatus };

const key = (barrioId: string, service: Service) => `${barrioId}:${service}`;

/** §7: one random nonce per Quito day, thrown away the next day. */
export function nonceFor(
  state: LocalState,
  now: Date,
  newNonce: () => string,
): { state: LocalState; nonce: string } {
  const date = quitoDay(now);
  if (state.reportNonce?.date === date)
    return { state, nonce: state.reportNonce.value };
  const value = newNonce();
  return { state: { ...state, reportNonce: { date, value } }, nonce: value };
}

/** Milliseconds until this phone may report the same service in the same barrio again. */
export function cooldownLeftMs(
  state: LocalState,
  barrioId: string,
  service: Service,
  now: Date,
): number {
  const last = state.lastReports[key(barrioId, service)];
  if (!last) return 0;
  return Math.max(
    0,
    Date.parse(last) + config.reports.deviceCooldownMs - now.getTime(),
  );
}

/** Remembers the report time and drops entries whose cooldown is over. */
export function recordReport(
  state: LocalState,
  barrioId: string,
  service: Service,
  now: Date,
): LocalState {
  const lastReports = Object.fromEntries(
    Object.entries(state.lastReports).filter(
      ([, at]) =>
        Date.parse(at) + config.reports.deviceCooldownMs > now.getTime(),
    ),
  );
  lastReports[key(barrioId, service)] = now.toISOString();
  return { ...state, lastReports };
}
