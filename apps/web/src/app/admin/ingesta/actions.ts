"use server";

import { redirect } from "next/navigation";
import {
  clearSession,
  getPendingEmail,
  saveSession,
  setPendingEmail,
} from "@/server/admin-session";
import { adminEmail, anonClient } from "@/server/supabase";

export async function requestCode(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  // Same answer for any address, so the page never reveals which one is the admin's.
  if (email === adminEmail()) {
    await anonClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
  }
  await setPendingEmail(email);
  redirect("/admin/ingesta");
}

export async function verifyCode(formData: FormData) {
  const email = await getPendingEmail();
  const token = String(formData.get("code") ?? "").trim();
  const { data } = email
    ? await anonClient().auth.verifyOtp({ email, token, type: "email" })
    : { data: { session: null } };
  if (!data.session) redirect("/admin/ingesta?error=code");
  await saveSession(data.session);
  redirect("/admin/ingesta");
}

export async function logout() {
  await clearSession();
  redirect("/admin/ingesta");
}
