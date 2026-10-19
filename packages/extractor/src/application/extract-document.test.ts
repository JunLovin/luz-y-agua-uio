/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { assess, type Catalog } from "../domain/assess.js";
import { extractDocument } from "./extract-document.js";
import type { ExtractionModel, ExtractionRequest } from "./ports.js";

type Recorded = {
  receivedDate: string;
  responses: { table: unknown; direct: unknown };
};

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, path), "utf8")) as T;
const recorded = (name: string) =>
  readJson<Recorded>(`../../fixtures/recorded/${name}.json`);

const barrios = readJson<{
  features: { properties: { id: string; name: string } }[];
}>("../../../shared/fixtures/barrios-osm.geojson");
const catalog: Catalog = {
  zones: [],
  barrios: barrios.features.map(({ properties }) => ({
    id: properties.id,
    names: [properties.name],
  })),
  zoneBarrios: [],
};

function replayModel({
  responses,
}: Recorded): ExtractionModel & { requests: ExtractionRequest[] } {
  const requests: ExtractionRequest[] = [];
  return {
    requests,
    extract: vi.fn(async (_file, request: ExtractionRequest) => {
      requests.push(request);
      return "transcription" in (request.schema.properties as object)
        ? responses.table
        : responses.direct;
    }),
  };
}

const pdf = { kind: "pdf", base64: "" } as const;

describe("extractDocument", () => {
  it("runs two different requests and validates both answers", async () => {
    const fixture = recorded("eeq-mantenimientos-2026-10-17");
    const model = replayModel(fixture);
    const { primary, secondary } = await extractDocument(
      pdf,
      model,
      fixture.receivedDate,
    );

    expect(model.requests).toHaveLength(2);
    expect(model.requests[0]?.instructions).not.toBe(
      model.requests[1]?.instructions,
    );
    expect(
      model.requests.every((r) => r.instructions.includes("2026-10-16")),
    ).toBe(true);
    expect(primary.outages).toHaveLength(2);
    expect(secondary.outages).toHaveLength(2);
  });

  it("fails when an answer does not match the schema", async () => {
    const model: ExtractionModel = {
      extract: async () => ({ outages: [{ service: "gas" }] }),
    };
    await expect(extractDocument(pdf, model, "2026-10-16")).rejects.toThrow();
  });
});

describe("recorded EEQ documents", () => {
  async function run(name: string, now: string) {
    const fixture = recorded(name);
    const { primary, secondary } = await extractDocument(
      pdf,
      replayModel(fixture),
      fixture.receivedDate,
    );
    return assess(primary, secondary, {
      catalog,
      now: new Date(now),
      sourceTrust: 0.5,
    });
  }

  it("never publishes the Sangolquí row for San Juan (Quito)", async () => {
    const [sangolqui, tumbaco] = await run(
      "eeq-mantenimientos-2026-10-17",
      "2026-10-16T20:00:00Z",
    );
    expect(sangolqui).toMatchObject({
      status: "accepted",
      outsideQuito: true,
      tier: "low",
      barrioIds: ["san_juan"],
    });
    expect(tumbaco).toMatchObject({
      status: "accepted",
      barrioIds: ["tumbaco"],
      tier: "low",
    });
  });

  it("maps a zone named after a parroquia and rejects places it cannot locate", async () => {
    const [alangasi, barrioNuevo] = await run(
      "eeq-obras-2026-05-30",
      "2026-05-28T15:00:00Z",
    );
    expect(alangasi).toMatchObject({
      status: "accepted",
      barrioIds: ["alangasi"],
      tier: "medium",
    });
    expect(barrioNuevo).toMatchObject({
      status: "rejected",
      reason: "no_known_place",
    });
  });

  it("publishes no recorded row as high", async () => {
    const results = [
      ...(await run("eeq-mantenimientos-2026-10-17", "2026-10-16T20:00:00Z")),
      ...(await run("eeq-obras-2026-05-30", "2026-05-28T15:00:00Z")),
    ];
    expect(
      results.filter((r) => r.status === "accepted" && r.tier === "high"),
    ).toEqual([]);
  });
});
