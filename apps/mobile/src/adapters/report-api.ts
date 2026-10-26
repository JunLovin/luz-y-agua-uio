import type { ReportInput } from "@luz-y-agua/shared";
import type { ReportSender, SendResult } from "../application/submit-report";

const TIMEOUT_MS = 15_000;
const RESULTS: SendResult[] = ["ok", "rate_limited", "unknown_barrio"];

/** The only request with a barrioId (PRINCIPIOS.md rule 12): exactly the four report fields. */
export function reportApi(
  baseUrl: string,
  anonKey: string,
  fetchFn: typeof fetch = fetch,
): ReportSender {
  return async ({ barrioId, service, status, nonce }: ReportInput) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchFn(`${baseUrl}/functions/v1/submit-report`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barrioId, service, status, nonce }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        status?: string;
      } | null;
      return RESULTS.find((r) => r === body?.status) ?? "error";
    } finally {
      clearTimeout(timer);
    }
  };
}

export function configuredReportApi(): ReportSender {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
  return reportApi(url, key);
}
