import { createClient } from "@supabase/supabase-js";
import {
  sendAlerts,
  type Alert,
  type Mailer,
} from "../../../packages/extractor/src/application/alerts.ts";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(env("SUPABASE_URL"), serviceKey, {
  auth: { persistSession: false },
});

const resend: Mailer = {
  async send({ subject, text }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          Deno.env.get("ALERT_FROM_EMAIL") ??
          "Luz y Agua UIO <onboarding@resend.dev>",
        to: [env("ADMIN_EMAIL")],
        subject,
        text,
      }),
    });
    if (!response.ok) throw new Error(`Resend answered ${response.status}`);
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return json({ error: "forbidden" }, 403);
  }
  try {
    const sent = await sendAlerts({
      mailer: resend,
      repository: {
        async pendingAlerts() {
          const { data, error } = await db.rpc("pending_alerts");
          if (error) throw error;
          return (data ?? []) as Alert[];
        },
        async markFailuresAlerted(ids) {
          const { error } = await db.rpc("mark_failures_alerted", { ids });
          if (error) throw error;
        },
      },
    });
    return json({ alerts: sent });
  } catch (error) {
    console.error(
      "send-alerts failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "send_failed" }, 502);
  }
});
