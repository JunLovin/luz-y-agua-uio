import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Catalog } from "../domain/assess.ts";
import type { ExtractedOutage } from "../domain/schema.ts";
import {
  ingest,
  type IngestDeps,
  type IngestRepository,
  type NewOutage,
  type Source,
  type StoredDocument,
} from "./ingest.ts";
import type { ExtractionModel } from "./ports.ts";

const row: ExtractedOutage = {
  service: "luz",
  zoneNames: [],
  barrioNames: ["Solanda"],
  date: "2026-10-20",
  start: "09:00",
  end: "13:00",
  endsNextDay: false,
  notes: "Mantenimiento",
};

const catalog: Catalog = {
  zones: [],
  barrios: [{ id: "solanda", names: ["Solanda"] }],
  zoneBarrios: [],
};

function fakeRepository(sources: Source[]) {
  const documents = new Map<
    string,
    StoredDocument & { sha256: string; url: string | null }
  >();
  let outages: NewOutage[] = [];
  const copy = (doc: StoredDocument) => ({ ...doc });
  const repository: IngestRepository = {
    getSource: async (id) => sources.find((s) => s.id === id) ?? null,
    findDocument: async (sha) => {
      const doc = [...documents.values()].find((d) => d.sha256 === sha);
      return doc ? copy(doc) : null;
    },
    createDocument: async ({ sha256, url }) => {
      if ([...documents.values()].some((d) => d.sha256 === sha256)) return null;
      const id = `doc-${documents.size + 1}`;
      const doc = {
        id,
        sha256,
        url,
        status: "pending" as const,
        attempts: 0,
        receivedAt: new Date("2026-10-18T15:00:00Z"),
      };
      documents.set(id, doc);
      return copy(doc);
    },
    claimAttempt: async (id, expected) => {
      const doc = documents.get(id);
      if (!doc || doc.attempts !== expected || doc.status === "extracted")
        return false;
      doc.attempts++;
      return true;
    },
    finishAttempt: async (id, { status }) => {
      const doc = documents.get(id);
      if (doc) doc.status = status;
    },
    loadCatalog: async () => catalog,
    activeOutages: async () => [],
    replaceOutages: async (id, rows) => {
      outages = [
        ...outages.filter((o) => o.source_document_id !== id),
        ...rows,
      ];
    },
  };
  return {
    repository,
    documents,
    get outages() {
      return outages;
    },
  };
  return { repository, documents, outages };
}

const eeq: Source = {
  id: "eeq",
  name: "Empresa Eléctrica Quito",
  trust: 0.5,
  automatedAllowed: false,
  baseUrl: "https://www.eeq.com.ec",
};
const epmaps: Source = {
  id: "epmaps",
  name: "Epmaps",
  trust: 0.5,
  automatedAllowed: true,
  baseUrl: "https://www.aguaquito.gob.ec/comunicados/",
};

const upload = {
  sourceId: "eeq",
  upload: {
    bytes: new TextEncoder().encode("Corte en Solanda"),
    mediaType: "text/plain",
  },
};

let state: ReturnType<typeof fakeRepository>;
let model: ExtractionModel & { extract: ReturnType<typeof vi.fn> };
let deps: IngestDeps;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  state = fakeRepository([eeq, epmaps]);
  model = {
    extract: vi.fn(async (_file, request) =>
      "transcription" in (request.schema.properties as object)
        ? { transcription: "", outages: [row] }
        : { outages: [row] },
    ),
  };
  fetchMock = vi.fn();
  deps = {
    repository: state.repository,
    files: { put: vi.fn(async () => {}) },
    model,
    fetch: fetchMock as unknown as typeof fetch,
    now: () => new Date("2026-10-19T15:00:00Z"),
  };
});

