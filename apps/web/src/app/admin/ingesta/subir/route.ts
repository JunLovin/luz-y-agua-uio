import { NextResponse } from "next/server";
import { getAdminToken, refreshAdminToken } from "@/server/admin-session";
import { callFunction } from "@/server/supabase";

type IngestResult = {
  status?: string;
  reason?: string;
  tiers?: { high: number; medium: number; low: number };
  rejected?: number;
};

export async function POST(request: Request) {
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(
      new URL(`/admin/ingesta?${new URLSearchParams(params)}`, request.url),
      303,
    );

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new NextResponse(null, { status: 403 });

  const token = (await getAdminToken()) ?? (await refreshAdminToken());
  if (!token) return back({ resultado: "forbidden" });

  const form = await request.formData();
  const sourceId = String(form.get("sourceId") ?? "");
  const file = form.get("file");
  const url = String(form.get("url") ?? "").trim();

  let response: Response;
  if (file instanceof File && file.size > 0) {
    const body = new FormData();
    body.set("sourceId", sourceId);
    body.set("file", file);
    response = await callFunction("ingest-source", token, { body });
  } else if (url) {
    response = await callFunction("ingest-source", token, {
      body: JSON.stringify({ sourceId, url }),
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return back({ resultado: "missing" });
  }

  const result = (await response
    .json()
    .catch(() => null)) as IngestResult | null;
  if (!result?.status)
    return back({ resultado: response.status === 403 ? "forbidden" : "error" });
  return back({
    resultado: result.status,
    ...(result.reason && { motivo: result.reason }),
    ...(result.tiers && {
      high: String(result.tiers.high),
      medium: String(result.tiers.medium),
      low: String(result.tiers.low),
      rechazados: String(result.rejected ?? 0),
    }),
  });
}
