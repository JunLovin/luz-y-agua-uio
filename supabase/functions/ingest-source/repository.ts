import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FileStore,
  IngestRepository,
  StoredDocument,
} from "../../../packages/extractor/src/application/ingest.ts";

const BUCKET = "source-documents";
const UNIQUE_VIOLATION = "23505";

type DocumentRow = {
  id: string;
  status: StoredDocument["status"];
  attempts: number;
  received_at: string;
};

function toDocument(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    status: row.status,
    attempts: row.attempts,
    receivedAt: new Date(row.received_at),
  };
}

function check<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

export function supabaseRepository(db: SupabaseClient): IngestRepository {
  return {
    async getSource(id) {
      const row = check(
        await db
          .from("sources")
          .select("id, name, trust, automated_allowed, base_url")
          .eq("id", id)
          .maybeSingle(),
      );
      return row
        ? {
            id: row.id,
            name: row.name,
            trust: row.trust,
            automatedAllowed: row.automated_allowed,
            baseUrl: row.base_url,
          }
        : null;
    },
    async findDocument(sha256) {
      const row = check(
        await db
          .from("source_documents")
          .select("id, status, attempts, received_at")
          .eq("sha256", sha256)
          .maybeSingle(),
      );
      return row ? toDocument(row) : null;
    },
    async createDocument({ sourceId, url, storagePath, sha256 }) {
      const { data, error } = await db
        .from("source_documents")
        .insert({
          source_id: sourceId,
          url,
          storage_path: storagePath,
          sha256,
          status: "pending",
        })
        .select("id, status, attempts, received_at")
        .single();
      if (error?.code === UNIQUE_VIOLATION) return null;
      if (error) throw error;
      return toDocument(data);
    },
    async claimAttempt(id, expected) {
      const rows = check(
        await db
          .from("source_documents")
          .update({ attempts: expected + 1 })
          .eq("id", id)
          .eq("attempts", expected)
          .neq("status", "extracted")
          .select("id"),
      );
      return (rows ?? []).length === 1;
    },
    async finishAttempt(id, { status, lastError }) {
      check(
        await db
          .from("source_documents")
          .update({ status, last_error: lastError })
          .eq("id", id),
      );
    },
    async loadCatalog() {
      const [barrios, zones, links] = await Promise.all([
        db.from("barrios").select("id, name"),
        db.from("utility_zones").select("id, service, name, aliases"),
        db.from("zone_barrio").select("zone_id, barrio_id"),
      ]);
      return {
        barrios: (check(barrios) ?? []).map((b) => ({
          id: b.id,
          names: [b.name],
        })),
        zones: (check(zones) ?? []).map((z) => ({
          id: z.id,
          service: z.service,
          names: [z.name, ...z.aliases],
        })),
        zoneBarrios: (check(links) ?? []).map((l) => ({
          zoneId: l.zone_id,
          barrioId: l.barrio_id,
        })),
      };
    },
    async activeOutages() {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const rows = check(
        await db
          .from("outages")
          .select("service, starts_at, barrio_ids, source_documents(source_id)")
          .in("tier", ["high", "medium"])
          .gte("starts_at", since),
      );
      return (rows ?? []).map((row) => ({
        sourceId:
          (row.source_documents as unknown as { source_id: string } | null)
            ?.source_id ?? "",
        service: row.service,
        startsAt: new Date(row.starts_at),
        barrioIds: row.barrio_ids,
      }));
    },
    async replaceOutages(documentId, outages) {
      check(
        await db.from("outages").delete().eq("source_document_id", documentId),
      );
      if (outages.length > 0) check(await db.from("outages").insert(outages));
    },
  };
}

export function storageFileStore(db: SupabaseClient): FileStore {
  return {
    async put(path, bytes, mediaType) {
      check(
        await db.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: mediaType, upsert: true }),
      );
    },
  };
}
