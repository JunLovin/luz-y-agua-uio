import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { ExtractionFailedError, buildRequest, readJson } from "./anthropic.ts";

const request = {
  system: "system",
  instructions: "instructions",
  schema: { type: "object" },
};

describe("buildRequest", () => {
  it("asks for structured output with the server-side fallback and the configured model", () => {
    const params = buildRequest(
      { kind: "text", text: "Corte en Solanda" },
      request,
      "claude-opus-5-5",
    );
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: "system",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: { type: "object" } },
      },
    });
    expect(params.messages[0]?.content).toEqual([
      {
        type: "document",
        source: {
          type: "text",
          media_type: "text/plain",
          data: "Corte en Solanda",
        },
      },
      { type: "text", text: "instructions" },
    ]);
  });

  it.each([
    [
      { kind: "pdf", base64: "UERG" } as const,
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: "UERG" },
      },
    ],
    [
      { kind: "image", base64: "SU1H", mediaType: "image/png" } as const,
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "SU1H" },
      },
    ],
  ])("sends %o as the right content block", (file, block) => {
    const content = buildRequest(file, request, "m").messages[0]?.content;
    expect(Array.isArray(content) && content[0]).toEqual(block);
  });
});

function message(
  overrides: Partial<Anthropic.Beta.BetaMessage>,
): Anthropic.Beta.BetaMessage {
  return {
    stop_reason: "end_turn",
    content: [],
    ...overrides,
  } as unknown as Anthropic.Beta.BetaMessage;
}

describe("readJson", () => {
  it("parses the text block", () => {
    const content = [
      { type: "text", text: '{"outages":[]}' },
    ] as Anthropic.Beta.BetaContentBlock[];
    expect(readJson(message({ content }))).toEqual({ outages: [] });
  });

  it.each([
    ["a refusal", message({ stop_reason: "refusal" }), /refused/],
    ["truncated output", message({ stop_reason: "max_tokens" }), /truncated/],
    ["no text block", message({}), /No text block/],
    [
      "invalid JSON",
      message({
        content: [
          { type: "text", text: '{"outages":' },
        ] as Anthropic.Beta.BetaContentBlock[],
      }),
      /Invalid JSON/,
    ],
  ])("throws on %s", (_case, input, error) => {
    expect(() => readJson(input)).toThrow(ExtractionFailedError);
    expect(() => readJson(input)).toThrow(error);
  });
});
