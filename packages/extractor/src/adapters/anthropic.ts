import Anthropic from "@anthropic-ai/sdk";
import type {
  ExtractionModel,
  ExtractionRequest,
  SourceFile,
} from "../application/ports.js";

const MAX_TOKENS = 64_000;

type StreamParams = Parameters<Anthropic["beta"]["messages"]["stream"]>[0];

export class ExtractionFailedError extends Error {}

function fileBlock(file: SourceFile): Anthropic.Beta.BetaContentBlockParam {
  switch (file.kind) {
    case "pdf":
      return {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.base64,
        },
      };
    case "image":
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: file.mediaType,
          data: file.base64,
        },
      };
    case "text":
      return {
        type: "document",
        source: { type: "text", media_type: "text/plain", data: file.text },
      };
  }
}

export function buildRequest(
  file: SourceFile,
  request: ExtractionRequest,
  model: string,
): StreamParams {
  return {
    model,
    max_tokens: MAX_TOKENS,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: request.system,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: request.schema },
    },
    messages: [
      {
        role: "user",
        content: [
          fileBlock(file),
          { type: "text", text: request.instructions },
        ],
      },
    ],
  };
}

export function readJson(message: Anthropic.Beta.BetaMessage): unknown {
  if (message.stop_reason === "refusal") {
    throw new ExtractionFailedError(
      `Model refused: ${message.stop_details?.category ?? "unknown"}`,
    );
  }
  if (message.stop_reason === "max_tokens")
    throw new ExtractionFailedError("Output truncated at max_tokens");
  const text = message.content.find((block) => block.type === "text");
  if (!text) throw new ExtractionFailedError("No text block in the response");
  try {
    return JSON.parse(text.text);
  } catch (error) {
    throw new ExtractionFailedError(
      `Invalid JSON in the response: ${String(error)}`,
    );
  }
}

export function createAnthropicModel(options: {
  model: string;
  client?: Anthropic;
}): ExtractionModel {
  const client = options.client ?? new Anthropic();
  return {
    async extract(file, request) {
      const params = buildRequest(file, request, options.model);
      return readJson(await client.beta.messages.stream(params).finalMessage());
    },
  };
}
