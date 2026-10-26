import { describe, expect, it, vi } from "vitest";
import {
  formatAlerts,
  sendAlerts,
  type Alert,
  type AlertsRepository,
} from "./alerts.ts";

const alerts: Alert[] = [
  { kind: "low_share", detail: { documents: 3, low: 1 } },
  {
    kind: "silent_source",
    detail: { source: "epmaps", lastReceivedAt: "2026-10-15T10:00:00Z" },
  },
  {
    kind: "failed_document",
    detail: { id: "doc-1", source: "eeq", error: "API down" },
  },
];

function repository(
  pending: Alert[],
): AlertsRepository & { marked: string[][] } {
  const marked: string[][] = [];
  return {
    marked,
    pendingAlerts: async () => pending,
    markFailuresAlerted: async (ids) => void marked.push(ids),
  };
}

describe("formatAlerts", () => {
  it("lists every alert in Spanish", () => {
    const { subject, text } = formatAlerts(alerts);
    expect(subject).toBe("Luz y Agua UIO: 3 alarmas del lector de cronogramas");
    expect(text).toContain("1 de 3 documentos");
    expect(text).toContain('La fuente "epmaps"');
    expect(text).toContain("doc-1 (eeq) falló tres veces: API down");
  });

  it("uses the singular for one alert", () => {
    expect(formatAlerts(alerts.slice(0, 1)).subject).toBe(
      "Luz y Agua UIO: 1 alarma del lector de cronogramas",
    );
  });
});

describe("sendAlerts", () => {
  it("sends nothing when there are no alerts", async () => {
    const mailer = { send: vi.fn() };
    expect(await sendAlerts({ repository: repository([]), mailer })).toBe(0);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("marks failed documents after the email is sent", async () => {
    const repo = repository(alerts);
    expect(
      await sendAlerts({ repository: repo, mailer: { send: async () => {} } }),
    ).toBe(3);
    expect(repo.marked).toEqual([["doc-1"]]);
  });

  it("does not mark failures when the email could not be sent", async () => {
    const repo = repository(alerts);
    await expect(
      sendAlerts({
        repository: repo,
        mailer: { send: async () => Promise.reject(new Error("Resend down")) },
      }),
    ).rejects.toThrow("Resend down");
    expect(repo.marked).toEqual([]);
  });
});