describe("ingest", () => {
  it("stores the file, extracts it and publishes the outages", async () => {
    const result = await ingest(upload, deps);
    expect(result).toEqual({
      status: "extracted",
      documentId: "doc-1",
      tiers: { high: 1, medium: 0, low: 0 },
      rejected: 0,
    });
    expect(deps.files.put).toHaveBeenCalledWith(
      expect.stringMatching(/^eeq\/[0-9a-f]{64}\.txt$/),
      upload.upload.bytes,
      "text/plain",
    );
    expect(state.outages).toEqual([
      {
        service: "luz",
        kind: "scheduled",
        zone_id: null,
        barrio_ids: ["solanda"],
        starts_at: "2026-10-20T14:00:00.000Z",
        ends_at: "2026-10-20T18:00:00.000Z",
        confidence: 0.8,
        tier: "high",
        source_document_id: "doc-1",
        source_label: "Empresa Eléctrica Quito, recibido el 2026-10-18",
        notes: "Mantenimiento",
      },
    ]);
    expect(state.documents.get("doc-1")?.status).toBe("extracted");
  });

  it("does not reprocess a document that was already extracted", async () => {
    await ingest(upload, deps);
    model.extract.mockClear();
    expect(await ingest(upload, deps)).toEqual({
      status: "duplicate",
      documentId: "doc-1",
    });
    expect(model.extract).not.toHaveBeenCalled();
    expect(state.outages).toHaveLength(1);
  });

  it("retries a failed document up to three attempts, then marks it failed", async () => {
    model.extract.mockRejectedValue(new Error("API down"));
    expect(await ingest(upload, deps)).toMatchObject({
      status: "failed",
      attempts: 1,
    });
    expect(state.documents.get("doc-1")?.status).toBe("pending");
    await ingest(upload, deps);
    expect(await ingest(upload, deps)).toMatchObject({
      status: "failed",
      attempts: 3,
    });
    expect(state.documents.get("doc-1")?.status).toBe("failed");
    expect(await ingest(upload, deps)).toEqual({
      status: "duplicate",
      documentId: "doc-1",
    });
    expect(deps.files.put).toHaveBeenCalledTimes(1);
  });

  it("lets only one of two simultaneous requests extract the document", async () => {
    const [first, second] = await Promise.all([
      ingest(upload, deps),
      ingest(upload, deps),
    ]);
    expect([first.status, second.status].sort()).toEqual([
      "duplicate",
      "extracted",
    ]);
    expect(model.extract).toHaveBeenCalledTimes(2);
    expect(state.outages).toHaveLength(1);
  });

  it("replaces the outages of a retried document instead of duplicating them", async () => {
    await ingest(upload, deps);
    const doc = state.documents.get("doc-1");
    if (doc) doc.status = "pending";
    await ingest(upload, deps);
    expect(state.outages).toHaveLength(1);
  });

  it("refuses a URL whose host cannot be reached", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const result = await ingest(
      {
        sourceId: "epmaps",
        url: "https://www.aguaquito.gob.ec/comunicados/a.pdf",
      },
      deps,
    );
    expect(result).toEqual({ status: "refused", reason: "fetch_failed" });
  });

  it("refuses URLs outside the allowlist without fetching anything", async () => {
    expect(
      await ingest(
        { sourceId: "eeq", url: "https://www.eeq.com.ec/cortes.pdf" },
        deps,
      ),
    ).toEqual({ status: "refused", reason: "blocked_host" });
    expect(
      await ingest(
        { sourceId: "epmaps", url: "https://otro.example/a.pdf" },
        deps,
      ),
    ).toEqual({ status: "refused", reason: "not_in_allowlist" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a URL that robots.txt disallows before downloading it", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("User-agent: *\nDisallow: /comunicados/"),
    );
    const result = await ingest(
      {
        sourceId: "epmaps",
        url: "https://www.aguaquito.gob.ec/comunicados/a.pdf",
      },
      deps,
    );
    expect(result).toEqual({ status: "refused", reason: "robots_disallowed" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("downloads an allowed URL with our user agent and without following redirects", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(
        new Response("Corte en Solanda", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      );
    const result = await ingest(
      {
        sourceId: "epmaps",
        url: "https://www.aguaquito.gob.ec/comunicados/a.txt",
      },
      deps,
    );
    expect(result.status).toBe("extracted");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      redirect: "error",
      headers: { "User-Agent": expect.stringContaining("LuzYAguaUIO") },
    });
  });

  it.each([
    [
      "an unknown source",
      { sourceId: "x", upload: upload.upload },
      "unknown_source",
    ],
    [
      "an unsupported file type",
      {
        sourceId: "eeq",
        upload: { bytes: new Uint8Array(1), mediaType: "application/zip" },
      },
      "unsupported_type",
    ],
    [
      "a file over 20 MB",
      {
        sourceId: "eeq",
        upload: {
          bytes: new Uint8Array(20 * 1024 * 1024 + 1),
          mediaType: "application/pdf",
        },
      },
      "too_large",
    ],
  ])("refuses %s", async (_case, input, reason) => {
    expect(await ingest(input, deps)).toEqual({ status: "refused", reason });
    expect(model.extract).not.toHaveBeenCalled();
  });
});
