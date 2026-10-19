import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createAnthropicModel } from "../../../packages/extractor/src/adapters/anthropic.ts";
import {
  ingest,
  type IngestInput,
} from "../../../packages/extractor/src/application/ingest.ts";
import type { ExtractionModel } from "../../../packages/extractor/src/application/ports.ts";
import { storageFileStore, supabaseRepository } from "./repository.ts";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// Built on first use, so a missing API key fails the extraction (and is retried) instead of the request.
let anthropicModel: ExtractionModel | undefined;
const model: ExtractionModel = {
  extract: (file, request) => {
    anthropicModel ??= createAnthropicModel({
      model: env("ANTHROPIC_MODEL"),
      client: new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") }),
    });
    return anthropicModel.extract(file, request);
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function isAdmin(request: Request): Promise<boolean> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) return false;
  const { data } = await db.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  return (
    !!data.user?.email_confirmed_at &&
    !!email &&
    email === env("ADMIN_EMAIL").toLowerCase()
  );
}

async function readInput(request: Request): Promise<IngestInput | null> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const sourceId = form.get("sourceId");
    const file = form.get("file");
    if (typeof sourceId !== "string" || !(file instanceof File)) return null;
    return {
      sourceId,
      upload: {
        bytes: new Uint8Array(await file.arrayBuffer()),
        mediaType: file.type,
      },
    };
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.sourceId !== "string" || typeof body?.url !== "string")
    return null;
  return { sourceId: body.sourceId, url: body.url };
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);
  if (!(await isAdmin(request))) return json({ error: "forbidden" }, 403);
  const input = await readInput(request);
  if (!input) return json({ error: "invalid_input" }, 400);

  const result = await ingest(input, {
    repository: supabaseRepository(db),
    files: storageFileStore(db),
    model,
    fetch,
    now: () => new Date(),
  });
  const status =
    result.status === "refused" ? 422 : result.status === "failed" ? 502 : 200;
  return json(result, status);
});
