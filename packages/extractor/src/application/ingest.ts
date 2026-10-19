import { config } from "@luz-y-agua/shared";
import { assess, type Catalog } from "../domain/assess.ts";
import {
  checkUrl,
  robotsAllows,
  USER_AGENT,
  type UrlRefusal,
} from "../domain/source-policy.ts";
import { ecuadorDate } from "../domain/time.ts";
import { extractDocument } from "./extract-document.ts";
import type { ExtractionModel, SourceFile } from "./ports.ts";

const MAX_BYTES = 20 * 1024 * 1024;
const MEDIA_TYPES = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "text/plain": "txt",
} as const;
type MediaType = keyof typeof MEDIA_TYPES;

export type Source = {
  id: string;
  name: string;
  trust: number;
  automatedAllowed: boolean;
  baseUrl: string | null;
};
export type StoredDocument = {
  id: string;
  status: "pending" | "extracted" | "failed";
  attempts: number;
  receivedAt: Date;
};
export type ActiveOutage = {
  sourceId: string;
  service: "luz" | "agua";
  startsAt: Date;
  barrioIds: string[];
};
export type NewOutage = {
  service: "luz" | "agua";
  kind: "scheduled";
  zone_id: string | null;
  barrio_ids: string[];
  starts_at: string;
  ends_at: string | null;
  confidence: number;
  tier: "high" | "medium" | "low";
  source_document_id: string;
  source_label: string;
  notes: string | null;
};

export interface IngestRepository {
  getSource(id: string): Promise<Source | null>;
  findDocument(sha256: string): Promise<StoredDocument | null>;
  /** Returns null when another request created the same document first. */
  createDocument(doc: {
    sourceId: string;
    url: string | null;
    storagePath: string;
    sha256: string;
  }): Promise<StoredDocument | null>;
  /** Atomically moves `attempts` from `expected` to `expected + 1`; false if another request got there first. */
  claimAttempt(id: string, expected: number): Promise<boolean>;
  finishAttempt(
    id: string,
    result: { status: StoredDocument["status"]; lastError: string | null },
  ): Promise<void>;
  loadCatalog(): Promise<Catalog>;
  activeOutages(): Promise<ActiveOutage[]>;
  /** Replaces every outage of the document, so a retry never duplicates them. */
  replaceOutages(documentId: string, outages: NewOutage[]): Promise<void>;
}

export interface FileStore {
  put(path: string, bytes: Uint8Array, mediaType: string): Promise<void>;
}

export type IngestDeps = {
  repository: IngestRepository;
  files: FileStore;
  model: ExtractionModel;
  fetch: typeof fetch;
  now: () => Date;
};

export type IngestInput =
  | { sourceId: string; upload: { bytes: Uint8Array; mediaType: string } }
  | { sourceId: string; url: string };

export type IngestResult =
  | {
      status: "refused";
      reason:
        | UrlRefusal
        | "unknown_source"
        | "robots_disallowed"
        | "unsupported_type"
        | "too_large"
        | "fetch_failed";
    }
  | { status: "duplicate"; documentId: string }
  | { status: "failed"; documentId: string; attempts: number; error: string }
  | {
      status: "extracted";
      documentId: string;
      tiers: Record<"high" | "medium" | "low", number>;
      rejected: number;
    };

