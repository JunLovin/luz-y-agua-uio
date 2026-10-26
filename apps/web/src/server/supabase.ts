import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function supabaseUrl(): string {
  return env("SUPABASE_URL");
}

export function anonClient() {
  return createClient(supabaseUrl(), env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function callFunction(
  name: string,
  token: string,
  init: { body: BodyInit; headers?: Record<string, string> },
) {
  return fetch(`${supabaseUrl()}/functions/v1/${name}`, {
    method: "POST",
    body: init.body,
    headers: {
      ...init.headers,
      apikey: env("SUPABASE_ANON_KEY"),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function adminEmail(): string {
  return env("ADMIN_EMAIL").toLowerCase();
}
