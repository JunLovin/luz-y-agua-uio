import { NextResponse } from "next/server";
import { clearSession, refreshAdminToken } from "@/server/admin-session";

/** Renews an expired admin session with its refresh token, then returns to the panel. */
export async function GET(request: Request) {
  if (!(await refreshAdminToken())) await clearSession();
  return NextResponse.redirect(new URL("/admin/ingesta", request.url), 303);
}
