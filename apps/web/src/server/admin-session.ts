import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { adminEmail, anonClient } from "./supabase";

const ACCESS = "admin_access";
const REFRESH = "admin_refresh";
const PENDING_EMAIL = "admin_pending_email";
const REFRESH_MAX_AGE = 7 * 24 * 3600;
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/admin",
} as const;

/** The token if it belongs to the confirmed admin account, else null. */
async function verifyAdmin(token: string): Promise<string | null> {
  const { data } = await anonClient().auth.getUser(token);
  const user = data.user;
  return user?.email_confirmed_at && user.email?.toLowerCase() === adminEmail()
    ? token
    : null;
}

export async function getAdminToken(): Promise<string | null> {
  const access = (await cookies()).get(ACCESS)?.value;
  return access ? verifyAdmin(access) : null;
}

/** Only from Server Functions or Route Handlers: it rewrites the session cookies. */
export async function refreshAdminToken(): Promise<string | null> {
  const refresh = (await cookies()).get(REFRESH)?.value;
  if (!refresh) return null;
  const { data } = await anonClient().auth.refreshSession({
    refresh_token: refresh,
  });
  if (!data.session) return null;
  await saveSession(data.session);
  return verifyAdmin(data.session.access_token);
}

export async function hasRefreshToken(): Promise<boolean> {
  return (await cookies()).has(REFRESH);
}

export async function saveSession(
  session: Pick<Session, "access_token" | "refresh_token" | "expires_in">,
) {
  const store = await cookies();
  store.set(ACCESS, session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in,
  });
  store.set(REFRESH, session.refresh_token, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  for (const name of [ACCESS, REFRESH, PENDING_EMAIL])
    store.delete({ name, path: "/admin" });
}

export async function setPendingEmail(email: string) {
  (await cookies()).set(PENDING_EMAIL, email, {
    ...cookieOptions,
    maxAge: 600,
  });
}

export async function getPendingEmail(): Promise<string | null> {
  return (await cookies()).get(PENDING_EMAIL)?.value ?? null;
}
