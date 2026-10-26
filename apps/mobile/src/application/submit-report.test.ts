import type { ReportInput } from "@luz-y-agua/shared";
import { describe, expect, it } from "vitest";
import { EMPTY_STATE } from "../domain/local-state";
import { submitReport, type SendResult } from "./submit-report";

const now = new Date("2026-10-21T15:00:00Z");
const report = { barrioId: "solanda", service: "luz", status: "out" } as const;

function sender(result: SendResult | Error) {
  const sent: ReportInput[] = [];
  const send = async (input: ReportInput) => {
    sent.push(input);
    if (result instanceof Error) throw result;
    return result;
  };
  return { send, sent, newNonce: () => "nonce-1" };
}

describe("submitReport", () => {
  it("sends the barrio, service, status and daily nonce, and starts the cooldown", async () => {
    const deps = sender("ok");
    const outcome = await submitReport(EMPTY_STATE, report, now, deps);
    expect(deps.sent).toEqual([{ ...report, nonce: "nonce-1" }]);
    expect(outcome.result).toBe("ok");
    expect(outcome.state.lastReports).toEqual({
      "solanda:luz": now.toISOString(),
    });

    const again = await submitReport(
      outcome.state,
      { ...report, status: "restored" },
      new Date(now.getTime() + 60_000),
      deps,
    );
    expect(again).toMatchObject({ result: "cooldown", waitMs: 14 * 60_000 });
    expect(deps.sent).toHaveLength(1);
  });

  it("does not start the cooldown when the report was not stored", async () => {
    for (const result of ["rate_limited", new Error("offline")] as const) {
      const outcome = await submitReport(
        EMPTY_STATE,
        report,
        now,
        sender(result),
      );
      expect(outcome.result).toBe(result instanceof Error ? "error" : result);
      expect(outcome.state.lastReports).toEqual({});
      expect(outcome.state.reportNonce?.value).toBe("nonce-1");
    }
  });
});