class Refused extends Error {
  constructor(
    readonly reason: Extract<IngestResult, { status: "refused" }>["reason"],
  ) {
    super(reason);
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toMediaType(contentType: string): MediaType {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!(type in MEDIA_TYPES)) throw new Refused("unsupported_type");
  return type as MediaType;
}

function toSourceFile(bytes: Uint8Array, mediaType: MediaType): SourceFile {
  if (mediaType === "application/pdf")
    return { kind: "pdf", base64: toBase64(bytes) };
  if (mediaType === "text/plain")
    return { kind: "text", text: new TextDecoder().decode(bytes) };
  return { kind: "image", base64: toBase64(bytes), mediaType };
}

async function fetchOrRefuse(
  fetchFn: typeof fetch,
  url: string | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch {
    throw new Refused("fetch_failed");
  }
}

async function download(
  url: string,
  source: Source,
  fetchFn: typeof fetch,
): Promise<{ bytes: Uint8Array; mediaType: MediaType }> {
  const refusal = checkUrl(url, source);
  if (refusal) throw new Refused(refusal);
  const headers = { "User-Agent": USER_AGENT };
  const robots = await fetchOrRefuse(fetchFn, new URL("/robots.txt", url), {
    headers,
  });
  if (!robotsAllows(url, robots.ok ? await robots.text() : null))
    throw new Refused("robots_disallowed");
  const response = await fetchOrRefuse(fetchFn, url, {
    headers,
    redirect: "error",
  });
  if (!response.ok) throw new Refused("fetch_failed");
  const mediaType = toMediaType(response.headers.get("content-type") ?? "");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Refused("too_large");
  return { bytes, mediaType };
}

export async function ingest(
  input: IngestInput,
  deps: IngestDeps,
): Promise<IngestResult> {
  const { repository } = deps;
  try {
    const source = await repository.getSource(input.sourceId);
    if (!source) throw new Refused("unknown_source");

    const { bytes, mediaType } =
      "url" in input
        ? await download(input.url, source, deps.fetch)
        : { ...input.upload, mediaType: toMediaType(input.upload.mediaType) };
    if (bytes.length > MAX_BYTES) throw new Refused("too_large");

    const hash = await sha256(bytes);
    let document = await repository.findDocument(hash);
    if (!document) {
      const storagePath = `${source.id}/${hash}.${MEDIA_TYPES[mediaType]}`;
      await deps.files.put(storagePath, bytes, mediaType);
      document =
        (await repository.createDocument({
          sourceId: source.id,
          url: "url" in input ? input.url : null,
          storagePath,
          sha256: hash,
        })) ?? (await repository.findDocument(hash));
      if (!document) throw new Error(`Document ${hash} disappeared`);
    }
    const documentId = document.id;
    if (
      document.status === "extracted" ||
      document.attempts >= config.ingestion.maxAttempts ||
      !(await repository.claimAttempt(documentId, document.attempts))
    ) {
      return { status: "duplicate", documentId };
    }
    const attempts = document.attempts + 1;

    try {
      const now = deps.now();
      const receivedDate = ecuadorDate(document.receivedAt);
      const { primary, secondary } = await extractDocument(
        toSourceFile(bytes, mediaType),
        deps.model,
        receivedDate,
      );
      const [catalog, active] = await Promise.all([
        repository.loadCatalog(),
        repository.activeOutages(),
      ]);
      const assessments = assess(primary, secondary, {
        catalog,
        now,
        sourceTrust: source.trust,
        confirmedByOtherSource: (candidate) =>
          active.some(
            (other) =>
              other.sourceId !== source.id &&
              other.service === candidate.row.service &&
              other.startsAt.getTime() === candidate.startsAt.getTime() &&
              other.barrioIds.some((id) => candidate.barrioIds.includes(id)),
          ),
      });

      const accepted = assessments.flatMap((a) =>
        a.status === "accepted" ? [a] : [],
      );
      await repository.replaceOutages(
        documentId,
        accepted.map((a) => ({
          service: a.row.service,
          kind: "scheduled",
          zone_id: a.zoneId,
          barrio_ids: a.barrioIds,
          starts_at: a.startsAt.toISOString(),
          ends_at: a.endsAt?.toISOString() ?? null,
          confidence: a.confidence,
          tier: a.tier,
          source_document_id: documentId,
          source_label: `${source.name}, recibido el ${receivedDate}`,
          notes: a.row.notes,
        })),
      );
      await repository.finishAttempt(documentId, {
        status: "extracted",
        lastError: null,
      });

      const tiers = { high: 0, medium: 0, low: 0 };
      for (const a of accepted) tiers[a.tier]++;
      return {
        status: "extracted",
        documentId,
        tiers,
        rejected: assessments.length - accepted.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await repository.finishAttempt(documentId, {
        status: attempts >= config.ingestion.maxAttempts ? "failed" : "pending",
        lastError: message.slice(0, 500),
      });
      return { status: "failed", documentId, attempts, error: message };
    }
  } catch (error) {
    if (error instanceof Refused)
      return { status: "refused", reason: error.reason };
    throw error;
  }
}
