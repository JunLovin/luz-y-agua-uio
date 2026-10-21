import type { Service } from "./topics.ts";

export type ReportStatus = "out" | "restored";

/** §7: everything a report carries. No location, no device id: the nonce changes every day. */
export type ReportInput = {
  barrioId: string;
  service: Service;
  status: ReportStatus;
  nonce: string;
};

const BARRIO_ID = /^[a-z0-9_]{1,80}$/;
const NONCE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Validates a submit-report body. Unknown fields (like `attestation`, H7) are ignored. */
export function parseReport(body: unknown): ReportInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { barrioId, service, status, nonce } = body as Record<string, unknown>;
  if (
    typeof barrioId !== "string" ||
    !BARRIO_ID.test(barrioId) ||
    (service !== "luz" && service !== "agua") ||
    (status !== "out" && status !== "restored") ||
    typeof nonce !== "string" ||
    !NONCE.test(nonce)
  ) {
    return null;
  }
  return { barrioId, service, status, nonce };
}

/**
 * The address the rate limit uses. Clients can prepend anything to X-Forwarded-For, so only
 * headers set by our proxies count: Cloudflare's, then the gateway's, then the last hop.
 */
export function clientIp(header: (name: string) => string | null): string {
  const forwarded = header("x-forwarded-for")?.split(",").at(-1)?.trim();
  return (
    header("cf-connecting-ip")?.trim() ||
    header("x-real-ip")?.trim() ||
    forwarded ||
    "unknown"
  );
}
