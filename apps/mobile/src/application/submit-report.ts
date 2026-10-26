import type { ReportInput, Service } from "@luz-y-agua/shared";
import type { LocalState } from "../domain/local-state";
import {
  cooldownLeftMs,
  nonceFor,
  recordReport,
  type ReportStatus,
} from "../domain/reports";

export type SendResult = "ok" | "rate_limited" | "unknown_barrio" | "error";
export type ReportSender = (report: ReportInput) => Promise<SendResult>;

export type ReportOutcome =
  | { result: SendResult; state: LocalState }
  | { result: "cooldown"; waitMs: number; state: LocalState };

/** §7: the phone-side rules before a report leaves: one per barrio and service every 15 min. */
export async function submitReport(
  state: LocalState,
  report: { barrioId: string; service: Service; status: ReportStatus },
  now: Date,
  deps: { send: ReportSender; newNonce: () => string },
): Promise<ReportOutcome> {
  const waitMs = cooldownLeftMs(state, report.barrioId, report.service, now);
  if (waitMs > 0) return { result: "cooldown", waitMs, state };
  const withNonce = nonceFor(state, now, deps.newNonce);
  const result = await deps
    .send({ ...report, nonce: withNonce.nonce })
    .catch((): SendResult => "error");
  return {
    result,
    state:
      result === "ok"
        ? recordReport(withNonce.state, report.barrioId, report.service, now)
        : withNonce.state,
  };
}
