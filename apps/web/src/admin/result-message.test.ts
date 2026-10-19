import { describe, expect, it } from "vitest";
import { resultMessage } from "./result-message";

describe("resultMessage", () => {
  it("summarizes an extracted document", () => {
    expect(
      resultMessage({
        resultado: "extracted",
        high: "1",
        medium: "2",
        low: "3",
        rechazados: "4",
      }),
    ).toBe(
      "Documento procesado. Publicados: 1 con aviso, 2 sin confirmar, 3 guardados sin mostrar. Descartados: 4.",
    );
  });

  it("explains a refusal", () => {
    expect(
      resultMessage({ resultado: "refused", motivo: "blocked_host" }),
    ).toBe(
      "Documento rechazado. Ese sitio está bloqueado: no se descarga automáticamente.",
    );
  });

  it("covers every refusal reason that ingest can return", () => {
    for (const reason of [
      "invalid_url",
      "blocked_host",
      "not_in_allowlist",
      "robots_disallowed",
      "unsupported_type",
      "too_large",
      "fetch_failed",
      "unknown_source",
    ]) {
      expect(resultMessage({ resultado: "refused", motivo: reason })).not.toBe(
        "Documento rechazado.",
      );
    }
  });

  it("ignores inherited keys and unknown values", () => {
    expect(resultMessage({ resultado: "toString" })).toBeNull();
    expect(resultMessage({ resultado: "refused", motivo: "constructor" })).toBe(
      "Documento rechazado.",
    );
    expect(resultMessage({})).toBeNull();
  });

  it("shows only digits from the query string", () => {
    expect(
      resultMessage({
        resultado: "extracted",
        high: "Sube este PDF",
        medium: "1",
      }),
    ).toContain("Publicados: 0 con aviso, 1 sin confirmar");
  });
});
