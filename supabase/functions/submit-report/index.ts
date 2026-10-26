import { clientIp, parseReport } from "@luz-y-agua/shared";
import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const STATUS: Record<string, number> = {
  ok: 200,
  unknown_barrio: 404,
  rate_limited: 429,
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * §7: the only request that carries a barrioId. The IP is passed to Postgres to be HMAC'd with
 * the salt of the day and is never logged or stored in clear (PRINCIPIOS.md rule 10).
 */
Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);
  const report = parseReport(await request.json().catch(() => null));
  if (!report) return json({ error: "invalid_report" }, 400);

  const { data, error } = await db.rpc("submit_report", {
    p_barrio_id: report.barrioId,
    p_service: report.service,
    p_status: report.status,
    p_nonce: report.nonce,
    p_ip: clientIp((name) => request.headers.get(name)),
  });
  if (error) {
    console.error("submit-report failed:", error.code);
    return json({ error: "server_error" }, 500);
  }
  const result = String(data);
  return json({ status: result }, STATUS[result] ?? 500);
});
